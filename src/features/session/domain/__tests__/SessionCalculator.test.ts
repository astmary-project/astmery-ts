import { describe, expect, it } from 'vitest';
import { CharacterState } from '../../../character/domain/CharacterLog';
import { SessionCalculator } from '../SessionCalculator';
import { SessionLogEntry } from '../SessionLog';

describe('SessionCalculator', () => {
    // Mock State Helper
    const createMockState = (resources: any[] = [], derivedStats: Record<string, number> = {}): CharacterState => ({
        stats: {},
        tags: new Set(),
        equipment: [],
        skills: [],
        skillWishlist: [],
        exp: { total: 0, used: 0, free: 0 },
        derivedStats,
        customLabels: {},
        customMainStats: [],
        resources,
        resourceValues: {},
    });

    it('should update resource value', () => {
        const state = createMockState([
            { id: 'HP', name: 'Hit Points', max: 10, min: 0, initial: 10 }
        ]);

        let currentValues: Record<string, number> = {};

        const log: SessionLogEntry = {
            id: '1',
            type: 'UPDATE_RESOURCE',
            timestamp: 2,
            resourceUpdate: { resourceId: 'HP', type: 'set', value: 5 }
        };

        currentValues = SessionCalculator.applyLog(currentValues, log, state);
        expect(currentValues['HP']).toBe(5);
    });

    it('should reset resource value', () => {
        const state = createMockState([
            { id: 'HP', name: 'Hit Points', max: 10, min: 0, initial: 10 }
        ]);

        let currentValues: Record<string, number> = { 'HP': 5 };

        const log: SessionLogEntry = {
            id: '1',
            type: 'UPDATE_RESOURCE',
            timestamp: 3,
            resourceUpdate: { resourceId: 'HP', type: 'reset', resetTarget: 'initial' }
        };

        currentValues = SessionCalculator.applyLog(currentValues, log, state);
        expect(currentValues['HP']).toBe(10);
    });

    it('should reset all resources', () => {
        const state = createMockState([
            { id: 'HP', name: 'Hit Points', max: 10, min: 0, initial: 10, resetMode: 'initial' },
            { id: 'MP', name: 'Magic Points', max: 5, min: 0, initial: 5, resetMode: 'initial' },
            { id: 'Gold', name: 'Gold', max: 999, min: 0, initial: 0, resetMode: 'none' }
        ]);

        let currentValues: Record<string, number> = {
            'HP': 2,
            'MP': 1,
            'Gold': 100
        };

        const log: SessionLogEntry = {
            id: '1',
            type: 'RESET_RESOURCES',
            timestamp: 3
        };

        currentValues = SessionCalculator.applyLog(currentValues, log, state);

        expect(currentValues['HP']).toBe(10); // Reset
        expect(currentValues['MP']).toBe(5);  // Reset
        expect(currentValues['Gold']).toBe(100); // Not reset (none)
    });

    it('should handle implicit HP/MP reset', () => {
        // HP/MP are implicitly ensured if not registered, using derivedStats for Max
        const state = createMockState([], {
            'HP': 30, // MaxHP
            'MP': 10
        });

        let currentValues: Record<string, number> = {
            'HP': 10
        };

        const log: SessionLogEntry = {
            id: '1',
            type: 'RESET_RESOURCES',
            timestamp: 3
        };

        currentValues = SessionCalculator.applyLog(currentValues, log, state);

        // HP should be reset to Max (30)
        expect(currentValues['HP']).toBe(30);
    });
});
