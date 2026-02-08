import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/search/security/rate-limiter';
import { extractVolumeNumber } from '@/lib/search/core/volume-parser';
import { type Book } from '@/types/book'; // プロジェクトのBook型定義に合わせて調整が必要かも

// Book型の定義（プロジェクトの型定義と一致させる）
// 既存の型定義からインポートするのがベストだが、ここでは独立性を保つために定義
// 実際には @/types/book などからインポートすべき
interface RakutenItem {
    title: string;
    titleKana: string;
    author: string;
    publisherName: string;
    isbn: string;
    largeImageUrl: string;
    mediumImageUrl: string;
    smallImageUrl: string;
    itemUrl: string;
    salesDate: string;
    itemPrice: number;
    booksGenreId: string;
}

export const dynamic = 'force-dynamic';

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

export async function GET(request: NextRequest) {
    // 1. Rate Limiting
    const ip = getClientIP(request);

    // Allow skipping rate limit for testing/development
    if (process.env.SKIP_RATE_LIMIT !== 'true') {
        const rateLimitResult = await checkRateLimit(ip);

        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429 }
            );
        }
    }

    // 2. Query Parameter Validation
    const { searchParams } = new URL(request.url);
    const titleKana = searchParams.get('titleKana');

    if (!titleKana) {
        return NextResponse.json(
            { error: 'titleKana parameter is required' },
            { status: 400 }
        );
    }

    if (titleKana.length > 100) {
        return NextResponse.json(
            { error: 'titleKana too long' },
            { status: 400 }
        );
    }

    const appId = process.env.RAKUTEN_APP_ID;
    if (!appId) {
        console.error('RAKUTEN_APP_ID is not set');
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }

    // 3. Rakuten API Call
    // hits=30 はAPI上限
    const params = new URLSearchParams({
        applicationId: appId,
        format: 'json',
        hits: '30',
        booksGenreId: '001001', // Manga
        outOfStockFlag: '1',    // Include out of stock
        title: titleKana,       // Use title (which matches titleKana better for series)
        // sort: 'standard',    // Default sort
    });

    const apiUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`;

    try {
        const response = await fetch(apiUrl, { cache: 'no-store' });

        if (!response.ok) {
            if (response.status === 429) {
                return NextResponse.json({ error: 'Upstream API Rate Limit' }, { status: 429 });
            }
            return NextResponse.json({ error: 'Upstream API Error' }, { status: response.status });
        }

        const data = await response.json();
        const items: any[] = data.Items || [];

        // 4. Transform & Sort
        const books = items.map((item: any) => {
            const rawItem = item.Item as RakutenItem;
            const volumeNum = extractVolumeNumber(rawItem.title);

            return {
                id: rawItem.isbn, // Use ISBN as ID
                title: rawItem.title,
                titleKana: rawItem.titleKana,
                author: rawItem.author,
                publisher: rawItem.publisherName,
                isbn: rawItem.isbn,
                coverUrl: rawItem.largeImageUrl || rawItem.mediumImageUrl || rawItem.smallImageUrl,
                volumeNumber: volumeNum, // Add extracted volume number
                itemUrl: rawItem.itemUrl,
                // Additional fields if needed
            };
        });

        // 5. Sort by Volume Number
        // volumeNumberがないもの（null）は最後にする
        books.sort((a, b) => {
            if (a.volumeNumber === null && b.volumeNumber === null) return 0;
            if (a.volumeNumber === null) return 1; // a is null -> a goes last
            if (b.volumeNumber === null) return -1; // b is null -> b goes last
            return a.volumeNumber - b.volumeNumber; // Ascending
        });

        return NextResponse.json({
            books: books,
            count: books.length,
            totalItems: data.count || 0, // Rakuten API returns total count
            page: data.page || 1,
            pageCount: data.pageCount || 1,
        });

    } catch (error) {
        console.error('Error fetching volumes:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
