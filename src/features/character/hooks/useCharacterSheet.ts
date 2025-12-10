import { CharacterEventId } from '@/domain/values/ids';
import { Timestamp } from '@/domain/values/time';
import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';
import { CharacterCalculator } from '../domain/CharacterCalculator';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CharacterEvent } from '@/features/character/domain/Event';
import { CharacterState } from '../domain/models';
import { ICharacterRepository } from '../domain/repository/ICharacterRepository';
import { SupabaseCharacterRepository } from '../infrastructure/SupabaseCharacterRepository';

// Use Supabase repository
const repository: ICharacterRepository = new SupabaseCharacterRepository(supabase);

export const useCharacterSheet = (characterId: string, sessionContext?: CharacterCalculator.SessionContext) => {
    const [name, setName] = useState<string>('');
    const [events, setEvents] = useState<CharacterEvent[]>([]);
    const [characterProfile, setCharacterProfile] = useState<{
        avatarUrl?: string;
        bio?: string;
        specialtyElements?: string[];
        tags?: string[];
    }>();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Calculated State
    const state: CharacterState = useMemo(() => {
        return CharacterCalculator.calculateState(events, {}, sessionContext, characterProfile?.tags || []);
    }, [events, sessionContext, characterProfile?.tags]);

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

                const result = await repository.load(characterId);
                if (result.isSuccess) {
                    const data = result.value;
                    let currentEvents = data.events;
                    let needsMigration = false;

                    // Migration logic: Check for legacy 'GROWTH' logs
                    // We cast to any to allow checking for potentially legacy types not in current Union
                    const migratedEvents = currentEvents.map((event: any) => {
                        if (event.type === 'GROWTH' && event.statKey && event.value !== undefined) {
                            needsMigration = true;
                            return {
                                ...event,
                                type: 'STAT_GROWN',
                                key: event.statKey,
                                delta: event.value,
                                cost: 0, // Default cost for migrated logs
                                // Clean up legacy fields if spreading
                                statKey: undefined,
                                value: undefined
                            } as CharacterEvent;
                        }
                        return event as CharacterEvent;
                    });

                    if (needsMigration) {
                        console.log('Migrating legacy logs...');
                        await repository.save({
                            ...data,
                            events: migratedEvents
                        });
                        currentEvents = migratedEvents;
                    }

                    setName(data.name);
                    setEvents(currentEvents);
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
                    console.log('Character not found, starting fresh');
                    if (result.error.code !== 'RESOURCE_NOT_FOUND') {
                        console.error(result.error);
                        setError('Failed to load character');
                    }
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

    const addEvent = async (event: Omit<CharacterEvent, 'id' | 'timestamp'>) => {
        const newEvent: CharacterEvent = {
            ...event,
            id: crypto.randomUUID() as CharacterEventId,
            timestamp: Date.now() as Timestamp,
        } as CharacterEvent;

        setEvents(prevEvents => {
            const newEvents = [...prevEvents, newEvent];
            // Auto-save (Optimistic)
            save(name, newEvents, characterProfile);
            return newEvents;
        });
    };

    const save = async (name: string, currentEvents: CharacterEvent[], profile: { avatarUrl?: string; bio?: string; specialtyElements?: string[]; tags?: string[] } | undefined) => {
        try {
            const result = await repository.save({
                id: characterId,
                name: name,
                events: currentEvents,
                profile: profile,
                userId: userId
            });
            if (result.isFailure) {
                console.error('Failed to save', result.error);
            }
        } catch (e) {
            console.error('Unexpected error saving', e);
        }
    };

    const updateProfile = async (profile: Partial<typeof characterProfile>) => {
        const newProfile = { ...characterProfile, ...profile };
        setCharacterProfile(newProfile);
        await save(name, events, newProfile);
    };

    const addTag = async (tag: string) => {
        const currentTags = characterProfile?.tags || [];
        if (!currentTags.includes(tag)) {
            await updateProfile({ tags: [...currentTags, tag] });
        }
    };

    const removeTag = async (tag: string) => {
        const currentTags = characterProfile?.tags || [];
        await updateProfile({ tags: currentTags.filter(t => t !== tag) });
    };

    const updateName = async (name: string) => {
        setName(name);
        await save(name, events, characterProfile);
    };

    const updateCharacter = async (updates: {
        name?: string;
        profile?: Partial<typeof characterProfile>;
        events?: CharacterEvent[];
    }) => {
        const newName = updates.name ?? name;
        const newProfile = updates.profile ? { ...characterProfile, ...updates.profile } : characterProfile;
        const newEvents = updates.events ?? events;

        if (updates.name !== undefined) setName(newName);
        if (updates.profile) setCharacterProfile(newProfile);
        if (updates.events) setEvents(newEvents);

        await save(newName, newEvents, newProfile);
    };

    const deleteEvent = async (eventId: string) => {
        setEvents(prevEvents => {
            const newEvents = prevEvents.filter(l => l.id !== eventId);
            save(name, newEvents, characterProfile);
            return newEvents;
        });
    };

    const deleteCharacter = async () => {
        try {
            const result = await repository.delete(characterId);
            if (result.isSuccess) {
                return true;
            } else {
                console.error('Failed to delete character', result.error);
                setError('Failed to delete character');
                return false;
            }
        } catch (e) {
            console.error('Unexpected error deleting character', e);
            setError('Failed to delete character');
            return false;
        }
    };

    const [isEditMode, setIsEditMode] = useState(false);

    return {
        name,
        character: characterProfile,
        state,
        events,
        isLoading,
        error,
        isEditMode,
        toggleEditMode: () => setIsEditMode(prev => !prev),
        updateName,
        addEvent,
        deleteEvent,
        updateProfile,
        addTag,
        removeTag,
        updateCharacter,
        reload: () => window.location.reload(),
        userId,
        ownerName,
        isAdmin,
        deleteCharacter
    };
};
