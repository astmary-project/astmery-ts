import { supabase } from '@/lib/supabase';
import { CharacterData, ICharacterRepository } from '../domain/repository/ICharacterRepository';

export class SupabaseCharacterRepository implements ICharacterRepository {
    async save(character: CharacterData): Promise<void> {
        const { error } = await supabase
            .from('characters')
            .upsert({
                id: character.id,
                name: character.name,
                logs: character.logs,
                profile: character.profile,
                updated_at: new Date().toISOString(),
            });

        if (error) {
            console.error('Failed to save character:', error);
            throw error;
        }
    }

    async load(id: string): Promise<CharacterData | null> {
        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Not found
                return null;
            }
            console.error('Failed to load character:', error);
            throw error;
        }

        if (!data) return null;

        return {
            id: data.id,
            name: data.name,
            logs: data.logs as any[], // Type assertion needed for JSONB
            profile: data.profile as any,
        };
    }

    async listAll(): Promise<CharacterData[]> {
        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Failed to list characters:', error);
            throw error;
        }

        return (data || []).map(d => ({
            id: d.id,
            name: d.name,
            logs: d.logs as any[],
            profile: d.profile as any,
        }));
    }
}
