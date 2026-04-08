import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { ENV } from "./env.js";

const s3Client = new S3Client({
  region: ENV.AWS_REGION,
  credentials: {
    accessKeyId: ENV.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY || "",
  },
});

const parseBase64Image = (base64Image) => {
  const matches = base64Image.match(/^data:(.*?);base64,(.*)$/);
  if (!matches) {
    throw new Error("Invalid base64 image format");
  }

  const contentType = matches[1];
  const base64Data = matches[2];
  const extension = contentType.split("/")[1] || "png";

  return {
    contentType,
    extension,
    buffer: Buffer.from(base64Data, "base64"),
  };
};

export const uploadBase64ImageToS3 = async (
  base64Image,
  folder = "uploads",
) => {
  if (!ENV.S3_BUCKET_NAME || !ENV.S3_PUBLIC_URL) {
    throw new Error("S3_BUCKET_NAME and S3_PUBLIC_URL are required");
  }

  const { buffer, contentType, extension } = parseBase64Image(base64Image);
  const key = `${folder}/${Date.now()}-${randomUUID()}.${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: ENV.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return `${ENV.S3_PUBLIC_URL}/${key}`;
};
