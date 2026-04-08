import "dotenv/config";

export const ENV = {
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || process.env.FRONTEND_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  DYNAMODB_USERS_TABLE: process.env.DYNAMODB_USERS_TABLE || "users",
  DYNAMODB_USERS_EMAIL_GSI:
    process.env.DYNAMODB_USERS_EMAIL_GSI || "EmailIndex",
  DYNAMODB_MESSAGES_TABLE: process.env.DYNAMODB_MESSAGES_TABLE,
  DYNAMODB_MESSAGES_SENDER_GSI:
    process.env.DYNAMODB_MESSAGES_SENDER_GSI || "SenderCreatedAtIndex",
  DYNAMODB_MESSAGES_RECEIVER_GSI:
    process.env.DYNAMODB_MESSAGES_RECEIVER_GSI || "ReceiverCreatedAtIndex",
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,
  ARCJET_KEY: process.env.ARCJET_KEY,
  ARCJET_ENV: process.env.ARCJET_ENV,
};
