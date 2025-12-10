import { DiceRoller } from '@/domain/dice/DiceRoller';
import { useEffect, useState } from 'react';
import { SessionLogEntry } from '../../session';
import { SessionCalculator } from '../../session/domain/SessionCalculator';
import { JAPANESE_TO_ENGLISH_STATS } from '../domain/constants';
import { CharacterState } from '../domain/models';

export const useCharacterSession = (state: CharacterState) => {
    // Ephemeral State (Session Scope)
    const [resourceValues, setResourceValues] = useState<Record<string, number>>({});
    const [logs, setLogs] = useState<SessionLogEntry[]>([]);

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

    // Handle Log (Ephemeral)
    const handleLog = (log: SessionLogEntry) => {
        setLogs(prev => [log, ...prev]);

        // Delegate state calculation to SessionCalculator
        const nextValues = SessionCalculator.applyLog(resourceValues, log, state);

        // If values changed, update state and add feedback
        if (nextValues !== resourceValues) {
            setResourceValues(nextValues);

            // Generate Feedback Log if needed (e.g. for resource updates)
            // Note: In the new DicePanel, we might not need explicit feedback logs if the UI updates reactively.
            // But if we want to show "HP updated to 15" in the log stream, we should add a system log.
            // For now, let's assume the original log (UPDATE_RESOURCE) is sufficient for display.
        }
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
            // Optionally add error feedback to logs
            return;
        }

        const rollResult = result.value;

        // Add description to result details if present
        if (description) {
            rollResult.details += ` ${description}`;
        }

        handleLog({
            id: crypto.randomUUID(),
            type: 'ROLL',
            timestamp: Date.now(),
            diceRoll: rollResult,
            channel: 'main'
        });
    };

    return {
        resourceValues,
        logs,
        handleLog,
        performRoll
    };
};
