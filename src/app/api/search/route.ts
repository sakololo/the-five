import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || (now - record.timestamp) > RATE_WINDOW) {
    requestCounts.set(ip, { count: 1, timestamp: now });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

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

export async function GET(request: NextRequest) {
  // Validate origin
  if (!validateOrigin(request)) {
    return NextResponse.json(
      { error: 'Forbidden: Invalid origin' },
      { status: 403 }
    );
  }

  // Rate limiting
  const ip = getClientIP(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || '';

  if (!query && !genre) {
    return NextResponse.json(
      { error: 'Search query or genre is required' },
      { status: 400 }
    );
  }

  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) {
    console.error('RAKUTEN_APP_ID is not set');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    // Build Rakuten Books API URL
    const params = new URLSearchParams({
      applicationId: appId,
      format: 'json',
      hits: '30',
      sort: 'sales',
      booksGenreId: '001001', // コミック
    });

    if (query) {
      params.append('title', query);
    }

    const apiUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Rakuten API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform response to our format
    const books = (data.Items || []).map((item: Record<string, unknown>, index: number) => {
      const book = item.Item as Record<string, unknown>;
      return {
        id: index + 1,
        title: book.title || '',
        author: book.author || '',
        publisher: book.publisherName || '',
        isbn: book.isbn || '',
        coverUrl: book.largeImageUrl || book.mediumImageUrl || book.smallImageUrl || '',
        // Extract volume number from title if present
        volumeNumber: extractVolumeNumber(book.title as string),
      };
    });

    return NextResponse.json({ books, total: data.count || 0 });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search books. Please try again.' },
      { status: 503 }
    );
  }
}

function extractVolumeNumber(title: string): number | null {
  // Try to extract volume number from title (e.g., "ワンピース 1" or "ワンピース(1)")
  const match = title.match(/[(\s](\d+)[)\s]?$/);
  return match ? parseInt(match[1], 10) : null;
}
