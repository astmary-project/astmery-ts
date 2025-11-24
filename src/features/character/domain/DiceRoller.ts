import * as math from 'mathjs';
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
        let details = formula;
        let isCritical = false;
        let isFumble = false;

        // Replace stats in formula with their values
        // We use a regex to find words that match stat keys
        // This is a simple replacement, might need more robust parsing later
        const statsScope = { ...state.stats, ...state.derivedStats };
        for (const [key, value] of Object.entries(statsScope)) {
            // Replace whole words only
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            if (regex.test(details)) {
                details = details.replace(regex, `${value}`);
            }
        }

        // Parse dice notation (XdY)
        // Regex to match 2d6, 1d100, etc.
        const diceRegex = /(\d+)d(\d+)/g;

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

            return `[${rolls.join(', ')}]`;
        });

        // Evaluate the final expression
        // The expression now looks like "[3, 4] + 5" which mathjs might not handle directly if we want sum
        // So we need to sum the arrays in the string before passing to mathjs?
        // Actually, let's replace [x, y] with (x+y) for evaluation, but keep [x, y] for details?
        // Better approach: Calculate the sum of dice and replace in a separate string for evaluation.

        let evalString = formula;

        // 1. Replace stats in evalString
        for (const [key, value] of Object.entries(statsScope)) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            evalString = evalString.replace(regex, `${value}`);
        }

        // 2. Replace dice in evalString with their sums
        // We need to ensure we use the SAME rolls as generated above. 
        // This means we should probably do the dice rolling first and store results.

        // Refined Approach:
        // 1. Identify all dice expressions
        // 2. Roll them
        // 3. Construct "Details" string with [x, y]
        // 4. Construct "Eval" string with (sum)

        let currentDetails = formula;
        let currentEval = formula;

        // Replace stats first
        for (const [key, value] of Object.entries(statsScope)) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            currentDetails = currentDetails.replace(regex, `${value}`);
            currentEval = currentEval.replace(regex, `${value}`);
        }

        // Find and replace dice
        // We use a loop to handle multiple occurrences
        let match;
        // Reset regex state
        const diceRegexGlobal = /(\d+)d(\d+)/g;

        // We need to replace carefully. String.replace with callback is best but we need to update two strings.
        // Since we need to sync them, let's build a map of replacements?
        // Or just process sequentially.

        // Let's use a replacer function that updates both, but we need to be careful about string indexes changing.
        // Simpler: Split the string? No.

        // Let's just re-run the regex replacement logic but capture the results to update both strings.
        // Actually, the previous `details.replace` was doing it in one pass.
        // Let's do it manually.

        const chunks: { text: string, isDice: boolean, rolls?: number[], sum?: number }[] = [];
        let lastIndex = 0;

        // We work on the "stat-replaced" formula
        const baseFormula = currentEval;

        while ((match = diceRegexGlobal.exec(baseFormula)) !== null) {
            // Text before match
            chunks.push({ text: baseFormula.slice(lastIndex, match.index), isDice: false });

            const count = parseInt(match[1], 10);
            const sides = parseInt(match[2], 10);
            const rolls: number[] = [];
            let sum = 0;

            for (let i = 0; i < count; i++) {
                const roll = Math.floor(Math.random() * sides) + 1;
                rolls.push(roll);
                sum += roll;
            }

            // Check crit/fumble
            if (count > 0) {
                // Example rule: 2d6 -> 12 is crit, 2 is fumble
                // For now, let's just flag it if it's max possible or min possible
                if (sum === count * sides) isCritical = true;
                if (sum === count) isFumble = true;
            }

            chunks.push({ text: match[0], isDice: true, rolls, sum });
            lastIndex = diceRegexGlobal.lastIndex;
        }
        chunks.push({ text: baseFormula.slice(lastIndex), isDice: false });

        // Reconstruct strings
        details = chunks.map(c => c.isDice ? `[${c.rolls!.join(', ')}]` : c.text).join('');
        evalString = chunks.map(c => c.isDice ? `(${c.sum})` : c.text).join('');

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
