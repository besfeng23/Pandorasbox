import { Storage } from '@google-cloud/storage';
import { GOOGLE_CLOUD_CONFIG } from './config';

// Initialize storage client
const storage = new Storage({
    projectId: GOOGLE_CLOUD_CONFIG.projectId,
});

const bucketName = GOOGLE_CLOUD_CONFIG.storageBucket;
const bucket = storage.bucket(bucketName);

export const cloudStorage = {
    /**
     * Upload a buffer to GCS
     * @param path The destination path in the bucket (e.g. 'uploads/image.png')
     * @param buffer The file content buffer
     * @param contentType MIME type of the file
     */
    async upload(path: string, buffer: Buffer, contentType: string): Promise<string> {
        try {
            const file = bucket.file(path);

            await file.save(buffer, {
                metadata: {
                    contentType: contentType,
                },
                resumable: false // suitable for smaller files like chat images
            });

            // Since we are likely using a private bucket, we might want to return a signed URL 
            // or just the GCS path depending on use case.
            // For public access (if bucket is configured), we can return the public URL.
            // For now, let's return the simplified GCS URI for internal use reference.
            return `gs://${bucketName}/${path}`;
        } catch (error) {
            console.error('[CloudStorage] Upload failed:', error);
            throw new Error(`Failed to upload file to ${path}`);
        }
    },

    /**
     * Generate a signed URL for temporary read access
     */
    async getSignedUrl(path: string, expiresInMinutes: number = 60): Promise<string> {
        try {
            const options = {
                version: 'v4' as const,
                action: 'read' as const,
                expires: Date.now() + expiresInMinutes * 60 * 1000,
            };

            const [url] = await bucket.file(path).getSignedUrl(options);
            return url;
        } catch (error) {
            console.error('[CloudStorage] Signed URL generation failed:', error);
            throw error;
        }
    },

    /**
     * Download file contents as a buffer
     */
    async download(path: string): Promise<Buffer> {
        try {
            const [buffer] = await bucket.file(path).download();
            return buffer;
        } catch (error) {
            console.error('[CloudStorage] Download failed:', error);
            throw error;
        }
    },

    /**
     * Check if file exists
     */
    async exists(path: string): Promise<boolean> {
        try {
            const [exists] = await bucket.file(path).exists();
            return exists;
        } catch (error) {
            return false;
        }
    }
};
