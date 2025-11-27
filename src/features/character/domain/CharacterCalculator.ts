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
        exp: { total: 0, used: 0, free: 0 },
        derivedStats: {},
        customLabels: {},
        customMainStats: [],
        resources: [],
        recentRolls: [],
    };

    /**
     * Aggregates a list of logs into a final CharacterState.
     */
    private static readonly DEFAULT_FORMULAS: Record<string, string> = {
        'HP': '({Grade} + {Body}) * 5',
        'MP': '({Grade} + {Spirit}) * 5',
        'Defense': '{Body}',
        'MagicDefense': '{Spirit}',
        'ActionSpeed': '{Grade} + 3',
        'DamageDice': 'ceil({Grade} / 5)', // New: Damage Dice Count
    };

    /**
     * Aggregates a list of logs into a final CharacterState.
     */
    public static calculateState(logs: CharacterLogEntry[], baseStats: Record<string, number> = {}): CharacterState {
        const state: CharacterState = {
            ...this.DEFAULT_STATE,
            stats: { ...baseStats },
            tags: new Set(),
            equipment: [],
            skills: [],
            exp: { total: 0, used: 0, free: 0 },
            derivedStats: {},
            customLabels: {},
            customMainStats: [],
            resources: [],
            recentRolls: [],
        };

        // Sort logs by timestamp just in case
        const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);

        for (const log of sortedLogs) {
            this.applyLog(state, log);
        }

        // Prepare Formulas (Start with defaults)
        const formulas = { ...this.DEFAULT_FORMULAS };

        // Apply Equipment Modifiers and Overrides
        for (const item of state.equipment) {
            if (item.statModifiers) {
                for (const [key, value] of Object.entries(item.statModifiers)) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                    state.stats[normalizedKey] = (state.stats[normalizedKey] || 0) + value;
                }
            }
            if (item.formulaOverrides) {
                // Formula overrides keys should also be normalized if they target standard stats
                for (const [key, formula] of Object.entries(item.formulaOverrides)) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                    formulas[normalizedKey] = formula;
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
                    // Initial value is only applied if not already set?
                    // Or should it be an addition?
                    // Usually "Grant Stat" means "You have this stat now".
                    // If we want to track the value, we need to ensure it has a base value.
                    // But `state.stats` is rebuilt from logs.
                    // If there are no logs for this stat, it will be 0.
                    // We should probably set the base value here if it's 0?
                    // Or maybe `state.stats[stat.key] = (state.stats[stat.key] || 0) + stat.value`?
                    // If it's an "Initial Value", it should probably be a base.
                    // But if we save "Growth" logs, they will add to this.
                    // Let's treat `value` as a base modifier for now.
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
            if (skill.formulaOverrides) {
                for (const [key, formula] of Object.entries(skill.formulaOverrides)) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                    formulas[normalizedKey] = formula;
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

        // Calculate free exp
        state.exp.free = state.exp.total - state.exp.used;

        return state;
    }

    private static applyLog(state: CharacterState, log: CharacterLogEntry) {
        switch (log.type) {
            case 'GROWTH':
                if (log.statKey && log.value !== undefined) {
                    state.stats[log.statKey] = (state.stats[log.statKey] || 0) + log.value;
                }
                break;
            case 'SET_VALUE':
                if (log.statKey && log.value !== undefined) {
                    state.stats[log.statKey] = log.value;
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
            case 'LEARN_SKILL':
                if (log.skill) {
                    state.skills.push(log.skill);
                }
                break;
            case 'FORGET_SKILL':
                if (log.skill?.id) {
                    state.skills = state.skills.filter(s => s.id !== log.skill!.id);
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
                    state.resources.push(log.resource);
                }
                break;
            case 'ROLL':
                // We just store the log in recentRolls for display
                // We assume the log already has the result embedded (calculated at creation time)
                // Or we could recalculate it here? No, logs should be immutable history.
                // The log creation (in UI) should use DiceRoller to get the result and save it in the log.
                state.recentRolls.unshift(log);
                // Keep only last 20 rolls
                if (state.recentRolls.length > 20) {
                    state.recentRolls.pop();
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
     */
    /**
     * Evaluates a formula string against the character state.
     * Supports {Variable} syntax for stats.
     */
    public static evaluateFormula(formula: string, state: CharacterState): number {
        try {
            // 1. Prepare Scope
            const scope: Record<string, number> = {};

            // Add all stats to scope (English keys)
            for (const [key, value] of Object.entries(state.stats)) {
                scope[key] = value;
            }
            for (const [key, value] of Object.entries(state.derivedStats)) {
                scope[key] = value;
            }

            // 2. Process Formula: Replace {Key} with value
            // We look for {Key} patterns.
            // Key can be English or Japanese.
            let processedFormula = formula.replace(/\{(.+?)\}/g, (match, key) => {
                const trimmedKey = key.trim();
                // Try to resolve key
                // 1. Check if it's a known Japanese key -> convert to English
                const enKey = JAPANESE_TO_ENGLISH_STATS[trimmedKey] || trimmedKey;

                // 2. Check if it exists in scope
                if (enKey in scope) {
                    return scope[enKey].toString();
                }

                // 3. If not found, return 0 (safe default)
                return '0';
            });

            // 3. Evaluate
            return math.evaluate(processedFormula, scope);
        } catch (e) {
            console.error(`Formula evaluation error: ${formula}`, e);
            return 0;
        }
    }
    /**
     * Calculates derived stats based on formulas.
     * Adds any direct stat bonuses (from Growth/Items) to the formula result.
     */
    public static calculateDerivedStats(state: CharacterState, formulas: Record<string, string>): void {
        for (const [key, formula] of Object.entries(formulas)) {
            const formulaResult = this.evaluateFormula(formula, state);
            const additiveBonus = state.stats[key] || 0;
            state.derivedStats[key] = formulaResult + additiveBonus;
        }
    }
}

