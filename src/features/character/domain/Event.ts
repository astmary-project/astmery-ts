import { z } from "zod";
import {
    CharacterEventIdSchema,
    CharacterIdSchema,
    ItemIdSchema,
    RoomIdSchema,
    SessionIdSchema,
    SkillIdSchema,
} from "../../../domain/values/ids";
import { AcquisitionTypeSchema, FormulaSchema } from "../../../domain/values/mechanics";
import { TimestampSchema, now } from "../../../domain/values/time";
import { InventoryItemSchema } from "./Item";
import { ResourceSchema } from "./Resource";
import { SkillEntitySchema } from "./Skill";

// --- 0. 共通パーツ: コンテキスト（レシート情報） ---
// プリプレイ・アフタープレイで「一括適用」された時のグルーピング用
export const EventContextSchema = z.object({
    sessionId: SessionIdSchema.optional(),
    roomId: RoomIdSchema.optional(),
    batchId: z.uuid().optional(),
    appliedAt: TimestampSchema.default(now),
});

// --- 1. 共通ヘッダー（封筒） ---
const BaseEventSchema = z.object({
    id: CharacterEventIdSchema,
    timestamp: TimestampSchema,
    characterId: CharacterIdSchema.optional(),
    description: z.string().optional(),
    context: EventContextSchema.optional(),
});

// --- 2. 個別イベント定義 ---

// ■ 経験点・成長系
const ExperienceGainedEventSchema = BaseEventSchema.extend({
    type: z.literal('EXPERIENCE_GAINED'),
    amount: z.number().int().min(0),
    reason: z.string().optional(),
});

const ExperienceSpentEventSchema = BaseEventSchema.extend({
    type: z.literal('EXPERIENCE_SPENT'),
    amount: z.number().int().min(0),
    target: z.string().optional(),
});

const StatGrownEventSchema = BaseEventSchema.extend({
    type: z.literal('STAT_GROWN'),
    key: z.string(),
    delta: z.number().int().min(0),
    cost: z.number().int().min(0).optional(),
});

// ■ ステータス操作系 (手動編集やバフ)
const StatUpdatedEventSchema = BaseEventSchema.extend({
    type: z.literal('STAT_UPDATED'),
    key: z.string(),
    value: FormulaSchema,
    isMainStat: z.boolean().optional(),
});

const ResourceDefinedEventSchema = BaseEventSchema.extend({
    type: z.literal('RESOURCE_DEFINED'),
    resource: ResourceSchema,
});

const StatLabelRegisteredEventSchema = BaseEventSchema.extend({
    type: z.literal('STAT_LABEL_REGISTERED'),
    key: z.string(),
    label: z.string(),
    isMain: z.boolean().default(false),
});

// ■ アイテム系 (Entity)
const ItemAddedEventSchema = BaseEventSchema.extend({
    type: z.literal('ITEM_ADDED'),
    item: InventoryItemSchema, // ★Full Entity (スナップショット)
    source: z.enum(['SHOP', 'CRAFT', 'DROP', 'EVENT', 'INITIAL']).default('EVENT'),
    cost: z.number().optional(),
});

const ItemUpdatedEventSchema = BaseEventSchema.extend({
    type: z.literal('ITEM_UPDATED'),
    itemId: ItemIdSchema,
    // 更新内容（差分だけ持つか、新しいEntity全体を持つか）
    // 複雑さを避けるなら「新しい状態のFull Entity」で上書きが安全
    newItemState: InventoryItemSchema,
});

const ItemRemovedEventSchema = BaseEventSchema.extend({
    type: z.literal('ITEM_REMOVED'), // 廃棄
    itemId: ItemIdSchema,
});

// 意味: "My Default Loadout" の設定
const ItemEquippedEventSchema = BaseEventSchema.extend({
    type: z.literal('ITEM_EQUIPPED'),
    itemId: ItemIdSchema,
    slot: z.string(),
});

const ItemUnequippedEventSchema = BaseEventSchema.extend({
    type: z.literal('ITEM_UNEQUIPPED'),
    itemId: ItemIdSchema,
    slot: z.string().optional(),
});

// ■ スキル系 (Entity)
const SkillLearnedEventSchema = BaseEventSchema.extend({
    type: z.literal('SKILL_LEARNED'),
    skill: SkillEntitySchema,
    acquisitionMethod: AcquisitionTypeSchema,
    cost: z.number().int().min(0).optional(),
});

const SkillUpdatedEventSchema = BaseEventSchema.extend({
    type: z.literal('SKILL_UPDATED'),
    skillId: SkillIdSchema,
    newSkill: SkillEntitySchema,
});

const SkillForgottenEventSchema = BaseEventSchema.extend({
    type: z.literal('SKILL_FORGOTTEN'),
    skillId: SkillIdSchema,
    reason: z.string().optional(),
});

// ■ ウィッシュリスト（予定）
const WishlistSkillAddedEventSchema = BaseEventSchema.extend({
    type: z.literal('WISHLIST_SKILL_ADDED'),
    skill: SkillEntitySchema,
});

const WishlistSkillRemovedEventSchema = BaseEventSchema.extend({
    type: z.literal('WISHLIST_SKILL_REMOVED'),
    skillId: SkillIdSchema,
});

// ■ システム系（論理削除）
const LogRevokedEventSchema = BaseEventSchema.extend({
    type: z.literal('LOG_REVOKED'),
    targetLogId: CharacterEventIdSchema, // 打ち消したい過去のログID
    reason: z.string().optional(),
});

// --- 3. 統合: CharacterEvent ---
export const CharacterEventSchema = z.discriminatedUnion('type', [
    ExperienceGainedEventSchema,
    ExperienceSpentEventSchema,

    StatGrownEventSchema,
    StatUpdatedEventSchema,
    ResourceDefinedEventSchema,
    StatLabelRegisteredEventSchema,

    ItemAddedEventSchema,
    ItemUpdatedEventSchema,
    ItemRemovedEventSchema,
    ItemEquippedEventSchema,
    ItemUnequippedEventSchema,

    SkillLearnedEventSchema,
    SkillUpdatedEventSchema,
    SkillForgottenEventSchema,

    WishlistSkillAddedEventSchema,
    WishlistSkillRemovedEventSchema,

    LogRevokedEventSchema,
]);

// 型のエクスポート
export type CharacterEvent = z.infer<typeof CharacterEventSchema>;