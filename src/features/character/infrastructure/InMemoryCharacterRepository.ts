import { AppError } from '@/domain/shared/AppError';
import { err, ok, Result } from '@/domain/shared/Result';
import { CharacterEventId, ItemId, SkillId } from '@/domain/values/ids';
import { Timestamp } from '@/domain/values/time';
import { CharacterData, ICharacterRepository } from '../domain/repository/ICharacterRepository';

export class InMemoryCharacterRepository implements ICharacterRepository {
    private storage: Map<string, CharacterData> = new Map();

    constructor() {
        // Seed with demo data
        const demoId = 'demo-character-1';
        this.storage.set(demoId, {
            id: demoId,
            name: 'メル＝アルヴェナ＝ルミナ',
            profile: {
                bio: '古よりアルマ=プロビデンスを眺めて来た蒼天を舞う智慧の龍。\n神たる龍であるにも関わらず、神智ではなく人智に価値を見出した。',
                specialtyElements: ['火', '水', '風', 'エーテル', '光(看破+3)'],
            },
            events: [
                // Base Stats
                { id: '1' as CharacterEventId, type: 'STAT_GROWN', timestamp: 1 as Timestamp, key: 'Grade', delta: 5, cost: 0 },
                { id: '2' as CharacterEventId, type: 'STAT_GROWN', timestamp: 1 as Timestamp, key: 'Science', delta: 6, cost: 0 },
                { id: '3' as CharacterEventId, type: 'STAT_GROWN', timestamp: 1 as Timestamp, key: 'MagicKnowledge', delta: 6, cost: 0 },
                { id: '4' as CharacterEventId, type: 'STAT_GROWN', timestamp: 1 as Timestamp, key: 'Combat', delta: 3, cost: 0 },
                { id: '5' as CharacterEventId, type: 'STAT_GROWN', timestamp: 1 as Timestamp, key: 'Magic', delta: 5, cost: 0 },
                { id: '6' as CharacterEventId, type: 'STAT_GROWN', timestamp: 1 as Timestamp, key: 'Spirit', delta: 4, cost: 0 },
                { id: '7' as CharacterEventId, type: 'STAT_GROWN', timestamp: 1 as Timestamp, key: 'Body', delta: 3, cost: 0 },

                // Skill - Active
                {
                    id: '10' as CharacterEventId,
                    type: 'SKILL_LEARNED',
                    timestamp: 2 as Timestamp,
                    skill: {
                        id: 'cooling' as SkillId,
                        name: '炉心冷却',
                        category: 'ACTIVE',
                        subType: 'ACTIVE',
                        tags: [],
                        description: 'タイミング：主行動\nCT：3\n対象：自身 射程：- 形状：-\n制限：リアクターゲージが1以上\n効果：自身のMPを精神点回復させ、リアクターゲージを1減少し、次の主行動まで被ダメージを-2点する(0未満にはならない)。',
                        variants: {
                            default: {
                                timing: '主行動',
                                chargeTime: '3',
                                target: '自身',
                                activeCheck: '', // No check
                                effect: '自身のMPを精神点回復させ、リアクターゲージを1減少し、次の主行動まで被ダメージを-2点する(0未満にはならない)。',
                                restriction: 'リアクターゲージが1以上'
                            }
                        },
                        currentVariant: 'default'
                    },
                    acquisitionMethod: 'Free'
                },

                // Item - Equipment
                {
                    id: '20' as CharacterEventId,
                    type: 'ITEM_ADDED',
                    timestamp: 3 as Timestamp,
                    item: {
                        id: 'luminart' as ItemId,
                        name: 'モデル・ルミナート',
                        category: 'EQUIPMENT',
                        slot: 'MainHand', // Assuming slot
                        description: '消費MP-2、魔術行使+1...',
                        variants: {
                            default: {
                                modifiers: { 'SpellCheck': '1' } // Formula string
                            }
                        },
                        currentVariant: 'default'
                    },
                    source: 'INITIAL'
                },
                // Equip it
                {
                    id: '21' as CharacterEventId,
                    type: 'ITEM_EQUIPPED',
                    timestamp: 4 as Timestamp,
                    itemId: 'luminart' as ItemId,
                    slot: 'MainHand'
                }
            ]
        });
    }

    async save(character: CharacterData): Promise<Result<void, AppError>> {
        // Simulate async network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        this.storage.set(character.id, character);
        console.log(`[InMemoryRepo] Saved character ${character.id}`, character);
        return ok(undefined);
    }

    async load(id: string): Promise<Result<CharacterData, AppError>> {
        await new Promise(resolve => setTimeout(resolve, 100));
        const data = this.storage.get(id);
        if (!data) {
            console.warn(`[InMemoryRepo] Character ${id} not found`);
            return err(AppError.notFound(`Character not found: ${id}`));
        }
        return ok(JSON.parse(JSON.stringify(data))); // Return copy
    }

    async listAll(): Promise<Result<CharacterData[], AppError>> {
        await new Promise(resolve => setTimeout(resolve, 100));
        return ok(Array.from(this.storage.values()).map(c => ({
            ...c,
            logs: [] // Simplify list output
        })));
    }

    async delete(id: string): Promise<Result<void, AppError>> {
        this.storage.delete(id);
        return ok(undefined);
    }
}
