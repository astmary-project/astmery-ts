import { all, create } from 'mathjs';
import { JAPANESE_TO_ENGLISH_STATS } from './constants';
import { CharacterEvent } from './Event';
import { CharacterState } from './models';
import { ActiveSkillEntity, PassiveSkillEntity } from './Skill';

// Configure mathjs
const math = create(all, {
    number: 'number', // Use standard JS numbers (floats)
    precision: 14,
});

export class CharacterCalculator {
    private static readonly DEFAULT_STATE: CharacterState = {
        stats: {},
        tags: [],
        inventory: [],     // New: Inventory items (Consumables, Unequipped/Equipped Items)
        equipmentSlots: [], // New: Equipped items (References or copies)
        skills: [],
        skillWishlist: [],
        exp: { total: 0, used: 0, free: 0 },
        derivedStats: {},
        customLabels: {},
        customMainStats: [],
        resources: [],
        resourceValues: {},
    };

    private static readonly DEFAULT_FORMULAS: Record<string, string> = {
        'MaxHP': '({Grade} + {Body}) * 5',
        'MaxMP': '({Grade} + {Spirit}) * 5',
        'Defense': '{Body}',
        'MagicDefense': '{Spirit}',
        'ActionSpeed': '{Grade} + 3',
        'DamageDice': 'ceil({Grade} / 5)',
    };

    /**
     * Calculates the full character state from a list of events.
     */
    static calculateState(
        events: CharacterEvent[],
        baseStats: Record<string, number> = {},
        sessionContext: CharacterCalculator.SessionContext = {},
        initialTags: string[] = []
    ): CharacterState {
        // Start with default state
        const state: CharacterState = JSON.parse(JSON.stringify(this.DEFAULT_STATE));

        // Initialize stats with base stats
        state.stats = { ...baseStats };
        state.tags = [...initialTags];

        // Apply all events
        for (const event of events) {
            this.applyEvent(state, event);
        }

        // Apply Session Context (Temporary)
        if (sessionContext) {
            if (sessionContext.tempStats) {
                for (const [k, v] of Object.entries(sessionContext.tempStats)) {
                    const normK = JAPANESE_TO_ENGLISH_STATS[k] || k;
                    state.stats[normK] = (state.stats[normK] || 0) + (v as number);
                }
            }
            if (sessionContext.tempSkills) state.skills.push(...sessionContext.tempSkills);
            if (sessionContext.tempEquipment) state.equipmentSlots.push(...sessionContext.tempEquipment);
        }

        // Apply Dynamic Modifiers (Equipment, Skills, etc.) 
        // This runs AFTER all logs are applied into "state".
        this.applyDynamicBonuses(state);

        return state;
    }

    /**
     * Internal method to apply all dynamic bonuses, derived stats, and resource defaults.
     * Mutates state.
     */
    private static applyDynamicBonuses(state: CharacterState) {
        // 1. Equipment Modifiers
        for (const item of state.equipmentSlots) {
            const variant = item.variants[item.currentVariant || 'default'];
            if (variant && variant.modifiers) {
                for (const [key, formula] of Object.entries(variant.modifiers)) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                    const value = this.evaluateFormula(formula, state);
                    // Add to stats (Base Stats modifier)
                    state.stats[normalizedKey] = (state.stats[normalizedKey] || 0) + value;
                }
            }

            // Passive Skills on Equipment
            if (item.passiveSkills) {
                for (const pSkill of item.passiveSkills) {
                    this.applySkillEffects(state, pSkill);
                }
            }
        }

        // 2. Skill Modifiers
        for (const skill of state.skills) {
            this.applySkillEffects(state, skill);
        }

        // 3. Derived Stats
        const formulas = this.getFormulas(state);
        this.calculateDerivedStats(state, formulas);

        // 4. Ensure Resources
        // Ensure HP and MP are in resources with dynamic Max
        const ensureResource = (key: string, name: string, statKey: string) => {
            // Use derived stat for Max
            const max = String(state.derivedStats[statKey] || 0);

            const existing = state.resources.find(r => r.id === key);
            if (existing) {
                // Update existing resource max
                existing.max = max;
                existing.initial = max;
            } else {
                // Create new resource
                state.resources.push({
                    id: key,
                    name: name,
                    max: max,
                    min: '0',
                    initial: max,
                    resetMode: 'initial'
                });
            }
        };
        // Determine what stat to use for HP/MP. Default logic assumes 'MaxHP'/'MaxMP' derived stats exist.
        ensureResource('HP', 'HP', 'MaxHP');
        ensureResource('MP', 'MP', 'MaxMP');

