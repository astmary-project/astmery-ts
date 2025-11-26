'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Item, Skill } from '@/features/character/domain/CharacterLog';
import { ABILITY_STATS, JAPANESE_TO_ENGLISH_STATS, STAT_LABELS } from '@/features/character/domain/constants';
import { useCharacterSheet } from '@/features/character/hooks/useCharacterSheet';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface SpecialtyElementInput {
    name: string;
    benefit: string;
}

interface SkillInput {
    id: string;
    name: string;
    type: string;
    effect: string;
}

interface ItemInput {
    id: string;
    name: string;
    type: 'Weapon' | 'Armor' | 'Accessory' | 'Other';
    effect: string;
}

export default function CharacterSetupPage() {
    const params = useParams();
    const router = useRouter();
    const characterId = params.id as string;
    const { name, character, state, logs, isLoading, updateName, updateProfile, addLog, updateCharacter } = useCharacterSheet(characterId);

    // Local form state
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        stats: {} as Record<string, number>,
    });
    const [specialtyElements, setSpecialtyElements] = useState<SpecialtyElementInput[]>([]);
    const [skills, setSkills] = useState<SkillInput[]>([]);
    const [equipment, setEquipment] = useState<ItemInput[]>([]);

    const [isInitialized, setIsInitialized] = useState(false);
    const initialSkillsRef = useRef<Skill[]>([]);
    const initialEquipmentRef = useRef<Item[]>([]);

    // Load initial data
    useEffect(() => {
        if (!isLoading && !isInitialized) {
            setFormData({
                name: name,
                bio: character?.bio || '',
                stats: { ...state.stats },
            });

            // Parse existing specialty elements
            const elements = (character?.specialtyElements || []).map(el => {
                const match = el.match(/^(.+)\((.+)\)$/);
                if (match) {
                    return { name: match[1], benefit: match[2] };
                }
                return { name: el, benefit: '' };
            });
            if (elements.length === 0) {
                elements.push({ name: '', benefit: '' });
            }
            setSpecialtyElements(elements);

            // Load Skills
            initialSkillsRef.current = state.skills;
            setSkills(state.skills.map(s => ({
                id: s.id,
                name: s.name,
                type: s.type,
                effect: s.description || '', // Using description as effect for now
            })));

            // Load Equipment
            initialEquipmentRef.current = state.equipment;
            setEquipment(state.equipment.map(i => ({
                id: i.id,
                name: i.name,
                type: i.type as any,
                effect: i.description || '',
            })));

            setIsInitialized(true);
        }
    }, [isLoading, isInitialized, name, character, state.stats, state.skills, state.equipment]);

    const handleStatChange = (key: string, value: string) => {
        const numValue = parseInt(value) || 0;
        setFormData(prev => ({
            ...prev,
            stats: {
                ...prev.stats,
                [key]: numValue
            }
        }));
    };

    const handleElementChange = (index: number, field: keyof SpecialtyElementInput, value: string) => {
        const newElements = [...specialtyElements];
        newElements[index][field] = value;
        setSpecialtyElements(newElements);
    };

    const addElement = () => {
        setSpecialtyElements([...specialtyElements, { name: '', benefit: '' }]);
    };

    const removeElement = (index: number) => {
        const newElements = specialtyElements.filter((_, i) => i !== index);
        setSpecialtyElements(newElements);
    };

    // Skills Handlers
    const handleSkillChange = (index: number, field: keyof SkillInput, value: string) => {
        const newSkills = [...skills];
        // @ts-ignore
        newSkills[index][field] = value;
        setSkills(newSkills);
    };
    const addSkill = () => {
        setSkills([...skills, { id: crypto.randomUUID(), name: '', type: 'Passive', effect: '' }]);
    };
    const removeSkill = (index: number) => {
        setSkills(skills.filter((_, i) => i !== index));
    };

    // Equipment Handlers
    const handleEquipmentChange = (index: number, field: keyof ItemInput, value: string) => {
        const newItems = [...equipment];
        // @ts-ignore
        newItems[index][field] = value;
        setEquipment(newItems);
    };
    const addEquipment = () => {
        setEquipment([...equipment, { id: crypto.randomUUID(), name: '', type: 'Weapon', effect: '' }]);
    };
    const removeEquipment = (index: number) => {
        setEquipment(equipment.filter((_, i) => i !== index));
    };

    const parseEffect = (effect: string) => {
        const statModifiers: Record<string, number> = {};
        // Split by comma or space
        const parts = effect.split(/[,、\s]+/);
        for (const part of parts) {
            const match = part.match(/^(.+?)([+\-])(\d+)$/);
            if (match) {
                const rawStat = match[1].trim();
                const op = match[2];
                const val = parseInt(match[3]);
                const statKey = JAPANESE_TO_ENGLISH_STATS[rawStat] || rawStat;
                if (statKey) {
                    statModifiers[statKey] = op === '-' ? -val : val;
                }
            }
        }
        return statModifiers;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prepare new logs
        const logsToAdd: any[] = [];

        // Only process editable stats (Grade + Ability Stats)
        const editableStats = ['Grade', ...ABILITY_STATS];

        for (const key of editableStats) {
            const currentVal = state.stats[key] || 0;
            const targetVal = formData.stats[key] || 0;
            const diff = targetVal - currentVal;

            if (diff !== 0) {
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'GROWTH',
                    statKey: key,
                    value: diff,
                    description: 'セットアップウィザードによる調整',
                });
            }
        }

        // 2. Parse Benefits and add logs
        for (const el of specialtyElements) {
            if (!el.benefit) continue;
            // ... (Same parsing logic as before, but maybe we should rely on user to not duplicate?)
            // Actually, for Specialty Elements, we just append logs.
            // But wait, if we re-save, we might duplicate logs.
            // Ideally we should check if this log already exists.
            // For now, let's assume this is mostly for initial setup.
            // Or we can just skip this part if we assume user edits stats directly in the form?
            // No, the user expects "Benefit" to apply automatically.
            // Let's keep it simple: Parse and add logs.

            const match = el.benefit.match(/^(.+?)\s*([+\-])\s*(\d+)$/);
            if (match) {
                const rawStat = match[1].trim();
                const op = match[2];
                const val = parseInt(match[3]);
                const statKey = JAPANESE_TO_ENGLISH_STATS[rawStat] || rawStat;
                const change = op === '-' ? -val : val;

                if (statKey) {
                    logsToAdd.push({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'GROWTH',
                        statKey: statKey,
                        value: change,
                        description: `得意属性: ${el.name} の恩恵`,
                    });
                }
            }
        }

        // 3. Skills Diff
        const initialSkillIds = new Set(initialSkillsRef.current.map(s => s.id));
        const currentSkillIds = new Set(skills.map(s => s.id));

        // Removed Skills
        for (const s of initialSkillsRef.current) {
            if (!currentSkillIds.has(s.id)) {
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'FORGET_SKILL',
                    skill: s,
                });
            }
        }

        // Added or Modified Skills
        for (const s of skills) {
            const statModifiers = parseEffect(s.effect);
            const skillObj: Skill = {
                id: s.id,
                name: s.name,
                type: s.type,
                description: s.effect,
                statModifiers: Object.keys(statModifiers).length > 0 ? statModifiers : undefined,
            };

            const initial = initialSkillsRef.current.find(is => is.id === s.id);
            if (!initial) {
                // New
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'LEARN_SKILL',
                    skill: skillObj,
                });
            } else {
                // Modified?
                // Simple check: if name, type, or effect changed
                // Or just always update if it exists (Remove + Add)
                // Let's check if content changed to avoid log spam
                const initialModifiers = initial.statModifiers || {};
                const isDiff = initial.name !== s.name || initial.type !== s.type || initial.description !== s.effect || JSON.stringify(initialModifiers) !== JSON.stringify(statModifiers);

                if (isDiff) {
                    logsToAdd.push({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'FORGET_SKILL',
                        skill: initial,
                    });
                    logsToAdd.push({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'LEARN_SKILL',
                        skill: skillObj,
                    });
                }
            }
        }

        // 4. Equipment Diff
        const initialItemIds = new Set(initialEquipmentRef.current.map(i => i.id));
        const currentItemIds = new Set(equipment.map(i => i.id));

        // Removed Items
        for (const i of initialEquipmentRef.current) {
            if (!currentItemIds.has(i.id)) {
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'UNEQUIP',
                    item: i,
                });
            }
        }

        // Added or Modified Items
        for (const i of equipment) {
            const statModifiers = parseEffect(i.effect);
            const itemObj: Item = {
                id: i.id,
                name: i.name,
                type: i.type,
                description: i.effect,
                statModifiers: Object.keys(statModifiers).length > 0 ? statModifiers : undefined,
            };

            const initial = initialEquipmentRef.current.find(ii => ii.id === i.id);
            if (!initial) {
                // New
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'EQUIP',
                    item: itemObj,
                });
            } else {
                // Modified?
                const initialModifiers = initial.statModifiers || {};
                const isDiff = initial.name !== i.name || initial.type !== i.type || initial.description !== i.effect || JSON.stringify(initialModifiers) !== JSON.stringify(statModifiers);

                if (isDiff) {
                    logsToAdd.push({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'UNEQUIP',
                        item: initial,
                    });
                    logsToAdd.push({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'EQUIP',
                        item: itemObj,
                    });
                }
            }
        }


        // We need to access the current logs from the hook.
        const finalLogs = [...logs, ...logsToAdd];


        // Format specialty elements
        const formattedElements = specialtyElements
            .filter(el => el.name.trim() !== '')
            .map(el => {
                if (el.benefit.trim()) {
                    return `${el.name}(${el.benefit})`;
                }
                return el.name;
            });

        // Bulk Update
        await updateCharacter({
            name: formData.name,
            profile: {
                bio: formData.bio,
                specialtyElements: formattedElements,
            },
            logs: finalLogs,
        });

        // Redirect to sheet
        router.push(`/character/${characterId}`);
    };

    if (isLoading) {
        return <div className="p-8 text-center">読み込み中...</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>キャラクター設定 (セットアップ)</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">基本情報</h3>
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="name">キャラクター名</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="bio">プロフィール / 設定</Label>
                                <Textarea
                                    id="bio"
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    rows={3}
                                />
                            </div>

                            {/* Specialty Elements */}
                            <div className="space-y-2">
                                <Label>得意属性・要素</Label>
                                <div className="space-y-2">
                                    {specialtyElements.map((el, index) => (
                                        <div key={index} className="flex gap-2 items-start">
                                            <div className="flex-1">
                                                <Input
                                                    placeholder="属性名 (例: 火)"
                                                    value={el.name}
                                                    onChange={e => handleElementChange(index, 'name', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Input
                                                    placeholder="恩恵 (例: 攻撃+1)"
                                                    value={el.benefit}
                                                    onChange={e => handleElementChange(index, 'benefit', e.target.value)}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeElement(index)}
                                                className="text-destructive hover:text-destructive/90"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addElement} className="mt-2">
                                    <Plus className="mr-2 h-4 w-4" /> 要素を追加
                                </Button>
                            </div>
                        </div>

                        {/* Grade */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">グレード</h3>
                            <div className="grid w-full max-w-xs items-center gap-1.5">
                                <Label htmlFor="stat-Grade">{STAT_LABELS['Grade']}</Label>
                                <Input
                                    id="stat-Grade"
                                    type="number"
                                    value={formData.stats['Grade'] || 0}
                                    onChange={e => handleStatChange('Grade', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Ability Stats */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">能力値</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {ABILITY_STATS.map(key => (
                                    <div key={key} className="grid w-full items-center gap-1.5">
                                        <Label htmlFor={`stat-${key}`}>{STAT_LABELS[key] || key}</Label>
                                        <Input
                                            id={`stat-${key}`}
                                            type="number"
                                            value={formData.stats[key] || 0}
                                            onChange={e => handleStatChange(key, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Skills */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">スキル</h3>
                            <div className="space-y-3">
                                {skills.map((skill, index) => (
                                    <div key={skill.id} className="flex gap-2 items-start p-3 border rounded-md bg-card">
                                        <div className="grid gap-2 flex-1">
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="スキル名"
                                                    value={skill.name}
                                                    onChange={e => handleSkillChange(index, 'name', e.target.value)}
                                                    className="flex-1"
                                                />
                                                <div className="flex gap-1">
                                                    <Input
                                                        placeholder="種別"
                                                        value={skill.type}
                                                        onChange={e => handleSkillChange(index, 'type', e.target.value)}
                                                        className="w-[120px]"
                                                    />
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="icon" className="shrink-0">
                                                                <ChevronDown className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleSkillChange(index, 'type', 'Active')}>
                                                                アクティブ
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleSkillChange(index, 'type', 'Passive')}>
                                                                パッシブ
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleSkillChange(index, 'type', 'Magic')}>
                                                                魔術
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                            <Input
                                                placeholder="効果 / 補正 (例: 攻撃+1)"
                                                value={skill.effect}
                                                onChange={e => handleSkillChange(index, 'effect', e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeSkill(index)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addSkill}>
                                <Plus className="mr-2 h-4 w-4" /> スキルを追加
                            </Button>
                        </div>

                        {/* Equipment */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">装備</h3>
                            <div className="space-y-3">
                                {equipment.map((item, index) => (
                                    <div key={item.id} className="flex gap-2 items-start p-3 border rounded-md bg-card">
                                        <div className="grid gap-2 flex-1">
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="アイテム名"
                                                    value={item.name}
                                                    onChange={e => handleEquipmentChange(index, 'name', e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Select
                                                    value={item.type}
                                                    onValueChange={v => handleEquipmentChange(index, 'type', v as any)}
                                                >
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue placeholder="種別" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Weapon">武器</SelectItem>
                                                        <SelectItem value="Armor">防具</SelectItem>
                                                        <SelectItem value="Accessory">装飾</SelectItem>
                                                        <SelectItem value="Other">その他</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Input
                                                placeholder="効果 / 補正 (例: 攻撃+2)"
                                                value={item.effect}
                                                onChange={e => handleEquipmentChange(index, 'effect', e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeEquipment(index)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addEquipment}>
                                <Plus className="mr-2 h-4 w-4" /> 装備を追加
                            </Button>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 sticky bottom-4">
                            <Button type="button" variant="outline" onClick={() => router.back()} className="bg-background">
                                キャンセル
                            </Button>
                            <Button type="submit" className="shadow-lg">
                                保存して完了
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
