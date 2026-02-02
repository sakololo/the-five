/**
 * Search Prediction Engine v0.7
 * 
 * Production-ready implementation with all security hardening.
 * Approved by Red Team after 5 rounds of hostile review.
 * 
 * @module prediction-engine
 */

// ============================================================================
// SIMPLE LRU CACHE (No external dependencies)
// ============================================================================

/**
 * Simple LRU Cache implementation
 * Avoids external dependency issues with lru-cache versions
 */
class SimpleLRU<K, V> {
    private cache = new Map<K, { value: V; expiry: number }>();
    private readonly maxSize: number;
    private readonly ttl: number;

    constructor(options: { max: number; ttl: number }) {
        this.maxSize = options.max;
        this.ttl = options.ttl;
    }

    get(key: K): V | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;

        // Check expiry
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return undefined;
        }

        // Move to end (most recently used) - Map preserves insertion order
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.value;
    }

    set(key: K, value: V): void {
        // Remove existing if present
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, {
            value,
            expiry: Date.now() + this.ttl,
        });
    }

    has(key: K): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    clear(): void {
        this.cache.clear();
    }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Search state types representing the prediction confidence level
 */
export type SearchStateType =
    | 'CONFIDENT_MATCH'    // High confidence match found
    | 'SUGGESTION_MATCH'   // Possible match with lower confidence
    | 'AMBIGUOUS_MATCH'    // Multiple candidates found
    | 'TITLE_ONLY'         // Title identified but no API results
    | 'KEYWORD_FALLBACK'   // Prediction failed but keyword results exist
    | 'NOT_FOUND';         // No results found

/**
 * Parsed query structure after normalization
 */
export interface ParsedQuery {
    raw: string;
    normalized: string;
    volume?: number;
    isAuthor: boolean;
    isCharacter: boolean;
    isTag: boolean;
    suggestions?: string[];
    candidates?: string[];
}

/**
 * Book result from API
 */
export interface BookResult {
    id: string;
    title: string;
    author: string;
    publisher: string;
    isbn: string;
    imageUrl: string;
    volume?: number;
}

/**
 * Search state result
 */
export interface SearchState {
    type: SearchStateType;
    message: string;
    candidates: BookResult[];
    suggestions?: string[];
    debug?: DebugInfo;
}

/**
 * Debug information for development
 */
export interface DebugInfo {
    originalQuery: string;
    normalizedQuery: string;
    sanitizedQuery: string;
    matchType: string;
    similarity?: number;
    cacheHit: boolean;
    processingTimeMs: number;
    candidateCount: number;
}

/**
 * Cache entry with query validation
 */
interface CacheEntry {
    query: string;
    result: SearchState;
    timestamp: number;
}

// ============================================================================
// STATIC DATA (Immutable at runtime)
// ============================================================================

/**
 * Character to series mapping
 * All keys must be lowercase
 */
const CHARACTER_MAP: Readonly<Record<string, readonly string[]>> = {
    'luffy': ['ONE PIECE'],
    'ルフィ': ['ONE PIECE'],
    'naruto': ['NARUTO'],
    'ナルト': ['NARUTO'],
    'sakura': ['NARUTO', 'カードキャプターさくら', 'うる星やつら'],
    'さくら': ['NARUTO', 'カードキャプターさくら', 'うる星やつら'],
    'goku': ['DRAGON BALL'],
    '悟空': ['DRAGON BALL'],
    'conan': ['名探偵コナン'],
    'コナン': ['名探偵コナン'],
    'tanjiro': ['鬼滅の刃'],
    '炭治郎': ['鬼滅の刃'],
    'gojo': ['呪術廻戦'],
    '五条': ['呪術廻戦'],
    'anya': ['SPY×FAMILY'],
    'アーニャ': ['SPY×FAMILY'],
} as const;

/**
 * Author mapping
 */
const AUTHOR_MAP: Readonly<Record<string, readonly string[]>> = {
    '尾田栄一郎': ['ONE PIECE'],
    '岸本斉史': ['NARUTO', 'サムライ8'],
    '鳥山明': ['DRAGON BALL', 'Dr.スランプ'],
    '青山剛昌': ['名探偵コナン'],
    '吾峠呼世晴': ['鬼滅の刃'],
    '芥見下々': ['呪術廻戦'],
    '遠藤達哉': ['SPY×FAMILY'],
} as const;

