# Search Architecture V2: "The Elegant Solution"

**Status**: FINAL DRAFT
**Owner**: The Architect (Audit Team)

## 1. Core Philosophy
"Speed, Accuracy, Intent."
The search engine is not just a database query; it is an **Intent Predictor**.
- If the user types "Naruto", they want "Naruto Vol 1".
- If the user types "Wanpi", they mean "ONE PIECE".

## 2. The Flow

```mermaid
graph TD
    UserQuery[User Query] --> Normalizer[Normalization Engine]
    Normalizer --> |"wanpi" -> "ONE PIECE"| Normalized[Normalized Query]
    UserQuery --> |"wanpi"| RawQuery[Raw Query]
    
    subgraph "The Net (Parallel Execution)"
        Normalized --> |Genre: Comic| RakutenTitle[Rakuten Title Search]
        Normalized --> |Genre: Comic| RakutenKeyword[Rakuten Keyword Search]
        RawQuery --> |Fallback| RakutenRaw[Rakuten Keyword Search (Raw)]
    end
    
    RakutenTitle --> RawResults[Raw Results]
    RakutenKeyword --> RawResults
    RakutenRaw --> RawResults
    
    subgraph "The Funnel (Client-Side Processing)"
        RawResults --> Dedupe[Deduplication (ISBN)]
        Dedupe --> Filter[Strict Relevance Filter]
        Filter --> Scorer[Heuristic Scorer]
        Scorer --> Sort[Sort by Score]
    end
    
    Sort --> TopPick[Top Pick Identification]
    TopPick --> FinalResponse[JSON Response]
```

## 3. Detailed Components

### 3.1. Normalization Engine (The Brain)
- **Input**: Raw String
- **Process**:
    1.  Full-width/Half-width unification.
    2.  Alias Lookup (Exact & Partial).
    3.  **NEW**: Volume Extraction preservation. `ONE PIECE 100` -> `Base: ONE PIECE`, `TargetVol: 100`.
- **Output**: `{ baseQuery: string, targetVolume: number | null }`

### 3.2. Fetch Layer (The Net)
- **NO GOOGLE BOOKS**. Zero external dependency other than Rakuten.
- **Concurrency**: Max 3 parallel requests.
    - Title Search (High Precision)
    - Keyword Search (High Recall)
    - Raw Query Search (Safety Net for unregistered aliases)

### 3.3. The Funnel (The Logic)
This is where V1 failed. V2 takes control.

#### A. Strict Relevance Filter
REMOVE the "Prefix Check".
**New Rule**: A candidate is valid IF:
- `Candidate.Title` contains `NormalizedQuery` OR
- `Candidate.Title` contains `RawQuery` OR
- `LevenshteinDistance(Candidate.Title, NormalizedQuery)` < 3 (Typos)

#### B. Heuristic Scorer (Ranker)
Each book starts at Score 0.
1.  **Exact Title Bonus (+50)**: `Book.Title === NormalizedBaseQuery`.
2.  **Volume 1 Bonus (+20)**: IF `UserTargetVolume` is NULL AND `Book.Volume === 1`.
3.  **Target Volume Bonus (+100)**: IF `UserTargetVolume` matches `Book.Volume`.
4.  **Shortest Title Bonus (+10)**: Preference for "Main Series" over spinoffs.
    - `Score += (20 - Book.Title.Length)` (Cap at sensible limits)
5.  **Edition Penalty (-5)**: `Bunko`, `Aizoban` (We prefer standard `Tankobon` initially).

### 3.4. Search States
We adopt the definitions from the "Draft":
- **CONFIDENT**: Top score > 80.
- **AMBIGUOUS**: Top score < 50 but results exist.
- **NOT_FOUND**: Zero candidates pass the filter.

## 4. Test Scenarios (Must Pass)

| Case | Query | Expected Top Result | Why |
| :--- | :--- | :--- | :--- |
| **Alias** | "Wanpi" | "ONE PIECE (1)" | Normalized match + Vol 1 Boost |
| **Vol Specific** | "Naruto 72" | "NARUTO (72)" | Target Volume Match |
| **Spinoff** | "Shingeki" | "Shingeki no Kyojin (1)" | Shortest Title wins over "...Chuugakkou" |
| **Typo** | "Jujusu Kaisen" | "Jujutsu Kaisen (1)" | Levenshtein Match |
| **No Match** | "Asdfghjkl" | Empty / Suggestion | Filter rejects noise |

## 5. Implementation Directive
Modify `src/app/api/search/route.ts` to implement this exact pipeline.
**Do not** use `prediction-engine.ts`; create a dedicated `SearchScorer.ts` class within the API route folder or lib.
