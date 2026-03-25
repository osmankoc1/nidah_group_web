import "server-only";
import { v2 as cloudinary } from "cloudinary";

// ── Configuration ─────────────────────────────────────────────────────────────
// Supports two formats:
//   1. CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name  (SDK auto-parses)
//   2. Individual vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

if (process.env.CLOUDINARY_URL) {
  // The SDK parses the URL format automatically when CLOUDINARY_URL is set in env,
  // but calling config() explicitly guarantees it regardless of env auto-load.
  cloudinary.config(process.env.CLOUDINARY_URL);
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
}

// Validate at module load so the problem surfaces at server start, not on first upload.
const cfg = cloudinary.config();
export const isCloudinaryConfigured =
  Boolean(cfg.cloud_name) && Boolean(cfg.api_key) && Boolean(cfg.api_secret);

if (!isCloudinaryConfigured) {
  console.warn(
    "[cloudinary] Not configured — upload/delete disabled.\n" +
    "  Add to .env.local:\n" +
    "    CLOUDINARY_CLOUD_NAME=<your-cloud>\n" +
    "    CLOUDINARY_API_KEY=<your-key>\n" +
    "    CLOUDINARY_API_SECRET=<your-secret>\n" +
    "  Or use the combined URL:\n" +
    "    CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>"
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadResult {
  publicId:  string;
  secureUrl: string;
  width:     number;
  height:    number;
  format:    string;
  bytes:     number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Upload a Buffer (from multipart) or a remote URL string to Cloudinary.
 * Throws if Cloudinary is not configured.
 */
export async function uploadToCloudinary(
  source: Buffer | string,
  folder = "nidah/products"
): Promise<UploadResult> {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env.local");
  }

  let result: Awaited<ReturnType<typeof cloudinary.uploader.upload>>;

  if (Buffer.isBuffer(source)) {
    result = await new Promise<ReturnType<typeof cloudinary.uploader.upload> extends Promise<infer T> ? T : never>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: "image" },
          (err, res) => {
            if (err || !res) return reject(err ?? new Error("upload_stream returned no result"));
            resolve(res);
          }
        );
        stream.end(source);
      }
    );
  } else {
    result = await cloudinary.uploader.upload(source, { folder, resource_type: "image" });
  }

  return {
    publicId:  result.public_id,
    secureUrl: result.secure_url,
    width:     result.width,
    height:    result.height,
    format:    result.format,
    bytes:     result.bytes,
  };
}

/**
 * Delete an asset from Cloudinary by its public_id.
 * Logs a warning instead of throwing if Cloudinary is not configured.
 */
export async function destroyFromCloudinary(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured) {
    console.warn("[cloudinary] destroyFromCloudinary called but Cloudinary is not configured.");
    return;
  }
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
