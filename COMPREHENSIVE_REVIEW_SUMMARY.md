# 🔄 Search Logic Improvements: Comprehensive Review Summary

**Date**: 2026-02-03
**Status**: Ready for Final Implementation Decision

This document summarizes the findings from two parallel review processes:
1.  **Internal Simulation**: An adversarial review cycle performed by the AI agent.
2.  **Physical External Review**: An isolated offline review resulting in `VERIFICATION_SPEC.md`.

Both reviews successfully identified critical bugs and proposed solutions. The next step is to choose the best path forward.

---

## 🛑 The Core Problems Identified

### 1. The Spinoff Penalty False Positive
*   **Issue**: Searching for explicit spinoffs (e.g., "One Piece Chopper") penalized the correct result because the keyword matching was too strict (required exact keyword match in both query and title).
*   **Fix Applied (Internal)**: Modified `scorer.ts` to disable the penalty if *any* spinoff keyword exists in the user's query. This is **already implemented** and verified.
*   **Regressions Fixed**: Removed `'s'` from spinoff keywords to prevent penalizing titles like "JoJo's Bizarre Adventure".

### 2. The "ONE PIECEース" Normalization Bug
*   **Issue**: Searching for `"ワンピース チョッパー"` resulted in the normalized query `"ONE PIECEース チョッパー"`.
*   **Root Cause**:
    *   `aliases.ts` contains both `ワンピ` and `ワンピース`.
    *   `normalizer.ts` prefers the **shortest match** (`ワンピ`).
    *   Simple string replacement replaced only the `ワンピ` part of `ワンピース`, leaving the `ース` suffix.

---

## 🛠️ Proposed Solutions for Normalizer Bug

### A. Internal Simulation Conclusion (Rejected)
*   **Initial Thought**: Sort by longest match (Prefix-aware).
*   **Refinement**: Add regex boundary checks to prevent replacing parts of compound words (e.g. `ワンピースパーティー`).
*   **Verdict**: **REJECTED.** Too complex, expensive (regex performance), and prone to edge cases (Japanese punctuation).

### B. Physical External Review Conclusion (Recommended)
*   **Approach**: **First Token Only + Exact Match**.
*   **Logic**:
    1.  Split the normalized query by spaces.
    2.  Take the **first token** only.
    3.  Check for an **exact match** in the alias dictionary.
    4.  If matched, replace the first token. If not, leave it alone.
*   **Pros**:
    *   Simple and predictable.
    *   Fixes "ONE PIECEース".
    *   Safe for compound words (e.g., `ワンピースパーティー` won't match, preventing corruption).
*   **Cons**:
    *   Won't resolve aliases if the user forgets spaces (e.g., `ワンピースチョッパー` stays `ワンピースチョッパー`). **Considered an acceptable trade-off.**

---

## 🚀 Next Steps for New Account

The code in `src/lib/search/core/scorer.ts` is solid. The work remaining is solely in `src/lib/search/core/normalizer.ts`.

### 1. Implement "First Token Only" Logic
Modify `normalizer.ts` to implement the solution from the Physical External Review.

**Pseudo-code Plan**:
```typescript
// In normalizer.ts

// 1. Split query into tokens
const tokens = normalizedChars.split(/[\s　]+/);

// 2. Resolve ONLY the first token with EXACT match
// (Do NOT use the existing partial match logic for this)
if (MANGA_ALIASES[tokens[0]]) {
    const resolved = MANGA_ALIASES[tokens[0]];
    // Reconstruct query: Resolved Alias + Space + Remaining Tokens
    return resolved + ' ' + tokens.slice(1).join(' ');
}

// 3. Fallback: Return original if no exact match found
return normalizedChars;
```

### 2. Verify Fixes
Run the `curl` tests again to confirm:
*   `"ワンピース チョッパー"` -> `"ONE PIECE チョッパー"` (Clean!)
*   `"ワンピースパーティー"` -> `"ワンピースパーティー"` (Safe failure)

### 3. Finalize Handoff
Once the normalizer is fixed, the entire search logic overhaul is complete.

---

## 📂 Key Files & References

*   **Current State**: `scorer.ts` is fixed. `normalizer.ts` is currently buggy ("ONE PIECEース").
*   **Plan**: See `implementation_plan.md` (which now reflects the "First Token Only" approach).
*   **Audit History**: `FINAL_SANITY_CHECK.md`, `FIRST_TOKEN_ATTACK.md`.

This task is ready for immediate implementation by the next agent.
