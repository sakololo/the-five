# 🔴 Red Team Audit Report (Round 3)

**Status**: ❌ Fix Failed (Partial regression + Logic Flaw)

## 1. Naive Alias Replacement Bug
`normalizeSearchQuery` replaced "ワンピ" with "ONE PIECE" inside "ワンピース".
- Input: "ワンピース"
- Alias Key: "ワンピ" (Partially matched)
- Output: "ONE PIECEース"
- **Critique**: Partial match replacement must be smarter. If the key matches the *start* of the string, or we should fallback to `resolveAlias` returning the FULL correct title if it's a known alias.
- Actually, "ワンピース" should likely hit the alias "ワンピース" -> "ONE PIECE" if it exists. If "ワンピ" is hitting, it means "ワンピース" wasn't mapped?

## 2. Cross-Language Explicit Search Failure
- User Query: "チョッパー" (Katakana)
- Book Title: "CHOPPER" (English)
- Logic: `isExplicitSearch` checks if *the specific keyword triggering the penalty* is in the query.
- Failure: Query has "チョッパー", Title has "CHOPPER". They are different strings.
- **Result**: Penalty applied (-100).

**Blue Team Action Items**:
1. Fix Alias Replacement to avoid "ONE PIECEース".
2. Relax Explicit Search Logic: If the query contains *any* Spinoff keyword, disable *all* Spinoff penalties. (User is explicitly looking for spinoffs, so don't punish any spinoffs).
