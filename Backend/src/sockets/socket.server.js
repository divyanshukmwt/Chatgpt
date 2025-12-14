const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../services/ai.service");
const messageModel = require("../models/message.model");
const { createMemory, queryMemory } = require("../services/vector.service");

const allowedOrigins = [
    "http://localhost:5173",
    "https://chatgpt-one-liart.vercel.app"
];

function initSocketServer(httpServer) {

    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        try {
            const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
            if (!cookies.token) {
                return next(new Error("Authentication error"));
            }

            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
            const user = await userModel.findById(decoded.id);

            if (!user) {
                return next(new Error("Authentication error"));
            }

            socket.user = user;
            next();

        } catch (err) {
            console.error("SOCKET AUTH ERROR:", err.message);
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.user._id);

        socket.on("ai-message", async (messagePayload) => {
            try {
                const message = await messageModel.create({
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    content: messagePayload.content,
                    role: "user"
                });

                const response = await aiService.generateResponse([
                    { role: "user", parts: [{ text: messagePayload.content }] }
                ]);

                socket.emit("ai-response", {
                    content: response,
                    chat: messagePayload.chat
                });

            } catch (err) {
                console.error(err);
                socket.emit("ai-response", {
                    content: "Something went wrong",
                    chat: messagePayload.chat
                });
            }
        });
    });
}

module.exports = initSocketServer;
