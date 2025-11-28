import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dices } from 'lucide-react';
import { CharacterState } from '../../domain/CharacterLog';
import { STANDARD_STAT_ORDER, STAT_LABELS } from '../../domain/constants';

interface StatsPanelProps {
    state: CharacterState;
    displayState: CharacterState;
    onRoll: (formula: string, description?: string) => void;
}

export const StatsPanel = ({ state, displayState, onRoll }: StatsPanelProps) => {
    // Mapping for Japanese labels
    // Use shared constants merged with custom character labels from state
    const labelMap = { ...STAT_LABELS, ...state.customLabels };
    const standardOrder = [...STANDARD_STAT_ORDER, ...(state.customMainStats || [])];

    // Separate stats into Standard and Bonuses
    const allKeys = Array.from(new Set([...Object.keys(displayState.stats), ...Object.keys(displayState.derivedStats)]));
    const mainStats = allKeys.filter(key => standardOrder.includes(key));
    const bonusStats = allKeys.filter(key => !standardOrder.includes(key));

    // Sort Standard Stats
    const sortedMainStats = mainStats.sort((a, b) => {
        return standardOrder.indexOf(a) - standardOrder.indexOf(b);
    });

    return (
        <div className="space-y-6">
            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sortedMainStats.map((key) => {
                    const value = displayState.derivedStats[key] ?? displayState.stats[key];
                    const label = labelMap[key] || key;
                    return (
                        <div key={key} className="flex flex-col p-3 bg-muted/50 rounded-lg relative group">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</span>
                            <span className="text-2xl font-bold font-mono">{value}</span>

                            {/* Quick Roll Button (Hover) */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                                onClick={() => onRoll(`2d6 + {${key}}`, `${label} Check`)}
                                title={`Roll 2d6 + {${key}}`}
                            >
                                <Dices className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                })}
            </div>

            {/* Bonuses */}
            {bonusStats.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Bonuses & Modifiers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            {bonusStats.map((key) => {
                                const value = displayState.derivedStats[key] ?? displayState.stats[key];
                                const label = labelMap[key] || key;
                                return (
                                    <div key={key} className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-md border">
                                        <span className="text-sm font-medium">{label}</span>
                                        <span className="font-mono font-bold text-primary">
                                            {value > 0 ? '+' : ''}{value}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
