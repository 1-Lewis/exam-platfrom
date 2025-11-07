// src/lib/storage.ts
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION ?? "eu-west-1";
const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? "";
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? "";
const bucket = process.env.S3_BUCKET ?? "exam-platform";
const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? "true").toLowerCase() === "true";

export const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle,
  credentials: { accessKeyId, secretAccessKey },
});

export async function putObject(params: {
  key: string;
  contentType: string;
  body: Buffer | Uint8Array | string;
}): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ACL: "private",
    }),
  );
}

export async function headObject(key: string): Promise<{ contentLength?: number } | null> {
  try {
    const res = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { contentLength: res.ContentLength ?? undefined };
  } catch {
    return null;
  }
}

export async function getSignedGetUrl(
  key: string,
  expiresSeconds = 300,
): Promise<string> {
  return await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }),
    { expiresIn: expiresSeconds },
  );
}

export const STORAGE_BUCKET = bucket;
