'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { STANDARD_STAT_ORDER, STAT_LABELS } from '@/features/character/domain/constants';
import { useCharacterSheet } from '@/features/character/hooks/useCharacterSheet';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CharacterSetupPage() {
    const params = useParams();
    const router = useRouter();
    const characterId = params.id as string;
    const { name, character, state, isLoading, updateName, updateProfile, addLog } = useCharacterSheet(characterId);

    // Local form state
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        specialtyElements: '',
        stats: {} as Record<string, number>,
    });

    const [isInitialized, setIsInitialized] = useState(false);

    // Load initial data
    useEffect(() => {
        if (!isLoading && !isInitialized) {
            setFormData({
                name: name,
                bio: character?.bio || '',
                specialtyElements: character?.specialtyElements?.join(', ') || '',
                stats: { ...state.stats },
            });
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Update Profile
        updateName(formData.name);
        updateProfile({
            bio: formData.bio,
            specialtyElements: formData.specialtyElements.split(',').map(s => s.trim()).filter(Boolean),
        });

        // 2. Update Stats (Generate Growth Logs for differences)
        // This is a simplified approach. In a real app, we might want to "reset" or "set base".
        // Here we just add the difference.
        for (const key of STANDARD_STAT_ORDER) {
            const currentVal = state.stats[key] || 0;
            const targetVal = formData.stats[key] || 0;
            const diff = targetVal - currentVal;

            if (diff !== 0) {
                addLog({
                    type: 'GROWTH',
                    statKey: key,
                    value: diff,
                    description: 'Setup Wizard Adjustment',
                });
            }
        }

        // Redirect to sheet
        router.push(`/character/${characterId}`);
    };

    if (isLoading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Character Setup</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea
                                    id="bio"
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    rows={4}
                                />
                            </div>

                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="specialty">Specialty Elements (comma separated)</Label>
                                <Input
                                    id="specialty"
                                    value={formData.specialtyElements}
                                    onChange={e => setFormData({ ...formData, specialtyElements: e.target.value })}
                                    placeholder="Fire, Water, Light"
                                />
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Base Stats</h3>
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
                                Cancel
                            </Button>
                            <Button type="submit">
                                Save & Finish
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
