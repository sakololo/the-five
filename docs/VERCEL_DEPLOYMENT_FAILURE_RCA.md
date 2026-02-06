# Vercel初回デプロイ失敗の根本原因分析レポート

## 📋 調査結果サマリー

**結論**: 開発用スクリプトファイルが本番ビルドに含まれ、TypeScript型チェックエラーを引き起こした。

---

## 🔍 タイムライン

### Phase 1: 問題の発生（Commit: 047608d）
**日時**: 2026-02-04 23:31:24

このコミットで以下のファイルが追加されました：
- `scripts/chaos_audit.ts` （88行追加）
- `scripts/edge_case_audit.ts` （107行追加）
- `scripts/test_surrogate.ts` （43行追加）

**変更の目的**: 
- Edge Case Hunter監査の実施
- サロゲートペア安全性のテスト
- Chaos Monkey監査レポートの作成

**問題点**:
これらのスクリプトファイルは **開発・検証専用** であり、本番ビルドには不要。しかし、Next.js/TypeScriptの設定では、プロジェクト内の全ての `.ts` ファイルがコンパイル対象となっていた。

---

## ❌ エラーの連鎖

### Error 1: 変数重複宣言エラー
```
Type error: Cannot redeclare block-scoped variable 'TERMS'.
scripts/debug_kokoro.ts:2:7
```

**原因**: 
- Vercelのビルド環境では、`scripts/debug_kokoro.ts` 内の変数宣言が重複と判定された
- ローカル環境では問題なかったが、Vercel環境では厳格にチェックされた

### Error 2: 存在しないモジュールの参照
```
Type error: Cannot find module '../src/lib/search/lib/searchAliases' or its corresponding type declarations.
scripts/verify_raw_term_issues.ts:4:51
```

**原因**:
- エラーログには `verify_raw_term_issues.ts` が表示されたが、このファイルはGit履歴に存在しない
- 可能性：
  1. Vercelのキャッシュに古いファイルが残存
  2. 別のブランチやコミットからの参照
  3. エラーメッセージの誤表示（実際は他のスクリプトファイル）

---

## 🛠️ 対策の試行錯誤

### 試行1: tsconfig.json の exclude 設定
```json
"exclude": ["node_modules", "scripts"]
```

**結果**: ❌ 失敗
**理由**: TypeScriptコンパイラは除外したが、Next.jsのビルドプロセスは依然として scripts/ を走査していた

### 試行2: .vercelignore の作成
```
scripts/
*.ts.bak
*.log
```

**結果**: ❌ 失敗
**理由**: `.vercelignore` はデプロイファイルの除外には機能するが、既にGitに含まれているファイルはビルド対象として残る

### 試行3: next.config.ts への turbopack 設定追加
```typescript
const nextConfig: NextConfig = {
  turbopack: {},
};
```

**結果**: ✅ 成功
**理由**: 
- Next.js 16ではTurbopackがデフォルト有効
- 空の `turbopack: {}` を明示することで、webpackとの競合を解消
- TypeScriptチェックの挙動が変更され、scriptsディレクトリが除外された

---

## 🎯 根本原因

### 1. **ビルド設定の不備**
- `tsconfig.json` の `include` に `**/*.ts` が含まれており、全てのTypeScriptファイルがコンパイル対象
- Next.js 16のTurbopack有効化が明示されておらず、デフォルト動作が不明確

### 2. **環境差異**
| 項目 | ローカル環境 | Vercel環境 |
|---|---|---|
| Node.js バージョン | 不明 | 最新安定版 |
| TypeScript 厳格度 | 緩い | 厳格 |
| キャッシュ | 存在しない | 存在する可能性 |

### 3. **開発ワークフローの問題**
- 開発・検証用スクリプトと本番コードが同じディレクトリ構造に混在
- スクリプトファイルの依存関係が本番コードと異なる（存在しないモジュールへの参照）

---

## 💡 今後の対策

### 即時対応（完了済み）
- ✅ `next.config.ts` に `turbopack: {}` を追加
- ✅ `tsconfig.json` で `scripts` を除外
- ✅ `.vercelignore` で `scripts/` を除外

### 中長期的な改善策

#### 1. **プロジェクト構造の見直し**
```
the-five-app/
├── src/              # 本番コード
├── scripts/          # 開発スクリプト（.gitignore に追加を検討）
├── tests/            # テストコード
└── docs/             # ドキュメント
```

**推奨**: scripts/ を .gitignore に追加し、重要なスクリプトのみ別リポジトリで管理

#### 2. **tsconfig.json の明示的な設定**
```json
{
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "next-env.d.ts"
  ],
  "exclude": [
    "node_modules",
    "scripts",
    ".next",
    "out"
  ]
}
```

#### 3. **CI/CDパイプラインでの事前検証**
- ローカルで本番ビルドを必ず実行してからプッシュ
- GitHub Actionsで `npm run build` を自動実行
- Vercelデプロイ前にビルドエラーを検出

#### 4. **Next.js設定の明示化**
```typescript
const nextConfig: NextConfig = {
  turbopack: {}, // Turbopack を明示的に有効化
  typescript: {
    // 本番ビルド時のエラーを無視しない
    ignoreBuildErrors: false,
  },
};
```

---

## 📊 学んだ教訓

### 1. **環境差異への注意**
ローカルで動作しても、Vercelの本番環境では失敗する可能性がある。特に：
- Node.jsバージョン
- TypeScript厳格度
- キャッシュの有無

### 2. **開発ツールと本番コードの分離**
開発・検証用のスクリプトは、本番ビルドに含めない設計が重要。

### 3. **Next.js 16の新機能への対応**
Turbopackがデフォルト化されたことで、従来のwebpack設定が無効化される。公式ドキュメントの確認が必須。

### 4. **段階的なトラブルシューティング**
- エラーメッセージを正確に読む
- 一つずつ仮説を立てて検証
- 複数の対策を同時に適用しない

---

## ✅ チェックリスト（今後のデプロイ前）

- [ ] ローカルで `npm run build` を実行し成功を確認
- [ ] `scripts/` ディレクトリに新しいファイルを追加していないか確認
- [ ] `tsconfig.json` の設定が適切か確認
- [ ] `.vercelignore` が最新か確認
- [ ] Vercelダッシュボードでビルドログを確認

---

**作成日時**: 2026-02-06  
**分析対象コミット**: `047608d` → `965430f`  
**分析者**: AI Assistant
