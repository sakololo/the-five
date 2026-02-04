# 🔴 Normalizer Fix - Adversarial Review Round 3/4

**Red Team Attack on "Longest First" Proposal**

---

## Blue Team Proposal Under Attack

**Change**: `normalizer.ts` Line 152
```diff
- partialMatches.sort((a, b) => a[0].length - b[0].length);
+ partialMatches.sort((a, b) => b[0].length - a[0].length);
```

---

## 🔪 Attack Scenario 1: Abbreviation Hell

### Case: User Types Short Form of Long Title

**Aliases**:
- `'ハンタ': 'HUNTER×HUNTER'`
- `'ハンター×ハンター 全集': 'HUNTER×HUNTER Complete Collection'` (hypothetical)

**User Query**: `"ハンター"`

**Current Logic (Shortest First)**:
- Matches: ["ハンタ", "ハンター×ハンター 全集"]
- Sorted: ["ハンタ", ...]
- Winner: "ハンタ" → Resolves to "HUNTER×HUNTER" ✅

**Proposed Logic (Longest First)**:
- Matches: ["ハンタ", "ハンター×ハンター 全集"]
- Sorted: ["ハンター×ハンター 全集", "ハンタ"]
- Winner: "ハンター×ハンター 全集" → Resolves to "HUNTER×HUNTER Complete Collection" ❌
- **FALSE POSITIVE**: User wanted main series, got special edition.

---

## 🔪 Attack Scenario 2: Partial Query Upgrading

### Case: User Types Incomplete String

**Aliases**:
- `'ワンピ': 'ONE PIECE'`
- `'ワンピース グッズ': 'ONE PIECE Merchandise Guide'` (hypothetical)

**User Query**: `"ワンピ"`

**Current Logic (Shortest First)**:
- Match: "ワンピ"
- Winner: "ワンピ" → "ONE PIECE" ✅

**Proposed Logic (Longest First)**:
- Matches: ["ワンピ", "ワンピース グッズ"] (if "ワンピース グッズ".includes("ワンピ"))
- Sorted: ["ワンピース グッズ", "ワンピ"]
- Winner: "ワンピース グッズ" → "ONE PIECE Merchandise Guide" ❌
- **USER INTENT VIOLATED**: User wanted main manga, got merchandise.

---

## 🔪 Attack Scenario 3: The Real Problem - Replace Logic

**Even IF** we choose the longest match correctly:

**Query**: `"ワンピース チョッパー"`
**Match**: `"ワンピース"`
**Replacement**:
```typescript
finalNormalized = normalizedChars.replace(key, aliasResult.resolved);
```

Result: `"ONE PIECE チョッパー"` ✅

**BUT**:

**Query**: `"ワンピースパーティー"` (ONE PIECE Party - a parody manga)
**Match**: `"ワンピース"`
**Replacement**: `"ONE PIECEパーティー"`

**Now, when searching parody manga "ONE PIECE Party", the normalized query is "ONE PIECEパーティー".**

**Result**: The search will NOT match titles that write it as "ワンピースパーティー" (Katakana). It might match English "ONE PIECE Party" though, which could be correct OR incorrect depending on how the title is stored in the API.

---

## Red Team Verdict Round 3

**Longest-First is NOT a complete solution.**

**Why**:
1. Breaks abbreviation → full title resolution (Scenario 1)
2. Partial queries get over-resolved (Scenario 2)
3. Doesn't address compound title issues (Scenario 3)

**Recommended Approach**: 
The real fix is NOT in the sort order, but in **preventing replacement when the match is a substring of a compound word**.

**Example**:
- Query: "ワンピース チョッパー" → "ワンピース" is a WORD (followed by space) → Safe to replace
- Query: "ワンピースパーティー" → "ワンピース" is a PREFIX (followed by more letters) → Don't replace

**We need WORD BOUNDARY detection, but Japanese doesn't have word boundaries...**

**Alternative**: Only replace if:
- The matched key is the ENTIRE query (no extra characters), OR
- The matched key is followed by a delimiter (space, number, punctuation)

---

## Ready for Round 4 Final Solution
