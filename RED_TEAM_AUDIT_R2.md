# 🔴 Red Team Audit Report (Round 2)

**Status**: ❌ Fix Failed

## 1. Failure Analysis: Explicit Search Still Penalized
**Test Query**: "ワンピース チョッパー"
**Target Book**: `ONE PIECE CHOPPER’s 1`
**Result Score**: `-20` (Penalty `-100` Applied)

**Why it failed**:
The code uses `normalizedQuery.includes(normalizedKw)`.
- Query: "ワンピース チョッパー" -> Normalized: "ONE PIECE CHOPPER"
- Keyword: "CHOPPER"
- Code Check: `normalizedQuery.includes("chopper")` -> `true`
- But... checking `spinoff_test.json`, the breakdown still shows `spinoffPenalty: -100`.

**Root Cause Hypothesis**:
1. `normalizedQuery` used in `scoreBook` might be only the *first part* or differently normalized?
2. The logic `!isExplicitSearch` is flawed because strict partial match `title.toLowerCase().includes(normalizedKw)` might be failing on "CHOPPER's" vs "CHOPPER".
   - Title: `ONE PIECE CHOPPER’s 1` (Contains `’`)
   - Keyword: `CHOPPER`
   - Comparison: `one piece chopper’s 1`.includes(`chopper`) -> Should be true.

**Wait**, look at the JSON result for ID 2:
```json
"scoreBreakdown": {
    "exactTitleMatch": 50,
    "spinoffPenalty": -100
}
```
The logic `checkSpinoffKeywords` is called. Inside it:
```typescript
const isExplicitSearch = SPINOFF_KEYWORDS.some(...)
```
Ah, `SPINOFF_KEYWORDS` contains "CHOPPER".
If query is "ONE PIECE CHOPPER", `isExplicitSearch` *should* be true.
Why did it return false?

**Investigation Needed**:
Maybe `normalizedQuery` passed to `scoreBook` is NOT what we think it is.
In `route.ts`, `normalizedQuery` comes from `normalizeSearchQuery`.
If the user typed "ワンピース チョッパー", `normalizedQuery` should be "ONE PIECE CHOPPER".

**CRITICAL BUG**:
In `scorer.ts`:
```typescript
const normalizedKw = keyword.replace(/[\s・]/g, '').toLowerCase(); // "chopper"
return normalizedQuery.includes(normalizedKw) && title.toLowerCase().includes(normalizedKw);
```
If `normalizedQuery` is "one piece" (because user searched "One Piece"), then `includes("chopper")` is False.
**BUT** in this test case, we searched "ワンピース チョッパー".

Let's look at `spinoff_test.json` -> `"normalizedQuery":"ONE PIECE"` !!!
**The Normalizer stripped "Chopper"???**

## 2. The Real Culprit: Normalizer
The `normalizeSearchQuery` function likely treats "チョッパー" as an alias or something that leads to "ONE PIECE" only?
No, "Chopper" is not in the alias list we removed.

Wait, `normalizedQuery` in JSON output:
```json
"normalizedQuery": "ONE PIECE"
```
The requested URL was `?q=%E3%83%AF%E3%83%B3%E3%83%94%E3%83%BC%E3%82%B9+%E3%83%81%E3%83%A7%E3%83%83%E3%83%91%E3%83%BC` (ONE PIECE CHOPPER).

If the Normalizer returns "ONE PIECE", then `scoreBook` sees `normalizedQuery` as "ONE PIECE".
Then `normalizedQuery.includes("chopper")` is **FALSE**.
So `isExplicitSearch` becomes **FALSE**.
So Penalty is **APPLIED**.

**Conclusion**: The issue is in `normalizer.ts` or how `route.ts` handles the query before scoring.
If we resolve aliases, maybe "ワンピース" -> "ONE PIECE" replaces the *whole string*?
