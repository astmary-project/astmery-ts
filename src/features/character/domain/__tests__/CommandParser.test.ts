import { describe, expect, it } from 'vitest';
import { CommandParser } from '../CommandParser';

describe('CommandParser', () => {
    it('should parse resource assignment', () => {
        const log = CommandParser.parse(':HP=10');
        expect(log).not.toBeNull();
        expect(log?.type).toBe('UPDATE_RESOURCE');
        expect(log?.resourceUpdate).toEqual({
            resourceId: 'HP',
            type: 'set',
            value: 10
        });
    });

    it('should parse resource reset', () => {
        const log = CommandParser.parse(':HP=reset');
        expect(log).not.toBeNull();
        expect(log?.type).toBe('UPDATE_RESOURCE');
        expect(log?.resourceUpdate).toEqual({
            resourceId: 'HP',
            type: 'reset',
            resetTarget: 'initial'
        });
    });

    it('should parse resource init', () => {
        const log = CommandParser.parse(':MP=init');
        expect(log).not.toBeNull();
        expect(log?.type).toBe('UPDATE_RESOURCE');
        expect(log?.resourceUpdate).toEqual({
            resourceId: 'MP',
            type: 'reset',
            resetTarget: 'initial'
        });
    });

    it('should parse reset all command', () => {
        const log = CommandParser.parse(':reset');
        expect(log).not.toBeNull();
        expect(log?.type).toBe('RESET_RESOURCES');
    });

    it('should parse rest command (alias for reset)', () => {
        const log = CommandParser.parse(':rest');
        expect(log).not.toBeNull();
        expect(log?.type).toBe('RESET_RESOURCES');
    });

    it('should return null for invalid commands', () => {
        expect(CommandParser.parse('Hello')).toBeNull();
        expect(CommandParser.parse(':HP=invalid')).toBeNull();
    });
});
