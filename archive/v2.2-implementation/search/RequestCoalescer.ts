/**
 * RequestCoalescer - 重複リクエストの統合
 * V2.2 Security Architecture
 * 
 * 同一クエリの同時リクエストを1つのAPI呼び出しに統合
 */

import { LRUCache } from 'lru-cache';

export interface SearchResult {
    books: unknown[];
    total: number;
    normalizedQuery?: string;
}

// LRU Cache: 最大100件、TTL 10秒
const inflightRequests = new LRUCache<string, Promise<SearchResult>>({
    max: 100,
    ttl: 10000, // 10秒
});

/**
 * リクエストを統合する
 * @param key キャッシュキー（通常は正規化されたクエリ）
 * @param fn 実際の検索処理
 * @returns 検索結果
 */
export async function coalesceRequest(
    key: string,
    fn: () => Promise<SearchResult>
): Promise<SearchResult> {
    // 既存のin-flightリクエストがあれば再利用
    const existing = inflightRequests.get(key);
    if (existing) {
        console.log(`[Coalescer] Reusing in-flight request for: ${key}`);
        return existing;
    }

    // 新規リクエストを開始
    const promise = fn();
    inflightRequests.set(key, promise);

    try {
        const result = await promise;
        return result;
    } finally {
        // 完了後にキャッシュから削除
        inflightRequests.delete(key);
    }
}

/**
 * 現在のin-flightリクエスト数を取得（デバッグ用）
 */
export function getInflightCount(): number {
    return inflightRequests.size;
}
