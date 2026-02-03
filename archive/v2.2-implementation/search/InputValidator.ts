/**
 * InputValidator - 入力検証とサニタイズ
 * V2.2 Security Architecture
 */

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;

export interface ValidationResult {
    valid: boolean;
    query?: string;
    error?: 'QUERY_TOO_SHORT' | 'QUERY_TOO_LONG' | 'QUERY_EMPTY';
}

/**
 * 検索クエリを検証・サニタイズする
 */
export function validateQuery(query: string | null | undefined): ValidationResult {
    if (!query) {
        return { valid: false, error: 'QUERY_EMPTY' };
    }

    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
        return { valid: false, error: 'QUERY_TOO_SHORT' };
    }

    if (trimmed.length > MAX_QUERY_LENGTH) {
        return { valid: false, error: 'QUERY_TOO_LONG' };
    }

    // サニタイズ: Unicode文字(L)・数字(N)・空白(s)のみ許可
    // 特殊文字・絵文字・制御文字を除去
    const sanitized = trimmed.replace(/[^\p{L}\p{N}\s]/gu, '').trim();

    if (sanitized.length < MIN_QUERY_LENGTH) {
        return { valid: false, error: 'QUERY_TOO_SHORT' };
    }

    return { valid: true, query: sanitized };
}
