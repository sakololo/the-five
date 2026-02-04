/**
 * Search Query Normalizer
 * 
 * クエリの正規化とメタデータ抽出を行う
 * 
 * 敵対的レビュー承認済み: 2026-02-03
 */

import { MANGA_ALIASES } from '@/app/api/search/aliases';

export interface NormalizedQuery {
    /** 正規化されたクエリ文字列 */
    normalized: string;
    /** マッチング用に正規化されたクエリ（記号変換済み） */
    normalizedForMatching: string;
    /** 元のクエリ */
    original: string;
    /** 抽出された巻数（あれば） */
    targetVolume: number | null;
    /** エイリアスから解決されたか */
    wasAliasResolved: boolean;
    /** 解決されたエイリアスのキー（デバッグ用） */
    aliasKey?: string;
}

/**
 * 巻数を抽出する正規表現パターン
 */
const VOLUME_PATTERNS = [
    /(\d+)\s*[巻]/, // 「72巻」
    /[第]\s*(\d+)\s*[巻]/, // 「第72巻」
    /[(（](\d+)[)）]/, // 括弧内「(72)」「（72）」
    /Vol\.?\s*(\d+)/i, // 「Vol.72」「Vol 72」
];

/**
 * 正規表現の特殊文字をエスケープする
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
}

/**
 * 区切り文字リスト（敵対的レビューで精査済み）
 */
const SEPARATOR_CHARS = [
    '×', '✕', '✖', '・', ':', '：', '/', '／',
    '-', '−', '!', '！', '?', '？', '&', '＆',
    '〜', '～', '♪', '★', '☆', '#', '＃', '@', '＠',
    '(', ')', '（', '）', '[', ']', '【', '】',
    `"`, `'`, `"`, `"`, `'`, `'`
];

const SEPARATOR_PATTERN = new RegExp(
    `[${SEPARATOR_CHARS.map(escapeRegExp).join('')}]`,
    'g'
);

/**
 * 区切り文字を正規化（記号→空白、連続空白→単一空白）
 */
