import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/search/security/rate-limiter';
import { normalizeSearchQuery } from '@/lib/search/core/normalizer';
import { scoreAndSortBooks, filterAdultContent, type BookData } from '@/lib/search/core/scorer';
import { evaluateSearchState, type SearchState } from '@/lib/search/search-orchestrator';

// Disable Next.js caching for this dynamic API route
export const dynamic = 'force-dynamic';

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';

  const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.NEXT_PUBLIC_SITE_URL || ''
  ].filter(Boolean);

  return allowedOrigins.some(allowed =>
    origin.startsWith(allowed) || referer.startsWith(allowed)
  ) || origin === '' && referer === '';
}

// Fetch ISBN from Google Books API
async function fetchIsbnFromGoogle(query: string): Promise<string | null> {
  const googleApiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!googleApiKey) {
    console.warn('GOOGLE_BOOKS_API_KEY is not set, skipping Google search');
    return null;
  }

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1&key=${googleApiKey}`;
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      console.warn(`Google Books API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const items = data.items;

    if (!items || items.length === 0) {
      return null;
    }

    const volumeInfo = items[0]?.volumeInfo;
    const identifiers = volumeInfo?.industryIdentifiers;

    if (!identifiers) {
      return null;
    }

    const isbn13 = identifiers.find((id: { type: string; identifier: string }) => id.type === 'ISBN_13');
    if (isbn13) {
      return isbn13.identifier;
    }

    const isbn10 = identifiers.find((id: { type: string; identifier: string }) => id.type === 'ISBN_10');
    if (isbn10) {
      return isbn10.identifier;
    }

    return null;
  } catch (error) {
    console.warn('Google Books API call failed:', error);
    return null;
  }
}

// Fetch books from Rakuten API by title (with keyword fallback)
async function fetchBooksByKeyword(
  appId: string,
  query: string
): Promise<Record<string, unknown>[]> {
  const titleParams = new URLSearchParams({
    applicationId: appId,
    format: 'json',
    hits: '20',
    sort: 'sales',
    booksGenreId: '001001',
    outOfStockFlag: '1',
    title: query,
  });

  const titleUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${titleParams.toString()}`;

  try {
    const titleResponse = await fetch(titleUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (titleResponse.ok) {
      const data = await titleResponse.json();
      const items = data.Items || [];
      if (items.length > 0) {
        return items;
      }
    }
  } catch (err) {
    console.warn('Rakuten Title Search failed (ignoring):', err);
  }

  const keywordParams = new URLSearchParams({
    applicationId: appId,
    format: 'json',
    hits: '20',
    sort: 'sales',
    booksGenreId: '001001',
    outOfStockFlag: '1',
    keyword: query,
  });

  const keywordUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${keywordParams.toString()}`;

  try {
    const keywordResponse = await fetch(keywordUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!keywordResponse.ok) {
      return [];
    }

    const data = await keywordResponse.json();
    return data.Items || [];
  } catch (err) {
    console.error('Rakuten Keyword Search failed:', err);
    return [];
  }
}

