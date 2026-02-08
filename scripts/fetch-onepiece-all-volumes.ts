/**
 * ONE PIECEの欠損巻データを楽天APIから取得するスクリプト
 * 
 * 使用方法:
 *   set RAKUTEN_APP_ID=YOUR_APP_ID && npx tsx scripts/fetch-onepiece-all-volumes.ts
 * 
 * 出力:
 *   ONE_PIECE_VOLUMESオブジェクトのTypeScriptコード
 */

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;

if (!RAKUTEN_APP_ID) {
    console.error('Error: RAKUTEN_APP_ID environment variable is required');
    process.exit(1);
}

interface RakutenItem {
    title: string;
    isbn: string;
    largeImageUrl: string;
    mediumImageUrl: string;
    smallImageUrl: string;
}

interface OnePieceVolumeData {
    volume: number;
    isbn: string;
    coverUrl: string;
    title: string;
}

async function fetchPage(page: number): Promise<{ items: RakutenItem[], pageCount: number, count: number }> {
    const params = new URLSearchParams({
        applicationId: RAKUTEN_APP_ID!,
        format: 'json',
        hits: '30',
        page: String(page),
        booksGenreId: '001001', // Manga
        outOfStockFlag: '1',    // Include out of stock
        title: 'ONE PIECE',     // Search by title
        publisherName: '集英社', // Publisher filter
        author: '尾田 栄一郎',  // Author filter
        sort: 'releaseDate',    // Sort by release date
    });

    const apiUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`;

    // Rate limit: wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await fetch(apiUrl);

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const items = (data.Items || []).map((item: any) => item.Item as RakutenItem);

    return {
        items,
        pageCount: data.pageCount || 1,
        count: data.count || 0,
    };
}

function extractVolumeNumber(title: string): number | null {
    // 全角数字を半角に変換
    const normalized = title.replace(/[０-９]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    );

    // パターン: "ONE PIECE 108" または "ONE PIECE 108巻"
    const patterns = [
        /ONE\s*PIECE\s+(\d+)/i,
        /ワンピース\s*(\d+)/,
        /(\d+)\s*巻/,
    ];

    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match) {
            return parseInt(match[1], 10);
        }
    }

    return null;
}

async function main() {
    console.log('Fetching ONE PIECE volumes from Rakuten API...');

    const allItems: RakutenItem[] = [];
    let page = 1;
    let pageCount = 1;

    // Fetch all pages
    do {
        console.log(`Fetching page ${page}/${pageCount}...`);
        const result = await fetchPage(page);
        allItems.push(...result.items);
        pageCount = result.pageCount;
        page++;
    } while (page <= pageCount);

    console.log(`Total items fetched: ${allItems.length}`);

    // Filter and extract volume data
    const volumeMap = new Map<number, OnePieceVolumeData>();

    for (const item of allItems) {
        // Skip non-main-series items (guidebooks, novels, etc.)
        if (
            item.title.includes('小説') ||
            item.title.includes('ノベライズ') ||
            item.title.includes('ガイドブック') ||
            item.title.includes('ファンブック') ||
            item.title.includes('キャラクターブック') ||
            item.title.includes('イラスト') ||
            item.title.includes('外伝') ||
            item.title.includes('VIVRE') ||
            item.title.includes('エピソードオブ') ||
            item.title.includes('パーティー') ||
            item.title.includes('恋する') ||
            item.title.includes('CHOPPER')
        ) {
            continue;
        }

        const volumeNumber = extractVolumeNumber(item.title);
        if (volumeNumber === null || volumeNumber < 1 || volumeNumber > 150) {
            continue;
        }

        // Only keep the first (original) version of each volume
        if (!volumeMap.has(volumeNumber)) {
            volumeMap.set(volumeNumber, {
                volume: volumeNumber,
                isbn: item.isbn,
                coverUrl: item.largeImageUrl || item.mediumImageUrl || item.smallImageUrl,
                title: `ONE PIECE ${volumeNumber}`,
            });
        }
    }

    // Sort by volume number
    const volumes = Array.from(volumeMap.values()).sort((a, b) => a.volume - b.volume);

    console.log(`\nFound ${volumes.length} volumes`);

    // Output as TypeScript
    console.log('\n// ONE PIECE の巻データ（楽天ブックスAPIから自動生成）');
    console.log(`// Generated: ${new Date().toISOString()}`);
    console.log('\nexport const ONE_PIECE_VOLUMES: OnePieceVolumeData[] = [');

    for (const vol of volumes) {
        console.log(`  { volume: ${vol.volume}, isbn: '${vol.isbn}', coverUrl: '${vol.coverUrl}', title: '${vol.title}' },`);
    }

    console.log('];');

    // Check for missing volumes
    const existingVolumes = new Set(volumes.map(v => v.volume));
    const missingVolumes: number[] = [];
    for (let i = 1; i <= 114; i++) {
        if (!existingVolumes.has(i)) {
            missingVolumes.push(i);
        }
    }

    if (missingVolumes.length > 0) {
        console.log(`\n// WARNING: Missing volumes: ${missingVolumes.join(', ')}`);
    }
}

main().catch(console.error);
