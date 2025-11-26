'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { JAPANESE_TO_ENGLISH_STATS, STANDARD_STAT_ORDER, STAT_LABELS } from '@/features/character/domain/constants';
import { useCharacterSheet } from '@/features/character/hooks/useCharacterSheet';
import { Plus, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SpecialtyElementInput {
    name: string;
    benefit: string;
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

    const [isInitialized, setIsInitialized] = useState(false);

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

            setIsInitialized(true);
        }
    }, [isLoading, isInitialized, name, character, state.stats]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prepare new logs
        const logsToAdd: any[] = [];
        for (const key of STANDARD_STAT_ORDER) {
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
        // We only do this for *new* benefits or we assume the user manages duplicates?
        // For a Setup Wizard, we assume we are applying these effects now.
        // To avoid duplicates on re-runs, strictly speaking we should check if this specific effect exists,
        // but for MVP we'll just append. The user can delete logs if needed.
        for (const el of specialtyElements) {
            if (!el.benefit) continue;

            // Simple regex for "Stat+N" or "Stat-N"
            // Matches: "筋力+1", "Strength + 2", "攻撃力-1"
            const match = el.benefit.match(/^(.+?)\s*([+\-])\s*(\d+)$/);
            if (match) {
                const rawStat = match[1].trim();
                const op = match[2];
                const val = parseInt(match[3]);

                // Normalize stat name
                const statKey = JAPANESE_TO_ENGLISH_STATS[rawStat] || rawStat;

                // Determine value
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

        // 3. Update Stats (Generate Growth Logs for differences) hook.
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
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
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
                                    rows={4}
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

                        {/* Stats */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">基礎ステータス</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {STANDARD_STAT_ORDER.map(key => (
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

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                キャンセル
                            </Button>
                            <Button type="submit">
                                保存して完了
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
