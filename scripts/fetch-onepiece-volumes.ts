// ワンピースの各巻のISBNと表紙URLを楽天ブックスAPIから取得するスクリプト
// Usage: npx ts-node scripts/fetch-onepiece-volumes.ts

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;

if (!RAKUTEN_APP_ID) {
    console.error('RAKUTEN_APP_ID is not set in .env.local');
    process.exit(1);
}

interface RakutenItem {
    Item: {
        title: string;
        isbn: string;
        largeImageUrl: string;
        mediumImageUrl: string;
    };
}

interface VolumeData {
    volume: number;
    isbn: string;
    coverUrl: string;
    title: string;
}

// 巻番号を抽出
function extractVolumeNumber(title: string): number | null {
    // "ONE PIECE 1" or "ONE PIECE　1" or "ONE PIECE（1）" etc
    const patterns = [
        /ONE\s*PIECE\s+(\d+)/i,
        /ONE\s*PIECE[（(](\d+)[)）]/i,
        /(\d+)$/,
    ];

    for (const pattern of patterns) {
        const match = title.match(pattern);
        if (match) {
            return parseInt(match[1], 10);
        }
    }
    return null;
}

async function fetchOnePieceVolumes(): Promise<VolumeData[]> {
    const results: VolumeData[] = [];
    const foundVolumes = new Set<number>();

    // 複数回APIを呼んで多くの巻を取得
    // sort=sales（売上順）、sort=-releaseDate（発売日降順）、sort=+releaseDate（発売日昇順）
    const sortOptions = ['sales', '+releaseDate', '-releaseDate'];

    for (const sort of sortOptions) {
        // 各ソートオプションで2ページ分取得
        for (let page = 1; page <= 2; page++) {
            const url = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?format=json&title=ONE+PIECE&author=%E5%B0%BE%E7%94%B0%E6%A0%84%E4%B8%80%E9%83%8E&booksGenreId=001001&applicationId=${RAKUTEN_APP_ID}&hits=30&page=${page}&sort=${sort}`;

            console.log(`Fetching page ${page} with sort=${sort}...`);

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    console.error(`API error: ${response.status}`);
                    continue;
                }

                const data = await response.json();
                const items: RakutenItem[] = data.Items || [];

                for (const item of items) {
                    const title = item.Item.title;
                    const volume = extractVolumeNumber(title);

                    // 巻番号が取得でき、まだ追加されていない場合
                    if (volume !== null && !foundVolumes.has(volume)) {
                        foundVolumes.add(volume);
                        results.push({
                            volume,
                            isbn: item.Item.isbn,
                            coverUrl: item.Item.largeImageUrl || item.Item.mediumImageUrl,
                            title: `ONE PIECE ${volume}`,
                        });
                        console.log(`  Found: Volume ${volume} - ISBN: ${item.Item.isbn}`);
                    }
                }

                // API制限を避けるため少し待機
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`Fetch error:`, error);
            }
        }
    }

    // 巻番号でソート
    results.sort((a, b) => a.volume - b.volume);

    return results;
}

async function main() {
    console.log('Fetching ONE PIECE volumes from Rakuten Books API...\n');

    const volumes = await fetchOnePieceVolumes();

    console.log(`\nTotal volumes found: ${volumes.length}`);
    console.log('\nGenerating TypeScript code...\n');

    // TypeScriptコード生成
    let tsCode = `// ONE PIECE の巻データ（楽天ブックスAPIから自動生成）
// Generated: ${new Date().toISOString()}

export interface OnePieceVolumeData {
  volume: number;
  isbn: string;
  coverUrl: string;
  title: string;
}

// ワンピースの巻データ（APIから取得）
export const ONE_PIECE_VOLUMES: OnePieceVolumeData[] = [
`;

    for (const vol of volumes) {
        tsCode += `  { volume: ${vol.volume}, isbn: '${vol.isbn}', coverUrl: '${vol.coverUrl}', title: '${vol.title}' },\n`;
    }

    tsCode += `];

// タイトル名からワンピースかどうかを判定
export function isOnePiece(title: string): boolean {
  const normalizedTitle = title.toLowerCase().replace(/\\s+/g, '');
  return normalizedTitle.includes('onepiece') || 
         title.includes('ワンピース') || 
         title.includes('ONE PIECE');
}

// 巻番号からワンピースの表紙URLを取得
export function getOnePieceCoverUrl(volume: number): string | undefined {
  const volumeData = ONE_PIECE_VOLUMES.find(v => v.volume === volume);
  return volumeData?.coverUrl;
}
`;

    // ファイル出力
    const outputPath = './src/data/onepiece-volumes.ts';
    fs.writeFileSync(outputPath, tsCode, 'utf-8');

    console.log(`Generated: ${outputPath}`);
    console.log('\nVolume coverage:');
    const volumeNumbers = volumes.map(v => v.volume);
    for (let i = 1; i <= 30; i++) {
        const status = volumeNumbers.includes(i) ? '✓' : '✗';
        console.log(`  ${status} Volume ${i}`);
    }
}

main().catch(console.error);
