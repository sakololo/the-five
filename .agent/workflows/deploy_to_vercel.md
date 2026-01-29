---
description: Vercelへのデプロイ（本番公開）手順
---

このワークフローは、アプリケーションをVercelにデプロイして本番公開するための手順です。

## 手順 1: GitHubへプッシュ（手動）

すでにリモートリポジトリ（`sakololo/the-five`）が設定されているようです。
以下のコマンドを実行して、最新のコードをGitHubに反映させてください。

```bash
git push origin main
```

もしプッシュ時にエラー（rejectedなど）が出る場合は、強制プッシュ（`git push -f origin main`）が必要な場合がありますが、既存のコードを上書きする点に注意してください。

## 手順 3: Vercelでのデプロイ（手動）

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセスします。
2. **"Add New..."** -> **"Project"** をクリックします。
3. 手順1で作成したGitHubリポジトリを選択し、**"Import"** をクリックします。
4. **"Configure Project"** 画面で、**"Environment Variables"**（環境変数）を展開し、以下を設定します。

| Key | Value |
| --- | --- |
| `RAKUTEN_APP_ID` | `1056239999150490406` |
| `GEMINI_API_KEY` | `AIzaSyBvU5myP_I-obM3x4VLk8fBm6znW1aa7c4` |

5. **"Deploy"** をクリックします。
6. デプロイが完了するのを待ちます（通常1〜2分）。
7. 表示されたURLにアクセスして動作を確認します。特に、OGP画像がTwitterなどで正しく表示されるか確認してください。

## トラブルシューティング

- **OGP画像が表示されない**:
  - `https://cards-dev.twitter.com/validator` (Twitter Card Validator) でURLを入力して確認してください。
  - 日本語フォントが正しく読み込まれているか、APIログを確認してください。

- **検索が動かない**:
  - `RAKUTEN_APP_ID` が正しく設定されているか環境変数を確認してください。
