'use server';

import { SessionLogEntry } from '../domain/SessionLog';
import { SupabaseSessionLogRepository } from '../infrastructure/SupabaseSessionLogRepository';

const repository = new SupabaseSessionLogRepository();

export type ActionResponse<T> =
    | { success: true; data: T }
    | { success: false; error: string };

export async function saveLog(roomId: string, log: SessionLogEntry): Promise<ActionResponse<void>> {
    const result = await repository.save(roomId, log);
    if (result.isSuccess) {
        return { success: true, data: undefined };
    }
    return { success: false, error: result.error.message };
}

export async function getLogs(roomId: string): Promise<ActionResponse<SessionLogEntry[]>> {
    const result = await repository.findByRoomId(roomId);
    if (result.isSuccess) {
        return { success: true, data: result.value };
    }
    return { success: false, error: result.error.message };
}
