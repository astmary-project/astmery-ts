import { AppError } from '@/domain/shared/AppError';
import { err, ok, Result } from '@/domain/shared/Result';
import { createClient } from '@/lib/supabase-server';
import { SessionLogEntry } from '../domain/SessionLog';
import { ISessionLogRepository } from '../domain/repository/ISessionLogRepository';

export class SupabaseSessionLogRepository implements ISessionLogRepository {
    async save(roomId: string, log: SessionLogEntry): Promise<Result<void, AppError>> {
        try {
            const supabase = await createClient();
            const { error } = await supabase
                .from('session_logs')
                .insert({
                    room_id: roomId,
                    entry: log,
                    created_at: new Date(log.timestamp).toISOString(),
                });

            if (error) {
                console.error('Failed to save session log:', error);
                return err(AppError.internal('Failed to save session log', error));
            }

            return ok(undefined);
        } catch (e) {
            return err(AppError.internal('Unexpected error saving session log', e));
        }
    }

    async findByRoomId(roomId: string): Promise<Result<SessionLogEntry[], AppError>> {
        try {
            const supabase = await createClient();
            const { data, error } = await supabase
                .from('session_logs')
                .select('entry')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Failed to get session logs:', error);
                return err(AppError.internal('Failed to get session logs', error));
            }

            const logs = data?.map(d => d.entry as SessionLogEntry) || [];
            return ok(logs);
        } catch (e) {
            return err(AppError.internal('Unexpected error getting session logs', e));
        }
    }
}
