import { randomUUID } from "crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ENV } from "../lib/env.js";
import { dynamoDb, queryAllItems, scanAllItems } from "../lib/dynamodb.js";

const USERS_TABLE = ENV.DYNAMODB_USERS_TABLE;
const USERS_EMAIL_GSI = ENV.DYNAMODB_USERS_EMAIL_GSI;

const toPublicUser = (user) => {
  if (!user) return null;

  const { password, sessionId, ...rest } = user;
  return rest;
};

const normalizeUser = (item) => {
  if (!item) return null;

  return {
    _id: item.userId,
    userId: item.userId,
    fullName: item.fullName,
    email: item.email,
    password: item.password,
    sessionId: item.sessionId || null,
    profilePic: item.profilePic || "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

const persistUser = async (user) => {
  await dynamoDb.send(
    new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        password: user.password,
        sessionId: user.sessionId || null,
        profilePic: user.profilePic,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    }),
  );
};

const User = {
  async findByEmail(email) {
    const users = await queryAllItems({
      TableName: USERS_TABLE,
      IndexName: USERS_EMAIL_GSI,
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
    });

    return normalizeUser(users[0]);
  },

  async create({
    fullName,
    email,
    password,
    profilePic = "",
    sessionId = null,
  }) {
    const now = new Date().toISOString();
    const user = {
      userId: randomUUID(),
      fullName,
      email,
      password,
      sessionId,
      profilePic,
      createdAt: now,
      updatedAt: now,
    };

    await persistUser(user);
    return normalizeUser(user);
  },

  async findById(userId, { includePassword = true } = {}) {
    const users = await queryAllItems({
      TableName: USERS_TABLE,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    });

    const user = normalizeUser(users[0]);
    if (!includePassword) return toPublicUser(user);

    return user;
  },

  async updateProfilePic(userId, profilePic) {
    const existingUser = await this.findById(userId);
    if (!existingUser) return null;

    const updatedUser = {
      ...existingUser,
      userId: existingUser._id,
      profilePic,
      updatedAt: new Date().toISOString(),
    };

    await persistUser(updatedUser);
    return toPublicUser(normalizeUser(updatedUser));
  },

  async setSession(userId, sessionId) {
    const existingUser = await this.findById(userId);
    if (!existingUser) return null;

    const updatedUser = {
      ...existingUser,
      userId: existingUser._id,
      sessionId,
      updatedAt: new Date().toISOString(),
    };

    await persistUser(updatedUser);
    return normalizeUser(updatedUser);
  },

  async clearSession(userId, expectedSessionId = null) {
    const existingUser = await this.findById(userId);
    if (!existingUser) return null;

    if (expectedSessionId && existingUser.sessionId !== expectedSessionId) {
      return null;
    }

    const updatedUser = {
      ...existingUser,
      userId: existingUser._id,
      sessionId: null,
      updatedAt: new Date().toISOString(),
    };

    await persistUser(updatedUser);
    return normalizeUser(updatedUser);
  },

  async existsById(userId) {
    const user = await this.findById(userId, { includePassword: false });
    return Boolean(user);
  },

  async listContactsExcluding(userId) {
    const users = await scanAllItems({
      tableName: USERS_TABLE,
      filterExpression: "userId <> :userId",
      expressionAttributeValues: {
        ":userId": userId,
      },
    });

    return users.map((item) => toPublicUser(normalizeUser(item)));
  },

  async listByIds(userIds = []) {
    if (!userIds.length) return [];

    const users = await scanAllItems({ tableName: USERS_TABLE });
    const idSet = new Set(userIds.map(String));

    return users
      .map(normalizeUser)
      .filter((user) => idSet.has(String(user._id)))
      .map(toPublicUser);
  },
};

export default User;
