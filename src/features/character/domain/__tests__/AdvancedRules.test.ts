/* eslint-disable @typescript-eslint/no-explicit-any */
import { Timestamp } from '@/domain/values/time';
import { describe, expect, it } from 'vitest';
import { CharacterCalculator } from '../CharacterCalculator';
import { CharacterEvent } from '../Event';

const mkEvent = (e: any) => ({
    timestamp: 1 as Timestamp,
    ...e
} as CharacterEvent);

describe('Advanced Rules', () => {
    describe('Japanese Variable Resolution via Events', () => {
        it('should resolve Japanese stat names provided in logs', () => {
            // Note: CharacterCalculator usually expects English keys in 'delta', 
            // but if we support Japanese input via 'key' field mapping logic inside Factory or Calculator,
            // we should test it.
            // Assumption: STAT_GROWN usually uses English keys internally after UI processing.
            // But if we pass Japanese key, does it work?
            // CharacterCalculator.applyLog -> STAT_GROWN -> updates stats[key].
            // If CharacterCalculator doesn't normalize 'key', it stays Japanese.
            // evaluateFormula supports {} lookups which handle mapping.

            const logs = [
                mkEvent({ id: '1', type: 'STAT_GROWN', key: '肉体', delta: 10, cost: 0 }),
            ];
            const state = CharacterCalculator.calculateState(logs);

            // Access via English? NO.
            // It will be saved as stats['肉体'].
            // BUT evaluateFormula('{肉体}') should find it.
            // AND evaluateFormula('{Body}') should find it IF mapping exists? 
            // Actually, currently JAPANESE_TO_ENGLISH mapping is for Formula keys -> State keys.
            // If state has '肉体', and formula is '{Body}', mapping Body->Body. result undefined.
            // If state has 'Body', and formula is '{肉体}', mapping 肉体->Body. result 10.
            // So for this to work, we prefer storing English keys. 
            // But let's verify behaviors.

            // Support: Japanese KEY in state + Japanese Formula
            const result = CharacterCalculator.evaluateFormula('{肉体} * 2', state);
            expect(result).toBe(20);
        });
    });

    describe('Granted Stats and Resources', () => {
        it('should add granted stats to custom labels and main stats', () => {
            const logs = [
                mkEvent({
                    id: '1', type: 'SKILL_LEARNED',
                    acquisitionMethod: 'Standard',
                    skill: {
                        id: 's1', name: 'Granting Skill', category: 'PASSIVE', description: '',
                        grantedStats: [
                            { key: 'NewStat', label: '新しい能力', value: '10', isMain: true }
                        ],
                        variants: { default: {} }, currentVariant: 'default'
                    }
                })
            ];
            const state = CharacterCalculator.calculateState(logs);

            expect(state.stats['NewStat']).toBe(10);
            expect(state.customLabels['NewStat']).toBe('新しい能力');
            expect(state.customMainStats).toContain('NewStat');
        });

        it('should add granted resources via Item', () => {
            // Check if Items granting resources works (via implicit passiveSkills or maybe just logic support)
            // InventoryItem doesn't directly support `grantedResources`.
            // It supports `passiveSkills`.
            const logs = [
                mkEvent({
                    id: '1', type: 'ITEM_ADDED', source: 'INITIAL',
                    item: {
                        id: 'i1', name: 'Battery', category: 'EQUIPMENT', slot: 'Acc', description: '',
                        variants: { default: {} }, currentVariant: 'default',
                        passiveSkills: [
                            {
                                id: 'ps1', name: 'Battery Passive', category: 'PASSIVE', description: '',
                                grantedResources: [
                                    { id: 'Energy', name: 'Energy', max: '100', min: '0', initial: '100' }
                                ],
                                variants: { default: {} }, currentVariant: 'default'
                            }
                        ]
                    }
                }),
                mkEvent({ id: '2', type: 'ITEM_EQUIPPED', itemId: 'i1', slot: 'Acc' })
            ];
            const state = CharacterCalculator.calculateState(logs);

            expect(state.resources).toHaveLength(3); // HP, MP + Energy
            const energy = state.resources.find((r: any) => r.id === 'Energy');
            expect(energy).toBeDefined();
            expect(energy?.max).toBe('100');
        });
    });

    describe('Skill Acquisition Types', () => {
        it('should correctly categorize skills by acquisitionMethod', () => {
            const logs = [
                mkEvent({
                    id: '1', type: 'SKILL_LEARNED', acquisitionMethod: 'Free',
                    skill: { id: 's1', name: 'Free Skill', category: 'PASSIVE', description: '', variants: { default: {} }, currentVariant: 'default', acquisitionMethod: 'Free' }
                }),
                mkEvent({
                    id: '2', type: 'SKILL_LEARNED', acquisitionMethod: 'Standard',
                    skill: { id: 's2', name: 'Standard Skill', category: 'ACTIVE', description: '', variants: { default: {} }, currentVariant: 'default', acquisitionMethod: 'Standard' }
                }),
                mkEvent({
                    id: '3', type: 'SKILL_LEARNED', acquisitionMethod: 'Grade',
                    skill: { id: 's3', name: 'Grade Skill', category: 'PASSIVE', description: '', variants: { default: {} }, currentVariant: 'default', acquisitionMethod: 'Grade' }
                })
            ];
            const state = CharacterCalculator.calculateState(logs);

            expect(state.skills).toHaveLength(3);
            expect(state.skills.filter((s: any) => s.acquisitionMethod === 'Free')).toHaveLength(1);
            expect(state.skills.filter((s: any) => s.acquisitionMethod === 'Standard')).toHaveLength(1);
            expect(state.skills.filter((s: any) => s.acquisitionMethod === 'Grade')).toHaveLength(1);
        });
    });
});
