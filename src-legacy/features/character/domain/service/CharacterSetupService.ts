import { charEventId, createId, itemId, resourceId, skillId } from '@/domain/values/ids';
import { now } from '@/domain/values/time';
import type { CharacterEvent, Item, Resource, Skill } from '@/features/character';
import { ABILITY_STATS, JAPANESE_TO_ENGLISH_STATS } from '@/features/character/domain/constants';
import { EquipmentItem, InventoryItem } from '@/features/character/domain/Item';
import { EffectParser } from '@/features/character/domain/logic/EffectParser';
import { ActiveSkillEntity, PassiveSkillEntity } from '@/features/character/domain/Skill';

export interface SpecialtyElementInput {
    name: string;
    benefit: string;
}

export interface SkillInput {
    id: string;
    name: string;
    type: string;
    acquisitionType?: 'Free' | 'Standard' | 'Grade';
    summary: string;
    effect: string;
    restriction: string;
    timing: string;
    cooldown: string;
    target: string;
    range: string;
    cost: string;
    rollModifier: string;
    magicGrade: string;
    shape: string;
    duration: string;
    activeCheck: string;
    passiveCheck: string;
    chatPalette: string;
}

export interface ItemInput {
    id: string;
    name: string;
    type: 'Weapon' | 'Armor' | 'Accessory' | 'Other';
    summary: string;
    effect: string;
}

export interface CustomStatInput {
    key: string;
    label: string;
    value: string;
    isMain: boolean;
}

export interface ResourceInput {
    id: string;
    name: string;
    max: string;
    initial: string;
}

export interface SetupServiceInput {
    currentStats: Record<string, number>;
    currentSkills: Skill[];
    currentEquipment: Item[];
    currentCustomLabels: Record<string, string>;
    currentCustomMainStats: string[];
    currentResources: Resource[];
    currentSpecialtyElements: SpecialtyElementInput[];

    newStats: Record<string, number>;
    newSpecialtyElements: SpecialtyElementInput[];
    newSkills: SkillInput[];
    newEquipment: ItemInput[];
    newCustomStats: CustomStatInput[];
    newResources: ResourceInput[];
}

export class CharacterSetupService {
    static calculateDiffEvents(input: SetupServiceInput): CharacterEvent[] {
        const logsToAdd: CharacterEvent[] = [];
        const {
            currentStats, currentSkills, currentEquipment, currentCustomLabels, currentCustomMainStats, currentResources,
            newStats, newSpecialtyElements, newSkills, newEquipment, newCustomStats, newResources
        } = input;

        // 1. Stat Growth
        const editableStats = ['Grade', ...ABILITY_STATS];
        for (const key of editableStats) {
            const currentVal = currentStats[key] || 0;
            const targetVal = newStats[key] || 0;
            const diff = targetVal - currentVal;

            if (diff !== 0) {
                logsToAdd.push({
                    id: charEventId(createId()),
                    timestamp: now(),
                    type: 'STAT_GROWN',
                    key,
                    delta: diff,
                    cost: 0,
                    description: 'セットアップウィザードによる調整',
                });
            }
        }

        // 2. Specialty Elements
        const currentElementSet = new Set(
            input.currentSpecialtyElements.map(e => `${e.name}:${e.benefit}`)
        );

        for (const el of newSpecialtyElements) {
            if (!el.benefit) continue;

            if (currentElementSet.has(`${el.name}:${el.benefit}`)) {
                continue;
            }

            const match = el.benefit.match(/^(.+?)\s*([+\-])\s*(\d+)$/);
            if (match) {
                const rawStat = match[1].trim();
                const op = match[2];
                const val = parseInt(match[3]);
                const statKey = JAPANESE_TO_ENGLISH_STATS[rawStat] || rawStat;
                const change = op === '-' ? -val : val;

                if (statKey) {
                    logsToAdd.push({
                        id: charEventId(createId()),
                        timestamp: now(),
                        type: 'STAT_GROWN',
                        key: statKey,
                        delta: change,
                        cost: 0,
                        description: `得意属性: ${el.name} の恩恵`,
                    });
                }
            }
        }

        const isStrDiff = (a?: string, b?: string) => (a || '') !== (b || '');

        // 3. Skills Diff
        const currentSkillIds = new Set(newSkills.map(s => s.id));

        // Removed Skills
        for (const s of currentSkills) {
            if (!currentSkillIds.has(s.id)) {
                logsToAdd.push({
                    id: charEventId(createId()),
                    timestamp: now(),
                    type: 'SKILL_FORGOTTEN',
                    skillId: skillId(s.id),
                    description: `Forgot skill: ${s.name}`,
                });
            }
        }

        // Added or Modified Skills
        for (const s of newSkills) {
            const { statModifiers, dynamicModifiers, grantedStats, grantedResources } = EffectParser.parse(s.effect);

            const isPassive = s.type?.toLowerCase().includes('passive') || false;

            // Map granted stats/resources to string values
            const mappedGrantedStats = grantedStats.map(g => ({ ...g, value: String(g.value), isMain: g.isMain || false }));
            const mappedGrantedResources = grantedResources.map(g => ({ ...g, max: String(g.max), initial: String(g.initial) }));

            // Construct Skill Entity
            const baseSkill = {
                id: skillId(s.id),
                name: s.name,
                acquisitionMethod: s.acquisitionType || 'Free', // Default to Free
                description: s.summary,
                grantedStats: mappedGrantedStats.length > 0 ? mappedGrantedStats : undefined,
                grantedResources: mappedGrantedResources.length > 0 ? mappedGrantedResources : undefined,
                tags: [],
            };

            let skillObj: Skill;

            if (isPassive) {
                const passive: PassiveSkillEntity = {
                    ...baseSkill,
                    category: 'PASSIVE',
                    variants: {
                        default: {
                            modifiers: Object.entries(statModifiers).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}),
                            overrides: Object.keys(dynamicModifiers).length > 0 ? dynamicModifiers : undefined,
                            passiveCheck: s.passiveCheck || undefined,
                            restriction: s.restriction || undefined
                        }
                    },
                    currentVariant: 'default'
                };
                skillObj = passive;
            } else {
                const active: ActiveSkillEntity = {
                    ...baseSkill,
                    category: 'ACTIVE',
                    subType: 'ACTIVE',
                    variants: {
                        default: {
                            effect: s.effect,
                            timing: s.timing || undefined,
                            chargeTime: s.cooldown || undefined,
                            target: s.target || undefined,
                            range: s.range || undefined,
                            cost: s.cost || undefined,
                            rollFormula: s.rollModifier || undefined,
                            spellGrade: s.magicGrade || undefined,
                            shape: s.shape || undefined,
                            duration: s.duration || undefined,
                            activeCheck: s.activeCheck || undefined,
                            chatPalette: s.chatPalette || undefined,
                            restriction: s.restriction || undefined
                        }
                    },
                    currentVariant: 'default'
                };
                skillObj = active;
            }


