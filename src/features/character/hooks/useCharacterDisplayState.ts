import { useMemo } from 'react';
import { CharacterCalculator } from '../domain/CharacterCalculator';
import { CharacterState } from '../domain/CharacterLog';
import { JAPANESE_TO_ENGLISH_STATS } from '../domain/constants';

/**
 * Hook to calculate the display state of a character.
 * Applies resource overrides (e.g. current HP affecting stats) and re-calculates derived stats.
 */
export const useCharacterDisplayState = (
    state: CharacterState,
    resourceValues: Record<string, number>
) => {
    return useMemo(() => {
        // Clone state to avoid mutation
        const next: CharacterState = {
            ...state,
            stats: { ...state.stats },
            derivedStats: { ...state.derivedStats }
        };

        // Prepare overrides with current resource values
        const overrides: Record<string, number> = {};
        state.resources.forEach(r => {
            const val = resourceValues[r.id] ?? r.initial;
            overrides[r.name] = val;
            // Also override by ID if different (e.g. "HP" vs "Hit Points")
            if (r.id !== r.name) overrides[r.id] = val;
        });

        // Helper to re-calculate dynamic modifiers
        const applyDynamicUpdates = (modifiers: Record<string, string> | undefined) => {
            if (!modifiers) return;
            for (const [key, formula] of Object.entries(modifiers)) {
                const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;

                // Calculate with initial values (Max HP etc) - this is what is currently in state.stats
                const initialVal = CharacterCalculator.evaluateFormula(formula, state);

                // Calculate with current values
                const currentVal = CharacterCalculator.evaluateFormula(formula, state, overrides);

                const delta = currentVal - initialVal;
                if (delta !== 0) {
                    next.stats[normalizedKey] = (next.stats[normalizedKey] || 0) + delta;
                }
            }
        };

        // Re-apply all dynamic modifiers
        state.equipment.forEach(i => applyDynamicUpdates(i.dynamicModifiers));
        state.skills.forEach(s => applyDynamicUpdates(s.dynamicModifiers));

        // Recalculate Derived Stats (e.g. Attack, Defense which might depend on modified stats or resources)
        const formulas = CharacterCalculator.getFormulas(state);
        CharacterCalculator.calculateDerivedStats(next, formulas, overrides);

        return next;
    }, [state, resourceValues]);
};
