/**
 * ============================================
 * 検索予測エンジン (Sandbox版)
 * ============================================
 * 
 * 検索結果を「預かる」ロジックを提供します。
 * 4つの状態（確信/曖昧/タイトルのみ/不明）に分類し、
 * 状態に応じたUIメッセージを提供します。
 */

// ============================================
// 型定義
// ============================================

export type SearchStateType =
    | 'CONFIDENT_MATCH'   // 確信ヒット: 完璧に見つかった
    | 'AMBIGUOUS_MATCH'   // 曖昧: 候補が複数ある
    | 'TITLE_ONLY'        // タイトル特定: タイトルは分かるがAPI結果なし
    | 'NOT_FOUND';        // 見つからない: 全く分からない

export interface SearchState {
    type: SearchStateType;
    message: string;           // ユーザーに表示するメッセージ
    subMessage?: string;       // 補足メッセージ
    primaryAction: string;     // メインボタンのラベル
    secondaryAction?: string;  // サブボタンのラベル
    recognizedTitle?: string;  // 認識できたタイトル（あれば）
    candidates?: string[];     // 候補リスト（曖昧な場合）
}

export interface BookResult {
    title: string;
    author?: string;
    isbn?: string;
    coverUrl?: string;
}

// ============================================
// エイリアス辞書（サンドボックス用・テスト用に一部だけ）
// ============================================

const SANDBOX_ALIASES: Record<string, string> = {
    // テスト用にいくつかのエイリアスのみ定義
    'ワンピ': 'ONE PIECE',
    'ワンピース': 'ONE PIECE',
    'ナルト': 'NARUTO',
    '鬼滅': '鬼滅の刃',
    'キメツ': '鬼滅の刃',
    'きめつ': '鬼滅の刃',
    'ハンター': 'HUNTER×HUNTER',
    'ハンタ': 'HUNTER×HUNTER',
    'ドラゴンボール': 'DRAGON BALL',
    'ドラボ': 'DRAGON BALL',
    'スラダン': 'SLAM DUNK',
    'スラムダンク': 'SLAM DUNK',
    '呪術': '呪術廻戦',
    'じゅじゅつ': '呪術廻戦',
    'チェンソー': 'チェンソーマン',
    'チェンソーマン': 'チェンソーマン',
    'スパイ': 'SPY×FAMILY',
    'スパイファミリー': 'SPY×FAMILY',
    '進撃': '進撃の巨人',
    '巨人': '進撃の巨人',
    'ヒロアカ': '僕のヒーローアカデミア',
    'ブリーチ': 'BLEACH',
    'ブルーロック': 'ブルーロック',
};

// ============================================
// メインロジック
// ============================================

/**
 * 検索結果を評価し、適切な状態を返す
 * 
 * @param query - ユーザーの元の入力
 * @param normalizedQuery - 正規化後のクエリ
 * @param apiResults - 楽天APIからの結果
 * @returns SearchState - UI表示用の状態オブジェクト
 */
export function evaluateSearchResult(
    query: string,
    normalizedQuery: string,
    apiResults: BookResult[]
): SearchState {
    const queryTrimmed = query.trim();

    // ケース1: APIで結果が見つかった
    if (apiResults.length > 0) {
        // 正規化されたかどうかで確信度を判定
        if (normalizedQuery !== queryTrimmed) {
            // エイリアス変換が行われた → 確信あり
            return createConfidentMatch(normalizedQuery, apiResults[0].title);
        }
        // そのまま検索してヒット → 確信あり
        return createConfidentMatch(queryTrimmed, apiResults[0].title);
    }

    // ケース2: APIで結果なし、だがエイリアスでタイトルは特定できた
    const recognizedTitle = findRecognizedTitle(queryTrimmed, normalizedQuery);
    if (recognizedTitle) {
        return createTitleOnly(recognizedTitle);
    }

    // ケース3: 部分一致する候補があるか
    const candidates = findPartialMatchCandidates(queryTrimmed);
    if (candidates.length > 0) {
        return createAmbiguousMatch(candidates);
    }

    // ケース4: 完全に見つからない
    return createNotFound();
}

/**
 * クエリを正規化する（エイリアス辞書を使用）
 */
