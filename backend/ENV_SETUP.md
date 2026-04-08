# Environment Setup Guide

## Required Variables

- PORT: Backend API port (example: 4000)
- FRONTEND_URL: Frontend origin for CORS (example: http://localhost:3000)
- NODE_ENV: development or production

- JWT_ACCESS_SECRET: Used to sign auth cookie token
- JWT_REFRESH_SECRET: Reserved for future refresh-token flow

- AWS_REGION: AWS region where DynamoDB and S3 are deployed
- AWS_ACCESS_KEY_ID: IAM access key id
- AWS_SECRET_ACCESS_KEY: IAM secret access key

- DYNAMODB_USERS_TABLE: Users table name (default: users)
- DYNAMODB_USERS_EMAIL_GSI: Users email index (default: EmailIndex)
- DYNAMODB_MESSAGES_TABLE: Messages table name (example: chat_messages)
- DYNAMODB_MESSAGES_SENDER_GSI: Sender index name (default: SenderCreatedAtIndex)
- DYNAMODB_MESSAGES_RECEIVER_GSI: Receiver index name (default: ReceiverCreatedAtIndex)

- S3_BUCKET_NAME: Bucket name for image upload
- S3_PUBLIC_URL: Public object base URL (example: https://<bucket>.s3.<region>.amazonaws.com)

- ARCJET_KEY: Arcjet API key (if Arcjet middleware is enabled)
- ARCJET_ENV: Arcjet environment (development or production)

- RESEND_API_KEY: Resend API key (if email sending is enabled)
- EMAIL_FROM: Sender email (must be verified in Resend)
- EMAIL_FROM_NAME: Sender display name

## Where To Get Missing Values

### JWT_ACCESS_SECRET and JWT_REFRESH_SECRET

Generate random secure strings:

PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run twice and set one value for each secret.

### AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

1. Open AWS Console.
2. Go to IAM -> Users -> choose your user.
3. Security credentials -> Create access key.
4. Save Access key ID and Secret access key.

Minimum IAM permissions needed:

- dynamodb:CreateTable
- dynamodb:DescribeTable
- dynamodb:PutItem
- dynamodb:Query
- dynamodb:Scan
- s3:PutObject
- s3:GetObject (if your app reads objects)

### S3_PUBLIC_URL

Use this format:

- https://<bucket>.s3.<region>.amazonaws.com

Example:

- https://cnm-mecord.s3.ap-southeast-1.amazonaws.com

### ARCJET_KEY

1. Sign in to Arcjet dashboard.
2. Create a project/app.
3. Copy API key.

### RESEND_API_KEY, EMAIL_FROM

1. Sign in to Resend dashboard.
2. Create API key.
3. Verify your sending domain or email identity.
4. Set EMAIL_FROM to verified sender address.

## Provision DynamoDB Tables and GSIs

From backend folder:

```bash
npm run dynamodb:init
```

This script creates:

- users table with EmailIndex GSI
- chat_messages table with:
  - partition key: conversationId
  - sort key: sortKey
  - sender GSI: SenderCreatedAtIndex (senderId, createdAt)
  - receiver GSI: ReceiverCreatedAtIndex (receiverId, createdAt)

## Important Note About Existing Message Table

If chat_messages already exists with old key schema (messageId as primary key), DynamoDB cannot change primary key in-place.
In that case:

1. Create a new table name (for example chat_messages_v2) in env.
2. Run provisioning script again.
3. Migrate old data if needed.
