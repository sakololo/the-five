# 🔴 Red Team Attack: "First Token Only" Approach

**Target**: The proposed "First Token Only" alias resolution

---

## 🔪 Attack #1: Multi-Word Manga Titles

### Case: User searches for "Hunter × Hunter"

**Input**: `"Hunter × Hunter G.I.編"`
**After normalization**: `"Hunter×HunterG.I.編"` (depends on how `×` is handled)

**OR if spaces preserved**:
**Tokens**: `["Hunter", "×", "Hunter", "G.I.編"]`
**First token**: `"Hunter"`

**Alias check**: `MANGA_ALIASES["Hunter"]`? Probably NO.

**Result**: No alias resolution. ❌

**Expected**: Should resolve to `"HUNTER×HUNTER"` canonical title.

**Verdict**: First Token Only **FAILS** for multi-word titles with spaces.

---

## 🔪 Attack #2: Prefix Aliases Won't Work

### Case: Alias is shorter than full title

**Aliases**:
- `'ハンタ': 'HUNTER×HUNTER'` (abbreviation)
- No entry for `'ハンター'` (partial)

**Input**: `"ハンター チョッパー"`
**First token**: `"ハンター"`
**Exact match**: NO

**Result**: No alias resolution. Query stays as `"ハンター チョッパー"`.

**But wait**: User typed `"ハンター"` (4 chars). Alias `"ハンタ"` is 3 chars.
- `"ハンター"` is NOT equal to `"ハンタ"`
- No exact match

**This is actually CORRECT behavior.** User typed something that isn't in the dictionary.

---

## 🔪 Attack #3: JoJo Parts

### Case: JoJo has multiple "Parts"

**Aliases**:
- `'ジョジョ': 'ジョジョの奇妙な冒険'`
- `'jojo': 'ジョジョの奇妙な冒険'`

**Input**: `"ジョジョ 5部"`
**Tokens**: `["ジョジョ", "5部"]`
**First token**: `"ジョジョ"`
**Exact match**: YES → `"ジョジョの奇妙な冒険"`

**Final**: `"ジョジョの奇妙な冒険 5部"` ✅

**Works correctly.**

---

## 🔪 Attack #4: Romaji/English Aliases

### Case: User types English abbreviation

**Input**: `"OP チョッパー"` (OP = One Piece slang)
**Tokens**: `["OP", "チョッパー"]`
**First token**: `"OP"`

**Alias check**: Is there `"OP": "ONE PIECE"` in dictionary?

Let me check...


**If NOT in dictionary**: No resolution. Query stays `"OP チョッパー"`.
**User intent**: Wanted "ONE PIECE チョッパー"

**Verdict**: This is a **dictionary coverage issue**, not a logic bug. The algorithm is correct; the dictionary is incomplete.

---

## 🔪 Attack #5: Space Normalization Before Tokenization

### Critical Question: When does tokenization happen?

**Current normalizer flow** (from code analysis):
1. Extract volume: `"ワンピース 1"` → volume=1, cleanedQuery=`"ワンピース"`
2. Normalize chars: `"ワンピース"` → `"ワンピース"`
3. Normalize separators: For matching purposes

**Proposed flow adds**:
4. Split by whitespace
5. Resolve first token only

**Edge Case**: Volume extraction might remove the number BEFORE tokenization.

**Input**: `"ワンピース 1 チョッパー"`
**After volume extraction**: volume=1, cleanedQuery=`"ワンピース チョッパー"` (number removed? or kept?)

Let me check `extractVolumeFromQuery`:
```typescript
// パターン: 末尾の数字
match = query.match(/\s\d+$/);
if (match) {
    const cleanedQuery = query.replace(/\s\d+$/, '').trim();
    return { volume: number, cleanedQuery };
}
```

**Only matches END of string.** So `"ワンピース 1 チョッパー"` does NOT match `/\s\d+$/`.

**Result**: Volume extraction returns `volume=null`, `cleanedQuery="ワンピース 1 チョッパー"`.

