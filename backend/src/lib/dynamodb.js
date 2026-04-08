import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { ENV } from "./env.js";

const requiredAwsConfig = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "DYNAMODB_MESSAGES_TABLE",
  "DYNAMODB_USERS_TABLE",
  "DYNAMODB_USERS_EMAIL_GSI",
  "DYNAMODB_MESSAGES_SENDER_GSI",
  "DYNAMODB_MESSAGES_RECEIVER_GSI",
];

export const assertDynamoConfig = () => {
  const missing = requiredAwsConfig.filter((key) => !ENV[key]);
  if (missing.length) {
    throw new Error(
      `Missing required DynamoDB env variables: ${missing.join(", ")}`,
    );
  }
};

const dynamoClient = new DynamoDBClient({
  region: ENV.AWS_REGION,
  credentials: {
    accessKeyId: ENV.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const dynamoDb = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const validateDynamoTables = async () => {
  const [usersTable, messagesTable] = await Promise.all([
    dynamoDb.send(
      new DescribeTableCommand({ TableName: ENV.DYNAMODB_USERS_TABLE }),
    ),
    dynamoDb.send(
      new DescribeTableCommand({ TableName: ENV.DYNAMODB_MESSAGES_TABLE }),
    ),
  ]);

  const usersGSIs = new Set(
    (usersTable.Table?.GlobalSecondaryIndexes || []).map(
      (index) => index.IndexName,
    ),
  );
  const messagesGSIs = new Set(
    (messagesTable.Table?.GlobalSecondaryIndexes || []).map(
      (index) => index.IndexName,
    ),
  );

  if (!usersGSIs.has(ENV.DYNAMODB_USERS_EMAIL_GSI)) {
    throw new Error(
      `Missing required users GSI: ${ENV.DYNAMODB_USERS_EMAIL_GSI}. Run npm run dynamodb:init in backend to provision schema.`,
    );
  }

  if (!messagesGSIs.has(ENV.DYNAMODB_MESSAGES_SENDER_GSI)) {
    throw new Error(
      `Missing required messages GSI: ${ENV.DYNAMODB_MESSAGES_SENDER_GSI}. Run npm run dynamodb:init in backend to provision schema.`,
    );
  }

  if (!messagesGSIs.has(ENV.DYNAMODB_MESSAGES_RECEIVER_GSI)) {
    throw new Error(
      `Missing required messages GSI: ${ENV.DYNAMODB_MESSAGES_RECEIVER_GSI}. Run npm run dynamodb:init in backend to provision schema.`,
    );
  }
};

export const queryAllItems = async (queryInput) => {
  const items = [];
  let lastEvaluatedKey;

  do {
    const response = await dynamoDb.send(
      new QueryCommand({
        ...queryInput,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    if (response.Items?.length) {
      items.push(...response.Items);
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
};

export const scanAllItems = async ({
  tableName,
  filterExpression,
  expressionAttributeValues,
}) => {
  const items = [];
  let lastEvaluatedKey;

  do {
    const response = await dynamoDb.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    if (response.Items?.length) {
      items.push(...response.Items);
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
};