export function normalizeQuery(query: string): string {
    let normalized = query.trim();

    // 半角カタカナ→全角カタカナ変換
    normalized = normalized.replace(/[\uff66-\uff9f]/g, (char) => {
        const code = char.charCodeAt(0);
        return String.fromCharCode(code - 0xff66 + 0x30a2);
    });

    // ひらがな→カタカナ変換
    normalized = normalized.replace(/[\u3041-\u3096]/g, (char) => {
        return String.fromCharCode(char.charCodeAt(0) + 0x60);
    });

    // エイリアス辞書で完全一致チェック
    const aliasResult = SANDBOX_ALIASES[normalized] || SANDBOX_ALIASES[query.trim()];
    if (aliasResult) {
        return aliasResult;
    }

    // 部分一致でエイリアスを探す
    const normalizedLower = normalized.toLowerCase();
    const partialMatches = Object.entries(SANDBOX_ALIASES).filter(([key]) => {
        const keyLower = key.toLowerCase();
        return keyLower.includes(normalizedLower) || normalizedLower.includes(keyLower);
    });

    if (partialMatches.length > 0) {
        // 最も短いキー（最も特定度が高い）を優先
        partialMatches.sort((a, b) => a[0].length - b[0].length);
        return partialMatches[0][1];
    }

    return normalized;
}

// ============================================
// ヘルパー関数: 状態オブジェクト生成
// ============================================

function createConfidentMatch(query: string, foundTitle: string): SearchState {
    return {
        type: 'CONFIDENT_MATCH',
        message: `『${foundTitle}』`,
        subMessage: 'これで合っていますか？',
        primaryAction: 'このタイトルで探す',
        secondaryAction: '少し違う',
        recognizedTitle: foundTitle,
    };
}

function createTitleOnly(title: string): SearchState {
    return {
        type: 'TITLE_ONLY',
        message: `『${title}』`,
        subMessage: 'タイトルは分かりましたが、本棚に在庫が見つかりませんでした。',
        primaryAction: '別の巻で探す',
        secondaryAction: '戻る',
        recognizedTitle: title,
    };
}

function createAmbiguousMatch(candidates: string[]): SearchState {
    return {
        type: 'AMBIGUOUS_MATCH',
        message: 'もしかして、こちらですか？',
        subMessage: '近いタイトルが見つかりました',
        primaryAction: 'これにする',
        secondaryAction: '他を探す',
        candidates: candidates.slice(0, 5), // 最大5件
    };
}

function createNotFound(): SearchState {
    return {
        type: 'NOT_FOUND',
        message: 'この本棚では、まだ見つかりませんでした。',
        subMessage: '別の呼び方や、正式タイトルで試してみますか？',
        primaryAction: 'もう一度入力する',
        secondaryAction: undefined,
    };
}

// ============================================
// ヘルパー関数: タイトル認識
// ============================================

/**
 * エイリアス辞書からタイトルを特定できるか判定
 */
function findRecognizedTitle(query: string, normalizedQuery: string): string | null {
    // 正規化でエイリアスが見つかった場合、そのタイトルを返す
    if (normalizedQuery !== query && SANDBOX_ALIASES[query]) {
        return SANDBOX_ALIASES[query];
    }

    // 部分一致でエイリアスを探す
    const queryLower = query.toLowerCase();
    for (const [key, value] of Object.entries(SANDBOX_ALIASES)) {
        if (key.toLowerCase().includes(queryLower) || queryLower.includes(key.toLowerCase())) {
            return value;
        }
    }

    return null;
}

/**
 * 部分一致する候補を複数取得
 */
function findPartialMatchCandidates(query: string): string[] {
    const queryLower = query.toLowerCase();
    const matches = new Set<string>();

    for (const [key, value] of Object.entries(SANDBOX_ALIASES)) {
        if (key.toLowerCase().includes(queryLower) || queryLower.includes(key.toLowerCase())) {
            matches.add(value);
        }
    }

    return Array.from(matches);
}

// ============================================
// デバッグログ用
// ============================================

export interface DebugLog {
    step: string;
    detail: string;
    timestamp: number;
}

export function createDebugLogger() {
    const logs: DebugLog[] = [];

    return {
        log: (step: string, detail: string) => {
            logs.push({ step, detail, timestamp: Date.now() });
        },
        getLogs: () => logs,
        clear: () => { logs.length = 0; },
    };
}
