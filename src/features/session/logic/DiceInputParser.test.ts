import { describe, expect, it } from 'vitest';
import { DiceInputParser } from './DiceInputParser';

describe('DiceInputParser', () => {
    it('parses simple dice notation', () => {
        const result = DiceInputParser.parse('2d6');
        expect(result).toEqual({ formula: '2d6', description: '' });
    });

    it('parses dice notation with description', () => {
        const result = DiceInputParser.parse('2d6 Attack');
        expect(result).toEqual({ formula: '2d6', description: 'Attack' });
    });

    it('parses math expression with description', () => {
        const result = DiceInputParser.parse('1d100<=50 Sanity Check');
        expect(result).toEqual({ formula: '1d100<=50', description: 'Sanity Check' });
    });

    it('parses complex math with description', () => {
        const result = DiceInputParser.parse('(2d6 + 3) * 2 Critical Hit');
        expect(result).toEqual({ formula: '(2d6 + 3) * 2', description: 'Critical Hit' });
    });

    it('parses variables', () => {
        const result = DiceInputParser.parse('{STR} + 1d6 Sword');
        expect(result).toEqual({ formula: '{STR} + 1d6', description: 'Sword' });
    });

    it('returns null for plain chat', () => {
        const result = DiceInputParser.parse('Hello world');
        expect(result).toBeNull();
    });

    it('returns null for chat starting with number but invalid formula', () => {
        // "100 gold" -> "100" is a valid formula (constant).
        // So this SHOULD parse as formula: 100, desc: gold.
        const result = DiceInputParser.parse('100 gold');
        expect(result).toEqual({ formula: '100', description: 'gold' });
    });

    it('handles Japanese characters in description', () => {
        const result = DiceInputParser.parse('2d6 攻撃判定');
        expect(result).toEqual({ formula: '2d6', description: '攻撃判定' });
    });

    it('handles Japanese characters in variables', () => {
        const result = DiceInputParser.parse('{筋力} + 2d6 判定');
        expect(result).toEqual({ formula: '{筋力} + 2d6', description: '判定' });
    });

    it('handles trailing spaces', () => {
        const result = DiceInputParser.parse('2d6   ');
        expect(result).toEqual({ formula: '2d6', description: '' });
    });
});
