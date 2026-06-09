import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import path from "path";

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "minioadmin",
  },
  forcePathStyle: true,
});

export const PUBLIC_BUCKET = process.env.S3_PUBLIC_BUCKET ?? "goodtribes-public";
export const PRIVATE_BUCKET = process.env.S3_PRIVATE_BUCKET ?? "goodtribes-private";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DOC_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const ALLOWED_TYPES = new Set([...IMAGE_TYPES, ...DOC_TYPES]);
export const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024;
export const DOC_SIZE_LIMIT = 20 * 1024 * 1024;

export function isImageType(mimeType: string): boolean {
  return IMAGE_TYPES.has(mimeType);
}

export function buildKey(userId: string, filename: string, mimeType: string): string {
  const ext = isImageType(mimeType) && mimeType !== "image/gif"
    ? ".webp"
    : path.extname(filename) || "";
  const base = path.basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return `${userId}/${Date.now()}-${base}${ext}`;
}

export function publicUrl(key: string): string {
  return `${process.env.NEXT_PUBLIC_STORAGE_URL ?? "http://localhost:9000/goodtribes-public"}/${key}`;
}

export async function uploadObject(params: {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ContentLength: params.body.byteLength,
    })
  );
}

export async function getObjectStream(
  bucket: string,
  key: string
): Promise<{ body: ReadableStream; contentType: string; contentLength: number }> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error("Empty body from S3");
  return {
    body: res.Body.transformToWebStream(),
    contentType: res.ContentType ?? "application/octet-stream",
    contentLength: res.ContentLength ?? 0,
  };
}

export async function resizeImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (mimeType === "image/gif") return buffer;
  return sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}