**Tokenization**: `["ワンピース", "1", "チョッパー"]`
**First token**: `"ワンピース"`
**Resolution**: `"ONE PIECE"`
**Final**: `"ONE PIECE 1 チョッパー"` ✅

**Works correctly.**

---

## 🔪 Attack #6: What If Dictionary Entry Has Space?

### Case: Alias key contains a space

**Check aliases.ts for space-containing keys...**

Looking at the aliases, most are single words or compound words without spaces.

But what if someone adds:
- `'ゴゴゴ ジョジョ': 'ジョジョの奇妙な冒険'`?

**Input**: `"ゴゴゴ ジョジョ"`
**First token**: `"ゴゴゴ"`
**Exact match**: NO

**Result**: No resolution. ❌

**Verdict**: First Token Only approach **CANNOT** handle multi-word alias keys.

**Risk assessment**: Are there multi-word keys in the current dictionary?
- Most entries are single words or concatenated
- Risk is LOW but non-zero

---

## 🔪 Attack #7: The Fundamental Problem Still Exists

### What we're trying to fix

**Original bug**: `"ワンピース チョッパー"` → `"ONE PIECEース チョッパー"`

**First Token Only fix**: `"ワンピース チョッパー"` → `"ONE PIECE チョッパー"` ✅

**But consider this scenario**:

**Input**: `"ワンピースチョッパー"` (NO SPACE - compound word)
**Tokens**: `["ワンピースチョッパー"]`
**First token**: `"ワンピースチョッパー"`
**Exact match**: NO

**Current behavior (partial match)**:
- `normalizedLower.includes(keyLower)` → `"ワンピースチョッパー".includes("ワンピース")`? YES
- Match: `"ワンピース"`
- Replacement: `"ONE PIECEチョッパー"` (STILL broken!)

**Wait, the proposal says "Exact Only"!**

If we use `resolveAliasExactOnly`, then:
- Exact match: NO
- No resolution
- Final: `"ワンピースチョッパー"` (unchanged)

**Is this correct?**
- If user typed `"ワンピースチョッパー"` as a single word...
- They might have forgotten the space
- Arguably, we should try to help them

**But also**: If they typed a REAL compound title like `"ワンピースパーティー"`, we should NOT mangle it.

**Verdict**: Exact match only is SAFE but LESS HELPFUL.

---

## 🟢 Final Red Team Verdict

### Attacks that FAILED (approach is robust):
| Attack | Result |
|--------|--------|
| JoJo parts | ✅ Works |
| Volume + extra words | ✅ Works |
| Multi-word titles with spaces | ❌ Fails (but rare in aliases) |
| Compound words (no space) | ⚠️ No resolution (safe but unhelpful) |
| Romaji/English slang | ⚠️ Dictionary issue, not logic bug |

### Critical Weaknesses:
1. **Multi-word alias keys**: Cannot be matched (low risk)
2. **No-space compound queries**: Will not be resolved (acceptable trade-off)

### Recommendation

**APPROVE with caveats:**
1. Accept that multi-word alias keys won't work (don't add any)
2. Accept that spaceless compound queries won't be resolved (safe failure)
3. Monitor search logs for failed resolutions

---

## Alternative: Hybrid Approach (Optional Improvement)

If we want to help users who forget spaces:

```typescript
// 1. Try exact match on first token
let aliasResult = resolveAliasExactOnly(firstToken);

// 2. If no match AND query is single token, try partial match (current logic)
if (!aliasResult && tokens.length === 1) {
    aliasResult = resolveAliasPartial(normalizedChars);
    // But then use LONGEST match and FULL replacement
    if (aliasResult) {
        finalNormalized = aliasResult.resolved;
        // Discard any suffix (e.g., "チョッパー" in "ワンピースチョッパー")
        // This loses information but prevents garbage output
    }
}
```

**Risk**: Information loss for compound titles.
**Benefit**: Helps users who forget spaces.

**Recommendation**: Implement basic "First Token Only" first. Add hybrid later if needed.
