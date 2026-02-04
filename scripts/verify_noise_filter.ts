
import { scoreBook } from '../src/lib/search/core/scorer';

console.log('=== Noise Filter Stress Test ===');

const query = 'ハヤテのごとく';
const normalizedQuery = 'ハヤテのごとく';

// Scenario: "Hayate no Gotoku" (Target) vs "One Piece" (Noise)

const targetBook = {
    title: 'ハヤテのごとく！ 1巻',
    author: '畑健二郎',
};

const noiseBook = {
    title: 'ONE PIECE 1', // Unrelated but popular (Vol 1)
    author: '尾田栄一郎',
};

console.log(`Query: "${query}"`);

// Score Target
const scoreTarget = scoreBook(targetBook, normalizedQuery, null);
console.log(`\nTarget (` + targetBook.title + `): Score = ${scoreTarget.score}`);
console.log(scoreTarget.scoreBreakdown);

// Score Noise
const scoreNoise = scoreBook(noiseBook, normalizedQuery, null);
console.log(`\nNoise (` + noiseBook.title + `): Score = ${scoreNoise.score}`);
console.log(scoreNoise.scoreBreakdown);

// Verify Logic
console.log('\n--- Evaluating Filter Logic ---');
const topScore = scoreTarget.score;
const thresholdCurrent = 20;
const thresholdProposed = 40;

console.log(`Top Score: ${topScore} (Trigger Threshold: 40) -> Filter Active? ${topScore >= 40}`);

if (topScore >= 40) {
    // Current Logic
    const noiseSurvivesCurrent = scoreNoise.score >= thresholdCurrent;
    console.log(`[Current] Filter >= ${thresholdCurrent}: Noise Survives? ${noiseSurvivesCurrent} (Score ${scoreNoise.score})`);

    if (noiseSurvivesCurrent) {
        console.error('❌ FAIL: Current filter fails to remove unrelated Vol 1 book.');
    } else {
        console.log('✅ PASS: Current filter removes noise.');
    }

    // Proposed Logic
    const noiseSurvivesProposed = scoreNoise.score >= thresholdProposed;
    console.log(`[Proposed] Filter >= ${thresholdProposed}: Noise Survives? ${noiseSurvivesProposed} (Score ${scoreNoise.score})`);

    if (!noiseSurvivesProposed) {
        console.log('✅ PASS: Proposed filter removes noise.');
    } else {
        console.error('❌ FAIL: Proposed filter still too loose.');
    }
}
