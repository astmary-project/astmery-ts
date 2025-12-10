import { CharacterCalculator } from '../../character/domain/CharacterCalculator';
import { CharacterState } from '../../character/domain/models';
import { Resource } from '../../character/domain/Resource';
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
            let resDef: Resource | undefined = resource;
            if (!resDef && (normalizedId === 'HP' || normalizedId === 'MP')) {
                const maxKey = normalizedId === 'HP' ? 'MaxHP' : 'MaxMP';
                const max = state.derivedStats[maxKey] || 0;
                resDef = {
                    id: normalizedId,
                    name: normalizedId,
                    max: String(max),
                    min: '0',
                    initial: String(max),
                    resetMode: 'initial'
                };
            }

            if (resDef) {
                // Ensure helper to convert strings/formulas implicitly if needed for current values?
                // currentValues are numbers.
                const current = nextValues[resDef.id] ?? (
                    // If initial is undefined, fallback to 0. But initial is string formula.
                    // Does CharacterCalculator exposed an evaluate method for single formula? YES.
                    CharacterCalculator.evaluateFormula(resDef.initial, state) || 0
                );

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
                    newValue = CharacterCalculator.evaluateFormula(resDef.initial, state);
                }

                // Clamp
                // Parse max/min as they are formulas
                const maxVal = resDef.max !== undefined ? CharacterCalculator.evaluateFormula(resDef.max, state) : Infinity;
                const minVal = resDef.min !== undefined ? CharacterCalculator.evaluateFormula(resDef.min, state) : -Infinity;

                newValue = Math.min(maxVal, Math.max(minVal, newValue));

                nextValues[resDef.id] = newValue;
                return nextValues;
            }
        } else if (log.type === 'RESET_RESOURCES') {
            const nextValues = { ...currentValues };

            // Reset explicit resources
            state.resources.forEach(r => {
                if (r.resetMode !== 'none') {
                    nextValues[r.id] = CharacterCalculator.evaluateFormula(r.initial, state);
                }
            });

            // Reset implicit HP/MP
            ['HP', 'MP'].forEach(key => {
                const explicit = state.resources.find(r => r.id === key);
                if (!explicit) {
                    const maxKey = key === 'HP' ? 'MaxHP' : 'MaxMP';
                    const max = state.derivedStats[maxKey] || 0;
                    nextValues[key] = max;
                }
            });

            return nextValues;
        }

        return currentValues;
    }
}
