export interface CloudinaryAsset {
  publicId: string;
  secureUrl: string;
  resourceType: "image" | "video" | "raw";
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  originalFilename?: string;
}

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = Boolean(cloudName && uploadPreset);

export async function uploadToCloudinary(file: File, folder: string): Promise<CloudinaryAsset> {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured. Add the cloud name and unsigned upload preset to .env.local.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);
  body.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`, {
    method: "POST",
    body,
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message ?? "Cloudinary could not upload this file.");
  }
  if (!result.public_id || !result.secure_url?.startsWith("https://res.cloudinary.com/")) {
    throw new Error("Cloudinary returned an invalid asset response.");
  }

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    resourceType: result.resource_type,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    originalFilename: result.original_filename,
  };
}

export async function uploadManyToCloudinary(files: File[], folder: string): Promise<CloudinaryAsset[]> {
  return Promise.all(files.map((file) => uploadToCloudinary(file, folder)));
}
