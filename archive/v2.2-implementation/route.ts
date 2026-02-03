/**
 * Search API Route - V2.2 Security Architecture
 * 
 * Changes from V1:
 * - [REMOVED] supabase import (dead code)
 * - [REMOVED] validateOrigin (bypassed easily)
 * - [REMOVED] in-memory rate limiter (cold start bypass)
 * - [REMOVED] Google Books API (latency)
 * - [REMOVED] queryPrefix filter (alias killer)
 * - [ADDED] InputValidator (2-100 chars, sanitize)
 * - [ADDED] RateLimiter (Upstash Redis, global+IP)
 * - [ADDED] RequestCoalescer (LRU, max 100)
 * - [ADDED] CircuitBreaker (3 failures → 30s open)
 */

import { NextRequest, NextResponse } from 'next/server';
import { MANGA_ALIASES } from './aliases';
import {
    validateQuery,
    checkRateLimit,
    coalesceRequest,
    isCircuitOpen,
    recordFailure,
    recordSuccess,
} from '@/lib/search';

// Disable Next.js caching for this dynamic API route
export const dynamic = 'force-dynamic';

// ============================================
// IP取得 (Vercel専用 - x-real-ipのみ信頼)
// ============================================
function getClientIP(request: NextRequest): string {
    // Vercelが設定するヘッダーのみ信頼（クライアント偽装不可）
    return (
        request.headers.get('x-real-ip') ||
        request.headers.get('x-vercel-forwarded-for')?.split(',')[0] ||
        'unknown'
    );
}

// ============================================
// クエリ正規化 (V2.2: 部分エイリアスガード追加)
// ============================================
function normalizeQuery(query: string): string {
    let normalized = query.trim();

    // 半角カタカナ → 全角カタカナ
    normalized = normalized.replace(/[\uff66-\uff9f]/g, (char) => {
        const code = char.charCodeAt(0);
        return String.fromCharCode(code - 0xff66 + 0x30a2);
    });

    // ひらがな → カタカナ
    normalized = normalized.replace(/[\u3041-\u3096]/g, (char) => {
        return String.fromCharCode(char.charCodeAt(0) + 0x60);
    });

    // 完全一致エイリアス
    const exactMatch = MANGA_ALIASES[normalized] || MANGA_ALIASES[query.trim()];
    if (exactMatch) {
        return exactMatch;
    }

    // 部分一致エイリアス (V2.2: ガード条件追加)
    const normalizedLower = normalized.toLowerCase();
    const queryLower = query.trim().toLowerCase();

    // ガード: 最低2文字 + クエリ長がエイリアスキーの50%以上
    const partialMatches = Object.entries(MANGA_ALIASES).filter(([key]) => {
        const keyLower = key.toLowerCase();
        const minLength = Math.max(2, Math.floor(key.length * 0.5));

        if (normalized.length < minLength) return false;

        return (
            keyLower.includes(normalizedLower) ||
            normalizedLower.includes(keyLower) ||
            keyLower.includes(queryLower) ||
            queryLower.includes(keyLower)
        );
    });

    if (partialMatches.length > 0) {
        partialMatches.sort((a, b) => a[0].length - b[0].length);
        console.log(`[Normalizer] Partial alias: "${query}" → "${partialMatches[0][1]}"`);
        return partialMatches[0][1];
    }

    return normalized;
}

