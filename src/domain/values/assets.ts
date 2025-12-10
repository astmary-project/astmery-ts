import { z } from 'zod';

// URL系（v4記法）
// ただのstringではなく「URL形式」であることを保証
export const ImageUrlSchema = z.url().brand('ImageUrl');
export const AudioUrlSchema = z.url().brand('AudioUrl');

// カラーコード（#RRGGBB 形式）
// チャットの色やトークンの枠色で絶対使う
export const ColorCodeSchema = z.string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color code")
    .brand('ColorCode');

// 透明度や音量（0.0 〜 1.0）
export const VolumeSchema = z.number().min(0).max(1).default(1.0).brand('Volume');
export const OpacitySchema = z.number().min(0).max(1).default(1.0).brand('Opacity');


export type ImageUrl = z.infer<typeof ImageUrlSchema>;
export type AudioUrl = z.infer<typeof AudioUrlSchema>;
export type ColorCode = z.infer<typeof ColorCodeSchema>;
export type Volume = z.infer<typeof VolumeSchema>;
export type Opacity = z.infer<typeof OpacitySchema>;

// 1. 数値系（クランプ処理を入れるのが最強）
// どんな数字が来ても、強制的に 0.0 ~ 1.0 の範囲に収めてから型をつける
export const vol = (n: number) => Math.max(0, Math.min(1, n)) as Volume;
export const op = (n: number) => Math.max(0, Math.min(1, n)) as Opacity;

// 2. 色コード（バリデーション or デフォルト値）
// 不正な文字列が来たら、黒（#000000）や白に倒す安全策を入れるとUIが壊れません
const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
export const hex = (s: string) => {
    // 形式が合っていれば採用、ダメなら黒にする
    return HEX_REGEX.test(s) ? (s as ColorCode) : ('#000000' as ColorCode);
};

// 3. URL系（単純なキャスト）
// URLの厳密なチェックは重いので、ここは「型付けのショートカット」として用意
export const img = (s: string) => s as ImageUrl;
export const audio = (s: string) => s as AudioUrl;