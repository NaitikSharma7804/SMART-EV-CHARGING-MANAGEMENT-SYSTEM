// backend/controllers/walletController.js
import pool from '../config/db.js';

/**
 * Format a Date object or date string into human-friendly "18 Sep" format
 */
function formatTransactionDate(dateInput) {
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return 'Recently';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = d.getDate();
        const month = months[d.getMonth()];
        return `${day} ${month}`;
    } catch (e) {
        return 'Recently';
    }
}

/**
 * GET /api/wallet
 * Returns current user's wallet balance and transaction history
 */
export const getWalletDetails = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        // 1. Fetch user wallet balance
        const [users] = await pool.query(
            'SELECT id, name, email, wallet_balance FROM users WHERE id = ? LIMIT 1',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const balanceNum = parseFloat(users[0].wallet_balance ?? 850.00);

        // 2. Fetch wallet transactions
        const [transactions] = await pool.query(
            `SELECT id, type, amount, station_id, station_name, description, payment_method, status, created_at
             FROM wallet_transactions
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 50`,
            [userId]
        );

        const formattedTransactions = transactions.map(tx => {
            const amt = parseFloat(tx.amount);
            return {
                id: tx.id,
                type: tx.type, // 'credit' or 'debit'
                amount: amt,
                formatted_amount: `₹${amt.toFixed(0)}`,
                display_date: formatTransactionDate(tx.created_at),
                station_name: tx.station_name || (tx.type === 'credit' ? 'Wallet Top-up' : 'Charging Station'),
                description: tx.description,
                payment_method: tx.payment_method || 'UPI',
                status: tx.status || 'success',
                raw_date: tx.created_at
            };
        });

        return res.status(200).json({
            success: true,
            balance: balanceNum,
            formatted_balance: `₹${balanceNum.toFixed(0)}`,
            transactions: formattedTransactions,
            count: formattedTransactions.length
        });
    } catch (error) {
        console.error('getWalletDetails error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve wallet details.',
            error: error.message
        });
    }
};

/**
 * POST /api/wallet/add-money
 * Top up the user's EV Wallet
 */
export const addMoneyToWallet = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const amountInput = parseFloat(req.body.amount);
        if (!amountInput || isNaN(amountInput) || amountInput <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid top-up amount greater than ₹0.'
            });
        }

        const paymentMethod = String(req.body.payment_method || 'UPI').trim();
        const description = req.body.description || `Wallet Top-up via ${paymentMethod}`;

        // 1. Credit wallet balance
        await pool.query(
            'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE id = ?',
            [amountInput, userId]
        );

        // 2. Insert transaction record
        const [txResult] = await pool.query(
            `INSERT INTO wallet_transactions (user_id, type, amount, station_id, station_name, description, payment_method, status)
             VALUES (?, 'credit', ?, NULL, NULL, ?, ?, 'success')`,
            [userId, amountInput, description, paymentMethod]
        );

        // 3. Fetch new balance
        const [users] = await pool.query('SELECT wallet_balance FROM users WHERE id = ? LIMIT 1', [userId]);
        const newBalance = parseFloat(users[0]?.wallet_balance || 0);

        // 4. In-app notification
        try {
            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type, is_read)
                 VALUES (?, '💳 Wallet Top-up Successful', ?, 'payment', 0)`,
                [
                    userId,
                    `₹${amountInput.toFixed(0)} added to your EV Wallet via ${paymentMethod}. New balance: ₹${newBalance.toFixed(0)}.`
                ]
            );
        } catch (nErr) {
            console.warn('Notification log error:', nErr.message);
        }

        return res.status(200).json({
            success: true,
            message: `₹${amountInput.toFixed(0)} added to your wallet successfully!`,
            balance: newBalance,
            formatted_balance: `₹${newBalance.toFixed(0)}`,
            transaction: {
                id: txResult.insertId,
                type: 'credit',
                amount: amountInput,
                formatted_amount: `₹${amountInput.toFixed(0)}`,
                display_date: 'Today',
                station_name: 'Wallet Top-up',
                description,
                payment_method: paymentMethod,
                status: 'success'
            }
        });
    } catch (error) {
        console.error('addMoneyToWallet error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to add money to wallet.',
            error: error.message
        });
    }
};
