import { GET } from '../src/app/api/volumes/route';
import { NextRequest } from 'next/server';
import { extractVolumeNumber } from '../src/lib/search/core/volume-parser';

// Mock process.env
process.env.RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID || '1019079537947262807'; // Ensure ID is present
process.env.GOOGLE_BOOKS_API_KEY = 'dummy'; // Not used in volumes API
process.env.UPSTASH_REDIS_REST_URL = 'https://dummy.upstash.io'; // Mock for rate limiter
process.env.UPSTASH_REDIS_REST_TOKEN = 'dummy';

// Mock Rate Limiter if needed (But we want to test it?)
// The real rate limiter uses Upstash. If we don't have creds in env, it might fail or fallback.
// For this local test, we assume RateLimiter might block us if we go too fast, 
// OR it might fail open if configured to do so. 
// Actually, rate limiter imports 'lib/search/security/rate-limiter'.
// If we run this script, we need environment variables.

console.log('--- RED TEAM AUDIT: API/VOLUMES ---');

async function testApi(titleKana: string, description: string) {
    console.log(`\nTesting: ${description} (Query: "${titleKana}")`);

    // Construct URL
    const url = `http://localhost/api/volumes?titleKana=${encodeURIComponent(titleKana)}`;
    const req = new NextRequest(url);

    // Call API
    try {
        const res = await GET(req);
        const status = res.status;
        console.log(`Status: ${status}`);

        if (status === 200) {
            const data = await res.json();
            console.log(`Count: ${data.count}`);
            console.log(`Total Items (Rakuten): ${data.totalItems}`);

            if (data.books && data.books.length > 0) {
                console.log('First 3 books:');
                data.books.slice(0, 3).forEach((b: any) =>
                    console.log(`- [Vol.${b.volumeNumber}] ${b.title}`)
                );

                // Verify Sorting
                let prevVol = -1;
                let isSorted = true;
                for (const book of data.books) {
                    const vol = book.volumeNumber;
                    // null volume comes last.
                    if (vol === null) {
                        // Once we see null, all subsequent must be null
                        // But wait, my sort logic: a.vol - b.vol. nulls are last.
                        continue;
                    }

                    if (prevVol !== -1 && vol < prevVol) {
                        isSorted = false;
                        console.error(`❌ SORT FAILURE: Vol.${vol} came after Vol.${prevVol}`);
                    }
                    prevVol = vol;
                }

                if (isSorted) {
                    console.log('✅ Sorting Check: PASS');
                } else {
                    console.error('❌ Sorting Check: FAILED');
                }
            } else {
                console.warn('⚠️ No books found.');
            }
        } else {
            const error = await res.json();
            console.log(`Error: ${JSON.stringify(error)}`);
        }
    } catch (e) {
        console.error('Exception during API call:', e);
    }
}

async function runTests() {
    // 1. Normal Case (Katakana)
    await testApi('ワンピース', 'Normal Case: ONE PIECE (Katakana)');

    // 2. Normal Case (Hiragana - should work if Rakuten handles it)
    await testApi('わんぴーす', 'Edge Case: ONE PIECE (Hiragana)');

    // 3. Normal Case (English - should work if Rakuten handles it)
    await testApi('ONE PIECE', 'Edge Case: ONE PIECE (English)');

    // 4. Attack: Empty Query
    await testApi('', 'Attack: Empty Query');

    // 5. Attack: Too Long Query
    await testApi('A'.repeat(101), 'Attack: Too Long Query');

    // 6. Sort Logic Check: Series with many volumes
    await testApi('ナルト', 'Sort Check: NARUTO');
}

runTests();
