/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { DiceRoller } from '../../../../domain/dice/DiceRoller';
import { charEventId, itemId } from '../../../../domain/values/ids';
import { now } from '../../../../domain/values/time';
import { CharacterCalculator } from '../CharacterCalculator';
import { JAPANESE_TO_ENGLISH_STATS } from '../constants';
import { CharacterEvent } from '../Event';
import { CharacterState } from '../models';

// Helper for Mock State
const createMockState = (overrides: Partial<CharacterState> = {}): CharacterState => ({
    stats: { 'Body': 5, 'Sense': 5, 'Mind': 5, 'Social': 5 },
    derivedStats: {}, // Expected to be populated by calc
    tags: [],
    exp: { total: 0, used: 0, free: 0 },
    inventory: [],
    equipmentSlots: [],
    skills: [],
    skillWishlist: [],
    customLabels: {},
    customMainStats: [],
    resources: [],
    resourceValues: {},
    ...overrides
});

describe('Japanese Support Rules', () => {

    describe('CharacterCalculator', () => {
        it('should normalize Japanese stat names in formulas', () => {
            const mockState = createMockState();
            // {肉体} -> Body (5) + 5 = 10
            // Assuming CharacterCalculator.evaluateFormula handles normalization or replacement
            const result = CharacterCalculator.evaluateFormula('{肉体} + 5', mockState);
            expect(result).toBe(10);
        });

        it('should handle custom Japanese variables', () => {
            const mockState = createMockState({
                stats: { 'Body': 5, 'Combat': 10, 'カルマ': 20 }
            });
            const result = CharacterCalculator.evaluateFormula('{カルマ} + 5', mockState);
            expect(result).toBe(25);
        });

        it('should handle mixed Japanese and English', () => {
            const mockState = createMockState({
                stats: { 'Body': 5, 'Combat': 10, 'カルマ': 20 }
            });
            const result = CharacterCalculator.evaluateFormula('{肉体} + {カルマ}', mockState);
            expect(result).toBe(25); // 5 + 20
        });

        it('should normalize keys in modifiers (variants)', () => {
            // Test that if an item has a modifier with Japanese Key, it affects the English Stat
            // E.g. { "戦闘能力": "{肉体} * 2" } -> modifies 'Combat'

            const item: any = {
                id: itemId('1'),
                name: 'Test Item',
                category: 'EQUIPMENT',
                slot: 'MainHand',
                description: 'Test Item',
                variants: {
                    default: {
                        modifiers: { '戦闘能力': '{肉体} * 2' } // Should become Combat = Body * 2
                    }
                },
                currentVariant: 'default'
            };

            const log: CharacterEvent = {
                id: charEventId('1'),
                timestamp: now(),
                type: 'ITEM_ADDED',
                item: item,
                source: 'INITIAL',
                description: 'Add Item'
            };
            const equipLog: CharacterEvent = {
                id: charEventId('2'),
                timestamp: now(),
                type: 'ITEM_EQUIPPED',
                itemId: itemId('1'),
                slot: 'MainHand',
                description: 'Equip Item'
            };

            const newState = CharacterCalculator.calculateState([log, equipLog], { 'Body': 10 });

            // Check if 'Combat' was modified
            // Base Body=10. Formula Body*2 = 20.
            // If Combat was previously undefined/0, it becomes 20.
            // But we didn't init Combat.
            // calculateState inits stats from baseStats provided.
            // If baseStats has no Combat, then Combat starts at 0?
            // Wait, calculateState DEFAULT_STATE usually has empty stats.

            expect(newState.stats['Combat']).toBe(20);
            // Note: CharacterCalculator usually puts calculated mods into derivedStats or updates stats depending on implementation.
            // If modifier is adding to the stat, checking derivedStats or effective stats is correct.
            // If CharacterCalculator.calculateState applies modifiers, where does it put them? derivedStats/stats?
            // Usually derivedStats or directly modifying stats.
            // Checking derivedStats['Combat'] or stats['Combat'].
        });
    });

    describe('DiceRoller', () => {
        const mockState = createMockState();

        it('should roll with Japanese stat names', () => {
            const result = DiceRoller.roll('1d1 + {肉体}', mockState, JAPANESE_TO_ENGLISH_STATS);
            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value.total).toBe(6); // 1 (roll) + 5 (Body)
            };
        });

        it('should roll with custom Japanese variables', () => {
            const stateWithCustom = createMockState({
                stats: { 'Body': 5, 'Combat': 10, 'カルマ': 20 }
            });
            const result = DiceRoller.roll('1d1 + {カルマ}', stateWithCustom, JAPANESE_TO_ENGLISH_STATS);
            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value.total).toBe(21); // 1 (roll) + 20 (Karma)
            };
        });
    });
});
