'use client';

import { CharacterSheet } from '@/features/character/components/CharacterSheet';
import { useCharacterSheet } from '@/features/character/hooks/useCharacterSheet';
import { useParams } from 'next/navigation';

interface CharacterDetailPageClientProps {
    currentUserId?: string;
}

export function CharacterDetailPageClient({ currentUserId }: CharacterDetailPageClientProps) {
    const params = useParams();
    const characterId = params.id as string;
    const {
        name,
        character,
        state,
        events, // Still destructured as logs? No, useCharacterSheet returns events

        isLoading,
        updateName,
        addEvent,
        deleteEvent,
        updateProfile,
        isEditMode,
        toggleEditMode,
        userId: ownerId, // Get ownerId from hook
        ownerName, // Get ownerName from hook
        isAdmin, // Get isAdmin from hook
        deleteCharacter,
        addTag,
        removeTag
    } = useCharacterSheet(characterId);





    if (isLoading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background py-8">
            <CharacterSheet
                name={name}
                onNameChange={updateName}
                onAvatarChange={(url) => updateProfile({ avatarUrl: url })}
                character={character}
                state={state}
                events={events} // Was logs
                onAddEvent={addEvent} // Was addLog
                onDeleteEvent={deleteEvent}
                isEditMode={isEditMode}
                onToggleEditMode={toggleEditMode}
                onUpdateProfile={updateProfile}
                initialLogs={[]} // Not used by hook-driven sheet, but required by prop
                currentUserId={currentUserId}
                ownerId={ownerId}
                ownerName={ownerName}
                characterId={characterId}
                isAdmin={isAdmin}
                onDeleteCharacter={deleteCharacter}
                onAddTag={addTag}
                onRemoveTag={removeTag}
            />
        </div>
    );
}
