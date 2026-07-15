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

const MAX_IMAGE_EDGE = 2_000;
const WEBP_QUALITY = 0.84;
const UNCOMPRESSED_IMAGE_TYPES = new Set(["image/gif", "image/svg+xml"]);

export const isCloudinaryConfigured = Boolean(cloudName && uploadPreset);

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("This browser could not decode the selected image."));
      image.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

/**
 * Resize and compress browser-decodable photos before they are sent over the
 * network. Unsupported images fall back to the original so an upload is never
 * blocked solely because the browser cannot compress it.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || UNCOMPRESSED_IMAGE_TYPES.has(file.type)) {
    return file;
  }

  let decoded: DecodedImage | undefined;

  try {
    decoded = await decodeImage(file);
    if (!decoded.width || !decoded.height) return file;

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(decoded.source, 0, 0, width, height);

    const compressedBlob = await canvasToBlob(canvas);
    canvas.width = 0;
    canvas.height = 0;

    if (!compressedBlob || (scale === 1 && compressedBlob.size >= file.size)) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([compressedBlob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    decoded?.cleanup();
  }
}

export async function uploadToCloudinary(file: File, folder: string): Promise<CloudinaryAsset> {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured. Add the cloud name and unsigned upload preset to .env.local.");
  }

  const uploadFile = await compressImageForUpload(file);
  const body = new FormData();
  body.append("file", uploadFile);
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
