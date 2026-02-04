
import { normalizeSearchQuery } from '../src/lib/search/core/normalizer';
import { scoreBook } from '../src/lib/search/core/scorer';
import { MANGA_ALIASES } from '../src/lib/search/aliases';

console.log('=== Red Team Issue Verification ===');

// 1. Verify "ONE PIECEース" Bug (Naive Alias Replacement)
console.log('\n--- 1. Normalizer Verification ---');
const normalizerTests = [
    { input: 'ワンピース', description: 'Exact Match' },
    { input: 'ワンピース チョッパー', description: 'Prefix Match' },
    // "ワンピ" is a common key. Let's force it if it's in the alias list.
    { input: 'ワンピ', description: 'Alias Key Only' },
];

// Add a fake alias entry for testing if needed, but let's test with existing logic first.
// If "ワンピ" is an alias for "ONE PIECE", we want to see if "ワンピース" (which contains "ワンピ") breaks.

for (const test of normalizerTests) {
    const result = normalizeSearchQuery(test.input);
    console.log(`Input: "${test.input}"`);
    console.log(`Normalized: "${result.normalized}"`);
    console.log(`WasResolved: ${result.wasAliasResolved}`);
    
    if (result.normalized.includes('ース') && !test.input.includes('ース')) {
         console.error('❌ FAILED: "ONE PIECEース" bug detected!');
    } else if (result.normalized.includes('Piece Piece')) {
         console.error('❌ FAILED: "One Piece Piece" duplication bug detected!');
    } else {
         console.log('✅ OK');
    }
}


// 2. Verify Cross-Language Explicit Search Failure
console.log('\n--- 2. Scorer Verification (Cross-Language) ---');

const mockBook = {
    title: 'ONE PIECE CHOPPER', // English title
    author: 'Oda',
};

// Case A: Query is Katakana "チョッパー"
const queryA = 'チョッパー';
const normA = normalizeSearchQuery(queryA).normalized; // Should be "チョッパー" typically
console.log(`Query A: "${queryA}" (Norm: "${normA}")`);

const scoreA = scoreBook(mockBook, normA, null);
console.log(`Score Breakdown (Spinoff Penalty): ${scoreA.scoreBreakdown.spinoffPenalty}`);
if (scoreA.scoreBreakdown.spinoffPenalty === 0) {
    console.log('✅ OK: Penalty Exempted (Cross-Language worked)');
} else {
    console.log('❌ FAILED: Penalty Applied (Cross-Language failed)');
}

// Case B: Query is English "CHOPPER"
const queryB = 'CHOPPER';
const normB = normalizeSearchQuery(queryB).normalized;
console.log(`Query B: "${queryB}" (Norm: "${normB}")`);
const scoreB = scoreBook(mockBook, normB, null);
console.log(`Score Breakdown (Spinoff Penalty): ${scoreB.scoreBreakdown.spinoffPenalty}`);
if (scoreB.scoreBreakdown.spinoffPenalty === 0) {
    console.log('✅ OK: Penalty Exempted (Same Language worked)');
} else {
    console.log('❌ FAILED: Penalty Applied (Same Language failed)');
}
