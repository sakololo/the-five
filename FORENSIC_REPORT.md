# Forensic Report: Search API (Current Implementation)

**Date**: 2026-02-03
**Subject**: `src/app/api/search/route.ts` Analysis
**Investigator**: The Audit

## Executive Summary
The current implementation diverges significantly from the "Ideal State" discussed in previous critiques. It relies heavily on external black-box sorting (Rakuten "Sales" rank) and introduces unnecessary latency via a secondary API call (Google Books). The "Draft" orchestration logic is completely disconnected from the actual production route.

## Critical Defects

### 1. Latency & Dependency Chain
- **Defect**: The code executes a **blocking** call to Google Books API (`fetchIsbnFromGoogle`) before initiating the main search.
- **Impact**: Doubles the minimum response time. If Google API is slow/down, the entire search hangs.
- **Code Reference**: `route.ts` lines 385 (await fetchIsbnFromGoogle).

### 2. Ranking Logic Vacuum
- **Defect**: There is **Zero** client-side ranking logic for relevance or volume order.
- **Impact**: Results are returned in Rakuten's "Sales" order. If "Volume 105" is the best seller, it appears first. The user (who wants to start the series) is lost.
- **Code Reference**: `sortBooks` (lines 326-334) only sorts by `hasImage`.

### 3. The "Prefix Filter" Trap
- **Defect**: `fetchBooksByKeyword` enforces a strict prefix check: `title.includes(query.slice(0, 2))`.
- **Impact**: Catastrophic for aliases.
    - Query: "Wanpi" (Starts with "Wa")
    - Target: "ONE PIECE" (Starts with "ON")
    - Result: Filtered out because "ONE PIECE" does not contain "wa".
- **Code Reference**: `route.ts` lines 209-214.

### 4. Edition Blindness
- **Defect**: No logic to distinguish "Tankobon" (Standard) from "Bunko" (Paperback) or "Kanzenban" (Complete).
- **Impact**: Search results are flooded with duplicate editions, confusing the user.

## Recommendations for V2 Architecture

1.  **Kill Google Books**: It is too slow for a real-time "Instant Search" feel. Rely on Rakuten's exact match + local fuzzy logic.
2.  **Invert Control**: The App must dictate sorting, not the API. We need a `ScoringAlgorithm` that boosts:
    - Exact Title Matches
    - Volume 1
    - Standard Editions (Tankobon)
3.  **Safe Filtering**: Remove the `slice(0, 2)` prefix check. Replace with a robust `Levenshtein` or `TokenSet` match.
4.  **Activate the Draft**: The patterns in `DRAFT_search-orchestration.ts` (Confident/Ambiguous states) are superior and should be promoted to the main logic.
