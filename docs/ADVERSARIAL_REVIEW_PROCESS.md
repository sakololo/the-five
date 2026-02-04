# 敵対的レビュー反復プロセス

## 概要
Red Team（監査）とBlue Team（実装）を交互に実行し、検索仕様を完璧にするプロセスです。

---

## 📋 実行手順

### Round 1: Red Team Attack
**Location**: `the-five-spec-audit` worktree
**Instructions**: `docs/RED_TEAM_INSTRUCTIONS.md`

1. 新しいClaude セッションを開始
2. `the-five-spec-audit` ディレクトリを開く
3. **Prompt**:
   ```
   `docs/RED_TEAM_INSTRUCTIONS.md` を読んで、厳格なRed Teamとして
   `docs/SEARCH_SPEC_V2.md` を徹底的に批判してください。
   ```
4. アウトプット: `docs/RED_TEAM_CRITIQUE_V2.md`

---

### Round 2: Blue Team Defense
**Location**: `the-five-app` worktree（メイン）
**Instructions**: `docs/BLUE_TEAM_INSTRUCTIONS.md`

1. このセッション（または新しいセッション）で実行
2. **Prompt**:
   ```
   Red Teamの批判（`../the-five-spec-audit/docs/RED_TEAM_CRITIQUE_V2.md`）を読み、
   `docs/BLUE_TEAM_INSTRUCTIONS.md` に従って仕様を改訂してください。
   ```
3. アウトプット: 
   - 改訂された `SEARCH_SPEC_V2.md`
   - `docs/BLUE_TEAM_RESPONSE_V2.md`

---

### Round 3: Red Team Counter-Attack
**Location**: `the-five-spec-audit` worktree
**Merge Changes**: Blue Teamの変更を取り込む

1. `the-five-spec-audit` で以下を実行：
   ```bash
   git fetch origin main:main
   git merge main
   ```
2. **Prompt**:
   ```
   Blue Teamの改訂版を読み、さらに欠陥を探してください。
   前回の批判が適切に対応されているかも検証してください。
   ```
3. アウトプット: `docs/RED_TEAM_CRITIQUE_V3.md`

---

### 終了条件
以下のいずれかが満たされたら終了：
1. **Red Team降伏**: 「これ以上の批判点が見つからない」
2. **3ラウンド完了**: 十分な品質が確保された
3. **両チーム合意**: Blue TeamとRed Teamが同時セッションで合意

---

## 🔄 反復の可視化
```
Round 1: [Red: 10 Flaws] → [Blue: 8 Accept, 2 Reject]
Round 2: [Red: 5 Flaws] → [Blue: 5 Accept]
Round 3: [Red: 0 Flaws] → 🎉 Spec Approved
```

---

## 📁 ファイル構造
```
the-five-app/           # Blue Team (Main)
├── docs/
│   ├── SEARCH_SPEC_V2.md          # 常に最新版
│   ├── BLUE_TEAM_INSTRUCTIONS.md
│   └── BLUE_TEAM_RESPONSE_V2.md

the-five-spec-audit/    # Red Team (Audit)
├── docs/
│   ├── SEARCH_SPEC_V2.md          # レビュー対象（マージで更新）
│   ├── RED_TEAM_INSTRUCTIONS.md
│   ├── RED_TEAM_CRITIQUE_V2.md
│   └── RED_TEAM_CRITIQUE_V3.md
```
