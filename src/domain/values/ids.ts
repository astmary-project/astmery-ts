import { z } from 'zod';

// アプリ全体で「IDと言えばこれ」という定義を一箇所にする
export const UUIDSchema = z.uuid();
export const UserIdSchema = UUIDSchema.brand('UserId');
export const RoomIdSchema = UUIDSchema.brand('RoomId');
export const CharacterIdSchema = UUIDSchema.brand('CharacterId');
export const ItemIdSchema = UUIDSchema.brand('ItemId');
export const SkillIdSchema = UUIDSchema.brand('SkillId');
export const CharacterEventIdSchema = UUIDSchema.brand('CharacterEventId');
export const SessionEventIdSchema = UUIDSchema.brand('SessionEventId');
export const SessionIdSchema = UUIDSchema.brand('SessionId');
export const ResourceIdSchema = UUIDSchema.brand('ResourceId');

// 型も抜いておく
export type UserId = z.infer<typeof UserIdSchema>;
export type RoomId = z.infer<typeof RoomIdSchema>;
export type CharacterId = z.infer<typeof CharacterIdSchema>;
export type ItemId = z.infer<typeof ItemIdSchema>;
export type SkillId = z.infer<typeof SkillIdSchema>;
export type CharacterEventId = z.infer<typeof CharacterEventIdSchema>;
export type SessionEventId = z.infer<typeof SessionEventIdSchema>;
export type SessionId = z.infer<typeof SessionIdSchema>;
export type ResourceId = z.infer<typeof ResourceIdSchema>;

export const createId = () => crypto.randomUUID();

// ★ヘルパー関数（キャストのショートカット）
// これがないと毎回 `id as UserId` って書くハメになります
export const userId = (id: string) => id as UserId;
export const roomId = (id: string) => id as RoomId;
export const charId = (id: string) => id as CharacterId;
export const itemId = (id: string) => id as ItemId;
export const skillId = (id: string) => id as SkillId;
export const charEventId = (id: string) => id as CharacterEventId;
export const sessionEventId = (id: string) => id as SessionEventId;
export const sessionId = (id: string) => id as SessionId;
export const resourceId = (id: string) => id as ResourceId;