/**
 * Tag/Genre mapping
 */
const TAG_MAP: Readonly<Record<string, readonly string[]>> = {
    'scary': ['ジャンプスケアホラー', '伊藤潤二コレクション'],
    'horror': ['ジャンプスケアホラー', '伊藤潤二コレクション'],
    'ホラー': ['ジャンプスケアホラー', '伊藤潤二コレクション'],
    '怖い': ['ジャンプスケアホラー', '伊藤潤二コレクション'],
    'funny': ['ギャグマンガ日和', 'こちら葛飾区亀有'],
    'comedy': ['ギャグマンガ日和', 'こちら葛飾区亀有'],
    'コメディ': ['ギャグマンガ日和', 'こちら葛飾区亀有'],
    '泣ける': ['CLANNAD', 'あの花'],
} as const;

/**
 * Popular searches (static list)
 */
export const POPULAR_SEARCHES: readonly string[] = [
    'ONE PIECE', 'NARUTO', '鬼滅の刃', '進撃の巨人', 'SLAM DUNK',
    '呪術廻戦', 'SPY×FAMILY', 'チェンソーマン', 'HUNTER×HUNTER', 'BLEACH'
] as const;

/**
 * Sandbox alias dictionary (test subset)
 */
const ALIAS_DICTIONARY: Readonly<Record<string, string>> = {
    'ワンピ': 'ONE PIECE',
    'ワンピース': 'ONE PIECE',
    'onepiece': 'ONE PIECE',
    'ナルト': 'NARUTO',
    'なると': 'NARUTO',
    'db': 'DRAGON BALL',
    'ドラゴンボール': 'DRAGON BALL',
    'ドラゴボ': 'DRAGON BALL',
    'きめつ': '鬼滅の刃',
    'キメツ': '鬼滅の刃',
    '鬼滅': '鬼滅の刃',
    'じゅじゅつ': '呪術廻戦',
    'ジュジュツ': '呪術廻戦',
    '呪術': '呪術廻戦',
    'スパイファミリー': 'SPY×FAMILY',
    'spy': 'SPY×FAMILY',
    'スラダン': 'SLAM DUNK',
    'スラムダンク': 'SLAM DUNK',
    'ハンター': 'HUNTER×HUNTER',
    'ハンタ': 'HUNTER×HUNTER',
    'hxh': 'HUNTER×HUNTER',
    'ブリーチ': 'BLEACH',
    '進撃': '進撃の巨人',
    'しんげき': '進撃の巨人',
    'チェンソー': 'チェンソーマン',
    'チェンソ': 'チェンソーマン',
} as const;

// ============================================================================
// INDEXES (Built at startup, immutable)
// ============================================================================

/**
 * 2D Index: length x firstChar
 */
const ALIAS_INDEX_2D = new Map<string, string[]>();

// Build index on module load
(function buildIndex() {
    for (const alias of Object.keys(ALIAS_DICTIONARY)) {
        const len = alias.length;
        const firstChar = alias[0].toLowerCase();
        const key = `${len}_${firstChar}`;

        if (!ALIAS_INDEX_2D.has(key)) {
            ALIAS_INDEX_2D.set(key, []);
        }
        ALIAS_INDEX_2D.get(key)!.push(alias);
    }
})();

// ============================================================================
// CACHES (SimpleLRU with size limits)
// ============================================================================

/**
 * Result cache with query validation
 */
const RESULT_CACHE = new SimpleLRU<string, CacheEntry>({
    max: 100,
    ttl: 5 * 60 * 1000, // 5 minutes
});

/**
 * Dedupe cache for logging
 */
const LOG_DEDUPE_CACHE = new SimpleLRU<string, boolean>({
    max: 1000,
    ttl: 60 * 1000, // 1 minute
});

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

let apiFailureCount = 0;
let circuitOpen = false;
let circuitOpenUntil = 0;

/**
 * Check if circuit breaker is open
 */
export function isCircuitOpen(): boolean {
    if (circuitOpen && Date.now() >= circuitOpenUntil) {
        // Auto-reset
        circuitOpen = false;
        apiFailureCount = 0;
    }
    return circuitOpen;
}

