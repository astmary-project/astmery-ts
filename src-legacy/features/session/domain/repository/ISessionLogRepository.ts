import { AppError } from '@/domain/shared/AppError';
import { Result } from '@/domain/shared/Result';
import { SessionLogEntry } from '../SessionLog';

export interface ISessionLogRepository {
    save(roomId: string, log: SessionLogEntry): Promise<Result<void, AppError>>;
    findByRoomId(roomId: string): Promise<Result<SessionLogEntry[], AppError>>;
}