export function normalizeSeparators(input: string): string {
    return input
        .replace(SEPARATOR_PATTERN, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * クエリから巻数を抽出する
 */
function extractVolumeFromQuery(query: string): { volume: number | null; cleanedQuery: string } {
    // Step 1: 明示的パターン（「巻」「Vol」付き）を優先
    for (const pattern of VOLUME_PATTERNS) {
        const match = query.match(pattern);
        if (match) {
            const volume = parseInt(match[1], 10);
            const cleanedQuery = query.replace(pattern, '').trim();
            return { volume, cleanedQuery };
        }
    }

    // Step 2: 末尾数字パターン（Part判定を追加）
    const endingMatch = query.match(/\s(\d+)$/);
    if (endingMatch) {
        const number = parseInt(endingMatch[1], 10);
        const beforeNumber = query.substring(0, endingMatch.index).trim();

        // 「Part」「パート」が直前にある場合は除外
        if (/(?:part|パート|ﾊﾟｰﾄ)$/i.test(beforeNumber)) {
            return { volume: null, cleanedQuery: query };
        }

        // 0-999の範囲で巻数として抽出（0巻対応）
        if (number >= 0 && number <= 999) {
            const cleanedQuery = query.replace(/\s\d+$/, '').trim();
            return { volume: number, cleanedQuery };
        }
    }

    return { volume: null, cleanedQuery: query };
}

/**
 * 文字列を正規化する（カタカナ統一、半角全角統一など）
 */
function normalizeCharacters(input: string): string {
    let normalized = input.trim();

    // 全角英数字 → 半角（敵対的レビューで追加）
    normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => {
        return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    });

    // 半角カタカナ → 全角カタカナ
    normalized = normalized.replace(/[\uff66-\uff9f]/g, (char) => {
        const code = char.charCodeAt(0);
        return String.fromCharCode(code - 0xff66 + 0x30a2);
    });

    // ひらがな → カタカナ
    normalized = normalized.replace(/[\u3041-\u3096]/g, (char) => {
        return String.fromCharCode(char.charCodeAt(0) + 0x60);
    });

    return normalized;
}

/**
 * エイリアス辞書からタイトルを解決する
 * 
 * First Token Only アプローチ:
 * - 完全一致を優先
 * - 複数トークンの場合、最初のトークンのみ完全一致でエイリアス解決
 * - 部分一致は危険なため削除（ONE PIECEースバグの原因）
 */
function resolveAlias(query: string, normalizedQuery: string): { resolved: string; key?: string } | null {
    // Step 1: 完全一致を優先
    if (MANGA_ALIASES[normalizedQuery]) {
        return { resolved: MANGA_ALIASES[normalizedQuery], key: normalizedQuery };
    }
    if (MANGA_ALIASES[query]) {
        return { resolved: MANGA_ALIASES[query], key: query };
    }

    // Step 2: First Token Only - 空白で分割し、最初のトークンのみ完全一致で解決
    const tokens = normalizedQuery.split(/[\s　]+/).filter(t => t.length > 0);
    if (tokens.length > 1) {
        const firstToken = tokens[0];
        if (MANGA_ALIASES[firstToken]) {
            // 最初のトークンを解決し、残りを結合して返す
            const resolvedFirst = MANGA_ALIASES[firstToken];
            const remaining = tokens.slice(1).join(' ');
            return { resolved: `${resolvedFirst} ${remaining}`, key: firstToken };
        }
    }

    // Step 3: 部分一致ロジックは削除（危険なため）
    // 以前のコード: partialMatches による最短マッチ → ONE PIECEースバグの原因

    return null;
}

/**
 * メインの正規化関数
 */
export function normalizeSearchQuery(query: string): NormalizedQuery {
    const original = query;

    // Step 0: 全角数字を半角に変換（最優先）
    let processedQuery = query.replace(/[０-９]/g, (c) =>
        String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
    );

    // Step 1: 巻数を抽出
    const { volume, cleanedQuery } = extractVolumeFromQuery(processedQuery);

    // Step 2: 文字を正規化
    const normalizedChars = normalizeCharacters(cleanedQuery);

    // Step 3: 区切り文字を正規化（マッチング用）
    const normalizedForMatching = normalizeSeparators(normalizedChars);

    // Step 4: 空クエリチェック（敵対的レビューで追加）
    if (normalizedForMatching.trim() === '') {
        return {
            normalized: normalizedChars,
            normalizedForMatching: '',
            original,
            targetVolume: volume,
            wasAliasResolved: false,
        };
    }

    // Step 5: エイリアス解決
    const aliasResult = resolveAlias(cleanedQuery, normalizedChars);

    if (aliasResult) {
        // First Token Only アプローチにより、aliasResult.resolved はすでに完全な正規化済みクエリ
        // 部分置換ロジックは不要（ONE PIECEースバグの原因だった）
        return {
            normalized: aliasResult.resolved,
            normalizedForMatching: normalizeSeparators(aliasResult.resolved),
            original,
            targetVolume: volume,
            wasAliasResolved: true,
            aliasKey: aliasResult.key,
        };
    }

    return {
        normalized: normalizedChars,
        normalizedForMatching,
        original,
        targetVolume: volume,
        wasAliasResolved: false,
    };
}

/**
 * タイトルから巻数を抽出する（検索結果の本に対して使用）
 */
export function extractVolumeNumber(title: string): number | null {
    if (typeof title !== 'string') return null;

    // パターン1: 括弧内の数字
    let match = title.match(/[(（](\d+)[)）]/);
    if (match) return parseInt(match[1], 10);

    // パターン2: 末尾の数字
    match = title.match(/[\s　](\d+)$/);
    if (match) return parseInt(match[1], 10);

    // パターン3: 「巻」の前の数字
    match = title.match(/(\d+)[巻]/);
    if (match) return parseInt(match[1], 10);

    return null;
}
