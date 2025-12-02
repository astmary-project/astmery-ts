import { AppError } from '@/domain/shared/AppError';
import { err, ok, Result } from '@/domain/shared/Result';
import { createClient } from '@/lib/supabase-server';
import { Room } from '../domain/Room';
import { IRoomRepository } from '../domain/repository/IRoomRepository';

export class SupabaseRoomRepository implements IRoomRepository {
    async create(name: string, userId: string): Promise<Result<Room, AppError>> {
        try {
            const supabase = await createClient();
            const { data, error } = await supabase
                .from('rooms')
                .insert({
                    name,
                    created_by: userId,
                    status: 'active'
                })
                .select()
                .single();

            if (error) {
                console.error('Failed to create room:', error);
                return err(AppError.internal('Failed to create room', error));
            }

            return ok(this.mapToDomain(data));
        } catch (e) {
            return err(AppError.internal('Unexpected error creating room', e));
        }
    }

    async listAll(): Promise<Result<Room[], AppError>> {
        try {
            const supabase = await createClient();
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Failed to list rooms:', error);
                return err(AppError.internal('Failed to list rooms', error));
            }

            return ok(data.map(this.mapToDomain));
        } catch (e) {
            return err(AppError.internal('Unexpected error listing rooms', e));
        }
    }

    async update(id: string, data: Partial<Room>): Promise<Result<void, AppError>> {
        try {
            const supabase = await createClient();
            const updateData: Record<string, unknown> = {};
            if (data.name) updateData.name = data.name;
            if (data.status) updateData.status = data.status;
            updateData.updated_at = new Date().toISOString();

            const { error } = await supabase
                .from('rooms')
                .update(updateData)
                .eq('id', id);

            if (error) {
                console.error('Failed to update room:', error);
                return err(AppError.internal('Failed to update room', error));
            }

            return ok(undefined);
        } catch (e) {
            return err(AppError.internal('Unexpected error updating room', e));
        }
    }

    async findById(id: string): Promise<Result<Room, AppError>> {
        try {
            const supabase = await createClient();
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return err(AppError.notFound(`Room not found: ${id}`, error));
                }
                console.error('Failed to find room:', error);
                return err(AppError.internal('Failed to find room', error));
            }

            return ok(this.mapToDomain(data));
        } catch (e) {
            return err(AppError.internal('Unexpected error finding room', e));
        }
    }

    private mapToDomain(data: RoomRow): Room {
        return {
            id: data.id,
            name: data.name,
            status: data.status,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }
}

interface RoomRow {
    id: string;
    name: string;
    status: 'active' | 'waiting' | 'closed';
    created_by: string;
    created_at: string;
    updated_at: string;
}
