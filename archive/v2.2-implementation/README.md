# V2.2 セキュリティアーキテクチャ アーカイブ

## 概要
このフォルダには、敵対的レビューを経て策定されたSearch API V2.2の実装コードが保存されています。

## 内容

| ファイル | 説明 |
|----------|------|
| `route.ts` | リファクタリング済みのSearch APIルート |
| `search/InputValidator.ts` | 入力検証モジュール |
| `search/RateLimiter.ts` | Upstash Redis二重制限 |
| `search/RequestCoalescer.ts` | LRUリクエスト統合 |
| `search/CircuitBreaker.ts` | API障害保護 |
| `search/index.ts` | エクスポートバレル |

## 本番への適用方法

1. このフォルダの内容を `the-five-app` にコピー
2. `npm install @upstash/ratelimit @upstash/redis lru-cache` を実行
3. Vercel環境変数を設定:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. デプロイ

## 関連ドキュメント

- `../docs/SEARCH_ARCHITECTURE_V2.2.md` - 最終仕様書
- `../RED_TEAM_ATTACK_REPORT.md` - 攻撃レポート
- `../BLUE_TEAM_DEFENSE.md` - 防御設計
