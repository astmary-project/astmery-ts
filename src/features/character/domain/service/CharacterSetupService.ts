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
    acquisitionType?: 'Free' | 'Standard' | 'Grade'; // New: Acquisition Type
    summary: string; // New: Human readable description
    effect: string;  // DSL for parsing
    restriction: string; // New: Restriction text
    timing: string;
    cooldown: string;
    target: string;
    range: string;
    cost: string;
    rollModifier: string; // Changed from roll
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
    currentSpecialtyElements: SpecialtyElementInput[]; // Added

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
        const currentElementSet = new Set(
            input.currentSpecialtyElements.map(e => `${e.name}:${e.benefit}`)
        );

        for (const el of newSpecialtyElements) {
            if (!el.benefit) continue;

            // Check if this element+benefit combination already exists
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

        // Helper to compare optional strings
        const isStrDiff = (a?: string, b?: string) => (a || '') !== (b || '');

        // 3. Skills Diff
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
                acquisitionType: s.acquisitionType,
                description: s.summary, // Use summary for description
                effect: s.effect,       // Store raw effect string
                restriction: s.restriction,
                statModifiers: Object.keys(statModifiers).length > 0 ? statModifiers : undefined,
                dynamicModifiers: Object.keys(dynamicModifiers).length > 0 ? dynamicModifiers : undefined,
                grantedStats: grantedStats.length > 0 ? grantedStats : undefined,
                grantedResources: grantedResources.length > 0 ? grantedResources : undefined,
                timing: s.timing,
                cooldown: s.cooldown,
                target: s.target || undefined,
                range: s.range || undefined,
                cost: s.cost || undefined,
                rollModifier: s.rollModifier || undefined,
                magicGrade: s.magicGrade || undefined,
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
                // Modified?
                const isEffectChanged = isStrDiff(initial.effect, s.effect);

                // Helper to canonicalize objects for comparison
                // Handles key sorting, undefined vs empty object/array, and specific defaults
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const canonicalize = (obj: any): string => {
                    if (obj === undefined || obj === null) return '';
                    if (Array.isArray(obj)) {
                        if (obj.length === 0) return '';
                        // For resources, strip IDs and ensure min exists
                        return JSON.stringify(obj.map(item => {
                            if (typeof item === 'object' && item !== null) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const clone = { ...item } as any;
                                if ('id' in clone) clone.id = '';
                                if ('min' in clone && clone.min === undefined) clone.min = 0;
                                // Sort keys
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                return Object.keys(clone).sort().reduce((acc, key) => {
                                    acc[key] = clone[key];
                                    return acc;
                                }, {} as any); // eslint-disable-line @typescript-eslint/no-explicit-any
                            }
                            return item;
                        }));
                    }
                    if (typeof obj === 'object') {
                        if (Object.keys(obj).length === 0) return '';
                        // Sort keys
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return JSON.stringify(Object.keys(obj).sort().reduce((acc, key) => {
                            acc[key] = obj[key];
                            return acc;
                        }, {} as any)); // eslint-disable-line @typescript-eslint/no-explicit-any
                    }
                    return JSON.stringify(obj);
                };

                const initialModifiers = initial.statModifiers;
                const initialDynamic = initial.dynamicModifiers;
                const initialGrantedStats = initial.grantedStats;
                const initialGrantedResources = initial.grantedResources;

                // Check basic fields first
                let isDiff = isStrDiff(initial.name, s.name) ||
                    isStrDiff(initial.type, s.type) ||
                    isStrDiff(initial.acquisitionType, s.acquisitionType) ||
                    isStrDiff(initial.description, s.summary) ||
                    isEffectChanged ||
                    isStrDiff(initial.restriction, s.restriction) ||
                    isStrDiff(initial.timing, s.timing) ||
                    isStrDiff(initial.cooldown, s.cooldown) ||
                    isStrDiff(initial.target, s.target) ||
                    isStrDiff(initial.range, s.range) ||
                    isStrDiff(initial.cost, s.cost) ||
                    isStrDiff(initial.rollModifier, s.rollModifier) ||
                    isStrDiff(initial.magicGrade, s.magicGrade) ||
                    isStrDiff(initial.shape, s.shape) ||
                    isStrDiff(initial.duration, s.duration) ||
                    isStrDiff(initial.activeCheck, s.activeCheck) ||
                    isStrDiff(initial.passiveCheck, s.passiveCheck) ||
                    isStrDiff(initial.chatPalette, s.chatPalette);

                // Only check derived fields if basic fields matched AND effect string changed
                // OR if we suspect derived fields might be out of sync (though we trust effect string as source of truth)
                // Actually, if effect string matches, we ARE diff.
                // The question is: if effect did NOT change, do we check derived fields?
                // If we don't, we solve the user's problem.
                // BUT, if we skip this, we never migrate legacy data structure (like adding min:0).
                // So we SHOULD check, but with robust comparison.
                if (!isDiff && !isEffectChanged) {
                    isDiff = canonicalize(initialModifiers) !== canonicalize(statModifiers) ||
                        canonicalize(initialDynamic) !== canonicalize(dynamicModifiers) ||
                        canonicalize(initialGrantedStats) !== canonicalize(grantedStats) ||
                        canonicalize(initialGrantedResources) !== canonicalize(grantedResources);
                }

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
                const isEffectChanged = isStrDiff(initial.effect, i.effect);

                // Reuse canonicalize helper (need to hoist it or duplicate)
                // Duplicating for now since it's inside the loop scope in previous block... wait, I should hoist it.
                // But I can't easily hoist with replace_file_content without replacing the whole file or method.
                // I'll define it again or use a shared helper if I could refactor.
                // For this edit, I'll just define it again inside the loop or use a slightly different approach.
                // Actually, I can define it once at the top of calculateDiffLogs?
                // But I'm editing a chunk.
                // I'll just duplicate the logic for now to be safe with the tool.

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const canonicalize = (obj: any): string => {
                    if (obj === undefined || obj === null) return '';
                    if (Array.isArray(obj)) {
                        if (obj.length === 0) return '';
                        return JSON.stringify(obj.map(item => {
                            if (typeof item === 'object' && item !== null) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const clone = { ...item } as any;
                                if ('id' in clone) clone.id = '';
                                if ('min' in clone && clone.min === undefined) clone.min = 0;
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                return Object.keys(clone).sort().reduce((acc, key) => {
                                    acc[key] = clone[key];
                                    return acc;
                                }, {} as any); // eslint-disable-line @typescript-eslint/no-explicit-any
                            }
                            return item;
                        }));
                    }
                    if (typeof obj === 'object') {
                        if (Object.keys(obj).length === 0) return '';
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return JSON.stringify(Object.keys(obj).sort().reduce((acc, key) => {
                            acc[key] = obj[key];
                            return acc;
                        }, {} as any)); // eslint-disable-line @typescript-eslint/no-explicit-any
                    }
                    return JSON.stringify(obj);
                };

                const initialModifiers = initial.statModifiers;
                const initialDynamic = initial.dynamicModifiers;
                const initialGrantedStats = initial.grantedStats;
                const initialGrantedResources = initial.grantedResources;

                let isDiff = isStrDiff(initial.name, i.name) ||
                    isStrDiff(initial.type, i.type) ||
                    isStrDiff(initial.description, i.summary) ||
                    isEffectChanged;

                if (!isDiff && !isEffectChanged) {
                    isDiff = canonicalize(initialModifiers) !== canonicalize(statModifiers) ||
                        canonicalize(initialDynamic) !== canonicalize(dynamicModifiers) ||
                        canonicalize(initialGrantedStats) !== canonicalize(grantedStats) ||
                        canonicalize(initialGrantedResources) !== canonicalize(grantedResources);
                }

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
                        min: 0, // Default min for legacy resource input (though we are removing this input)
                        initial: parseInt(r.initial) || 0,
                    },
                });
            }
        }

        return logsToAdd;
    }
}
