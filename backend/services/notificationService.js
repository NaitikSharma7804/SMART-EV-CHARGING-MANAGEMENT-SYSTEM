// backend/services/notificationService.js
import pool from '../config/db.js';

export const sendNotification = async (userId, title, message, type = 'system') => {
    try {
        if (!userId) return;
        const [result] = await pool.query(
            'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, FALSE)',
            [userId, title, message, type]
        );
        return result;
    } catch (error) {
        console.error('Notification Service Error:', error.message);
    }
};