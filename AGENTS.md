# AGENTS.md

## プロジェクト概要
TRPGのデータ及びセッション管理ツール。Notionの柔軟性と、専用ツールの計算・リアルタイム性を両立する。

## 技術スタック
- Framework: Next.js 16 (App Router)
- Language: TypeScript (Strict)
- Styling: Tailwind CSS + shadcn/ui
- State/Realtime: Liveblocks + Yjs
- Database: Supabase (PostgreSQL)
- Hosting: Vercel

## ディレクトリ・アーキテクチャ
本プロジェクトでは、機能単位での凝集度を高めるため **Vertical Slice Architecture (機能別分割)** を採用する。
また、TRPGの複雑なルールを管理するため、ドメイン層を明確に分離する。

### 1. `src/features/` (機能ごとのBC: Bounded Context)
アプリケーションの主要な実装はここに集約する。技術レイヤーではなく「機能」でディレクトリを切ること。
各ディレクトリ内には、その機能完結に必要なコンポーネント、フック、API処理を含める。

- **構成例:**
    - `src/features/character/` : キャラクター管理機能（シート表示、編集など）
    - `src/features/session/` : セッション進行機能（マップ、チャット、ダイスログ）
    - `src/features/auth/` : 認証関連

### 2. `src/domain/`, `src/features/{BC}/domain/` (純粋なドメインモデル)
**最重要領域。** TRPGのルールブックそのもの。
ここには **純粋な TypeScript クラス / ロジック / 型定義** のみを配置する。
- **禁止事項:** Reactフック、UIコンポーネント、DBクライアントへの直接依存。
- **目的:** 計算ロジックのテスト容易性と、将来的なフレームワーク移行への耐性を担保する。

### 3. `src/components/ui/` (汎用UIコンポーネント)
`shadcn/ui` によって生成された、特定のドメイン知識を持たない「積木」のような部品群。
- ここにあるコンポーネントは、アプリ全体で再利用される。
- 機能特有のコンポーネントはここに入れず、`features/*/components` に置くこと。

### 4. `src/app/` (Next.js App Router)
ルーティングとページの骨格定義のみを行う。
- ここに複雑なロジックや巨大なJSXを書かないこと。
- 原則として、`src/features/` 内のコンポーネントを呼び出すだけの「薄いラッパー」として保つ。

### 5. `src/lib/` (インフラ・設定・ユーティリティ)
特定のドメインに依存しない技術的な詳細設定。
- `supabase.ts`, `liveblocks.config.ts`, `utils.ts` (cn関数など) を配置。

## 実装ルール
- **型安全性:** `any` は禁止。Zodを使って実行時の検証も行うこと。
- **データモデル:** TRPGのルールは複雑なため、固定カラムではなく「タグ/Effect積み上げ方式」を採用する。
- **UI:** 新規作成時は必ず shadcn/ui のコンポーネントを使用すること。
