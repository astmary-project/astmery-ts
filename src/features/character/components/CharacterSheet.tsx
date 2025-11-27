import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dices, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CharacterCalculator } from '../domain/CharacterCalculator';
import { CharacterLogEntry, CharacterState } from '../domain/CharacterLog';
import { JAPANESE_TO_ENGLISH_STATS, STANDARD_CHECK_FORMULAS, STANDARD_STAT_ORDER, STAT_LABELS } from '../domain/constants';
import { DiceRoller, RollResult } from '../domain/DiceRoller';
import { CharacterHeader } from './CharacterHeader';
import { DicePanel } from './DicePanel';
import { LogEditor } from './LogEditor';

interface CharacterSheetProps {
    name: string;
    character?: {
        avatarUrl?: string;
        bio?: string;
        specialtyElements?: string[];
    };
    state: CharacterState;
    logs: CharacterLogEntry[];
    onAddLog: (log: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => void;
    onNameChange?: (name: string) => void;
    onDeleteLog: (logId: string) => void;
}
export const CharacterSheet = ({ name, character, state, logs, onAddLog, onDeleteLog, onNameChange }: CharacterSheetProps) => {
    // Ephemeral State (Session Scope)
    const [resourceValues, setResourceValues] = useState<Record<string, number>>({});
    const [rollHistory, setRollHistory] = useState<RollResult[]>([]);

    // Initialize resource values on load or when definitions change
    useEffect(() => {
        const initialValues: Record<string, number> = {};
        state.resources.forEach(r => {
            // Preserve current value if exists, otherwise set to initial
            initialValues[r.id] = resourceValues[r.id] ?? r.initial;
        });
        setResourceValues(initialValues);
    }, [state.resources]);

    // Handle Resource Updates (Ephemeral)
    const handleResourceUpdate = (updates: { id: string; delta: number }[]) => {
        setResourceValues(prev => {
            const next = { ...prev };
            updates.forEach(({ id, delta }) => {
                const resource = state.resources.find(r => r.id === id);
                if (resource) {
                    const current = next[id] ?? resource.initial;
                    const newValue = Math.min(resource.max, Math.max(resource.min, current + delta));
                    next[id] = newValue;
                }
            });
            return next;
        });
    };

    // Calculate Display State (Reactive to Resource Changes)
    const displayState = useMemo(() => {
        // Clone state to avoid mutation
        const next: CharacterState = {
            ...state,
            stats: { ...state.stats },
            derivedStats: { ...state.derivedStats }
        };

        // Prepare overrides with current resource values
        const overrides: Record<string, number> = {};
        state.resources.forEach(r => {
            const val = resourceValues[r.id] ?? r.initial;
            overrides[r.name] = val;
            // Also override by ID if different (e.g. "HP" vs "Hit Points")
            if (r.id !== r.name) overrides[r.id] = val;
        });

        // Helper to re-calculate dynamic modifiers
        const applyDynamicUpdates = (modifiers: Record<string, string> | undefined) => {
            if (!modifiers) return;
            for (const [key, formula] of Object.entries(modifiers)) {
                const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;

                // Calculate with initial values (Max HP etc) - this is what is currently in state.stats
                const initialVal = CharacterCalculator.evaluateFormula(formula, state);

                // Calculate with current values
                const currentVal = CharacterCalculator.evaluateFormula(formula, state, overrides);

                const delta = currentVal - initialVal;
                if (delta !== 0) {
                    next.stats[normalizedKey] = (next.stats[normalizedKey] || 0) + delta;
                }
            }
        };

        // Re-apply all dynamic modifiers
        state.equipment.forEach(i => applyDynamicUpdates(i.dynamicModifiers));
        state.skills.forEach(s => applyDynamicUpdates(s.dynamicModifiers));

        // Recalculate Derived Stats (e.g. Attack, Defense which might depend on modified stats or resources)
        const formulas = CharacterCalculator.getFormulas(state);
        CharacterCalculator.calculateDerivedStats(next, formulas, overrides);

        return next;
    }, [state, resourceValues]);

    // Handle Rolls (Ephemeral)
    const handleRoll = (result: RollResult) => {
        setRollHistory(prev => [result, ...prev]);
    };

    // Helper for quick rolls
    const performRoll = (formula: string, description?: string) => {
        // Use displayState as base so we get updated stats (e.g. Attack)
        const tempState = { ...displayState };

        // Inject current resource values into stats so {HP} works in the roll formula itself
        state.resources.forEach(r => {
            const val = resourceValues[r.id] ?? r.initial;
            tempState.stats = { ...tempState.stats, [r.name]: val };
        });

        const result = DiceRoller.roll(formula, tempState);

        // Add description to result details if present
        if (description) {
            result.details += ` ${description}`;
        }

        handleRoll(result);
    };

    const renderStats = () => {
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
                                    onClick={() => performRoll(`2d6 + {${key}}`, `${label} Check`)}
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
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => onAddLog({
                                        type: 'FORGET_SKILL',
                                        skill: { id: skill.id } as any,
                                        description: `Forgot ${skill.name}`
                                    })}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-medium flex items-center gap-2">
                                    {skill.name}
                                    {skill.cost && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Cost: {skill.cost}</span>}
                                    {skill.magicGrade && <span className="text-xs bg-secondary/10 text-secondary-foreground px-1.5 py-0.5 rounded">Grade: {skill.magicGrade}</span>}
                                </div>
                            </div>

                            {/* Detailed Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2 font-mono">
                                {skill.timing && <div><span className="opacity-70">Timing:</span> {skill.timing}</div>}
                                {skill.range && <div><span className="opacity-70">Range:</span> {skill.range}</div>}
                                {skill.target && <div><span className="opacity-70">Target:</span> {skill.target}</div>}
                                {skill.shape && <div><span className="opacity-70">Shape:</span> {skill.shape}</div>}
                                {skill.duration && <div><span className="opacity-70">Duration:</span> {skill.duration}</div>}
                                {skill.cooldown && <div><span className="opacity-70">CT:</span> {skill.cooldown}</div>}
                                {skill.activeCheck && <div><span className="opacity-70">Active:</span> {skill.activeCheck}</div>}
                                {skill.passiveCheck && <div><span className="opacity-70">Passive:</span> {skill.passiveCheck}</div>}
                            </div>

                            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border-t pt-2 mt-1">
                                {skill.description}
                            </div>

                            {/* Skill Mechanics Display */}
                            {(skill.rollModifier || skill.effect || skill.activeCheck) && (
                                <div className="mt-2 pt-2 border-t flex gap-4 text-xs font-mono text-foreground/80">
                                    {/* Active Check Roll Button */}
                                    {skill.activeCheck && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Check:</span>
                                            {skill.activeCheck}
                                            {skill.rollModifier && <span className="text-primary"> {skill.rollModifier}</span>}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 ml-1"
                                                onClick={() => {
                                                    // Resolve formula
                                                    // 1. Check if activeCheck is a known standard formula
                                                    const baseFormula = STANDARD_CHECK_FORMULAS[skill.activeCheck!] || skill.activeCheck!;
                                                    // 2. Append modifier if present
                                                    const fullFormula = skill.rollModifier
                                                        ? `${baseFormula} + ${skill.rollModifier}`
                                                        : baseFormula;

                                                    performRoll(fullFormula, `${skill.name} (${skill.activeCheck})`);
                                                }}
                                                title="Roll Check"
                                            >
                                                <Dices className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Effect Roll Button */}
                                    {skill.effect && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Effect:</span>
                                            {skill.effect}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 ml-1"
                                                onClick={() => performRoll(skill.effect!, `${skill.name} Effect`)}
                                                title="Roll Effect"
                                            >
                                                <Dices className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Chat Palette */}
                            {skill.chatPalette && (
                                <details className="mt-2 pt-2 border-t text-xs">
                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">Chat Palette</summary>
                                    <div className="mt-2 p-2 bg-muted/50 rounded font-mono whitespace-pre-wrap select-all">
                                        {skill.chatPalette}
                                    </div>
                                </details>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <CharacterHeader
                name={name}
                avatarUrl={character?.avatarUrl || undefined}
                bio={character?.bio || undefined}
                specialtyElements={character?.specialtyElements || undefined}
                exp={state.exp}
                onNameChange={onNameChange}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                                                        <span className="text-2xl font-bold font-mono">
                                                            {resourceValues[resource.id] ?? resource.initial}
                                                        </span>
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
                                    {/* Skill Acquisition Summary */}
                                    <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-foreground">Total:</span>
                                            <span className="font-mono">{state.skills.length}</span>
                                        </div>
                                        <div className="w-px h-4 bg-border self-center hidden sm:block" />
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-foreground">無料 (Free):</span>
                                            <span className="font-mono">{state.skills.filter(s => s.acquisitionType === 'Free').length}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-foreground">自由 (Standard):</span>
                                            <span className="font-mono">{state.skills.filter(s => s.acquisitionType === 'Standard' || !s.acquisitionType).length}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-foreground">グレード (Grade):</span>
                                            <span className="font-mono">{state.skills.filter(s => s.acquisitionType === 'Grade').length}</span>
                                        </div>
                                    </div>

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
                                                <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => onAddLog({
                                                            type: 'UNEQUIP',
                                                            item: { id: item.id } as any,
                                                            description: `Unequipped ${item.name}`
                                                        })}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
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
                            <LogEditor onAddLog={onAddLog} />
                            <Card>
                                <CardHeader>
                                    <CardTitle>History Log</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {[...logs].reverse().map((log) => (
                                            <div key={log.id} className="text-sm border-b pb-2 last:border-0 group relative pr-8">
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
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                    onClick={() => onDeleteLog(log.id)}
                                                    title="Delete Log"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
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
                    <DicePanel
                        state={state}
                        resourceValues={resourceValues}
                        rollHistory={rollHistory}
                        onRoll={handleRoll}
                        onResourceUpdate={handleResourceUpdate}
                    />
                </div>
            </div>
        </div>
    );
};
