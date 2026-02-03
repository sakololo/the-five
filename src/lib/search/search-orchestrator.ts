/**
 * Search Orchestrator
 * 
 * 検索結果の状態を判定し、フロントエンドへの指示を生成する
 */

import type { ScoredBook } from './core/scorer';

export type SearchStateType =
    | 'CONFIDENT_MATCH'   // 確信ヒット: 完璧に見つかった
    | 'AMBIGUOUS_MATCH'   // 曖昧: 候補が複数ある
    | 'TITLE_ONLY'        // タイトル特定: タイトルは分かるがAPI結果なし
    | 'NOT_FOUND';        // 見つからない: 全く分からない

export interface SearchState {
    type: SearchStateType;
    message: string;
    subMessage?: string;
    primaryAction: string;
    secondaryAction?: string;
    recognizedTitle?: string;
    topScore: number;
    resultCount: number;
}

// 状態判定の閾値（敵対的レビューで調整済み）
const THRESHOLDS = {
    CONFIDENT: 65,  // 80 → 65に調整（完全一致50 + 短いタイトル10 + α）
    AMBIGUOUS: 50,
};

/**
 * 検索結果の状態を判定する
 */
export function evaluateSearchState(
    books: ScoredBook[],
    wasAliasResolved: boolean,
    recognizedTitle?: string
): SearchState {
    const resultCount = books.length;
    const topScore = resultCount > 0 ? books[0].score : 0;

    // ケース1: 結果があり、高スコア → CONFIDENT
    if (resultCount > 0 && topScore >= THRESHOLDS.CONFIDENT) {
        return {
            type: 'CONFIDENT_MATCH',
            message: `『${books[0].title}』`,
            subMessage: 'これで合っていますか？',
            primaryAction: 'このタイトルで探す',
            secondaryAction: '少し違う',
            recognizedTitle: books[0].title,
            topScore,
            resultCount,
        };
    }

    // ケース2: 結果があるが、スコアが低い → AMBIGUOUS
    if (resultCount > 0 && topScore < THRESHOLDS.AMBIGUOUS) {
        return {
            type: 'AMBIGUOUS_MATCH',
            message: 'もしかして、どれか近いものはありますか？',
            primaryAction: 'これにする',
            secondaryAction: '他を探す',
            topScore,
            resultCount,
        };
    }

    // ケース3: 結果はあるが中間スコア → それでもCONFIDENTとして扱う（UX向上）
    if (resultCount > 0) {
        return {
            type: 'CONFIDENT_MATCH',
            message: `『${books[0].title}』`,
            subMessage: 'こちらでしょうか？',
            primaryAction: 'このタイトルで探す',
            secondaryAction: '違う本を探す',
            recognizedTitle: books[0].title,
            topScore,
            resultCount,
        };
    }

    // ケース4: 結果なし、だがエイリアスでタイトルは特定できた → TITLE_ONLY
    if (wasAliasResolved && recognizedTitle) {
        return {
            type: 'TITLE_ONLY',
            message: `『${recognizedTitle}』`,
            subMessage: 'タイトルは分かりましたが、在庫が見つかりませんでした。',
            primaryAction: '別の巻で探す',
            secondaryAction: '戻る',
            recognizedTitle,
            topScore: 0,
            resultCount: 0,
        };
    }

    // ケース5: 完全に見つからない → NOT_FOUND
    return {
        type: 'NOT_FOUND',
        message: 'この本棚では見つかりませんでした。',
        subMessage: '別のキーワードで試してみますか？',
        primaryAction: 'もう一度入力する',
        topScore: 0,
        resultCount: 0,
    };
}
