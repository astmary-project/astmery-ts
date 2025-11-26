'use client';

import { CharacterSheet } from '@/features/character/components/CharacterSheet';
import { useCharacterSheet } from '@/features/character/hooks/useCharacterSheet';
import { useEffect } from 'react';


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
    const characterId = 'demo-character-1';
    const { name, character, state, logs, isLoading, updateName, addLog, updateProfile } = useCharacterSheet(characterId);
    console.log('logs', logs);

    // Seed data on first load if empty
    useEffect(() => {
        if (!isLoading && logs.length === 0 && name === '') {
            // This is a bit hacky, but works for the demo to populate the "DB" via the hook
            updateName('');
            // In reality we'd use a proper seeder or the repository directly
            updateProfile({});
            // We can't batch add logs easily with the current hook API (one by one),
            // so we might need to expose a "importLogs" or just loop.
            // But wait, addLog adds a NEW log with new ID/Timestamp.
            // We want to load EXISTING logs.
            // The repository is empty. We need to fill the repository.

            // Solution: We should probably expose a "resetToSample" method in the hook for the demo,
            // or just have the repository pre-filled in the infrastructure file.
        }
    }, [name, isLoading, logs.length, updateName, updateProfile]);

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
                character={character}
                state={state}
                logs={logs}
                onAddLog={addLog}
            />
        </div>
    );
}

