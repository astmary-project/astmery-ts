import { z } from 'zod';
import { SkillIdSchema } from "../../../domain/values/ids";
import { FormulaSchema } from "../../../domain/values/mechanics";
import { ResourceSchema } from "./Resource";

// --- 1. 共通パーツ定義 ---


// 習得時に永続的に増えるステータス（「HP+10」のパッシブなどではなく、基礎ステータス自体が生えるイメージ）
const GrantedStatSchema = z.object({
    key: z.string(),
    label: z.string(),
    value: FormulaSchema,
    isMain: z.boolean().default(false),
});


// 共通ヘッダー
const BaseSkillSchema = z.object({
    id: SkillIdSchema,
    name: z.string(),
    description: z.string(),

    // 習得しただけで生えるリソースやステータス（モードに関係なく常時）
    grantedStats: z.array(GrantedStatSchema).optional(),
    grantedResources: z.array(ResourceSchema).optional(),

    // ユーザー定義のタグ（"火属性"とか）
    tags: z.array(z.string()).default([]),

    // 習得タイプ (Free, Standard, Grade etc) - Optional in storage, required in Event usually
    acquisitionMethod: z.enum(['Standard', 'Free', 'Grade', 'Other']).optional(),
});

// B. アクティブ効果（アクション・判定）
// 旧定義の timing, range, cost, effect などはここ！
export const ActiveEffectSchema = z.object({
    timing: z.string().optional(),    // "メジャーアクション" etc
    chargeTime: z.string().optional(),  // "1ターン"
    target: z.string().optional(),    // "単体"
    range: z.string().optional(),     // "20m"
    cost: z.string().optional(),      // "MP3" (将来的には { resource: 'MP', value: 3 } にしたいが一旦string)

    // 判定・ロール
    rollFormula: z.string().optional(), // 旧 rollModifier
    activeCheck: z.string().optional(), // 能動判定テキスト

    // 効果詳細
    effect: z.string().optional(),      // 効果テキスト
    duration: z.string().optional(),    // "瞬間"
    spellGrade: z.string().optional(),  // 魔術グレード
    shape: z.string().optional(),       // 射撃、魔法 etc

    // チャットパレット用文字列（クリックでチャットに送るやつ）
    chatPalette: z.string().optional(),

    restriction: z.string().optional(),
});


// アクティブスキル（レベルやランクで効果が変わるかも？）
export const ActiveSkillSchema = BaseSkillSchema.extend({
    category: z.literal('ACTIVE'),
    subType: z.string().default('ACTIVE'), // 旧 type にあった Spell などを吸収

    variants: z.record(z.string(), ActiveEffectSchema),
    currentVariant: z.string().default('default'),
});


// A. パッシブ効果（計算機・補正）
// 旧定義の statModifiers, formulaOverrides, passiveCheck などはここ！
export const PassiveEffectSchema = z.object({

    // 計算式補正 { "Attack": "Strength / 2" }
    modifiers: z.record(z.string(), FormulaSchema).optional(),

    // 式の上書き { "Defense": "Body + 5" }
    overrides: z.record(z.string(), FormulaSchema).optional(),

    // 受動判定のテキスト
    passiveCheck: z.string().optional(),

    // 「装備固有のアクティブスキル」も持てる（武器の必殺技など）
    activeSkills: z.array(ActiveSkillSchema).optional(),

    // 制約テキスト（"HP50%以下でのみ発動" など）
    restriction: z.string().optional(),
});

// パッシブスキル（モードチェンジ可能）
export const PassiveSkillSchema = BaseSkillSchema.extend({
    category: z.literal('PASSIVE'), // type -> category に変更推奨（識別しやすくするため）

    // ★ここがミソ：モードごとの効果
    variants: z.record(z.string(), PassiveEffectSchema),
    currentVariant: z.string().default('default'),
});


// --- ★完成！スキル統合型 ---
export const SkillEntitySchema = z.discriminatedUnion('category', [
    PassiveSkillSchema,
    ActiveSkillSchema
]);

export type SkillEntity = z.infer<typeof SkillEntitySchema>;
export type ActiveSkillEntity = z.infer<typeof ActiveSkillSchema>;
export type PassiveSkillEntity = z.infer<typeof PassiveSkillSchema>;