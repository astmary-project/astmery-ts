import { useMemo } from 'react';
import { CharacterCalculator } from '../domain/CharacterCalculator';
import { CharacterState } from '../domain/models';

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
        // Note: CharacterState from Models might have readonly flags if not removed, 
        // but typically spread creates a mutable copy in TS unless typed otherwise.
        const next: CharacterState = {
            ...state,
            stats: { ...state.stats },
            derivedStats: { ...state.derivedStats },
            resourceValues: { ...state.resourceValues, ...resourceValues }
        };

        // Prepare overrides with current resource values
        // This ensures {HP} in derived stat formulas implies Current HP
        const overrides: Record<string, number> = {};
        next.resources.forEach(r => {
            // Priority: Argument > State (Current) > Initial
            // Note: r.initial is a string (Formula). We should parse it if we want rigorous fallback.
            // But typically resourceValues has it.
            const val = resourceValues[r.id] ?? next.resourceValues[r.id] ?? 0;
            overrides[r.id] = val; // Expose Resource ID
            overrides[r.name] = val; // Expose Resource Name
        });

        // Recalculate Derived Stats
        // Derived stats (e.g. "Attack") might depend on "Current HP" or other params.
        const formulas = CharacterCalculator.getFormulas(state);
        CharacterCalculator.calculateDerivedStats(next, formulas, overrides);

        return next;
    }, [state, resourceValues]);
};
