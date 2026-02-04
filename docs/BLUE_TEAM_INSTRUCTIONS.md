# Blue Team 指示書（実装・防御側）

> **あなたの役割**: Red Teamの批判を受け、仕様書を改善し、最終的に「完璧な仕様」を確立してください。

---

## 🎯 ミッション
Red Teamが作成した `docs/RED_TEAM_CRITIQUE_V2.md` を読み、以下を行ってください：

### 1. 批判の分類
各批判を以下に分類：
- **Accept（受け入れ）**: 正当な指摘。仕様を修正する。
- **Reject（却下）**: 誤解または不適切。理由を明記し却下する。
- **Defer（保留）**: 範囲外またはフェーズ2で対応。Issue化する。

### 2. 仕様の改訂
Acceptした批判に基づき、`SEARCH_SPEC_V2.md` を以下の形式で更新：
- 曖昧な質問を具体的な「仕様文」に変換
- エッジケースを明示的に定義
- テスト可能な基準を追加

### 3. 反論文書の作成
`docs/BLUE_TEAM_RESPONSE_V2.md` を作成：
```markdown
# Blue Team Response to Red Team Critique

## Accepted Changes
| Critique ID | Change Made | Rationale |
|---|---|---|
| C1 | Q1を「仕様文」に変換 | 曖昧性を排除 |

## Rejected Critiques
| Critique ID | Reason for Rejection |
|---|---|
| C5 | パフォーマンス懸念は現実的でない（N<1000） |

## Deferred Items
...
```

---

## 📝 改訂時のルール
1. **質問形式を禁止**: 「〜すべきですか？」→「〜する」に変換
2. **数値を明示**: 「適切な閾値」→「閾値40点」
3. **エッジケースを列挙**: 「通常の入力」→「1-100文字、絵文字なし」

---

## ✅ 完了条件
- Red Teamの全批判に対し、Accept/Reject/Deferのいずれかを明記
- `SEARCH_SPEC_V2.md` から「質問」が完全に消える
- 次のRed Team攻撃に耐えられる自信がある
