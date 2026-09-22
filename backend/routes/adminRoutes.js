// backend/routes/adminRoutes.js
import express from 'express';
import * as adminController from '../controllers/adminController.js';
import * as maintenanceController from '../controllers/maintenanceController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { syncRealStations } from '../services/ocmService.js';

const router = express.Router();

// Protect all routes: Must be logged in AND have 'ADMIN' role
router.use(authenticate, authorize(['ADMIN']));

// 1. Dashboard Analytics
router.get('/dashboard', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalyticsData);

// 2. Station Management
router.get('/stations', adminController.getAllStations);
router.post('/stations', adminController.addStation);
router.put('/stations/:id', adminController.updateStation);
router.put('/stations/:id/status', adminController.updateStationStatus);
router.delete('/stations/:id', adminController.deleteStation);

// 3. Charger Management
router.get('/stations/:id/chargers', adminController.getStationChargers);
router.post('/stations/:id/chargers', adminController.addStationCharger);
router.put('/chargers/:chargerId', adminController.updateCharger);
router.delete('/chargers/:chargerId', adminController.deleteCharger);

// 4. Station Specific Bookings
router.get('/stations/:id/bookings', adminController.getStationBookings);

// 5. Open Charge Map Sync
router.post('/sync-stations', async (req, res) => {
    try {
        const { lat, lng, distance } = req.body;
        const result = await syncRealStations(lat || 18.5204, lng || 73.8567, distance || 25);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. Users Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/status', adminController.updateUserStatus);

// 7. Global Bookings
router.get('/bookings', adminController.getAllBookings);

// 8. Maintenance Tickets (Feature 18)
router.get('/maintenance-tickets', maintenanceController.getMaintenanceTickets);
router.put('/maintenance-tickets/:id/assign', maintenanceController.assignMaintenanceTicket);
router.put('/maintenance-tickets/:id/resolve', maintenanceController.resolveMaintenanceTicket);
router.put('/maintenance-tickets/:id/status', maintenanceController.updateTicketStatus);

export default router;