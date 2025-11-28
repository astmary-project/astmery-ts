'use client';

import { CharacterSheet } from '@/features/character/components/CharacterSheet';
import { useCharacterSheet } from '@/features/character/hooks/useCharacterSheet';


// Hack to seed the repository for the demo
// In a real app, this would be handled by a seeder script or API

// We need to access the singleton instance from the hook file, but it's not exported.
// For this demo, we can just rely on the hook to load data, but since it's empty initially,
// we need a way to inject data.
// Let's modify the hook to accept initial data or just use a side effect here to populate it if empty.
// Actually, the hook uses a module-level singleton repository. We can't easily access it here without exporting it.
// Let's just update the hook to export the repository instance for debug/demo purposes?
// Or better, let's just make the hook handle "if empty, load sample data" logic for the demo.

export default function DemoPage() {
    const characterId = '00000000-0000-0000-0000-000000000001';
    const { name, character, state, logs, isLoading, updateName, addLog, deleteLog, updateProfile } = useCharacterSheet(characterId);
    console.log('logs', logs);

    // Seed data logic removed to prevent infinite loop.
    // Data is now persisted in Supabase.


    // Better approach for Demo:
    // Since we can't easily seed via the hook without triggering "new log" logic,
    // let's just render the sheet.
    // Wait, if the repository is empty, the sheet will be empty.
    // I should update InMemoryCharacterRepository to have this data by default.

    if (isLoading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background py-8">
            <CharacterSheet
                name={name}
                onNameChange={updateName}
                character={character}
                state={state}
                logs={logs}
                onAddLog={addLog}
                onDeleteLog={deleteLog}
            />
        </div>
    );
}

