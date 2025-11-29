import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';
import { CharacterCalculator } from '../domain/CharacterCalculator';
import { CharacterLogEntry, CharacterState } from '../domain/CharacterLog';
import { ICharacterRepository } from '../domain/repository/ICharacterRepository';
import { SupabaseCharacterRepository } from '../infrastructure/SupabaseCharacterRepository';

// Use Supabase repository
const repository: ICharacterRepository = new SupabaseCharacterRepository();

export const useCharacterSheet = (characterId: string, sessionContext?: CharacterCalculator.SessionContext) => {
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
    // Calculated State
    const state: CharacterState = useMemo(() => {
        return CharacterCalculator.calculateState(logs, {}, sessionContext);
    }, [logs, sessionContext]);

    const [userId, setUserId] = useState<string | undefined>();
    const [ownerName, setOwnerName] = useState<string | undefined>();
    const [isAdmin, setIsAdmin] = useState(false);

    // Load initial data
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                // Fetch Current User Role
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('role')
                        .eq('user_id', user.id)
                        .single();
                    if (profile?.role === 'admin') {
                        setIsAdmin(true);
                    }
                }

                const data = await repository.load(characterId);
                if (data) {
                    let currentLogs = data.logs;
                    let needsMigration = false;

                    // Migration: Convert legacy GROWTH to GROW_STAT
                    const migratedLogs = currentLogs.map(log => {
                        if (log.type === 'GROWTH' && log.statKey && log.value !== undefined) {
                            needsMigration = true;
                            return {
                                ...log,
                                type: 'GROW_STAT',
                                statGrowth: {
                                    key: log.statKey,
                                    value: log.value,
                                    cost: 0 // Default cost for migrated logs
                                },
                                // Remove legacy fields
                                statKey: undefined,
                                value: undefined
                            } as CharacterLogEntry;
                        }
                        return log;
                    });

                    if (needsMigration) {
                        console.log('Migrating legacy logs...');
                        await repository.save({
                            ...data,
                            logs: migratedLogs
                        });
                        currentLogs = migratedLogs;
                    }

                    setName(data.name);
                    setLogs(currentLogs);
                    setUserId(data.userId); // Set userId
                    if (data.profile) {
                        setCharacterProfile(data.profile);
                    }

                    // Fetch Owner Name
                    if (data.userId) {
                        const { data: profile } = await supabase
                            .from('user_profiles')
                            .select('display_name')
                            .eq('user_id', data.userId)
                            .single();

                        if (profile?.display_name) {
                            setOwnerName(profile.display_name);
                        }
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

    const addLog = async (log: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => {
        const newLog: CharacterLogEntry = {
            ...log,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };

        const newLogs = [...logs, newLog];
        setLogs(newLogs);

        // Auto-save (Optimistic)
        await save(name, newLogs, characterProfile);
    };

    const save = async (name: string, currentLogs: CharacterLogEntry[], profile: any) => {
        try {
            await repository.save({
                id: characterId,
                name: name,
                logs: currentLogs,
                profile: profile,
                userId: userId // Pass userId to save (though repository might not need it if it's already in DB, but good for consistency)
            });
        } catch (e) {
            console.error('Failed to save', e);
            // Handle error (toast etc)
        }
    };

    const updateProfile = async (profile: Partial<typeof characterProfile>) => {
        const newProfile = { ...characterProfile, ...profile };
        setCharacterProfile(newProfile);
        await save(name, logs, newProfile);
    };

    const updateName = async (name: string) => {
        setName(name);
        await save(name, logs, characterProfile);
    };

    const updateCharacter = async (updates: {
        name?: string;
        profile?: Partial<typeof characterProfile>;
        logs?: CharacterLogEntry[];
    }) => {
        const newName = updates.name ?? name;
        const newProfile = updates.profile ? { ...characterProfile, ...updates.profile } : characterProfile;
        const newLogs = updates.logs ?? logs;

        if (updates.name !== undefined) setName(newName);
        if (updates.profile) setCharacterProfile(newProfile);
        if (updates.logs) setLogs(newLogs);

        await save(newName, newLogs, newProfile);
    };

    const deleteLog = async (logId: string) => {
        const newLogs = logs.filter(l => l.id !== logId);
        setLogs(newLogs);
        await save(name, newLogs, characterProfile);
    };

    const deleteCharacter = async () => {
        try {
            await repository.delete(characterId);
            // Redirect will be handled by the component or router
            return true;
        } catch (e) {
            console.error('Failed to delete character', e);
            setError('Failed to delete character');
            return false;
        }
    };

    const [isEditMode, setIsEditMode] = useState(false);

    return {
        name,
        character: characterProfile,
        state,
        logs,
        isLoading,
        error,
        isEditMode,
        toggleEditMode: () => setIsEditMode(prev => !prev),
        updateName,
        addLog,
        deleteLog,
        updateProfile,
        updateCharacter,
        reload: () => window.location.reload(), // Temp
        userId, // Return userId
        ownerName, // Return ownerName
        isAdmin, // Return isAdmin
        deleteCharacter // Return deleteCharacter
    };
};
