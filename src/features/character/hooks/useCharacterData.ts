import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';
import { CharacterCalculator } from '../domain/CharacterCalculator';
import { CharacterEvent } from '../domain/Event';
import { CharacterState } from '../domain/models';
import { ICharacterRepository } from '../domain/repository/ICharacterRepository';
import { SupabaseCharacterRepository } from '../infrastructure/SupabaseCharacterRepository';

const repository: ICharacterRepository = new SupabaseCharacterRepository(supabase);

export const useCharacterData = (characterId: string | undefined) => {
    const [events, setEvents] = useState<CharacterEvent[]>([]);
    const [profileTags, setProfileTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!characterId) {
            setEvents([]);
            setProfileTags([]);
            return;
        }

        const load = async () => {
            setIsLoading(true);
            try {
                const result = await repository.load(characterId);
                if (result.isSuccess) {
                    setEvents(result.value.events);
                    setProfileTags(result.value.profile?.tags || []);
                } else {
                    console.error(result.error);
                    setError('Failed to load character');
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

    const state: CharacterState = useMemo(() => {
        if (!events.length && !profileTags.length) return {
            stats: {},
            resources: [],
            skills: [],
            tags: [],
            inventory: [],
            equipmentSlots: [],
            skillWishlist: [],
            exp: { total: 0, used: 0, free: 0 },
            derivedStats: {},
            customLabels: {},
            customMainStats: [],
            resourceValues: {},
        };
        return CharacterCalculator.calculateState(events, {}, {}, profileTags);
    }, [events, profileTags]);

    return { state, isLoading, error, refetch: () => { /* Implement if needed, or trigger reload via key */ } };
};
