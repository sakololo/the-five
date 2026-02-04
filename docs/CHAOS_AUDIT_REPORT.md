# Chaos UX Audit Report

> **Auditor**: Chaos Monkey Persona  
> **Date**: 2026-02-04  
> **Status**: ✅ **PASSED (With Strictness Trade-off)**

## 1. Audit Objective
To verify the effectiveness of the "Relevance Guard" (Strict Relevance Filter) and identifying potential "Garbage Leaks" (unrelated results appearing due to bonus point accumulation).

## 2. Methodology
Executed `scripts/chaos_audit.ts` with the following destructive scenarios:
- **Garbage Input**: "asdf"
- **Bonus Trap**: A Volume 1 book (20pts) with a short title (10pts) = 30pts (Matches nothing textually).
- **Typo/Strictness**: "Onepiece" (No space), "H yate" (Missing char).
- **Edge Cases**: Empty string, only separators.

## 3. Results

| Scenario | Query | Expected | Actual | Result |
|---|---|---|---|---|
| **Garbage Input** | `asdf` | 0 Results | **0 Results** | ✅ PASS |
| **Bonus Trap** | `xyz` | 0 Results (Filter out Vol1 30pts noise) | **0 Results** | ✅ PASS |
| **Strict Typo** | `Onepiece` | 0 Results (Strict) | **0 Results** | ✅ PASS (Trade-off accepted) |
| **Strict Typo** | `H yate` | 0 Results (Strict) | **0 Results** | ✅ PASS (Trade-off accepted) |
| **Empty/Symbols** | `!!!` | 0 Results | **0 Results** | ✅ PASS |

## 4. Key Findings

### 🛡️ Relevance Guard Effectiveness
The logic enforcing `ExactTitleMatch > 0 || TokenTitleMatch > 0` successfully prevents the "Bonus Trap".
Without this guard, unrelated "Volume 1" books would appear with score 30 (exceeding the 15pt floor). The guard effectively filters them out because they have 0 text relevance.

### ⚠️ Strictness Trade-off
As noted in the design, this guard is **extremely strict**.
- Input: `Onepiece` (No space)
- Title: `ONE PIECE`
- Match: None (ContainsMatch=False, TokenMatch=False)
- Result: **Filtered out**.

Users must input at least one correct token (e.g. "One" or "Piece") to get results. This is an intentional design choice to prioritize "Zero Noise" over "Fuzzy Matching".

## 5. Conclusion
The system is robust against "Garbage Leaks". The "Relevance Guard" functions as designed, providing a distinct "High Prevention" security posture against search noise.
