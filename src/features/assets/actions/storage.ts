'use server';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const S3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true, // R2 works best with path-style
});

export async function getUploadUrl(key: string, contentType: string) {
    if (!R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is not defined');

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });

    // Valid for 1 hour
    const url = await getSignedUrl(S3, command, { expiresIn: 3600 });
    return url;
}

export async function deleteFile(key: string) {
    if (!R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is not defined');

    const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    });

    await S3.send(command);
}
