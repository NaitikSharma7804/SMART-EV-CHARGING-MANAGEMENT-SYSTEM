import express from 'express';
import jwt from 'jsonwebtoken';
import { handleChat, validateApiKey } from '../controllers/chatController.js';

const router = express.Router();

// Optional authentication middleware: attaches req.user if token is present
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token && process.env.JWT_SECRET) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded;
            }
        }
    } catch (err) {
        // Continue as guest session if token is invalid or expired
    }
    next();
};

router.post('/', optionalAuth, handleChat);
router.post('/validate-key', validateApiKey);

export default router;