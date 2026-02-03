# Search Architecture V2.1: "The Bulletproof Solution"

**Status**: APPROVED (Post-Adversarial Review)
**Owner**: The Architect + External Auditor
**Revision**: 2.1 (Incorporates Adversarial Critique)

---

## 1. Core Philosophy
"Speed, Accuracy, Intent, **Resilience**."

---

## 2. The Flow

```mermaid
graph TD
    UserQuery[User Query] --> Validator[Input Validator]
    Validator --> |Length >= 2| Normalizer[Normalization Engine]
    Validator --> |Length < 2| Reject[Return Error: Query Too Short]
    
    Normalizer --> |"wanpi" -> "ONE PIECE"| Normalized[Normalized Query]
    UserQuery --> RawQuery[Raw Query]
    
    subgraph "The Net (Parallel + Coalesced)"
        Normalized --> Coalescer[Request Coalescer]
        Coalescer --> RakutenTitle[Rakuten Title Search]
        Coalescer --> RakutenKeyword[Rakuten Keyword Search]
        RawQuery --> RakutenRaw[Rakuten Keyword Search - Raw]
    end
    
    RakutenTitle --> RawResults[Raw Results]
    RakutenKeyword --> RawResults
    RakutenRaw --> RawResults
    
    subgraph "The Funnel (Client-Side)"
        RawResults --> Dedupe[Deduplication by ISBN]
        Dedupe --> Filter[Relevance Filter - Normalized Levenshtein]
        Filter --> Scorer[Heuristic Scorer V2]
        Scorer --> Sort[Sort by Score]
    end
    
    Sort --> TopPick[Top Pick + Confidence State]
    TopPick --> FinalResponse[JSON Response]
    
    subgraph "Resilience Layer"
        RakutenTitle -.-> |Timeout/500| CircuitBreaker[Circuit Breaker]
        CircuitBreaker --> Cache[Return Cached Results - Stale Flag]
        CircuitBreaker --> EmptyResponse[Return Graceful Error]
    end
```

---

## 3. Detailed Components (V2.1 Revisions)

### 3.1. Input Validator (NEW)
- **Reject** queries with length < 2 characters.
- **Reject** queries that are only whitespace or special characters.
- **Sanitize** input to prevent injection attacks.

### 3.2. Normalization Engine (REVISED)
- **Partial Alias Match Guard**:
    - Query must be **at least 2 characters**.
    - Query length must be **>= 50%** of the alias key length.
    - Example: Query "A" does NOT match "AKIRA" (1 < 5 * 0.5).

### 3.3. Request Coalescer (NEW)
- Maintain a `Map<string, Promise<Result>>` of in-flight requests.
- If a duplicate query arrives while another is in-flight, return the existing Promise.
- Clear the entry after the Promise resolves.

### 3.4. Relevance Filter (REVISED)
**REMOVE**: `LevenshteinDistance < 3` (raw distance).

**NEW RULE**: 
```typescript
const normalizedDistance = levenshtein(a, b) / Math.max(a.length, b.length);
const isMatch = normalizedDistance <= 0.3; // 30% difference allowed
```

### 3.5. Heuristic Scorer V2 (REVISED)

| Factor | Points | Notes |
| :--- | :--- | :--- |
| Exact Title Match | +50 | `title === normalizedQuery` |
| Alias Match | +50 | Query was resolved via alias |
| Target Volume Match | +100 | User specified volume N, book is volume N |
| Volume 1 Bonus | +20 | Only if no target volume specified |
| Shortest Title Bonus | +15 - (title.length / 5) | Capped at +10 |
| **Edition Penalty** | **-20** | Bunko, Aizoban, Kanzenban (REVISED) |
| No Cover Image | -10 | Prefer books with images |

### 3.6. Circuit Breaker / Graceful Degradation (NEW)
- Track consecutive API failures per endpoint.
- After 3 consecutive failures, "trip" the circuit for 30 seconds.
- While tripped:
    - Return cached results if available (with `stale: true` flag).
    - If no cache, return `{ books: [], error: 'SERVICE_UNAVAILABLE', retryAfter: 30 }`.

### 3.7. Telemetry (NEW)
Log the following metrics (to console in dev, to Supabase in prod):
- Search latency (ms)
- Cache hit/miss
- API error rate
- Query normalization path (exact alias / partial alias / fallback)

---

## 4. Test Scenarios (EXPANDED)

| Case | Query | Expected Result | Why |
| :--- | :--- | :--- | :--- |
| **Alias** | "Wanpi" | "ONE PIECE (1)" | Alias + Vol 1 |
| **Vol Specific** | "Naruto 72" | "NARUTO (72)" | Target Volume |
| **Spinoff** | "Shingeki" | "進撃の巨人 (1)" | Shortest Title wins |
| **Typo** | "Jujusu" | "呪術廻戦 (1)" | Normalized Levenshtein |
| **Short Query** | "A" | Error: Query Too Short | Input Validator |
| **Emoji** | "🔥" | Error: Invalid Query | Input Validator |
| **API Down** | "Naruto" (API 500) | Cached / Graceful Error | Circuit Breaker |

---

## 5. Implementation Changes from V2.0

| Original Plan | Revision |
| :--- | :--- |
| `fast-levenshtein` only | Add `normalized-levenshtein` or compute ratio manually |
| `Normalizer.ts` | Add min-length guard to partial alias matching |
| `SearchScorer.ts` | Edition Penalty -5 → **-20** |
| (Missing) | Add `RequestCoalescer.ts` |
| (Missing) | Add `CircuitBreaker.ts` |
| (Missing) | Add telemetry logging |

---

## 6. Updated Implementation Directive

1. **Do NOT proceed with V2.0 as-is.** Apply V2.1 revisions.
2. Create the following new files:
    - `src/lib/search/InputValidator.ts`
    - `src/lib/search/RequestCoalescer.ts`
    - `src/lib/search/CircuitBreaker.ts`
3. Update `Normalizer.ts` with partial alias guard.
4. Update `SearchScorer.ts` with revised penalties.
5. Add telemetry to `route.ts`.
