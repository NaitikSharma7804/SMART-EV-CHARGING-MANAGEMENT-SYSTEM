import express from 'express';

import {
    getStations,
    getStationById,
    getStationAvailability,
    getFavoriteStations,
    getFavoriteStationIds,
    addFavoriteStation,
    removeFavoriteStation,
    getSmartRecommendations
} from '../controllers/stationController.js';
import { createMaintenanceTicket } from '../controllers/maintenanceController.js';

import authenticate, { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();


// GET /api/stations
router.get(
    '/',
    getStations
);

// -------------------------------------------------------------
// FEATURE 18: MAINTENANCE & PROBLEM REPORTING
// -------------------------------------------------------------
router.post('/report-problem', optionalAuth, createMaintenanceTicket);
router.post('/:id/report-problem', optionalAuth, createMaintenanceTicket);


// -------------------------------------------------------------
// SMART STATION RECOMMENDATIONS (Must be before /:id)
// -------------------------------------------------------------
// GET /api/stations/recommendations
router.get(
    '/recommendations',
    optionalAuth,
    getSmartRecommendations
);

// -------------------------------------------------------------
// FAVORITE STATIONS (Must be before /:id)
// -------------------------------------------------------------

// GET /api/stations/favorites
router.get(
    '/favorites',
    authenticate,
    getFavoriteStations
);

// GET /api/stations/favorites/ids
router.get(
    '/favorites/ids',
    authenticate,
    getFavoriteStationIds
);

// POST /api/stations/favorites/:id
router.post(
    '/favorites/:id',
    authenticate,
    addFavoriteStation
);

// DELETE /api/stations/favorites/:id
router.delete(
    '/favorites/:id',
    authenticate,
    removeFavoriteStation
);


// GET /api/stations/:id
router.get(
    '/:id',
    getStationById
);


// GET /api/stations/:id/availability
router.get(
    '/:id/availability',
    getStationAvailability
);

export default router;