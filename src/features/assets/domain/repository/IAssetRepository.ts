import { AppError } from '@/domain/shared/AppError';
import { Result } from '@/domain/shared/Result';
import { Asset, AssetType } from '../Asset';

export interface IAssetRepository {
    upload(file: File, type: AssetType): Promise<Result<Asset, AppError>>;
    list(type?: AssetType): Promise<Result<Asset[], AppError>>;
    delete(id: string): Promise<Result<void, AppError>>;
}
