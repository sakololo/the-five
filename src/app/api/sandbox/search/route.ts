/**
 * Sandbox Search API - Demo endpoint for prediction engine testing
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    parseQuery,
    determineSearchState,
    getCachedResult,
    cacheResult,
    isCircuitOpen,
    recordApiFailure,
    recordApiSuccess,
    POPULAR_SEARCHES,
    EmptyQueryError,
    type BookResult,
    type SearchState,
} from '@/lib/sandbox/prediction-engine';

// Mock book results for demo (no actual API call)
const MOCK_BOOKS: Record<string, BookResult[]> = {
    'ONE PIECE': [
        { id: '1', title: 'ONE PIECE 1', author: '尾田栄一郎', publisher: '集英社', isbn: '9784088720001', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0001/9784088720001.jpg', volume: 1 },
        { id: '2', title: 'ONE PIECE 2', author: '尾田栄一郎', publisher: '集英社', isbn: '9784088720002', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0002/9784088720002.jpg', volume: 2 },
        { id: '3', title: 'ONE PIECE 100', author: '尾田栄一郎', publisher: '集英社', isbn: '9784088720100', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0100/9784088720100.jpg', volume: 100 },
    ],
    'NARUTO': [
        { id: '10', title: 'NARUTO 1', author: '岸本斉史', publisher: '集英社', isbn: '9784088720101', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0101/9784088720101.jpg', volume: 1 },
    ],
    'DRAGON BALL': [
        { id: '20', title: 'DRAGON BALL 1', author: '鳥山明', publisher: '集英社', isbn: '9784088720201', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0201/9784088720201.jpg', volume: 1 },
    ],
    '鬼滅の刃': [
        { id: '30', title: '鬼滅の刃 1', author: '吾峠呼世晴', publisher: '集英社', isbn: '9784088720301', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0301/9784088720301.jpg', volume: 1 },
    ],
    '呪術廻戦': [
        { id: '40', title: '呪術廻戦 1', author: '芥見下々', publisher: '集英社', isbn: '9784088720401', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0401/9784088720401.jpg', volume: 1 },
    ],
    'SPY×FAMILY': [
        { id: '50', title: 'SPY×FAMILY 1', author: '遠藤達哉', publisher: '集英社', isbn: '9784088720501', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0501/9784088720501.jpg', volume: 1 },
    ],
    'SLAM DUNK': [
        { id: '60', title: 'SLAM DUNK 1', author: '井上雄彦', publisher: '集英社', isbn: '9784088720601', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0601/9784088720601.jpg', volume: 1 },
    ],
    'HUNTER×HUNTER': [
        { id: '70', title: 'HUNTER×HUNTER 1', author: '冨樫義博', publisher: '集英社', isbn: '9784088720701', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0701/9784088720701.jpg', volume: 1 },
    ],
    'BLEACH': [
        { id: '80', title: 'BLEACH 1', author: '久保帯人', publisher: '集英社', isbn: '9784088720801', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0801/9784088720801.jpg', volume: 1 },
    ],
    '進撃の巨人': [
        { id: '90', title: '進撃の巨人 1', author: '諫山創', publisher: '講談社', isbn: '9784088720901', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0901/9784088720901.jpg', volume: 1 },
    ],
    'チェンソーマン': [
        { id: '100', title: 'チェンソーマン 1', author: '藤本タツキ', publisher: '集英社', isbn: '9784088721001', imageUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/1001/9784088721001.jpg', volume: 1 },
    ],
};

function getMockResults(normalizedTitle: string): BookResult[] {
    return MOCK_BOOKS[normalizedTitle] || [];
}

export async function GET(request: NextRequest) {
    const startTime = Date.now();
    const query = request.nextUrl.searchParams.get('q') || '';

    // Empty query - return popular searches
    if (!query.trim()) {
        return NextResponse.json({
            type: 'EMPTY',
            message: '人気の検索ワード',
            popularSearches: POPULAR_SEARCHES,
            processingTimeMs: Date.now() - startTime,
        });
    }

    // Check circuit breaker
    if (isCircuitOpen()) {
        return NextResponse.json({
            type: 'CIRCUIT_OPEN',
            message: '現在、検索サービスが一時的に利用できません。30秒後に再試行してください。',
            processingTimeMs: Date.now() - startTime,
        }, { status: 503 });
    }

    try {
        // Check cache
        const cachedResult = getCachedResult(query);
        if (cachedResult) {
            return NextResponse.json({
                ...cachedResult,
                cached: true,
                processingTimeMs: Date.now() - startTime,
            });
        }

        // Parse query
        const parsedQuery = parseQuery(query);

        // Get mock results (in real implementation, this would call Rakuten API)
        const mockResults = getMockResults(parsedQuery.normalized);

        // Determine state
        const state = determineSearchState(parsedQuery, mockResults);

        // Cache result
        cacheResult(query, state);

        // Record success
        recordApiSuccess();

        return NextResponse.json({
            ...state,
            parsedQuery: {
                raw: parsedQuery.raw,
                normalized: parsedQuery.normalized,
                volume: parsedQuery.volume,
                isCharacter: parsedQuery.isCharacter,
                isAuthor: parsedQuery.isAuthor,
                isTag: parsedQuery.isTag,
            },
            cached: false,
            processingTimeMs: Date.now() - startTime,
        });

    } catch (error) {
        if (error instanceof EmptyQueryError) {
            return NextResponse.json({
                type: 'ERROR',
                message: error.message,
                processingTimeMs: Date.now() - startTime,
            }, { status: 400 });
        }

        recordApiFailure();

        return NextResponse.json({
            type: 'ERROR',
            message: '検索中にエラーが発生しました',
            processingTimeMs: Date.now() - startTime,
        }, { status: 500 });
    }
}
