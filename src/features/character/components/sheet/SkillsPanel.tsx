import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dices, Plus, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CharacterLogEntry, CharacterState, Skill } from '../../domain/CharacterLog';
import { STANDARD_CHECK_FORMULAS } from '../../domain/constants';
import { SkillAcquisitionDialog } from './SkillAcquisitionDialog';
import { SkillEditorDialog } from './SkillEditorDialog';

interface SkillsPanelProps {
    state: CharacterState;
    onRoll: (formula: string, description?: string) => void;
    isEditMode?: boolean;
    onAddSkill?: (skill: Skill) => void;
    onUpdateSkill?: (skill: Skill) => void;
    onAddLog: (log: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => void;
}

export const SkillsPanel = ({ state, onAddLog, onRoll, isEditMode = false, onAddSkill, onUpdateSkill }: SkillsPanelProps) => {
    const [editingSkill, setEditingSkill] = useState<{ skill: Partial<Skill>; mode: 'add' | 'edit' | 'wishlist_add' | 'wishlist_edit' } | null>(null);
    const [acquiringSkill, setAcquiringSkill] = useState<Skill | null>(null);

    const handleAddClick = () => {
        setEditingSkill({ skill: {}, mode: 'add' });
    };

    const handleEditClick = (skill: Skill) => {
        setEditingSkill({ skill, mode: 'edit' });
    };

    const handleSaveSkill = (skill: Partial<Skill>) => {
        if (editingSkill?.mode === 'add' && onAddSkill) {
            onAddSkill({ ...skill, id: crypto.randomUUID() } as Skill);
        } else if (editingSkill?.mode === 'edit' && onUpdateSkill) {
            onUpdateSkill(skill as Skill);
        } else if (editingSkill?.mode === 'wishlist_add') {
            onAddLog({
                type: 'ADD_WISHLIST_SKILL',
                skill: { ...skill, id: crypto.randomUUID() } as Skill,
                description: `Added to wishlist: ${skill.name}`
            });
        } else if (editingSkill?.mode === 'wishlist_edit') {
            onAddLog({
                type: 'UPDATE_WISHLIST_SKILL',
                skill: skill as Skill,
                description: `Updated wishlist skill: ${skill.name}`
            });
        }
        setEditingSkill(null);
    };

    const handleConfirmAcquisition = (cost: number, isSuccess: boolean, type: 'Free' | 'Standard' | 'Grade') => {
        if (!acquiringSkill) return;

        // 1. Deduct EXP (if cost > 0)
        if (cost > 0) {
            onAddLog({
                type: 'SPEND_EXP',
                value: cost,
                description: isSuccess
                    ? `Spent ${cost} EXP to acquire skill from wishlist: ${acquiringSkill.name}`
                    : `Spent ${cost} EXP on failed attempt for: ${acquiringSkill.name}`
            });
        }

        // 2. Add Skill (if success)
        if (isSuccess && onAddSkill) {
            onAddSkill({ ...acquiringSkill, acquisitionType: type });

            // 3. Remove from Wishlist
            onAddLog({
                type: 'REMOVE_WISHLIST_SKILL',
                skill: acquiringSkill,
                description: `Acquired from wishlist: ${acquiringSkill.name}`
            });
        }

        setAcquiringSkill(null);
    };

    const handleAcquireSkill = (skill: Partial<Skill>, cost: number, isSuccess: boolean) => {
        // 1. Deduct EXP (if cost > 0)
        if (cost > 0) {
            onAddLog({
                type: 'SPEND_EXP',
                value: cost,
                description: isSuccess
                    ? `Spent ${cost} EXP to acquire skill: ${skill.name}`
                    : `Spent ${cost} EXP on failed attempt for: ${skill.name}`
            });
        }

        // 2. Add Skill (if success)
        if (isSuccess && onAddSkill) {
            onAddSkill({ ...skill, id: crypto.randomUUID() } as Skill);
        }

        setEditingSkill(null);
    };

    const SKILL_TYPE_LABELS: Record<string, string> = {
        'Active': 'アクティブ',
        'Passive': 'パッシブ',
        'Spell': '魔術',
        'Other': 'その他',
    };

    const renderSkillSection = (title: string, skills: Skill[]) => {
        if (skills.length === 0) return null;
        const displayTitle = SKILL_TYPE_LABELS[title] || title;
        return (
            <div className="mb-6 last:mb-0">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    {displayTitle}
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {skills.length}
                    </span>
                </h3>
                <div className="grid gap-3">
                    {skills.map(skill => (
                        <div key={skill.id} className="p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors group relative">
                            {/* Delete Button (Hover) */}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                {isEditMode && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                        onClick={() => handleEditClick(skill)}
                                    >
                                        <Settings2 size={16} />
                                    </Button>
                                )}
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

                            <div className="flex justify-between items-start mb-1 pr-16">
                                <div className="font-medium flex items-center gap-2 flex-wrap">
                                    {skill.name}
                                    {skill.acquisitionType && skill.acquisitionType !== 'Standard' && (
                                        <Badge variant="outline" className="text-[10px] h-5">
                                            {skill.acquisitionType}
                                        </Badge>
                                    )}
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
                                                    const baseFormula = STANDARD_CHECK_FORMULAS[skill.activeCheck!] || skill.activeCheck!;
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

                {/* Wishlist Section */}
                {state.skillWishlist && state.skillWishlist.length > 0 && (
                    <div className="mb-8 border-b pb-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-primary">
                            ほしいものリスト (Wishlist)
                            <span className="text-xs font-normal text-primary-foreground bg-primary px-2 py-0.5 rounded-full">
                                {state.skillWishlist.length}
                            </span>
                        </h3>
                        <div className="grid gap-3">
                            {state.skillWishlist.map(skill => (
                                <div key={skill.id} className="p-3 border rounded-lg bg-card/50 hover:bg-accent/5 transition-colors group relative border-dashed border-primary/30">
                                    {/* Actions */}
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => setAcquiringSkill(skill)}
                                            className="h-8"
                                        >
                                            習得する
                                        </Button>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                onClick={() => setEditingSkill({ skill, mode: 'wishlist_edit' })}
                                            >
                                                <Settings2 size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => onAddLog({
                                                    type: 'REMOVE_WISHLIST_SKILL',
                                                    skill: skill,
                                                    description: `Removed from wishlist: ${skill.name}`
                                                })}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-start mb-1 pr-32">
                                        <div className="font-medium flex items-center gap-2 flex-wrap">
                                            {skill.name}
                                            <Badge variant="outline" className="text-[10px] h-5">
                                                {SKILL_TYPE_LABELS[skill.type] || skill.type}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-1">
                                        {skill.description}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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

                {isEditMode && (
                    <div className="mt-6 border-t pt-4">
                        <Button className="w-full" variant="outline" onClick={handleAddClick}>
                            <Plus className="mr-2 h-4 w-4" /> スキルを追加
                        </Button>
                        <Button className="w-full mt-2" variant="ghost" onClick={() => setEditingSkill({ skill: {}, mode: 'wishlist_add' })}>
                            <Plus className="mr-2 h-4 w-4" /> ほしいものリストに追加
                        </Button>
                    </div>
                )}

                {editingSkill && (
                    <SkillEditorDialog
                        isOpen={!!editingSkill}
                        onClose={() => setEditingSkill(null)}
                        initialSkill={editingSkill.skill}
                        onSave={handleSaveSkill}
                        onAcquire={handleAcquireSkill}
                        mode={editingSkill.mode}
                        currentStandardSkills={state.skills.filter(s => s.acquisitionType === 'Standard' || !s.acquisitionType).length}
                    />
                )}

                {acquiringSkill && (
                    <SkillAcquisitionDialog
                        isOpen={!!acquiringSkill}
                        onClose={() => setAcquiringSkill(null)}
                        skill={acquiringSkill}
                        onConfirm={handleConfirmAcquisition}
                        currentStandardSkills={state.skills.filter(s => s.acquisitionType === 'Standard' || !s.acquisitionType).length}
                    />
                )}
            </CardContent>
        </Card>
    );
};
