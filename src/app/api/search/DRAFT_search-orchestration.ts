/**
 * ============================================
 * 🚧 DRAFT: Search Orchestration Module
 * ============================================
 * 
 * このファイルは本番コードには組み込まれていません。
 * 将来的に採用する場合のための設計・実装ドラフトです。
 * 
 * 目的:
 * - 検索結果を「預かる」ロジックを提供
 * - 4つの状態（Hit/Almost/TitleFound/NotFound）に分類
 * - 状態に応じたUIメッセージを提供
 * 
 * 採用方法:
 * 1. このファイルを route.ts でインポート
 * 2. 検索結果に対して evaluateSearchResult() を呼び出す
 * 3. 返ってきた SearchState に応じてフロントエンドUIを分岐
 */

import { MANGA_ALIASES } from './aliases';

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
        message: 'もしかして、どれか近いものはありますか？',
        primaryAction: 'これにする',
        secondaryAction: '他を探す',
        candidates: candidates.slice(0, 5), // 最大5件
    };
}

function createNotFound(): SearchState {
    return {
        type: 'NOT_FOUND',
        message: 'この本棚では、まだうまく思い出せていないみたいです。',
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
    if (normalizedQuery !== query && MANGA_ALIASES[query]) {
        return MANGA_ALIASES[query];
    }

    // 部分一致でエイリアスを探す
    const queryLower = query.toLowerCase();
    for (const [key, value] of Object.entries(MANGA_ALIASES)) {
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

    for (const [key, value] of Object.entries(MANGA_ALIASES)) {
        if (key.toLowerCase().includes(queryLower) || queryLower.includes(key.toLowerCase())) {
            matches.add(value);
        }
    }

    return Array.from(matches);
}

// ============================================
// 使用例（コメントアウト）
// ============================================

/*
// route.ts での使用イメージ:

import { evaluateSearchResult, SearchState } from './DRAFT_search-orchestration';

// ... 検索処理後 ...

const searchState = evaluateSearchResult(query, normalizedQuery, books);

return NextResponse.json({
  books: sortedBooks,
  total: sortedBooks.length,
  searchState: searchState, // フロントエンドで使用
});

// フロントエンド側:
// searchState.type に応じて UI を切り替える
*/
