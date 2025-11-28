import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dices, Trash2 } from 'lucide-react';
import { CharacterLogEntry, CharacterState, Skill } from '../../domain/CharacterLog';
import { STANDARD_CHECK_FORMULAS } from '../../domain/constants';

interface SkillsPanelProps {
    state: CharacterState;
    onAddLog: (log: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => void;
    onRoll: (formula: string, description?: string) => void;
}

export const SkillsPanel = ({ state, onAddLog, onRoll }: SkillsPanelProps) => {
    const renderSkillSection = (title: string, skills: Skill[]) => {
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
                                        skill: skill,
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

                                                    onRoll(fullFormula, `${skill.name} (${skill.activeCheck})`);
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
                                                onClick={() => onRoll(skill.effect!, `${skill.name} Effect`)}
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
    );
};
