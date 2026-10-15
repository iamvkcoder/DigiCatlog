import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env.js';

const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET &&
    env.CLOUDINARY_CLOUD_NAME.trim() !== ''
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface UploadResult {
  url: string;
  publicId: string;
}

export async function uploadImage(
  buffer: Buffer,
  mimetype: string,
  folder = 'general'
): Promise<UploadResult> {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedMimeTypes.includes(mimetype)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.');
  }

  if (buffer.length > 3 * 1024 * 1024) {
    throw new Error('File size exceeds the 3 MB limit.');
  }

  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `digicatlog/${folder}`,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload failed'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );
      uploadStream.end(buffer);
    });
  }

  // Fallback to local storage
  const ext = mimetype.split('/')[1] || 'jpg';
  const fileHash = crypto.randomBytes(16).toString('hex');
  const filename = `${folder}-${fileHash}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  await fs.promises.writeFile(filePath, buffer);

  return {
    url: `/uploads/${filename}`,
    publicId: `local:${filename}`,
  };
}

export async function deleteImage(publicId?: string | null): Promise<void> {
  if (!publicId) return;

  if (publicId.startsWith('local:')) {
    const filename = publicId.replace('local:', '');
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        console.warn(`Failed to delete local image ${filePath}:`, err);
      }
    }
    return;
  }

  if (isCloudinaryConfigured) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.warn(`Failed to delete Cloudinary image ${publicId}:`, err);
    }
  }
}
