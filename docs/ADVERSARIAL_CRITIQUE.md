# Adversarial Critique of SEARCH_MASTER_PLAN.md

**Role**: Red Team (Audit)
**Date**: 2026-02-03
**Target**: `SEARCH_MASTER_PLAN.md` (Master Draft)

---

## 1. Critical Flaws found in Logic

### 1.1. The "Typo Paradox"
**Observation**: The plan lists "Typo: 'Jujusu' -> 'Jujutsu Kaisen' (via Levenshtein)" as a verification case.
**Critique**: The current pipeline sends the normalized query to Rakuten. If "Jujusu" is not in the Alias Dictionary, it is sent raw to Rakuten.
- **Risk**: Rakuten API likely returns **0 results** for "Jujusu".
- **Impact**: The "Heuristic Scorer" (where Levenshtein lives) interprets *returned results*. If input is garbage, output is empty. The Scorer cannot correct a query that yields no candidates.
- **Recommendation**: 
    - **Option A**: Implement a client-side "Fuzzy Alias" matcher (expensive?).
    - **Option B**: Accept that we cannot fix unknown typos without a "Did you mean?" API.
    - **Action**: Clarify in plan: Is Levenshtein for *ranking* (ranking "Naruto" above "Baruto" if "Naruto" was intended?) or *correction*? If correction, the architecture is missing a step.

### 1.2. "Exact Title" Bonus Fragility
**Observation**: `Exact Title Bonus: +50` for `Book.Title === NormalizedBaseQuery`.
**Critique**: Rakuten API titles are often messy (e.g., "ONE PIECE 1 (Jump Comics)").
- **Risk**: Searching "ONE PIECE" will almost never "Exactly Match" the string "ONE PIECE 1 (Jump Comics)".
- **Impact**: The +50 bonus will rarely trigger, making the scoring curve flatter than intended.
- **Recommendation**: Use "Exact Title *Prefix*" or "Token Set Match" instead of strict string equality. Or normalize the *Result Title* before comparison (strip volume numbers/suffixes).

## 2. Missing Features / user Experience Gaps

### 2.1. Pagination / Load More
**Observation**: No mention of pagination.
**Critique**: If the user searches "Isekai", they might want to browse.
- **Counter-Argument (Blue Team)**: This is "The Five", focused on *finding THE book*, not browsing a catalog.
- **Verdict**: Acceptable omission if the "Intent" philosophy holds, but "AMBIGUOUS_MATCH" might populate a list that needs a "See more" link.

### 2.2. Adult Content Filter
**Observation**: No explicit filtering mentioned.
**Critique**: Rakuten API might return adult content for generic keywords.
- **Recommendation**: Verify if Rakuten API has a safe-search flag, or enforce strict genre filtering in the `Filter` stage.

## 3. Architecture & Performance

### 3.1. Parallel Fetch Overhead
**Observation**: `SearchStrat --> |Main| API_Title` AND `|Fallback| API_Key`.
**Critique**: Doing both *always* (implied by "Parallel Fetch") doubles the API usage cost/rate-limit consumption per user query.
- **Recommendation**: Use `Promise.any` or sequential fallback? Or is the latency of sequential fallback unacceptable? 
- **Refinement**: If `Normalizer` gives a strong signal ("High Confidence Alias"), maybe skip the Fallback Key search to save quota.

---

## 4. Security V2.2 Review

Status: **APPROVED**.
- Rate Limiting and Circuit Breaker implementation steps look solid.

---
## 5. Summary of Required Actions (for Blue Team)
1.  **Refine Scoring Logic**: "Exact Match" needs to be looser (Title normalization).
2.  **Address Typo Strategy**: Explicitly define how "Jujusu" yields results, or remove that test case expectation.
3.  **Optimize Network**: Consider "Smart Parallelism" vs "Blind Parallelism" to save API calls.
