import { useEffect, useState } from 'react';
import { CharacterCalculator } from '../domain/CharacterCalculator';
import { CharacterLogEntry, CharacterState } from '../domain/CharacterLog';
import { ICharacterRepository } from '../domain/repository/ICharacterRepository';
import { InMemoryCharacterRepository } from '../infrastructure/InMemoryCharacterRepository';

// Singleton instance for demo purposes (so state persists across re-renders/navigation in memory)
const repository: ICharacterRepository = new InMemoryCharacterRepository();

export const useCharacterSheet = (characterId: string) => {
    const [name, setName] = useState<string>('');
    const [logs, setLogs] = useState<CharacterLogEntry[]>([]);
    const [characterProfile, setCharacterProfile] = useState<{
        avatarUrl?: string;
        bio?: string;
        specialtyElements?: string[];
    }>();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Calculated State
    // We calculate this on every render or useMemo. Since logs can be large, useMemo is better.
    // But for now, let's calculate it inside the hook body or useMemo.
    // Ideally, we might want to store the state in React state if calculation is heavy,
    // but CharacterCalculator is fast enough for now.
    const state: CharacterState = CharacterCalculator.calculateState(logs);

    // Load initial data
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const data = await repository.load(characterId);
                if (data) {
                    setName(data.name);
                    setLogs(data.logs);
                    if (data.profile) {
                        setCharacterProfile(data.profile);
                    }
                } else {
                    // Initialize with empty or default if not found (for demo)
                    console.log('Character not found, starting fresh');
                }
            } catch (e) {
                console.error(e);
                setError('Failed to load character');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [characterId]);

    const addLog = (log: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => {
        const newLog: CharacterLogEntry = {
            ...log,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };

        const newLogs = [...logs, newLog];
        setLogs(newLogs);

        // Auto-save (Optimistic)
        save(name, newLogs, characterProfile);
    };

    const save = async (name: string, currentLogs: CharacterLogEntry[], profile: any) => {
        try {
            await repository.save({
                id: characterId,
                name: name,
                logs: currentLogs,
                profile: profile
            });
        } catch (e) {
            console.error('Failed to save', e);
            // Handle error (toast etc)
        }
    };

    const updateProfile = (profile: Partial<typeof characterProfile>) => {
        const newProfile = { ...characterProfile, ...profile };
        setCharacterProfile(newProfile);
        save(name, logs, newProfile);
    };

    const updateName = (name: string) => {
        setName(name);
        save(name, logs, characterProfile);
    };

    return {
        name,
        character: characterProfile,
        state,
        logs,
        isLoading,
        error,
        updateName,
        addLog,
        updateProfile,
        reload: () => window.location.reload() // Temp
    };
};
