import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// fallback for development or missing env vars
const memoryMap = new Map();

export async function checkRateLimit(identifier: string) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    // 環境変数が無い場合は、開発モードとしてレート制限をスキップ（または簡易メモリ制限）
    if (!redisUrl || !redisToken) {
        console.warn('Rate Limiter: UPSTASH credentials missing. Using weak in-memory fallback.');
        const now = Date.now();
        const windowStart = now - 60 * 1000;

        // Simple clean up
        for (const [key, timestamp] of memoryMap.entries()) {
            if (timestamp < windowStart) memoryMap.delete(key);
        }

        // Check limit (allow 20 req/min for dev)
        const requestCount = Array.from(memoryMap.values()).filter(t => t > windowStart && t === identifier).length; // Incorrect impl for map, fixing logic below

        // Correct simple implementation: Key = IP, Value = { count, expiry }
        let record = memoryMap.get(identifier);
        if (!record || record.expiry < now) {
            record = { count: 0, expiry: now + 60 * 1000 };
        }

        record.count++;
        memoryMap.set(identifier, record);

        if (record.count > 20) {
            return { success: false, limit: 20, remaining: 0, reset: record.expiry };
        }

        return { success: true, limit: 20, remaining: 20 - record.count, reset: record.expiry };
    }

    try {
        const redis = new Redis({
            url: redisUrl,
            token: redisToken,
        });

        const ratelimit = new Ratelimit({
            redis: redis,
            limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
            analytics: true,
            prefix: '@upstash/ratelimit',
        });

        return await ratelimit.limit(identifier);
    } catch (error) {
        console.error('Rate Limiter Error:', error);
        // Redis fails open (allow request) to prevent blocking users on infra failure
        return { success: true, limit: 10, remaining: 10, reset: Date.now() + 10000 };
    }
}
