/**
 * Search Result Scorer
 * 
 * 検索結果にスコアを付与し、ユーザーの意図に最も合致する順に並べる
 */

import { extractVolumeNumber, normalizeSeparators } from './normalizer';

export interface BookData {
    title: string;
    author?: string;
    isbn?: string;
    coverUrl?: string;
    // 楽天APIからの生データを含む可能性
    [key: string]: unknown;
}

export interface ScoredBook extends BookData {
    score: number;
    scoreBreakdown: ScoreBreakdown;
    volumeNumber: number | null;
}

export interface ScoreBreakdown {
    exactTitleMatch: number;
    volumeMatch: number;
    volume1Bonus: number;
    shortTitleBonus: number;
    editionPenalty: number;
    spinoffPenalty: number;
    adultPenalty: number;
}

// スコアリング定数
const SCORES = {
    EXACT_TITLE_MATCH: 50,
    TARGET_VOLUME_MATCH: 100,
    VOLUME_1_BONUS: 20,
    SHORT_TITLE_BONUS: 10,
    EDITION_PENALTY: -5,
    SPINOFF_PENALTY: -30,
    ADULT_CONTENT_PENALTY: -1000,
};

// 版型ペナルティ対象キーワード
const EDITION_KEYWORDS = ['文庫', '愛蔵版', 'ワイド版', '新装版', 'デラックス', 'DX'];

// 番外編・スピンオフペナルティ対象キーワード（敵対的レビューで精査済み）
const SPINOFF_KEYWORDS = [
    'ガイドブック', 'ファンブック', 'キャラクターブック',
    '外伝', '小説版', 'ノベライズ', 'アンソロジー',
    'イラスト集', 'エピソードオブ',
];

// アダルトコンテンツフィルタキーワード
const ADULT_KEYWORDS = [
    'エロ', 'アダルト', '18禁', 'R18', 'R-18',
];

/**
 * タイトルが正規化クエリを含むかチェック（敵対的レビューで強化）
 * - 空クエリは常にfalse
 * - 直接包含チェック（語順考慮）を優先
 * - トークン比較（語順無視）をフォールバック
 */
function checkExactTitleMatch(title: string, normalizedQuery: string): boolean {
    // 空クエリは常にfalse
    if (!normalizedQuery || normalizedQuery.trim() === '') {
        return false;
    }

    const normalizedTitle = normalizeSeparators(title).toLowerCase();
    const normalizedQ = normalizedQuery.toLowerCase();

    // 1. 直接包含チェック（語順も一致）
    if (normalizedTitle.includes(normalizedQ)) {
        return true;
    }

    // 2. トークン比較（語順無視、フォールバック）
    const titleTokens = normalizedTitle.split(' ').filter(t => t.length > 0);
    const queryTokens = normalizedQ.split(' ').filter(t => t.length > 0);

    if (queryTokens.length === 0) {
        return false;
    }

    return queryTokens.every(qt => titleTokens.some(tt => tt.includes(qt)));
}

/**
 * 版型キーワードをチェック
 */
function checkEditionKeywords(title: string): boolean {
    return EDITION_KEYWORDS.some(keyword => title.includes(keyword));
}

/**
 * 番外編・スピンオフキーワードをチェック（正規化後に部分一致）
 */
function checkSpinoffKeywords(title: string): boolean {
    // 空白と中黒を除去してマッチング
    const normalizedTitle = title.replace(/[\s・]/g, '').toLowerCase();
    return SPINOFF_KEYWORDS.some(keyword => {
        const normalizedKeyword = keyword.replace(/[\s・]/g, '').toLowerCase();
        return normalizedTitle.includes(normalizedKeyword);
    });
}

/**
 * アダルトコンテンツをチェック
 */
function checkAdultContent(title: string): boolean {
    return ADULT_KEYWORDS.some(keyword => title.includes(keyword));
}

/**
 * 単一の本をスコアリング
 */
export function scoreBook(
    book: BookData,
    normalizedQuery: string,
    targetVolume: number | null
): ScoredBook {
    const title = book.title || '';
    const volumeNumber = extractVolumeNumber(title);

    const breakdown: ScoreBreakdown = {
        exactTitleMatch: 0,
        volumeMatch: 0,
        volume1Bonus: 0,
        shortTitleBonus: 0,
        editionPenalty: 0,
        spinoffPenalty: 0,
        adultPenalty: 0,
    };

    // 1. 完全一致ボーナス
    if (checkExactTitleMatch(title, normalizedQuery)) {
        breakdown.exactTitleMatch = SCORES.EXACT_TITLE_MATCH;
    }

    // 2. 巻数一致ボーナス
    if (targetVolume !== null && volumeNumber === targetVolume) {
        breakdown.volumeMatch = SCORES.TARGET_VOLUME_MATCH;
    }

    // 3. 第1巻ボーナス（巻数指定がない場合）
    if (targetVolume === null && volumeNumber === 1) {
        breakdown.volume1Bonus = SCORES.VOLUME_1_BONUS;
    }

    // 4. 短いタイトルボーナス（シンプルなタイトルを優先）
    if (title.length <= 30) {
        breakdown.shortTitleBonus = SCORES.SHORT_TITLE_BONUS;
    }

    // 5. 版型ペナルティ
    if (checkEditionKeywords(title)) {
        breakdown.editionPenalty = SCORES.EDITION_PENALTY;
    }

    // 6. 番外編ペナルティ（External Auditor推奨）
    if (checkSpinoffKeywords(title)) {
        breakdown.spinoffPenalty = SCORES.SPINOFF_PENALTY;
    }

    // 7. アダルトコンテンツペナルティ
    if (checkAdultContent(title)) {
        breakdown.adultPenalty = SCORES.ADULT_CONTENT_PENALTY;
    }

    const totalScore =
        breakdown.exactTitleMatch +
        breakdown.volumeMatch +
        breakdown.volume1Bonus +
        breakdown.shortTitleBonus +
        breakdown.editionPenalty +
        breakdown.spinoffPenalty +
        breakdown.adultPenalty;

    return {
        ...book,
        score: totalScore,
        scoreBreakdown: breakdown,
        volumeNumber,
    };
}

/**
 * 本のリストをスコアリングし、スコア順にソート
 */
export function scoreAndSortBooks(
    books: BookData[],
    normalizedQuery: string,
    targetVolume: number | null
): ScoredBook[] {
    const scoredBooks = books.map(book => scoreBook(book, normalizedQuery, targetVolume));

    // スコア降順でソート
    scoredBooks.sort((a, b) => b.score - a.score);

    return scoredBooks;
}

/**
 * アダルトコンテンツを除外
 */
export function filterAdultContent(books: ScoredBook[]): ScoredBook[] {
    return books.filter(book => book.scoreBreakdown.adultPenalty === 0);
}
