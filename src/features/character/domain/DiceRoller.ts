import { all, create } from 'mathjs';
import { CharacterState } from './CharacterLog';
import { JAPANESE_TO_ENGLISH_STATS } from './constants';

const math = create(all, {
    number: 'number',
    precision: 14,
});

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
        // 1. Handle Comments
        const [formulaPart, ...commentParts] = formula.split('#');
        const comment = commentParts.join('#').trim();

        let processedFormula = formulaPart.trim();

        // 2. Replace {Variable} with values
        // We look for {Key} patterns.
        processedFormula = processedFormula.replace(/\{([^{}]+)\}/g, (match, key) => {
            const trimmedKey = key.trim();

            // Resolve key (handle Japanese aliases)
            const enKey = JAPANESE_TO_ENGLISH_STATS[trimmedKey] || trimmedKey;

            // Look up in state
            const val = state.stats[enKey] ?? state.derivedStats[enKey] ?? 0;
            return val.toString();
        });

        let details = processedFormula;
        let isCritical = false;
        let isFumble = false;

        // 3. Parse dice notation (XdY)
        const diceRegex = /(\d+)d(\d+)/g;
        details = details.replace(diceRegex, (match: string, countStr: string, sidesStr: string) => {
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
        const evalString = details.replace(/\[([\d, ]+)\]/g, (match: string, content: string) => {
            const rolls = content.split(',').map((s: string) => parseInt(s.trim(), 10));
            const sum = rolls.reduce((a: number, b: number) => a + b, 0);
            return '(' + sum + ')';
        });

        let total = 0;
        try {
            // Evaluate with empty scope (strict syntax)
            total = math.evaluate(evalString, {});
        } catch (e) {
            // If evaluation fails, it's likely a chat message or invalid formula.
            // Return NaN to indicate no calculation result.
            total = NaN;
        }

        // Append comment if present
        if (comment) {
            details += ` # ${comment}`;
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
