import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
// We use a try-catch pattern or optional chaining implicitly by checking env vars in the route,
// but for the module level, we instantiate properly.
// If env vars are missing, this might throw at runtime when used, which is handled in the route.

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Create a new ratelimiter, that allows 20 requests per 60 seconds (IP based)
// Adjusted to 20 to be slightly more generous than the strict 10 in previous simple map
export const rateLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(20, '60 s'),
  analytics: true,
  prefix: '@upstash/ratelimit',
});

// Helper to check limit
export type RateLimitResult = { success: boolean; limit: number; remaining: number; reset: number };

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const { success, limit, remaining, reset } = await rateLimiter.limit(identifier);
  return { success, limit, remaining, reset };
}
