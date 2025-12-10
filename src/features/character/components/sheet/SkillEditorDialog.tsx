import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SkillEntity as Skill } from '@/features/character/domain/Skill';
import React, { useEffect, useState } from 'react';
import { CharacterCalculator } from '../../domain/CharacterCalculator';

// Flattened state for editing to avoid Union hell in form
interface FlattenedSkillState {
    name: string;
    type: string;
    acquisitionType: string;
    description: string;
    // Active / Variant fields
    effect: string;
    timing: string;
    rollModifier: string;
    target: string;
    range: string;
    cost: string;
    restriction: string;
    chatPalette: string;
}

interface SkillEditorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialSkill?: Partial<Skill>;
    onSave: (skill: Partial<Skill>) => void;
    onAcquire?: (skill: Partial<Skill>, cost: number, isSuccess: boolean) => void;
    mode: 'add' | 'edit' | 'wishlist_add' | 'wishlist_edit';
    currentStandardSkills?: number;
}

export const SkillEditorDialog: React.FC<SkillEditorDialogProps> = ({
    isOpen,
    onClose,
    initialSkill,
    onSave,
    onAcquire,
    mode,
    currentStandardSkills = 0
}) => {
    const [skillState, setSkillState] = useState<FlattenedSkillState>({
        name: '',
        type: 'Passive',
        acquisitionType: 'Standard',
        description: '',
        effect: '',
        timing: '',
        rollModifier: '',
        target: '',
        range: '',
        cost: '',
        restriction: '',
        chatPalette: '',
    });

    useEffect(() => {
        if (isOpen) {
            const initFn = async () => {
                // Initialize from initialSkill if present
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const s = initialSkill as any;
                const variant = s?.variants?.['default'] || {};

                setSkillState({
                    name: s?.name || '',
                    type: s?.category === 'ACTIVE' ? (s?.subType || 'Active') : 'Passive',
                    acquisitionType: s?.acquisitionMethod || 'Standard',
                    description: s?.description || '',
                    effect: variant.effect || '', // For Active
                    // Passive modifiers are harder to map effectively to single string "effect", 
                    // but for now we assume simple storage or legacy string mapping?
                    // "effect" field in UI seems to imply text description of effect.

                    timing: variant.timing || '',
                    rollModifier: variant.rollFormula || '',
                    target: variant.target || '',
                    range: variant.range || '',
                    cost: variant.cost || '',
                    restriction: variant.restriction || '',
                    chatPalette: variant.chatPalette || '',
                });
            }
            initFn();
        }
    }, [isOpen, initialSkill]);

    const handleChange = (field: keyof FlattenedSkillState, value: string) => {
        setSkillState(prev => ({ ...prev, [field]: value }));
    };

    const buildSkillEntity = (): Partial<Skill> => {
        // Construct the Entity based on Flattened State
        const isPassive = skillState.type === 'Passive';

        const base = {
            name: skillState.name,
            description: skillState.description,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            acquisitionMethod: skillState.acquisitionType as any,
            tags: [], // Default
        };

        if (isPassive) {
            return {
                ...base,
                category: 'PASSIVE',
                variants: {
                    default: {
                        restriction: skillState.restriction,
                        // Simplification: We don't have a field for "modifiers" JSON editing yet.
                        // Ideally we'd parse "effect" string or have dedicated fields.
                        // preserving legacy "effect" in a comment or separate field if needed?
                        // For Passive, we only have 'passiveCheck', 'modifiers', 'overrides'.
                        passiveCheck: skillState.effect, // Mapping effect text to passiveCheck
                    }
                }
            } as Partial<Skill>; // Cast as Partial
        } else {
            return {
                ...base,
                category: 'ACTIVE',
                subType: skillState.type,
                variants: {
                    default: {
                        timing: skillState.timing,
                        target: skillState.target,
                        range: skillState.range,
                        cost: skillState.cost,
                        rollFormula: skillState.rollModifier,
                        effect: skillState.effect,
                        restriction: skillState.restriction,
                        chatPalette: skillState.chatPalette,
                    }
                }
            } as Partial<Skill>;
        }
    };

    const handleSave = () => {
        onSave(buildSkillEntity());
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{mode === 'add' ? 'スキル習得' : 'スキル編集'}</DialogTitle>
                    <DialogDescription>
                        スキルの詳細を入力してください。
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>スキル名</Label>
                            <Input value={skillState.name} onChange={e => handleChange('name', e.target.value)} placeholder="名称" />
                        </div>
                        <div className="grid gap-2">
                            <Label>種別</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={skillState.type}
                                    onChange={e => handleChange('type', e.target.value)}
                                    placeholder="種別 (Active/Passive/Spell...)"
                                    className="flex-1"
                                />
                                <Select
                                    value={['Active', 'Passive', 'Spell'].includes(skillState.type) ? skillState.type : undefined}
                                    onValueChange={(val) => handleChange('type', val)}
                                >
                                    <SelectTrigger className="w-[40px] px-2">
                                        {/* Icon only trigger */}
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Passive">Passive</SelectItem>
                                        <SelectItem value="Spell">Spell</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {!mode.includes('wishlist') && (
                        <div className="grid gap-2">
                            <Label>習得種別</Label>
                            <Select
                                value={skillState.acquisitionType}
                                onValueChange={(val) => handleChange('acquisitionType', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="習得種別" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Free">無料習得 (初期作成など)</SelectItem>
                                    <SelectItem value="Standard">自由習得 (EXP消費)</SelectItem>
                                    <SelectItem value="Grade">グレード習得 (自動)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>概要 (フレーバーテキスト)</Label>
                        <Input value={skillState.description} onChange={e => handleChange('description', e.target.value)} />
                    </div>

                    <div className="grid gap-2">
                        <Label>効果 / 補正</Label>
                        <Input value={skillState.effect} onChange={e => handleChange('effect', e.target.value)} placeholder="攻撃+1, ダメージ軽減など" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                        <div className="grid gap-2">
                            <Label>タイミング</Label>
                            <Input value={skillState.timing} onChange={e => handleChange('timing', e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>判定 (Roll)</Label>
                            <Input value={skillState.rollModifier} onChange={e => handleChange('rollModifier', e.target.value)} placeholder="2d6+Str" />
                        </div>
                        <div className="grid gap-2">
                            <Label>対象</Label>
                            <Input value={skillState.target} onChange={e => handleChange('target', e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>射程</Label>
                            <Input value={skillState.range} onChange={e => handleChange('range', e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>コスト</Label>
                            <Input value={skillState.cost} onChange={e => handleChange('cost', e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>制限</Label>
                            <Input value={skillState.restriction} onChange={e => handleChange('restriction', e.target.value)} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>チャットパレット (任意)</Label>
                        <Textarea
                            value={skillState.chatPalette}
                            onChange={(e) => handleChange('chatPalette', e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    <Button variant="outline" onClick={onClose}>キャンセル</Button>

                    {mode === 'add' ? (
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            {(() => {
                                const type = (skillState.acquisitionType as 'Free' | 'Standard' | 'Grade') || 'Standard';
                                const costs = CharacterCalculator.calculateSkillCost(currentStandardSkills, type);
                                const skillEntity = buildSkillEntity();

                                if (type === 'Grade') {
                                    return (
                                        <>
                                            <Button
                                                variant="secondary"
                                                onClick={() => onAcquire?.(skillEntity, 0, false)}
                                            >
                                                失敗 (初回 0)
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => onAcquire?.(skillEntity, 1, false)}
                                            >
                                                失敗 (再 1)
                                            </Button>
                                            <Button onClick={() => onAcquire?.(skillEntity, 0, true)}>
                                                成功 (0)
                                            </Button>
                                        </>
                                    );
                                } else {
                                    // Free / Standard
                                    return (
                                        <>
                                            <Button
                                                variant="secondary"
                                                onClick={() => onAcquire?.(skillEntity, costs.failure, false)}
                                            >
                                                失敗 ({costs.failure})
                                            </Button>
                                            <Button onClick={() => onAcquire?.(skillEntity, costs.success, true)}>
                                                習得 ({costs.success})
                                            </Button>
                                        </>
                                    );
                                }
                            })()}
                        </div>
                    ) : (
                        <Button onClick={handleSave}>
                            {mode === 'wishlist_add' ? 'リストに追加' : '保存'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
