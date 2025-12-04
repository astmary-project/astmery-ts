import { DiceRoller } from '../../../domain/dice/DiceRoller';

export interface ParsedDiceInput {
    formula: string;
    description: string;
}

export class DiceInputParser {
    /**
     * Parses an input string to separate a potential dice formula from a description.
     * Strategy:
     * 1. Split input by spaces.
     * 2. Iteratively check if the prefix (accumulated parts) is a valid formula.
     * 3. Keep track of the longest valid prefix.
     * 4. If a valid prefix is found, return it as formula and the rest as description.
     * 5. If no valid prefix is found, return null (treat as chat).
     */
    public static parse(input: string): ParsedDiceInput | null {
        const trimmed = input.trim();
        if (!trimmed) return null;

        // Optimization: If it starts with a non-dice-like character (and not a number/parenthesis), fail early?
        // But variables like {STR} are valid.
        // Let's just try parsing.

        const parts = trimmed.split(/\s+/);
        let longestValidFormula: string | null = null;
        let descriptionStartIndex = -1;

        // We try to parse:
        // "2d6"
        // "2d6 + 3"
        // "2d6 + 3 Attack"

        // We construct prefixes and test them.
        // Note: DiceRoller.roll requires context. 
        // We want a "syntax check" only. 
        // However, DiceRoller.roll evaluates.
        // If we pass empty context, variables will be 0. This is fine for syntax checking.

        const dummyContext = { stats: {}, derivedStats: {} };

        // Optimization: Binary search or just linear? Linear is fine for chat messages (usually short).
        // We go from longest to shortest? Or shortest to longest?
        // "2d6 + 3 Attack"
        // 1. "2d6" -> Valid
        // 2. "2d6 +" -> Invalid (trailing operator)
        // 3. "2d6 + 3" -> Valid (Longer!)
        // 4. "2d6 + 3 Attack" -> Invalid (Attack is not math)

        // So we should go from left to right and keep the last valid one.

        let currentPrefix = "";

        // Reconstruct parts with original spaces? 
        // split(/\s+/) loses the exact whitespace.
        // Better: iterate through the string by splitting at spaces but keeping indices?
        // Or just build up from parts and assume single space for the check, 
        // but we need to slice the original string for the description to preserve formatting if possible.

        // Let's use the parts approach for checking, but be careful about reconstruction.
        // Actually, DiceRoller handles spaces fine.

        for (let i = 0; i < parts.length; i++) {
            const prefix = parts.slice(0, i + 1).join(' ');

            // Check validity
            // We need to suppress errors or catch them.
            // DiceRoller.roll returns Result.
            const result = DiceRoller.roll(prefix, dummyContext);

            if (result.isSuccess) {
                longestValidFormula = prefix;
                descriptionStartIndex = i + 1;
            }
        }

        if (longestValidFormula) {
            // Re-construct description from the remaining parts
            const description = parts.slice(descriptionStartIndex).join(' ');
            return {
                formula: longestValidFormula,
                description: description
            };
        }

        return null;
    }
}
