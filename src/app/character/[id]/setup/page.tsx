'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EquipmentListEditor } from '@/features/character/components/setup/EquipmentListEditor';
import { SkillListEditor } from '@/features/character/components/setup/SkillListEditor';
import { SpecialtyElementEditor } from '@/features/character/components/setup/SpecialtyElementEditor';
import { Item, Skill } from '@/features/character/domain/CharacterLog';
import { ABILITY_STATS, STAT_LABELS } from '@/features/character/domain/constants';
import { CharacterSetupService, ItemInput, SkillInput, SpecialtyElementInput } from '@/features/character/domain/service/CharacterSetupService';
import { useCharacterSheet } from '@/features/character/hooks/useCharacterSheet';
import { ChevronDown } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function CharacterSetupPage() {
    const params = useParams();
    const router = useRouter();
    const characterId = params.id as string;
    const { name, character, state, logs, isLoading, updateCharacter } = useCharacterSheet(characterId);

    // Local form state
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        avatarUrl: '',
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
            // Defer update to avoid set-state-in-effect
            const timer = setTimeout(() => {
                setFormData({
                    name: name,
                    bio: character?.bio || '',
                    avatarUrl: character?.avatarUrl || '',
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
                    acquisitionType: s.acquisitionType,
                    summary: s.description,
                    effect: s.effect || '', // No fallback
                    restriction: s.restriction || '',
                    timing: s.timing || '',
                    cooldown: s.cooldown || '',
                    target: s.target || '',
                    range: s.range || '',
                    cost: s.cost || '',
                    rollModifier: s.rollModifier || '',
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
                    type: i.type as 'Weapon' | 'Armor' | 'Accessory' | 'Other',
                    summary: i.description,
                    effect: i.effect || '',
                })));

                setIsInitialized(true);
            }, 0);
            return () => clearTimeout(timer);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const logsToAdd = CharacterSetupService.calculateDiffLogs({
            currentStats: state.stats,
            currentSkills: initialSkillsRef.current,
            currentEquipment: initialEquipmentRef.current,
            currentCustomLabels: state.customLabels,
            currentCustomMainStats: state.customMainStats,
            currentResources: state.resources,
            currentSpecialtyElements: (character?.specialtyElements || []).map(el => {
                const match = el.match(/^(.+)\((.+)\)$/);
                if (match) {
                    return { name: match[1], benefit: match[2] };
                }
                return { name: el, benefit: '' };
            }),
            newStats: formData.stats,
            newSpecialtyElements: specialtyElements,
            newSkills: skills,
            newEquipment: equipment,
            newCustomStats: [], // Removed
            newResources: [], // Removed
        });

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
                avatarUrl: formData.avatarUrl,
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

                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="shrink-0">
                                    <Label className="mb-2 block">キャラクター画像</Label>
                                    <ImageUpload
                                        value={formData.avatarUrl}
                                        onChange={(url) => setFormData({ ...formData, avatarUrl: url })}
                                    />
                                </div>

                                <div className="flex-1 space-y-4">
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
                                </div>
                            </div>

                            {/* Specialty Elements */}
                            <SpecialtyElementEditor elements={specialtyElements} onChange={setSpecialtyElements} />
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
                                        <code className="text-xs bg-muted px-1 py-0.5 rounded block mt-1 w-fit">GrantResource:弾薬{'{'}max:10,min:0,init:10{'}'}</code>
                                    </div>
                                    <div className="text-xs border-t pt-2 mt-1">
                                        ※ 複数の効果を書く場合はスペースで区切ってください。<br />
                                        例: <code className="bg-muted px-1 rounded">攻撃+1 GrantResource:弾薬{'{'}max:10{'}'}</code>
                                    </div>
                                </div>
                            </div>
                        </details>

                        <SkillListEditor skills={skills} onChange={setSkills} />

                        {/* Equipment */}
                        <EquipmentListEditor equipment={equipment} onChange={setEquipment} />

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