            const initial = currentSkills.find(is => is.id === s.id);
            if (!initial) {
                // New
                logsToAdd.push({
                    id: charEventId(createId()),
                    timestamp: now(),
                    type: 'SKILL_LEARNED',
                    skill: skillObj,
                    acquisitionMethod: s.acquisitionType || 'Free',
                    cost: 0,
                    description: `Learned skill: ${s.name}`,
                });
            } else {
                // Modified?
                // Logic: Compare fields. If different, remove old and add new.
                const initialVariant = (initial as ActiveSkillEntity).variants?.default;
                // If it was passsive, it might not have effect.
                const initialDesc = initialVariant && 'effect' in initialVariant ? initialVariant.effect : undefined;

                const isEffectChanged = isStrDiff(initialDesc, s.effect);
                const isDiff = isStrDiff(initial.name, s.name) || isEffectChanged;

                if (isDiff) {
                    logsToAdd.push({
                        id: charEventId(createId()),
                        timestamp: now(),
                        type: 'SKILL_FORGOTTEN',
                        skillId: skillId(initial.id),
                        description: `Updating skill: ${initial.name}`,
                    });
                    logsToAdd.push({
                        id: charEventId(createId()),
                        timestamp: now(),
                        type: 'SKILL_LEARNED',
                        skill: skillObj,
                        acquisitionMethod: s.acquisitionType || 'Free',
                        cost: 0,
                        description: `Updated skill: ${s.name}`,
                    });
                }
            }
        }

        // 4. Equipment Diff
        const currentItemIds = new Set(newEquipment.map(i => i.id));

        // Removed Items
        for (const i of currentEquipment) {
            if (!currentItemIds.has(i.id)) {
                logsToAdd.push({
                    id: charEventId(createId()),
                    timestamp: now(),
                    type: 'ITEM_REMOVED',
                    itemId: itemId(i.id),
                    description: `Removed item: ${i.name}`,
                });
            }
        }

        // Added or Modified Items
        for (const i of newEquipment) {
            const { statModifiers, dynamicModifiers, grantedStats, grantedResources } = EffectParser.parse(i.effect);

            const mappedGrantedStats = grantedStats.map(g => ({ ...g, value: String(g.value), isMain: g.isMain || false }));
            const mappedGrantedResources = grantedResources.map(g => ({ ...g, max: String(g.max), initial: String(g.initial) }));

            const itemObj: EquipmentItem = {
                category: 'EQUIPMENT',
                id: itemId(i.id),
                name: i.name,
                slot: i.type, // Mapping type to slot roughly
                description: i.summary,
                variants: {
                    default: {
                        modifiers: Object.entries(statModifiers).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}),
                        overrides: Object.keys(dynamicModifiers).length > 0 ? dynamicModifiers : undefined,
                    }
                },
                currentVariant: 'default',
                // grantedStats/Resources on Entity?
                // EquipmentItemSchema: `passiveSkills` array.
                // DOES IT HAVE `grantedStats`?
                // Checking Item.ts... `EquipmentItemSchema` has `variants` and `passiveSkills`.
                // It does NOT have `grantedStats`.
                // BaseSkillSchema has it, but EquipmentItemSchema does NOT extend BaseSkillSchema.
                // It's standalone.
                // So Equipment CANNOT grant stats directly on top level?
                // Wait, logic says "Items grant stats".
                // In my new model, Items grant stats via:
                // 1. `variants` modifiers (passive logic).
                // 2. `passiveSkills` (which have `grantedStats`).
                // So if `grantedStats` are parsed from effect, I should wrap them in a `PassiveSkill` attached to the item?
                // OR put them in `modifiers` if they are simple additions like "STR+1"?
                // `statModifiers` from EffectParser are usually "STR+1".
                // `grantedStats` from EffectParser might be "New Resource"? or "Global Stat"?
                // Usually "STR+1" goes to `statModifiers`.
                // `EffectParser` distinguishes them?
                // Let's assume `statModifiers` covers most.
                // If `grantedStats` exists (e.g. "MaxHP+10" permanent?), usually modifiers handle MaxHP too.
                // I'll ignore `grantedStats` for Equipment for now or map them to modifiers if possible.
                // Or create a dummy passive skill.
                // Given complexity, and Legacy setup usually just doing "Attack +5", which is a modifier.
                // I'll stick to `modifiers` and `overrides`.
            };

            // If we have grantedStats for items, ideally we'd add a passive skill.
            if (mappedGrantedStats.length > 0 || mappedGrantedResources.length > 0) {
                const syntheticPassive: PassiveSkillEntity = {
                    id: skillId(createId()), // Random ID
                    name: `${i.name} Effect`,
                    category: 'PASSIVE',
                    acquisitionMethod: 'Free', // Decision is 'Free'
                    description: 'Item Internal Passive',
                    grantedStats: mappedGrantedStats.length > 0 ? mappedGrantedStats : undefined,
                    grantedResources: mappedGrantedResources.length > 0 ? mappedGrantedResources : undefined,
                    variants: { default: {} },
                    currentVariant: 'default',
                    tags: [],
                };
                itemObj.passiveSkills = [syntheticPassive];
            }


            const initial = currentEquipment.find(ii => ii.id === i.id);
            if (!initial) {
                // New
                logsToAdd.push({
                    id: charEventId(createId()),
                    timestamp: now(),
                    type: 'ITEM_ADDED',
                    item: itemObj as InventoryItem, // Cast to InventoryItem union
                    source: 'INITIAL',
                    description: `Added item: ${i.name}`,
                });
            } else {
                // Modified?
                const initialVariant = (initial as EquipmentItem).variants?.default;
                const isEffectChanged = !!initialVariant; // Rough check

                if (isStrDiff(initial.name, i.name) || isEffectChanged) {
                    logsToAdd.push({
                        id: charEventId(createId()),
                        timestamp: now(),
                        type: 'ITEM_REMOVED',
                        itemId: itemId(initial.id),
                        description: `Updating item: ${initial.name}`,
                    });
                    logsToAdd.push({
                        id: charEventId(createId()),
                        timestamp: now(),
                        type: 'ITEM_ADDED',
                        item: itemObj as InventoryItem,
                        source: 'INITIAL',
                        description: `Updated item: ${i.name}`,
                    });
                }
            }
        }

        // 5. Custom Stats
        for (const cs of newCustomStats) {
            if (!cs.key) continue;

            const currentLabel = currentCustomLabels[cs.key];
            const isCurrentlyMain = currentCustomMainStats.includes(cs.key);

            if (currentLabel !== cs.label || isCurrentlyMain !== cs.isMain) {
                logsToAdd.push({
                    id: charEventId(createId()),
                    timestamp: now(),
                    type: 'STAT_LABEL_REGISTERED',
                    key: cs.key,
                    label: cs.label,
                    isMain: cs.isMain,
                    description: `Updated label for ${cs.key}`,
                });
            }

            const currentVal = currentStats[cs.key] || 0;
            const targetVal = parseInt(cs.value) || 0;
            const diff = targetVal - currentVal;

            if (diff !== 0) {
                logsToAdd.push({
                    id: charEventId(createId()),
                    timestamp: now(),
                    type: 'STAT_GROWN',
                    key: cs.key,
                    delta: diff,
                    cost: 0,
                    description: `カスタムステータス(${cs.label})調整`,
                });
            }
        }

        // 6. Resources
        const existingResourceIds = new Set(currentResources.map(r => r.id));
        for (const r of newResources) {
            if (!existingResourceIds.has(r.id)) {
                logsToAdd.push({
                    id: charEventId(createId()),
                    timestamp: now(),
                    type: 'RESOURCE_DEFINED',
                    resource: {
                        id: resourceId(r.id),
                        name: r.name,
                        max: r.max, // Formula String
                        min: '0',
                        initial: r.initial, // Formula String
                        resetMode: 'initial'
                    },
                    description: `Defined resource: ${r.name}`,
                });
            }
        }

        return logsToAdd;
    }
}
