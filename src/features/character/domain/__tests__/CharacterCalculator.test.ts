import { describe, expect, it } from 'vitest';
import { CharacterCalculator } from '../CharacterCalculator';
import { CharacterLogEntry } from '../CharacterLog';

describe('CharacterCalculator', () => {
    it('should aggregate growth logs correctly', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROW_STAT', timestamp: 1, statGrowth: { key: 'STR', value: 5, cost: 0 } },
            { id: '2', type: 'GROW_STAT', timestamp: 2, statGrowth: { key: 'STR', value: 3, cost: 0 } },
            { id: '3', type: 'GROW_STAT', timestamp: 3, statGrowth: { key: 'DEX', value: 10, cost: 0 } },
        ];

        const state = CharacterCalculator.calculateState(logs);
        expect(state.stats['STR']).toBe(8);
        expect(state.stats['DEX']).toBe(10);
    });

    it('should handle ad-hoc stats', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROW_STAT', timestamp: 1, statGrowth: { key: 'DarkPower', value: 666, cost: 0 } },
        ];

        const state = CharacterCalculator.calculateState(logs);
        expect(state.stats['DarkPower']).toBe(666);
    });

    it('should evaluate formulas with stats', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROW_STAT', timestamp: 1, statGrowth: { key: 'Grade', value: 2, cost: 0 } },
            { id: '2', type: 'GROW_STAT', timestamp: 1, statGrowth: { key: 'Body', value: 4, cost: 0 } },
        ];
        const state = CharacterCalculator.calculateState(logs);

        // HP = (Grade + Body) * 5
        const hp = CharacterCalculator.evaluateFormula('({Grade} + {Body}) * 5', state);
        expect(hp).toBe(30); // (2 + 4) * 5 = 30
    });

    it('should support floats and math functions', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROW_STAT', timestamp: 1, statGrowth: { key: 'A', value: 10, cost: 0 } },
        ];
        const state = CharacterCalculator.calculateState(logs);

        // sqrt(A) * 2.5
        const val = CharacterCalculator.evaluateFormula('sqrt({A}) * 2.5', state);
        expect(val).toBeCloseTo(Math.sqrt(10) * 2.5);
    });

    it('should support conditionals', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROW_STAT', timestamp: 1, statGrowth: { key: 'HP', value: 5, cost: 0 } },
        ];
        const state = CharacterCalculator.calculateState(logs);

        // if HP < 10 then 1 else 0
        // mathjs supports ternary operator
        const result = CharacterCalculator.evaluateFormula('{HP} < 10 ? 1 : 0', state);
        expect(result).toBe(1);

        const result2 = CharacterCalculator.evaluateFormula('{HP} > 10 ? 1 : 0', state);
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

    it('should calculate derived stats with defaults and overrides', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROW_STAT', timestamp: 1, statGrowth: { key: 'Grade', value: 10, cost: 0 } },
            { id: '2', type: 'GROW_STAT', timestamp: 1, statGrowth: { key: 'Body', value: 5, cost: 0 } },
            // Default HP = (Grade + Body) * 5 = (10 + 5) * 5 = 75

            // Item with override
            {
                id: '3',
                type: 'EQUIP',
                timestamp: 2,
                item: {
                    id: 'shield',
                    name: 'Shield',
                    type: 'Armor',
                    description: '',
                    formulaOverrides: { 'Defense': '{Body} * 3' } // Override default Body * 2
                }
            },
            // Skill with additive bonus
            {
                id: '4',
                type: 'LEARN_SKILL',
                timestamp: 3,
                skill: {
                    id: 'toughness',
                    name: 'Toughness',
                    type: 'Passive',
                    description: '',
                    statModifiers: { 'MaxHP': 10 } // Add 10 to HP
                }
            }
        ];
        const state = CharacterCalculator.calculateState(logs);

        // HP: Formula (75) + Bonus (10) = 85
        expect(state.derivedStats['MaxHP']).toBe(85);

        // Defense: Overridden Formula (Body * 3) = 5 * 3 = 15 (Default would be 10)
        expect(state.derivedStats['Defense']).toBe(15);
    });

    it('should apply SessionContext', () => {
        const logs: CharacterLogEntry[] = [
            { id: '1', type: 'GROW_STAT', timestamp: 1, statGrowth: { key: 'Body', value: 10, cost: 0 } },
        ];
        const logs2: CharacterLogEntry[] = [];
        const sessionContext: CharacterCalculator.SessionContext = {
            tempStats: { 'Strength': 5 },
            tempSkills: [{ id: 'temp', name: 'Temp Skill', type: 'Passive', description: '' }],
            tempItems: [{ id: 'tempItem', name: 'Temp Item', type: 'Other', description: '' }]
        };

        const state = CharacterCalculator.calculateState(logs2, { Strength: 10 }, sessionContext);

        // Strength: 10 (Base) + 5 (Temp) = 15
        expect(state.stats['Strength']).toBe(15);
        expect(state.skills).toHaveLength(1);
        expect(state.skills[0].name).toBe('Temp Skill');
        expect(state.equipment).toHaveLength(1);
        expect(state.equipment[0].name).toBe('Temp Item');
    });

    it('should apply GROW_STAT logs correctly', () => {
        const logs: CharacterLogEntry[] = [
            {
                id: '1',
                type: 'GROW_STAT',
                timestamp: 100,
                statGrowth: { key: 'Strength', value: 1, cost: 10 }
            },
            {
                id: '2',
                type: 'GROW_STAT',
                timestamp: 200,
                statGrowth: { key: 'Strength', value: 1, cost: 10 }
            }
        ];

        const state = CharacterCalculator.calculateState(logs, { Strength: 10 });

        expect(state.stats['Strength']).toBe(12); // 10 + 1 + 1
    });

    it('should calculate dynamic modifiers', () => {
        const logs: CharacterLogEntry[] = [
            {
                id: '1',
                type: 'GROW_STAT',
                timestamp: 1,
                statGrowth: { key: 'Strength', value: 10, cost: 0 }
            },
            // Skill that adds half Strength to Attack
            {
                id: '2',
                type: 'LEARN_SKILL',
                timestamp: 2,
                skill: {
                    id: 'muscle_power',
                    name: 'Muscle Power',
                    type: 'Passive',
                    description: '',
                    dynamicModifiers: { 'Attack': '{Strength} / 2' }
                }
            }
        ];
        const state = CharacterCalculator.calculateState(logs);

        // Attack = 10 / 2 = 5
        expect(state.stats['Attack']).toBe(5);
    });

    it('should manage skills', () => {
        const logs: CharacterLogEntry[] = [
            {
                id: '1',
                type: 'LEARN_SKILL',
                timestamp: 1,
                skill: { id: 'skill-1', name: 'Fireball', type: 'Spell', description: 'Boom' }
            },
        ];
        const state = CharacterCalculator.calculateState(logs);

        expect(state.skills).toHaveLength(1);
        expect(state.skills[0].id).toBe('skill-1');
    });

    it('should update skills', () => {
        const logs: CharacterLogEntry[] = [
            {
                id: '1', type: 'LEARN_SKILL', timestamp: 100,
                skill: { id: 'skill-1', name: 'Fireball', type: 'Spell', description: 'Boom' }
            },
            {
                id: '2', type: 'UPDATE_SKILL', timestamp: 200,
                skill: { id: 'skill-1', name: 'Fireball II', description: 'Big Boom' } as any
            }
        ];

        const state = CharacterCalculator.calculateState(logs);
        expect(state.skills).toHaveLength(1);
        expect(state.skills[0].name).toBe('Fireball II');
        expect(state.skills[0].description).toBe('Big Boom');
        expect(state.skills[0].type).toBe('Spell'); // Should preserve other fields
    });

    it('should update items', () => {
        const logs: CharacterLogEntry[] = [
            {
                id: '1', type: 'EQUIP', timestamp: 100,
                item: { id: 'item-1', name: 'Sword', type: 'Weapon', description: 'Sharp' }
            },
            {
                id: '2', type: 'UPDATE_ITEM', timestamp: 200,
                item: { id: 'item-1', name: 'Sword +1', roll: '2d6+1' } as any
            }
        ];

        const state = CharacterCalculator.calculateState(logs);
        expect(state.equipment).toHaveLength(1);
        expect(state.equipment[0].name).toBe('Sword +1');
        expect(state.equipment[0].roll).toBe('2d6+1');
        expect(state.equipment[0].type).toBe('Weapon'); // Should preserve other fields
    });

    it('should normalize Japanese stat keys', () => {
        const logs: CharacterLogEntry[] = [
            {
                id: '1', type: 'GROW_STAT', timestamp: 1,
                statGrowth: { key: '肉体', value: 5, cost: 0 }
            },
            {
                id: '2', type: 'GROW_STAT', timestamp: 2,
                statGrowth: { key: '精神', value: 4, cost: 0 }
            }
        ];

        const state = CharacterCalculator.calculateState(logs);
        expect(state.stats['Body']).toBe(5);
        expect(state.stats['Spirit']).toBe(4);
    });
});

