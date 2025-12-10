/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { now } from '@/domain/values/time';
import { Plus, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CharacterEvent } from '../../domain/Event';
import { CharacterState } from '../../domain/models';
import { SkillEntity as Skill } from '../../domain/Skill';
import { SkillAcquisitionDialog } from './SkillAcquisitionDialog';
import { SkillEditorDialog } from './SkillEditorDialog';

interface SkillsPanelProps {
    state: CharacterState;
    onRoll: (formula: string, description?: string) => void;
    isEditMode?: boolean;
    onAddSkill?: (skill: Skill, cost?: number) => void;
    onUpdateSkill?: (skill: Skill) => void;
    onAddLog: (log: Omit<CharacterEvent, 'id' | 'timestamp'>) => void;
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
        const timestamp = now();
        // Generates a mock ID for wishlist purposes if needed, though onAddLog usually handles ID in parent or Factory
        // But here we construct raw objects for wishlist events

        if (editingSkill?.mode === 'add' && onAddSkill) {
            onAddSkill({ ...skill, id: crypto.randomUUID() } as Skill);
        } else if (editingSkill?.mode === 'edit' && onUpdateSkill) {
            onUpdateSkill(skill as Skill);
        } else if (editingSkill?.mode === 'wishlist_add') {
            // We need to pass a full event. 
            // We'll trust the parent to ignore ID/Timestamp or we provide dummies that parent overwrites.
            // or we use Omit<..., 'id'|'timestamp'>.
            onAddLog({
                type: 'WISHLIST_SKILL_ADDED',
                skill: { ...skill, id: crypto.randomUUID() } as Skill,
                description: `Added to wishlist: ${skill.name}`
            } as any);
        } else if (editingSkill?.mode === 'wishlist_edit') {
            // WISHLIST_SKILL_UPDATED - Wait, this doesn't exist in Event.ts?
            // "SkillUpdatedEventSchema" is generic. But maybe we need "WishlistSkillUpdated"?
            // Event.ts only has Added/Removed for Wishlist.
            // If we want to edit a wishlist item, maybe Remove then Add? Or just Update (generic)?
            // Using Remove then Add logic or generic SKILL_UPDATED might be tricky if it's not in skills list.
            // Let's assume we use Remove+Add for now or fail. 
            // Or just use SKILL_UPDATED if it works for wishlist skills (state.skillWishlist).
            // But SKILL_UPDATED expects "newSkill" and "skillId".
            // If the ID matches a wishlist skill, Reducer should update it.
            // Let's rely on SKILL_UPDATED working for wishlist items if the ID matches.
            onAddLog({
                type: 'SKILL_UPDATED',
                skillId: (skill as Skill).id,
                newSkill: skill as Skill,
                description: `Updated wishlist skill: ${skill.name}`
            } as any);
        }
        setEditingSkill(null);
    };

    const handleConfirmAcquisition = (cost: number, isSuccess: boolean, type: 'Free' | 'Standard' | 'Grade') => {
        if (!acquiringSkill) return;

        // 1. Add Skill (if success)
        if (isSuccess && onAddSkill) {
            // Pass cost to onAddSkill so it's included in the LEARN_SKILL log
            onAddSkill({ ...acquiringSkill, acquisitionType: type } as any, cost);

            // 2. Remove from Wishlist
            onAddLog({
                type: 'WISHLIST_SKILL_REMOVED',
                skillId: acquiringSkill.id,
                description: `Acquired from wishlist: ${acquiringSkill.name}`
            } as any);
        } else if (!isSuccess && cost > 0) {
            // Failure case
            onAddLog({
                type: 'EXPERIENCE_SPENT',
                amount: cost,
                target: `Failed attempt for ${acquiringSkill.name}`,
                description: `Spent ${cost} EXP on failed attempt for: ${acquiringSkill.name}`
            } as any);
        }

        setAcquiringSkill(null);
    };

    const handleAcquireSkill = (skill: Partial<Skill>, cost: number, isSuccess: boolean) => {
        // 1. Add Skill (if success)
        if (isSuccess && onAddSkill) {
            onAddSkill({ ...skill, id: crypto.randomUUID() } as Skill, cost);
        } else if (!isSuccess && cost > 0) {
            // Failure case
            onAddLog({
                type: 'EXPERIENCE_SPENT',
                amount: cost,
                target: `Failed attempt for ${skill.name}`,
                description: `Spent ${cost} EXP on failed attempt for: ${skill.name}`
            } as any);
        }

        setEditingSkill(null);
    };

    const SKILL_CATEGORY_LABELS: Record<string, string> = {
        'ACTIVE': 'アクティブ (Active)',
        'PASSIVE': 'パッシブ (Passive)',
        'SPELL': '魔術 (Spell)',
    };

    const renderSkillSection = (category: string, skills: Skill[]) => {
        if (skills.length === 0) return null;
        const displayTitle = SKILL_CATEGORY_LABELS[category] || category;
        return (
            <div className="mb-6 last:mb-0">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    {displayTitle}
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {skills.length}
                    </span>
                </h3>
                <div className="grid gap-3">
                    {skills.map(skill => {
                        const variant = skill.variants[skill.currentVariant || 'default'] || skill.variants['default'];

                        return (
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
                                            type: 'SKILL_FORGOTTEN',
                                            skillId: skill.id,
                                            description: `Forgot ${skill.name}`
                                        } as any)}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>

                                <div className="flex justify-between items-start mb-1 pr-16">
                                    <div className="font-medium flex items-center gap-2 flex-wrap">
                                        {skill.name}
                                        {skill.acquisitionMethod && skill.acquisitionMethod !== 'Standard' && (
                                            <Badge variant="outline" className="text-[10px] h-5">
                                                {skill.acquisitionMethod}
                                            </Badge>
                                        )}
                                        {/* Cost/Grade might need to be resolved from somewhere else or tags/variants */}
                                        {/* {skill.cost && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Cost: {skill.cost}</span>} */}
                                    </div>
                                </div>

                                {/* Detailed Stats Grid - From Active Variant */}
                                {skill.category === 'ACTIVE' && variant && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2 font-mono">
                                        {(variant as any).timing && <div><span className="opacity-70">Timing:</span> {(variant as any).timing}</div>}
                                        {(variant as any).range && <div><span className="opacity-70">Range:</span> {(variant as any).range}</div>}
                                        {(variant as any).target && <div><span className="opacity-70">Target:</span> {(variant as any).target}</div>}
                                        {(variant as any).cost && <div><span className="opacity-70">Cost:</span> {(variant as any).cost}</div>}
                                    </div>
                                )}

                                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border-t pt-2 mt-1">
                                    {skill.description}
                                    {(variant as any)?.description && (variant as any).description !== skill.description && (
                                        <div className="mt-1 text-xs opacity-90 border-t border-dashed pt-1">
                                            {/* Variant specific description if different */}
                                            {(variant as any).description}
                                        </div>
                                    )}
                                </div>

                                {/* Mechanics/Rolling - Simplified for now as ActiveCheck/etc are not standard props anymore */}
                                {/* If we have specific tags or known variant fields, we might render buttons */}
                            </div>
                        );
                    })}
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
                </div>

                {/* Dynamically render skill sections based on categories */}
                {(() => {
                    const standardCategory = ['ACTIVE', 'PASSIVE', 'SPELL'];
                    const allCategories = Array.from(new Set(state.skills.map(s => s.category)));
                    return allCategories.map(cat => (
                        <div key={cat}>
                            {renderSkillSection(cat, state.skills.filter(s => s.category === cat))}
                        </div>
                    ));
                })()}

                {/* Wishlist Section */}
                {state.skillWishlist && state.skillWishlist.length > 0 && (
                    <div className="mt-8 border-t pt-6">
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
                                                    type: 'WISHLIST_SKILL_REMOVED',
                                                    skillId: skill.id as any,
                                                    description: `Removed from wishlist: ${skill.name}`
                                                } as any)}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-start mb-1 pr-32">
                                        <div className="font-medium flex items-center gap-2 flex-wrap">
                                            {skill.name}
                                            <Badge variant="outline" className="text-[10px] h-5">
                                                {SKILL_CATEGORY_LABELS[skill.category] || skill.category}
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
                        currentStandardSkills={state.skills.filter(s => s.acquisitionMethod === 'Standard' || !s.acquisitionMethod).length}
                    />
                )}
                {acquiringSkill && (
                    <SkillAcquisitionDialog
                        isOpen={!!acquiringSkill}
                        onClose={() => setAcquiringSkill(null)}
                        skill={acquiringSkill}
                        onConfirm={handleConfirmAcquisition}
                        currentStandardSkills={state.skills.filter(s => s.acquisitionMethod === 'Standard' || !s.acquisitionMethod).length}
                        currentExp={state.exp.free}
                    />
                )}
            </CardContent>
        </Card>
    );
};
