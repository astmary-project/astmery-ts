import { CharacterCalculator } from '../../character/domain/CharacterCalculator';
import { CharacterState } from '../../character/domain/CharacterLog';
import { SessionLogEntry } from './SessionLog';

export class SessionCalculator {
    /**
     * Calculates the new resource values based on a session log entry.
     * @param currentValues Current map of resource ID to value.
     * @param log The session log entry to apply.
     * @param state The character state (for resource definitions and derived stats).
     * @returns A new map of resource ID to value, or the original if no change.
     */
    public static applyLog(
        currentValues: Record<string, number>,
        log: SessionLogEntry,
        state: CharacterState
    ): Record<string, number> {
        if (log.type === 'UPDATE_RESOURCE' && log.resourceUpdate) {
            const { resourceId, type, value } = log.resourceUpdate;
            const nextValues = { ...currentValues };

            // Case-insensitive matching
            const normalizedId = resourceId.toUpperCase();

            // Try to find explicit resource (case-insensitive ID OR exact Name match)
            const resource = state.resources.find(r =>
                r.id.toLowerCase() === resourceId.toLowerCase() ||
                r.name === resourceId
            );

            // Implicit resource handling (HP/MP)
            let resDef = resource;
            if (!resDef && (normalizedId === 'HP' || normalizedId === 'MP')) {
                const max = state.derivedStats[normalizedId] || 0;
                resDef = { id: normalizedId, name: normalizedId, max, min: 0, initial: max };
            }

            if (resDef) {
                const current = nextValues[resDef.id] ?? resDef.initial;
                let newValue = current;

                // Helper to resolve value
                const resolveValue = (val: number | string | undefined, currentVal: number): number => {
                    if (val === undefined) return currentVal;
                    if (typeof val === 'number') return val;
                    return CharacterCalculator.evaluateFormula(val, state);
                };

                const resolvedVal = resolveValue(value, current);

                if (type === 'set' && value !== undefined) {
                    newValue = resolvedVal;
                } else if (type === 'modify' && value !== undefined) {
                    newValue = current + resolvedVal;
                } else if (type === 'reset') {
                    newValue = resDef.initial;
                }

                // Clamp
                newValue = Math.min(resDef.max, Math.max(resDef.min, newValue));

                nextValues[resDef.id] = newValue;
                return nextValues;
            }
        } else if (log.type === 'RESET_RESOURCES') {
            const nextValues = { ...currentValues };

            // Reset explicit resources
            state.resources.forEach(r => {
                if (r.resetMode !== 'none') {
                    nextValues[r.id] = r.initial;
                }
            });

            // Reset implicit HP/MP
            ['HP', 'MP'].forEach(key => {
                const explicit = state.resources.find(r => r.id === key);
                if (!explicit) {
                    const max = state.derivedStats[key] || 0;
                    nextValues[key] = max;
                }
            });

            return nextValues;
        }

        return currentValues;
    }
}
