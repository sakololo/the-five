# プロジェクト引き継ぎ資料: THE FIVE

## 1. プロジェクト概要
**アプリ名**: THE FIVE
**目的**: ユーザーが「究極の5冊」（漫画/小説）を選び、AIに鑑定してもらったり、単にSNSでシェアしたりするアプリケーション。
**主な機能**:
- **検索**: 楽天ブックスAPIを使用して書籍を検索。
- **選書**: ユーザーが「本棚」に5冊の本を選ぶ。
- **表示**: 選んだ本を表示する「雑誌（Magazine）」モードと「ギャラリー（Gallery）」モード。
- **共有**: X (Twitter) でシェアするためのOGP画像の生成。
- **バックエンド**: ログ記録や将来的な機能のためのSupabase。

## 2. 技術スタック
- **フロントエンド**: Next.js 16.1.6 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS v4
- **データベース/バックエンド**: Supabase
- **外部API**: 楽天ブックスAPI (`BooksBook/Search`)
- **主なライブラリ**:
  - `@vercel/og`, `html-to-image`: 画像生成用。
  - `@dnd-kit`: ドラッグ＆ドロップ操作用（本の並べ替えなど）。
  - `lucide-react`: アイコン。

## 3. 現在の実装状況
### 検索API (`/src/app/api/search/route.ts`)
- **ロジック**: **ハイブリッド検索**（Google Books API + Rakuten Books API）。
  1. **Google Books API**: クエリのISBNを特定（表記揺れに強い）。
  2. **Rakuten Books API**: 取得したISBNでの指名検索（Request A）と、従来のキーワード検索（Request B）を並列実行。
  3. **結果統合**: ISBN一致の結果を最優先（先頭）に配置し、重複を除去。
- **機能**:
  - **マンガ別名辞書**: 一般的な略称を正式名称に変換する辞書（例: "ワンピ" -> "ONE PIECE"）。
  - **レート制限**: 簡易的なインメモリ制限（IPごとに1分間10リクエスト）。
  - **ログ記録**: 失敗した検索をSupabaseの `search_logs` テーブルに記録しようとする。
  - **正規化**: 半角/全角カタカナの正規化処理。

### データと永続化
- **本棚データ**: `THE-FIVE` というテーブル名でSupabaseに保存されています（**注意**: 一般的な `shelves` ではありません）。
  - **getShelf** 関数が `id` をキーにこのテーブルからデータを取得します。
- **ログ記録**: `search_logs` テーブル（失敗した検索ログ用）。

### APIエンドポイント
- **/api/search**: 楽天ブックス検索。
- **/api/proxy-image**: 画像プロキシ。`html-to-image` や `@vercel/og` がCORS制約に引っかからないようにするために必須です。
- **/api/og**: 汎用OGP生成。`/public/fonts/NotoSansJP-Bold.ttf` というフォントファイルに依存しています。

### OGP (Open Graph Protocol) の仕様
- **実装場所**: `src/app/shelf/[id]/opengraph-image.tsx` および `src/app/api/og/route.tsx`。
- **ランタイム**: Vercelの **Edge Runtime** で動作しています。
- **デザインの固定**: 本棚のOGP画像は、SNSでの視認性を高めるため、ユーザーがアプリで選択したテーマに関わらず**常にホワイト基調の「ギャラリー風」デザイン**で生成されるようになっています（意図的な仕様です）。
- **フォント**: 日本語を正しく表示するため、`api/og` ではカスタムフォントを直接読み込んでいます。フォントファイルが欠落すると表示が崩れる可能性があります。

### 機能の実装詳細（重要）
- **AI鑑定機能**: 現在は**モック実装**です（`src/app/page.tsx` の `IS_AI_ENABLED = false`）。
  - 本当のLLMなどを呼び出しているわけではなく、選んだジャンルに基づいて事前に定義されたテキスト（`MOCK_APPRAISALS`）を表示しています。
- **コンポーネント配置**: `src/components` ディレクトリはなく、`src/app` 内にコロケーション（同居）されています（例: `BookSearchResultItem.tsx`）。

### UI/UX
- **フォント**: `src/app/layout.tsx` でGoogle Fonts (`Inter`, `Permanent Marker`, `Kaisei Tokumin`, `Shippori Mincho`) を読み込んでいます。このフォント構成がアプリの「プレミアム感」の核となっているため、変更時は注意が必要です。
- **ギャラリー/雑誌モード**: 「My Bookshelf」のために実装済み。
- **モバイル共有**: モバイルデバイスでのX (Twitter) 共有が正しく動作するように調整中（ディープリンク vs ブラウザ）。

## 4. 直近の課題とデバッグ
**解決済み**: 「検索失敗（Search failed）」エラー。
- **原因**: `.env.local` の `NEXT_PUBLIC_SUPABASE_ANON_KEY` が誤った形式（新しい `sb_publishable_` 形式）だったため、`supabase-js` クライアントが接続に失敗していました。
- **対応**: 正しい `Legacy anon key` (JWT形式) に差し替え、ローカルでの動作は正常化しました。
- **【重要】次のステップ**: 本番環境（Vercel）の環境変数も同様に正しい `anon` キーに更新する必要があります。これが完了するまで本番では検索ログ保存（または検索処理自体）が失敗する可能性があります。

**解決済み**: 検索精度（「もやしもん」が出ない問題）。
- **原因**: 楽天APIのタイトル検索が厳密すぎたため。
- **対応**: Google Books APIと連携させたハイブリッド検索に変更（ISBNで特定してから楽天APIを叩く）。
- **確認**: サーバーログで `Google Books found ISBN-13: ...` を確認済み。

## 5. 必要な環境変数
次のエージェントは `.env.local` に以下の変数を設定する必要があります：
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RAKUTEN_APP_ID=your_rakuten_app_id
GOOGLE_BOOKS_API_KEY=your_google_books_api_key  <-- 【重要】これが必須になりました！
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 6. 次のエージェントへの既知のコンテキスト
- **Supabaseログ**: 失敗したクエリを追跡するために `search_logs` テーブルがSQLで最近セットアップされました。
- **デプロイ**: ユーザーはVercelへのデプロイワークフローを参照しています。
- **デザイン哲学**: 「プレミアム」で「ダイナミック」な美学（グラスモーフィズム、アニメーション）を重視。

## 7. 直近の次のステップ
1.  **検索の検証**: `/api/search` のエラーについてコンソールログを確認する。`RAKUTEN_APP_ID` が有効か確認する。
2.  **Supabase接続**: `search_logs` テーブルが存在し、アプリが書き込み可能か確認する。
3.  **引き継ぎ**: 新しいチャットセッションを開始する際、このファイルをコンテキストとして読み込ませる。

## 8. ユーザー体験向上のための重要方針
- **有名作品の網羅**: 検索体験を最大化するため、有名な作品（漫画・小説）を積極的に検索・検証し、ヒットしない場合はエイリアス辞書やデータベースに追加して、確実にユーザーが見つけられるように整備を進めること。
