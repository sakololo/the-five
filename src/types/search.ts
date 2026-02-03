/**
 * Search State Types
 * フロントエンドとバックエンドで共有する検索状態の型定義
 */

export type SearchStateType =
    | 'CONFIDENT_MATCH'   // 確信ヒット: 完璧に見つかった
    | 'AMBIGUOUS_MATCH'   // 曖昧: 候補が複数ある
    | 'TITLE_ONLY'        // タイトル特定: タイトルは分かるがAPI結果なし
    | 'NOT_FOUND';        // 見つからない: 全く分からない

// Base interface
export interface BaseSearchState {
    type: SearchStateType;
    message: string;
    secondaryAction?: string;
    subMessage?: string;
    recognizedTitle?: string;
    topScore: number;
    resultCount: number;
}

// Discriminated Unions for stricter typing
export interface ConfidentMatchState extends BaseSearchState {
    type: 'CONFIDENT_MATCH';
    primaryAction: string;
    secondaryAction: string; // Required for confident match
}

export interface AmbiguousMatchState extends BaseSearchState {
    type: 'AMBIGUOUS_MATCH';
    primaryAction: string;
    secondaryAction: string; // Required for ambiguous match
}

export interface TitleOnlyState extends BaseSearchState {
    type: 'TITLE_ONLY';
    primaryAction: string;
    secondaryAction: string; // Required
}

export interface NotFoundState extends BaseSearchState {
    type: 'NOT_FOUND';
    primaryAction: string;
    secondaryAction?: string; // Optional for not found
}

export type SearchState = ConfidentMatchState | AmbiguousMatchState | TitleOnlyState | NotFoundState;

export interface SearchApiResponse {
    books: any[]; // フロントエンドで整形するので any[] または Book[]
    total: number;
    normalizedQuery?: string;
    targetVolume?: number;
    googleIsbn?: string;
    searchState: SearchState;
    warning?: string;
    error?: string;
}
