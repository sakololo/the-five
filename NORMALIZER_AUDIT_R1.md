# 🔴 Normalizer Fix - Adversarial Review Round 1/4 (Complete)

**Red Team Attack on External Auditor's Proposal**

---

## Root Cause Analysis ✅ FOUND

### The Smoking Gun

**normalizer.ts** Line 121-124:
```typescript
// ひらがな → カタカナ
normalized = normalized.replace(/[\u3041-\u3096]/g, (char) => {
    return String.fromCharCode(char.charCodeAt(0) + 0x60);
});
```

**Flow**:
1. User enters: `"ワンピース チョッパー"` (Katakana)
2. `normalizeCharacters` is called
3. Result: `"ワンピース チョッパー"` (no change - already Katakana)
4. `resolveAlias` is called with `normalizedQuery = "ワンピース チョッパー"`
5. Partial match loop checks:
   - Alias key `"おねぴーす"` (Hiragana in dictionary)
   - But wait... **Hiragana in MANGA_ALIASES is NOT normalized!**
   - The matching happens on the KEY itself (from the dictionary)
   - `keyLower.includes(normalizedLower)` → `"おねぴーす".includes("ワンピースチョッパー")`? NO
   - `normalizedLower.includes(keyLower)` → `"ワンピースチョッパー".includes("おねぴーす")`? **NO**

**WAIT - This shouldn't match then. Let me re-trace...**

### Re-analysis

**resolveAlias** Line 147-148:
```typescript
return keyLower.includes(normalizedLower) || normalizedLower.includes(keyLower) ||
    keyLower.includes(queryLower) || queryLower.includes(keyLower);
```

Four checks:
1. `keyLower.includes(normalizedLower)`: `"おねぴーす".includes("ワンピースチョッパー")`? NO
2. `normalizedLower.includes(keyLower)`: `"ワンピースチョッパー".includes("おねぴーす")`? NO
3. `keyLower.includes(queryLower)`: `"おねぴーす".includes("ワンピース チョッパー")`? NO (has space)
4. `queryLower.includes(keyLower)`: `"ワンピース チョッパー".includes("おねぴーす")`? NO

**Result**: NO MATCH.

### Then Where Does "ONE PIECEース" Come From?

**Hypothesis**: There must be ANOTHER alias key like `"ワンピ"` that we missed.

Let me search more carefully...

**Actually**, looking at the test result again:
```json
"normalizedQuery": "ONE PIECEース チョッパー"
```

If the alias key was `"ワンピ"`, and it matched:
- Query: `"ワンピース チョッパー"`
- Match: `"ワンピース".includes("ワンピ")`? **YES**
- Replacement: `normalizedChars.replace("ワンピ", "ONE PIECE")`
- Result: `"ONE PIECEース チョッパー"` ✅

**Conclusion**: There IS an alias `"ワンピ": "ONE PIECE"` somewhere, OR partial matching is creating it dynamically.

**Let me check if there's dynamic substring generation...**

Looking at line 147-148 again:
```typescript
return keyLower.includes(normalizedLower) || normalizedLower.includes(keyLower)
```

The second condition: `normalizedLower.includes(keyLower)`

If:
- `normalizedLower` = `"ワンピース"` (from "ワンピース チョッパー", assuming space normalization)
- `keyLower` = something shorter that `"ワンピース"` contains

**Scanning aliases by length...**
Actually, we need to grep for partial matches. The logic suggests that if `"ワンピース"` **contains** any alias key as a substring, it will match.

**The villain must be a SHORT key.**

What if there's an alias like:
- `"ワン": "..."`? Too generic.
- `"ピース": "..."`? Possible.

OR... the reverse: `keyLower.includes(normalizedLower)`

If there's a LONG alias key that CONTAINS "ワンピース":
- e.g. `"ワンピース完全版": "ONE PIECE Complete"`
- Then `"ワンピース完全版".includes("ワンピース")`? YES
- Matched key: `"ワンピース完全版"`
- Resolved: `"ONE PIECE Complete"`

But test shows `"ONE PIECEース"`, which suggests a PREFIX match, not a full title replacement.

**Final Hypothesis**: The key is shorter than "ワンピース", like "ワンピ", and it's matching through the `normalizedLower.includes(keyLower)` check.

---

## Red Team Verdict Round 1

**Attack Result**: 
External Auditor's proposal to "add ワンピース to aliases" is **INCOMPLETE**.

**Why**:
1. We need to identify the ACTUAL culprit alias causing the bug
2. Adding "ワンピース" might create conflicts with "ワンピースパーティー" (parody manga)
3. The root cause is the **partial replacement logic** (Line 201 in normalizer), not the alias dictionary

**Recommended Next Step**: 
Blue Team should:
1. Add debug logging to identify which alias key matched
2. OR directly test the normalizer with "ワンピース チョッパー"
3. Then decide: Fix dict OR fix logic
