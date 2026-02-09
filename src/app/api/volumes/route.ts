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
        // Fetch page 1
        const response1 = await fetch(apiUrl, { cache: 'no-store' });

        if (!response1.ok) {
            if (response1.status === 429) {
                return NextResponse.json({ error: 'Upstream API Rate Limit' }, { status: 429 });
            }
            return NextResponse.json({ error: 'Upstream API Error' }, { status: response1.status });
        }

        const data1 = await response1.json();
        let items: any[] = data1.Items || [];

        // Fetch pages 2 and 3 if more pages exist (for series with 30+ volumes)
        const totalPages = data1.pageCount || 1;

        // Helper function to fetch additional page
        const fetchPage = async (pageNum: number): Promise<any[]> => {
            try {
                const pageParams = new URLSearchParams(params);
                pageParams.set('page', String(pageNum));
                const pageUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${pageParams.toString()}`;

                const response = await fetch(pageUrl, { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    return data.Items || [];
                }
            } catch {
                // Fail silently for extra pages
            }
            return [];
        };

        // Fetch pages 2 and 3 if they exist (total up to 90 items)
        // Rate limit: Rakuten API allows 1 request per second
        // Adding 1.5s delay for safety margin (50% buffer)
        if (totalPages > 1) {
            await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay
            const page2Items = await fetchPage(2);
            items = items.concat(page2Items);
        }
        if (totalPages > 2) {
            await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay
            const page3Items = await fetchPage(3);
            items = items.concat(page3Items);
        }

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
            totalItems: data1.count || 0, // Rakuten API returns total count
            page: data1.page || 1,
            pageCount: data1.pageCount || 1,
        });

    } catch (error) {
        console.error('Error fetching volumes:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
