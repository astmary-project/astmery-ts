import { AppError } from '@/domain/shared/AppError';
import { Result } from '@/domain/shared/Result';
import { CharacterLogEntry } from '../CharacterLog';

export interface CharacterData {
    id: string;
    name: string;
    logs: CharacterLogEntry[];
    // We might want to store the calculated state snapshot too for performance,
    // but for now, Event Sourcing style: logs are the source of truth.
    // We also store basic profile info separately.
    profile?: {
        avatarUrl?: string;
        bio?: string;
        specialtyElements?: string[];
        tags?: string[];
    };
    userId?: string;
    ownerName?: string;
}

export interface ICharacterRepository {
    save(character: CharacterData): Promise<Result<void, AppError>>;
    load(id: string): Promise<Result<CharacterData, AppError>>;
    listAll(): Promise<Result<CharacterData[], AppError>>;
    delete(id: string): Promise<Result<void, AppError>>;
    // In a real app, we might have methods to append logs specifically
    // appendLog(characterId: string, log: CharacterLogEntry): Promise<void>;
}
