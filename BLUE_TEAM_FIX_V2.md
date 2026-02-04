# 🔵 Blue Team Fix Proposal

**Issue**: `normalizeSearchQuery` completely replaces the user's query with the resolved alias if a partial match triggers.
- Input: "ワンピース チョッパー"
- Alias Match: "ワンピース" -> "ONE PIECE"
- Current Output: "ONE PIECE" (Chopper is lost)
- Consequence: Explicit search check fails.

**Proposed Fix (`src/lib/search/core/normalizer.ts`)**:
Modify `normalizeSearchQuery` (specifically the `resolveAlias` or handling of it) to replace only the matched substring.

**Plan**:
1.  Update `resolveAlias` (or the caller) to perform string replacement instead of full return.
2.  Actually, `resolveAlias` returns the *target title*. The caller `normalizeSearchQuery` constructs the return object.
3.  We need to reconstruct the `normalized` string by replacing the `aliasKey` with `aliasResult.resolved` in the original `normalizedChars`.

**Code Change**:
In `normalizeSearchQuery`:
```typescript
    // Step 5: エイリアス解決
    const aliasResult = resolveAlias(cleanedQuery, normalizedChars);

    if (aliasResult) {
        // Fix: Don't just return aliasResult.resolved.
        // Replace the matched alias key in the normalized string with the resolved title.
        
        // Note: normalizedChars is like "ワンピース チョッパー"
        // aliasResult.key is "ワンピース"
        // aliasResult.resolved is "ONE PIECE"
        
        // specific check to avoid blind replace if multiple occur? 
        // Just simple replace for now is better than current behavior.
        
        // We use a case-insensitive logical replacement or just direct regex replace
        const regex = new RegExp(escapeRegExp(aliasResult.key!), 'i'); // safe? key comes from alias dict
        const newNormalized = normalizedChars.replace(aliasResult.key!, aliasResult.resolved);
        
        // But wait, resolveAlias logic for partial match was:
        // keyLower.includes(normalizedLower) || normalizedLower.includes(keyLower)
        
        // If query is "ワンピース" (key) and input "ワンピース" -> Perfect.
        // If query is "ワンピース チョッパー" and key "ワンピース" -> `normalizedChars.includes(key)` is true.
        // We want "ONE PIECE チョッパー".
        
        // What if input is "ワンピ" (key matches "ワンピース"?? No, alias keys are usually the short forms)
        // If alias is "ワンピ" -> "ONE PIECE". Input "ワンピ チョッパー".
        // Replace "ワンピ" with "ONE PIECE". -> "ONE PIECE チョッパー". Correct.
        
        // What if reversed? Key "ワンピース" includes input "ワンピ"? 
        // Then we can't replace. In that case, we probably WANT to return just the resolved title?
        // E.g. User types "ワンピ" (partial of "ワンピース"? No, "ワンピ" is likely the alias key itself).
        
        // Let's assume alias keys are the shorter inputs. 
        // If normalizedLower.includes(keyLower) -> We replace.
        // If keyLower.includes(normalizedLower) -> We return resolved (Upgrade the short query to full title).
        
        let finalNormalized = aliasResult.resolved;
        
        if (normalizedChars.includes(aliasResult.key!)) {
             finalNormalized = normalizedChars.replace(aliasResult.key!, aliasResult.resolved);
        }
        
        return {
            normalized: finalNormalized,
            normalizedForMatching: normalizeSeparators(finalNormalized),
            original,
            targetVolume: volume,
            wasAliasResolved: true,
            aliasKey: aliasResult.key,
        };
    }
```
Wait, `aliasResult.key` might be different case/format than `normalizedChars`?
`resolveAlias` finds the key in `MANGA_ALIASES`.
`normalizedChars` has been normalized (katakana, etc).
We should ensure we replace the matching part properly.

Let's modify `normalizer.ts`.
