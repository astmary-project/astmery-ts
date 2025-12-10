import { z } from "zod";
import { ItemIdSchema } from "../../../domain/values/ids";
import { ActiveEffectSchema, PassiveEffectSchema, PassiveSkillSchema } from "./Skill";

// --- 1. 消耗品・素材 ---
export const ConsumableItemSchema = z.object({
    category: z.literal('CONSUMABLE'),
    id: ItemIdSchema, // スタックするならIDは種類ごと、しないならユニーク
    name: z.string(),
    quantity: z.number().int().min(0),
    effect: ActiveEffectSchema.optional(), // 使うと発動する効果
    description: z.string().default(''),
});

// --- 2. 装備品 (Entity) ---
export const EquipmentItemSchema = z.object({
    category: z.literal('EQUIPMENT'),
    id: ItemIdSchema, // ユニークID
    name: z.string(),

    // 装備スロット（MainHand, Head, Body...）
    slot: z.string(),

    // ★ここ！装備の中に「パッシブ効果のバリアント」を持たせる
    // これにより「剣モード」と「銃モード」で補正値を変えられる
    variants: z.record(z.string(), PassiveEffectSchema),
    currentVariant: z.string().default('default'),

    // さらに「装備固有のパッシブスキル」も持てる
    passiveSkills: z.array(PassiveSkillSchema).optional(),
    description: z.string().default(''),
});

// --- 統合アイテム型 ---
export const InventoryItemSchema = z.discriminatedUnion('category', [
    ConsumableItemSchema,
    EquipmentItemSchema
]);

export type ConsumableItem = z.infer<typeof ConsumableItemSchema>;
export type EquipmentItem = z.infer<typeof EquipmentItemSchema>;
// export type Item = z.infer<typeof InventoryItemSchema>; // Generic name 'Item' might collide
export type InventoryItem = z.infer<typeof InventoryItemSchema>;