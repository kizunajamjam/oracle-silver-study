# Silver DBA Study

Oracle Master Silver DBA（Oracle Database Administration I）の学習アプリ。`sa-study` と同じ考え方（2回連続正解で習得、習得後も日数をおいて復習、選択肢の並びを毎回入れ替え）で作っている。

## 問題について（重要）

- Oracle の実際の試験問題・流出した問題集（ダンプ）は使わない。問題と解説は**オリジナルで、AI作成・未検証**。
- 解説の根拠は Oracle 公式ドキュメント（各問の `ref`）。バージョン差などで誤りが混ざる可能性があるので、本番前に公式ドキュメントか実機（Oracle Database Free など）で確認する。
- 章立ては出題範囲（1Z0-082）に沿った目安。最新の出題範囲・出題数・合格点は Oracle の公式ページで確認する。`src/lib/data.ts` の `MOCK` は仮の値。

## 使い方

```bash
npm install
npm run dev     # data/ を検証してから http://localhost:3000 を起動
npm run data    # 問題データの検証だけ行う
```

進捗とお気に入りは、まずその端末のブラウザ（localStorage）に保存される。Supabase を設定すると、ログインして端末間で同期できる（下記）。設定しなければ、端末内だけで動く。

## 端末間の同期（Supabase・任意）

1. Supabase のプロジェクトを用意する（`sa-study` と同じプロジェクトでもよい。テーブル名は `dba_` で始まるので衝突しない。同じプロジェクトなら、ログインのアカウントも共通で使える）。
2. SQL Editor で `supabase/migrations/0001_progress.sql` を実行する（本人の行だけ読み書きできる RLS つき）。
3. Authentication → Users でユーザーを作る（新規登録の画面はないので、ここで作る。ほかの人に使わせないなら Sign Up を無効にしておく）。
4. `.env.local` に設定して `npm run dev` を再起動する。Vercel に置く場合は、同じ2つを Environment Variables に設定する（`NEXT_PUBLIC_` の値はビルド時に埋め込まれるので、設定後に再デプロイ）。

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（anon public キー）
```

- 解答は端末に先に保存し、ログイン中は自動でクラウドへ送る。送れなかった分は「未同期 n 件」と出て、次の同期で再送する。解答は id で和集合にするので、何度同期しても重複しない。
- お気に入りは、そのアカウントで初めて同期するときだけ端末側とクラウド側を足し合わせ、以後はクラウド側が正になる。
- ログアウトしても、端末の記録は消えない。

## 問題の追加

`data/questions/{章}.json` に追加する。章は `data/chapters.json`。

```json
{
  "id": "arch-017", "chapter": "arch",
  "stem": "問題文", "select": 1,
  "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
  "answer": [0],
  "why": ["選択肢1の解説", "選択肢2の解説", "選択肢3の解説", "選択肢4の解説"],
  "tip": "紛らわしい用語の見分け方",
  "ref": "Oracle Database Concepts（章名）"
}
```

`scripts/build-data.mjs` が構造を検証する（正解数と `select` の一致、`why` が全選択肢にあるか、選択肢を記号で指していないか、など）。エラーがあるとビルドが止まる。選択肢は表示のたびに並びが入れ替わるため、解説で「Aは〜」のように記号で指してはいけない。

## 現在の進み具合

| 章 | 問題数 |
|---|---|
| Oracle Databaseのアーキテクチャ | 16 |
| データベース・インスタンスの管理 | 17 |
| ほか6章（Oracle Net・ユーザーと権限・表領域・スキーマ・DML・SQL） | 準備中 |
