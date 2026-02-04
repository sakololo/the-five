import { normalizeSearchQuery } from '../src/lib/search/core/normalizer';
import { scoreBook, BookData } from '../src/lib/search/core/scorer';

// Mock Data: Popular books that might cause noise
const MOCK_BOOKS: BookData[] = [
    { title: "ONE PIECE 1" },
    { title: "吉野家 1" },        // 通常の「吉」
    { title: "Ⅰ巻 テスト" },     // ローマ数字
    { title: "123 数字タイトル" },
    { title: "!!! 記号タイトル" },
];

// Edge Case Test Scenarios
const EDGE_CASES = [
    { name: "Unicode 異体字", query: "𠮷野家", expected: "異体字が正規化されるか？" },
    { name: "ローマ数字 Ⅰ", query: "Ⅰ", expected: "ローマ数字が認識されるか？" },
    { name: "絵文字混在", query: "ONE PIECE 🏴‍☠️", expected: "絵文字が除去/無視されるか？" },
    { name: "スペースのみ", query: "   ", expected: "空入力として扱われるか？" },
    { name: "タブと改行", query: "\t\n", expected: "空入力として扱われるか？" },
    { name: "ゼロ幅スペース", query: "ONE​PIECE", expected: "見えないスペースが正規化されるか？" },
    { name: "1文字のみ", query: "A", expected: "短すぎる入力の挙動は？" },
    { name: "数値のみ", query: "123", expected: "数値だけで検索可能か？" },
    { name: "記号のみ", query: "!!!", expected: "記号が除去されて空になるか？" },
    { name: "混在ケース", query: "ONE123PIECE", expected: "数字と文字の混在" },
    { name: "101文字（境界）", query: "A".repeat(101), expected: "100文字に切り捨てられるか？" },
    { name: "NULL文字", query: "ONE\x00PIECE", expected: "NULLバイトが安全に処理されるか？" },
    { name: "SQLインジェクション風", query: "' OR '1'='1", expected: "特殊文字が安全に処理されるか？" },
    { name: "XSS風", query: "<script>alert('xss')</script>", expected: "HTMLタグが無害化されるか？" },
];

async function runEdgeCaseAudit() {
    console.log("🔍 Starting Edge Case Hunter Audit...\n");

    let crashCount = 0;
    let suspiciousCount = 0;

    for (const scenario of EDGE_CASES) {
        console.log(`--- Testing: ${scenario.name} [Query: "${scenario.query}"] ---`);

        try {
            const normalizedQ = normalizeSearchQuery(scenario.query);
            const queryStr = normalizedQ.normalizedForMatching;

            console.log(`   Normalized: "${normalizedQ.normalized}"`);
            console.log(`   For Matching: "${queryStr}"`);
            console.log(`   Length (original/normalized): ${scenario.query.length}/${normalizedQ.normalized.length}`);

            // Score all books against this query
            const results = MOCK_BOOKS.map(book => {
                try {
                    return scoreBook(book, queryStr, null);
                } catch (e) {
                    console.error(`   ⚠️ Crash in scoreBook for "${book.title}":`, e);
                    crashCount++;
                    return { ...book, score: -999, scoreBreakdown: {} as any, volumeNumber: null };
                }
            });

            // Apply Relevance Guard filter
            const filtered = results
                .filter(r => r.score >= 15)
                .filter(r =>
                    r.scoreBreakdown.exactTitleMatch > 0 ||
                    (r.scoreBreakdown as any).tokenTitleMatch > 0
                );

            console.log(`   Results: ${filtered.length} survivors`);

            // Check for suspicious behavior
            if (scenario.query.includes('<script>') && filtered.length > 0) {
                console.log(`   🚨 SECURITY: XSS payload was not sanitized!`);
                suspiciousCount++;
            }
            if (scenario.query.includes("'") && scenario.query.includes('OR') && filtered.length > 0) {
                console.log(`   🚨 SECURITY: SQL injection pattern was not sanitized!`);
                suspiciousCount++;
            }
            if (scenario.query.includes('\x00')) {
                console.log(`   ℹ️ NULL byte handling: OK (no crash)`);
            }
            if (scenario.query.length > 100 && normalizedQ.normalized.length <= 100) {
                console.log(`   ✅ Truncation working: ${scenario.query.length} → ${normalizedQ.normalized.length}`);
            }
            if (scenario.query.trim() === '' && queryStr === '') {
                console.log(`   ✅ Empty input correctly normalized to empty string`);
            }

        } catch (e) {
            console.error(`   💥 CRASH during normalization:`, e);
            crashCount++;
        }

        console.log("");
    }

    console.log("\n" + "=".repeat(60));
    if (crashCount > 0) {
        console.log(`❌ EDGE CASE AUDIT FAILED: ${crashCount} crashes detected.`);
        process.exit(1);
    } else if (suspiciousCount > 0) {
        console.log(`⚠️ EDGE CASE AUDIT WARNING: ${suspiciousCount} suspicious behaviors.`);
    } else {
        console.log("✅ EDGE CASE AUDIT PASSED: No crashes or security issues.");
    }
}

runEdgeCaseAudit();
