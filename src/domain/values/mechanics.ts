import { z } from 'zod';

// 計算式スキーマ
// 数値が来たら文字列に変換し、文字列ならそのまま通す
export const FormulaSchema = z.union([
    z.string(),
    z.number()
]).transform((val) => String(val)); // 強制的に string化
export const AcquisitionTypeSchema = z.enum(['Free', 'Standard', 'Grade']).default('Free');

export type Formula = z.infer<typeof FormulaSchema>;
export type AcquisitionType = z.infer<typeof AcquisitionTypeSchema>;