        // 5. Calculate free exp
        state.exp.free = state.exp.total - state.exp.used;
    }

    private static applySkillEffects(state: CharacterState, skill: ActiveSkillEntity | PassiveSkillEntity) {
        // 1. Passive Modifiers (Only Passive Skills have 'modifiers' in variants)
        if (skill.category === 'PASSIVE') {
            const passive = skill as PassiveSkillEntity;
            const variant = passive.variants[passive.currentVariant || 'default'];
            if (variant && variant.modifiers) {
                for (const [key, formula] of Object.entries(variant.modifiers)) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                    const value = this.evaluateFormula(formula, state);
                    state.stats[normalizedKey] = (state.stats[normalizedKey] || 0) + value;
                }
            }
        }

        // 2. Granted Stats (Common to all skills)
        if (skill.grantedStats) {
            for (const stat of skill.grantedStats) {
                state.customLabels[stat.key] = stat.label;
                if (stat.isMain) {
                    if (!state.customMainStats.includes(stat.key)) state.customMainStats.push(stat.key);
                }
                const val = this.evaluateFormula(stat.value, state);
                state.stats[stat.key] = (state.stats[stat.key] || 0) + val;
            }
        }

        // 3. Granted Resources (Common to all skills)
        if (skill.grantedResources) {
            for (const res of skill.grantedResources) {
                if (!state.resources.find(r => r.id === res.id)) {
                    state.resources.push(res);
                }
            }
        }
    }

    /**
     * Applies a single event to the character state.
     */
    static applyEvent(state: CharacterState, event: CharacterEvent): void {
        switch (event.type) {
            case 'STAT_GROWN': {
                const normalizedKey = JAPANESE_TO_ENGLISH_STATS[event.key] || event.key;
                state.stats[normalizedKey] = (state.stats[normalizedKey] || 0) + event.delta;
                if (event.cost) state.exp.used += event.cost;
                break;
            }
            case 'STAT_UPDATED': {
                const key = JAPANESE_TO_ENGLISH_STATS[event.key] || event.key;
                const val = this.evaluateFormula(event.value, state);
                state.stats[key] = val;
                break;
            }
            case 'STAT_LABEL_REGISTERED': {
                state.customLabels[event.key] = event.label;
                if (event.isMain) state.customMainStats.push(event.key);
                break;
            }
            case 'RESOURCE_DEFINED': {
                const existingResIdx = state.resources.findIndex(r => r.id === event.resource.id);
                if (existingResIdx >= 0) {
                    state.resources[existingResIdx] = event.resource;
                } else {
                    state.resources.push(event.resource);
                }
                break;
            }
            case 'ITEM_ADDED': {
                state.inventory.push(event.item);
                break;
            }
            case 'ITEM_REMOVED': {
                state.inventory = state.inventory.filter(i => i.id !== event.itemId);
                state.equipmentSlots = state.equipmentSlots.filter(i => i.id !== event.itemId);
                break;
            }
            case 'ITEM_UPDATED': {
                const idx = state.inventory.findIndex(i => i.id === event.itemId);
                if (idx >= 0) {
                    state.inventory[idx] = event.newItemState;
                    const eqIdx = state.equipmentSlots.findIndex(e => e.id === event.itemId);
                    if (eqIdx >= 0 && event.newItemState.category === 'EQUIPMENT') {
                        state.equipmentSlots[eqIdx] = event.newItemState;
                    }
                }
                break;
            }
            case 'ITEM_EQUIPPED': {
                const itemToEquip = state.inventory.find(i => i.id === event.itemId);
                if (itemToEquip && itemToEquip.category === 'EQUIPMENT') {
                    const existingEqIdx = state.equipmentSlots.findIndex(e => e.id === event.itemId);
                    if (existingEqIdx === -1) {
                        const equippedItem = { ...itemToEquip, slot: event.slot };
                        state.equipmentSlots.push(equippedItem);
                    }
                }
                break;
            }
            case 'ITEM_UNEQUIPPED': {
                state.equipmentSlots = state.equipmentSlots.filter(i => i.id !== event.itemId);
                break;
            }
            case 'SKILL_LEARNED': {
                state.skills.push(event.skill);
                if (event.cost) state.exp.used += event.cost;
                break;
            }
            case 'SKILL_FORGOTTEN': {
                state.skills = state.skills.filter(s => s.id !== event.skillId);
                break;
            }
            case 'SKILL_UPDATED': {
                const idx = state.skills.findIndex(s => s.id === event.skillId);
                if (idx >= 0) {
                    state.skills[idx] = event.newSkill;
                }
                break;
            }
            case 'WISHLIST_SKILL_ADDED':
                if (event.skill) {
                    state.skillWishlist.push(event.skill);
                }
                break;
            case 'WISHLIST_SKILL_REMOVED': {
                state.skillWishlist = state.skillWishlist.filter(s => s.id !== event.skillId);
                break;
            }
            case 'EXPERIENCE_GAINED': {
                state.exp.total += event.amount;
                break;
            }
            case 'EXPERIENCE_SPENT': {
                state.exp.used += event.amount;
                break;
            }
            case 'LOG_REVOKED':
                break;
        }
    }

    public static normalizeFormula(formula: string): string {
        let normalized = formula;
        const jpKeys = Object.keys(JAPANESE_TO_ENGLISH_STATS).sort((a, b) => b.length - a.length);
        for (const jp of jpKeys) {
            const en = JAPANESE_TO_ENGLISH_STATS[jp];
            normalized = normalized.split(jp).join(en);
        }
        normalized = normalized.replace(/([^\x00-\x7F]+)/g, (match) => {
            return `data["${match}"]`;
        });
        return normalized;
    }

    public static evaluateFormula(formula: string, state: CharacterState, overrides: Record<string, number> = {}): number {
        let processedFormula = formula;
        try {
            processedFormula = formula.replace(/\{([^{}]+)\}/g, (match, key) => {
                const trimmedKey = key.trim();
                if (trimmedKey in overrides) {
                    return overrides[trimmedKey].toString();
                }
                const enKey = JAPANESE_TO_ENGLISH_STATS[trimmedKey] || trimmedKey; // Derived stats override base stats if colliding? No, stats usually disjoint.
                // But generally check derivedStats first or stats?
                // Standard order: derived, then base.
                const val = state.derivedStats[enKey] ?? state.stats[enKey] ?? 0;
                return val.toString();
            });
            return math.evaluate(processedFormula, {});
        } catch (e) {
            console.error(`Formula evaluation error: ${formula}`, e);
            return 0;
        }
    }

    public static getFormulas(state: CharacterState): Record<string, string> {
        const formulas = { ...this.DEFAULT_FORMULAS };

        // Apply Equipment Overrides
        for (const item of state.equipmentSlots) {
            const variant = item.variants[item.currentVariant || 'default'];
            if (variant && variant.overrides) {
                for (const [key, formula] of Object.entries(variant.overrides)) {
                    const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                    formulas[normalizedKey] = formula;
                }
            }
        }

        // Apply Skill Overrides
        for (const skill of state.skills) {
            if (skill.category === 'PASSIVE') {
                const variant = skill.variants[skill.currentVariant || 'default'];
                if (variant && variant.overrides) {
                    for (const [key, formula] of Object.entries(variant.overrides)) {
                        const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;
                        formulas[normalizedKey] = formula;
                    }
                }
            }
        }
        return formulas;
    }

    public static calculateDerivedStats(state: CharacterState, formulas: Record<string, string>, overrides: Record<string, number> = {}): void {
        for (const [key, formula] of Object.entries(formulas)) {
            const formulaResult = this.evaluateFormula(formula, state, overrides);
            const additiveBonus = state.stats[key] || 0; // If there is a base value (e.g. from item modifier adding to 'MaxHP' directly via stats), add it?
            // Wait, applyDynamicBonuses adds item modifiers to `stats`.
            // So if item gives +10 HP, `state.stats.MaxHP` + 10.
            // Formula 'MaxHP' gives X.
            // Result = Formula + Base.
            state.derivedStats[key] = formulaResult + additiveBonus;
        }
    }

    public static calculateStatCost(currentValue: number, isGrade: boolean): number {
        if (isGrade) {
            return currentValue * 10;
        }
        return currentValue * 5;
    }

    static calculateSkillCost(currentStandardSkills: number, type: 'Free' | 'Standard' | 'Grade' | undefined, isRetry: boolean = false): { success: number, failure: number } {
        if (type === 'Free' || type === 'Grade') {
            return { success: 0, failure: isRetry ? 1 : 0 };
        }
        const cost = (currentStandardSkills + 1) * 5;
        return { success: cost, failure: 1 };
    }

    /**
     * Extracts dynamic bonuses from equipment and skills.
     * Returns a map of Stat Key -> Total Bonus (number).
     * Used by DicePanel to show/apply dynamic bonuses.
     */
    static getDynamicBonuses(state: CharacterState): Record<string, number> {
        const bonuses: Record<string, number> = {};

        const addBonus = (key: string, value: string | number) => {
            let numVal = 0;
            if (typeof value === 'number') {
                numVal = value;
            } else {
                numVal = CharacterCalculator.evaluateFormula(value, state);
            }
            bonuses[key] = (bonuses[key] || 0) + numVal;
        };

        // Equipment Modifiers
        state.equipmentSlots.forEach(item => {
            const variantKey = item.currentVariant || 'default';
            const variant = item.variants?.[variantKey] || item.variants?.['default'];
            if (variant && variant.modifiers) {
                Object.entries(variant.modifiers).forEach(([key, val]) => addBonus(key, val));
            }
        });

        // Passive Skill Modifiers
        state.skills.forEach(skill => {
            if (skill.category === 'PASSIVE') {
                const variantKey = skill.currentVariant || 'default';
                const variant = skill.variants?.[variantKey] || skill.variants?.['default'];
                if (variant && variant.modifiers) {
                    Object.entries(variant.modifiers).forEach(([key, val]) => addBonus(key, val));
                }
            }
        });

        return bonuses;
    }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CharacterCalculator {
    export interface SessionContext {
        tempStats?: Record<string, number>;
        tempSkills?: CharacterState['skills'];
        tempItems?: CharacterState['inventory'];
        tempEquipment?: CharacterState['equipmentSlots'];
    }
}
