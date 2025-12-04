'use server';

import { AppError } from '@/domain/shared/AppError';
import { Result } from '@/domain/shared/Result';
import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { Room } from '../domain/Room';
import { SupabaseRoomRepository } from '../infrastructure/SupabaseRoomRepository';

const repository = new SupabaseRoomRepository();

export type ActionResponse<T> =
    | { success: true; data: T }
    | { success: false; error: string };

export async function createRoom(name: string = 'New Room'): Promise<ActionResponse<Room>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'User not logged in' };
    }

    const result = await repository.create(name, user.id);
    if (result.isSuccess) {
        revalidatePath('/room');
        return { success: true, data: result.value };
    }
    return { success: false, error: result.error.message };
}

export async function listRooms(): Promise<Result<Room[], AppError>> {
    // This is called from Server Component, so Result class is fine
    return repository.listAll();
}

import { redirect } from 'next/navigation';

export async function updateRoom(id: string, data: Partial<Room>): Promise<ActionResponse<void>> {
    const result = await repository.update(id, data);
    if (result.isSuccess) {
        revalidatePath('/room');
        revalidatePath(`/room/${id}`);
        return { success: true, data: undefined };
    }
    return { success: false, error: result.error.message };
}

export async function archiveRoom(id: string) {
    const result = await repository.update(id, { status: 'closed' });
    if (result.isSuccess) {
        revalidatePath('/room');
        revalidatePath(`/room/${id}`);
        redirect('/room');
    }
    return { success: false, error: result.error.message };
}

export async function deleteRoom(id: string) {
    const result = await repository.delete(id);
    if (result.isSuccess) {
        revalidatePath('/room');
        redirect('/room');
    }
    return { success: false, error: result.error.message };
}

export async function getRoom(id: string): Promise<Result<Room, AppError>> {
    // This is called from Server Component, so Result class is fine
    return repository.findById(id);
}
