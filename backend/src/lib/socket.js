import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL],
    credentials: true,
  },
});

// apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

// we will use this function to check if the user is online or not
export function getReceiverSocketId(userId) {
  const sockets = userSocketMap.get(String(userId));
  if (!sockets || sockets.size === 0) return null;
  return Array.from(sockets)[0];
}

const getOnlineUserIds = () => Array.from(userSocketMap.keys());

// this is for storing online users and all their active sockets
const userSocketMap = new Map(); // { userId: Set<socketId> }

export function forceLogoutUser(
  userId,
  reason = "Logged in from another device",
) {
  const normalizedUserId = String(userId);
  const socketIds = userSocketMap.get(normalizedUserId);
  if (!socketIds || socketIds.size === 0) return;

  for (const socketId of socketIds) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;

    socket.emit("forceLogout", { message: reason });
    socket.disconnect(true);
  }

  userSocketMap.delete(normalizedUserId);
  io.emit("getOnlineUsers", getOnlineUserIds());
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.user.fullName);

  const userId = socket.userId;
  const sockets = userSocketMap.get(userId) || new Set();
  sockets.add(socket.id);
  userSocketMap.set(userId, sockets);

  // io.emit() is used to send events to all connected clients
  io.emit("getOnlineUsers", getOnlineUserIds());

  // with socket.on we listen for events from clients
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.user.fullName);

    const currentSockets = userSocketMap.get(userId);
    if (currentSockets) {
      currentSockets.delete(socket.id);

      if (currentSockets.size === 0) {
        userSocketMap.delete(userId);
      } else {
        userSocketMap.set(userId, currentSockets);
      }
    }

    io.emit("getOnlineUsers", getOnlineUserIds());
  });
});

export { io, app, server };
