import { z } from 'zod';

// 1. 純粋なドメイン用の型（数値）
export const TimestampSchema = z.number().int().min(0).brand('Timestamp');
export const DurationMsSchema = z.number().int().min(0).brand('DurationMs');

// 2. ★DB用の変換スキーマ（ここが重要！）
// 入力が "2023-..."(文字列) でも Date型 でも 数値 でも、
// 強制的に Timestamp (数値) に変換して検証を通す
export const CoerceTimestampSchema = z.union([z.string(), z.date(), z.number()])
    .transform((val) => {
        if (typeof val === 'number') return val;
        return new Date(val).getTime(); // 文字列やDateを数値(ミリ秒)にする
    })
    .pipe(TimestampSchema); // 最後にTimestamp型のバリデーションを通す

// 型定義
export type Timestamp = z.infer<typeof TimestampSchema>;
export type DurationMs = z.infer<typeof DurationMsSchema>;

// ヘルパー関数
// 現在時刻をTimestampとして取得
export const now = () => Date.now() as Timestamp;

// ミリ秒をDuration型にする（マイナスガード付き）
export const ms = (n: number) => Math.max(0, n) as DurationMs;

// 手動でTimestampを作りたい時用
export const ts = (n: number) => Math.max(0, n) as Timestamp;