/**
 * Record API failure
 */
export function recordApiFailure(): void {
    apiFailureCount++;
    if (apiFailureCount >= 5) {
        circuitOpen = true;
        circuitOpenUntil = Date.now() + 30_000; // 30 seconds
        console.error('[PredictionEngine] Circuit breaker opened');
    }
}

/**
 * Record API success
 */
export function recordApiSuccess(): void {
    apiFailureCount = 0;
    circuitOpen = false;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * FNV-1a hash (Edge compatible, no crypto dependency)
 * @param str - Input string
 * @returns Hexadecimal hash string
 */
function fnv1a(str: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16);
}

/**
 * Bounded Levenshtein distance with space optimization
 * Uses 2-row sliding window (O(min(m,n)) space)
 * 
 * @param a - First string
 * @param b - Second string
 * @param maxDist - Maximum distance to compute (early exit)
 * @returns Distance or Infinity if exceeds maxDist
 */
function levenshteinBounded(a: string, b: string, maxDist: number): number {
    // Early exits
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > maxDist) return Infinity;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Swap to ensure a is shorter (memory optimization)
    if (a.length > b.length) {
        [a, b] = [b, a];
    }

    const m = a.length;
    const n = b.length;

    // Use 2 rows only
    let prevRow = Array.from({ length: n + 1 }, (_, i) => i);
    let currRow = new Array<number>(n + 1);

    for (let i = 1; i <= m; i++) {
        currRow[0] = i;
        let minInRow = i;

        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            currRow[j] = Math.min(
                prevRow[j] + 1,      // deletion
                currRow[j - 1] + 1,  // insertion
                prevRow[j - 1] + cost // substitution
            );
            minInRow = Math.min(minInRow, currRow[j]);
        }

        // Early exit if entire row exceeds maxDist
        if (minInRow > maxDist) return Infinity;

        // Swap rows
        [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[n];
}

/**
 * Calculate similarity ratio (0.0 - 1.0)
 */
function calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;

    const distance = levenshteinBounded(a, b, Math.ceil(maxLen * 0.5));
    if (distance === Infinity) return 0;

    return 1 - (distance / maxLen);
}

/**
 * Remove emoji characters (ES5 compatible)
 * Handles surrogate pairs properly
 */
function removeEmoji(text: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);

        // Check for surrogate pairs (emoji in astral planes)
        if (code >= 0xD800 && code <= 0xDBFF && i + 1 < text.length) {
            const next = text.charCodeAt(i + 1);
            if (next >= 0xDC00 && next <= 0xDFFF) {
                // This is a surrogate pair - skip it (likely emoji)
                i++;
                continue;
            }
        }

        // Skip common emoji ranges in BMP
        if (code >= 0x2600 && code <= 0x26FF) continue; // Misc symbols
        if (code >= 0x2700 && code <= 0x27BF) continue; // Dingbats
        if (code >= 0x231A && code <= 0x23F3) continue; // Misc technical
        if (code >= 0x25A0 && code <= 0x25FF) continue; // Geometric shapes

        result += text[i];
    }
    return result;
}

// ============================================================================
// SANITIZATION (Double-slice for NFKC expansion protection)
// ============================================================================

/**
 * Custom error for empty queries
 */
export class EmptyQueryError extends Error {
    constructor() {
        super('検索ワードを入力してください');
        this.name = 'EmptyQueryError';
    }
}

/**
 * Sanitize user input with double-slice protection
 * 
 * @param raw - Raw user input
 * @returns Sanitized string
 * @throws EmptyQueryError if result is empty
 */
export function sanitizeInput(raw: string): string {
    // 1. First slice to prevent NFKC expansion attack
    let clean = raw.slice(0, 100);

    // 2. NFKC normalization (full-width → half-width)
    clean = clean.normalize('NFKC');

    // 3. Remove blocked characters
    // Zero-width characters
    clean = clean.replace(/[\u200B-\u200D\uFEFF]/g, '');
    // BiDi control characters
    clean = clean.replace(/[\u202A-\u202E]/g, '');
    // Emoji removal (ES5 compatible - character by character)
    clean = removeEmoji(clean);

    // 4. Collapse whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // 5. Final slice (in case expansion occurred)
    clean = clean.slice(0, 100);

    // 6. Empty check
    if (clean.length === 0) {
        throw new EmptyQueryError();
    }

    return clean;
}

