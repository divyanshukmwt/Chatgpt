const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../services/ai.service");
const messageModel = require("../models/message.model");
const { createMemory, queryMemory } = require("../services/vector.service");

function initSocketServer(httpServer) {

    const io = new Server(httpServer, {
        cors: {
            origin: ["http://localhost:5173",
                "https://chatgpt-one-liart.vercel.app/"],
            credentials: true
        }
    });

    /* =======================
       SOCKET AUTH MIDDLEWARE
       ======================= */
    io.use(async (socket, next) => {
        try {
            const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

            if (!cookies.token) {
                return next(new Error("Authentication error: No token provided"));
            }

            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);

            const user = await userModel.findById(decoded.id);
            if (!user) {
                return next(new Error("Authentication error: User not found"));
            }

            socket.user = user;
            next();

        } catch (err) {
            console.error("SOCKET AUTH ERROR:", err.message);
            return next(new Error("Authentication error"));
        }
    });

    /* =======================
       SOCKET CONNECTION
       ======================= */
    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.user._id);

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.user._id);
        });

        /* =======================
           AI MESSAGE HANDLER
           ======================= */
        socket.on("ai-message", async (messagePayload) => {
            try {
                /* messagePayload = { chat: chatId, content: messageText } */

                const [ message, vectors ] = await Promise.all([
                    messageModel.create({
                        chat: messagePayload.chat,
                        user: socket.user._id,
                        content: messagePayload.content,
                        role: "user"
                    }),
                    aiService.generateVector(messagePayload.content),
                ]);

                await createMemory({
                    vectors,
                    messageId: message._id,
                    metadata: {
                        chat: messagePayload.chat,
                        user: socket.user._id,
                        text: messagePayload.content
                    }
                });

                const [ memory, chatHistory ] = await Promise.all([
                    queryMemory({
                        queryVector: vectors,
                        limit: 3,
                        metadata: {
                            user: socket.user._id
                        }
                    }),
                    messageModel
                        .find({ chat: messagePayload.chat })
                        .sort({ createdAt: -1 })
                        .limit(20)
                        .lean()
                        .then(messages => messages.reverse())
                ]);

                const stm = chatHistory.map(item => ({
                    role: item.role,
                    parts: [{ text: item.content }]
                }));

                const ltm = [
                    {
                        role: "user",
                        parts: [{
                            text: `
These are some previous messages from the chat.
Use them to generate a better response:

${memory.map(item => item.metadata.text).join("\n")}
                            `
                        }]
                    }
                ];

                const response = await aiService.generateResponse([ ...ltm, ...stm ]);

                socket.emit("ai-response", {
                    content: response,
                    chat: messagePayload.chat
                });

                const [ responseMessage, responseVectors ] = await Promise.all([
                    messageModel.create({
                        chat: messagePayload.chat,
                        user: socket.user._id,
                        content: response,
                        role: "model"
                    }),
                    aiService.generateVector(response)
                ]);

                await createMemory({
                    vectors: responseVectors,
                    messageId: responseMessage._id,
                    metadata: {
                        chat: messagePayload.chat,
                        user: socket.user._id,
                        text: response
                    }
                });

            } catch (err) {
                console.error("AI MESSAGE ERROR:", err.message);
                socket.emit("ai-response", {
                    content: "Something went wrong. Please try again.",
                    chat: messagePayload.chat
                });
            }
        });
    });
}

module.exports = initSocketServer;
