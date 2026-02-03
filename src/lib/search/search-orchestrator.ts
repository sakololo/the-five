/**
 * Search Orchestrator
 * 
 * 検索結果の状態を判定し、フロントエンドへの指示を生成する
 */

import type { ScoredBook } from './core/scorer';
import type {
    SearchState,
    SearchStateType,
    ConfidentMatchState,
    AmbiguousMatchState,
    TitleOnlyState,
    NotFoundState
} from '@/types/search';

export type { SearchState, SearchStateType };


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
    // (50-65の範囲もここに含まれるようになった)
    if (resultCount > 0) {
        return {
            type: 'AMBIGUOUS_MATCH',
            message: 'もしかして、どれか近いものはありますか？',
            primaryAction: 'これにする',
            secondaryAction: '他を探す',
            topScore,
            resultCount,
        };
    }

    // ケース3: 結果なし、だがエイリアスでタイトルは特定できた → TITLE_ONLY
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

    // ケース4: 完全に見つからない → NOT_FOUND
    return {
        type: 'NOT_FOUND',
        message: 'この本棚では見つかりませんでした。',
        subMessage: '別のキーワードで試してみますか？',
        primaryAction: 'もう一度入力する',
        topScore: 0,
        resultCount: 0,
    };
}
