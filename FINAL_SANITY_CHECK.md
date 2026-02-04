# 🔒 FINAL SANITY CHECK - Critical Review of Round 4 Proposal

**External Auditor: Final Gate**

---

## Proposal Under Review

**Round 4 proposed TWO changes**:
1. Prefix-aware sorting
2. Boundary-safe replacement (regex-based)

---

## 🚨 CRITICAL FLAW #1: Regex Performance & Escaping

### Proposed Code
```typescript
const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[\\s　]|$)', 'i');
```

### Problems

**A. Regex escaping for Japanese**:
- `key = "ワンピース"` (Japanese Katakana)
- These characters don't need escaping
- BUT the escaping regex `[.*+?^${}()|[\]\\]` only handles ASCII special chars
- What if an alias key contains `(` or `)` or `[`? (e.g., "Re:ゼロ(1)")
- The escaping WILL work, but it's overly complex for Japanese strings

**B. Performance**:
- Creating a new RegExp on EVERY query is expensive
- This runs for every search
- For a high-traffic app, this could be thousands of regex compilations per second

**C. Case sensitivity**:
- The `'i'` flag makes it case-INsensitive
- But `normalizedChars` is already normalized (Hiragana→Katakana)
- Why is case-insensitivity needed here?

---

## 🚨 CRITICAL FLAW #2: False Negatives with Boundary Check

### Test Case: Numbers

**Query**: `"ワンピース1"`
**Alias key**: `"ワンピース"`
**Regex**: `/ワンピース(?=[\s　]|$)/`

**Does "ワンピース1" match?**
- `"ワンピース1".match(/ワンピース(?=[\s　]|$)/)` → **NO MATCH**
- `1` is not a space or end-of-string
- **Result**: No replacement happens
- **Final**: `"ワンピース1"` stays as is

**Is this correct?**
- If user searches "ワンピース1" (ONE PIECE Vol. 1)
- They likely want it normalized to "ONE PIECE 1"
- **Current proposal FAILS this case**

**Fix**: Boundary should include digits and certain punctuation:
```typescript
(?=[\s　\d]|$)
```

But then what about:
- `"ワンピース！"` (with exclamation mark)?
- `"ワンピース・"` (with middle dot)?

**This is a rabbit hole.**

---

## 🚨 CRITICAL FLAW #3: Prefix Logic Breaks Partial Queries

### Test Case: Hiragana Input

**User types**: `"わんぴーす"` (Hiragana - mobile keyboard)
**After `normalizeCharacters`**: `"ワンピース"` (converted to Katakana)

**Aliases**:
- `'おねぴーす': 'ONE PIECE'` (Hiragana in dictionary)
- `'ワンピース': 'ONE PIECE'` (Katakana in dictionary)

**Matching**:
1. Exact match check: `MANGA_ALIASES["ワンピース"]`? **YES** → Returns immediately ✅

**OK, exact match works.**

But what about:
**User types**: `"わんぴ"` (Hiragana abbreviation)
**After normalization**: `"ワンピ"` (Katakana)
**Exact match**: `MANGA_ALIASES["ワンピ"]`? **YES** → Returns immediately ✅

**Also OK.**

---

## 🚨 CRITICAL FLAW #4: Unnecessary Complexity

### Current Problem
- "ワンピース チョッパー" → "ONE PIECEース チョッパー"

### Root Cause
- Partial match finds both "ワンピ" and "ワンピース"
- Shortest-first sort picks "ワンピ"
- Naive replacement creates garbage

### Simplest Fix (Overlooked)

**Why are we even doing partial matching for compound queries?**

**Alternative Approach**: 
Only use the **FIRST TOKEN** for alias resolution:

```typescript
// Before alias resolution
const tokens = normalizedChars.split(/[\s　]+/);
const firstToken = tokens[0];

// Resolve only the first token
const aliasResult = resolveAlias(cleanedQuery, firstToken);

if (aliasResult) {
    // Replace only the first token
    const remainingTokens = tokens.slice(1).join(' ');
    finalNormalized = aliasResult.resolved + (remainingTokens ? ' ' + remainingTokens : '');
}
```

**Test**:
- Input: "ワンピース チョッパー"
- First token: "ワンピース"
- Exact match: "ワンピース" → "ONE PIECE"
- Final: "ONE PIECE チョッパー" ✅

**Benefits**:
1. ✅ No complex sorting logic
2. ✅ No regex needed
3. ✅ Preserves all other tokens
4. ✅ Fails gracefully for compound words like "ワンピースパーティー" (treated as single token)

**Drawbacks**:
- What if the manga title itself contains spaces? E.g., "Hunter × Hunter"
- After normalization, might become "Hunter×Hunter" (no space)
- So this is probably fine

---

## 🎯 RECOMMENDATION

**REJECT Round 4 Proposal.**

**Adopt "First Token Only" approach instead**:
1. Split `normalizedChars` by whitespace
2. Resolve only the first token
3. Reconstruct with resolved first token + remaining tokens

**Code Changes**: `normalizer.ts` Lines 190-214

**Risk**: LOW (simpler logic, fewer edge cases)
**Benefit**: Solves the bug without introducing complexity

---

## Final Verdict

**The Round 4 proposal is over-engineered.**

"First Token Only" is:
- ✅ Simpler
- ✅ Safer
- ✅ Faster (no regex)
- ✅ More predictable

**Approve "First Token Only" approach instead.**
