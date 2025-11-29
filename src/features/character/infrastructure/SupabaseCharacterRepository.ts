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
                user_id: character.userId, // Save userId
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
            userId: data.user_id, // Load userId
        };
    }

    async listAll(): Promise<CharacterData[]> {
        const { data: characters, error } = await supabase
            .from('characters')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Failed to list characters:', error);
            throw error;
        }

        // Fetch user profiles for the characters
        const userIds = Array.from(new Set(characters?.map(c => c.user_id).filter(Boolean) || []));
        let profiles: Record<string, string> = {};

        if (userIds.length > 0) {
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('user_id, display_name')
                .in('user_id', userIds);

            if (profileData) {
                profiles = profileData.reduce((acc, p) => ({ ...acc, [p.user_id]: p.display_name }), {});
            }
        }

        return (characters || []).map(d => ({
            id: d.id,
            name: d.name,
            logs: d.logs as any[],
            profile: d.profile as any,
            userId: d.user_id,
            ownerName: profiles[d.user_id] || undefined,
        }));
    }
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('characters')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Failed to delete character:', error);
            throw error;
        }
    }
}
