import { Client } from 'minio';

const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
const port = parseInt(process.env.MINIO_PORT || '9000', 10);
const accessKey = process.env.MINIO_ACCESS_KEY || '';
const secretKey = process.env.MINIO_SECRET_KEY || '';
const bucket = process.env.MINIO_BUCKET || 'transactions';

export const minioClient = new Client({
  endPoint: endpoint,
  port,
  useSSL: false,
  accessKey,
  secretKey,
});

export const bucketName = bucket;

/**
 * Upload a file buffer to MinIO and return a same-origin relative path.
 *
 * The returned path (e.g. `/transactions/<objectName>`) is served through
 * this app (see `app/transactions/[...path]/route.ts`) instead of exposing
 * MinIO's internal host (`plankan-minio:9000`), which is unreachable and
 * undesirable from the browser. The object name is timestamped to avoid
 * collisions.
 */
export async function uploadFile(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
  // Ensure bucket exists
  const exists = await minioClient.bucketExists(bucket).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(bucket, '');
  }

  const timestamp = Date.now();
  const objectName = `${timestamp}-${originalName.replace(/\s+/g, '_')}`;

  await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
    'Content-Type': mimeType,
  });

  // Relative to the app origin: browsers resolve it against the base URL.
  return `/${bucket}/${objectName}`;
}
