import { describe, expect, it } from 'vitest';
import { DiceRoller } from '../../../../domain/dice/DiceRoller';
import { CharacterCalculator } from '../CharacterCalculator';
import { CharacterState } from '../CharacterLog';
import { JAPANESE_TO_ENGLISH_STATS } from '../constants';

import { Item } from '../CharacterLog';

describe('Japanese Support', () => {
    const mockState: CharacterState = {
        stats: { 'Body': 5, 'Combat': 10 },
        derivedStats: {},
        tags: new Set(),
        equipment: [],
        skills: [],
        skillWishlist: [],
        exp: { total: 0, used: 0, free: 0 },
        customLabels: {},
        customMainStats: [],
        resources: [],
        resourceValues: {},
    };

    describe('CharacterCalculator', () => {
        it('should normalize Japanese stat names in formulas', () => {
            const result = CharacterCalculator.evaluateFormula('{肉体} + 5', mockState);
            expect(result).toBe(10); // Body(5) + 5
        });

        it('should handle custom Japanese variables', () => {
            const stateWithCustom = {
                ...mockState,
                stats: { ...mockState.stats, 'カルマ': 20 }
            };
            const result = CharacterCalculator.evaluateFormula('{カルマ} + 5', stateWithCustom);
            expect(result).toBe(25);
        });

        it('should handle mixed Japanese and English', () => {
            const stateWithCustom = {
                ...mockState,
                stats: { ...mockState.stats, 'カルマ': 20 }
            };
            const result = CharacterCalculator.evaluateFormula('{肉体} + {カルマ}', stateWithCustom);
            expect(result).toBe(25); // 5 + 20
        });

        it('should normalize keys in dynamicModifiers', () => {
            const state = CharacterCalculator.calculateState([], { 'Body': 10 });
            // Simulate applying a log with Japanese keys (logic is in calculateState loop)
            // We can't easily test the loop without mocking logs, but we can test the helper if we exposed it,
            // or just rely on the integration test below.

            const item = {
                id: '1',
                name: 'Test Item',
                type: 'Weapon',
                description: 'Test Description',
                dynamicModifiers: { '戦闘能力': '{肉体} * 2' } // Should become Combat = Body * 2
            } as Item;

            // Manually inject item to test calculation logic
            state.equipment.push(item);

            // Re-run calculation logic (simulated)
            // Since calculateState creates a fresh state, we need to pass a log to add the item
            const log = {
                id: '1',
                timestamp: 1,
                type: 'EQUIP' as const,
                item: item
            };

            const newState = CharacterCalculator.calculateState([log], { 'Body': 10 });
            expect(newState.stats['Combat']).toBe(20); // 10 * 2
        });
    });

    describe('DiceRoller', () => {
        it('should roll with Japanese stat names', () => {
            const result = DiceRoller.roll('1d1 + {肉体}', mockState, JAPANESE_TO_ENGLISH_STATS);
            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value.total).toBe(6); // 1 (roll) + 5 (Body)
            };
        });

        it('should roll with custom Japanese variables', () => {
            const stateWithCustom = {
                ...mockState,
                stats: { ...mockState.stats, 'カルマ': 20 }
            };
            const result = DiceRoller.roll('1d1 + {カルマ}', stateWithCustom, JAPANESE_TO_ENGLISH_STATS);
            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value.total).toBe(21); // 1 (roll) + 20 (Karma)
            };
        });
    });
});
