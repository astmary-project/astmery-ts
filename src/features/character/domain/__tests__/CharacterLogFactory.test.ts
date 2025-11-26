import { describe, expect, it } from 'vitest';
import { CharacterLogFactory } from '../CharacterLogFactory';

describe('CharacterLogFactory', () => {
    it('should create a skill log with normalized modifiers', () => {
        const log = CharacterLogFactory.createSkillLog({
            name: 'Test Skill',
            type: 'Active',
            description: 'Test Description',
            modifiersJson: '{"肉体": 1}',
            dynamicModifiersJson: '{"戦闘能力": "肉体 * 2"}'
        });

        expect(log.type).toBe('LEARN_SKILL');
        expect(log.skill).toBeDefined();
        expect(log.skill?.statModifiers).toEqual({ 'Body': 1 });
        expect(log.skill?.dynamicModifiers).toEqual({ 'Combat': '肉体 * 2' }); // Value normalization happens in Calculator
        // Actually, CharacterLogFactory only normalizes KEYS. Values are passed as is (strings).
        // The value normalization (wrapping in data["..."]) happens in CharacterCalculator.normalizeFormula.
        // So here we expect the value to be exactly what was passed, unless we changed that.
        // Let's check CharacterLogFactory implementation.
    });

    it('should create an item log with normalized modifiers', () => {
        const log = CharacterLogFactory.createItemLog({
            name: 'Test Item',
            subtype: 'Weapon',
            description: 'Test Description',
            modifiersJson: '{"精神": 2}',
            dynamicModifiersJson: '{"魔力": "精神 + 1"}'
        });

        expect(log.type).toBe('EQUIP');
        expect(log.item).toBeDefined();
        expect(log.item?.statModifiers).toEqual({ 'Spirit': 2 });
        // Keys should be normalized
        expect(log.item?.dynamicModifiers).toHaveProperty('Magic');
    });
});
