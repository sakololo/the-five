/**
 * Search Query Normalizer
 * 
 * クエリの正規化とメタデータ抽出を行う
 */

import { MANGA_ALIASES } from '@/app/api/search/aliases';

export interface NormalizedQuery {
    /** 正規化されたクエリ文字列 */
    normalized: string;
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
    /\s(\d+)$/, // 末尾の数字「NARUTO 72」
    /[(（](\d+)[)）]/, // 括弧内「(72)」「（72）」
    /Vol\.?\s*(\d+)/i, // 「Vol.72」「Vol 72」
];

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
 */
function resolveAlias(query: string, normalizedQuery: string): { resolved: string; key?: string } | null {
    // 完全一致を優先
    if (MANGA_ALIASES[normalizedQuery]) {
        return { resolved: MANGA_ALIASES[normalizedQuery], key: normalizedQuery };
    }
    if (MANGA_ALIASES[query]) {
        return { resolved: MANGA_ALIASES[query], key: query };
    }

    // 部分一致（最短キーを優先）
    const queryLower = query.toLowerCase();
    const normalizedLower = normalizedQuery.toLowerCase();

    const partialMatches = Object.entries(MANGA_ALIASES).filter(([key]) => {
        const keyLower = key.toLowerCase();
        return keyLower.includes(normalizedLower) || normalizedLower.includes(keyLower) ||
            keyLower.includes(queryLower) || queryLower.includes(keyLower);
    });

    if (partialMatches.length > 0) {
        partialMatches.sort((a, b) => a[0].length - b[0].length);
        return { resolved: partialMatches[0][1], key: partialMatches[0][0] };
    }

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

    // Step 3: エイリアス解決
    const aliasResult = resolveAlias(cleanedQuery, normalizedChars);

    if (aliasResult) {
        return {
            normalized: aliasResult.resolved,
            original,
            targetVolume: volume,
            wasAliasResolved: true,
            aliasKey: aliasResult.key,
        };
    }

    return {
        normalized: normalizedChars,
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
