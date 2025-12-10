import { EquipmentItemSchema, InventoryItemSchema } from '@/features/character/domain/Item';
import { ResourceSchema } from '@/features/character/domain/Resource';
import { SkillEntitySchema } from '@/features/character/domain/Skill'; // さっき作ったEntity定義
import { z } from 'zod';

// --- サブパーツ ---
const ExpStateSchema = z.object({
    total: z.number().min(0),
    used: z.number().min(0),
    free: z.number(), // マイナス許容？（計算ミスで一時的になるかもなので甘めに）
});

// --- 本丸：CharacterState ---
export const CharacterStateSchema = z.object({
    // 基本ステータス
    stats: z.record(z.string(), z.number()),

    // タグ（Setはやめて配列にする。順序も保証できるのでUI的に有利）
    tags: z.array(z.string()),

    // 装備・スキル（Entityの配列を持つ）
    inventory: z.array(InventoryItemSchema),
    equipmentSlots: z.array(EquipmentItemSchema),
    skills: z.array(SkillEntitySchema),
    skillWishlist: z.array(SkillEntitySchema),

    // 経験点
    exp: ExpStateSchema,

    // --- 計算済みプロパティ (Projectionの結果) ---
    // これらも全てスナップショットの一部として保存してOK
    derivedStats: z.record(z.string(), z.number()),
    customLabels: z.record(z.string(), z.string()),
    customMainStats: z.array(z.string()),

    // リソース定義と現在値
    resources: z.array(ResourceSchema),
    resourceValues: z.record(z.string(), z.number()), // Key: resourceId, Value: current
});

export type CharacterState = z.infer<typeof CharacterStateSchema>;