describe('CharacterCalculator Cost Logic', () => {
    it('should calculate stat costs correctly', () => {
        // Normal Stat: Current * 5
        expect(CharacterCalculator.calculateStatCost(3, false)).toBe(15);
        expect(CharacterCalculator.calculateStatCost(0, false)).toBe(0); // Edge case

        // Grade: Current * 10
        expect(CharacterCalculator.calculateStatCost(1, true)).toBe(10);
        expect(CharacterCalculator.calculateStatCost(2, true)).toBe(20);
    });

    it('should calculate skill costs correctly', () => {
        // Grade Skill
        // Success: 0
        expect(CharacterCalculator.calculateSkillCost(0, 'Grade').success).toBe(0);
        // Failure (1st): 0
        expect(CharacterCalculator.calculateSkillCost(0, 'Grade', false).failure).toBe(0);
        // Failure (Retry): 1
        expect(CharacterCalculator.calculateSkillCost(0, 'Grade', true).failure).toBe(1);

        // Free/Standard Skill
        // Cost: (Current + 1) * 5
        expect(CharacterCalculator.calculateSkillCost(0, 'Free').success).toBe(5); // (0+1)*5
        expect(CharacterCalculator.calculateSkillCost(1, 'Free').success).toBe(10); // (1+1)*5

        // Failure: 1
        expect(CharacterCalculator.calculateSkillCost(0, 'Free').failure).toBe(1);
    });
});
