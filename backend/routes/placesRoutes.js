// backend/routes/placesRoutes.js

import express from 'express';

import * as placesController
    from '../controllers/placesController.js';


const router = express.Router();


// ============================================================
// SEARCH PLACES
// GET /api/places/search
//
// Example:
// /api/places/search?query=cafe&lat=18.52&lng=73.85
// ============================================================

router.get(
    '/search',
    placesController.searchPlaces
);


// ============================================================
// AUTOCOMPLETE PLACES
// GET /api/places/autocomplete
//
// Example:
// /api/places/autocomplete?input=cafe&lat=18.52&lng=73.85
// ============================================================

router.get(
    '/autocomplete',
    placesController.autocompletePlaces
);


// ============================================================
// NEARBY PLACES FOR CHARGING STATION
// GET /api/places/nearby
//
// Example:
// /api/places/nearby?station_id=1
//
// Optional:
// ?station_id=1&radius=5000&category=eat
//
// Categories currently supported by the service:
// all
// eat
// stay
// relax
// shop
// essentials
// ============================================================

router.get(
    '/nearby',
    placesController.getNearbyPlacesForStation
);


export default router;