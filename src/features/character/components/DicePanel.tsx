import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import React, { useState } from 'react';
import { CharacterLogEntry, CharacterState } from '../domain/CharacterLog';
import { DiceRoller } from '../domain/DiceRoller';

interface DicePanelProps {
    state: CharacterState;
    onRoll: (log: CharacterLogEntry) => void;
}

export function DicePanel({ state, onRoll }: DicePanelProps) {
    const [formula, setFormula] = useState('');

    const handleRoll = () => {
        if (!formula) return;

        const result = DiceRoller.roll(formula, state);

        const log: CharacterLogEntry = {
            id: crypto.randomUUID(),
            type: 'ROLL',
            timestamp: Date.now(),
            diceRoll: {
                formula: formula,
                result: result.total,
                details: result.details,
                isCritical: result.isCritical,
                isFumble: result.isFumble,
            }
        };

        onRoll(log);
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
                <CardTitle className="text-sm font-medium">Dice Roller</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
                <div className="flex gap-2">
                    <Input
                        value={formula}
                        onChange={(e) => setFormula(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. 2d6 + Body"
                        className="font-mono"
                    />
                    <Button onClick={handleRoll}>Roll</Button>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <div className="absolute inset-0 overflow-y-auto pr-2">
                        <div className="space-y-2">
                            {state.recentRolls.map((log) => (
                                <div key={log.id} className="p-2 rounded bg-muted/50 text-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-mono text-xs text-muted-foreground">{log.diceRoll?.formula}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[70%]">
                                            {log.diceRoll?.details}
                                        </span>
                                        <div className="flex items-baseline gap-2">
                                            {log.diceRoll?.isCritical && <span className="text-xs font-bold text-yellow-500">CRIT!</span>}
                                            {log.diceRoll?.isFumble && <span className="text-xs font-bold text-red-500">FUMBLE!</span>}
                                            <span className="font-bold text-lg">{log.diceRoll?.result}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {state.recentRolls.length === 0 && (
                                <div className="text-center text-muted-foreground text-xs py-4">
                                    No rolls yet
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
