import { round } from 'mathjs';
import { z } from 'zod';

// 座標（グリッド単位かもしれないし、ピクセルかもしれない）
export const CoordinateSchema = z.number().brand('Coordinate'); // 必要なら .int()

// 座標ペア（よく使うのでセットにしておく）
export const PointSchema = z.object({
    x: CoordinateSchema,
    y: CoordinateSchema,
});

// サイズ（負の値はありえない）
export const SizeSchema = z.number().min(0).brand('Size');

// 次元（幅と高さ）
export const DimensionSchema = z.object({
    width: SizeSchema,
    height: SizeSchema,
});

// Z-Index（重なり順）
export const LayerIndexSchema = z.number().int().brand('LayerIndex');

export type Coordinate = z.infer<typeof CoordinateSchema>;
export type Point = z.infer<typeof PointSchema>;
export type Size = z.infer<typeof SizeSchema>;
export type Dimension = z.infer<typeof DimensionSchema>;
export type LayerIndex = z.infer<typeof LayerIndexSchema>;


export const co = (n: number) => n as Coordinate;
export const pt = (x: number, y: number) => ({ x: co(x), y: co(y) });
export const sz = (n: number) => n < 0 ? 0 as Size : n as Size;
export const dm = (w: number, h: number) => ({ width: sz(w), height: sz(h) });
export const zi = (n: number) => round(n) as LayerIndex;