// ============================================
// Rakuten API フェッチ
// ============================================
async function fetchFromRakuten(
    appId: string,
    query: string,
    searchType: 'title' | 'keyword'
): Promise<Record<string, unknown>[]> {
    const params = new URLSearchParams({
        applicationId: appId,
        format: 'json',
        hits: '20',
        sort: 'sales',
        booksGenreId: '001001', // コミック
        outOfStockFlag: '1',
        [searchType]: query,
    });

    const url = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`;

    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`Rakuten API error: ${response.status}`);
    }

    const data = await response.json();
    return data.Items || [];
}

// ============================================
// 変換・重複排除
// ============================================
function transformBooks(items: Record<string, unknown>[]): Record<string, unknown>[] {
    const seen = new Set<string>();
    const books: Record<string, unknown>[] = [];
    const excludeKeywords = ['BOX', 'セット'];

    for (const item of items) {
        const book = item.Item as Record<string, unknown>;
        const isbn = String(book.isbn || '');
        const title = (book.title || '') as string;

        if (excludeKeywords.some((kw) => title.includes(kw))) continue;
        if (isbn && seen.has(isbn)) continue;
        if (isbn) seen.add(isbn);

        const coverUrl = (book.largeImageUrl || book.mediumImageUrl || book.smallImageUrl || '') as string;

        books.push({
            id: String(books.length + 1),
            title,
            author: book.author || '',
            publisher: book.publisherName || '',
            isbn: isbn || '',
            coverUrl,
            hasImage: !!coverUrl,
            volumeNumber: extractVolumeNumber(title),
        });
    }

    return books;
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

function sortBooks(books: Record<string, unknown>[]): Record<string, unknown>[] {
    return books.sort((a, b) => {
        const aHasImage = a.hasImage as boolean;
        const bHasImage = b.hasImage as boolean;
        if (aHasImage && !bHasImage) return -1;
        if (!aHasImage && bHasImage) return 1;
        return 0;
    });
}

// ============================================
// メインハンドラ
// ============================================
export async function GET(request: NextRequest) {
    const startTime = Date.now();
    const ip = getClientIP(request);

    // Step 1: Rate Limiting (Upstash Redis)
    const rateResult = await checkRateLimit(ip);
    if (!rateResult.success) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            {
                status: 429,
                headers: {
                    'Retry-After': String(Math.ceil((rateResult.reset || Date.now() + 60000 - Date.now()) / 1000)),
                },
            }
        );
    }

    // Step 2: Input Validation
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q');

    const validation = validateQuery(rawQuery);
    if (!validation.valid) {
        return NextResponse.json(
            { error: validation.error, message: getErrorMessage(validation.error!) },
            { status: 400 }
        );
    }

    const query = validation.query!;

    // Step 3: Circuit Breaker Check
    if (isCircuitOpen()) {
        return NextResponse.json(
            { error: 'SERVICE_UNAVAILABLE', retryAfter: 30 },
            { status: 503, headers: { 'Retry-After': '30' } }
        );
    }

    const appId = process.env.RAKUTEN_APP_ID;
    if (!appId) {
        console.warn('[Search] RAKUTEN_APP_ID not set');
        return NextResponse.json({ books: [], warning: 'No API Key' });
    }

    try {
        // Step 4: Normalize Query
        const normalizedQuery = normalizeQuery(query);
        const originalQuery = query;

        // Step 5: Coalesced Search (LRU Cache)
        const result = await coalesceRequest(normalizedQuery, async () => {
            // Parallel fetch: Title + Keyword
            const [titleResults, keywordResults] = await Promise.all([
                fetchFromRakuten(appId, normalizedQuery, 'title'),
                fetchFromRakuten(appId, normalizedQuery, 'keyword'),
            ]);

            // Original query search (if different)
            let originalResults: Record<string, unknown>[] = [];
            if (originalQuery !== normalizedQuery) {
                originalResults = await fetchFromRakuten(appId, originalQuery, 'keyword');
            }

            const allItems = [...titleResults, ...keywordResults, ...originalResults];
            const books = transformBooks(allItems);
            const sortedBooks = sortBooks(books);

            return {
                books: sortedBooks,
                total: sortedBooks.length,
                normalizedQuery: normalizedQuery !== originalQuery ? normalizedQuery : undefined,
            };
        });

        // Success: Reset circuit breaker
        recordSuccess();

        const elapsed = Date.now() - startTime;
        console.log(`[Search] "${query}" → ${result.total} results (${elapsed}ms)`);

        return NextResponse.json(result);
    } catch (error) {
        // Failure: Record for circuit breaker
        recordFailure();
        console.error('[Search] Error:', error);

        return NextResponse.json(
            { books: [], warning: 'Search failed' },
            { status: 500 }
        );
    }
}

function getErrorMessage(error: string): string {
    switch (error) {
        case 'QUERY_EMPTY':
            return 'Search query is required';
        case 'QUERY_TOO_SHORT':
            return 'Query must be at least 2 characters';
        case 'QUERY_TOO_LONG':
            return 'Query must be 100 characters or less';
        default:
            return 'Invalid query';
    }
}
