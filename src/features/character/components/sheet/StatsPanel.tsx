import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dices } from 'lucide-react';
import React from 'react';
import { CharacterCalculator } from '../../domain/CharacterCalculator';
import { CharacterState } from '../../domain/CharacterLog';
import { STANDARD_STAT_ORDER, STAT_LABELS } from '../../domain/constants';
import { GrowthDialog } from './GrowthDialog';
interface StatsPanelProps {
    state: CharacterState;
    displayState: CharacterState;
    onRoll: (formula: string, description?: string) => void;
    isEditMode?: boolean;
    onGrow?: (key: string, cost: number) => void;
}

export const StatsPanel = ({ state, displayState, onRoll, isEditMode = false, onGrow }: StatsPanelProps) => {
    // Mapping for Japanese labels
    // Use shared constants merged with custom character labels from state
    const labelMap = { ...STAT_LABELS, ...state.customLabels };
    const standardOrder = [...STANDARD_STAT_ORDER, ...(state.customMainStats || [])];

    // Separate stats into Standard and Bonuses
    const allKeys = Array.from(new Set([...Object.keys(displayState.stats), ...Object.keys(displayState.derivedStats)]));
    const mainStats = allKeys.filter(key => standardOrder.includes(key));
    const bonusStats = allKeys.filter(key =>
        !standardOrder.includes(key) &&
        !['HP', 'MP', 'MaxHP', 'MaxMP', 'Grade', 'Defense', 'MagicDefense'].includes(key)
    );

    // Sort Standard Stats
    const sortedMainStats = mainStats.sort((a, b) => {
        return standardOrder.indexOf(a) - standardOrder.indexOf(b);
    });

    // Helper to render a stat box
    const renderStatBox = (key: string, label: string, value: number, base?: number, mod?: number) => (
        <div key={key} className="flex flex-col p-3 bg-muted/50 rounded-lg relative group">
            <span className="text-sm font-semibold text-foreground mb-1">{label}</span>
            {base !== undefined && mod !== undefined ? (
                <div className="flex items-baseline gap-1">
                    <span className="text-lg font-medium font-mono text-muted-foreground">{base}</span>
                    <span className="text-xs text-muted-foreground">+</span>
                    <span className="text-lg font-medium font-mono text-muted-foreground">{mod}</span>
                    <span className="text-xs text-muted-foreground">=</span>
                    <span className="text-3xl font-bold font-mono text-primary">{value}</span>
                </div>
            ) : (
                <span className="text-3xl font-bold font-mono">{value}</span>
            )}

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

            {/* Growth Button (Edit Mode) */}
            {isEditMode && (
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-sm bg-background border-primary text-primary hover:bg-primary hover:text-primary-foreground z-10"
                    onClick={() => console.log('Grow', key)} // Placeholder
                    title="Grow Stat"
                >
                    <span className="text-xs font-bold">+</span>
                </Button>
            )}
        </div>
    );

    // Growth Dialog State
    const [growthTarget, setGrowthTarget] = React.useState<{ key: string; label: string; value: number } | null>(null);

    const handleGrowthClick = (key: string, label: string, value: number) => {
        setGrowthTarget({ key, label, value });
    };

    const handleGrowthConfirm = () => {
        if (growthTarget && onGrow) {
            onGrow(growthTarget.key, 10); // Fixed cost for now
            setGrowthTarget(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Main Stats */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">メインステータス</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {sortedMainStats.map((key) => {
                            const total = displayState.derivedStats[key] ?? displayState.stats[key];
                            const label = labelMap[key] || key;

                            // Calculate Base and Mod for Main Stats
                            let mod = 0;
                            state.equipment.forEach(item => {
                                if (item.statModifiers && item.statModifiers[key]) mod += item.statModifiers[key];
                            });
                            state.skills.forEach(skill => {
                                if (skill.statModifiers && skill.statModifiers[key]) mod += skill.statModifiers[key];
                            });
                            const base = total - mod;

                            return (
                                <div key={key} className="relative">
                                    {renderStatBox(key, label, total, base, mod)}
                                    {isEditMode && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-sm bg-background border-primary text-primary hover:bg-primary hover:text-primary-foreground z-10"
                                            onClick={() => handleGrowthClick(key, label, base)} // Use base for growth
                                            title="Grow Stat"
                                        >
                                            <span className="text-xs font-bold">+</span>
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Defense Stats */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">防御ステータス</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        {['Defense', 'MagicDefense'].map(key => {
                            const value = displayState.derivedStats[key] ?? displayState.stats[key];
                            const label = labelMap[key] || key;
                            return renderStatBox(key, label, value);
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Bonuses */}
            {bonusStats.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">ボーナス & 補正</CardTitle>
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

            {/* Growth Dialog */}
            {growthTarget && (
                <GrowthDialog
                    isOpen={!!growthTarget}
                    onClose={() => setGrowthTarget(null)}
                    statKey={growthTarget.key}
                    statLabel={growthTarget.label}
                    currentValue={growthTarget.value}
                    currentExp={state.exp.free}
                    cost={CharacterCalculator.calculateStatCost(growthTarget.value, growthTarget.key === 'Grade')}
                    onConfirm={() => {
                        if (growthTarget && onGrow) {
                            const cost = CharacterCalculator.calculateStatCost(growthTarget.value, growthTarget.key === 'Grade');
                            onGrow(growthTarget.key, cost);
                            setGrowthTarget(null);
                        }
                    }}
                />
            )}
        </div>
    );
};
