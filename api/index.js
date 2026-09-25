// api/index.js - Vercel Serverless Function entrypoint
import app from '../backend/server.js';

export default function handler(req, res) {
    return app(req, res);
}
