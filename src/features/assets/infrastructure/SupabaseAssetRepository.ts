import { AppError } from '@/domain/shared/AppError';
import { err, ok, Result } from '@/domain/shared/Result';
import { createClient } from '@/lib/supabase';
import { Asset, AssetType } from '../domain/Asset';
import { IAssetRepository } from '../domain/repository/IAssetRepository';

export class SupabaseAssetRepository implements IAssetRepository {
    async upload(file: File, type: AssetType): Promise<Result<Asset, AppError>> {
        try {
            const supabase = createClient();
            const user = await supabase.auth.getUser();
            if (!user.data.user) {
                return err(AppError.unauthorized('User not logged in'));
            }

            // 1. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.data.user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) {
                console.error('Failed to upload asset to storage:', uploadError);
                return err(AppError.internal('Failed to upload asset', uploadError));
            }

            const { data: { publicUrl } } = supabase.storage
                .from('assets')
                .getPublicUrl(filePath);

            // 2. Insert into DB
            const assetData = {
                user_id: user.data.user.id,
                type,
                url: publicUrl,
                name: file.name,
                size: file.size,
                mime_type: file.type,
                created_at: new Date().toISOString(),
            };

            const { data: insertedData, error: dbError } = await supabase
                .from('assets')
                .insert(assetData)
                .select()
                .single();

            if (dbError) {
                console.error('Failed to save asset metadata:', dbError);
                // Cleanup storage if DB fails? ideally yes, but keeping it simple for now
                return err(AppError.internal('Failed to save asset metadata', dbError));
            }

            return ok({
                id: insertedData.id,
                userId: insertedData.user_id,
                type: insertedData.type as AssetType,
                url: insertedData.url,
                name: insertedData.name,
                size: insertedData.size,
                mimeType: insertedData.mime_type,
                createdAt: new Date(insertedData.created_at).getTime(),
            });

        } catch (e) {
            return err(AppError.internal('Unexpected error uploading asset', e));
        }
    }

    async list(type?: AssetType): Promise<Result<Asset[], AppError>> {
        try {
            const supabase = createClient();
            let query = supabase
                .from('assets')
                .select('*')
                .order('created_at', { ascending: false });

            if (type) {
                query = query.eq('type', type);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Failed to list assets:', error);
                return err(AppError.internal('Failed to list assets', error));
            }

            return ok(data.map(d => ({
                id: d.id,
                userId: d.user_id,
                type: d.type as AssetType,
                url: d.url,
                name: d.name,
                size: d.size,
                mimeType: d.mime_type,
                createdAt: new Date(d.created_at).getTime(),
            })));
        } catch (e) {
            return err(AppError.internal('Unexpected error listing assets', e));
        }
    }

    async delete(id: string): Promise<Result<void, AppError>> {
        try {
            const supabase = createClient();

            // 1. Get asset to find storage path
            const { data: asset, error: fetchError } = await supabase
                .from('assets')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) {
                return err(AppError.notFound('Asset not found', fetchError));
            }

            // Extract path from URL or store path in DB? 
            // Current implementation stores full public URL.
            // We need to extract the path relative to the bucket.
            // URL format: https://.../storage/v1/object/public/assets/USER_ID/FILENAME
            // We need: USER_ID/FILENAME

            const url = new URL(asset.url);
            const pathParts = url.pathname.split('/assets/'); // Assuming bucket name is 'assets'
            if (pathParts.length < 2) {
                console.warn('Could not parse asset path from URL:', asset.url);
                // Proceed to delete from DB anyway?
            } else {
                const storagePath = pathParts[1];
                const { error: storageError } = await supabase.storage
                    .from('assets')
                    .remove([storagePath]);

                if (storageError) {
                    console.error('Failed to delete from storage:', storageError);
                    // Continue to delete from DB to keep state consistent?
                }
            }

            // 2. Delete from DB
            const { error: dbError } = await supabase
                .from('assets')
                .delete()
                .eq('id', id);

            if (dbError) {
                return err(AppError.internal('Failed to delete asset from DB', dbError));
            }

            return ok(undefined);
        } catch (e) {
            return err(AppError.internal('Unexpected error deleting asset', e));
        }
    }
}
