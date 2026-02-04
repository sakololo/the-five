# 🔵 Normalizer Fix - Adversarial Review Round 4/4 (FINAL)

**Blue Team Final Solution**

---

## The Perfect Fix

### Problem Statement
- Shortest-first: "ワンピース" → matches "ワンピ" → "ONE PIECEース" ❌
- Longest-first: "ワンピ" → matches "ワンピース グッズ" → Wrong resolution ❌

**Root Cause**: The SORT is wrong. We need **BEST MATCH**, not longest or shortest.

---

## Solution: Two-Phase Matching

### Phase 1: Prioritize Exact Match
Already implemented (Lines 134-139).

### Phase 2: Smart Partial Matching

**Current Logic**:
```typescript
const partialMatches = Object.entries(MANGA_ALIASES).filter(([key]) => {
    const keyLower = key.toLowerCase();
    return keyLower.includes(normalizedLower) || normalizedLower.includes(keyLower);
});
partialMatches.sort((a, b) => a[0].length - b[0].length); // Shortest first
```

**New Logic**:
```typescript
const partialMatches = Object.entries(MANGA_ALIASES).filter(([key]) => {
    const keyLower = key.toLowerCase();
    return keyLower.includes(normalizedLower) || normalizedLower.includes(keyLower);
});

// Sort by BEST FIT:
// 1. Prefer keys that are PREFIXES of the query (query.startsWith(key))
// 2. Among prefixes, prefer LONGEST
// 3. Otherwise, prefer SHORTEST (for abbreviations)
partialMatches.sort((a, b) => {
    const aKey = a[0].toLowerCase();
    const bKey = b[0].toLowerCase();
    
    const aIsPrefix = normalizedLower.startsWith(aKey);
    const bIsPrefix = normalizedLower.startsWith(bKey);
    
    // If both are prefixes, prefer longer
    if (aIsPrefix && bIsPrefix) {
        return b[0].length - a[0].length;
    }
    
    // If only one is prefix, prefer that one
    if (aIsPrefix) return -1;
    if (bIsPrefix) return 1;
    
    // Neither is prefix: prefer shorter (abbreviation logic)
    return a[0].length - b[0].length;
});
```

---

## Test Cases

### Case 1: "ワンピース チョッパー"
**Matches**: ["ワンピ", "ワンピース"]
**Analysis**:
- `"ワンピースチョッパー".startsWith("ワンピ")`? YES → isPrefix = true
- `"ワンピースチョッパー".startsWith("ワンピース")`? YES → isPrefix = true
- Both are prefixes → Sort by longest
- Winner: "ワンピース" ✅

### Case 2: "ワンピ"
**Matches**: ["ワンピ", "ワンピース"]
**Analysis**:
- `"ワンピ".startsWith("ワンピ")`? YES → isPrefix = true
- `"ワンピ".startsWith("ワンピース")`? NO → isPrefix = false
- Only "ワンピ" is prefix
- Winner: "ワンピ" ✅

### Case 3: "ハンター" (assuming "ハンタ" abbreviation exists)
**Matches**: ["ハンタ"]
**Analysis**:
- `"ハンター".startsWith("ハンタ")`? NO
- `"ハンタ".includes("ハンター")`? NO
- `"ハンター".includes("ハンタ")`? NO
- **NO MATCH** (correct - these don't overlap)

Wait, the filter logic:
```typescript
return keyLower.includes(normalizedLower) || normalizedLower.includes(keyLower);
```

- `"ハンタ".includes("ハンター")`? NO
- `"ハンター".includes("ハンタ")`? NO

**They don't match.** Good. "ハンター" and "ハンタ" are different enough.

### Case 4: "ワンピースパーティー"
**Matches**: ["ワンピ", "ワンピース"]
**Analysis**:
- `"ワンピースパーティー".startsWith("ワンピ")`? YES
- `"ワンピースパーティー".startsWith("ワンピース")`? YES
- Both are prefixes → Sort by longest
- Winner: "ワンピース"
- Replacement: `replace("ワンピース", "ONE PIECE")` → "ONE PIECEパーティー"

**Is this correct?**
- If the parody manga is titled "ワンピースパーティー" in the database → Replacement to "ONE PIECEパーティー" might NOT match.
- BUT if it's titled "ONE PIECE Party" in the database → Replacement helps.

**Verdict**: This is an **edge case** that requires either:
1. Dictionary entry: `"ワンピースパーティー": "ONE PIECE Party"` (specific override)
2. OR accepting that compound titles might not alias correctly

---

## Smart Replacement Logic (Additional Safety)

**Current** (Line 200-201):
```typescript
if (key && normalizedChars.includes(key)) {
    finalNormalized = normalizedChars.replace(key, aliasResult.resolved);
}
```

**Enhanced**:
```typescript
if (key && normalizedChars.includes(key)) {
    // Only replace if key is followed by word boundary or is at end
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[\\s　]|$)', 'i');
    
    if (regex.test(normalizedChars)) {
        finalNormalized = normalizedChars.replace(key, aliasResult.resolved);
    } else {
        // Key is part of compound word - don't replace
        finalNormalized = normalizedChars;
    }
}
```

**This prevents**:
- "ワンピースパーティー" → No replacement (no space after "ワンピース")
- "ワンピース チョッパー" → Replacement OK (space after "ワンピース")

---

## Final Recommendation

**Two Changes**:

1. **Fix Sort Logic**: Use prefix-aware sort (favoring longest prefix)
2. **Fix Replacement Logic**: Only replace if followed by delimiter or end-of-string

**Risk Level**: Medium
- More complex logic
- Requires testing with various queries

**Benefit**: 
- Solves "ONE PIECEース" bug
- Preserves abbreviation functionality
- Prevents compound word corruption

---

## Code Changes Required

**File**: `src/lib/search/core/normalizer.ts`

**Line 151-154**: Replace sort logic
**Line 200-202**: Add boundary check to replacement

---

**Ready for Final Approval**
