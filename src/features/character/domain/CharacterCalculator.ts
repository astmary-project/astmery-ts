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
        };

        // Sort logs by timestamp just in case
        const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);

        for (const log of sortedLogs) {
            this.applyLog(state, log);
        }

        // Apply Equipment Modifiers
        for (const item of state.equipment) {
            if (item.statModifiers) {
                for (const [key, value] of Object.entries(item.statModifiers)) {
                    state.stats[key] = (state.stats[key] || 0) + value;
                }
            }
        }

        // Apply Passive Skill Modifiers
        for (const skill of state.skills) {
            if (skill.statModifiers) {
                for (const [key, value] of Object.entries(skill.statModifiers)) {
                    state.stats[key] = (state.stats[key] || 0) + value;
                }
            }
            if (skill.type === 'Passive' && skill.formulaOverrides) {
                // TODO: Handle formula overrides
            }
        }

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
        }
    }

    /**
     * Evaluates a formula string against the character state.
     */
    public static evaluateFormula(formula: string, state: CharacterState): number {
        try {
            // Create a scope with all stats
            const scope: Record<string, number> = { ...state.stats };

            // Add derived stats to scope if they exist (careful with recursion if we call this recursively)
            // For now, we assume derived stats are calculated separately or passed in.

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
     */
    public static calculateDerivedStats(state: CharacterState, formulas: Record<string, string>): void {
        for (const [key, formula] of Object.entries(formulas)) {
            state.derivedStats[key] = this.evaluateFormula(formula, state);
        }
    }
}
