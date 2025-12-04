import { useEffect, useMemo, useState } from 'react';
import { CharacterCalculator } from '../domain/CharacterCalculator';
import { CharacterLogEntry, CharacterState } from '../domain/CharacterLog';
import { ICharacterRepository } from '../domain/repository/ICharacterRepository';
import { SupabaseCharacterRepository } from '../infrastructure/SupabaseCharacterRepository';

const repository: ICharacterRepository = new SupabaseCharacterRepository();

export const useCharacterData = (characterId: string | undefined) => {
    const [logs, setLogs] = useState<CharacterLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!characterId) {
            setLogs([]);
            return;
        }

        const load = async () => {
            setIsLoading(true);
            try {
                const result = await repository.load(characterId);
                if (result.isSuccess) {
                    setLogs(result.value.logs);
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
        if (!logs.length) return {
            stats: {},
            resources: [],
            skills: [],
            tags: new Set(),
            equipment: [],
            skillWishlist: [],
            exp: { total: 0, used: 0, free: 0 },
            derivedStats: {},
            customLabels: {},
            customMainStats: [],
            resourceValues: {},
        };
        return CharacterCalculator.calculateState(logs);
    }, [logs]);

    return { state, isLoading, error };
};
