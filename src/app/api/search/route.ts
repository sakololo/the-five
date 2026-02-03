import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MANGA_ALIASES } from './aliases';
import { checkRateLimit } from '@/lib/search/security/rate-limiter';

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

  // Allow localhost for development
  const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.NEXT_PUBLIC_SITE_URL || ''
  ].filter(Boolean);

  return allowedOrigins.some(allowed =>
    origin.startsWith(allowed) || referer.startsWith(allowed)
  ) || origin === '' && referer === ''; // Allow direct server calls
}

// Normalize search query
function normalizeQuery(query: string): string {
  let normalized = query.trim();

  // Convert half-width katakana to full-width
  normalized = normalized.replace(/[\uff66-\uff9f]/g, (char) => {
    const code = char.charCodeAt(0);
    return String.fromCharCode(code - 0xff66 + 0x30a2);
  });

  // Convert hiragana to katakana
  normalized = normalized.replace(/[\u3041-\u3096]/g, (char) => {
    return String.fromCharCode(char.charCodeAt(0) + 0x60);
  });

  // Check alias dictionary (exact match first)
  const aliasResult = MANGA_ALIASES[normalized] || MANGA_ALIASES[query.trim()];
  if (aliasResult) {
    return aliasResult;
  }

  // Fallback: Partial match in alias keys
  const normalizedLower = normalized.toLowerCase();
  const queryLower = query.trim().toLowerCase();

  // Find all matching aliases
  const partialMatches = Object.entries(MANGA_ALIASES).filter(([key]) => {
    const keyLower = key.toLowerCase();
    // 入力がキーに含まれる、またはキーが入力に含まれる
    return keyLower.includes(normalizedLower) || normalizedLower.includes(keyLower) ||
      keyLower.includes(queryLower) || queryLower.includes(keyLower);
  });

  // Prefer the shortest matching key (most specific match)
  if (partialMatches.length > 0) {
    partialMatches.sort((a, b) => a[0].length - b[0].length);
    console.log(`Partial alias match: "${query}" → "${partialMatches[0][1]}"`);
    return partialMatches[0][1];
  }

  return normalized;
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

    // Prefer ISBN-13
    const isbn13 = identifiers.find((id: { type: string; identifier: string }) => id.type === 'ISBN_13');
    if (isbn13) {
      console.log(`Google Books found ISBN-13: ${isbn13.identifier} for query "${query}"`);
      return isbn13.identifier;
    }

    // Fallback to ISBN-10
    const isbn10 = identifiers.find((id: { type: string; identifier: string }) => id.type === 'ISBN_10');
    if (isbn10) {
      console.log(`Google Books found ISBN-10: ${isbn10.identifier} for query "${query}"`);
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
  // First try title search (more accurate)
  const titleParams = new URLSearchParams({
    applicationId: appId,
    format: 'json',
    hits: '20',
    sort: 'sales', // 売上順（人気順）
    booksGenreId: '001001', // コミック
    outOfStockFlag: '1', // 在庫切れも含む
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
      if (items.length > 0) return items;
    }
  } catch (error) {
    console.warn(`Rakuten Title Search failed for "${query}":`, error);
  }

  // Fallback to keyword search if title search finds nothing
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
      console.error(`Rakuten API keyword search error: ${keywordResponse.status}`);
      return [];
    }

    const data = await keywordResponse.json();
    const items = data.Items || [];

    // Filter keyword results to only include items where query appears in title
    const queryPrefix = query.slice(0, 2).toLowerCase();
    const filteredItems = items.filter((item: Record<string, unknown>) => {
      const bookItem = item.Item as Record<string, unknown>;
      const title = String(bookItem?.title || '').toLowerCase();
      return title.includes(queryPrefix) || title.includes(query.toLowerCase());
    });

    return filteredItems;
  } catch (error) {
    console.warn(`Rakuten Keyword Search failed for "${query}":`, error);
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
      console.warn(`Rakuten API ISBN search error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const items = data.Items || [];
    console.log(`[DEBUG] ISBN search for "${isbn}" found ${items.length} items`);
    return items;
  } catch (error) {
    console.warn(`Rakuten ISBN Search failed for "${isbn}":`, error);
    return [];
  }
}

// Transform and deduplicate books
function transformBooks(items: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const books: Record<string, unknown>[] = [];

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
      author: book.author || '',
      publisher: book.publisherName || '',
      isbn: isbn || '',
      coverUrl: coverUrl,
      hasImage: !!coverUrl,
      volumeNumber: extractVolumeNumber(title),
    });
  }

  return books;
}

// Sort books: with images first, then without
function sortBooks(books: Record<string, unknown>[]): Record<string, unknown>[] {
  return books.sort((a, b) => {
    const aHasImage = a.hasImage as boolean;
    const bHasImage = b.hasImage as boolean;

    if (aHasImage && !bHasImage) return -1;
    if (!aHasImage && bHasImage) return 1;
    return 0;
  });
}

// Search Logging Logic
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

function extractVolumeNumber(title: string): number | null {
  if (typeof title !== 'string') return null;
  let match = title.match(/[(（](\d+)[)）]/);
  if (match) return parseInt(match[1], 10);
  match = title.match(/[\s　](\d+)$/);
  if (match) return parseInt(match[1], 10);
  match = title.match(/(\d+)[巻]/);
  if (match) return parseInt(match[1], 10);
  return null;
}

export async function GET(request: NextRequest) {
  // Validate origin
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden: Invalid origin' }, { status: 403 });
  }

  // Rate limiting (Upstash)
  const ip = getClientIP(request);
  try {
    // Only check if env vars are present, otherwise skip (dev mode w/o redis)
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const { success } = await checkRateLimit(ip);
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    }
  } catch (error) {
    console.warn('Rate limit check failed (failing open):', error);
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || '';

  // Input Validation: Length limit
  if (query.length > 100) {
    return NextResponse.json(
      { error: 'Search query too long (max 100 characters)' },
      { status: 400 }
    );
  }

  console.log(`Search API Request: query="${query}", genre="${genre}", ip="${ip}"`);

  if (!query && !genre) {
    return NextResponse.json(
      { error: 'Search query or genre is required' },
      { status: 400 }
    );
  }

  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) {
    console.warn('RAKUTEN_APP_ID is not set. Using local fallback.');
    return NextResponse.json({ books: [], warning: 'No API Key' });
  }

  try {
    const normalizedQuery = normalizeQuery(query);
    const originalQuery = query.trim();
    let allItems: Record<string, unknown>[] = [];

    // --- Sequential Search Strategy (Cost Optimized) ---

    // 1. Google ISBN Check (Intent: Specific Book)
    const targetIsbn = await fetchIsbnFromGoogle(normalizedQuery);

    if (targetIsbn) {
      // High Confidence: We have an ISBN. Search ONLY by ISBN.
      const isbnResults = await fetchBooksByIsbn(appId, targetIsbn);
      if (isbnResults.length > 0) {
        allItems = [...isbnResults];
      }
    }

    // 2. If no ISBN results, proceed to Normalized Query Search
    if (allItems.length === 0) {
      // Search for normalized query
      const normalizedResults = await fetchBooksByKeyword(appId, normalizedQuery);
      allItems = [...normalizedResults];
    }

    // 3. Last Resort: Original Query (If different and normalized yielded weak results)
    // "Weak results" heuristic: if < 3 results, maybe normalization killed it?
    // Or if normalization was aggressive.
    // For now, only if 0 results to save API limit.
    if (allItems.length === 0 && originalQuery !== normalizedQuery) {
      // Using Promise.allSettled pattern just for demonstration of robustness if we were doing parallel,
      // but here sequential is safer for limits. 
      // If we want to strictly follow "Parallel Multiplier Fix", we do sequential.
      // However, the prompt asked to *use* Promise.allSettled. 
      // Let's use Promise.allSettled for a "Parallel Fallback" if we want to query both normalized and original together 
      // BUT explicitly the user asked to FIX the multiplier.
      // "Promise.all の並列数を整理し、順次フォールバックを検討"
      // So sequential is the right path.
      // Where does Promise.allSettled fit? Maybe if we decide to fetch standard keyword + some other source later.
      // Or, if we stick to the original parallel approach but safely.
      // Let's stick to Sequential logic for results, as it's better for quotas.

      const originalResults = await fetchBooksByKeyword(appId, originalQuery);
      allItems = [...allItems, ...originalResults];
    }

    // Transform and deduplicate
    const books = transformBooks(allItems);

    // Legacy: Log if no results
    if (books.length === 0 && query.trim().length > 0) {
      const userAgent = request.headers.get('user-agent') || 'unknown';
      await logFailedSearch(query, ip, userAgent);
    }

    // Sort
    const sortedBooks = sortBooks(books);

    return NextResponse.json({
      books: sortedBooks,
      total: sortedBooks.length,
      normalizedQuery: normalizedQuery !== query ? normalizedQuery : undefined,
      googleIsbn: targetIsbn || undefined,
    });

  } catch (error) {
    console.error('Search API error details:', error);
    return NextResponse.json({ books: [], warning: 'Search failed' });
  }
}

