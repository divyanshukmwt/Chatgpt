const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

/* Routes */
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require("./routes/chat.routes");

const app = express();

/* 🔥 REQUIRED FOR RENDER + SECURE COOKIES */
app.set("trust proxy", 1);

/* ✅ CORS (PROD + DEV SAFE) */
const allowedOrigins = [
    "http://localhost:5173",
    "https://chatgpt-one-liart.vercel.app"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

/* Routes */
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

/* SPA fallback */
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
