import { AppError } from '@/domain/shared/AppError';
import { err, ok, Result } from '@/domain/shared/Result';
import { createClient } from '@/lib/supabase-server';
import { CharacterData, ICharacterRepository } from '../domain/repository/ICharacterRepository';

export class ServerSupabaseCharacterRepository implements ICharacterRepository {
    async save(character: CharacterData): Promise<Result<void, AppError>> {
        try {
            const supabase = await createClient();
            const { error } = await supabase
                .from('characters')
                .upsert({
                    id: character.id,
                    name: character.name,
                    logs: character.logs,
                    profile: character.profile,
                    user_id: character.userId,
                    updated_at: new Date().toISOString(),
                });

            if (error) {
                console.error('Failed to save character:', error);
                return err(AppError.internal('Failed to save character', error));
            }

            return ok(undefined);
        } catch (e) {
            return err(AppError.internal('Unexpected error saving character', e));
        }
    }

    async load(id: string): Promise<Result<CharacterData, AppError>> {
        try {
            const supabase = await createClient();
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return err(AppError.notFound(`Character not found: ${id}`, error));
                }
                console.error('Failed to load character:', error);
                return err(AppError.internal('Failed to load character', error));
            }

            if (!data) return err(AppError.notFound(`Character not found: ${id}`));

            return ok({
                id: data.id,
                name: data.name,
                logs: data.logs as import('../domain/CharacterLog').CharacterLogEntry[],
                profile: data.profile as { avatarUrl?: string; bio?: string; specialtyElements?: string[] },
                userId: data.user_id,
            });
        } catch (e) {
            return err(AppError.internal('Unexpected error loading character', e));
        }
    }

    async listAll(): Promise<Result<CharacterData[], AppError>> {
        try {
            const supabase = await createClient();
            const { data: characters, error } = await supabase
                .from('characters')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Failed to list characters:', error);
                return err(AppError.internal('Failed to list characters', error));
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

            return ok((characters || []).map(d => ({
                id: d.id,
                name: d.name,
                logs: d.logs as import('../domain/CharacterLog').CharacterLogEntry[],
                profile: d.profile as { avatarUrl?: string; bio?: string; specialtyElements?: string[] },
                userId: d.user_id,
                ownerName: profiles[d.user_id] || undefined,
            })));
        } catch (e) {
            return err(AppError.internal('Unexpected error listing characters', e));
        }
    }

    async delete(id: string): Promise<Result<void, AppError>> {
        try {
            const supabase = await createClient();
            const { error } = await supabase
                .from('characters')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Failed to delete character:', error);
                return err(AppError.internal('Failed to delete character', error));
            }

            return ok(undefined);
        } catch (e) {
            return err(AppError.internal('Unexpected error deleting character', e));
        }
    }
}
