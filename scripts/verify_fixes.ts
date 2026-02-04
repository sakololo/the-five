
import { normalizeSearchQuery } from '../src/lib/search/core/normalizer';
import { scoreBook, BookData } from '../src/lib/search/core/scorer';

console.log("🔍 Verifying Search Fixes...\n");

let passed = 0;
let total = 0;

function assert(description: string, condition: boolean) {
    total++;
    if (condition) {
        console.log(`✅ ${description}`);
        passed++;
    } else {
        console.error(`❌ ${description}`);
    }
}

// 1. Normalizer Tests
console.log("--- Normalizer Tests ---");

const result1 = normalizeSearchQuery('ワンピース チョッパー');
assert('ワンピース チョッパー -> ONE PIECE チョッパー', result1.normalized === 'ONE PIECE チョッパー');
if (result1.normalized !== 'ONE PIECE チョッパー') console.log(`   Actual: ${result1.normalized}`);

const result2 = normalizeSearchQuery('ワンピース');
assert('ワンピース -> ONE PIECE', result2.normalized === 'ONE PIECE');

const result3 = normalizeSearchQuery('ワンピースパーティー');
assert('ワンピースパーティー -> ワンピースパーティー (No change)', result3.normalized === 'ワンピースパーティー');

const result4 = normalizeSearchQuery('ワンピ');
assert('ワンピ -> ONE PIECE', result4.normalized === 'ONE PIECE');

// 2. Scorer Tests
console.log("\n--- Scorer Tests ---");

const chopperBook: BookData = {
    title: 'ONE PIECE エピソードオブチョッパー',
    author: '尾田栄一郎',
};

// Test 1: Query contains spinoff keyword -> No Penalty
// Note: "チョッパー" is in SPINOFF_KEYWORDS in scorer.ts
const queryWithSpinoff = normalizeSearchQuery('One Piece チョッパー').normalized;
// normalizeSearchQuery might turn "One Piece" into "ONE PIECE" if it's in alias? 
// Actually "One Piece" is likely not in alias, or maps to ONE PIECE.
// Let's assume normalized is "ONE PIECE チョッパー" (uppercase if logic works, or kept as is)
// Actually scorer checks normalized query for keywords.

const scoreWithSpinoff = scoreBook(chopperBook, queryWithSpinoff, null);
assert('Spinoff Penalty REMOVED for "One Piece チョッパー"', scoreWithSpinoff.scoreBreakdown.spinoffPenalty === 0);


// Test 2: Query DOES NOT contain spinoff keyword -> Penalty Applied
const queryWithoutSpinoff = normalizeSearchQuery('One Piece').normalized;
const scoreWithoutSpinoff = scoreBook(chopperBook, queryWithoutSpinoff, null);

assert('Spinoff Penalty APPLIED for "One Piece"', scoreWithoutSpinoff.scoreBreakdown.spinoffPenalty < 0);


console.log(`\n\n🎉 Result: ${passed}/${total} checks passed.`);

if (passed === total) {
    process.exit(0);
} else {
    process.exit(1);
}
