---
name: release
description: MissLIXの変更をコミットし、mainへpushし、日付タグでGitHub Releaseを作成した後、最後にpnpm run deployでステージング環境へ反映する。変更内容やリリース概要を引数に指定する。
argument-hint: "<変更内容またはリリース概要>"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
---

# MissLIX Release

MissLIX の変更を「確認 → コミット → push → Release 作成 → ステージング反映」の順で実行する。

## 引数

変更内容またはリリース概要: `$ARGUMENTS`

## 前提

- 現在の作業ツリーに、今回リリース対象の変更だけが含まれていることを確認する
- 既存の未コミット変更や未pushコミットがある場合は、その内容を確認してから続行する
- GitHub CLI (`gh`) が利用可能で、リポジトリへの push / Release 作成権限があること
- `pnpm run deploy` はステージング環境への反映として扱う

## 実行フロー

### Step 1: 状態確認

1. `git status --short --branch` で差分とブランチ状態を確認
2. `git remote -v` と `git log --oneline -5` で push 先と直近履歴を確認
3. 必要なら `git diff -- <files...>` で今回含める変更を確認
4. リリース方法を確認する
   - `.github/workflows/`
   - `package.json`
   - 既存タグ (`git tag --sort=-creatordate | head`)

### Step 2: 検証

リリース前に最低限以下を実行する:

```bash
pnpm check
pnpm build
```

必要に応じて関連する個別テストも追加で実行する。

## Step 3: コミット

1. 今回の変更ファイルだけを `git add` する
2. 意味のあるコミットメッセージで `git commit -m "<message>"` を実行する
3. `git status --short --branch` と `git show --stat --oneline HEAD` で結果を確認する

## Step 4: リリースタグ作成

1. 既存運用に合わせて日付タグを決める
   - 例: `2026.4.23`
2. 同名タグが存在しないことを確認する
3. 注釈付きタグを作成する

```bash
git tag -a <tag> -m "<release message>"
```

## Step 5: Push と GitHub Release

1. `git push origin main`
2. `git push origin <tag>`
3. `gh release create <tag> --generate-notes --title "<tag>"`

GitHub Release の URL も控える。

## Step 6: ステージング反映

Release 作成後、最後に必ず以下を実行する:

```bash
pnpm run deploy
```

この deploy はステージング環境への反映として扱う。失敗した場合は release / push 状態と切り分けて報告する。

## Step 7: 結果報告

以下を簡潔に報告する:

- 作成したコミットID
- push 先ブランチ
- 作成したタグ名
- GitHub Release URL
- `pnpm check` / `pnpm build` / `pnpm run deploy` の結果
- 既存警告や既知の注意点

## 運用ルール

- `git add .` は避け、対象ファイルを明示する
- 既存のユーザー変更を巻き込まない
- タグ名はこのリポジトリの既存運用に合わせて日付形式を優先する
- `pnpm run deploy` は Release 作成の後に実行する