// Fetch books from Rakuten API by ISBN
async function fetchBooksByIsbn(
  appId: string,
  isbn: string
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    applicationId: appId,
    format: 'json',
    isbn: isbn,
  });

  const apiUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`;

  try {
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.Items || [];
  } catch (err) {
    console.warn('Rakuten ISBN search failed:', err);
    return [];
  }
}

// Transform raw API items to BookData format
function transformBooks(items: Record<string, unknown>[]): BookData[] {
  const seen = new Set<string>();
  const books: BookData[] = [];
  const excludeKeywords = ['BOX', 'セット'];

  for (const item of items) {
    const book = item.Item as Record<string, unknown>;
    const isbn = String(book.isbn || '');
    const title = (book.title || '') as string;

    if (excludeKeywords.some(keyword => title.includes(keyword))) {
      continue;
    }

    if (isbn && seen.has(isbn)) continue;
    if (isbn) seen.add(isbn);

    const coverUrl = (book.largeImageUrl || book.mediumImageUrl || book.smallImageUrl || '') as string;

    books.push({
      id: String(books.length + 1),
      title: title,
      author: (book.author || '') as string,
      publisher: (book.publisherName || '') as string,
      isbn: isbn || '',
      coverUrl: coverUrl,
      hasImage: !!coverUrl,
    });
  }

  return books;
}

async function logFailedSearch(query: string, ip: string, userAgent: string) {
  try {
    const { error } = await supabase
      .from('search_logs')
      .insert({
        query: query,
        ip: ip,
        user_agent: userAgent,
      });

    if (error) {
      console.warn('Failed to log search:', error.message);
    }
  } catch (err) {
    console.warn('Error in logFailedSearch:', err);
  }
}

export async function GET(request: NextRequest) {
  // Validate origin
  if (!validateOrigin(request)) {
    return NextResponse.json(
      { error: 'Forbidden: Invalid origin' },
      { status: 403 }
    );
  }

  const ip = getClientIP(request);
  const rateLimitResult = await checkRateLimit(ip);

  if (!rateLimitResult.success) {
    const resetSeconds = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${resetSeconds} seconds.` },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || '';

  // Input Validation
  if (rawQuery.length > 100) {
    return NextResponse.json(
      { error: 'Query too long (max 100 chars)' },
      { status: 400 }
    );
  }

  const query = rawQuery;

  console.log(`Search API Request: query="${query}", ip="${ip}"`);

  if (!query && !genre) {
    return NextResponse.json(
      { error: 'Search query or genre is required' },
      { status: 400 }
    );
  }

  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) {
    console.warn('RAKUTEN_APP_ID is not set.');
    return NextResponse.json({ books: [], warning: 'No API Key' });
  }

  try {
    // Step 1: Normalize Query (using new Normalizer)
    const normalizedData = normalizeSearchQuery(query);
    const { normalized: normalizedQuery, targetVolume, wasAliasResolved } = normalizedData;

    console.log(`Normalized: "${normalizedQuery}", Volume: ${targetVolume}, Alias: ${wasAliasResolved}`);

    // Step 2: Try to get ISBN from Google Books API
    const targetIsbn = await fetchIsbnFromGoogle(normalizedQuery);

    // Step 3: Fetch from APIs
    const searchPromises: Promise<Record<string, unknown>[]>[] = [];

    if (targetIsbn) {
      searchPromises.push(fetchBooksByIsbn(appId, targetIsbn));
    } else {
      searchPromises.push(Promise.resolve([]));
    }

    searchPromises.push(fetchBooksByKeyword(appId, normalizedQuery));

    if (query.trim() !== normalizedQuery) {
      searchPromises.push(fetchBooksByKeyword(appId, query.trim()));
    } else {
      searchPromises.push(Promise.resolve([]));
    }

    const results = await Promise.allSettled(searchPromises);

    const successfulResults = results.map(r => {
      if (r.status === 'fulfilled') return r.value;
      console.warn('One of the search promises failed:', r.reason);
      return [];
    });

    const [isbnResults, normalizedResults, originalResults] = successfulResults;
    const allItems = [...isbnResults, ...normalizedResults, ...originalResults];

    // Step 4: Transform to BookData
    const books = transformBooks(allItems);

    // Step 5: Score and Sort (using new Scorer)
    const scoredBooks = scoreAndSortBooks(books, normalizedQuery, targetVolume);

    // Step 6: Filter Adult Content
    const filteredBooks = filterAdultContent(scoredBooks);

    // Step 7: Determine Search State (using new Orchestrator)
    const searchState: SearchState = evaluateSearchState(
      filteredBooks,
      wasAliasResolved,
      normalizedQuery
    );

    // Log if no results found
    if (filteredBooks.length === 0 && query.trim().length > 0) {
      const userAgent = request.headers.get('user-agent') || 'unknown';
      await logFailedSearch(query, ip, userAgent);
    }

    return NextResponse.json({
      books: filteredBooks,
      total: filteredBooks.length,
      normalizedQuery: normalizedQuery !== query ? normalizedQuery : undefined,
      targetVolume: targetVolume || undefined,
      googleIsbn: targetIsbn || undefined,
      searchState: searchState,
    });

  } catch (error) {
    console.error('Search API Critical Error:', error);
    return NextResponse.json({
      books: [],
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}
