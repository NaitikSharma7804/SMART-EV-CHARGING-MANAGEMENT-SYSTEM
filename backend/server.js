// backend/server.js
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// 1. Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

// 2. Set Socket.IO instance in app
app.set('io', io);

// Socket.IO connection events
io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Frontend can join a specific station room
    socket.on('joinStationRoom', (stationId) => {
        socket.join(`station_${stationId}`);
        console.log(`Client ${socket.id} joined room: station_${stationId}`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// 3. Import Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import stationRoutes from './routes/stationRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import placesRoutes from './routes/placesRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import walletRoutes from './routes/walletRoutes.js';

// 4. Security & Utility Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// 5. Health Check Route
const healthCheck = (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'EV Charge Hub API is running'
    });
};
app.get('/api/health', healthCheck);
app.get('/health', healthCheck);

// 6. Mount Routes (supports both /api/* and /* for serverless rewrites)
const routeList = [
    ['/auth', authRoutes],
    ['/users', userRoutes],
    ['/vehicles', vehicleRoutes],
    ['/stations', stationRoutes],
    ['/bookings', bookingRoutes],
    ['/places', placesRoutes],
    ['/notifications', notificationRoutes],
    ['/reviews', reviewRoutes],
    ['/admin', adminRoutes],
    ['/chat', chatRoutes],
    ['/wallet', walletRoutes],
];

routeList.forEach(([routePath, router]) => {
    app.use('/api' + routePath, router);
    app.use(routePath, router);
});

// 7. Start Server (Only when run directly or in non-serverless dev)
const PORT = process.env.PORT || 5000;

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n⚠️  Port ${PORT} is already in use! Another server or process is already running on this port.`);
        console.error(`💡 Tip: Run 'taskkill /F /IM node.exe' or 'Stop-Process -Name node -Force' in PowerShell to clear it, or set PORT=5001 in .env\n`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});

if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

export default app;
export { app, server, io };