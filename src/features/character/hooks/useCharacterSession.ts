import { DiceRoller, RollResult } from '@/domain/dice/DiceRoller';
import { useEffect, useState } from 'react';
import { SessionLogEntry } from '../../session';
import { SessionCalculator } from '../../session/domain/SessionCalculator';
import { CharacterState } from '../domain/CharacterLog';
import { JAPANESE_TO_ENGLISH_STATS } from '../domain/constants';

export const useCharacterSession = (state: CharacterState) => {
    // Ephemeral State (Session Scope)
    const [resourceValues, setResourceValues] = useState<Record<string, number>>({});
    const [rollHistory, setRollHistory] = useState<RollResult[]>([]);

    // Initialize resource values on load or when definitions change
    useEffect(() => {
        // We use setTimeout to defer the state update, moving it out of the render cycle
        const timer = setTimeout(() => {
            setResourceValues(prev => {
                const initialValues: Record<string, number> = {};
                state.resources.forEach(r => {
                    // Preserve current value if exists, otherwise set to initial
                    initialValues[r.id] = prev[r.id] ?? r.initial;
                });
                return initialValues;
            });
        }, 0);
        return () => clearTimeout(timer);
    }, [state.resources]);

    // Handle Log Commands (Ephemeral)
    const handleLogCommand = (log: SessionLogEntry) => {
        // Delegate state calculation to SessionCalculator
        const nextValues = SessionCalculator.applyLog(resourceValues, log, state);

        // If values changed, update state and add feedback
        if (nextValues !== resourceValues) {
            setResourceValues(nextValues);

            // Generate Feedback
            let feedbackDetails = '';
            let feedbackTotal = 0;

            if (log.type === 'UPDATE_RESOURCE' && log.resourceUpdate) {
                const { resourceId } = log.resourceUpdate;
                // Find definition for name
                const resource = state.resources.find(r => r.id.toLowerCase() === resourceId.toLowerCase() || r.name === resourceId)
                    || (['HP', 'MP'].includes(resourceId.toUpperCase()) ? { name: resourceId.toUpperCase(), id: resourceId.toUpperCase() } : null);

                const name = resource?.name || resourceId;
                const val = nextValues[resource?.id || resourceId] ?? 0;

                feedbackDetails = log.description || `Updated ${name}`;
                feedbackTotal = val;
            } else if (log.type === 'RESET_RESOURCES') {
                feedbackDetails = log.description || 'Reset All Resources';
            }

            if (feedbackDetails) {
                const feedback: RollResult = {
                    formula: 'Command',
                    total: feedbackTotal,
                    details: feedbackDetails,
                    isCritical: false,
                    isFumble: false
                };
                setRollHistory(prev => [feedback, ...prev]);
            }
        }
    };

    // Handle Rolls (Ephemeral)
    const handleRoll = (result: RollResult) => {
        setRollHistory(prev => [result, ...prev]);
    };

    // Helper for quick rolls
    const performRoll = (formula: string, displayState: CharacterState, description?: string) => {
        // Use displayState as base so we get updated stats (e.g. Attack)
        const tempState = { ...displayState };

        // Inject current resource values into stats so {HP} works in the roll formula itself
        state.resources.forEach(r => {
            const val = resourceValues[r.id] ?? r.initial;
            tempState.stats = { ...tempState.stats, [r.name]: val };
        });

        const result = DiceRoller.roll(formula, tempState, JAPANESE_TO_ENGLISH_STATS);

        if (result.isFailure) {
            console.error(result.error);
            // Optionally add error feedback to history
            return;
        }

        const rollResult = result.value;

        // Add description to result details if present
        if (description) {
            rollResult.details += ` ${description}`;
        }

        handleRoll(rollResult);
    };

    return {
        resourceValues,
        rollHistory,
        handleLogCommand,
        handleRoll,
        performRoll
    };
};
