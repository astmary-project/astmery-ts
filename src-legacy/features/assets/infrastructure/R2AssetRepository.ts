import { AppError } from '@/domain/shared/AppError';
import { err, ok, Result } from '@/domain/shared/Result';
import { createClient } from '@/lib/supabase';
import { deleteFile, getUploadUrl } from '../actions/storage';
import { Asset, AssetType } from '../domain/Asset';
import { IAssetRepository } from '../domain/repository/IAssetRepository';

export class R2AssetRepository implements IAssetRepository {
    private publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN;

    async upload(file: File, type: AssetType): Promise<Result<Asset, AppError>> {
        try {
            const supabase = createClient();
            const user = await supabase.auth.getUser();
            if (!user.data.user) {
                return err(AppError.unauthorized('User not logged in'));
            }

            if (!this.publicDomain) {
                return err(AppError.internal('R2_PUBLIC_DOMAIN is not configured'));
            }

            // 1. Generate Key and Get Presigned URL
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.data.user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const key = fileName; // Use same structure as Supabase Storage for simplicity

            const presignedUrl = await getUploadUrl(key, file.type);

            // 2. Upload to R2
            const uploadRes = await fetch(presignedUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!uploadRes.ok) {
                console.error('Failed to upload to R2:', uploadRes.status, uploadRes.statusText);
                return err(AppError.internal(`Failed to upload to R2: ${uploadRes.statusText}`));
            }

            // Construct Public URL
            // Ensure publicDomain doesn't have trailing slash and key doesn't have leading slash
            const baseUrl = this.publicDomain.replace(/\/$/, '');
            const publicUrl = `${baseUrl}/${key}`;

            // 3. Insert into DB
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
                // Cleanup R2 file? Ideally yes.
                await deleteFile(key).catch(console.error);
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
            console.error('Unexpected error uploading asset:', e);
            const message = e instanceof Error ? e.message : String(e);
            return err(AppError.internal(`Unexpected error uploading asset: ${message}`, e));
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

            // 1. Get asset to find URL (to derive key)
            const { data: asset, error: fetchError } = await supabase
                .from('assets')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) {
                return err(AppError.notFound('Asset not found', fetchError));
            }

            // Extract key from URL
            // URL: https://pub-xxx.r2.dev/USER_ID/FILENAME
            if (!this.publicDomain) {
                return err(AppError.internal('R2_PUBLIC_DOMAIN is not configured'));
            }

            // Simple extraction: remove domain part
            // Assuming publicDomain is the prefix
            const baseUrl = this.publicDomain.replace(/\/$/, '');
            const key = asset.url.replace(baseUrl + '/', '');

            // If URL doesn't start with domain (e.g. old Supabase URL), handle gracefully?
            // For migration, we might have mixed URLs.
            // But for now, let's assume we only delete R2 assets or we check.
            if (!asset.url.startsWith(baseUrl)) {
                console.warn('Asset URL does not match R2 domain, skipping R2 delete:', asset.url);
                // Proceed to delete from DB only? Or try to delete from Supabase Storage?
                // For now, let's just delete from DB if it's not R2.
            } else {
                // 2. Delete from R2
                await deleteFile(key);
            }

            // 3. Delete from DB
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
