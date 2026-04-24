import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
// Note: We use aws-sdk to interface with Backblaze B2 since it's S3-compatible.

const B2_KEY_ID = import.meta.env.VITE_B2_KEY_ID;
const B2_APPLICATION_KEY = import.meta.env.VITE_B2_APPLICATION_KEY;
const B2_BUCKET_NAME = import.meta.env.VITE_B2_BUCKET_NAME;
const B2_ENDPOINT = import.meta.env.VITE_B2_ENDPOINT;
// Typically the region for us-west-004 is "us-west-004"
const B2_REGION = B2_ENDPOINT ? B2_ENDPOINT.split('.')[1] : 'us-west-004';

// Only initialize the client if credentials are provided to avoid crashing the app if they are missing
export const b2Client = B2_KEY_ID && B2_APPLICATION_KEY && B2_ENDPOINT
  ? new S3Client({
    endpoint: B2_ENDPOINT,
    region: B2_REGION,
    credentials: {
      accessKeyId: B2_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
    },
  })
  : null;

/**
 * Uploads a file to Backblaze B2 Storage.
 * @param file The File object from an input field
 * @param folder The folder path (optional), e.g., 'products' or 'avatars'
 * @returns The public URL of the uploaded file
 */
export async function uploadToB2(file: File, folder: string = 'general'): Promise<string> {
  if (!b2Client) throw new Error("B2 Client is not initialized. Please check your environment variables.");

  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  const command = new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: fileName,
    Body: file,
    ContentType: file.type,
  });

  try {
    await b2Client.send(command);

    // Construct the public URL
    // Format for public buckets: https://f000.backblazeb2.com/file/bucket-name/file-path
    // However, S3 compatible URLs are often: https://bucket-name.s3.region.backblazeb2.com/file-path
    // Or backblaze standard: https://<endpoint>/<bucket-name>/<key>

    // For standard public B2 urls without S3 routing:
    // const publicUrl = `https://f${B2_REGION.split('-')[2]}.backblazeb2.com/file/${B2_BUCKET_NAME}/${fileName}`;

    // For S3-compatible URL (works well with S3 endpoints):
    const publicUrl = `${B2_ENDPOINT}/${B2_BUCKET_NAME}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error("Error uploading to B2:", error);
    throw error;
  }
}

/**
 * Deletes a file from Backblaze B2 Storage.
 * @param fileUrl The full public URL or the object key
 */
export async function deleteFromB2(fileUrlOrKey: string): Promise<boolean> {
  if (!b2Client) throw new Error("B2 Client is not initialized.");

  let key = fileUrlOrKey;

  // If it's a URL, try to extract the key
  if (fileUrlOrKey.startsWith('http')) {
    try {
      const url = new URL(fileUrlOrKey);
      // For S3-style urls like https://s3.us-west-004.backblazeb2.com/Veroprise-pro/products/123.jpg
      const parts = url.pathname.split('/');
      // pathname starts with '/' so parts[0] is empty, parts[1] is bucket name
      if (parts.length > 2 && parts[1] === B2_BUCKET_NAME) {
        key = parts.slice(2).join('/');
      } else {
        // Fallback or handle different URL structures if needed
        key = fileUrlOrKey.split(`${B2_BUCKET_NAME}/`)[1] || fileUrlOrKey;
      }
    } catch (e) {
      console.warn("Could not parse URL for key extraction", e);
    }
  }

  const command = new DeleteObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
  });

  try {
    await b2Client.send(command);
    return true;
  } catch (error) {
    console.error("Error deleting from B2:", error);
    throw error;
  }
}
