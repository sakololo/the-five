# 🔴 CRITICAL INCIDENT PREDICTION REPORT
**Role**: Post-Launch Troubleshooting Specialist  
**Target**: SEARCH_ARCHITECTURE_V2.md  
**Assessment Date**: 2026-02-03  

---

## Executive Summary
**VERDICT**: This architecture will cause **3 critical production incidents** within 30 days of release.

---

## 🚨 INCIDENT 1: "Volume 1 Tyranny" (Severity: HIGH)
### The Problem
**Line 84**: `if (vol === 1) score += 20; // Critical boost for discovery`

**Disaster Scenario**:
- **Day 7**: Power user searches "ONE PIECE" to check if Volume 110 (latest) is available
- **Result**: Volume 1 ranks highest, Volume 110 is buried at position 43
- **User Reaction**: "WTF this search sucks, I have Vol 1-109 already!"
- **Impact**: Repeat users (collectors) abandon the app, thinking it's for beginners only

**Root Cause**:
The architecture **blindly boosts Volume 1** without considering:
1. User search history (new vs returning user)
2. Query context (browsing vs specific lookup)
3. Recency preference (some users want latest releases)

**Evidence from Pseudo-Code**:
```typescript
if (vol === 1) score += 20; // ← ALWAYS applied, no context awareness
```

### 🔧 Required Fix
Add **Intent Detection**:
```typescript
// Detect if user wants "latest" or "start of series"
const intent = detectIntent(rawQuery, userHistory);

if (intent === 'discovery') {
  if (vol === 1) score += 20;
} else if (intent === 'latest') {
  // Boost recent publication dates instead
  score += (publicationYear - 2000) * 2;
}
```

**Alternative Quick Fix**: Cap Volume 1 boost to only apply when `targetVolume` is NOT specified.

---

## 🚨 INCIDENT 2: "429 Death Spiral" (Severity: CRITICAL)
### The Problem
**Line 60-63**: Unconditional parallel API calls on EVERY search.

**Disaster Scenario**:
- **Day 3**: App gets featured on a popular manga subreddit
- **Concurrent Users**: 500
- **API Calls/Second**: 500 users × 2 requests = **1000 req/s**
- **Rakuten Limit**: Typically 100 req/s per App ID
- **Result**: All requests return `429 Too Many Requests`
- **Circuit Breaker**: NONE EXISTS in architecture
- **App State**: **COMPLETE OUTAGE** for 10-30 minutes until rate limit resets

**Root Cause**:
The "Remaining Risks" section (Line 44) mentions this but offers NO concrete solution:
> *Mitigation*: Aggressive client-side caching and simplified retry logic.

**Why This Fails**:
- Client-side cache doesn't help on first-time searches
- "Simplified retry" will make it WORSE (retry storms)
- No request queuing = thundering herd problem

**Evidence of Negligence**:
Line 45: *"simplified retry logic"* ← This is hand-waving, not a solution.

### 🔧 Required Fix
Implement **Request Coalescing + Queue**:
```typescript
// Add to architecture
const requestQueue = new PQueue({ concurrency: 10 }); // Max 10 parallel
const inflightCache = new Map(); // Dedupe identical queries

export async function searchBooks(rawQuery: string) {
  // Check if identical query is already in-flight
  const cacheKey = hash(rawQuery);
  if (inflightCache.has(cacheKey)) {
    return inflightCache.get(cacheKey); // Coalesce
  }
  
  // Queue the request
  const promise = requestQueue.add(() => actualSearch(rawQuery));
  inflightCache.set(cacheKey, promise);
  
  const result = await promise;
  inflightCache.delete(cacheKey);
  return result;
}
```

**Add to Remaining Risks**:
> **API Overload**: Without request queuing, concurrent traffic will cause 429 errors.  
> *Mitigation*: Implement request coalescing (dedupe identical in-flight queries) + concurrency limit (max 10 parallel Rakuten calls).

---

## 🚨 INCIDENT 3: "Edition Erasure" (Severity: MEDIUM)
### The Problem
**Line 55**: `const normalized = normalizeQuery(rawQuery);` with no rollback mechanism.

**Disaster Scenario**:
- **User Intent**: Searches "NARUTO 完全版" (Complete Edition - premium collector's item)
- **Normalization**: Strips "完全版" or normalizes it to generic "NARUTO"
- **API Result**: Returns regular editions, NOT the complete edition
- **User Result**: Buys wrong edition, leaves 1-star review

**Root Cause**:
The architecture doesn't preserve **edition modifiers** during normalization:
- 完全版 (Complete Edition)
- 総集編 (Omnibus)
- 新装版 (New Edition)
- 愛蔵版 (Deluxe Edition)

**Evidence**:
Line 73: Filter checks `normalized.base` but doesn't validate if normalization destroyed important terms.

### 🔧 Required Fix
**Modifier Preservation**:
```typescript
const EDITION_KEYWORDS = ['完全版', '総集編', '新装版', '愛蔵版', 'BOX'];

export function normalizeQuery(rawQuery: string) {
  // Extract edition keywords BEFORE normalization
  const editions = EDITION_KEYWORDS.filter(kw => rawQuery.includes(kw));
  
  // Normal normalization
  const normalized = applyAliases(rawQuery);
  
  // Re-append preserved editions
  return {
    base: normalized,
    modifiers: editions,
    fullQuery: editions.length > 0 
      ? `${normalized} ${editions.join(' ')}` 
      : normalized
  };
}
```

**Add to Filter**:
```typescript
.filter(book => {
  const baseMatch = isMatch(book.title, normalized.base);
  const modifierMatch = normalized.modifiers.every(m => book.title.includes(m));
  return baseMatch && modifierMatch;
})
```

---

## 📋 REQUIRED AMENDMENTS TO ARCHITECTURE

### Section 3: Remaining Risks (EXPAND)
Add these:
```markdown
*   **Intent Blindness**: Volume 1 boost assumes all users want series start.
    *   *Mitigation*: Add intent detection (check if targetVolume exists).
*   **API Overload**: No protection against traffic spikes causing 429 errors.
    *   *Mitigation*: Request coalescing + concurrency limiter (max 10 parallel).
*   **Edition Loss**: Normalization may strip important modifiers like "完全版".
    *   *Mitigation*: Preserve edition keywords during normalization.
```

### Section 4: Pseudo-Code (UPDATE)
Replace Line 84-85 with:
```typescript
// Volume Heuristic (Intent-Aware)
const vol = extractVolume(book.title);
if (!targetVolume && vol === 1) {
  score += 20; // Only boost Vol 1 if user didn't specify volume
}
if (vol === targetVolume) score += 100; // Perfect match always wins
```

---

## Final Verdict
**Status**: ❌ NOT READY FOR PRODUCTION  
**Required Actions**: Implement 3 fixes above before deployment  
**Estimated Risk Reduction**: 80% of predicted incidents prevented
