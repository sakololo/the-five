# 🔴 Strict Red Team Audit (Round 1/3)

**Focus**: Regression Testing & False Positives (Normal Search)

**Attack Hypothesis**:
Please criticize the new logic:
```typescript
const queryHasSpinoffKw = SPINOFF_KEYWORDS.some(k => normalizedQuery.includes(k));
if (!queryHasSpinoffKw) applyPenalty();
```
**Risk**: If a user searches for a Main Series title that *accidentally* contains a spinoff keyword string, they will get flooded with spinoff trash because the penalty is disabled globally.

**Scenario A: The "Guide" Hazard**
User searches: "Touring Guide" (Hypothetical manga title)
- "Guide" (ガイド) might be a spinoff keyword?
- `SPINOFF_KEYWORDS` includes "ガイドブック" (Guidebook).
- If user query is "Boku no Guide" (My Guide).
- Does it hit "ガイドブック"? No.
- But what about strict substrings?
- Code uses `keyword.replace(...)`. If keyword is "小説" (Novel).
- User searches "小説家になろう" (Let's become a novelist).
- Query includes "小説".
- Result: **All Spinoff Penalties are DISABLED**.
- Danger: The search results for "Novelist" will now prioritize Spinoff Light Novels over Manga adaptations if scoring is close.

**Scenario B: The Short Keyword Hazard**
`SPINOFF_KEYWORDS` includes `'s`.
- User searches: "JoJo's Bizarre Adventure".
- Query includes "'s".
- **Result**: `queryHasSpinoffKw` becomes TRUE.
- **Consequence**: All JoJo Spinoffs (Anthologies, etc.) lose their -100 penalty.
- **Impact**: JoJo spinoffs might mix into the main results, defeating the original purpose of the fix.

**Verdict**: The "Global Relaxation" based on *any* keyword presence is too broad and dangerous for common English words or short particles.
