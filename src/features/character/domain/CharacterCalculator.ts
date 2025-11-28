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
        resourceValues: {},
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
            resourceValues: {},
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
            case 'UPDATE_RESOURCE':
                if (log.resourceUpdate) {
                    const { resourceId, type, value, resetTarget } = log.resourceUpdate;
                    // Ensure resource exists in values (default to 0 if not set yet, though it should be initialized)
                    // Actually, we should check if the resource is defined in state.resources?
                    // But logs might come before resource definition if unordered? (SortedLogs handles this)

                    if (type === 'set' && value !== undefined) {
                        state.resourceValues[resourceId] = value;
                    } else if (type === 'modify' && value !== undefined) {
                        const current = state.resourceValues[resourceId] ?? 0; // Or initial?
                        // We need to clamp? CharacterCalculator usually enforces rules.
                        // But min/max might be dynamic.
                        // For now just add.
                        state.resourceValues[resourceId] = current + value;
                    } else if (type === 'reset') {
                        // Find resource definition to know max/initial
                        const resource = state.resources.find(r => r.id === resourceId);
                        if (resource) {
                            // Default to initial (which is usually max for HP/MP)
                            // If resetTarget is specified, use it (though we only support 'initial' for now)
                            state.resourceValues[resourceId] = resource.initial;
                        } else {
                            // If resource not found (maybe derived?), try derived stats?
                            // But resources should be in state.resources.
                            // If it's a standard resource like HP/MP, it might be added later in calculateState?
                            // Wait, applyLog runs BEFORE ensureResource('HP', 'MP').
                            // So if we try to reset HP before it's "ensured", we might fail to find it.
                            // However, HP/MP are usually derived.
                            // We might need to handle "implicit" resources or ensure they are added earlier?
                            // OR, we just set the value. If it's reset, we need the target value.
                            // If we can't find the resource, we can't reset it effectively unless we know the max/initial.
                            // But `state.derivedStats` might not be calculated yet!
                            // `applyLog` runs first, then `calculateDerivedStats`.
                            // So we CANNOT know the "current max" during `applyLog` loop if it depends on stats.

                            // ISSUE: Resource Reset depends on Derived Stats (Max HP).
                            // Derived Stats depend on Stats (which are built by logs).
                            // If we process logs in order, we might have:
                            // 1. Growth STR+10
                            // 2. Reset HP (needs Max HP which needs STR)
                            // 3. Damage HP

                            // We need to calculate derived stats incrementally? Or calculate them on demand?
                            // `CharacterCalculator` architecture:
                            // 1. Apply all logs to build base stats.
                            // 2. Calculate derived stats.
                            // 3. Ensure resources.

                            // If `UPDATE_RESOURCE` is a log, it happens in step 1.
                            // But it needs the result of step 2 (Max HP).

                            // SOLUTION:
                            // We cannot resolve "Reset to Max" during the log application phase if Max depends on future calculations.
                            // BUT, `state.stats` IS updated incrementally.
                            // We can calculate derived stats *temporarily* for the reset?
                            // Or, we store the "Reset Instruction" and apply it later?
                            // No, because subsequent logs might depend on the value (e.g. Damage).

                            // Actually, `state.stats` is built incrementally.
                            // So at the point of `UPDATE_RESOURCE`, `state.stats` reflects the state *at that time*.
                            // So we CAN calculate Max HP at that moment.

                            // We need `getFormulas` and `evaluateFormula` here.
                            // But `getFormulas` needs `state.equipment` and `skills`, which are also built incrementally.
                            // So `state` is valid for the current timestamp.

                            // So:
                            // 1. Get current formulas.
                            // 2. Calculate Max for the target resource.
                            // 3. Set value.

                            const formulas = CharacterCalculator.getFormulas(state);
                            // We need to know which formula corresponds to this resource's "Max".
                            // For HP, it's 'HP'.
                            // For custom resources, it's `resource.max`.

                            // If resource is not in `state.resources` yet (e.g. HP/MP before ensureResource),
                            // we check `formulas`.

                            let max = 0;
                            if (formulas[resourceId]) {
                                max = CharacterCalculator.evaluateFormula(formulas[resourceId], state);
                            } else {
                                // Maybe it's a fixed resource added by Item/Skill?
                                const res = state.resources.find(r => r.id === resourceId);
                                if (res) max = res.max;
                            }
                            state.resourceValues[resourceId] = max;
                        }
                    }
                }
                break;
            case 'RESET_RESOURCES':
                // Reset all resources where resetMode !== 'none'
                // We need to iterate over all defined resources.
                // Resources are defined in state.resources.
                // Note: Some resources (like HP/MP) might be added later in ensureResource if not present.
                // But if they are not present yet, we can't reset them here?
                // Actually, if this log comes after they are "ensured" (which happens at end of calculation),
                // wait, `applyLog` happens BEFORE `ensureResource`.
                // So if we reset HP here, and HP is not in `state.resources`, we do nothing?
                // This is a problem. HP/MP are "ensured" at the end.
                // But if we have a log history:
                // 1. Growth
                // 2. Reset All
                // 3. Damage

                // At step 2, HP is not in `state.resources` yet (because ensureResource runs after loop).
                // So `state.resources` only contains explicitly granted resources.

                // However, `CharacterCalculator` logic is:
                // 1. Init state (empty resources)
                // 2. Apply logs (might add resources via REGISTER_RESOURCE or Grant)
                // 3. Calculate Derived Stats
                // 4. Ensure HP/MP

                // If `RESET_RESOURCES` is a log, it runs in step 2.
                // At that point, HP/MP are NOT in `state.resources`.
                // So `RESET_RESOURCES` would miss HP/MP if they are not explicitly registered.

                // To fix this, we should probably "ensure" HP/MP exist when we encounter a Reset log?
                // Or we explicitly handle 'HP' and 'MP' in the reset logic if they are not in resources?
                // But we don't know their Max yet (depends on derived stats).

                // Same issue as single reset: We need Max/Initial value.
                // But Max depends on Derived Stats, which are calculated AFTER logs.

                // This implies that `RESET_RESOURCES` (and `UPDATE_RESOURCE` for HP/MP) cannot be fully resolved during the first pass of log application if they depend on derived stats.
                // BUT, `state.stats` IS populated.
                // We can calculate derived stats on demand.

                // Let's use the same strategy as single reset:
                // 1. Get formulas.
                // 2. Calculate Max for HP/MP (and others).
                // 3. Set value.

                const currentFormulas = CharacterCalculator.getFormulas(state);

                // 1. Reset explicit resources
                for (const res of state.resources) {
                    if (res.resetMode !== 'none') {
                        state.resourceValues[res.id] = res.initial;
                    }
                }

                // 2. Reset implicit resources (HP, MP) if not already handled
                // We assume HP/MP are always reset-able unless explicitly set to 'none' (which we can't do for implicit ones easily).
                // If they are in state.resources, they are handled above.
                // If not, we handle them here.
                const implicitResources = ['HP', 'MP'];
                for (const key of implicitResources) {
                    if (!state.resources.find(r => r.id === key)) {
                        // Calculate Max/Initial
                        let max = 0;
                        if (currentFormulas[key]) {
                            max = CharacterCalculator.evaluateFormula(currentFormulas[key], state);
                        }
                        state.resourceValues[key] = max;
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
     */
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
}

