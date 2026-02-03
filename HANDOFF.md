# Handoff: Search Logic & UI Integration

## 📅 Current Status
- **Backend (Phase 3)**: ✅ **COMPLETE & VERIFIED**
    - `normalizer.ts`, `scorer.ts`, `route.ts`, `search-orchestrator.ts` are implemented and passed Red Team audit (Round 4).
    - Rate-limited error logging is active.
    - `curl` tests confirmed `ONE PIECE` (80 pts) and `SPY FAMILY` (alias/separator handling) work perfectly.
- **Frontend (Phase 4)**: 🚧 **PLANNING**
    - `src/app/page.tsx` is currently using **legacy logic** (hardcoded `VOLUME_PATTERNS`, ignoring `searchState`).
    - `implementation_plan.md` has been created and translated to Japanese.

## 📝 Implementation Plan Overview
Detailed plan is in `implementation_plan.md`.

### Next Actions
1.  **UX Decision Check**:
    - **Option A (Desktop)**: Auto-open drawer for `CONFIDENT_MATCH`.
    - **Option B (Mobile)**: Show message, wait for click.
    - *Waiting for user confirmation on this strategy.*
2.  **Code Changes**:
    - Import `SearchState` type.
    - Remove legacy logic from `page.tsx`.
    - Implement state handling (Confident/Ambiguous/NotFound).
3.  **Adversarial Review (Round 5)**:
    - Attack the new UI with "Confident Hallucinations" and edge cases.

## 📂 Key Files
- `c:\Users\tyuda\.gemini\antigravity\brain\daae181f-e2a2-4985-90bb-525c716f811e\implementation_plan.md` (Read this first)
- `src/app/page.tsx` (Target for modification)
- `src/app/api/search/route.ts` (Reference for API contract)
- `src/lib/search/search-orchestrator.ts` (Reference for `SearchState` types)

## 🚀 How to Resume
1.  Read `HANDOFF.md` and `implementation_plan.md`.
2.  Confirm the UX decision (Option A vs B).
3.  Start **Red Team Audit Round 5** to verify the UX plan before coding.
4.  Execute the changes in `page.tsx`.
