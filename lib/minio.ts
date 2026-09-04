import { Client } from 'minio';

const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
const port = parseInt(process.env.MINIO_PORT || '9000', 10);
const accessKey = process.env.MINIO_ACCESS_KEY || '';
const secretKey = process.env.MINIO_SECRET_KEY || '';
const bucket = process.env.MINIO_BUCKET || 'transactions';

const minioClient = new Client({
  endPoint: endpoint,
  port,
  useSSL: false,
  accessKey,
  secretKey,
});

/**
 * Upload a file buffer to MinIO and return its public URL.
 * The object name will be a timestamped filename to avoid collisions.
 */
export async function uploadFile(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
  // Ensure bucket exists
  const exists = await minioClient.bucketExists(bucket).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(bucket, '');
  }

  const timestamp = Date.now();
  const ext = originalName.substring(originalName.lastIndexOf('.')) || '';
  const objectName = `${timestamp}-${originalName.replace(/\s+/g, '_')}`;

  await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
    'Content-Type': mimeType,
  });

  // Construct a simple HTTP URL (MinIO default is http://<endpoint>:<port>/<bucket>/<object>)
  return `http://${endpoint}:${port}/${bucket}/${objectName}`;
}
