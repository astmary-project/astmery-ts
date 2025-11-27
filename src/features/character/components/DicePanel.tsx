import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { evaluate } from 'mathjs';
import React, { useState } from 'react';
import { CharacterState } from '../domain/CharacterLog';
import { DiceRoller, RollResult } from '../domain/DiceRoller';

interface DicePanelProps {
    state: CharacterState;
    resourceValues: Record<string, number>;
    rollHistory: RollResult[];
    onRoll: (result: RollResult) => void;
    onResourceUpdate: (updates: { id: string; delta: number }[]) => void;
}

export function DicePanel({ state, resourceValues, rollHistory, onRoll, onResourceUpdate }: DicePanelProps) {
    const [formula, setFormula] = useState('');

    const handleRoll = () => {
        if (!formula) return;

        // Check for Resource Operation Syntax: :ResourceName operator Value
        // e.g. :HP-5 or :HP-5;MP-3
        if (formula.startsWith(':')) {
            const operations = formula.slice(1).split(';');
            const updates: { id: string; delta: number }[] = [];

            operations.forEach(op => {
                // Parse Name and Value
                // Regex to capture Name, Operator (+/-), and Value (rest of string)
                // We support + and - for now.
                // Name can be anything until the operator.
                const match = op.match(/^(.+?)([+\-])(.+)$/);
                if (match) {
                    const [, name, operator, valueExpr] = match;
                    const resource = state.resources.find(r => r.name === name.trim());

                    if (resource) {
                        // Evaluate value expression (it might be a formula like {Damage})
                        // We need to resolve variables in the value expression.
                        // We can reuse DiceRoller's logic or just do simple replacement if we want to be safe.
                        // For now, let's use a simplified evaluation that supports {Variable} syntax.

                        let evalString = valueExpr.trim();
                        // Replace {Variable} with values from stats or resources
                        evalString = evalString.replace(/\{([^{}]*)\}/g, (_, key) => {
                            const trimmedKey = key.trim();
                            if (!trimmedKey) return '0';

                            // Check resources first? Or stats?
                            // Let's check stats first as usual.
                            const statVal = state.stats[trimmedKey] ?? state.derivedStats[trimmedKey];
                            if (statVal !== undefined) return statVal.toString();

                            // Check resources
                            const res = state.resources.find(r => r.name === trimmedKey);
                            if (res) {
                                return (resourceValues[res.id] ?? res.initial).toString();
                            }

                            return '0';
                        });
                        try {
                            const value = evaluate(evalString);
                            const delta = operator === '-' ? -value : value;
                            updates.push({ id: resource.id, delta });
                        } catch (e) {
                            console.error('Failed to evaluate resource operation:', op, e);
                        }
                    }
                }
            });

            if (updates.length > 0) {
                onResourceUpdate(updates);
                setFormula('');
            }
            return;
        }

        // Normal Dice Roll
        // We need to pass the current resource values to the roller
        const tempState = { ...state };
        state.resources.forEach(r => {
            const val = resourceValues[r.id] ?? r.initial;
            tempState.stats = { ...tempState.stats, [r.name]: val };
        });

        const result = DiceRoller.roll(formula, tempState);
        onRoll(result);
        setFormula('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRoll();
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Dice Roller & Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
                <div className="flex gap-2">
                    <Input
                        value={formula}
                        onChange={(e) => setFormula(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder=":HP-5 or 2d6+{Atk}"
                        className="font-mono"
                    />
                    <Button onClick={handleRoll}>Send</Button>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <div className="absolute inset-0 overflow-y-auto pr-2">
                        <div className="space-y-2">
                            {rollHistory.map((result, index) => (
                                <div key={index} className="p-2 rounded bg-muted/50 text-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-mono text-xs text-muted-foreground">{result.formula}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {/* Timestamp is not in RollResult, maybe add it? For now just show nothing or index */}
                                            #{rollHistory.length - index}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[70%]">
                                            {result.details}
                                        </span>
                                        <div className="flex items-baseline gap-2">
                                            {result.isCritical && <span className="text-xs font-bold text-yellow-500">CRIT!</span>}
                                            {result.isFumble && <span className="text-xs font-bold text-red-500">FUMBLE!</span>}
                                            <span className="font-bold text-lg">{result.total}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {rollHistory.length === 0 && (
                                <div className="text-center text-muted-foreground text-xs py-4">
                                    No logs yet
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
