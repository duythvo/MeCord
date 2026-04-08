import { randomUUID } from "crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ENV } from "../lib/env.js";
import { dynamoDb, queryAllItems } from "../lib/dynamodb.js";

const MESSAGES_TABLE = ENV.DYNAMODB_MESSAGES_TABLE;
const SENDER_GSI = ENV.DYNAMODB_MESSAGES_SENDER_GSI;
const RECEIVER_GSI = ENV.DYNAMODB_MESSAGES_RECEIVER_GSI;

const buildConversationId = (userAId, userBId) =>
  [String(userAId), String(userBId)].sort().join("#");

const normalizeMessage = (item) => {
  if (!item) return null;

  return {
    _id: item.messageId,
    messageId: item.messageId,
    senderId: item.senderId,
    receiverId: item.receiverId,
    text: item.text || "",
    image: item.image,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

const persistMessage = async (message) => {
  await dynamoDb.send(
    new PutCommand({
      TableName: MESSAGES_TABLE,
      Item: {
        messageId: message.messageId,
        conversationId: message.conversationId,
        sortKey: message.sortKey,
        senderId: message.senderId,
        receiverId: message.receiverId,
        text: message.text,
        image: message.image,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      },
    }),
  );
};

const sortByCreatedAt = (messages) =>
  messages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

const Message = {
  async create({ senderId, receiverId, text = "", image }) {
    const now = new Date().toISOString();
    const messageId = randomUUID();
    const message = {
      messageId,
      conversationId: buildConversationId(senderId, receiverId),
      sortKey: `${now}#${messageId}`,
      senderId: String(senderId),
      receiverId: String(receiverId),
      text,
      image,
      createdAt: now,
      updatedAt: now,
    };

    await persistMessage(message);
    return normalizeMessage(message);
  },

  async listConversation(userAId, userBId) {
    const conversationId = buildConversationId(userAId, userBId);

    const items = await queryAllItems({
      TableName: MESSAGES_TABLE,
      KeyConditionExpression: "conversationId = :conversationId",
      ExpressionAttributeValues: {
        ":conversationId": conversationId,
      },
    });

    return sortByCreatedAt(items.map(normalizeMessage));
  },

  async listByParticipant(userId) {
    const normalizedUserId = String(userId);

    const [asSender, asReceiver] = await Promise.all([
      queryAllItems({
        TableName: MESSAGES_TABLE,
        IndexName: SENDER_GSI,
        KeyConditionExpression: "senderId = :userId",
        ExpressionAttributeValues: {
          ":userId": normalizedUserId,
        },
      }),
      queryAllItems({
        TableName: MESSAGES_TABLE,
        IndexName: RECEIVER_GSI,
        KeyConditionExpression: "receiverId = :userId",
        ExpressionAttributeValues: {
          ":userId": normalizedUserId,
        },
      }),
    ]);

    const messageMap = new Map();
    [...asSender, ...asReceiver].forEach((item) => {
      messageMap.set(item.messageId, normalizeMessage(item));
    });

    return sortByCreatedAt(Array.from(messageMap.values()));
  },
};

export default Message;
