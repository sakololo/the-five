# Search Architecture Specification (Draft)

> **Status:** Draft (Blue Team)
> **Author:** The Architect
> **Version:** 1.0.0

## 1. Overview

The Search Module is the core discovery mechanism for "The Five". Its primary goal is to interpret vague user intent (e.g., "Moyashimon", "One Piece 1") and return precise, actionable book metadata. It prioritizes **accuracy** over breadth and **user guidance** over raw results.

## 2. Architecture

The search flow follows a strict pipeline: **Normalize -> Resolve -> Fetch -> Orchestrate**.

```mermaid
graph TD
    User[User Input] -->|Raw Query| API[Search API Route]
    API --> Norm[Normalization Layer]
    Norm --> Alias[Alias Dictionary]
    Alias -->|Normalized Query| Orch[Search Orchestrator]
    
    subgraph "External Providers"
        Orch -->|Query/ISBN| Google[Google Books API]
        Orch -->|Query/ISBN| Rakuten[Rakuten Books API]
    end
    
    Google -->|ISBN (High Confidence)| Orch
    Rakuten -->|Book Candidates| Orch
    
    Orch --> Eval[Result Evaluator]
    Eval -->|SearchState| Response
    
    Eval -.->|Log Failure| DB[(Supabase Logs)]
```

## 3. Core Concepts & Data Structures

### 3.1 Search State
We classify the result into 4 distinct states to guide the frontend UI.

```typescript
type SearchStateType =
    | 'CONFIDENT_MATCH'   // High confidence single result (e.g. Alias match + API hit)
    | 'AMBIGUOUS_MATCH'   // Multiple valid candidates
    | 'TITLE_ONLY'        // Title is recognized (Alias match) but no stock/API result
    | 'NOT_FOUND';        // No clues found
```

### 3.2 Domain Models

```typescript
interface Book {
    id: string;          // Application specific ID
    title: string;
    author: string;
    publisher: string;
    isbn: string;        // ISBN-13 preferred
    coverUrl: string;    // High-res if possible
    hasImage: boolean;
    volumeNumber: number | null;
}

interface SearchResponse {
    books: Book[];
    total: number;
    state: SearchState;  // The calculated state of the search
    meta: {
        normalizedQuery?: string;
        providerLatency?: number;
    }
}

interface SearchState {
    type: SearchStateType;
    message: string;        // UI Message
    candidates?: string[];  // For ambiguous matches
    recognizedTitle?: string;
}
```

## 4. Detailed Flows

### 4.1 Normalization Logic
1. **Character Normalization**: 
   - Half-width Katakana -> Full-width
   - Hiragana -> Katakana
2. **Alias Resolution**:
   - **Exact Match**: `MANGA_ALIASES[input]` -> returns formal title.
   - **Partial Match**: Scan alias keys. If input contains key or key contains input, treat as candidate.

### 4.2 API Strategy (The "Pincer" Attack)
To maximize accuracy, we use two providers in parallel but with different purposes:

1.  **Google Books API**: Used primarily as an **ISBN Resolver**. It handles vague queries well and returns an ISBN.
2.  **Rakuten Books API**: The **Data Source**. It has better Japanese coverage and provides the final metadata (cover images, links).

**Orchestration Logic:**
1.  Fetch `Google.ISBN(query)`.
2.  IF ISBN found:
    - Call `Rakuten.search(ISBN)` (Primary)
    - Call `Rakuten.search(Title)` (Backup)
3.  ELSE:
    - Call `Rakuten.search(Title)`
4.  Merge results, prioritizing ISBN matches.

### 4.3 Result Evaluation (The "Brain")
After gathering results, the system evaluates the state (`evaluateSearchResult`):

| API Results | Alias Match | Result State | UI Behavior |
| :--- | :--- | :--- | :--- |
| > 0 | Yes (Normalized) | **CONFIDENT_MATCH** | Show "Did you mean [Formal Title]?" |
| > 0 | No | **CONFIDENT_MATCH** | Show Top Result directly |
| 0 | Yes | **TITLE_ONLY** | "We know [Title], but found no books." |
| 0 | Partial | **AMBIGUOUS_MATCH** | "Did you mean one of these?" (List candidates) |
| 0 | No | **NOT_FOUND** | "No matches found." |

## 5. Security & Reliability

### 5.1 Rate Limiting
- **Limit**: 10 requests per minute per IP.
- **Storage**: In-memory (Map) for simplicity/speed (Note: Per instance, not distributed).

### 5.2 logging
- **Target**: Supabase `search_logs` table.
- **Trigger**: Only on `NOT_FOUND` or 0 results.
- **Data**: Query, IP (anonymized if needed), UserAgent, Timestamp.

## 6. API Contract

**Endpoint**: `GET /api/search`

**Parameters:**
- `q`: string (Required) - Search query
- `genre`: string (Optional) - Filter context

**Success Response (200):**
```json
{
  "books": [ ... ],
  "total": 5,
  "state": {
    "type": "CONFIDENT_MATCH",
    "message": "Found it!",
    "recognizedTitle": "One Piece"
  }
}
```

**Error Response:**
- 400: Missing query
- 429: Too Many Requests
- 500: Internal Server Error
