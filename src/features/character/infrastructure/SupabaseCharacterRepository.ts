import { AppError } from '@/domain/shared/AppError';
import { err, ok, Result } from '@/domain/shared/Result';
import { SupabaseClient } from '@supabase/supabase-js';
import z from 'zod';
import { CharacterEvent, CharacterEventSchema } from '../domain/Event';
import { CharacterData, ICharacterRepository } from '../domain/repository/ICharacterRepository';

export class SupabaseCharacterRepository implements ICharacterRepository {
    constructor(private client: SupabaseClient) { }

    async save(character: CharacterData): Promise<Result<void, AppError>> {
        try {
            const { error } = await this.client
                .from('characters')
                .upsert({
                    id: character.id,
                    name: character.name,
                    // logs: character.logs, // Deprecated: logs are now in character_logs table
                    profile: character.profile, // Contains tags
                    user_id: character.userId,
                    updated_at: new Date().toISOString(),
                });

            if (error) {
                console.error('Failed to save character:', error);
                return err(AppError.internal('Failed to save character', error));
            }

            // Save events to character_logs table
            if (character.events.length > 0) {
                const logRows = character.events.map(event => ({
                    id: event.id,
                    character_id: character.id,
                    type: event.type,
                    payload: event,
                    created_at: new Date(event.timestamp).toISOString(),
                }));

                const { error: logError } = await this.client
                    .from('character_logs')
                    .upsert(logRows);

                if (logError) {
                    console.error('Failed to save character logs:', logError);
                    return err(AppError.internal('Failed to save character logs', logError));
                }
            }

            return ok(undefined);
        } catch (e) {
            return err(AppError.internal('Unexpected error saving character', e));
        }
    }

    async load(id: string): Promise<Result<CharacterData, AppError>> {
        try {
            const { data, error } = await this.client
                .from('characters')
                .select('*, character_logs(*)')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Not found
                    return err(AppError.notFound(`Character not found: ${id}`, error));
                }
                console.error('Failed to load character:', error);
                return err(AppError.internal('Failed to load character', error));
            }

            if (!data) return err(AppError.notFound(`Character not found: ${id}`));

            const validEvents: CharacterEvent[] = [];

            for (const row of data.character_logs) {
                // payloadカラムにJSONが入っている想定
                // (もしカラム構造が違うなら row.payload などを調整)
                const rawEvent = row.payload;

                const result = CharacterEventSchema.safeParse(rawEvent);

                if (result.success) {
                    validEvents.push(result.data);
                } else {
                    console.warn(
                        `[Repo] Invalid Event dropped (ID: ${row.id}):`,
                        z.treeifyError(result.error)
                    );
                }

            }
            // Sort logs by timestamp just in case DB doesn't ensure order
            validEvents.sort((a, b) => a.timestamp - b.timestamp);

            return ok({
                id: data.id,
                name: data.name,
                events: validEvents,
                profile: data.profile as { avatarUrl?: string; bio?: string; specialtyElements?: string[]; tags?: string[] },
                userId: data.user_id, // Load userId
            });
        } catch (e) {
            return err(AppError.internal('Unexpected error loading character', e));
        }
    }

    async listAll(): Promise<Result<CharacterData[], AppError>> {
        try {
            const { data: characters, error } = await this.client
                .from('characters')
                .select('*, character_logs(*)')
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Failed to list characters:', error);
                return err(AppError.internal('Failed to list characters', error));
            }

            // Fetch user profiles for the characters
            const userIds = Array.from(new Set(characters?.map(c => c.user_id).filter(Boolean) || []));
            let profiles: Record<string, string> = {};

            if (userIds.length > 0) {
                const { data: profileData } = await this.client
                    .from('user_profiles')
                    .select('user_id, display_name')
                    .in('user_id', userIds);

                if (profileData) {
                    profiles = profileData.reduce((acc, p) => ({ ...acc, [p.user_id]: p.display_name }), {});
                }
            }

            return ok((characters || []).map(d => {

                const validEvents: CharacterEvent[] = [];

                for (const row of d.character_logs) {
                    // payloadカラムにJSONが入っている想定
                    // (もしカラム構造が違うなら row.payload などを調整)
                    const rawEvent = row.payload;

                    const result = CharacterEventSchema.safeParse(rawEvent);

                    if (result.success) {
                        validEvents.push(result.data);
                    } else {
                        console.warn(
                            `[Repo] Invalid Event dropped (ID: ${row.id}):`,
                            z.treeifyError(result.error)
                        );
                    }
                }

                validEvents.sort((a: CharacterEvent, b: CharacterEvent) => a.timestamp - b.timestamp);

                return {
                    id: d.id,
                    name: d.name,
                    events: validEvents,
                    profile: d.profile as { avatarUrl?: string; bio?: string; specialtyElements?: string[]; tags?: string[] },
                    userId: d.user_id,
                    ownerName: profiles[d.user_id] || undefined,
                };
            }));
        } catch (e) {
            return err(AppError.internal('Unexpected error listing characters', e));
        }
    }
    async delete(id: string): Promise<Result<void, AppError>> {
        try {
            const { error } = await this.client
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
