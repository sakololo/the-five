import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 環境変数が設定されているか確認
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// 開発環境や環境変数未設定時のためのフォールバック（メモリ内制限）
// 注意: VercelなどのServerless環境ではインスタンスごとにリセットされるため、
// Distributedな攻撃に対しては完全ではありませんが、簡易的な防御にはなります。
const ephemeralCache = new Map();

let ratelimit: Ratelimit | null = null;

if (redisUrl && redisToken) {
    try {
        const redis = new Redis({
            url: redisUrl,
            token: redisToken,
        });

        ratelimit = new Ratelimit({
            redis: redis,
            limiter: Ratelimit.slidingWindow(10, '60 s'), // 1分間に10回
            analytics: true,
            prefix: 'the-five-search-ratelimit',
        });
    } catch (error) {
        console.warn('Failed to initialize Upstash Redis:', error);
    }
}

export type RateLimitResult = {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
};

/**
 * IPアドレスに基づいてレート制限をチェックする
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
    // Redisが有効な場合
    if (ratelimit) {
        try {
            const { success, limit, remaining, reset } = await ratelimit.limit(ip);
            return { success, limit, remaining, reset };
        } catch (error) {
            console.error('Rate limit check failed (Redis error), allowing request:', error);
            // Redisが落ちている場合はユーザーをブロックせず通す（Fail Open）
            return { success: true, limit: 10, remaining: 10, reset: 0 };
        }
    }

    // フォールバック: メモリ内Map (Serverlessでは不完全だが無いよりマシ)
    const now = Date.now();
    const windowMs = 60 * 1000;
    const limit = 10;

    const record = ephemeralCache.get(ip);

    if (!record || (now - record.timestamp) > windowMs) {
        ephemeralCache.set(ip, { count: 1, timestamp: now });
        return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
    }

    if (record.count >= limit) {
        return { success: false, limit, remaining: 0, reset: record.timestamp + windowMs };
    }

    record.count++;
    return { success: true, limit, remaining: limit - record.count, reset: record.timestamp + windowMs };
}