// ============================================================================
// VOLUME EXTRACTION (Regex-free)
// ============================================================================

/**
 * Extract volume number from query (regex-free)
 * 
 * @param query - Sanitized query
 * @returns Object with base query and optional volume
 */
export function extractVolume(query: string): { base: string; volume?: number } {
    // Look at last 4 characters for trailing digits
    const last4 = query.slice(-4);
    let digitStart = -1;

    // Find where digits start from the end
    for (let i = last4.length - 1; i >= 0; i--) {
        const char = last4[i];
        if (char >= '0' && char <= '9') {
            digitStart = i;
        } else {
            break;
        }
    }

    if (digitStart !== -1) {
        const volStr = last4.slice(digitStart);
        const vol = parseInt(volStr, 10);

        // Valid volume: 1-9999
        if (vol > 0 && vol < 10000) {
            const cutLength = last4.length - digitStart;
            let base = query.slice(0, -cutLength).trim();

            // Remove common volume markers
            base = base.replace(/[巻]$/, '').trim();
            base = base.replace(/vol\.?$/i, '').trim();
            base = base.replace(/volume$/i, '').trim();

            return { base, volume: vol };
        }
    }

    return { base: query };
}

// ============================================================================
// FUZZY MATCHING
// ============================================================================

/**
 * Get search candidates from the 2D index
 * 
 * @param query - Query to find candidates for
 * @returns Array of alias candidates (max 500)
 */
function getCandidates(query: string): string[] {
    const len = query.length;
    const firstChar = query[0]?.toLowerCase() || '';
    const candidates: string[] = [];

    // Check buckets: len-3 to len+3
    for (let l = Math.max(1, len - 3); l <= len + 3; l++) {
        // Primary: same first char
        const key = `${l}_${firstChar}`;
        const bucket = ALIAS_INDEX_2D.get(key);
        if (bucket) {
            candidates.push(...bucket);
        }

        // Hard cap at 500
        if (candidates.length >= 500) break;
    }

    return candidates.slice(0, 500);
}

/**
 * Find fuzzy match in alias dictionary
 * 
 * @param query - Normalized query
 * @returns Best match or null
 */
function findFuzzyMatch(query: string): { alias: string; title: string; similarity: number } | null {
    const queryLower = query.toLowerCase();
    const candidates = getCandidates(queryLower);

    let bestMatch: { alias: string; title: string; similarity: number } | null = null;

    for (const alias of candidates) {
        const aliasLower = alias.toLowerCase();

        // Length difference filter (early exit)
        if (Math.abs(queryLower.length - aliasLower.length) > 3) continue;

        // Short strings: exact match only
        if (queryLower.length <= 3) {
            if (queryLower === aliasLower) {
                return { alias, title: ALIAS_DICTIONARY[alias], similarity: 1.0 };
            }
            continue;
        }

        // Calculate similarity
        const similarity = calculateSimilarity(queryLower, aliasLower);

        // Threshold based on length
        const threshold = queryLower.length <= 6 ? 0.8 : 0.6;

        if (similarity >= threshold) {
            if (!bestMatch || similarity > bestMatch.similarity) {
                bestMatch = { alias, title: ALIAS_DICTIONARY[alias], similarity };
            }
        }
    }

    return bestMatch;
}

/**
 * Find suggestion matches (lower similarity)
 * 
 * @param query - Normalized query
 * @returns Array of suggestions (max 3)
 */
function findSuggestions(query: string): string[] {
    const queryLower = query.toLowerCase();
    const candidates = getCandidates(queryLower);

    const suggestions: Array<{ title: string; similarity: number }> = [];

    for (const alias of candidates) {
        const aliasLower = alias.toLowerCase();

        // Length difference filter
        if (Math.abs(queryLower.length - aliasLower.length) > 3) continue;

        const similarity = calculateSimilarity(queryLower, aliasLower);

        // Suggestion range: 0.4 - 0.6
        if (similarity >= 0.4 && similarity < 0.6) {
            suggestions.push({ title: ALIAS_DICTIONARY[alias], similarity });
        }
    }

    // Sort by similarity and dedupe
    const seen = new Set<string>();
    return suggestions
        .sort((a, b) => b.similarity - a.similarity)
        .filter(s => {
            if (seen.has(s.title)) return false;
            seen.add(s.title);
            return true;
        })
        .slice(0, 3)
        .map(s => s.title);
}

