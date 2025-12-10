import { SessionLogEntry } from './SessionLog';

export class CommandParser {
    /**
     * Parses a command string into a SessionLogEntry.
     * Supported commands:
     * - :Resource=value (Set resource value)
     * - :Resource=reset (Reset resource to initial/max)
     * - :reset (Reset all resources)
     */
    public static parse(command: string, timestamp: number = Date.now()): SessionLogEntry[] {
        const trimmed = command.trim();

        // 1. Reset All Command (:reset or :rest)
        if (/^:(reset|rest)$/i.test(trimmed)) {
            return [{
                id: crypto.randomUUID(),
                type: 'RESET_RESOURCES',
                timestamp,
                description: 'Reset all resources'
            }];
        }

        // 2. Resource Assignment/Modification (Support multiple with ;)
        // e.g. :HP-5; :MP+2
        if (trimmed.startsWith(':')) {
            const parts = trimmed.split(';');
            const updates: { resourceId: string, type: 'set' | 'modify' | 'reset', value?: number | string, resetTarget?: 'initial' | 'max' }[] = [];

            for (const part of parts) {
                const p = part.trim();
                if (!p) continue;

                // Regex: :? (Name) (=|+/-) (Value)
                // We allow optional colon at start of subsequent parts
                const match = p.match(/^:?([^=+\-]+)([=+\-])(.+)$/);
                if (match) {
                    const resourceId = match[1].trim().toLowerCase();
                    const operator = match[2];
                    const valueStr = match[3].trim(); // Keep case for variables? No, variables are usually case sensitive but stats map handles it.

                    if (operator === '=') {
                        if (valueStr.toLowerCase() === 'reset' || valueStr.toLowerCase() === 'init') {
                            updates.push({
                                resourceId,
                                type: 'reset',
                                resetTarget: 'initial'
                            });
                            continue;
                        }
                    }

                    // Try parsing as number, if NaN keep as string expression
                    const numValue = parseFloat(valueStr);
                    const isNum = !isNaN(numValue) && isFinite(numValue) && !valueStr.includes('{'); // If it has {}, treat as expression

                    if (operator === '=') {
                        updates.push({
                            resourceId,
                            type: 'set',
                            value: isNum ? numValue : valueStr
                        });
                    } else if (operator === '+' || operator === '-') {
                        // For modify, we need to handle sign if it's a number
                        // If it's an expression, we preserve the operator logic in the evaluator or pass it as is?
                        // Actually, for modify with expression, we might want to pass the whole thing.
                        // But ResourceUpdate structure separates type and value.
                        // If value is string "10+{Mod}", and type is 'modify', logic should be: current + (evaluated "10+{Mod}")
                        // If operator is '-', logic is: current - (evaluated "10+{Mod}")

                        updates.push({
                            resourceId,
                            type: 'modify',
                            value: isNum ? (operator === '-' ? -numValue : numValue) : (operator === '-' ? `-${valueStr}` : valueStr)
                            // Note: If expression is string, we prepend '-' if operator is minus. 
                            // Evaluator needs to handle "-({Mod})" or similar if we just prepend.
                            // Safer: If operator is '-', wrap in -1 * (...) or just handle in DicePanel.
                            // Let's just pass the string. If it's modify, DicePanel will handle the addition/subtraction.
                            // Wait, if I pass "-{Mod}" to evaluate, it works.
                            // If I pass "10" to evaluate, it works.
                            // So for modify, we want the *delta*.
                        });
                    }
                }
            }

            if (updates.length > 0) {
                return updates.map(u => ({
                    id: crypto.randomUUID(),
                    type: 'UPDATE_RESOURCE',
                    timestamp,
                    resourceUpdate: u,
                    description: `Update ${u.resourceId}`
                }));
            }
        }

        return [];
    }
}
