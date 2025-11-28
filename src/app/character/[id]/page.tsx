'use client';

import { Button } from '@/components/ui/button';
import { CharacterSheet } from '@/features/character/components/CharacterSheet';
import { useCharacterSheet } from '@/features/character/hooks/useCharacterSheet';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CharacterDetailPage() {
    const params = useParams();
    const characterId = params.id as string;
    const { name, character, state, logs, isLoading, updateName, addLog, deleteLog, updateProfile, isEditMode, toggleEditMode } = useCharacterSheet(characterId);

    if (isLoading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background py-8">
            <div className="container mx-auto px-4 mb-4 flex justify-end">
                <Link href={`/character/${characterId}/setup`}>
                    <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" /> 設定 / 一括編集
                    </Button>
                </Link>
            </div>

            <CharacterSheet
                name={name}
                onNameChange={updateName}
                onAvatarChange={(url) => updateProfile({ avatarUrl: url })}
                character={character}
                state={state}
                logs={logs}
                onAddLog={addLog}
                onDeleteLog={deleteLog}
                isEditMode={isEditMode}
                onToggleEditMode={toggleEditMode}
                onUpdateProfile={updateProfile}
            />
        </div>
    );
}
