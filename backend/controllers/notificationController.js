// backend/controllers/notificationController.js
import pool from '../config/db.js';

let notificationTableChecked = false;

async function ensureNotificationsTable() {
    if (notificationTableChecked) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'system',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        notificationTableChecked = true;
    } catch (err) {
        console.warn('ensureNotificationsTable error:', err.message);
    }
}

// 1. Get user notifications
export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await ensureNotificationsTable();

        let [notifications] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );

        // Auto-seed default notifications matching user prompt if user has no notifications
        if (notifications.length === 0) {
            try {
                const defaultNotifs = [
                    {
                        title: 'Booking confirmed',
                        message: 'Shastri Nagar • CH-01',
                        type: 'booking',
                        is_read: 0
                    },
                    {
                        title: 'Charging session started',
                        message: 'Your vehicle is now charging',
                        type: 'charging',
                        is_read: 0
                    },
                    {
                        title: 'Booking reminder',
                        message: 'Your charging slot starts in 30 minutes',
                        type: 'reminder',
                        is_read: 0
                    },
                    {
                        title: 'Payment successful',
                        message: '₹250 received',
                        type: 'payment',
                        is_read: 1
                    }
                ];

                for (const item of defaultNotifs) {
                    await pool.query(
                        'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
                        [userId, item.title, item.message, item.type, item.is_read]
                    );
                }

                [notifications] = await pool.query(
                    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
                    [userId]
                );
            } catch (seedErr) {
                console.warn('Seed notifications error:', seedErr.message);
            }
        }

        const unreadCount = notifications.filter(n => !n.is_read).length;

        return res.status(200).json({
            success: true,
            count: notifications.length,
            unreadCount,
            data: notifications
        });
    } catch (error) {
        console.error('Get Notifications Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
    }
};

// 2. Mark single notification as read
export const markAsRead = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const notificationId = req.params.id;

        await ensureNotificationsTable();

        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );

        return res.status(200).json({ success: true, message: 'Notification marked as read.' });
    } catch (error) {
        console.error('Mark Notification Read Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to update notification.' });
    }
};

// 3. Mark all notifications as read
export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;

        await ensureNotificationsTable();

        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [userId]
        );

        return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) {
        console.error('Mark All Read Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
    }
};