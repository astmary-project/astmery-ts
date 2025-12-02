import { SessionLogEntry } from './SessionLog';

export class CommandParser {
    /**
     * Parses a command string into a SessionLogEntry.
     * Supported commands:
     * - :Resource=value (Set resource value)
     * - :Resource=reset (Reset resource to initial/max)
     * - :reset (Reset all resources)
     */
    public static parse(command: string, timestamp: number = Date.now()): SessionLogEntry | null {
        const trimmed = command.trim();

        // 1. Reset All Command (:reset or :rest)
        if (/^:(reset|rest)$/i.test(trimmed)) {
            return {
                id: crypto.randomUUID(),
                type: 'RESET_RESOURCES',
                timestamp,
                description: 'Reset all resources'
            };
        }

        // 2. Resource Assignment/Modification (:Resource=Value, :Resource+Value, :Resource-Value)
        // Regex: : (Name) (=|+/-) (Value)
        const match = trimmed.match(/^:([^=+\-]+)([=+\-])(.+)$/);
        if (match) {
            const resourceId = match[1].trim().toLowerCase();
            const operator = match[2];
            const valueStr = match[3].trim().toLowerCase();

            // Handle special values for '=' operator
            if (operator === '=') {
                if (valueStr === 'reset' || valueStr === 'init') {
                    return {
                        id: crypto.randomUUID(),
                        type: 'UPDATE_RESOURCE',
                        timestamp,
                        resourceUpdate: {
                            resourceId,
                            type: 'reset',
                            resetTarget: 'initial'
                        },
                        description: `Reset resource: ${resourceId}`
                    };
                }
            }

            const numValue = parseFloat(valueStr);
            if (!isNaN(numValue)) {
                if (operator === '=') {
                    return {
                        id: crypto.randomUUID(),
                        type: 'UPDATE_RESOURCE',
                        timestamp,
                        resourceUpdate: {
                            resourceId,
                            type: 'set',
                            value: numValue
                        },
                        description: `Set resource: ${resourceId} = ${numValue}`
                    };
                } else if (operator === '+' || operator === '-') {
                    const delta = operator === '-' ? -numValue : numValue;
                    return {
                        id: crypto.randomUUID(),
                        type: 'UPDATE_RESOURCE',
                        timestamp,
                        resourceUpdate: {
                            resourceId,
                            type: 'modify',
                            value: delta
                        },
                        description: `Modify resource: ${resourceId} ${operator}= ${numValue}`
                    };
                }
            }
        }

        return null;
    }
}
