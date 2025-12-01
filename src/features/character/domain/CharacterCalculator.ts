import { all, create } from 'mathjs';
import { CharacterLogEntry, CharacterState } from './CharacterLog';
import { JAPANESE_TO_ENGLISH_STATS } from './constants';

// Configure mathjs
const math = create(all, {
    number: 'number', // Use standard JS numbers (floats)
    precision: 14,
});

export class CharacterCalculator {
    private static readonly DEFAULT_STATE: CharacterState = {
        stats: {},
        tags: new Set(),
        equipment: [],
        skills: [],
        skillWishlist: [],
        exp: { total: 0, used: 0, free: 0 },
        derivedStats: {},
        customLabels: {},
        customMainStats: [],
        resources: [],
        resourceValues: {},
    };

    private static readonly DEFAULT_FORMULAS: Record<string, string> = {
        'MaxHP': '({Grade} + {Body}) * 5',
        'MaxMP': '({Grade} + {Spirit}) * 5',
        'Defense': '{Body}',
        'MagicDefense': '{Spirit}',
        'ActionSpeed': '{Grade} + 3',
        'DamageDice': 'ceil({Grade} / 5)', // New: Damage Dice Count
    };

    /**
     * Aggregates a list of logs into a final CharacterState.
     */
    public static calculateState(
        logs: CharacterLogEntry[],
        baseStats: Record<string, number> = {},
        sessionContext: CharacterCalculator.SessionContext = {}
    ): CharacterState {
        const state: CharacterState = {
            ...this.DEFAULT_STATE,
            stats: { ...baseStats },
            tags: new Set(),
            equipment: [],
            skills: [],
            skillWishlist: [],
            exp: { total: 0, used: 0, free: 0 },
            derivedStats: {},
            customLabels: {},
            customMainStats: [],
            resources: [],
            resourceValues: {},
        };

        // Sort logs by timestamp just in case
        const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);

        for (const log of sortedLogs) {
            this.applyLog(state, log);
        }

        // Apply Session Context (Temporary Additions)
        // 1. Temporary Stats
        if (sessionContext.tempStats) {
            for (const [key, value] of Object.entries(sessionContext.tempStats)) {
                const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                state.stats[normalizedKey] = (state.stats[normalizedKey] || 0) + (value as number);
            }
        }
        // 2. Temporary Skills
        if (sessionContext.tempSkills) {
            state.skills.push(...sessionContext.tempSkills);
        }
        // 3. Temporary Items
        if (sessionContext.tempItems) {
            state.equipment.push(...sessionContext.tempItems);
        }

        // Prepare Formulas (Start with defaults)
        const formulas = this.getFormulas(state);

