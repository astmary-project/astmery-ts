import type { CharacterLogEntry, Item, Resource, Skill } from '../CharacterLog';
import { ABILITY_STATS, JAPANESE_TO_ENGLISH_STATS } from '../constants';
import { EffectParser } from '../logic/EffectParser';

export interface SpecialtyElementInput {
    name: string;
    benefit: string;
}

export interface SkillInput {
    id: string;
    name: string;
    type: string;
    summary: string; // New: Human readable description
    effect: string;  // DSL for parsing
    restriction: string; // New: Restriction text
    timing: string;
    cooldown: string;
    target: string;
    range: string;
    cost: string;
    roll: string;
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
    summary: string; // New: Human readable description
    effect: string;  // DSL for parsing
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

    newStats: Record<string, number>;
    newSpecialtyElements: SpecialtyElementInput[];
    newSkills: SkillInput[];
    newEquipment: ItemInput[];
    newCustomStats: CustomStatInput[];
    newResources: ResourceInput[];
}

export class CharacterSetupService {
    static calculateDiffLogs(input: SetupServiceInput): CharacterLogEntry[] {
        const logsToAdd: CharacterLogEntry[] = [];
        const {
            currentStats, currentSkills, currentEquipment, currentCustomLabels, currentCustomMainStats, currentResources,
            newStats, newSpecialtyElements, newSkills, newEquipment, newCustomStats, newResources
        } = input;

        // 1. Stat Growth (Grade + Ability Stats)
        const editableStats = ['Grade', ...ABILITY_STATS];
        for (const key of editableStats) {
            const currentVal = currentStats[key] || 0;
            const targetVal = newStats[key] || 0;
            const diff = targetVal - currentVal;

            if (diff !== 0) {
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'GROWTH',
                    statKey: key,
                    value: diff,
                    description: 'セットアップウィザードによる調整',
                });
            }
        }

        // 2. Specialty Elements Benefits
        for (const el of newSpecialtyElements) {
            if (!el.benefit) continue;
            const match = el.benefit.match(/^(.+?)\s*([+\-])\s*(\d+)$/);
            if (match) {
                const rawStat = match[1].trim();
                const op = match[2];
                const val = parseInt(match[3]);
                const statKey = JAPANESE_TO_ENGLISH_STATS[rawStat] || rawStat;
                const change = op === '-' ? -val : val;

                if (statKey) {
                    logsToAdd.push({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'GROWTH',
                        statKey: statKey,
                        value: change,
                        description: `得意属性: ${el.name} の恩恵`,
                    });
                }
            }
        }

        // 3. Skills Diff
        const initialSkillIds = new Set(currentSkills.map(s => s.id));
        const currentSkillIds = new Set(newSkills.map(s => s.id));

        // Removed Skills
        for (const s of currentSkills) {
            if (!currentSkillIds.has(s.id)) {
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'FORGET_SKILL',
                    skill: s,
                });
            }
        }

        // Added or Modified Skills
        for (const s of newSkills) {
            const { statModifiers, dynamicModifiers, grantedStats, grantedResources } = EffectParser.parse(s.effect);
            const skillObj: Skill = {
                id: s.id,
                name: s.name,
                type: s.type,
                description: s.summary, // Use summary for description
                effect: s.effect,       // Store raw effect string
                restriction: s.restriction,
                statModifiers: Object.keys(statModifiers).length > 0 ? statModifiers : undefined,
                dynamicModifiers: Object.keys(dynamicModifiers).length > 0 ? dynamicModifiers : undefined,
                grantedStats: grantedStats.length > 0 ? grantedStats : undefined,
                grantedResources: grantedResources.length > 0 ? grantedResources : undefined,
                timing: s.timing,
                cooldown: s.cooldown,
                target: s.target,
                range: s.range,
                cost: s.cost,
                roll: s.roll,
                magicGrade: s.magicGrade,
                shape: s.shape,
                duration: s.duration,
                activeCheck: s.activeCheck,
                passiveCheck: s.passiveCheck,
                chatPalette: s.chatPalette,
            };

            const initial = currentSkills.find(is => is.id === s.id);
            if (!initial) {
                // New
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'LEARN_SKILL',
                    skill: skillObj,
                });
            } else {
                // Modified?
                const initialModifiers = initial.statModifiers || {};
                const initialDynamic = initial.dynamicModifiers || {};
                const initialGrantedStats = initial.grantedStats || [];
                const initialGrantedResources = initial.grantedResources || [];

                const isDiff = initial.name !== s.name ||
                    initial.type !== s.type ||
                    initial.description !== s.summary ||
                    initial.effect !== s.effect ||
                    initial.restriction !== s.restriction ||
                    initial.timing !== s.timing ||
                    initial.cooldown !== s.cooldown ||
                    initial.target !== s.target ||
                    initial.range !== s.range ||
                    initial.cost !== s.cost ||
                    initial.roll !== s.roll ||
                    initial.magicGrade !== s.magicGrade ||
                    initial.shape !== s.shape ||
                    initial.duration !== s.duration ||
                    initial.activeCheck !== s.activeCheck ||
                    initial.passiveCheck !== s.passiveCheck ||
                    initial.chatPalette !== s.chatPalette ||
                    JSON.stringify(initialModifiers) !== JSON.stringify(statModifiers) ||
                    JSON.stringify(initialDynamic) !== JSON.stringify(dynamicModifiers) ||
                    JSON.stringify(initialGrantedStats) !== JSON.stringify(grantedStats) ||
                    JSON.stringify(initialGrantedResources.map(r => ({ ...r, id: '' }))) !== JSON.stringify(grantedResources.map(r => ({ ...r, id: '' })));

                if (isDiff) {
                    logsToAdd.push({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'FORGET_SKILL',
                        skill: initial,
                    });
                    logsToAdd.push({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'LEARN_SKILL',
                        skill: skillObj,
                    });
                }
            }
        }

        // 4. Equipment Diff
        const initialItemIds = new Set(currentEquipment.map(i => i.id));
        const currentItemIds = new Set(newEquipment.map(i => i.id));

        // Removed Items
        for (const i of currentEquipment) {
            if (!currentItemIds.has(i.id)) {
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'UNEQUIP',
                    item: i,
                });
            }
        }

        // Added or Modified Items
        for (const i of newEquipment) {
            const { statModifiers, dynamicModifiers, grantedStats, grantedResources } = EffectParser.parse(i.effect);
            const itemObj: Item = {
                id: i.id,
                name: i.name,
                type: i.type,
                description: i.summary, // Use summary for description
                effect: i.effect,       // Store raw effect string
                statModifiers: Object.keys(statModifiers).length > 0 ? statModifiers : undefined,
                dynamicModifiers: Object.keys(dynamicModifiers).length > 0 ? dynamicModifiers : undefined,
                grantedStats: grantedStats.length > 0 ? grantedStats : undefined,
                grantedResources: grantedResources.length > 0 ? grantedResources : undefined,
            };

            const initial = currentEquipment.find(ii => ii.id === i.id);
            if (!initial) {
                // New
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'EQUIP',
                    item: itemObj,
                });
            } else {
                // Modified?
                const initialModifiers = initial.statModifiers || {};
                const initialDynamic = initial.dynamicModifiers || {};
                const initialGrantedStats = initial.grantedStats || [];
                const initialGrantedResources = initial.grantedResources || [];

                const isDiff = initial.name !== i.name ||
                    initial.type !== i.type ||
                    initial.description !== i.summary ||
                    initial.effect !== i.effect ||
                    JSON.stringify(initialModifiers) !== JSON.stringify(statModifiers) ||
                    JSON.stringify(initialDynamic) !== JSON.stringify(dynamicModifiers) ||
                    JSON.stringify(initialGrantedStats) !== JSON.stringify(grantedStats) ||
                    JSON.stringify(initialGrantedResources.map(r => ({ ...r, id: '' }))) !== JSON.stringify(grantedResources.map(r => ({ ...r, id: '' })));

                if (isDiff) {
                    logsToAdd.push({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'UNEQUIP',
                        item: initial,
                    });
                    logsToAdd.push({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'EQUIP',
                        item: itemObj,
                    });
                }
            }
        }

        // 5. Custom Stats
        for (const cs of newCustomStats) {
            if (!cs.key) continue;

            // Check if label/main status changed
            const currentLabel = currentCustomLabels[cs.key];
            const isCurrentlyMain = currentCustomMainStats.includes(cs.key);

            if (currentLabel !== cs.label || isCurrentlyMain !== cs.isMain) {
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'REGISTER_STAT_LABEL',
                    statKey: cs.key,
                    stringValue: cs.label,
                    isMainStat: cs.isMain,
                });
            }

            // Check value diff
            const currentVal = currentStats[cs.key] || 0;
            const targetVal = parseInt(cs.value) || 0;
            const diff = targetVal - currentVal;

            if (diff !== 0) {
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'GROWTH',
                    statKey: cs.key,
                    value: diff,
                    description: `カスタムステータス(${cs.label})調整`,
                });
            }
        }

        // 6. Resources
        const existingResourceIds = new Set(currentResources.map(r => r.id));
        for (const r of newResources) {
            if (!existingResourceIds.has(r.id)) {
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'REGISTER_RESOURCE',
                    resource: {
                        id: r.id,
                        name: r.name,
                        max: parseInt(r.max) || 0,
                        initial: parseInt(r.initial) || 0,
                    },
                });
            }
        }

        return logsToAdd;
    }
}
