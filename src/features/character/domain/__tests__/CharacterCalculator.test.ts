import { describe, expect, it } from 'vitest';
import { CharacterCalculator } from '../CharacterCalculator';
import { CharacterLogEntry } from '../CharacterLog';

describe('CharacterCalculator', () => {
    it('should aggregate growth logs correctly', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROWTH', timestamp: 1, statKey: 'STR', value: 5 },
            { id: '2', type: 'GROWTH', timestamp: 2, statKey: 'STR', value: 3 },
            { id: '3', type: 'GROWTH', timestamp: 3, statKey: 'DEX', value: 10 },
        ];

        const state = CharacterCalculator.calculateState(logs);
        expect(state.stats['STR']).toBe(8);
        expect(state.stats['DEX']).toBe(10);
    });

    it('should handle ad-hoc stats', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROWTH', timestamp: 1, statKey: 'DarkPower', value: 666 },
        ];

        const state = CharacterCalculator.calculateState(logs);
        expect(state.stats['DarkPower']).toBe(666);
    });

    it('should evaluate formulas with stats', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROWTH', timestamp: 1, statKey: 'Grade', value: 2 },
            { id: '2', type: 'GROWTH', timestamp: 1, statKey: 'Body', value: 4 },
        ];
        const state = CharacterCalculator.calculateState(logs);

        // HP = (Grade + Body) * 5
        const hp = CharacterCalculator.evaluateFormula('(Grade + Body) * 5', state);
        expect(hp).toBe(30); // (2 + 4) * 5 = 30
    });

    it('should support floats and math functions', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROWTH', timestamp: 1, statKey: 'A', value: 10 },
        ];
        const state = CharacterCalculator.calculateState(logs);

        // sqrt(A) * 2.5
        const val = CharacterCalculator.evaluateFormula('sqrt(A) * 2.5', state);
        expect(val).toBeCloseTo(Math.sqrt(10) * 2.5);
    });

    it('should support conditionals', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROWTH', timestamp: 1, statKey: 'HP', value: 5 },
        ];
        const state = CharacterCalculator.calculateState(logs);

        // if HP < 10 then 1 else 0
        // mathjs supports ternary operator
        const result = CharacterCalculator.evaluateFormula('HP < 10 ? 1 : 0', state);
        expect(result).toBe(1);

        const result2 = CharacterCalculator.evaluateFormula('HP > 10 ? 1 : 0', state);
        expect(result2).toBe(0);
    });

    it('should track experience points', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GAIN_EXP', timestamp: 1, value: 100 },
            { id: '2', type: 'SPEND_EXP', timestamp: 2, value: 30 },
        ];
        const state = CharacterCalculator.calculateState(logs);
        expect(state.exp.total).toBe(100);
        expect(state.exp.used).toBe(30);
        expect(state.exp.free).toBe(70);
    });

    it('should track equipped items', () => {
        const logs: CharacterLogEntry[] = [
            {
                id: '1',
                type: 'EQUIP',
                timestamp: 1,
                item: { id: 'sword', name: 'Iron Sword', type: 'Weapon', description: 'Basic sword' }
            },
            {
                id: '2',
                type: 'EQUIP',
                timestamp: 2,
                item: { id: 'shield', name: 'Wood Shield', type: 'Armor', description: 'Basic shield' }
            },
        ];
        const state = CharacterCalculator.calculateState(logs);
        expect(state.equipment).toHaveLength(2);
        expect(state.equipment[0].id).toBe('sword');
        expect(state.equipment[1].id).toBe('shield');
    });

    it('should handle UNEQUIP logs', () => {
        const logs: CharacterLogEntry[] = [
            {
                id: '1',
                type: 'EQUIP',
                timestamp: 1,
                item: { id: 'sword', name: 'Iron Sword', type: 'Weapon', description: 'Basic sword' }
            },
            {
                id: '2',
                type: 'UNEQUIP',
                timestamp: 2,
                item: { id: 'sword', name: 'Iron Sword', type: 'Weapon', description: '' }
            },
        ];
        const state = CharacterCalculator.calculateState(logs);
        expect(state.equipment).toHaveLength(0); // Sword was equipped then unequipped
    });

    it('should manage skills', () => {
        const logs: CharacterLogEntry[] = [
            {
                id: '1',
                type: 'LEARN_SKILL',
                timestamp: 1,
                skill: { id: 'fireball', name: 'Fireball', type: 'Spell', description: 'Boom' }
            },
        ];
        const state = CharacterCalculator.calculateState(logs);

        expect(state.skills).toHaveLength(1);
        expect(state.skills[0].id).toBe('fireball');
        expect(state.skills[0].name).toBe('Fireball');
    });
});
