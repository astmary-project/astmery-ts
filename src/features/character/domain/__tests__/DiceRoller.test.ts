import { describe, expect, it } from 'vitest';
import { CharacterState } from '../CharacterLog';
import { DiceRoller } from '../DiceRoller';

describe('DiceRoller', () => {
    const mockState: CharacterState = {
        stats: { 'Body': 5, 'Mind': 3 },
        derivedStats: { 'Attack': 10 },
        tags: new Set(),
        equipment: [],
        skills: [],
        exp: { total: 0, used: 0, free: 0 },
        customLabels: {},
        customMainStats: [],
        resources: [],
        resourceValues: {},
        recentRolls: [],
    };

    it('should evaluate simple math', () => {
        const result = DiceRoller.roll('1 + 1', mockState);
        expect(result.total).toBe(2);
    });

    it('should replace stats with values', () => {
        const result = DiceRoller.roll('{Body} + 5', mockState);
        expect(result.total).toBe(10); // 5 + 5
    });

    it('should replace derived stats', () => {
        const result = DiceRoller.roll('{Attack} + 2', mockState);
        expect(result.total).toBe(12); // 10 + 2
    });

    it('should roll dice (mock check)', () => {
        // Since we can't easily mock Math.random in this simple setup without a library,
        // we check if the result is within valid range.
        const result = DiceRoller.roll('1d6', mockState);
        expect(result.total).toBeGreaterThanOrEqual(1);
        expect(result.total).toBeLessThanOrEqual(6);
        expect(result.details).toMatch(/\[\d+\]/);
    });

    it('should handle complex formulas', () => {
        const result = DiceRoller.roll('2d6 + {Body}', mockState);
        expect(result.total).toBeGreaterThanOrEqual(7); // 2 + 5
        expect(result.total).toBeLessThanOrEqual(17); // 12 + 5
    });

    it('should detect criticals (max roll)', () => {
        // We can't force a crit without mocking, but we can check the flag exists
        const result = DiceRoller.roll('1d1', mockState); // Always 1
        expect(result.isCritical).toBe(true);
    });

    it('should detect fumbles (min roll)', () => {
        // 1d1 is both max and min, so it might be both depending on logic order
        // Let's check logic: if (rolls.every(r => r === sides)) isCritical = true;
        // if (rolls.every(r => r === 1)) isFumble = true;
        // For 1d1: sides=1. roll=1. 1===1 (Crit). 1===1 (Fumble).
        // Both true.
        const result = DiceRoller.roll('1d1', mockState);
        expect(result.isFumble).toBe(true);
    });
});
