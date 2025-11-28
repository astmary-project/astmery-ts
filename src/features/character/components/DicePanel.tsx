import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import React, { useState } from 'react';
import { CharacterLogEntry, CharacterState } from '../domain/CharacterLog';
import { CommandParser } from '../domain/CommandParser';
import { DiceRoller, RollResult } from '../domain/DiceRoller';

interface DicePanelProps {
    state: CharacterState;
    resourceValues: Record<string, number>;
    rollHistory: RollResult[];
    onRoll: (result: RollResult) => void;
    onLogCommand: (log: CharacterLogEntry) => void;
}

export function DicePanel({ state, resourceValues, rollHistory, onRoll, onLogCommand }: DicePanelProps) {
    const [formula, setFormula] = useState('');

    const handleRoll = () => {
        if (!formula) return;

        // Try parsing as a command first
        const commandLog = CommandParser.parse(formula);
        if (commandLog) {
            onLogCommand(commandLog);
            setFormula('');
            return;
        }

        // Normal Dice Roll
        // We need to pass the current resource values to the roller
        const tempState = { ...state };
        state.resources.forEach(r => {
            const val = resourceValues[r.id] ?? r.initial;
            tempState.stats = { ...tempState.stats, [r.name]: val };
        });

        try {
            const result = DiceRoller.roll(formula, tempState);
            onRoll(result);
        } catch (e) {
            console.error('DicePanel: Roll failed', e);
        }
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

                <div className="flex-1 min-h-[300px] overflow-y-auto pr-2 border rounded-md bg-muted/10 p-2">
                    <div className="space-y-2">
                        {rollHistory.map((result, index) => (
                            <div key={index} className="p-2 rounded bg-muted/50 text-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-mono text-xs text-muted-foreground">{result.formula}</span>
                                    <span className="text-xs text-muted-foreground">
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
                                        {!isNaN(result.total) && <span className="font-bold text-lg">{result.total}</span>}
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
            </CardContent>
        </Card>
    );
}
