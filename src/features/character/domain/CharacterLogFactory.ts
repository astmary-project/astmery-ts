import { z } from "zod";
import { charEventId, createId, itemId, resourceId, skillId } from '../../../domain/values/ids';
import { now } from "../../../domain/values/time";
import { CharacterEvent } from "./Event";
import { EquipmentItemSchema, InventoryItemSchema } from "./Item";
import { ActiveSkillEntity, ActiveSkillSchema, PassiveSkillEntity, PassiveSkillSchema } from "./Skill"; // Import types and schemas
import { JAPANESE_TO_ENGLISH_STATS } from './constants';

export class CharacterLogFactory {
    /**
     * Normalizes keys in a JSON object (e.g. "筋力" -> "Body")
     */
    private static normalizeModifiers<T>(json: string | undefined, valueParser: (v: unknown) => T): Record<string, T> | undefined {
        if (!json) return undefined;
        try {
            const parsed = JSON.parse(json);
            const normalized: Record<string, T> = {};
            for (const [key, value] of Object.entries(parsed)) {
                const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                normalized[normalizedKey] = valueParser(value);
            }
            return normalized;
        } catch (e) {
            console.error('Invalid JSON for modifiers', e);
            return undefined;
        }
    }

    // --- Experience ---

    static createExperienceGained(amount: number, reason: string): CharacterEvent {
        return {
            id: charEventId(createId()),
            type: 'EXPERIENCE_GAINED',
            timestamp: now(),
            amount,
            reason,
            description: `Gained ${amount} EXP: ${reason}`,
        };
    }

    static createExperienceSpent(amount: number, target: string): CharacterEvent {
        return {
            id: charEventId(createId()),
            type: 'EXPERIENCE_SPENT',
            timestamp: now(),
            amount,
            target,
            description: `Spent ${amount} EXP on ${target}`,
        };
    }

    // --- Stats ---

    static createStatGrown(key: string, delta: number, cost?: number, comment?: string): CharacterEvent {
        return {
            id: charEventId(createId()),
            type: 'STAT_GROWN',
            timestamp: now(),
            key,
            delta,
            cost,
            description: comment || `Growth: ${key} +${delta}`,
        };
    }

    static createStatUpdated(key: string, valueFormula: string, isMainStat?: boolean): CharacterEvent {
        return {
            id: charEventId(createId()),
            type: 'STAT_UPDATED',
            timestamp: now(),
            key,
            value: valueFormula,
            isMainStat,
            description: `Updated stat ${key} to ${valueFormula}`,
        };
    }

    static createStatLabelRegistered(key: string, label: string, isMain: boolean): CharacterEvent {
        return {
            id: charEventId(createId()),
            type: 'STAT_LABEL_REGISTERED',
            timestamp: now(),
            key,
            label,
            isMain,
            description: `Registered label: ${key} -> ${label}`,
        };
    }

    // --- Resources ---

    static createResourceDefined(name: string, max: string, min: string = '0', initial: string = '0', resetMode: 'initial' | 'none' = 'initial'): CharacterEvent {
        return {
            id: charEventId(createId()),
            type: 'RESOURCE_DEFINED',
            timestamp: now(),
            resource: {
                id: resourceId(createId()),
                name,
                max,
                min,
                initial,
                resetMode,
            },
            description: `Defined resource: ${name}`,
        };
    }

    // --- Items ---

