# Adversarial Critique: Search Architecture V2

**Date**: 2026-02-03
**Reviewer**: External Auditor (Red Team)
**Subject**: Critical Review of Proposed Architecture

---

## Verdict: ⚠️ CONDITIONAL REJECTION

The proposed architecture has a solid conceptual foundation, but contains **5 critical flaws** that will cause production incidents if deployed as-is.

---

## Critical Flaw #1: Levenshtein Threshold is Broken

**Proposal**: `LevenshteinDistance(Candidate.Title, NormalizedQuery) < 3`

**Attack**:
- Query: "DB"
- Candidate: "DRAGON BALL"
- Levenshtein("DB", "DRAGON BALL") = 9 (fails)
- Candidate: "ドラゴンボール"
- Levenshtein("DB", "ドラゴンボール") = 7 (fails)

**Result**: The alias "DB" → "DRAGON BALL" passes through `Normalizer`, but if for any reason it doesn't, the Levenshtein fallback is **useless** because raw distance is meaningless for short queries.

**Fix**: Use **Normalized Levenshtein Distance** (distance / max(len(a), len(b))) with threshold 0.3 (30% difference allowed).

---

## Critical Flaw #2: Partial Alias Match is a Time Bomb

**Current Code (route.ts:79-84)**:
```typescript
return keyLower.includes(normalizedLower) || normalizedLower.includes(keyLower)
```

**Attack**:
- Query: "A"
- Alias Key: "AKIRA" (contains "A")
- Result: "A" matches "AKIRA"

This means **any single-character input** will match the first alias that contains that character.

**Fix**: Enforce a **minimum query length** of 2 characters for partial matching, and require the query to be at least 50% of the alias key length.

---

## Critical Flaw #3: No Caching or Request Coalescing

**FORENSIC_REPORT mentioned this risk but the Implementation Plan ignores it.**

**Problem**:
- User A searches "Naruto" at 12:00:00.000
- User B searches "Naruto" at 12:00:00.050
- Both trigger 3 parallel Rakuten API calls (6 total).

**Impact**: Rakuten rate limits (429 errors) under moderate traffic.

**Fix**: Implement **request coalescing** using a Map of in-flight Promises.
```typescript
const inflightRequests = new Map<string, Promise<Result>>();
async function search(query: string) {
  if (inflightRequests.has(query)) {
    return inflightRequests.get(query);
  }
  const promise = doActualSearch(query);
  inflightRequests.set(query, promise);
  const result = await promise;
  inflightRequests.delete(query);
  return result;
}
```

---

## Critical Flaw #4: Edition Penalty is Too Weak

**Proposal**: `-5 points` for Bunko/Aizoban editions.

**Problem**:
- "ONE PIECE 文庫" has Exact Title Bonus (+50) + Volume 1 Bonus (+20) + Edition Penalty (-5) = **+65**
- "ONE PIECE" (Tankobon) has Exact Title Bonus (+50) + Volume 1 Bonus (+20) = **+70**

If the Bunko version happens to match "Shortest Title" (because 文庫 editions often have shorter titles), it can **surpass** the Tankobon.

**Fix**: Make Edition Penalty **multiplicative** (-20%) or increase it to **-20 points**.

---

## Critical Flaw #5: No Graceful Degradation

**Scenario**: Rakuten API returns 500 or times out.

**Current Plan**: No mention of fallback behavior.

**Impact**: User sees "Search failed" with no actionable feedback.

**Fix**:
1. Implement a **circuit breaker** pattern.
2. On API failure, return cached results (if available) with a `stale: true` flag.
3. If no cache, return `{ books: [], error: 'SERVICE_UNAVAILABLE', retryAfter: 30 }`.

---

## Minor Issues

| Issue | Severity | Recommendation |
| :--- | :--- | :--- |
| No logging of search latency | Low | Add `performance.now()` markers |
| `supabase` import is unused | Low | Remove dead import |
| Test scenarios missing edge cases | Medium | Add tests for empty query, emoji input, SQL injection |

---

## Revised Recommendations

1. **Normalize Levenshtein**: Use ratio, not raw distance.
2. **Guard Partial Alias Match**: Minimum 2 chars, length ratio check.
3. **Add Request Coalescing**: Map of in-flight promises.
4. **Strengthen Edition Penalty**: -20 points or multiplicative.
5. **Add Circuit Breaker**: Graceful degradation on API failure.
6. **Add Telemetry**: Log latency, cache hit rate, error rate.
