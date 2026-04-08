import "dotenv/config";
import {
  BillingMode,
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import { ENV } from "../lib/env.js";

const client = new DynamoDBClient({
  region: ENV.AWS_REGION,
  credentials: {
    accessKeyId: ENV.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY || "",
  },
});

const ensureTable = async ({ tableName, createInput }) => {
  try {
    const existing = await client.send(
      new DescribeTableCommand({ TableName: tableName }),
    );

    const currentKeySchema = (existing.Table?.KeySchema || [])
      .map((item) => `${item.AttributeName}:${item.KeyType}`)
      .sort()
      .join(",");
    const expectedKeySchema = (createInput.KeySchema || [])
      .map((item) => `${item.AttributeName}:${item.KeyType}`)
      .sort()
      .join(",");

    const currentGsis = new Set(
      (existing.Table?.GlobalSecondaryIndexes || []).map(
        (gsi) => gsi.IndexName,
      ),
    );
    const expectedGsis = (createInput.GlobalSecondaryIndexes || []).map(
      (gsi) => gsi.IndexName,
    );
    const missingGsis = expectedGsis.filter(
      (gsiName) => !currentGsis.has(gsiName),
    );

    if (currentKeySchema !== expectedKeySchema || missingGsis.length > 0) {
      throw new Error(
        `Table ${tableName} exists but schema does not match expected shape. Missing GSIs: ${missingGsis.join(", ") || "none"}. Existing key schema: ${currentKeySchema}. Expected key schema: ${expectedKeySchema}.`,
      );
    }

    console.log(`Table ${tableName} already exists`);
    return;
  } catch (error) {
    if (error.name !== "ResourceNotFoundException") {
      throw error;
    }
  }

  await client.send(new CreateTableCommand(createInput));
  await waitUntilTableExists(
    { client, maxWaitTime: 120 },
    { TableName: tableName },
  );
  console.log(`Created table ${tableName}`);
};

const ensureUsersTable = async () => {
  const tableName = ENV.DYNAMODB_USERS_TABLE;

  await ensureTable({
    tableName,
    createInput: {
      TableName: tableName,
      BillingMode: BillingMode.PAY_PER_REQUEST,
      AttributeDefinitions: [
        { AttributeName: "userId", AttributeType: "S" },
        { AttributeName: "email", AttributeType: "S" },
      ],
      KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
      GlobalSecondaryIndexes: [
        {
          IndexName: ENV.DYNAMODB_USERS_EMAIL_GSI,
          KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    },
  });
};

const ensureMessagesTable = async () => {
  const tableName = ENV.DYNAMODB_MESSAGES_TABLE;

  await ensureTable({
    tableName,
    createInput: {
      TableName: tableName,
      BillingMode: BillingMode.PAY_PER_REQUEST,
      AttributeDefinitions: [
        { AttributeName: "conversationId", AttributeType: "S" },
        { AttributeName: "sortKey", AttributeType: "S" },
        { AttributeName: "senderId", AttributeType: "S" },
        { AttributeName: "receiverId", AttributeType: "S" },
        { AttributeName: "createdAt", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "conversationId", KeyType: "HASH" },
        { AttributeName: "sortKey", KeyType: "RANGE" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: ENV.DYNAMODB_MESSAGES_SENDER_GSI,
          KeySchema: [
            { AttributeName: "senderId", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: ENV.DYNAMODB_MESSAGES_RECEIVER_GSI,
          KeySchema: [
            { AttributeName: "receiverId", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    },
  });
};

const required = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "DYNAMODB_USERS_TABLE",
  "DYNAMODB_USERS_EMAIL_GSI",
  "DYNAMODB_MESSAGES_TABLE",
  "DYNAMODB_MESSAGES_SENDER_GSI",
  "DYNAMODB_MESSAGES_RECEIVER_GSI",
];

const missing = required.filter((key) => !ENV[key]);
if (missing.length) {
  throw new Error(
    `Missing required env for table setup: ${missing.join(", ")}`,
  );
}

await ensureUsersTable();
await ensureMessagesTable();

console.log("DynamoDB tables and GSIs are ready");
