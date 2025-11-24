import { all, create } from 'mathjs';
import { CharacterLogEntry, CharacterState } from './CharacterLog';

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
        'HP': '(Grade + Body) * 5',
        'MP': '(Grade + Spirit) * 5',
        'Defense': 'Body * 2',
        'MagicDefense': 'Spirit * 2',
        'ActionSpeed': 'Grade + Science + 10',
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
                    state.stats[key] = (state.stats[key] || 0) + value;
                }
            }
            if (item.formulaOverrides) {
                Object.assign(formulas, item.formulaOverrides);
            }
            if (item.dynamicModifiers) {
                for (const [key, formula] of Object.entries(item.dynamicModifiers)) {
                    const bonus = this.evaluateFormula(formula, state);
                    state.stats[key] = (state.stats[key] || 0) + bonus;
                }
            }
        }

        // Apply Skill Modifiers and Overrides
        for (const skill of state.skills) {
            if (skill.statModifiers) {
                for (const [key, value] of Object.entries(skill.statModifiers)) {
                    state.stats[key] = (state.stats[key] || 0) + value;
                }
            }
            if (skill.formulaOverrides) {
                Object.assign(formulas, skill.formulaOverrides);
            }
            if (skill.dynamicModifiers) {
                for (const [key, formula] of Object.entries(skill.dynamicModifiers)) {
                    const bonus = this.evaluateFormula(formula, state);
                    state.stats[key] = (state.stats[key] || 0) + bonus;
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
     * Evaluates a formula string against the character state.
     */
    public static evaluateFormula(formula: string, state: CharacterState): number {
        try {
            // Create a scope with all stats
            // We default missing stats to 0 to avoid errors in formulas
            const scope: Record<string, number> = new Proxy({ ...state.stats }, {
                get: (target, prop: string) => (prop in target ? target[prop] : 0)
            });

            // Evaluate
            const result = math.evaluate(formula, scope);
            return typeof result === 'number' ? result : 0;
        } catch (error) {
            console.error(`Formula evaluation error: ${formula}`, error);
            return 0; // Fail safe
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
