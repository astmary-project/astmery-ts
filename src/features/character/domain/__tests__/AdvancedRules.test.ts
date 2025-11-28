import { describe, expect, it } from 'vitest';
import { CharacterCalculator } from '../CharacterCalculator';
import { CharacterLogEntry } from '../CharacterLog';

describe('Advanced Rules', () => {
    describe('Japanese Variable Resolution', () => {
        it('should resolve Japanese stat names to English keys', () => {
            const logs: CharacterLogEntry[] = [
                { id: '1', type: 'GROWTH', timestamp: 1, statKey: 'Body', value: 10 },
            ];
            const state = CharacterCalculator.calculateState(logs);

            // Formula using "肉体" (Body)
            const result = CharacterCalculator.evaluateFormula('{肉体} * 2', state);
            expect(result).toBe(20);
        });

        it('should handle custom Japanese stats', () => {
            const logs: CharacterLogEntry[] = [
                { id: '1', type: 'GROWTH', timestamp: 1, statKey: '暗黒パワー', value: 50 }, // Custom stat "Dark Power"
            ];
            const state = CharacterCalculator.calculateState(logs);

            // Formula using custom Japanese stat
            const result = CharacterCalculator.evaluateFormula('{暗黒パワー} + 10', state);
            expect(result).toBe(60);
        });

        it('should handle mixed English and Japanese formulas', () => {
            const logs: CharacterLogEntry[] = [
                { id: '1', type: 'GROWTH', timestamp: 1, statKey: 'Body', value: 10 },
                { id: '2', type: 'GROWTH', timestamp: 1, statKey: 'Spirit', value: 5 },
            ];
            const state = CharacterCalculator.calculateState(logs);

            // Body (English) + 精神 (Spirit in JP)
            const result = CharacterCalculator.evaluateFormula('{Body} + {精神}', state);
            expect(result).toBe(15);
        });
    });

    describe('Recursive Formulas', () => {
        it('should handle dependency chains', () => {
            const logs: CharacterLogEntry[] = [
                { id: '1', type: 'GROWTH', timestamp: 1, statKey: 'Base', value: 10 },
                // Item that defines Derived1 based on Base
                {
                    id: '2', type: 'EQUIP', timestamp: 2, item: {
                        id: 'i1', name: 'Item1', type: 'Other', description: '',
                        formulaOverrides: { 'Derived1': '{Base} * 2' }
                    }
                },
                // Skill that defines Derived2 based on Derived1
                {
                    id: '3', type: 'LEARN_SKILL', timestamp: 3, skill: {
                        id: 's1', name: 'Skill1', type: 'Passive', description: '',
                        formulaOverrides: { 'Derived2': '{Derived1} + 5' }
                    }
                }
            ];
            const state = CharacterCalculator.calculateState(logs);

            // Derived1 = 10 * 2 = 20
            expect(state.derivedStats['Derived1']).toBe(20);
            // Derived2 = 20 + 5 = 25
            expect(state.derivedStats['Derived2']).toBe(25);
        });

        it('should handle self-reference gracefully (avoid infinite loop or return 0/NaN)', () => {
            // Note: mathjs might throw or return weird values for circular deps if not handled carefully.
            // Our current implementation evaluates formulas in a specific order (defaults -> overrides).
            // It does NOT automatically resolve dependencies order.
            // `calculateDerivedStats` iterates over keys. If A depends on B, and A is calculated before B, it uses B's initial value (or 0).
            // This test documents CURRENT behavior, which might be "order dependent".

            const logs: CharacterLogEntry[] = [
                {
                    id: '1', type: 'EQUIP', timestamp: 1, item: {
                        id: 'i1', name: 'Loop', type: 'Other', description: '',
                        formulaOverrides: {
                            'A': '{B} + 1',
                            'B': '{A} + 1'
                        }
                    }
                }
            ];
            const state = CharacterCalculator.calculateState(logs);

            // Since we don't have a dependency graph solver, one will be 0 (or undefined treated as 0) and the other will be 1.
            // Or both 0 if neither exists in stats yet.
            // This test just ensures it doesn't crash.
            expect(state.derivedStats['A']).toBeDefined();
            expect(state.derivedStats['B']).toBeDefined();
        });
    });

    describe('Granted Stats and Resources', () => {
        it('should add granted stats to custom labels and main stats', () => {
            const logs: CharacterLogEntry[] = [
                {
                    id: '1', type: 'LEARN_SKILL', timestamp: 1, skill: {
                        id: 's1', name: 'Granting Skill', type: 'Passive', description: '',
                        grantedStats: [
                            { key: 'NewStat', label: '新しい能力', value: 10, isMain: true }
                        ]
                    }
                }
            ];
            const state = CharacterCalculator.calculateState(logs);

            expect(state.stats['NewStat']).toBe(10);
            expect(state.customLabels['NewStat']).toBe('新しい能力');
            expect(state.customMainStats).toContain('NewStat');
        });

        it('should add granted resources', () => {
            const logs: CharacterLogEntry[] = [
                {
                    id: '1', type: 'EQUIP', timestamp: 1, item: {
                        id: 'i1', name: 'Battery', type: 'Accessory', description: '',
                        grantedResources: [
                            { id: 'Energy', name: 'Energy', max: 100, min: 0, initial: 100 }
                        ]
                    }
                }
            ];
            const state = CharacterCalculator.calculateState(logs);

            expect(state.resources).toHaveLength(3); // HP, MP (default) + Energy
            const energy = state.resources.find(r => r.id === 'Energy');
            expect(energy).toBeDefined();
            expect(energy?.max).toBe(100);
        });
    });

    describe('Skill Acquisition Types', () => {
        it('should correctly categorize skills', () => {
            const logs: CharacterLogEntry[] = [
                {
                    id: '1', type: 'LEARN_SKILL', timestamp: 1, skill: {
                        id: 's1', name: 'Free Skill', type: 'Passive', description: '',
                        acquisitionType: 'Free'
                    }
                },
                {
                    id: '2', type: 'LEARN_SKILL', timestamp: 2, skill: {
                        id: 's2', name: 'Standard Skill', type: 'Active', description: '',
                        acquisitionType: 'Standard'
                    }
                },
                {
                    id: '3', type: 'LEARN_SKILL', timestamp: 3, skill: {
                        id: 's3', name: 'Grade Skill', type: 'Other', description: '',
                        acquisitionType: 'Grade'
                    }
                }
            ];
            const state = CharacterCalculator.calculateState(logs);

            expect(state.skills).toHaveLength(3);
            expect(state.skills.filter(s => s.acquisitionType === 'Free')).toHaveLength(1);
            expect(state.skills.filter(s => s.acquisitionType === 'Standard')).toHaveLength(1);
            expect(state.skills.filter(s => s.acquisitionType === 'Grade')).toHaveLength(1);
        });
    });
});
