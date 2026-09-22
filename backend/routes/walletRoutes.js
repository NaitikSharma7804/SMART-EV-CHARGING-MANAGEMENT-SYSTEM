// backend/routes/walletRoutes.js
import express from 'express';
import { getWalletDetails, addMoneyToWallet } from '../controllers/walletController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all wallet routes
router.use(authenticate);

router.get('/', getWalletDetails);
router.post('/add-money', addMoneyToWallet);

export default router;
