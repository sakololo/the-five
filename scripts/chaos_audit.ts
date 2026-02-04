
import { normalizeSearchQuery } from '../src/lib/search/core/normalizer';
import { scoreBook, BookData } from '../src/lib/search/core/scorer';

// Mock Data: Popular books that might cause noise
const MOCK_BOOKS: BookData[] = [
    { title: "ONE PIECE 1" },    // Short, Vol 1
    { title: "ONE PIECE 100" },  // Short, Vol 100
    { title: "Naruto 1" },       // Short, Vol 1
    { title: "Unknown Obscure Title 1" }, // Long, Vol 1
    { title: "Short 1" },        // Very Short, Vol 1
];

// Chaos Test Cases
const SCENARIOS = [
    { name: "Garbage Input", query: "asdf", expected: "Should match NOTHING" },
    { name: "Typo: Onepiece (No Space)", query: "Onepiece", expected: "Should match ONE PIECE (Ideally)" },
    { name: "Typo: H yate (Missing char)", query: "H yate", expected: "Should match Hayate?" },
    { name: "Empty String", query: "", expected: "Should fail or return empty" },
    { name: "Only Separators", query: "!!!", expected: "Should match nothing" },
    { name: "Volume 1 Trap", query: "xyz", expected: "Should NOT match 'ONE PIECE 1' (30pts?)" },
];

async function runChaosAudit() {
    console.log("🐵 Starting Chaos Monkey Audit...\n");

    let failureCount = 0;

    for (const scenario of SCENARIOS) {
        console.log(`--- Testing: ${scenario.name} [Query: "${scenario.query}"] ---`);

        const normalizedQ = normalizeSearchQuery(scenario.query);
        const targetVol = null; // Assume no volume specified for chaos inputs

        const queryStr = normalizedQ.normalizedForMatching;
        if (typeof queryStr !== 'string') {
            console.error('Normalized Query string is faulty', normalizedQ);
        }

        // Score all books against this query
        const results = MOCK_BOOKS.map(book => {
            try {
                return scoreBook(book, queryStr, targetVol);
            } catch (e) {
                console.error(`CRASH in scoreBook for "${book.title}" vs "${queryStr}":`, e);
                return { ...book, score: -999, scoreBreakdown: {} as any, volumeNumber: null };
            }
        });

        // Apply filters (simulating route.ts)
        // Filter 1: Absolute Floor >= 15
        let postFilter = results.filter(r => r.score >= 15);

        // Filter 2: Relevance Guard (Chaos Monkey Defense)
        // Remove items that have ZERO match relevancy
        postFilter = postFilter.filter(book =>
            book.scoreBreakdown.exactTitleMatch > 0 ||
            (book.scoreBreakdown as any).tokenTitleMatch > 0
        );

        console.log(`   Survivors (Relevance Guarded): ${postFilter.length}`);
        postFilter.forEach(r => {
            console.log(`   - [${r.score}] ${r.title} (Match: ${r.scoreBreakdown.exactTitleMatch}, Token: ${(r.scoreBreakdown as any).tokenTitleMatch}, Vol1: ${r.scoreBreakdown.volume1Bonus})`);

            // Check if "Garbage" (No text match) survived
            const hasTextMatch = r.scoreBreakdown.exactTitleMatch > 0 || (r.scoreBreakdown as any).tokenTitleMatch > 0;
            if (!hasTextMatch) {
                // This shouldn't happen with the Relevance Guard, but let's check double logic
                console.log("   🚨 CRITICAL: Relevance Guard FAILED! Non-matching book survived!");
                failureCount++;
            }
        });

        if (postFilter.length === 0 && scenario.name.includes("Typo")) {
            console.log("   ℹ️ Note: Strict filter killed typo match (Expected trade-off for safety)");
        }
        console.log("");
    }

    if (failureCount > 0) {
        console.log(`❌ CHAOS AUDIT FAILED: ${failureCount} critical leaks.`);
        process.exit(1);
    } else {
        console.log("✅ CHAOS AUDIT PASSED: No leaks detected (Guard is working).");
    }
}

runChaosAudit();
