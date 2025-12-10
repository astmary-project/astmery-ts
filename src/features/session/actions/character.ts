'use server';

import { CharacterCalculator } from '@/features/character/domain/CharacterCalculator';
import { CharacterState } from '@/features/character/domain/models';
import { SupabaseCharacterRepository } from '@/features/character/infrastructure/SupabaseCharacterRepository';
import { createClient } from '@/lib/supabase-server';

export async function getCharactersStats(characterIds: string[]): Promise<Record<string, CharacterState>> {
    const results: Record<string, CharacterState> = {};
    const supabase = await createClient();
    const repository = new SupabaseCharacterRepository(supabase);

    // Parallel fetch (or optimize with 'in' query if repo supports it, but for now parallel is fine for MVP)
    await Promise.all(characterIds.map(async (id) => {
        try {
            const result = await repository.load(id);
            if (result.isSuccess) {
                results[id] = CharacterCalculator.calculateState(result.value.events);
            }
        } catch (e) {
            console.error(`[getCharactersStats] Exception loading ${id}`, e);
        }
    }));

    return results;
}
