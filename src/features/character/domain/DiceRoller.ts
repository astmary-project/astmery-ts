import * as math from 'mathjs';
import { CharacterState } from './CharacterLog';
import { JAPANESE_TO_ENGLISH_STATS } from './constants';

export interface RollResult {
    formula: string;
    total: number;
    details: string;
    isCritical: boolean;
    isFumble: boolean;
}

export class DiceRoller {
    /**
     * Parses and evaluates a dice formula.
     * Supports standard notation: XdY (e.g., 2d6, 1d100).
     * Replaces XdY with random values and evaluates the expression.
     */
    public static roll(formula: string, state: CharacterState): RollResult {
        // 1. Separate Formula and Comment
        // Formula ends at the first space
        const parts = formula.trim().split(/\s+/);
        const formulaPart = parts[0];
        const commentPart = parts.slice(1).join(' ');

        // 2. Replace {Variable} with values
        // We use the same logic as CharacterCalculator.evaluateFormula but we need to keep the string for dice parsing.
        // CharacterCalculator.evaluateFormula returns a number (evaluates everything).
        // We want to evaluate ONLY the variables, keeping "2d6" etc. intact.

        let processedFormula = formulaPart;

        // Replace {Key} with value
        processedFormula = processedFormula.replace(/\{([^{}]*)\}/g, (match, key) => {
            const trimmedKey = key.trim();
            if (!trimmedKey) return '0';

            const enKey = JAPANESE_TO_ENGLISH_STATS[trimmedKey] || trimmedKey;
            // Since we can't easily access the private map or import it here without changing imports,
            // let's assume we can use state.stats/derivedStats directly or use a helper.
            // Actually, CharacterCalculator.evaluateFormula logic is what we want but partial.

            // Let's just look up in state
            const val = state.stats[enKey] ?? state.derivedStats[enKey] ?? 0;
            return val.toString();
        });

        // However, we need to handle the mapping properly.
        // Let's import JAPANESE_TO_ENGLISH_STATS at the top of this file.

        let details = processedFormula;
        let isCritical = false;
        let isFumble = false;

        // 3. Parse dice notation (XdY)
        const diceRegex = /(\d+)d(\d+)/g;
        details = details.replace(diceRegex, (match, countStr, sidesStr) => {
            const count = parseInt(countStr, 10);
            const sides = parseInt(sidesStr, 10);
            const rolls: number[] = [];

            for (let i = 0; i < count; i++) {
                const roll = Math.floor(Math.random() * sides) + 1;
                rolls.push(roll);
            }

            if (count > 0) {
                if (rolls.every(r => r === sides)) isCritical = true;
                if (rolls.every(r => r === 1)) isFumble = true;
            }

            return '[' + rolls.join(', ') + ']';
        });

        // 4. Evaluate the final expression
        const evalString = details.replace(/\[([\d, ]+)\]/g, (match, content) => {
            const rolls = content.split(',').map((s: string) => parseInt(s.trim(), 10));
            const sum = rolls.reduce((a: number, b: number) => a + b, 0);
            return '(' + sum + ')';
        });

        let total = 0;
        try {
            total = math.evaluate(evalString);
        } catch (e) {
            console.error('Failed to evaluate roll:', evalString, e);
            total = 0;
        }

        // Append comment to details if present
        if (commentPart) {
            details += ` ${commentPart}`;
        }

        return {
            formula,
            total,
            details,
            isCritical,
            isFumble
        };
    }
}