    static createItemAdded(params: {
        name: string;
        category: 'CONSUMABLE' | 'EQUIPMENT';
        slot?: string; // For EQUIPMENT only
        quantity?: number; // For CONSUMABLE only
        description?: string;
        // Old params mapping
        subtype?: string;
        timing?: string;
        range?: string;
        modifiersJson?: string;
        dynamicModifiersJson?: string;
    }): CharacterEvent {
        // Construct Item Entity based on category
        const newItemId = itemId(createId());
        let item: z.infer<typeof InventoryItemSchema>;

        const statModifiers = this.normalizeModifiers(params.modifiersJson, Number);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const dynamicModifiers = this.normalizeModifiers(params.dynamicModifiersJson, String);

        if (params.category === 'EQUIPMENT') {
            item = EquipmentItemSchema.parse({
                category: 'EQUIPMENT',
                id: newItemId,
                name: params.name,
                slot: params.slot || 'End', // Fallback
                description: params.description || '',
                currentVariant: 'default',
                variants: {
                    default: {
                        modifiers: statModifiers ? Object.fromEntries(
                            Object.entries(statModifiers).map(([k, v]) => [k, v.toString()])
                        ) : undefined,
                        // If we had dynamicModifiers, they might go into overrides or mapped elsewhere.
                        // For now, mapping simple ones.
                        // Note: PassiveEffectSchema expects FormulaSchema (string) for modifiers.
                    }
                }
            });
            // Legacy field mapping if needed: timing/range used to be stored on item, now variants?
        } else {
            item = {
                category: 'CONSUMABLE',
                id: newItemId, // ここは型エラーになるかも？StackableならID不要説もあるがSchemaに従う
                name: params.name,
                quantity: params.quantity || 1,
                description: params.description || '',
            };
        }

        return {
            id: charEventId(createId()),
            type: 'ITEM_ADDED',
            timestamp: now(),
            item,
            source: 'EVENT', // Default
            description: `Added item: ${params.name}`,
        };
    }

    static createItemEquipped(itemIdParam: string, slot: string): CharacterEvent {
        return {
            id: charEventId(createId()),
            type: 'ITEM_EQUIPPED',
            timestamp: now(),
            itemId: itemId(itemIdParam),
            slot,
            description: `Equipped item ${itemIdParam} to ${slot}`,
        };
    }

    static createItemUnequipped(itemIdParam: string, slot?: string): CharacterEvent {
        return {
            id: charEventId(createId()),
            type: 'ITEM_UNEQUIPPED',
            timestamp: now(),
            itemId: itemId(itemIdParam),
            slot,
            description: `Unequipped item ${itemIdParam}`,
        };
    }


    // --- Skills ---

    static createSkillLearned(params: {
        name: string;
        type: string; // "Active" | "Passive" etc logic needed
        description: string;
        timing?: string;
        range?: string;
        target?: string;
        cost?: string;
        modifiersJson?: string;
        dynamicModifiersJson?: string;
        xpCost?: number;
    }): CharacterEvent {
        const newSkillId = skillId(createId());

        const statModifiers = this.normalizeModifiers(params.modifiersJson, Number);
        // Note: New schema expects dictionary of formulas (strings) for modifiers in PassiveEffectSchema
        const modifiersAsString = statModifiers ? Object.fromEntries(
            Object.entries(statModifiers).map(([k, v]) => [k, v.toString()])
        ) : undefined;

        // Determine Category based on type/subtype
        // Basic heuristic: check if it acts like a passive (stats only) or active (timing/roll)
        // For safe fallback, we'll try to map based on params.

        let skill: ActiveSkillEntity | PassiveSkillEntity;

        // If it sends modifiers, treat as Passive (or Hybrid, but mapped to Passive for stat calc)
        // If it has timing/range, treat as Active.
        // Actually, the new schema separates them firmly.
        const isPassive = !!modifiersAsString || (!params.timing && !params.range && !params.cost);

        if (isPassive) {
            skill = PassiveSkillSchema.parse({
                id: newSkillId,
                name: params.name,
                description: params.description,
                category: 'PASSIVE',
                tags: [params.type], // Store original type string as tag
                currentVariant: 'default',
                variants: {
                    default: {
                        modifiers: modifiersAsString,
                        // dynamicModifiers mappings would go here as overrides or similar
                    }
                }
            });
        } else {
            skill = ActiveSkillSchema.parse({
                id: newSkillId,
                name: params.name,
                description: params.description,
                category: 'ACTIVE',
                subType: params.type,
                tags: [],
                currentVariant: 'default',
                variants: {
                    default: {
                        timing: params.timing,
                        range: params.range,
                        target: params.target,
                        cost: params.cost,
                    }
                }
            });
        }

        return {
            id: charEventId(createId()),
            type: 'SKILL_LEARNED',
            timestamp: now(),
            skill: skill,
            acquisitionMethod: 'Standard', // Default
            cost: params.xpCost,
            description: `Learned skill: ${params.name}`,
        };
    }
}
