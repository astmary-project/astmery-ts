'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Item, Resource, Skill } from '@/features/character/domain/CharacterLog';
import { ABILITY_STATS, JAPANESE_TO_ENGLISH_STATS, STAT_LABELS } from '@/features/character/domain/constants';
import { useCharacterSheet } from '@/features/character/hooks/useCharacterSheet';
import { ChevronDown, Plus, Settings2, Trash2 } from 'lucide-react';
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
    // Detailed fields
    timing: string;
    cooldown: string;
    target: string;
    range: string;
    cost: string;
    roll: string;
    magicGrade: string;
    shape: string;
    duration: string;
    activeCheck: string;
    passiveCheck: string;
    chatPalette: string;
}

interface ItemInput {
    id: string;
    name: string;
    type: 'Weapon' | 'Armor' | 'Accessory' | 'Other';
    effect: string;
}

interface CustomStatInput {
    key: string;
    label: string;
    value: string;
    isMain: boolean;
}

interface ResourceInput {
    id: string;
    name: string;
    max: string;
    initial: string;
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
    const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);
    const [equipment, setEquipment] = useState<ItemInput[]>([]);
    const [customStats, setCustomStats] = useState<CustomStatInput[]>([]);
    const [resources, setResources] = useState<ResourceInput[]>([]);

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
                timing: s.timing || '',
                cooldown: s.cooldown || '',
                target: s.target || '',
                range: s.range || '',
                cost: s.cost || '',
                roll: s.roll || '',
                magicGrade: s.magicGrade || '',
                shape: s.shape || '',
                duration: s.duration || '',
                activeCheck: s.activeCheck || '',
                passiveCheck: s.passiveCheck || '',
                chatPalette: s.chatPalette || '',
            })));

            // Load Equipment
            initialEquipmentRef.current = state.equipment;
            setEquipment(state.equipment.map(i => ({
                id: i.id,
                name: i.name,
                type: i.type as any,
                effect: i.description || '',
            })));

            // Load Custom Stats
            const loadedCustomStats: CustomStatInput[] = [];
            for (const [key, label] of Object.entries(state.customLabels)) {
                loadedCustomStats.push({
                    key,
                    label,
                    value: (state.stats[key] || 0).toString(),
                    isMain: state.customMainStats.includes(key),
                });
            }
            setCustomStats(loadedCustomStats);

            // Load Resources
            setResources(state.resources.map(r => ({
                id: r.id,
                name: r.name,
                max: r.max.toString(),
                initial: r.initial.toString(),
            })));

            setIsInitialized(true);
        }
    }, [isLoading, isInitialized, name, character, state.stats, state.skills, state.equipment, state.customLabels, state.customMainStats, state.resources]);

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
        setSkills([...skills, {
            id: crypto.randomUUID(),
            name: '',
            type: 'Passive',
            effect: '',
            timing: '', cooldown: '', target: '', range: '', cost: '', roll: '',
            magicGrade: '', shape: '', duration: '', activeCheck: '', passiveCheck: '', chatPalette: ''
        }]);
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

    // Custom Stats Handlers
    const handleCustomStatChange = (index: number, field: keyof CustomStatInput, value: any) => {
        const newStats = [...customStats];
        // @ts-ignore
        newStats[index][field] = value;
        setCustomStats(newStats);
    };
    const addCustomStat = () => {
        setCustomStats([...customStats, { key: '', label: '', value: '0', isMain: false }]);
    };
    const removeCustomStat = (index: number) => {
        setCustomStats(customStats.filter((_, i) => i !== index));
    };

    // Resource Handlers
    const handleResourceChange = (index: number, field: keyof ResourceInput, value: string) => {
        const newResources = [...resources];
        // @ts-ignore
        newResources[index][field] = value;
        setResources(newResources);
    };
    const addResource = () => {
        setResources([...resources, { id: crypto.randomUUID(), name: '', max: '10', initial: '10' }]);
    };
    const removeResource = (index: number) => {
        setResources(resources.filter((_, i) => i !== index));
    };

    const parseEffect = (effect: string) => {
        const statModifiers: Record<string, number> = {};
        const dynamicModifiers: Record<string, string> = {};
        const grantedStats: { key: string; label: string; value: number; isMain?: boolean }[] = [];
        const grantedResources: Resource[] = [];

        // Split by comma or space, but respect parentheses?
        // Simple split might break "GrantStat:foo(bar)=1" if we split by space and there are spaces inside?
        // Let's stick to simple split for now, assuming no spaces in labels or using specific delimiters.
        const parts = effect.split(/[,、\s]+/);
        for (const part of parts) {
            if (!part.trim()) continue;

            // 1. GrantStat:Key(Label)=Value OR GrantStat:Label=Value
            // e.g. GrantStat:karma(カルマ)=0  -> Key: karma, Label: カルマ
            // e.g. GrantStat:カルマ=0        -> Key: カルマ, Label: カルマ
            const grantStatMatch = part.match(/^GrantStat:(.+?)(?:\((.+?)\))?=(\d+)$/i);
            if (grantStatMatch) {
                const rawKey = grantStatMatch[1];
                const rawLabel = grantStatMatch[2];
                const val = parseInt(grantStatMatch[3]);

                grantedStats.push({
                    key: rawKey,
                    label: rawLabel || rawKey,
                    value: val,
                    isMain: true
                });
                continue;
            }

            // 2. GrantResource:Name=Max
            // e.g. GrantResource:弾薬=10
            const grantResourceMatch = part.match(/^GrantResource:(.+?)=(\d+)$/i);
            if (grantResourceMatch) {
                const name = grantResourceMatch[1];
                const max = parseInt(grantResourceMatch[2]);
                grantedResources.push({
                    id: crypto.randomUUID(), // Generate ID for new resource
                    name: name,
                    max: max,
                    initial: max
                });
                continue;
            }

            // 3. Static: Stat+N or Stat-N
            const staticMatch = part.match(/^(.+?)([+\-])(\d+)$/);
            if (staticMatch) {
                const rawStat = staticMatch[1].trim();
                const op = staticMatch[2];
                const val = parseInt(staticMatch[3]);
                const statKey = JAPANESE_TO_ENGLISH_STATS[rawStat] || rawStat;
                if (statKey) {
                    statModifiers[statKey] = op === '-' ? -val : val;
                }
                continue;
            }

            // 4. Dynamic: Stat:Formula (e.g. 攻撃:筋力/2)
            const dynamicMatch = part.match(/^(.+?)[:：](.+)$/);
            if (dynamicMatch) {
                const rawStat = dynamicMatch[1].trim();
                const formula = dynamicMatch[2].trim();
                const statKey = JAPANESE_TO_ENGLISH_STATS[rawStat] || rawStat;
                if (statKey) {
                    let processedFormula = formula;
                    for (const [jp, en] of Object.entries(JAPANESE_TO_ENGLISH_STATS)) {
                        processedFormula = processedFormula.replaceAll(jp, en);
                    }
                    dynamicModifiers[statKey] = processedFormula;
                }
            }
        }
        return { statModifiers, dynamicModifiers, grantedStats, grantedResources };
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
            const { statModifiers, dynamicModifiers, grantedStats, grantedResources } = parseEffect(s.effect);
            const skillObj: Skill = {
                id: s.id,
                name: s.name,
                type: s.type,
                description: s.effect,
                statModifiers: Object.keys(statModifiers).length > 0 ? statModifiers : undefined,
                dynamicModifiers: Object.keys(dynamicModifiers).length > 0 ? dynamicModifiers : undefined,
                grantedStats: grantedStats.length > 0 ? grantedStats : undefined,
                grantedResources: grantedResources.length > 0 ? grantedResources : undefined,
                // Detailed fields
                timing: s.timing,
                cooldown: s.cooldown,
                target: s.target,
                range: s.range,
                cost: s.cost,
                roll: s.roll,
                magicGrade: s.magicGrade,
                shape: s.shape,
                duration: s.duration,
                activeCheck: s.activeCheck,
                passiveCheck: s.passiveCheck,
                chatPalette: s.chatPalette,
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
                // We need to check ALL fields for diff
                const initialModifiers = initial.statModifiers || {};
                const initialDynamic = initial.dynamicModifiers || {};
                const initialGrantedStats = initial.grantedStats || [];
                const initialGrantedResources = initial.grantedResources || [];

                const isDiff = initial.name !== s.name ||
                    initial.type !== s.type ||
                    initial.description !== s.effect ||
                    initial.timing !== s.timing ||
                    initial.cooldown !== s.cooldown ||
                    initial.target !== s.target ||
                    initial.range !== s.range ||
                    initial.cost !== s.cost ||
                    initial.roll !== s.roll ||
                    initial.magicGrade !== s.magicGrade ||
                    initial.shape !== s.shape ||
                    initial.duration !== s.duration ||
                    initial.activeCheck !== s.activeCheck ||
                    initial.passiveCheck !== s.passiveCheck ||
                    initial.chatPalette !== s.chatPalette ||
                    JSON.stringify(initialModifiers) !== JSON.stringify(statModifiers) ||
                    JSON.stringify(initialDynamic) !== JSON.stringify(dynamicModifiers) ||
                    JSON.stringify(initialGrantedStats) !== JSON.stringify(grantedStats) ||
                    // For resources, ID changes every time we parse if we generate new UUID.
                    // We should probably try to preserve IDs if name matches?
                    // Or just ignore ID diff if name/max/initial are same?
                    // But `grantedResources` in `Skill` object needs IDs.
                    // If we generate new IDs, it will always be a diff.
                    // And `CharacterCalculator` uses ID to check duplicates.
                    // If ID changes, it's a new resource.
                    // This is tricky.
                    // Ideally, `parseEffect` should not generate IDs, or we should reuse existing ones.
                    // But `parseEffect` is stateless.
                    // Let's assume for now that if we edit the skill, we might reset the resource (get a new one).
                    // This is acceptable for MVP.
                    // To avoid infinite loop or constant updates, we need to be careful.
                    // But here we are just comparing JSON stringify.
                    // Since we generate UUID in `parseEffect`, `grantedResources` will ALWAYS differ from `initial`.
                    // So we will always update the skill.
                    // That's fine, `FORGET` then `LEARN` is safe.
                    // But `CharacterCalculator` will see a NEW resource ID and add it.
                    // The OLD resource ID will remain in `state.resources` if we don't remove it?
                    // `FORGET_SKILL` removes the skill, but `CharacterCalculator` doesn't automatically remove resources added by it?
                    // `CharacterCalculator` rebuilds state from logs.
                    // If `FORGET_SKILL` is logged, the skill is removed from `state.skills`.
                    // The `calculateState` iterates `state.skills` to add resources.
                    // If skill is gone, resource is not added.
                    // So it works! The resource comes from the skill presence.
                    JSON.stringify(initialGrantedResources.map(r => ({ ...r, id: '' }))) !== JSON.stringify(grantedResources.map(r => ({ ...r, id: '' })));

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
            const { statModifiers, dynamicModifiers, grantedStats, grantedResources } = parseEffect(i.effect);
            const itemObj: Item = {
                id: i.id,
                name: i.name,
                type: i.type,
                description: i.effect,
                statModifiers: Object.keys(statModifiers).length > 0 ? statModifiers : undefined,
                dynamicModifiers: Object.keys(dynamicModifiers).length > 0 ? dynamicModifiers : undefined,
                grantedStats: grantedStats.length > 0 ? grantedStats : undefined,
                grantedResources: grantedResources.length > 0 ? grantedResources : undefined,
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
                const initialDynamic = initial.dynamicModifiers || {};
                const initialGrantedStats = initial.grantedStats || [];
                const initialGrantedResources = initial.grantedResources || [];

                const isDiff = initial.name !== i.name ||
                    initial.type !== i.type ||
                    initial.description !== i.effect ||
                    JSON.stringify(initialModifiers) !== JSON.stringify(statModifiers) ||
                    JSON.stringify(initialDynamic) !== JSON.stringify(dynamicModifiers) ||
                    JSON.stringify(initialGrantedStats) !== JSON.stringify(grantedStats) ||
                    JSON.stringify(initialGrantedResources.map(r => ({ ...r, id: '' }))) !== JSON.stringify(grantedResources.map(r => ({ ...r, id: '' })));

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

        // 5. Custom Stats
        for (const cs of customStats) {
            if (!cs.key) continue;

            // Check if label/main status changed
            const currentLabel = state.customLabels[cs.key];
            const isCurrentlyMain = state.customMainStats.includes(cs.key);

            if (currentLabel !== cs.label || isCurrentlyMain !== cs.isMain) {
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'REGISTER_STAT_LABEL',
                    statKey: cs.key,
                    stringValue: cs.label,
                    isMainStat: cs.isMain,
                });
            }

            // Check value diff
            const currentVal = state.stats[cs.key] || 0;
            const targetVal = parseInt(cs.value) || 0;
            const diff = targetVal - currentVal;

            if (diff !== 0) {
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'GROWTH',
                    statKey: cs.key,
                    value: diff,
                    description: `カスタムステータス(${cs.label})調整`,
                });
            }
        }

        // 6. Resources
        const existingResourceIds = new Set(state.resources.map(r => r.id));
        for (const r of resources) {
            if (!existingResourceIds.has(r.id)) {
                logsToAdd.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'REGISTER_RESOURCE',
                    resource: {
                        id: r.id,
                        name: r.name,
                        max: parseInt(r.max) || 0,
                        initial: parseInt(r.initial) || 0,
                    },
                });
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

                        {/* Custom Stats */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">カスタムステータス</h3>
                            <div className="space-y-3">
                                {customStats.map((stat, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <Input
                                            placeholder="ID (例: karma)"
                                            value={stat.key}
                                            onChange={e => handleCustomStatChange(index, 'key', e.target.value)}
                                            className="w-1/3"
                                        />
                                        <Input
                                            placeholder="表示名 (例: カルマ)"
                                            value={stat.label}
                                            onChange={e => handleCustomStatChange(index, 'label', e.target.value)}
                                            className="w-1/3"
                                        />
                                        <Input
                                            type="number"
                                            placeholder="値"
                                            value={stat.value}
                                            onChange={e => handleCustomStatChange(index, 'value', e.target.value)}
                                            className="w-20"
                                        />
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor={`main-${index}`} className="text-xs whitespace-nowrap">メイン</Label>
                                            <input
                                                type="checkbox"
                                                id={`main-${index}`}
                                                checked={stat.isMain}
                                                onChange={e => handleCustomStatChange(index, 'isMain', e.target.checked)}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeCustomStat(index)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addCustomStat}>
                                <Plus className="mr-2 h-4 w-4" /> ステータスを追加
                            </Button>
                        </div>

                        {/* Resources */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">リソース (HP/MP以外)</h3>
                            <div className="space-y-3">
                                {resources.map((res, index) => (
                                    <div key={res.id} className="flex gap-2 items-center">
                                        <Input
                                            placeholder="名称 (例: 弾薬)"
                                            value={res.name}
                                            onChange={e => handleResourceChange(index, 'name', e.target.value)}
                                            className="flex-1"
                                        />
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm">最大:</span>
                                            <Input
                                                type="number"
                                                value={res.max}
                                                onChange={e => handleResourceChange(index, 'max', e.target.value)}
                                                className="w-20"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm">初期:</span>
                                            <Input
                                                type="number"
                                                value={res.initial}
                                                onChange={e => handleResourceChange(index, 'initial', e.target.value)}
                                                className="w-20"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeResource(index)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addResource}>
                                <Plus className="mr-2 h-4 w-4" /> リソースを追加
                            </Button>
                        </div>

                        {/* Usage Guide */}
                        <details className="group border rounded-md bg-muted/20">
                            <summary className="cursor-pointer p-3 font-medium hover:bg-muted/50 transition-colors list-none flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">Help</span>
                                    効果・特殊ステータスの記述方法
                                </span>
                                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="p-3 pt-0 text-sm text-muted-foreground space-y-3 border-t bg-card/50">
                                <div className="grid gap-2 mt-2">
                                    <div>
                                        <span className="font-semibold text-foreground">基本補正</span>
                                        <p className="text-xs">ステータスを固定値で増減させます。</p>
                                        <code className="text-xs bg-muted px-1 py-0.5 rounded block mt-1 w-fit">攻撃+1</code>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-foreground">計算式による補正</span>
                                        <p className="text-xs">他のステータスを参照して補正値を計算します。</p>
                                        <code className="text-xs bg-muted px-1 py-0.5 rounded block mt-1 w-fit">攻撃:筋力/2</code>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-foreground">カスタムステータスの追加</span>
                                        <p className="text-xs">新しいステータス項目を作成します。日本語IDが使えます。</p>
                                        <code className="text-xs bg-muted px-1 py-0.5 rounded block mt-1 w-fit">GrantStat:カルマ=0</code>
                                        <p className="text-xs mt-1">※ IDを別途指定する場合: <code className="bg-muted px-1 rounded">GrantStat:karma(カルマ)=0</code></p>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-foreground">リソースの追加</span>
                                        <p className="text-xs">HP/MPのような消費ゲージを作成します。</p>
                                        <code className="text-xs bg-muted px-1 py-0.5 rounded block mt-1 w-fit">GrantResource:弾薬=10</code>
                                    </div>
                                    <div className="text-xs border-t pt-2 mt-1">
                                        ※ 複数の効果を書く場合はスペースで区切ってください。<br />
                                        例: <code className="bg-muted px-1 rounded">攻撃+1 GrantStat:カルマ=0</code>
                                    </div>
                                </div>
                            </div>
                        </details>

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
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="効果 / 補正 (例: 攻撃+1)"
                                                    value={skill.effect}
                                                    onChange={e => handleSkillChange(index, 'effect', e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="icon" title="詳細設定">
                                                            <Settings2 className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>スキル詳細設定: {skill.name}</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="grid gap-2">
                                                                    <Label>タイミング</Label>
                                                                    <Input value={skill.timing} onChange={e => handleSkillChange(index, 'timing', e.target.value)} />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>魔術グレード</Label>
                                                                    <Input value={skill.magicGrade} onChange={e => handleSkillChange(index, 'magicGrade', e.target.value)} />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>CT (クールタイム)</Label>
                                                                    <Input value={skill.cooldown} onChange={e => handleSkillChange(index, 'cooldown', e.target.value)} />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>消費コスト</Label>
                                                                    <Input value={skill.cost} onChange={e => handleSkillChange(index, 'cost', e.target.value)} />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>対象</Label>
                                                                    <Input value={skill.target} onChange={e => handleSkillChange(index, 'target', e.target.value)} />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>射程</Label>
                                                                    <Input value={skill.range} onChange={e => handleSkillChange(index, 'range', e.target.value)} />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>形状</Label>
                                                                    <Input value={skill.shape} onChange={e => handleSkillChange(index, 'shape', e.target.value)} />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>継続</Label>
                                                                    <Input value={skill.duration} onChange={e => handleSkillChange(index, 'duration', e.target.value)} />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>能動判定</Label>
                                                                    <Input value={skill.activeCheck} onChange={e => handleSkillChange(index, 'activeCheck', e.target.value)} />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>受動判定</Label>
                                                                    <Input value={skill.passiveCheck} onChange={e => handleSkillChange(index, 'passiveCheck', e.target.value)} />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>判定式 (Roll)</Label>
                                                                    <Input value={skill.roll} onChange={e => handleSkillChange(index, 'roll', e.target.value)} placeholder="2d6 + 攻撃" />
                                                                </div>
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label>チャットパレット (任意)</Label>
                                                                <Textarea
                                                                    value={skill.chatPalette}
                                                                    onChange={e => handleSkillChange(index, 'chatPalette', e.target.value)}
                                                                    placeholder="2d6+5 攻撃判定&#13;&#10;k20+5 ダメージ"
                                                                    rows={4}
                                                                />
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
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
