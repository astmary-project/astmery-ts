/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { CharacterLogFactory } from '../CharacterLogFactory';
// import { SkillEntity } from '../Skill'; // Can mock

describe('CharacterLogFactory', () => {
    it('should create STAT_GROWN log', () => {
        const log = CharacterLogFactory.createStatGrown('Body', 1, 10) as any;
        expect(log.type).toBe('STAT_GROWN');
        expect(log.key).toBe('Body');
        expect(log.delta).toBe(1);
        expect(log.cost).toBe(10);
    });

    it('should create SKILL_LEARNED log', () => {
        const params = {
            name: 'Test Skill',
            type: 'Active',
            description: 'Desc',
            timing: 'Instant',
            xpCost: 15
        };
        const log = CharacterLogFactory.createSkillLearned(params) as any;

        expect(log.type).toBe('SKILL_LEARNED');
        expect(log.skill.name).toBe('Test Skill');
        expect(log.skill.category).toBe('ACTIVE');
        expect(log.acquisitionMethod).toBe('Standard');
        expect(log.cost).toBe(15);
    });

    it('should create ITEM_ADDED log', () => {
        const params = {
            name: 'Test Sword',
            category: 'EQUIPMENT' as const,
            description: 'Desc',
        };
        const log = CharacterLogFactory.createItemAdded(params) as any;

        expect(log.type).toBe('ITEM_ADDED');
        expect(log.item.name).toBe('Test Sword');
        expect(log.item.category).toBe('EQUIPMENT');
        expect(log.source).toBe('EVENT');
    });

    it('should create ITEM_EQUIPPED log', () => {
        const log = CharacterLogFactory.createItemEquipped('i1', 'MainHand') as any;
        expect(log.type).toBe('ITEM_EQUIPPED');
        expect(log.itemId).toBe('i1');
        expect(log.slot).toBe('MainHand');
    });
});
