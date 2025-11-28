import { all, create } from 'mathjs';
import { CharacterCalculator } from './CharacterCalculator';
import { CharacterState } from './CharacterLog';

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

        // 2. Normalize Formula (Japanese -> English, Custom -> data["..."])
        // We reuse CharacterCalculator's logic to ensure consistency.
        // We need to import CharacterCalculator.
        // Since we are in the same domain, we can assume it's available.
        // But we need to add the import statement at the top of the file.
        // For now, let's assume we added it.

        let processedFormula = CharacterCalculator.normalizeFormula(formulaPart.trim());

        // 3. Replace {Variable} with values
        // We need to handle both standard {Key} and normalized {data["Key"]}.
        processedFormula = processedFormula.replace(/\{([^{}]*)\}/g, (match: string, key: string) => {
            let lookupKey = key.trim();

            // If it's wrapped in data["..."], extract the inner key
            const dataMatch = lookupKey.match(/^data\["(.+)"\]$/);
            if (dataMatch) {
                lookupKey = dataMatch[1];
            }

            // Look up in state (English keys or Custom Japanese keys)
            // Note: normalizeFormula converts known Japanese keys to English.
            // So if input was {肉体}, it became {Body}. lookupKey is Body.
            // If input was {カルマ}, it became {data["カルマ"]}. lookupKey is カルマ.

            const val = state.stats[lookupKey] ?? state.derivedStats[lookupKey] ?? 0;
            return val.toString();
        });

        let details = processedFormula;
        let isCritical = false;
        let isFumble = false;

        // 4. Parse dice notation (XdY)
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

        // 5. Evaluate the final expression
        const evalString = details.replace(/\[([\d, ]+)\]/g, (match: string, content: string) => {
            const rolls = content.split(',').map((s: string) => parseInt(s.trim(), 10));
            const sum = rolls.reduce((a: number, b: number) => a + b, 0);
            return '(' + sum + ')';
        });

        let total = 0;
        try {
            // Prepare scope for mathjs
            const scope: Record<string, any> = {};
            for (const [key, value] of Object.entries(state.stats)) {
                scope[key] = value;
            }
            for (const [key, value] of Object.entries(state.derivedStats)) {
                scope[key] = value;
            }
            // Add data object for Japanese variables
            scope['data'] = { ...scope };

            total = math.evaluate(evalString, scope);
        } catch (e) {
            console.error('Failed to evaluate roll:', evalString, e);
            total = 0;
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
