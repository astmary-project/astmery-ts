import { describe, expect, it } from 'vitest';
import { CommandParser } from '../CommandParser';

describe('CommandParser', () => {
    it('should parse simple set command', () => {
        const logs = CommandParser.parse(':HP=10');
        expect(logs).toHaveLength(1);
        const log = logs[0];
        expect(log.type).toBe('UPDATE_RESOURCE');
        expect(log.resourceUpdate).toEqual({
            resourceId: 'hp',
            type: 'set',
            value: 10
        });
    });

    it('should parse modify command', () => {
        const logs = CommandParser.parse(':MP-5');
        expect(logs).toHaveLength(1);
        const log = logs[0];
        expect(log.type).toBe('UPDATE_RESOURCE');
        expect(log.resourceUpdate).toEqual({
            resourceId: 'mp',
            type: 'modify',
            value: -5
        });
    });

    it('should parse reset value command', () => {
        const logs = CommandParser.parse(':HP=reset');
        expect(logs).toHaveLength(1);
        const log = logs[0];
        expect(log.type).toBe('UPDATE_RESOURCE');
        expect(log.resourceUpdate).toEqual({
            resourceId: 'hp',
            type: 'reset',
            resetTarget: 'initial'
        });
    });

    it('should parse reset all command', () => {
        const logs = CommandParser.parse(':reset');
        expect(logs).toHaveLength(1);
        const log = logs[0];
        expect(log.type).toBe('RESET_RESOURCES');
    });

    it('should return empty array for invalid command', () => {
        const logs = CommandParser.parse('Hello World');
        expect(logs).toHaveLength(0);
    });

    it('should parse reset alias', () => {
        const logs = CommandParser.parse(':rest');
        expect(logs).toHaveLength(1);
        const log = logs[0];
        expect(log.type).toBe('RESET_RESOURCES');
    });

    it('should parse invalid number as expression', () => {
        const logs = CommandParser.parse(':HP=invalid');
        expect(logs).toHaveLength(1);
        expect(logs[0].resourceUpdate?.value).toBe('invalid');
    });

    it('should return empty array for completely invalid command', () => {
        expect(CommandParser.parse('Hello')).toHaveLength(0);
    });
});