        // Apply Equipment Modifiers and Overrides (already handled in getFormulas for overrides)
        // Here we handle direct modifiers
        for (const item of state.equipment) {
            if (item.statModifiers) {
                for (const [key, value] of Object.entries(item.statModifiers)) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                    state.stats[normalizedKey] = (state.stats[normalizedKey] || 0) + value;
                }
            }
            if (item.dynamicModifiers) {
                for (const [key, formula] of Object.entries(item.dynamicModifiers)) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                    const bonus = this.evaluateFormula(formula, state);
                    state.stats[normalizedKey] = (state.stats[normalizedKey] || 0) + bonus;
                }
            }
            // Granted Stats/Resources
            if (item.grantedStats) {
                for (const stat of item.grantedStats) {
                    state.customLabels[stat.key] = stat.label;
                    if (stat.isMain) {
                        if (!state.customMainStats.includes(stat.key)) {
                            state.customMainStats.push(stat.key);
                        }
                    }
                    state.stats[stat.key] = (state.stats[stat.key] || 0) + stat.value;
                }
            }
            if (item.grantedResources) {
                for (const res of item.grantedResources) {
                    // Check duplicates by ID
                    if (!state.resources.find(r => r.id === res.id)) {
                        state.resources.push(res);
                    }
                }
            }
        }

        // Apply Skill Modifiers and Overrides
        for (const skill of state.skills) {
            if (skill.statModifiers) {
                for (const [key, value] of Object.entries(skill.statModifiers)) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                    state.stats[normalizedKey] = (state.stats[normalizedKey] || 0) + value;
                }
            }
            if (skill.dynamicModifiers) {
                for (const [key, formula] of Object.entries(skill.dynamicModifiers)) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                    const bonus = this.evaluateFormula(formula, state);
                    state.stats[normalizedKey] = (state.stats[normalizedKey] || 0) + bonus;
                }
            }
            // Granted Stats/Resources
            if (skill.grantedStats) {
                for (const stat of skill.grantedStats) {
                    state.customLabels[stat.key] = stat.label;
                    if (stat.isMain) {
                        if (!state.customMainStats.includes(stat.key)) {
                            state.customMainStats.push(stat.key);
                        }
                    }
                    state.stats[stat.key] = (state.stats[stat.key] || 0) + stat.value;
                }
            }
            if (skill.grantedResources) {
                for (const res of skill.grantedResources) {
                    if (!state.resources.find(r => r.id === res.id)) {
                        state.resources.push(res);
                    }
                }
            }
        }

        // Calculate Derived Stats
        this.calculateDerivedStats(state, formulas);

        // Ensure HP and MP are in resources with dynamic Max
        const ensureResource = (key: string, name: string, statKey: string) => {
            // Use derived stat for Max
            const max = state.derivedStats[statKey] || 0;

            const existing = state.resources.find(r => r.id === key);
            if (existing) {
                // Update existing resource max
                existing.max = max;
                existing.initial = max; // Usually initial is max for HP/MP
            } else {
                // Create new resource
                state.resources.push({
                    id: key,
                    name: name,
                    max: max,
                    min: 0,
                    initial: max,
                });
            }
        };
        ensureResource('HP', 'HP', 'MaxHP');
        ensureResource('MP', 'MP', 'MaxMP');

        // Calculate free exp
        state.exp.free = state.exp.total - state.exp.used;

        return state;
    }

    private static applyLog(state: CharacterState, log: CharacterLogEntry) {
        switch (log.type) {
            case 'GROW_STAT':
                if (log.statGrowth) {
                    const { key, value } = log.statGrowth;
                    const trimmedKey = key.trim();
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[trimmedKey] || trimmedKey;
                    state.stats[normalizedKey] = (state.stats[normalizedKey] || 0) + value;
                    // Add cost if present (new format) or from statGrowth (migrated/intermediate)
                    if (log.cost) state.exp.used += log.cost;
                    else if (log.statGrowth.cost) state.exp.used += log.statGrowth.cost;
                } else if (log.statKey && log.value !== undefined) {
                    // Fallback for legacy format if any
                    const trimmedKey = log.statKey.trim();
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[trimmedKey] || trimmedKey;
                    state.stats[normalizedKey] = (state.stats[normalizedKey] || 0) + log.value;
                    // Legacy logs might not have cost here, relied on SPEND_EXP
                }
                break;
            case 'GROWTH': // Legacy support
                if (log.statKey && log.value !== undefined) {
                    const trimmedKey = log.statKey.trim();
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[trimmedKey] || trimmedKey;
                    state.stats[normalizedKey] = (state.stats[normalizedKey] || 0) + log.value;
                }
                break;
            case 'SET_VALUE':
                if (log.statKey && log.value !== undefined) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[log.statKey] || log.statKey;
                    state.stats[normalizedKey] = log.value;
                }
                break;
            case 'ADD_TAG':
                if (log.tagId) state.tags.add(log.tagId);
                break;
            case 'REMOVE_TAG':
                if (log.tagId) state.tags.delete(log.tagId);
                break;
            case 'EQUIP':
                if (log.item) {
                    state.equipment.push(log.item);
                }
                break;
            case 'UNEQUIP':
                if (log.item?.id) {
                    state.equipment = state.equipment.filter(i => i.id !== log.item!.id);
                }
                break;
            case 'UPDATE_ITEM':
                if (log.item?.id) {
                    const index = state.equipment.findIndex(i => i.id === log.item!.id);
                    if (index !== -1) {
                        state.equipment[index] = { ...state.equipment[index], ...log.item };
                    }
                }
                break;
            case 'LEARN_SKILL':
                if (log.skill) {
                    state.skills.push(log.skill);
                    if (log.cost) state.exp.used += log.cost;
                }
                break;
            case 'FORGET_SKILL':
                if (log.skill?.id) {
                    state.skills = state.skills.filter(s => s.id !== log.skill!.id);
                    // Note: We don't refund cost automatically here unless we track it specifically.
                    // If we wanted to refund, we'd need to know the original cost.
                    // For now, manual SPEND_EXP (negative) or specific REFUND log would be needed if refund is desired.
                }
                break;
            case 'UPDATE_SKILL':
                if (log.skill?.id) {
                    const index = state.skills.findIndex(s => s.id === log.skill!.id);
                    if (index !== -1) {
                        state.skills[index] = { ...state.skills[index], ...log.skill };
                    }
                }
                break;
            case 'ADD_WISHLIST_SKILL':
                if (log.skill) {
                    state.skillWishlist.push(log.skill);
                }
                break;
            case 'REMOVE_WISHLIST_SKILL':
                if (log.skill?.id) {
                    state.skillWishlist = state.skillWishlist.filter(s => s.id !== log.skill!.id);
                }
                break;
            case 'UPDATE_WISHLIST_SKILL':
                if (log.skill?.id) {
                    const index = state.skillWishlist.findIndex(s => s.id === log.skill!.id);
                    if (index !== -1) {
                        state.skillWishlist[index] = { ...state.skillWishlist[index], ...log.skill };
                    }
                }
                break;
            case 'GAIN_EXP':
                if (log.value) state.exp.total += log.value;
                break;
            case 'SPEND_EXP':
                if (log.value) state.exp.used += log.value;
                break;
            case 'REGISTER_STAT_LABEL':
                if (log.statKey && log.stringValue) {
                    state.customLabels[log.statKey] = log.stringValue;
                    if (log.isMainStat) {
                        state.customMainStats.push(log.statKey);
                    }
                }
                break;
            case 'REGISTER_RESOURCE':
                if (log.resource) {
                    // Check if resource already exists
                    const exists = state.resources.some(r => r.id === log.resource!.id);
                    if (!exists) {
                        state.resources.push(log.resource);
                    } else {
                        // Update existing definition
                        state.resources = state.resources.map(r =>
                            r.id === log.resource!.id ? log.resource! : r
                        );
                    }
                }
                break;
        }
    }

    /**
     * Normalizes a formula string by:
     * 1. Replacing known Japanese stat names with English IDs.
     * 2. Wrapping unknown non-ASCII sequences (custom Japanese vars) in data["..."] syntax.
     */
    public static normalizeFormula(formula: string): string {
        let normalized = formula;

        // 1. Replace known Japanese labels
        // Sort by length descending to avoid partial matches (though unlikely with these specific names)
        const jpKeys = Object.keys(JAPANESE_TO_ENGLISH_STATS).sort((a, b) => b.length - a.length);
        for (const jp of jpKeys) {
            const en = JAPANESE_TO_ENGLISH_STATS[jp];
            // Use regex to replace only whole words if possible, but Japanese doesn't have spaces usually.
            // Simple global replace is likely safe enough for these specific labels.
            normalized = normalized.split(jp).join(en);
        }

        // 2. Wrap remaining non-ASCII sequences in data["..."]
        // Matches sequences of non-ASCII characters that are NOT inside quotes
        // This is a simplified approach. A full parser would be better but overkill here.
        // We assume variables don't start with numbers.
        normalized = normalized.replace(/([^\x00-\x7F]+)/g, (match) => {
            // If it's already quoted or part of a string, we might have issues,
            // but for simple math formulas this should be fine.
            return `data["${match}"]`;
        });

        return normalized;
    }

    /**
     * Evaluates a formula string against the character state.
     * Supports {Variable} syntax for stats.
     * @param formula The formula string to evaluate.
     * @param state The character state to use for variable resolution.
     * @param overrides Optional map of variable names to values to override state values.
     */
    public static evaluateFormula(formula: string, state: CharacterState, overrides: Record<string, number> = {}): number {
        let processedFormula = formula;
        try {
            // 1. Process Formula: Replace {Key} with value
            // We look for {Key} patterns.
            // Key can be English or Japanese.

            // First, normalize the formula (handles Japanese keys -> English, and wraps custom Japanese in data["..."])
            // Actually, if we enforce strict {}, we might not need normalizeFormula for the *keys* inside {} if we handle lookup manually.
            // BUT normalizeFormula handles "standard Japanese aliases" (e.g. 肉体 -> Body).
            // If user writes {肉体}, we want to look up 'Body'.
            // Our manual lookup logic below needs to handle that.

            // Let's NOT use normalizeFormula on the whole string because it might replace things we don't want if they are not in {}.
            // The user wants strictness: "text is text, variables are {variables}".

            processedFormula = formula.replace(/\{([^{}]+)\}/g, (match, key) => {
                const trimmedKey = key.trim();

                // 1. Check overrides
                if (trimmedKey in overrides) {
                    return overrides[trimmedKey].toString();
                }

                // 2. Resolve key (handle Japanese aliases)
                const enKey = JAPANESE_TO_ENGLISH_STATS[trimmedKey] || trimmedKey;

                // 3. Look up in state
                const val = state.stats[enKey] ?? state.derivedStats[enKey] ?? 0;
                return val.toString();
            });

            // 2. Evaluate
            // We pass an empty scope because all variables should have been replaced by numbers.
            return math.evaluate(processedFormula, {});
        } catch (e) {
            console.error(`Formula evaluation error: ${formula}`, e);
            return 0;
        }
    }

    /**
     * Gathers all formulas from defaults and character state (equipment/skills).
     */
    public static getFormulas(state: CharacterState): Record<string, string> {
        const formulas = { ...this.DEFAULT_FORMULAS };

        // Apply Equipment Overrides
        for (const item of state.equipment) {
            if (item.formulaOverrides) {
                for (const [key, formula] of Object.entries(item.formulaOverrides)) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                    formulas[normalizedKey] = formula;
                }
            }
        }

        // Apply Skill Overrides
        for (const skill of state.skills) {
            if (skill.formulaOverrides) {
                for (const [key, formula] of Object.entries(skill.formulaOverrides)) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                    formulas[normalizedKey] = formula;
                }
            }
        }
        return formulas;
    }

    /**
     * Calculates derived stats based on formulas.
     * Adds any direct stat bonuses (from Growth/Items) to the formula result.
     */
    public static calculateDerivedStats(state: CharacterState, formulas: Record<string, string>, overrides: Record<string, number> = {}): void {
        for (const [key, formula] of Object.entries(formulas)) {
            const formulaResult = this.evaluateFormula(formula, state, overrides);
            const additiveBonus = state.stats[key] || 0;
            state.derivedStats[key] = formulaResult + additiveBonus;
        }
    }

    /**
     * Calculates the EXP cost to increase a stat or grade.
     * @param currentValue The current value of the stat/grade.
     * @param isGrade True if the stat is 'Grade'.
     */
    public static calculateStatCost(currentValue: number, isGrade: boolean): number {
        if (isGrade) {
            return currentValue * 10;
        }
        return currentValue * 5;
    }

    /**
     * Calculates the EXP cost for skill acquisition.
     * @param currentStandardSkills Number of existing 'Standard' (General) skills.
     * @param type Acquisition type.
     * @param isRetry For Grade skills, is this a retry (2nd attempt onwards)?
     */
    public static calculateSkillCost(currentStandardSkills: number, type: 'Free' | 'Standard' | 'Grade' | undefined, isRetry: boolean = false): { success: number, failure: number } {
        if (type === 'Grade') {
            return {
                success: 0,
                failure: isRetry ? 1 : 0
            };
        }
        if (type === 'Free') {
            return {
                success: 0,
                failure: 0
            };
        }

        // Standard (General)
        // Cost is (Current Standard Skills + 1) * 5
        const cost = (currentStandardSkills + 1) * 5;
        return {
            success: cost,
            failure: 1
        };
    }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CharacterCalculator {
    export interface SessionContext {
        tempStats?: Record<string, number>;
        tempSkills?: CharacterState['skills'];
        tempItems?: CharacterState['equipment'];
    }
}
