# 🔴 Red Team Audit Report (Simulation)

**Target**: `scorer.ts` (Spinoff Penalty -100) & `deduplicator.ts`

## 1. Attack Vector: Allowlist Evasion (過剰なペナルティ)
The current implementation applies a generic `-100` penalty to any title containing "ファンブック" or "外伝".

**Scenario (False Positive):**
A user intentionally searches for a spinoff, e.g., "**ワンピース ファンブック**".
- **Current Logic**:
    - Title: "ONE PIECE BLUE DEEP CHARACTERS WORLD (ファンブック)"
    - `checkSpinoffKeywords` -> returns `true`.
    - Penalty: `-100`.
    - Result: This valid result will be buried at the bottom, likely below unrelated books with score 0.
- **Fail**: The user *asked* for the spinoff but got punished for it.

## 2. Attack Vector: Deduplication Collisions (誤った重複排除)
`deduplicator.ts` normalizes titles by removing numbers and `( )`.

**Scenario (Collision):**
- Book A: "NARUTO -ナルト-" (Manga)
- Book B: "NARUTO -ナルト- [小説]" (Novel)
    - If "小説" is not handled in normalization, they might remain distinct (Good).
    - But if `checkSpinoffKeywords` treats "小説" as a penalty, Book B gets -100.
    - If `deduplicator` sees them as different "Series", both show up (one at top, one at bottom).
- **Critique**: Deduplication might be too aggressive if it merges "Official Guide" with "Main Series" just because the title stem is similar.

## 3. Attack Vector: The "Zero Volume" Problem
Some prequels are titled "Volume 0".
- `extractVolumeNumber` might handle `0`, but `checkSpinoffKeywords` might catch "Episode 0" if "エピソード" is a keyword.
- "Jujutsu Kaisen 0" -> Penalty?

**Verdict**: The current "Global Penalty" is too blunt. It must be conditional based on the user's query.
