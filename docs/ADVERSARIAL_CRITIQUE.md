# Adversarial Critique of SEARCH_MASTER_PLAN.md

**Role**: Red Team (Audit)
**Date**: 2026-02-03
**Target**: `SEARCH_MASTER_PLAN.md` (V2.2)

---

## Round 2 Critique: "The Confident Fail"

While the V2.2 plan addresses the initial concerns, a critical logical flaw was introduced with the "Smart Parallelism".

### 1. The "Confident Fail" Trap (High Severity)
**Observation**: The Logic Flow specifies:
`Normalizer --> |Intent:SPECIFIC| SearchStrat --> |Intent: SPECIFIC| API_Title`
This path *bypasses* the parallel keyword search.

**Critique**: 
If the Normalizer incorrectly identifies a query as "Specific" (e.g., "Naruto 72"), or if Rakuten's data does not strictly match the expected Title format for that specific query, the `API_Title` search will return **0 results**.
Because the plan does not define a fallback path for this scenario, the user will receive **No Results**, even if a broader Keyword search (which was skipped) would have found the book.

**Risk**: Users get *worse* results for being *more specific*. A strict "Title Only" search is too fragile for a production environment without a fallback.

**Recommendation**: 
The `SearchStrat` must have a "Soft Fallback".
- **Condition**: If `Intent: SPECIFIC` AND `API_Title Results == 0`.
- **Action**: Trigger `API_Parallel` (or at least `API_Key`) immediately.

### 2. The "Dirty Word" Black Box (Medium Severity)
**Observation**: The plan introduces `Adult Content Check: -1000`.
**Critique**: The plan does not specify *how* this check is implemented. Is it a hardcoded array? A database table? An external service?
**Risk**: "Magic implementation" leads to unmaintainable code.
**Recommendation**: Explicitly define the source of blocked keywords (e.g., `src/lib/constants/blocked-keywords.ts`) in the Implementation Plan.

---

## Summary of Outstanding Actions (for Blue Team)
1.  **Implement Fallback**: Add logic to retry with broader search if "Specific" search fails. -> **[RESOLVED]**
2.  **Define Blocklist**: Specify the location/method for the Adult Content keyword list. -> **[RESOLVED]**

---

## Final Verdict: APPROVED

The V2.2 Refined Plan (with Soft Fallback) successfully closes the critical looping/zero-result gaps. The architecture is robust enough for implementation.

**Red Team Sign-off**: 2026-02-03
**Action**: Proceed to Merge and Implementation.
