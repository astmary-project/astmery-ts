export type CharacterLogType =
    | 'GROWTH'
    | 'SET_VALUE'
    | 'ADD_TAG'
    | 'REMOVE_TAG'
    | 'EQUIP'
    | 'UNEQUIP'
    | 'UPDATE_ITEM' // New: Update item details
    | 'LEARN_SKILL'
    | 'FORGET_SKILL'
    | 'UPDATE_SKILL' // New: Update skill details
    | 'GAIN_EXP'
    | 'SPEND_EXP'
    | 'REGISTER_STAT_LABEL'
    | 'REGISTER_RESOURCE'
    | 'GROW_STAT' // New: Stat growth
    | 'ADD_WISHLIST_SKILL' // New: Add to wishlist
    | 'REMOVE_WISHLIST_SKILL' // New: Remove from wishlist
    | 'UPDATE_WISHLIST_SKILL'; // New: Update wishlist skill

export interface CharacterLogEntry {
    id: string;
    type: CharacterLogType;
    timestamp: number;
    // Common fields
    statKey?: string;
    value?: number;
    stringValue?: string; // For formulas or non-numeric values
    isMainStat?: boolean; // If true, this stat is added to the main stats list
    tagId?: string;
    item?: Item;
    skill?: Skill;
    resource?: Resource;
    statGrowth?: {
        key: string;
        value: number;
        cost: number;
    };
    // Metadata
    description?: string;
}



export interface Resource {
    id: string;
    name: string;
    max: number; // For now fixed number, could be formula later
    min: number; // Added: Minimum value (default 0)
    initial: number;
    resetMode?: 'initial' | 'none'; // Default 'initial'
}

export interface Skill {
    id: string;
    name: string;
    type: string; // 'Active' | 'Passive' | 'Spell' | 'Other' | Custom
    acquisitionType?: 'Free' | 'Standard' | 'Grade'; // New: Acquisition Type
    description: string;
    // Mechanics
    timing?: string;
    cooldown?: string;
    target?: string;
    range?: string;
    cost?: string;
    rollModifier?: string; // Changed from roll
    effect?: string;
    restriction?: string; // New: Restriction text
    // Detailed Mechanics
    magicGrade?: string; // 魔術グレード
    shape?: string;      // 形状
    duration?: string;   // 継続
    activeCheck?: string; // 能動判定
    passiveCheck?: string; // 受動判定
    chatPalette?: string; // チャットパレット
    // Dynamic effects
    formulaOverrides?: Record<string, string>; // e.g., { "Defense": "Body + 5" }
    statModifiers?: Record<string, number>; // Fixed adds e.g. { "Science": 1 }
    dynamicModifiers?: Record<string, string>; // Formula adds e.g. { "Attack": "Strength / 2" }
    // Custom Definitions
    grantedStats?: { key: string; label: string; value: number; isMain?: boolean }[];
    grantedResources?: Resource[];
}

export interface Item {
    id: string;
    name: string;
    type: 'Focus' | 'Weapon' | 'Armor' | 'Accessory' | 'Other';
    description: string;
    // Dynamic effects
    formulaOverrides?: Record<string, string>;
    statModifiers?: Record<string, number>; // Fixed adds e.g. { "STR": 1 }
    dynamicModifiers?: Record<string, string>; // Formula adds e.g. { "Weight": "Strength * 2" }
    // Mechanics (for Weapons/Items with active use)
    roll?: string; // e.g. "2d6 + Combat"
    effect?: string; // e.g. "k20 + Combat + 5"
    // Custom Definitions
    grantedStats?: { key: string; label: string; value: number; isMain?: boolean }[];
    grantedResources?: Resource[];
}

export interface CharacterState {
    stats: Record<string, number>;
    tags: Set<string>;
    equipment: Item[]; // Changed from Set<string> to Item[] to store full data
    skills: Skill[];   // Changed from Set<string> to Skill[]
    skillWishlist: Skill[]; // New: Planned skills
    exp: {
        total: number;
        used: number;
        free: number; // calculated
    };
    // Computed properties (not stored in DB, but calculated)
    derivedStats: Record<string, number>;
    customLabels: Record<string, string>; // From REGISTER_STAT_LABEL logs
    customMainStats: string[]; // Stats promoted to main display order
    resources: Resource[]; // Defined resources
    resourceValues: Record<string, number>; // Current values of resources

}
