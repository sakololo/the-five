# 🔵 Normalizer Fix - Adversarial Review Round 2/4

**Blue Team Defense & Fix Proposal**

---

## Round 1 Discovery

**Red Team found the root cause**:
- `aliases.ts` contains **BOTH**:
  - `'ワンピ': 'ONE PIECE'`
  - `'ワンピース': 'ONE PIECE'`

- `resolveAlias` sorts matches by **shortest first**:
  ```typescript
  partialMatches.sort((a, b) => a[0].length - b[0].length);
  ```

- When user types "ワンピース チョッパー":
  - Both "ワンピ" and "ワンピース" match
  - "ワンピ" wins (shorter)
  - Replacement creates "ONE PIECEース"

**External Auditor's proposal was WRONG.** Adding another alias doesn't fix the sorting bug.

---

## Blue Team Fix Proposal

### Option A: Reverse the Sort (Longest First)

**Change**: `normalizer.ts` Line 152
```diff
- partialMatches.sort((a, b) => a[0].length - b[0].length);
+ partialMatches.sort((a, b) => b[0].length - a[0].length);
```

**Logic**: Prefer the longest (most specific) matching key.

**Test**:
- Query: "ワンピース チョッパー"
- Matches: ["ワンピ", "ワンピース"]
- Sorted (longest first): ["ワンピース", "ワンピ"]
- Winner: "ワンピース"
- Replacement: `replace("ワンピース", "ONE PIECE")` → "ONE PIECE チョッパー" ✅

---

### Option B: Remove "ワンピ" from Aliases

**Rationale**: "ワンピ" is too short and ambiguous. Keep only "ワンピース".

**Risk**: Users who type "ワンピ" alone won't get alias resolution.

---

### Option C: Exact Match Only (No Partial Matching)

**Change**: Remove partial matching logic entirely.

**Risk**: Breaks queries like "ワン" → "ONE PIECE" (intentional fuzzy matching).

---

## Blue Team Recommendation

**Option A is safest.**

**Rationale**:
1. Maintains all existing aliases
2. Fixes the "最短優先" bug
3. More intuitive: "ワンピース" should match "ワンピース" before "ワンピ"

**Implementation**: Single line change, low risk.

---

## Ready for Round 3 Attack
