'use server';

import { CharacterCalculator } from '@/features/character/domain/CharacterCalculator';
import { CharacterState } from '@/features/character/domain/CharacterLog';
import { ServerSupabaseCharacterRepository } from '@/features/character/infrastructure/ServerSupabaseCharacterRepository';

const repository = new ServerSupabaseCharacterRepository();

export async function getCharactersStats(characterIds: string[]): Promise<Record<string, CharacterState>> {
    const results: Record<string, CharacterState> = {};

    // Parallel fetch (or optimize with 'in' query if repo supports it, but for now parallel is fine for MVP)
    await Promise.all(characterIds.map(async (id) => {
        try {
            const result = await repository.load(id);
            if (result.isSuccess) {
                results[id] = CharacterCalculator.calculateState(result.value.logs);
            }
        } catch (e) {
            console.error(`[getCharactersStats] Exception loading ${id}`, e);
        }
    }));

    return results;
}
