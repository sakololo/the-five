# 🔵 SECURITY ARCHITECT: 防御設計書

**Persona**: Security Architect (Blue Team)
**Mission**: Red Teamが発見した10個の脆弱性に対する防御策を設計する

---

## 脆弱性 #1: Rate Limiter Bypass (Cold Start)

**攻撃**: Serverlessの冷起動でMapがリセット → 無限リクエスト可能

**防御策**: **Vercel Edge Config + KV Storage**
```typescript
// vercel.json
{
  "crons": [],
  "rewrites": [],
  "headers": [
    {
      "source": "/api/search",
      "headers": [
        { "key": "X-RateLimit-Limit", "value": "10" },
        { "key": "X-RateLimit-Remaining", "value": "{{edge.rateLimit.remaining}}" }
      ]
    }
  ]
}
```

**代替案（実装コスト低）**: Upstash Redis Rate Limiting
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL, token: process.env.UPSTASH_REDIS_TOKEN });
const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '60 s') });
```

**PoC無効化**: ✅ 状態がEdge/Redisに永続化 → Cold Start無効

---

## 脆弱性 #2: Origin Validation Bypass

**攻撃**: `origin === '' && referer === ''` で全て通過

**防御策**: **Origin Validationを完全削除**

**理由**: 
- APIは公開意図がある（ユーザーが検索する）
- Origin/Refererはクライアント偽装可能
- Rate Limitingで制御する方が確実

**代替案**: API Key認証（フロントエンドに埋め込み + Rate Limit per Key）

**PoC無効化**: ✅ 検証自体を削除 → 攻撃対象消滅

---

## 脆弱性 #3: IP Spoofing (X-Forwarded-For)

**攻撃**: ヘッダー偽装で無限IP生成

**防御策**: **Vercel Trusted Headers Only**
```typescript
function getClientIP(request: NextRequest): string {
  // Vercel sets this header from the real client IP
  // Cannot be spoofed by the client
  return request.headers.get('x-real-ip') || 
         request.headers.get('x-vercel-forwarded-for')?.split(',')[0] || 
         'unknown';
}
```

**注意**: `x-forwarded-for` は信頼しない。Vercelが設定する `x-real-ip` のみ使用。

**PoC無効化**: ✅ クライアントが設定不可能なヘッダーを使用

---

## 脆弱性 #4: Alias Enumeration (Timing Attack)

**攻撃**: レスポンス時間差でエイリアス存在を推測

**防御策**: **一定時間レスポンス**
```typescript
async function search(query: string) {
  const startTime = Date.now();
  const result = await doSearch(query);
  
  // Minimum response time: 200ms
  const elapsed = Date.now() - startTime;
  if (elapsed < 200) {
    await new Promise(resolve => setTimeout(resolve, 200 - elapsed));
  }
  
  return result;
}
```

**PoC無効化**: ✅ 全レスポンスが同一時間 → タイミング差消滅

---

## 脆弱性 #5: Circuit Breaker Cache Poisoning

**攻撃**: 障害時に不正データをキャッシュ → 永続汚染

**防御策**: **キャッシュしない**
```typescript
// Circuit Breaker "Open" 状態では:
// 1. キャッシュを返さない
// 2. 即座に503 + Retry-Afterを返す
if (circuitBreaker.isOpen()) {
  return NextResponse.json(
    { error: 'SERVICE_UNAVAILABLE', retryAfter: 30 },
    { status: 503, headers: { 'Retry-After': '30' } }
  );
}
```

**PoC無効化**: ✅ 障害時データをキャッシュしない → 汚染不可

---

## 脆弱性 #6: Request Coalescer Memory Exhaustion

**攻撃**: 無限の一意クエリでMapが肥大化

**防御策**: **LRU Cache + Timeout**
```typescript
import { LRUCache } from 'lru-cache';

const inflightRequests = new LRUCache<string, Promise<Result>>({
  max: 100, // Maximum 100 concurrent unique queries
  ttl: 10000, // 10 second timeout
});
```

**PoC無効化**: ✅ 最大100件 + 10秒TTL → メモリ上限固定

---

## 脆弱性 #7: CPU Exhaustion (String Matching)

**攻撃**: 長大クエリで O(n*m) 計算

**防御策**: **入力長制限**
```typescript
const MAX_QUERY_LENGTH = 100;

if (query.length > MAX_QUERY_LENGTH) {
  return NextResponse.json(
    { error: 'QUERY_TOO_LONG', maxLength: MAX_QUERY_LENGTH },
    { status: 400 }
  );
}
```

**PoC無効化**: ✅ 100文字超を拒否 → 計算量固定

---

## 脆弱性 #8: Levenshtein設計欠陥

**攻撃**: 略称→正式名の変換不可能

**防御策**: **Token Set Ratio + N-gram**
```typescript
// "DB" vs "DRAGON BALL"
// Token Set Ratio: intersection / union of tokens
// "DB" tokens: ["DB"]
// "DRAGON BALL" tokens: ["DRAGON", "BALL"]
// No intersection → 0

// 代わりに: Alias-First, Fuzzy-Second
function findMatch(query: string) {
  // 1. Exact alias match
  if (ALIASES[query]) return ALIASES[query];
  
  // 2. Partial alias match (with guards)
  const partialMatch = findPartialAlias(query);
  if (partialMatch) return partialMatch;
  
  // 3. Direct API search (let Rakuten handle fuzzy)
  return null; // Proceed with raw query
}
```

**結論**: Levenshteinは**タイポ補正専用**。略称対応はエイリアス辞書の責務。

**PoC無効化**: ✅ 役割分担の明確化 → 期待値修正

---

## 脆弱性 #9: Dead Code (supabase import)

**防御策**: **削除**
```diff
- import { supabase } from '@/lib/supabase';
```

**PoC無効化**: ✅ 存在しない → 問題なし

---

## 脆弱性 #10: Origin Leak (NEXT_PUBLIC)

**攻撃**: JSバンドルからオリジン取得

**防御策**: **Origin Validationを削除したため無効化済み**

もしOrigin検証を維持する場合:
```typescript
// サーバーサイドのみの環境変数を使用
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',');
// NEXT_PUBLIC_ プレフィックスを使わない
```

**PoC無効化**: ✅ Origin検証削除 → 漏洩しても無意味

---

## 防御策サマリー

| # | 脆弱性 | 防御策 | 実装コスト |
|---|--------|--------|-----------|
| 1 | Rate Limiter Bypass | Upstash Redis | MEDIUM |
| 2 | Origin Bypass | 削除 | LOW |
| 3 | IP Spoofing | x-real-ip使用 | LOW |
| 4 | Timing Attack | 最小200msレスポンス | LOW |
| 5 | Cache Poisoning | キャッシュしない | LOW |
| 6 | Memory Exhaustion | LRU Cache | LOW |
| 7 | CPU Exhaustion | 100文字制限 | LOW |
| 8 | Levenshtein欠陥 | 役割分担明確化 | LOW |
| 9 | Dead Code | 削除 | LOW |
| 10 | Origin Leak | 削除で無効化 | LOW |
