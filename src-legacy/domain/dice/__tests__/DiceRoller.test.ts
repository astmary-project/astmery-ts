import { describe, expect, it } from 'vitest';
import { DiceRoller, RollContext } from '../DiceRoller';

describe('DiceRoller', () => {
    const mockContext: RollContext = {
        stats: { 'Body': 5, 'Mind': 3 },
        derivedStats: { 'Attack': 10 },
    };

    const roll = (formula: string) => {
        const result = DiceRoller.roll(formula, mockContext);
        if (result.isFailure) {
            throw result.error;
        }
        return result.value;
    };

    it('should evaluate simple math', () => {
        const result = roll('1 + 1');
        expect(result.total).toBe(2);
    });

    it('should replace stats with values', () => {
        const result = roll('{Body} + 5');
        expect(result.total).toBe(10); // 5 + 5
    });

    it('should replace derived stats', () => {
        const result = roll('{Attack} + 2');
        expect(result.total).toBe(12); // 10 + 2
    });

    it('should roll dice (mock check)', () => {
        // Since we can't easily mock Math.random in this simple setup without a library,
        // we check if the result is within valid range.
        const result = roll('1d6');
        expect(result.total).toBeGreaterThanOrEqual(1);
        expect(result.total).toBeLessThanOrEqual(6);
        expect(result.details).toMatch(/\[\d+\]/);
    });

    it('should handle complex formulas', () => {
        const result = roll('2d6 + {Body}');
        expect(result.total).toBeGreaterThanOrEqual(7); // 2 + 5
        expect(result.total).toBeLessThanOrEqual(17); // 12 + 5
    });

    it('should detect criticals (max roll)', () => {
        // We can't force a crit without mocking, but we can check the flag exists
        const result = roll('1d1'); // Always 1
        expect(result.isCritical).toBe(true);
    });

    it('should detect fumbles (min roll)', () => {
        // 1d1 is both max and min, so it might be both depending on logic order
        // Let's check logic: if (rolls.every(r => r === sides)) isCritical = true;
        // if (rolls.every(r => r === 1)) isFumble = true;
        // For 1d1: sides=1. roll=1. 1===1 (Crit). 1===1 (Fumble).
        // Both true.
        const result = roll('1d1');
        expect(result.isFumble).toBe(true);
    });

    it('should return error for invalid formula', () => {
        const result = DiceRoller.roll('1 +', mockContext);
        expect(result.isFailure).toBe(true);
        if (result.isFailure) {
            expect(result.error.code).toBe('CALCULATION_ERROR');
        }
    });
});