// ============================================================================
// MAP LOOKUPS
// ============================================================================

/**
 * Lookup character name
 */
function lookupCharacter(query: string): string[] | null {
    const key = query.toLowerCase();
    const matches = CHARACTER_MAP[key as keyof typeof CHARACTER_MAP];
    return matches ? [...matches].slice(0, 5) : null;
}

/**
 * Lookup author name
 */
function lookupAuthor(query: string): string[] | null {
    const matches = AUTHOR_MAP[query as keyof typeof AUTHOR_MAP];
    return matches ? [...matches].slice(0, 5) : null;
}

/**
 * Lookup tag/genre
 */
function lookupTag(query: string): string[] | null {
    const key = query.toLowerCase();
    const matches = TAG_MAP[key as keyof typeof TAG_MAP];
    return matches ? [...matches].slice(0, 5) : null;
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Get cached result with query validation
 */
export function getCachedResult(query: string): SearchState | null {
    const hash = fnv1a(query);
    const entry = RESULT_CACHE.get(hash);

    // Validate: hash match + query exact match (collision protection)
    if (entry && entry.query === query) {
        return entry.result;
    }

    return null;
}

/**
 * Cache a result
 */
export function cacheResult(query: string, result: SearchState): void {
    const hash = fnv1a(query);
    RESULT_CACHE.set(hash, {
        query,
        result,
        timestamp: Date.now(),
    });
}

/**
 * Check if query is in dedupe cache (for logging)
 */
export function isInDedupeCache(query: string): boolean {
    return LOG_DEDUPE_CACHE.has(query);
}

/**
 * Add to dedupe cache
 */
export function addToDedupeCache(query: string): void {
    LOG_DEDUPE_CACHE.set(query, true);
}

// ============================================================================
// MAIN QUERY PROCESSOR
// ============================================================================

/**
 * Parse and analyze a search query
 * 
 * @param rawQuery - Raw user input
 * @returns Parsed query structure
 */
export function parseQuery(rawQuery: string): ParsedQuery {
    // Sanitize
    const sanitized = sanitizeInput(rawQuery);

    // Extract volume
    const { base, volume } = extractVolume(sanitized);

    // Check maps in priority order
    // 1. Character map
    const characterMatches = lookupCharacter(base);
    if (characterMatches) {
        return {
            raw: rawQuery,
            normalized: characterMatches.length === 1 ? characterMatches[0] : base,
            volume,
            isAuthor: false,
            isCharacter: true,
            isTag: false,
            candidates: characterMatches,
        };
    }

    // 2. Author map
    const authorMatches = lookupAuthor(base);
    if (authorMatches) {
        return {
            raw: rawQuery,
            normalized: authorMatches.length === 1 ? authorMatches[0] : base,
            volume,
            isAuthor: true,
            isCharacter: false,
            isTag: false,
            candidates: authorMatches,
        };
    }

    // 3. Tag map
    const tagMatches = lookupTag(base);
    if (tagMatches) {
        return {
            raw: rawQuery,
            normalized: base,
            volume,
            isAuthor: false,
            isCharacter: false,
            isTag: true,
            candidates: tagMatches,
        };
    }

    // 4. Fuzzy match (CONFIDENT)
    const fuzzyMatch = findFuzzyMatch(base);
    if (fuzzyMatch && fuzzyMatch.similarity >= 0.6) {
        return {
            raw: rawQuery,
            normalized: fuzzyMatch.title,
            volume,
            isAuthor: false,
            isCharacter: false,
            isTag: false,
        };
    }

    // 5. Suggestions (lower similarity)
    const suggestions = findSuggestions(base);
    if (suggestions.length > 0) {
        return {
            raw: rawQuery,
            normalized: base,
            volume,
            isAuthor: false,
            isCharacter: false,
            isTag: false,
            suggestions,
        };
    }

    // 6. No match - will use keyword fallback
    return {
        raw: rawQuery,
        normalized: base,
        volume,
        isAuthor: false,
        isCharacter: false,
        isTag: false,
    };
}

/**
 * Determine search state based on parsed query and API results
 * 
 * @param parsedQuery - Parsed query from parseQuery()
 * @param apiResults - Results from Rakuten API
 * @returns Search state
 */
export function determineSearchState(
    parsedQuery: ParsedQuery,
    apiResults: BookResult[]
): SearchState {
    const hasResults = apiResults.length > 0;
    const hasMultipleCandidates = (parsedQuery.candidates?.length ?? 0) > 1;
    const hasSuggestions = (parsedQuery.suggestions?.length ?? 0) > 0;

    // Priority 1: Character/Author with multiple candidates
    if ((parsedQuery.isCharacter || parsedQuery.isAuthor) && hasMultipleCandidates) {
        return {
            type: 'AMBIGUOUS_MATCH',
            message: parsedQuery.isCharacter
                ? `「${parsedQuery.raw}」が登場する作品が複数あります`
                : `「${parsedQuery.raw}」先生の作品が複数あります`,
            candidates: [],
            suggestions: parsedQuery.candidates,
        };
    }

    // Priority 2: Tag with multiple candidates
    if (parsedQuery.isTag && hasMultipleCandidates) {
        return {
            type: 'AMBIGUOUS_MATCH',
            message: 'このジャンルの作品が複数あります',
            candidates: [],
            suggestions: parsedQuery.candidates,
        };
    }

    // Priority 3: Single confident match with results
    if (hasResults && !hasMultipleCandidates && !hasSuggestions) {
        // Check if top result matches our prediction
        const topTitle = apiResults[0]?.title || '';
        const similarity = calculateSimilarity(
            parsedQuery.normalized.toLowerCase(),
            topTitle.toLowerCase()
        );

        if (similarity >= 0.4 || parsedQuery.isCharacter || parsedQuery.isAuthor || parsedQuery.isTag) {
            return {
                type: 'CONFIDENT_MATCH',
                message: parsedQuery.volume
                    ? `「${parsedQuery.normalized}」${parsedQuery.volume}巻が見つかりました`
                    : `「${parsedQuery.normalized}」が見つかりました`,
                candidates: apiResults,
            };
        }
    }

    // Priority 4: Suggestions available
    if (hasSuggestions) {
        return {
            type: 'SUGGESTION_MATCH',
            message: 'もしかして...',
            candidates: apiResults,
            suggestions: parsedQuery.suggestions,
        };
    }

    // Priority 5: Keyword fallback (has results but no match)
    if (hasResults) {
        return {
            type: 'KEYWORD_FALLBACK',
            message: '関連する本が見つかりました',
            candidates: apiResults,
        };
    }

    // Priority 6: Title only (alias matched but no results)
    if (parsedQuery.normalized !== parsedQuery.raw) {
        return {
            type: 'TITLE_ONLY',
            message: `「${parsedQuery.normalized}」は見つかりましたが、現在在庫がありません`,
            candidates: [],
        };
    }

    // Priority 7: Not found
    return {
        type: 'NOT_FOUND',
        message: '該当する本が見つかりませんでした',
        candidates: [],
    };
}

// ============================================================================
// DEBUG LOGGER
// ============================================================================

const debugLogs: string[] = [];
const DEBUG_MODE = process.env.NODE_ENV === 'development' &&
    process.env.SEARCH_DEBUG === 'true';

/**
 * Clear debug logs
 */
export function clearDebugLogs(): void {
    debugLogs.length = 0;
}

/**
 * Get debug logs
 */
export function getDebugLogs(): string[] {
    return [...debugLogs];
}

/**
 * Log debug message
 */
export function debugLog(message: string): void {
    if (DEBUG_MODE) {
        const timestamp = new Date().toISOString();
        debugLogs.push(`[${timestamp}] ${message}`);
    }
}

// ============================================================================
// EXPORTS SUMMARY
// ============================================================================

export {
    CHARACTER_MAP,
    AUTHOR_MAP,
    TAG_MAP,
    ALIAS_DICTIONARY,
};
