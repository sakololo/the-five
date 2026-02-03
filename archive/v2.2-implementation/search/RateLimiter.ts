/**
 * RateLimiter - Upstash Redis ベースのレート制限
 * V2.2 Security Architecture
 * 
 * 二重制限: Global (全体) + IP (個別)
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 環境変数が未設定の場合はダミーモードで動作
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// グローバル制限: 1分間に1000リクエスト (全ユーザー合計)
const globalLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(1000, '60 s'),
        prefix: 'ratelimit:global',
    })
    : null;

// IP制限: 1分間に10リクエスト (IP単位)
const ipLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '60 s'),
        prefix: 'ratelimit:ip',
    })
    : null;

export interface RateLimitResult {
    success: boolean;
    remaining?: number;
    reset?: number;
}

/**
 * レート制限をチェックする
 * @param ip クライアントIP
 * @returns 成功/失敗と残りリクエスト数
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
    // Redis未設定時はパススルー（開発環境用）
    if (!globalLimit || !ipLimit) {
        console.warn('[RateLimiter] Upstash Redis not configured, rate limiting disabled');
        return { success: true };
    }

    try {
        const [globalResult, ipResult] = await Promise.all([
            globalLimit.limit('global'),
            ipLimit.limit(ip),
        ]);

        if (!globalResult.success) {
            return {
                success: false,
                remaining: 0,
                reset: globalResult.reset,
            };
        }

        if (!ipResult.success) {
            return {
                success: false,
                remaining: 0,
                reset: ipResult.reset,
            };
        }

        return {
            success: true,
            remaining: Math.min(globalResult.remaining, ipResult.remaining),
        };
    } catch (error) {
        console.error('[RateLimiter] Error:', error);
        // Redis障害時はパススルー（可用性優先）
        return { success: true };
    }
}
