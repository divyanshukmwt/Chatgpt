const userModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,        // REQUIRED (HTTPS)
    sameSite: "None",    // REQUIRED (cross-site)
};

async function registerUser(req, res) {
    try {
        const { fullName: { firstName, lastName }, email, password } = req.body;

        const isUserAlreadyExists = await userModel.findOne({ email });
        if (isUserAlreadyExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashPassword = await bcrypt.hash(password, 10);

        const user = await userModel.create({
            fullName: { firstName, lastName },
            email,
            password: hashPassword
        });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,        // REQUIRED on HTTPS (Vercel)
            sameSite: "none"     // REQUIRED for cross-site cookies
        });


        res.status(201).json({
            message: "User registered successfully",
            user: {
                email: user.email,
                _id: user._id,
                fullName: user.fullName
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Registration failed" });
    }
}

async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,        // REQUIRED on HTTPS (Vercel)
            sameSite: "none"     // REQUIRED for cross-site cookies
        });


        res.status(200).json({
            message: "User logged in successfully",
            user: {
                email: user.email,
                _id: user._id,
                fullName: user.fullName
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Login failed" });
    }
}

module.exports = {
    registerUser,
    loginUser
};
