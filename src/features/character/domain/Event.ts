import { z } from "zod";
import {
    BatchIdSchema,
    CharacterEventIdSchema,
    CharacterIdSchema,
    ItemIdSchema,
    RoomIdSchema,
    SessionIdSchema,
    SkillIdSchema,
} from "../../../domain/values/ids";
import { AcquisitionTypeSchema, FormulaSchema } from "../../../domain/values/mechanics";
import { TimestampSchema } from "../../../domain/values/time";
import { InventoryItemSchema } from "./Item";
import { ResourceSchema } from "./Resource";
import { SkillEntitySchema } from "./Skill";

// --- 0. セッションからマージイベントに持たせるコンテキスト ---
export const SessionContextSchema = z.object({
    sessionId: SessionIdSchema.optional(),
    roomId: RoomIdSchema.optional(),
});

// --- 1. 共通ヘッダー（封筒） ---
const BaseEventSchema = z.object({
    id: CharacterEventIdSchema,
    timestamp: TimestampSchema,
    characterId: CharacterIdSchema,
    description: z.string().optional(),
    batchId: BatchIdSchema,
});

// --- 2. 個別イベント定義 ---

// ■ 経験点・成長系
const ExperienceGainedEventSchema = BaseEventSchema.extend({
    type: z.literal('EXPERIENCE_GAINED'),
    amount: z.number().int().min(0),
    reason: z.string().optional(),
    sessionContext: SessionContextSchema,
});


const ExperienceSpentEventSchema = BaseEventSchema.extend({
    type: z.literal('EXPERIENCE_SPENT'),
    amount: z.number().int().min(0),
    category: z.enum(['GRADE', 'ABILITY', 'SKILL', 'OTHER']),
});

const GradeRaisedEventSchema = BaseEventSchema.extend({
    type: z.literal('GRADE_RAISED'),
    before: z.number().int().min(0),
    after: z.number().int().min(0),
});

const AbilityRaisedEventSchema = BaseEventSchema.extend({
    type: z.literal('ABILITY_RAISED'),
    key: z.string(),
    before: z.number().int().min(0),
    after: z.number().int().min(0),
});

// ■ ステータス操作系 (手動編集やバフ)
const StatUpdatedEventSchema = BaseEventSchema.extend({
    type: z.literal('STAT_UPDATED'),
    key: z.string(),
    value: FormulaSchema,
    isMain: z.boolean().optional(),
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

// ■ 金銭操作計（金銭の増減）
const MoneyGainedEventSchema = BaseEventSchema.extend({
    type: z.literal('MONEY_GAINED'),
    amount: z.number().int().min(0),
    reason: z.string().optional(),
});

const MoneySpentEventSchema = BaseEventSchema.extend({
    type: z.literal('MONEY_SPENT'),
    amount: z.number().int().min(0),
    target: z.string().optional(),
});

// ■ アイテム系 (Entity)
const ItemAddedEventSchema = BaseEventSchema.extend({
    type: z.literal('ITEM_ADDED'),
    item: InventoryItemSchema, // ★Full Entity (スナップショット)
    source: z.enum(['SHOP', 'CRAFT', 'DROP', 'EVENT', 'INITIAL']).default('EVENT'),
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
});

const SkillEvolvedEventSchema = BaseEventSchema.extend({
    type: z.literal('SKILL_EVOLVED'),
    skillId: SkillIdSchema,
    newSkill: SkillEntitySchema,
});

const SkillRevisedEventSchema = BaseEventSchema.extend({
    type: z.literal('SKILL_Revised'),
    skillId: SkillIdSchema,
    newSkill: SkillEntitySchema,
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

    GradeRaisedEventSchema,
    AbilityRaisedEventSchema,
    StatUpdatedEventSchema,
    ResourceDefinedEventSchema,
    StatLabelRegisteredEventSchema,

    ItemAddedEventSchema,
    ItemUpdatedEventSchema,
    ItemRemovedEventSchema,
    ItemEquippedEventSchema,
    ItemUnequippedEventSchema,

    SkillLearnedEventSchema,
    SkillEvolvedEventSchema,
    SkillRevisedEventSchema,

    WishlistSkillAddedEventSchema,
    WishlistSkillRemovedEventSchema,

    LogRevokedEventSchema,
]);

// 型のエクスポート
export type CharacterEvent = z.infer<typeof CharacterEventSchema>;