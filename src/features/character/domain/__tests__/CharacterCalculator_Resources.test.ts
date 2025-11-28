import { describe, expect, it } from 'vitest';
import { CharacterCalculator } from '../CharacterCalculator';
import { CharacterLogEntry } from '../CharacterLog';

describe('CharacterCalculator Resources', () => {
    it('should update resource value', () => {
        const logs: CharacterLogEntry[] = [
            {
                id: '1',
                type: 'REGISTER_RESOURCE',
                timestamp: 1,
                resource: { id: 'HP', name: 'Hit Points', max: 10, min: 0, initial: 10 }
            },
            {
                id: '2',
                type: 'UPDATE_RESOURCE',
                timestamp: 2,
                resourceUpdate: { resourceId: 'HP', type: 'set', value: 5 }
            }
        ];
        const state = CharacterCalculator.calculateState(logs);
        expect(state.resourceValues['HP']).toBe(5);
    });

    it('should reset resource value', () => {
        const logs: CharacterLogEntry[] = [
            {
                id: '1',
                type: 'REGISTER_RESOURCE',
                timestamp: 1,
                resource: { id: 'HP', name: 'Hit Points', max: 10, min: 0, initial: 10 }
            },
            {
                id: '2',
                type: 'UPDATE_RESOURCE',
                timestamp: 2,
                resourceUpdate: { resourceId: 'HP', type: 'set', value: 5 }
            },
            {
                id: '3',
                type: 'UPDATE_RESOURCE',
                timestamp: 3,
                resourceUpdate: { resourceId: 'HP', type: 'reset', resetTarget: 'initial' }
            }
        ];
        const state = CharacterCalculator.calculateState(logs);
        expect(state.resourceValues['HP']).toBe(10);
    });

    it('should reset all resources', () => {
        const logs: CharacterLogEntry[] = [
            {
                id: '1',
                type: 'REGISTER_RESOURCE',
                timestamp: 1,
                resource: { id: 'HP', name: 'Hit Points', max: 10, min: 0, initial: 10, resetMode: 'initial' }
            },
            {
                id: '2',
                type: 'REGISTER_RESOURCE',
                timestamp: 1,
                resource: { id: 'MP', name: 'Magic Points', max: 5, min: 0, initial: 5, resetMode: 'initial' }
            },
            {
                id: '3',
                type: 'REGISTER_RESOURCE',
                timestamp: 1,
                resource: { id: 'Gold', name: 'Gold', max: 999, min: 0, initial: 0, resetMode: 'none' }
            },
            // Damage/Spend
            {
                id: '4',
                type: 'UPDATE_RESOURCE',
                timestamp: 2,
                resourceUpdate: { resourceId: 'HP', type: 'set', value: 2 }
            },
            {
                id: '5',
                type: 'UPDATE_RESOURCE',
                timestamp: 2,
                resourceUpdate: { resourceId: 'MP', type: 'set', value: 1 }
            },
            {
                id: '6',
                type: 'UPDATE_RESOURCE',
                timestamp: 2,
                resourceUpdate: { resourceId: 'Gold', type: 'set', value: 100 }
            },
            // Reset All
            {
                id: '7',
                type: 'RESET_RESOURCES',
                timestamp: 3
            }
        ];
        const state = CharacterCalculator.calculateState(logs);

        expect(state.resourceValues['HP']).toBe(10); // Reset
        expect(state.resourceValues['MP']).toBe(5);  // Reset
        expect(state.resourceValues['Gold']).toBe(100); // Not reset (none)
    });

    it('should handle implicit HP/MP reset', () => {
        // HP/MP are implicitly ensured by CharacterCalculator if not registered
        // But to test RESET_RESOURCES logic for implicit resources, we need to rely on derived stats.
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROWTH', timestamp: 1, statKey: 'Grade', value: 2 }, // HP=(2+4)*5=30 (Body default 0? No, Body needs value)
            { id: '2', type: 'GROWTH', timestamp: 1, statKey: 'Body', value: 4 },
            // HP = 30

            // Damage
            {
                id: '3',
                type: 'UPDATE_RESOURCE',
                timestamp: 2,
                resourceUpdate: { resourceId: 'HP', type: 'set', value: 10 }
            },
            // Reset All
            {
                id: '4',
                type: 'RESET_RESOURCES',
                timestamp: 3
            }
        ];
        const state = CharacterCalculator.calculateState(logs);

        // HP should be reset to Max (30)
        expect(state.resourceValues['HP']).toBe(30);
    });
});
