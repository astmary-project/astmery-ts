import { AppError } from '@/domain/shared/AppError';
import { Result } from '@/domain/shared/Result';
import { Room } from '../Room';

export interface IRoomRepository {
    create(name: string, userId: string): Promise<Result<Room, AppError>>;
    listAll(): Promise<Result<Room[], AppError>>;
    update(id: string, data: Partial<Room>): Promise<Result<void, AppError>>;
    findById(id: string): Promise<Result<Room, AppError>>;
}
