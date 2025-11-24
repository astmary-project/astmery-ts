import * as math from 'mathjs';
import { CharacterCalculator } from './CharacterCalculator';
import { CharacterState } from './CharacterLog';

export interface RollResult {
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
        // Normalize the formula (handle Japanese stat names etc.)
        const normalizedFormula = CharacterCalculator.normalizeFormula(formula);

        // 1. Replace stats with values
        // We use a regex to find potential stat names (alphanumeric + underscores)
        // But since we have normalized it, we might have data["..."] for custom vars.
        // The previous simple regex replacement won't work well with data["..."].
        // Instead, let's use mathjs to evaluate the non-dice parts?
        // OR, we can just use the evaluateFormula logic which handles the scope proxy.
        // BUT, we need to preserve the "XdY" parts for the dice rolling logic.

        // Strategy:
        // 1. Identify XdY parts and replace them with a placeholder or keep them.
        // 2. Evaluate the REST of the formula using CharacterCalculator.evaluateFormula?
        //    No, that would evaluate the whole thing.
        // 3. Better: Replace all known stats in the string with their values.
        //    For data["..."], we can replace that pattern with the value.

        let processedFormula = normalizedFormula;

        // Replace data["KEY"] with value
        processedFormula = processedFormula.replace(new RegExp('data\\["([^"]+)"\\]', 'g'), (_, key) => {
            return (state.stats[key] || 0).toString();
        });

        // Replace standard English stat names
        // We iterate over state.stats and derivedStats
        const allStats = { ...state.stats, ...state.derivedStats };
        // Sort keys by length to avoid partial replacement
        const sortedKeys = Object.keys(allStats).sort((a, b) => b.length - a.length);

        for (const key of sortedKeys) {
            // Simple replacement - might be risky if keys are substrings of others or commands
            // But for now it's acceptable given the controlled domain.
            // We use a regex with word boundaries for English keys.
            const regex = new RegExp('\\b' + key + '\\b', 'g');
            processedFormula = processedFormula.replace(regex, (allStats[key] || 0).toString());
        }

        let details = processedFormula; // Start details with the stat-replaced formula
        let isCritical = false;
        let isFumble = false;

        // Parse dice notation (XdY)
        // Regex to match 2d6, 1d100, etc.
        const diceRegex = new RegExp('(\\d+)d(\\d+)', 'g');

        details = details.replace(diceRegex, (match, countStr, sidesStr) => {
            const count = parseInt(countStr, 10);
            const sides = parseInt(sidesStr, 10);
            const rolls: number[] = [];

            for (let i = 0; i < count; i++) {
                const roll = Math.floor(Math.random() * sides) + 1;
                rolls.push(roll);
            }

            // Check for critical/fumble (Simple rule: Max on all dice = Crit, 1 on all dice = Fumble)
            // This is a very basic rule, might need customization
            if (count > 0) {
                if (rolls.every(r => r === sides)) isCritical = true;
                if (rolls.every(r => r === 1)) isFumble = true;
            }

            return '[' + rolls.join(', ') + ']';
        });

        // Evaluate the final expression
        // We replace [x, y] with (x + y) in the details string to get the evaluation string.

        const evalString = details.replace(new RegExp('\\[([\\d, ]+)\\]', 'g'), (match, content) => {
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

        return {
            total,
            details,
            isCritical,
            isFumble
        };
    }
}
