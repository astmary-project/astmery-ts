export type CharacterLogType =
    | 'GROWTH'
    | 'SET_VALUE'
    | 'ADD_TAG'
    | 'REMOVE_TAG'
    | 'EQUIP'
    | 'UNEQUIP'
    | 'LEARN_SKILL'
    | 'FORGET_SKILL'
    | 'GAIN_EXP'
    | 'SPEND_EXP';

export interface CharacterLogEntry {
    id: string;
    type: CharacterLogType;
    timestamp: number;
    // Common fields
    statKey?: string;
    value?: number;
    stringValue?: string; // For formulas or non-numeric values
    tagId?: string;
    item?: Item;
    skill?: Skill;
    // Metadata
    description?: string;
}

export interface Skill {
    id: string;
    name: string;
    type: 'Active' | 'Passive' | 'Spell' | 'Other';
    description: string;
    // Mechanics
    timing?: string;
    cooldown?: string;
    target?: string;
    range?: string;
    cost?: string;
    roll?: string;
    effect?: string;
    // Dynamic effects
    formulaOverrides?: Record<string, string>; // e.g., { "Defense": "Body + 5" }
    statModifiers?: Record<string, number>; // Fixed adds e.g. { "Science": 1 }
}

export interface Item {
    id: string;
    name: string;
    type: 'Focus' | 'Weapon' | 'Armor' | 'Accessory' | 'Other';
    description: string;
    // Dynamic effects
    formulaOverrides?: Record<string, string>;
    statModifiers?: Record<string, number>; // Fixed adds e.g. { "STR": 1 }
}

export interface CharacterState {
    stats: Record<string, number>;
    tags: Set<string>;
    equipment: Item[]; // Changed from Set<string> to Item[] to store full data
    skills: Skill[];   // Changed from Set<string> to Skill[]
    exp: {
        total: number;
        used: number;
        free: number; // calculated
    };
    // Computed properties (not stored in DB, but calculated)
    derivedStats: Record<string, number>;
}
