/**
 * ============================================
 * サンドボックス用 検索API
 * ============================================
 * 
 * 実験用のAPIエンドポイントです。
 * 本番のAPIとは完全に独立しています。
 * 予測エンジンのロジックをテストし、デバッグ情報を返します。
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    evaluateSearchResult,
    normalizeQuery,
    createDebugLogger,
    type SearchState,
    type BookResult
} from '@/lib/sandbox/prediction-engine';

// キャッシュ無効化
export const dynamic = 'force-dynamic';

// ============================================
// 楽天API呼び出し（本番からコピー）
// ============================================

async function fetchBooksByKeyword(
    appId: string,
    query: string
): Promise<Record<string, unknown>[]> {
    // タイトル検索を試す
    const titleParams = new URLSearchParams({
        applicationId: appId,
        format: 'json',
        hits: '20',
        sort: 'sales',
        booksGenreId: '001001', // コミック
        outOfStockFlag: '1',
        title: query,
    });

    const titleUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${titleParams.toString()}`;

    const titleResponse = await fetch(titleUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
    });

    if (titleResponse.ok) {
        const data = await titleResponse.json();
        const items = data.Items || [];

        if (items.length > 0) {
            return items;
        }
    }

    // キーワード検索にフォールバック
    const keywordParams = new URLSearchParams({
        applicationId: appId,
        format: 'json',
        hits: '20',
        sort: 'sales',
        booksGenreId: '001001',
        outOfStockFlag: '1',
        keyword: query,
    });

    const keywordUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${keywordParams.toString()}`;

    const keywordResponse = await fetch(keywordUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
    });

    if (!keywordResponse.ok) {
        console.error(`Rakuten API keyword search error: ${keywordResponse.status}`);
        return [];
    }

    const data = await keywordResponse.json();
    return data.Items || [];
}

// ============================================
// 結果変換
// ============================================

function transformBooks(items: Record<string, unknown>[]): BookResult[] {
    const seen = new Set<string>();
    const books: BookResult[] = [];
    const excludeKeywords = ['BOX', 'セット'];

    for (const item of items) {
        const book = item.Item as Record<string, unknown>;
        const isbn = String(book.isbn || '');
        const title = (book.title || '') as string;

        // 除外チェック
        if (excludeKeywords.some(keyword => title.includes(keyword))) {
            continue;
        }

        // 重複チェック
        if (isbn && seen.has(isbn)) continue;
        if (isbn) seen.add(isbn);

        const coverUrl = (book.largeImageUrl || book.mediumImageUrl || book.smallImageUrl || '') as string;

        books.push({
            title: title,
            author: (book.author || '') as string,
            isbn: isbn,
            coverUrl: coverUrl,
        });
    }

    return books;
}

// ============================================
// APIハンドラ
// ============================================

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query) {
        return NextResponse.json(
            { error: '検索ワードが必要です' },
            { status: 400 }
        );
    }

    const appId = process.env.RAKUTEN_APP_ID;
    if (!appId) {
        return NextResponse.json(
            { error: 'RAKUTEN_APP_IDが設定されていません' },
            { status: 500 }
        );
    }

    // デバッグログを初期化
    const debug = createDebugLogger();

    try {
        // ステップ1: クエリを正規化
        debug.log('正規化', `入力: "${query}"`);
        const normalizedQuery = normalizeQuery(query);
        debug.log('正規化完了', `結果: "${normalizedQuery}"`);

        // ステップ2: 楽天APIで検索
        debug.log('API検索', `クエリ: "${normalizedQuery}"`);
        const rawResults = await fetchBooksByKeyword(appId, normalizedQuery);
        debug.log('API検索完了', `${rawResults.length}件の生データ取得`);

        // ステップ3: 結果を変換
        const books = transformBooks(rawResults);
        debug.log('変換完了', `${books.length}件の本に変換`);

        // ステップ4: 予測エンジンで判定
        debug.log('予測エンジン', '判定開始');
        const searchState: SearchState = evaluateSearchResult(query, normalizedQuery, books);
        debug.log('予測エンジン完了', `判定結果: ${searchState.type}`);

        // レスポンス
        return NextResponse.json({
            // 基本情報
            originalQuery: query,
            normalizedQuery: normalizedQuery,

            // 予測結果
            searchState: searchState,

            // 本の結果
            books: books,
            totalBooks: books.length,

            // デバッグ情報
            debugLogs: debug.getLogs(),
        });

    } catch (error) {
        console.error('Sandbox Search API error:', error);
        return NextResponse.json({
            error: '検索中にエラーが発生しました',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
