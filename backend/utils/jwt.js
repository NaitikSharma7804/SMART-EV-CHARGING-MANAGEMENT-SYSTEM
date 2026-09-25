// backend/utils/jwt.js
import jwt from 'jsonwebtoken';

const DEV_FALLBACK_SECRET = 'dev_jwt_secret_fallback_ev_charge_hub';

export const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') => {
    return jwt.sign(payload, process.env.JWT_SECRET || DEV_FALLBACK_SECRET, { expiresIn });
};

export const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET || DEV_FALLBACK_SECRET);
};