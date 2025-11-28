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

        // Ensure HP and MP are in resources
        const ensureResource = (key: string, name: string) => {
            if (!state.resources.find(r => r.id === key)) {
                const max = state.derivedStats[key] || 0;
                state.resources.push({
                    id: key,
                    name: name,
                    max: max,
                    min: 0,
                    initial: max,
                });
            }
        };
        ensureResource('HP', 'HP');
        ensureResource('MP', 'MP');

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
     * @param formula The formula string to evaluate.
     * @param state The character state to use for variable resolution.
     * @param overrides Optional map of variable names to values to override state values.
     */
    public static evaluateFormula(formula: string, state: CharacterState, overrides: Record<string, number> = {}): number {
        try {
            // 1. Prepare Scope
            const scope: Record<string, any> = {}; // Changed to any to support data object

            // Add all stats to scope (English keys)
            for (const [key, value] of Object.entries(state.stats)) {
                scope[key] = value;
            }
            for (const [key, value] of Object.entries(state.derivedStats)) {
                scope[key] = value;
            }

            // Apply overrides
            for (const [key, value] of Object.entries(overrides)) {
                scope[key] = value;
            }

            // Add 'data' object for Japanese variable access (normalized format)
            scope['data'] = { ...scope };

            // 2. Process Formula
            // First, normalize the formula (handles Japanese keys -> English, and wraps custom Japanese in data["..."])
            let processedFormula = this.normalizeFormula(formula);

            // Replace {Key} with value (for English keys or keys that were normalized to English)
            // Note: normalizeFormula might have already replaced known Japanese keys with English keys.
            // But {Key} syntax might still exist if the user typed {Body}.
            // Also normalizeFormula does NOT remove braces.
            // So {Body} remains {Body}. {肉体} becomes {Body}.
            // {カルマ} becomes {data["カルマ"]}? No, normalizeFormula regex `([^\x00-\x7F]+)` matches `肉体`.
            // If input is `{肉体}`, normalizeFormula sees `肉体` inside braces?
            // normalizeFormula: `normalized = normalized.split(jp).join(en);`
            // So `{肉体}` becomes `{Body}`.
            // `{カルマ}` becomes `{data["カルマ"]}`.

            // We need to handle {Key} replacement AFTER normalization.
            // But wait, if it becomes `{data["カルマ"]}`, the regex `\{(.+?)\}` will match `data["カルマ"]`.
            // And we try to look up `data["カルマ"]` in scope? No.
            // The current `evaluateFormula` logic tries to look up `key` in `overrides` or `scope`.
            // `scope` has `data`. But `scope['data["カルマ"]']` is undefined.

            // So we should NOT use `normalizeFormula` blindly if we rely on `{Key}` replacement logic.
            // OR we update `{Key}` replacement logic to handle `data[...]`.

            // Actually, `evaluateFormula` was originally designed to replace `{Key}` with VALUES directly in the string.
            // `normalizeFormula` was designed for `mathjs` to evaluate variables.

            // If we use `mathjs` with scope, we don't strictly need `{Key}` replacement if `mathjs` can resolve variables.
            // BUT `mathjs` needs `data["..."]` for Japanese.

            // So:
            // 1. Normalize formula (Japanese -> English, Custom -> data["..."]).
            // 2. Pass to mathjs with scope (including data).
            // 3. BUT we still need to handle `{Key}` syntax because users might use it.
            //    If users use `{Body}`, mathjs sees `{Body}` which is invalid syntax.
            //    So we MUST replace `{...}` with values or just remove braces if variable is in scope?
            //    If we remove braces, `Body` becomes `Body`. `mathjs` resolves `Body`.
            //    `{data["カルマ"]}` becomes `data["カルマ"]`. `mathjs` resolves it.

            // So the strategy is:
            // 1. Normalize.
            // 2. Replace `{X}` with `X`.
            // 3. Evaluate.

            processedFormula = processedFormula.replace(/\{(.+?)\}/g, (match, key) => {
                return key;
            });

            // 3. Evaluate
            return math.evaluate(processedFormula, scope);
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
}

