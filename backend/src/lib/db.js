import { assertDynamoConfig, validateDynamoTables } from "./dynamodb.js";

export const connectDB = async () => {
  try {
    assertDynamoConfig();
    await validateDynamoTables();
    console.log("DynamoDB connected and table checks passed");
  } catch (error) {
    console.error("Error connecting to DynamoDB:", error);
    process.exit(1); // 1 status code means fail, 0 means success
  }
};
