import { CharacterLogEntry, Item, Skill } from './CharacterLog';
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

    static createSkillLog(params: {
        name: string;
        type: string;
        description: string;
        timing?: string;
        range?: string;
        target?: string;
        cost?: string;
        modifiersJson?: string;
        dynamicModifiersJson?: string;
    }): CharacterLogEntry {
        const skill: Skill = {
            id: crypto.randomUUID(),
            name: params.name,
            type: params.type,
            description: params.description,
            timing: params.timing,
            range: params.range,
            target: params.target,
            cost: params.cost,
            statModifiers: this.normalizeModifiers(params.modifiersJson, Number),
            dynamicModifiers: this.normalizeModifiers(params.dynamicModifiersJson, String),
        };

        return {
            id: crypto.randomUUID(),
            type: 'LEARN_SKILL',
            timestamp: Date.now(),
            skill,
            description: `Learned skill: ${params.name}`,
        };
    }

    static createItemLog(params: {
        name: string;
        subtype: string;
        description: string;
        timing?: string; // Used for roll/effect mapping
        range?: string;  // Used for roll/effect mapping
        modifiersJson?: string;
        dynamicModifiersJson?: string;
    }): CharacterLogEntry {
        const item: Item = {
            id: crypto.randomUUID(),
            name: params.name,
            type: params.subtype as Item['type'],
            description: params.description,
            // Reuse timing/range fields for roll/effect to save state variables in UI
            roll: (params.subtype === 'Weapon' || params.subtype === 'Focus') ? params.timing : undefined,
            effect: (params.subtype === 'Weapon' || params.subtype === 'Focus') ? params.range : undefined,
            statModifiers: this.normalizeModifiers(params.modifiersJson, Number),
            dynamicModifiers: this.normalizeModifiers(params.dynamicModifiersJson, String),
        };

        return {
            id: crypto.randomUUID(),
            type: 'EQUIP',
            timestamp: Date.now(),
            item,
            description: `Equipped item: ${params.name}`,
        };
    }

    static createGrowthLog(statKey: string, value: number, comment?: string): CharacterLogEntry {
        return {
            id: crypto.randomUUID(),
            type: 'GROWTH',
            timestamp: Date.now(),
            statKey,
            value,
            description: comment || `Growth: ${statKey} +${value}`,
        };
    }

    static createGainExpLog(value: number, description: string): CharacterLogEntry {
        return {
            id: crypto.randomUUID(),
            type: 'GAIN_EXP',
            timestamp: Date.now(),
            value,
            description,
        };
    }

    static createSpendExpLog(value: number, description: string): CharacterLogEntry {
        return {
            id: crypto.randomUUID(),
            type: 'SPEND_EXP',
            timestamp: Date.now(),
            value,
            description,
        };
    }

    static createRegisterStatLabelLog(statKey: string, name: string, isMainStat: boolean): CharacterLogEntry {
        return {
            id: crypto.randomUUID(),
            type: 'REGISTER_STAT_LABEL',
            timestamp: Date.now(),
            statKey,
            stringValue: name,
            isMainStat,
            description: `Registered label: ${statKey} -> ${name}`,
        };
    }

    static createRegisterResourceLog(name: string, max: number, initial: number): CharacterLogEntry {
        return {
            id: crypto.randomUUID(),
            type: 'REGISTER_RESOURCE',
            timestamp: Date.now(),
            resource: {
                id: crypto.randomUUID(),
                name,
                max,
                min: 0, // Default min
                initial,
            },
            description: `Registered resource: ${name}`,
        };
    }

    // Generic fallback for simple logs if needed, or specific ones for others
    static createSimpleLog(type: CharacterLogEntry['type'], description: string): CharacterLogEntry {
        return {
            id: crypto.randomUUID(),
            type,
            timestamp: Date.now(),
            description,
        };
    }
}
