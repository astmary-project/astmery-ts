import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Dices } from 'lucide-react';
import { CharacterLogEntry, CharacterState } from '../domain/CharacterLog';
import { STANDARD_STAT_ORDER, STAT_LABELS } from '../domain/constants';
import { DiceRoller } from '../domain/DiceRoller';
import { DicePanel } from './DicePanel';
import { LogEditor } from './LogEditor';

interface CharacterSheetProps {
    character: {
        name: string;
        avatarUrl?: string;
        bio?: string;
        specialtyElements?: string[];
    };
    state: CharacterState;
    logs: CharacterLogEntry[];
    onAddLog: (log: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => void;
}
export const CharacterSheet = ({ character, state, logs, onAddLog }: CharacterSheetProps) => {
    // Helper for quick rolls
    const performRoll = (formula: string, description?: string) => {
        const result = DiceRoller.roll(formula, state);
        const log: CharacterLogEntry = {
            id: crypto.randomUUID(),
            type: 'ROLL',
            timestamp: Date.now(),
            description: description,
            diceRoll: {
                formula: formula,
                result: result.total,
                details: result.details,
                isCritical: result.isCritical,
                isFumble: result.isFumble,
            }
        };
        onAddLog(log);
    };

    const renderStats = () => {
        // Mapping for Japanese labels
        // Use shared constants merged with custom character labels from state
        const labelMap = { ...STAT_LABELS, ...state.customLabels };
        const standardOrder = [...STANDARD_STAT_ORDER, ...(state.customMainStats || [])];

        // Separate stats into Standard and Bonuses
        const allKeys = Array.from(new Set([...Object.keys(state.stats), ...Object.keys(state.derivedStats)]));
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
                        const value = state.derivedStats[key] ?? state.stats[key];
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
                                    onClick={() => performRoll(`2d6 + ${key}`, `${label} Check`)}
                                    title={`Roll 2d6 + ${key}`}
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
                                    const value = state.derivedStats[key] ?? state.stats[key];
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

    const renderSkillSection = (title: string, skills: typeof state.skills) => {
        if (skills.length === 0) return null;
        return (
            <div className="mb-6 last:mb-0">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    {title}
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {skills.length}
                    </span>
                </h3>
                <div className="grid gap-3">
                    {skills.map(skill => (
                        <div key={skill.id} className="p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors group relative">
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-medium flex items-center gap-2">
                                    {skill.name}
                                    {skill.cost && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{skill.cost}</span>}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                    {skill.timing && <span>{skill.timing}</span>}
                                    {skill.range && <span className="ml-2">/ {skill.range}</span>}
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {skill.description}
                            </div>

                            {/* Skill Mechanics Display */}
                            {(skill.roll || skill.effect) && (
                                <div className="mt-2 pt-2 border-t flex gap-4 text-xs font-mono text-foreground/80">
                                    {skill.roll && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Roll:</span>
                                            {skill.roll}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 ml-1"
                                                onClick={() => performRoll(skill.roll!, `${skill.name} Check`)}
                                            >
                                                <Dices className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                    {skill.effect && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Effect:</span>
                                            {skill.effect}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 ml-1"
                                                onClick={() => performRoll(skill.effect!, `${skill.name} Effect`)}
                                            >
                                                <Dices className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto p-6">
            {/* Left Column: Character Sheet (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
                <Tabs defaultValue="status" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="status">ステータス</TabsTrigger>
                        <TabsTrigger value="skills">スキル</TabsTrigger>
                        <TabsTrigger value="equipment">装備</TabsTrigger>
                        <TabsTrigger value="history">履歴</TabsTrigger>
                    </TabsList>

                    {/* Status Tab */}
                    <TabsContent value="status" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>能力値</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {renderStats()}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>タグ・状態</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from(state.tags).map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm border border-primary/20">
                                            {tag}
                                        </span>
                                    ))}
                                    {state.tags.size === 0 && <span className="text-muted-foreground italic">なし</span>}
                                </div>
                            </CardContent>
                        </Card>

                        {state.resources.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>リソース・ゲージ</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        {state.resources.map(resource => (
                                            <div key={resource.id} className="p-3 border rounded-lg bg-card">
                                                <div className="text-sm font-medium text-muted-foreground mb-1">{resource.name}</div>
                                                <div className="flex items-end gap-2">
                                                    <span className="text-2xl font-bold font-mono">{resource.initial}</span>
                                                    <span className="text-sm text-muted-foreground mb-1">/ {resource.max}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Skills Tab */}
                    <TabsContent value="skills">
                        <Card>
                            <CardHeader>
                                <CardTitle>スキル一覧</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Dynamically render skill sections based on types present */}
                                {(() => {
                                    // Get all unique types and sort them (Standard types first)
                                    const standardTypes = ['Active', 'Passive', 'Spell', 'Other'];
                                    const allTypes = Array.from(new Set(state.skills.map(s => s.type)));
                                    const sortedTypes = allTypes.sort((a, b) => {
                                        const indexA = standardTypes.indexOf(a);
                                        const indexB = standardTypes.indexOf(b);
                                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                        if (indexA !== -1) return -1;
                                        if (indexB !== -1) return 1;
                                        return a.localeCompare(b);
                                    });

                                    return sortedTypes.map(type => (
                                        <div key={type}>
                                            {renderSkillSection(type, state.skills.filter(s => s.type === type))}
                                        </div>
                                    ));
                                })()}

                                {state.skills.length === 0 && <p className="text-muted-foreground text-center py-8">スキルを習得していません。</p>}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Equipment Tab */}
                    <TabsContent value="equipment">
                        <Card>
                            <CardHeader>
                                <CardTitle>Equipment</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {state.equipment.map((item) => (
                                        <div key={item.id} className="flex items-center gap-4 border p-4 rounded-lg">
                                            <div className="flex-1">
                                                <h4 className="font-bold">{item.name}</h4>
                                                <p className="text-sm text-muted-foreground">{item.type}</p>
                                            </div>
                                            <div className="text-sm text-muted-foreground max-w-md">
                                                {item.description}
                                            </div>
                                        </div>
                                    ))}
                                    {state.equipment.length === 0 && <p className="text-muted-foreground text-center py-8">No equipment equipped.</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* History Tab */}
                    <TabsContent value="history" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>History Log</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {[...logs].reverse().map((log) => (
                                        <div key={log.id} className="text-sm border-b pb-2 last:border-0">
                                            <div className="flex justify-between text-muted-foreground text-xs mb-1">
                                                <span>{new Date(log.timestamp).toLocaleString()}</span>
                                                <span className="font-mono">{log.type}</span>
                                            </div>
                                            <div>
                                                {log.type === 'GROWTH' && `Growth: ${log.statKey} +${log.value}`}
                                                {log.type === 'GAIN_EXP' && `Gained ${log.value} EXP`}
                                                {log.type === 'SPEND_EXP' && `Spent ${log.value} EXP`}
                                                {log.type === 'LEARN_SKILL' && `Learned Skill: ${log.skill?.name || log.stringValue || 'Unknown'}`}
                                                {log.type === 'EQUIP' && `Equipped: ${log.item?.name || log.stringValue || 'Unknown'}`}
                                                {log.type === 'ROLL' && `Rolled: ${log.diceRoll?.result} (${log.diceRoll?.formula})`}
                                                {log.description && <span className="text-muted-foreground ml-2">- {log.description}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Right Column: Tools (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
                <DicePanel state={state} onRoll={onAddLog} />
                <LogEditor onAddLog={onAddLog} />
            </div>
        </div>
    );
};
