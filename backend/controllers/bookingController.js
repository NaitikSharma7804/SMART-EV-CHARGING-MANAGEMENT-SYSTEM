// ============================================================
// EV CHARGE HUB
// BOOKING CONTROLLER
// ============================================================

import pool from '../config/db.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { sendNotification } from '../services/notificationService.js';


// ============================================================
// RAZORPAY
// ============================================================

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


// ============================================================
// HELPERS
// ============================================================

function normalizeTime(time) {

    if (!time) {
        return null;
    }

    if (typeof time === 'string') {
        return time.substring(0, 8);
    }

    if (time instanceof Date) {
        return time.toTimeString().substring(0, 8);
    }

    return String(time).substring(0, 8);
}


function normalizeDate(date) {

    if (!date) {
        return null;
    }

    if (typeof date === 'string') {
        return date.substring(0, 10);
    }

    if (date instanceof Date) {

        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, '0');

        const day = String(
            date.getDate()
        ).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    return String(date).substring(0, 10);
}


function getDateTime(
    bookingDate,
    time
) {

    const date = normalizeDate(bookingDate);
    const normalizedTime = normalizeTime(time);

    if (!date || !normalizedTime) {
        return null;
    }

    const result = new Date(
        `${date}T${normalizedTime}`
    );

    if (Number.isNaN(result.getTime())) {
        return null;
    }

    return result;
}


function minutesFromTime(time) {

    if (!time) {
        return NaN;
    }

    const parts = String(time)
        .substring(0, 5)
        .split(':')
        .map(Number);

    if (
        parts.length !== 2 ||
        Number.isNaN(parts[0]) ||
        Number.isNaN(parts[1])
    ) {
        return NaN;
    }

    return (
        parts[0] * 60 +
        parts[1]
    );
}


function isValidDateString(date) {

    if (!date) {
        return false;
    }

    const value = String(date);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsed = new Date(
        `${value}T00:00:00`
    );

    return !Number.isNaN(
        parsed.getTime()
    );
}


// ============================================================
// EFFECTIVE BOOKING STATUS
// ============================================================

function getEffectiveStatus(
    booking
) {

    const originalStatus =
        String(
            booking.status || ''
        ).trim();

    // --------------------------------------------------------
    // CANCELLED MUST NEVER BECOME COMPLETED
    // --------------------------------------------------------

    if (
        originalStatus.toLowerCase() ===
        'cancelled'
    ) {
        return 'Cancelled';
    }


    // --------------------------------------------------------
    // ALREADY COMPLETED
    // --------------------------------------------------------

    if (
        originalStatus.toLowerCase() ===
        'completed'
    ) {
        return 'Completed';
    }


    // --------------------------------------------------------
    // CHECK END TIME
    // --------------------------------------------------------

    const startDateTime =
        getDateTime(
            booking.booking_date,
            booking.start_time
        );

    const endDateTime =
        getDateTime(
            booking.booking_date,
            booking.end_time
        );


    if (
        startDateTime &&
        endDateTime
    ) {

        // Overnight booking
        if (
            endDateTime <
            startDateTime
        ) {

            endDateTime.setDate(
                endDateTime.getDate() + 1
            );
        }


        if (
            endDateTime <= new Date()
        ) {

            return 'Completed';
        }
    }


    // --------------------------------------------------------
    // ACTIVE
    // --------------------------------------------------------

    if (
        originalStatus.toLowerCase() ===
        'active'
    ) {
        return 'Active';
    }


    // --------------------------------------------------------
    // CONFIRMED
    // --------------------------------------------------------

    if (
        originalStatus.toLowerCase() ===
        'confirmed'
    ) {
        return 'Upcoming';
    }


    // --------------------------------------------------------
    // PENDING
    // --------------------------------------------------------

    if (
        originalStatus.toLowerCase() ===
        'pending'
    ) {
        return 'Pending';
    }


    return originalStatus || 'Pending';
}


// ============================================================
// CREATE BOOKING
// POST /api/bookings
// ============================================================

export const createBooking = async (
    req,
    res
) => {

    const {

        vehicle_id,

        station_id,

        charger_id,

        slot_id,

        booking_date,

        start_time,

        end_time,

        amount

    } = req.body;


    // --------------------------------------------------------
    // AUTHENTICATED USER
    // --------------------------------------------------------

    const userId =
        req.user?.id ||
        req.user?.userId;


    if (!userId) {

        return res.status(401).json({

            success: false,

            message:
                'Authentication required.'

        });
    }


    // --------------------------------------------------------
    // REQUIRED FIELDS
    // --------------------------------------------------------

    if (
        !vehicle_id ||
        !station_id ||
        !charger_id ||
        !booking_date ||
        !start_time ||
        !end_time ||
        amount === undefined ||
        amount === null
    ) {

        return res.status(400).json({

            success: false,

            message:
                'Missing required booking details.'

        });
    }


    // --------------------------------------------------------
    // DATE
    // --------------------------------------------------------

    if (
        !isValidDateString(
            booking_date
        )
    ) {

        return res.status(400).json({

            success: false,

            message:
                'Invalid booking date.'

        });
    }


    // --------------------------------------------------------
    // TIME
    // --------------------------------------------------------

    const startMinutes =
        minutesFromTime(
            start_time
        );

    const endMinutes =
        minutesFromTime(
            end_time
        );


    if (
        Number.isNaN(startMinutes) ||
        Number.isNaN(endMinutes)
    ) {

        return res.status(400).json({

            success: false,

            message:
                'Invalid booking time.'

        });
    }


    if (
        startMinutes ===
        endMinutes
    ) {

        return res.status(400).json({

            success: false,

            message:
                'Start time and end time cannot be the same.'

        });
    }


    // --------------------------------------------------------
    // AMOUNT
    // --------------------------------------------------------

    const numericAmount =
        Number(amount);


    if (
        !Number.isFinite(
            numericAmount
        ) ||
        numericAmount <= 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                'Invalid booking amount.'

        });
    }


    const connection =
        await pool.getConnection();


    try {

        await connection.beginTransaction();


        // ====================================================
        // VERIFY USER
        // ====================================================

        const [users] =
            await connection.query(
                `
                SELECT
                    id,
                    name,
                    email
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [userId]
            );


        if (
            users.length === 0
        ) {

            throw new Error(
                'User account not found.'
            );
        }


        // ====================================================
        // VERIFY VEHICLE
        // ====================================================

        const [vehicles] =
            await connection.query(
                `
                SELECT
                    id,
                    user_id,
                    vehicle_name,
                    vehicle_number,
                    connector_type
                FROM vehicles
                WHERE id = ?
                AND user_id = ?
                LIMIT 1
                `,
                [
                    vehicle_id,
                    userId
                ]
            );


        if (
            vehicles.length === 0
        ) {

            throw new Error(
                'Selected vehicle does not belong to your account.'
            );
        }


        // ====================================================
        // VERIFY STATION
        // ====================================================

        const [stations] =
            await connection.query(
                `
                SELECT
                    id,
                    name,
                    address,
                    city,
                    state,
                    status
                FROM charging_stations
                WHERE id = ?
                LIMIT 1
                `,
                [station_id]
            );


        if (
            stations.length === 0
        ) {

            throw new Error(
                'Charging station not found.'
            );
        }


        const station =
            stations[0];


        if (
            String(
                station.status || ''
            ).toLowerCase() !==
            'active'
        ) {

            throw new Error(
                'This charging station is currently unavailable.'
            );
        }


        // ====================================================
        // VERIFY CHARGER
        // ====================================================

        const [chargers] =
            await connection.query(
                `
                SELECT
                    id,
                    station_id,
                    charger_number,
                    charger_type,
                    connector_type,
                    power_kw,
                    price_per_hour,
                    status
                FROM chargers
                WHERE id = ?
                LIMIT 1
                FOR UPDATE
                `,
                [charger_id]
            );


        if (
            chargers.length === 0
        ) {

            throw new Error(
                'Charger not found.'
            );
        }


        const charger =
            chargers[0];


        // ----------------------------------------------------
        // CHARGER MUST BELONG TO STATION
        // ----------------------------------------------------

        if (
            Number(
                charger.station_id
            ) !==
            Number(station_id)
        ) {

            throw new Error(
                'Selected charger does not belong to this station.'
            );
        }


        // ----------------------------------------------------
        // CHARGER STATUS
        // ----------------------------------------------------

        const chargerStatus =
            String(
                charger.status || ''
            ).toUpperCase();


        if (
            chargerStatus ===
            'MAINTENANCE'
        ) {

            throw new Error(
                'Charger is currently under maintenance.'
            );
        }


        if (
            chargerStatus ===
            'OFFLINE'
        ) {

            throw new Error(
                'Charger is currently offline.'
            );
        }


        // ====================================================
        // CONNECTOR COMPATIBILITY
        // ====================================================

        const vehicleConnector =
            String(
                vehicles[0].connector_type || ''
            )
                .trim()
                .toLowerCase();


        const chargerConnector =
            String(
                charger.connector_type || ''
            )
                .trim()
                .toLowerCase();


        if (
            vehicleConnector &&
            chargerConnector &&
            vehicleConnector !==
            chargerConnector
        ) {

            throw new Error(
                `Connector mismatch. Your vehicle uses ${vehicles[0].connector_type}, but this charger uses ${charger.connector_type}.`
            );
        }


        // ====================================================
        // CHECK BOOKING OVERLAP
        // ====================================================

        let conflicts = [];


        if (
            endMinutes >
            startMinutes
        ) {

            // ------------------------------------------------
            // NORMAL SAME-DAY BOOKING
            // ------------------------------------------------

            const [rows] =
                await connection.query(
                    `
                    SELECT
                        id
                    FROM bookings
                    WHERE charger_id = ?
                    AND booking_date = ?
                    AND status IN
                    (
                        'Pending',
                        'Confirmed',
                        'Active'
                    )
                    AND start_time < ?
                    AND end_time > ?
                    LIMIT 1
                    `,
                    [
                        charger_id,
                        booking_date,
                        end_time,
                        start_time
                    ]
                );


            conflicts =
                rows;

        } else {

            // ------------------------------------------------
            // OVERNIGHT BOOKING
            // ------------------------------------------------

            const [
                sameDayRows
            ] =
                await connection.query(
                    `
                    SELECT
                        id
                    FROM bookings
                    WHERE charger_id = ?
                    AND booking_date = ?
                    AND status IN
                    (
                        'Pending',
                        'Confirmed',
                        'Active'
                    )
                    AND start_time < '23:59:59'
                    AND end_time > ?
                    LIMIT 1
                    `,
                    [
                        charger_id,
                        booking_date,
                        start_time
                    ]
                );


            conflicts =
                sameDayRows;


            // ------------------------------------------------
            // NEXT DAY
            // ------------------------------------------------

            if (
                conflicts.length === 0
            ) {

                const bookingDate =
                    new Date(
                        `${booking_date}T00:00:00`
                    );


                bookingDate.setDate(
                    bookingDate.getDate() + 1
                );


                const nextDate =
                    bookingDate
                        .toISOString()
                        .slice(0, 10);


                const [
                    nextDayRows
                ] =
                    await connection.query(
                        `
                        SELECT
                            id
                        FROM bookings
                        WHERE charger_id = ?
                        AND booking_date = ?
                        AND status IN
                        (
                            'Pending',
                            'Confirmed',
                            'Active'
                        )
                        AND start_time < ?
                        LIMIT 1
                        `,
                        [
                            charger_id,
                            nextDate,
                            end_time
                        ]
                    );


                conflicts =
                    nextDayRows;
            }
        }


        if (
            conflicts.length > 0
        ) {

            throw new Error(
                'This time slot is already booked. Please select another slot.'
            );
        }


        // ====================================================
        // CREATE RAZORPAY ORDER
        // ====================================================

        if (
            !process.env.RAZORPAY_KEY_ID ||
            !process.env.RAZORPAY_KEY_SECRET
        ) {

            throw new Error(
                'Razorpay configuration is missing in the server environment.'
            );
        }


        const orderOptions = {

            amount:
                Math.round(
                    numericAmount * 100
                ),

            currency:
                'INR',

            receipt:
                `booking_${Date.now()}_${userId}`

        };


        const razorpayOrder =
            await razorpay.orders.create(
                orderOptions
            );


        if (
            !razorpayOrder ||
            !razorpayOrder.id
        ) {

            throw new Error(
                'Unable to create Razorpay order.'
            );
        }


        // ====================================================
        // INSERT BOOKING
        // ====================================================

        const [bookingResult] =
            await connection.query(
                `
                INSERT INTO bookings
                (
                    user_id,
                    vehicle_id,
                    station_id,
                    charger_id,
                    slot_id,
                    booking_date,
                    start_time,
                    end_time,
                    status,
                    amount,
                    razorpay_order_id,
                    payment_status
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'Pending',
                    ?,
                    ?,
                    'Pending'
                )
                `,
                [
                    userId,
                    vehicle_id,
                    station_id,
                    charger_id,
                    slot_id || null,
                    booking_date,
                    start_time,
                    end_time,
                    numericAmount,
                    razorpayOrder.id
                ]
            );


        const bookingId =
            bookingResult.insertId;


        // ====================================================
        // CREATE PAYMENT RECORD
        // ====================================================

        await connection.query(
            `
            INSERT INTO payments
            (
                booking_id,
                user_id,
                amount,
                currency,
                razorpay_order_id,
                status
            )
            VALUES
            (
                ?,
                ?,
                ?,
                'INR',
                ?,
                'Pending'
            )
            `,
            [
                bookingId,
                userId,
                numericAmount,
                razorpayOrder.id
            ]
        );


        // ====================================================
        // COMMIT
        // ====================================================

        await connection.commit();


        // ====================================================
        // RESPONSE
        // ====================================================

        return res.status(201).json({

            success: true,

            message:
                'Booking created. Proceed to payment.',

            bookingId:
                bookingId,

            razorpayOrderId:
                razorpayOrder.id,

            amount:
                razorpayOrder.amount,

            currency:
                razorpayOrder.currency,

            keyId:
                process.env.RAZORPAY_KEY_ID

        });


    } catch (error) {

        try {

            await connection.rollback();

        } catch (rollbackError) {

            console.error(
                'Rollback error:',
                rollbackError
            );
        }


        console.error(
            'Booking Error:',
            error
        );


        const message =
            String(
                error.message || ''
            );


        const isConflict =
            message
                .toLowerCase()
                .includes(
                    'already booked'
                );


        return res.status(
            isConflict
                ? 409
                : 500
        ).json({

            success: false,

            message:
                message ||
                'Failed to create booking.'

        });


    } finally {

        connection.release();

    }

};


// ============================================================
// VERIFY RAZORPAY PAYMENT
// POST /api/bookings/verify-payment
// ============================================================

export const verifyPayment = async (
    req,
    res
) => {

    const {

        razorpay_order_id,

        razorpay_payment_id,

        razorpay_signature,

        payment_method

    } = req.body;


    // --------------------------------------------------------
    // AUTH
    // --------------------------------------------------------

    const userId =
        req.user?.id ||
        req.user?.userId;


    if (!userId) {

        return res.status(401).json({

            success: false,

            message:
                'Authentication required.'

        });
    }


    // --------------------------------------------------------
    // REQUIRED PAYMENT DATA
    // --------------------------------------------------------

    if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
    ) {

        return res.status(400).json({

            success: false,

            message:
                'Payment details missing.'

        });
    }


    try {

        // ====================================================
        // VERIFY RAZORPAY SIGNATURE
        // ====================================================

        if (
            !process.env.RAZORPAY_KEY_SECRET
        ) {

            return res.status(500).json({

                success: false,

                message:
                    'Razorpay secret is not configured on the server.'

            });
        }


        const body =
            razorpay_order_id +
            '|' +
            razorpay_payment_id;


        const expectedSignature =
            crypto
                .createHmac(
                    'sha256',
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(body)
                .digest('hex');


        if (
            expectedSignature !==
            razorpay_signature
        ) {

            await pool.query(
                `
                UPDATE payments
                SET status = 'Failed'
                WHERE razorpay_order_id = ?
                AND user_id = ?
                `,
                [
                    razorpay_order_id,
                    userId
                ]
            );


            await pool.query(
                `
                UPDATE bookings
                SET payment_status = 'Failed'
                WHERE razorpay_order_id = ?
                AND user_id = ?
                `,
                [
                    razorpay_order_id,
                    userId
                ]
            );


            return res.status(400).json({

                success: false,

                message:
                    'Invalid payment signature.'

            });
        }


        // ====================================================
        // DATABASE TRANSACTION
        // ====================================================

        const connection =
            await pool.getConnection();


        try {

            await connection.beginTransaction();


            // =================================================
            // GET PAYMENT
            // =================================================

            const [payments] =
                await connection.query(
                    `
                    SELECT
                        id,
                        booking_id,
                        user_id,
                        amount,
                        status
                    FROM payments
                    WHERE razorpay_order_id = ?
                    AND user_id = ?
                    LIMIT 1
                    FOR UPDATE
                    `,
                    [
                        razorpay_order_id,
                        userId
                    ]
                );


            if (
                payments.length === 0
            ) {

                throw new Error(
                    'Payment record not found.'
                );
            }


            const payment =
                payments[0];


            // =================================================
            // PREVENT INVALID USER MISMATCH
            // =================================================

            if (
                Number(payment.user_id) !==
                Number(userId)
            ) {

                throw new Error(
                    'Payment does not belong to this user.'
                );
            }


            // =================================================
            // UPDATE PAYMENT
            // =================================================

            await connection.query(
                `
                UPDATE payments

                SET

                    razorpay_payment_id = ?,

                    razorpay_signature = ?,

                    status = 'Success',

                    payment_method = ?

                WHERE id = ?
                `,
                [
                    razorpay_payment_id,
                    razorpay_signature,
                    payment_method || null,
                    payment.id
                ]
            );


            // =================================================
            // UPDATE BOOKING
            // =================================================

            await connection.query(
                `
                UPDATE bookings

                SET

                    status = 'Confirmed',

                    payment_status = 'Paid',

                    razorpay_order_id = ?,

                    razorpay_payment_id = ?

                WHERE id = ?

                AND user_id = ?
                `,
                [
                    razorpay_order_id,
                    razorpay_payment_id,
                    payment.booking_id,
                    userId
                ]
            );


            // =================================================
            // COMMIT
            // =================================================

            await connection.commit();

            // Trigger Notifications
            try {
                await sendNotification(
                    userId,
                    'Booking confirmed',
                    'Your charging slot has been confirmed successfully.',
                    'booking'
                );
                await sendNotification(
                    userId,
                    'Payment successful',
                    `₹${payment.amount} received`,
                    'payment'
                );
            } catch (notifErr) {
                console.warn('Notification send error:', notifErr.message);
            }

            // =================================================
            // RESPONSE
            // =================================================

            return res.status(200).json({

                success: true,

                message:
                    'Payment verified and booking confirmed successfully.',

                bookingId:
                    payment.booking_id,

                paymentId:
                    razorpay_payment_id,

                orderId:
                    razorpay_order_id

            });


        } catch (dbError) {

            try {

                await connection.rollback();

            } catch (rollbackError) {

                console.error(
                    'Rollback error:',
                    rollbackError
                );
            }


            throw dbError;


        } finally {

            connection.release();

        }


    } catch (error) {

        console.error(
            'Payment Verification Error:',
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                'Internal server error during payment verification.'

        });

    }

};


// ============================================================
// GET MY BOOKINGS
// GET /api/bookings/my-bookings
// ============================================================

export const getMyBookings = async (
    req,
    res
) => {

    try {

        // ----------------------------------------------------
        // USER ID
        // ----------------------------------------------------

        const userId =
            req.user?.id ||
            req.user?.userId;


        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    'Authentication required.'

            });
        }


        console.log(
            `Fetching bookings for user ${userId}`
        );


        // ====================================================
        // FETCH BOOKINGS
        // ====================================================

        const [bookings] =
            await pool.query(
                `
                SELECT

                    b.id,

                    b.user_id,

                    b.vehicle_id,

                    b.station_id,

                    b.charger_id,

                    b.slot_id,

                    b.booking_date,

                    b.start_time,

                    b.end_time,

                    b.status,

                    b.amount,

                    b.razorpay_order_id,

                    b.razorpay_payment_id,

                    b.payment_status,

                    b.created_at,

                    b.updated_at,


                    /* ======================================
                       STATION
                    ====================================== */

                    s.name AS station_name,

                    s.address AS address,

                    s.city AS city,

                    s.state AS state,

                    s.latitude AS latitude,

                    s.longitude AS longitude,

                    s.rating AS station_rating,

                    s.total_reviews AS station_total_reviews,


                    /* ======================================
                       CHARGER
                    ====================================== */

                    c.charger_number AS charger_number,

                    c.charger_type AS charger_type,

                    c.connector_type AS connector_type,

                    c.power_kw AS power_kw,

                    c.price_per_hour AS price_per_hour,

                    c.status AS charger_status,


                    /* ======================================
                       VEHICLE
                    ====================================== */

                    v.vehicle_name AS vehicle_name,

                    v.vehicle_number AS vehicle_number,

                    v.vehicle_model AS vehicle_model,

                    v.connector_type AS vehicle_connector_type,

                    v.battery_capacity AS battery_capacity,


                    /* ======================================
                       LATEST PAYMENT
                    ====================================== */

                    (
                        SELECT
                            p2.status
                        FROM payments p2
                        WHERE p2.booking_id = b.id
                        ORDER BY p2.id DESC
                        LIMIT 1
                    ) AS payment_record_status,


                    (
                        SELECT
                            p3.payment_method
                        FROM payments p3
                        WHERE p3.booking_id = b.id
                        ORDER BY p3.id DESC
                        LIMIT 1
                    ) AS payment_method,


                    (
    SELECT
        p4.razorpay_payment_id
    FROM payments p4
    WHERE p4.booking_id = b.id
    ORDER BY p4.id DESC
    LIMIT 1
) AS payment_record_id,


/* ======================================
   REVIEW STATUS
   ====================================== */

EXISTS (
    SELECT 1
    FROM reviews r
    WHERE r.booking_id = b.id
    AND r.user_id = b.user_id
) AS review_exists


                FROM bookings b


                LEFT JOIN charging_stations s
                    ON b.station_id = s.id


                LEFT JOIN chargers c
                    ON b.charger_id = c.id


                LEFT JOIN vehicles v
                    ON b.vehicle_id = v.id


                WHERE b.user_id = ?


                ORDER BY

                    b.booking_date DESC,

                    b.start_time DESC,

                    b.id DESC

                `,
                [userId]
            );


        console.log(
            `Found ${bookings.length} bookings for user ${userId}`
        );


        // ====================================================
        // FORMAT BOOKINGS
        // ====================================================

        const updatedBookings =
            bookings.map(
                booking => {

                    // ------------------------------------------------
                    // EFFECTIVE STATUS
                    // ------------------------------------------------

                    const currentStatus =
                        getEffectiveStatus(
                            booking
                        );


                    // ------------------------------------------------
                    // PERSIST COMPLETED STATUS
                    // ------------------------------------------------

                    if (
                        currentStatus ===
                        'Completed' &&

                        String(
                            booking.status || ''
                        ).toLowerCase() !==
                        'completed' &&

                        String(
                            booking.status || ''
                        ).toLowerCase() !==
                        'cancelled'
                    ) {

                        pool.query(
                            `
                            UPDATE bookings

                            SET status = 'Completed'

                            WHERE id = ?

                            AND status IN
                            (
                                'Pending',
                                'Confirmed',
                                'Active'
                            )
                            `,
                            [booking.id]
                        )
                        .catch(
                            error => {

                                console.error(
                                    'Failed to persist Completed status:',
                                    error
                                );

                            }
                        );
                    }


                    // ------------------------------------------------
                    // CHARGING SPEED
                    // ------------------------------------------------

                    let chargingSpeed =
                        null;


                    if (
                        booking.power_kw !==
                        null &&

                        booking.power_kw !==
                        undefined
                    ) {

                        chargingSpeed =
                            `${booking.power_kw} kW`;

                    }


                    // =================================================
                    // PAYMENT STATUS
                    //
                    // IMPORTANT FIX
                    //
                    // bookings.payment_status:
                    // Pending / Paid / Failed / Refunded
                    //
                    // payments.status:
                    // Pending / Success / Failed / Refunded
                    //
                    // Frontend receives:
                    // Paid / Pending / Failed / Refunded
                    // =================================================

                    const bookingPaymentStatus =
                        String(
                            booking.payment_status || ''
                        )
                            .trim()
                            .toLowerCase();


                    const paymentRecordStatus =
                        String(
                            booking.payment_record_status || ''
                        )
                            .trim()
                            .toLowerCase();


                    let paymentStatus =
                        'Pending';


                    // PAID HAS PRIORITY
                    if (
                        bookingPaymentStatus ===
                        'paid' ||

                        paymentRecordStatus ===
                        'success'
                    ) {

                        paymentStatus =
                            'Paid';

                    }

                    // FAILED
                    else if (
                        bookingPaymentStatus ===
                        'failed' ||

                        paymentRecordStatus ===
                        'failed'
                    ) {

                        paymentStatus =
                            'Failed';

                    }

                    // REFUNDED
                    else if (
                        bookingPaymentStatus ===
                        'refunded' ||

                        paymentRecordStatus ===
                        'refunded'
                    ) {

                        paymentStatus =
                            'Refunded';

                    }

                    // PENDING
                    else {

                        paymentStatus =
                            'Pending';

                    }


                    // ------------------------------------------------
                    // VEHICLE DISPLAY
                    // ------------------------------------------------

                    let vehicleInfo =
                        booking.vehicle_name ||
                        'EV Vehicle';


                    if (
                        booking.vehicle_number
                    ) {

                        vehicleInfo +=
                            ` • ${booking.vehicle_number}`;

                    }


                    // ------------------------------------------------
                    // RETURN OBJECT
                    // ------------------------------------------------

                    return {

                        id:
                            booking.id,

                        booking_id:
                            booking.id,


                        user_id:
                            booking.user_id,


                        vehicle_id:
                            booking.vehicle_id,

                        vehicle_name:
                            booking.vehicle_name,

                        vehicle_number:
                            booking.vehicle_number,

                        vehicle_model:
                            booking.vehicle_model,

                        vehicle_info:
                            vehicleInfo,

                        vehicle_connector_type:
                            booking.vehicle_connector_type,

                        battery_capacity:
                            booking.battery_capacity,


                        station_id:
                            booking.station_id,

                        station_name:
                            booking.station_name ||
                            'EV Charging Station',

                        address:
                            booking.address ||
                            '',

                        city:
                            booking.city ||
                            '',

                        state:
                            booking.state ||
                            '',

                        latitude:
                            booking.latitude,

                        longitude:
                            booking.longitude,

                        station_rating:
                            booking.station_rating,

                        station_total_reviews:
                            booking.station_total_reviews,


                        charger_id:
                            booking.charger_id,

                        charger_number:
                            booking.charger_number,

                        charger_type:
                            booking.charger_type,

                        connector_type:
                            booking.connector_type,

                        charging_speed:
                            chargingSpeed,

                        power_kw:
                            booking.power_kw,

                        price_per_hour:
                            booking.price_per_hour,

                        charger_status:
                            booking.charger_status,


                        slot_id:
                            booking.slot_id,


                        booking_date:
                            normalizeDate(
                                booking.booking_date
                            ),

                        start_time:
                            normalizeTime(
                                booking.start_time
                            ),

                        end_time:
                            normalizeTime(
                                booking.end_time
                            ),


                        status:
                            currentStatus,

                        database_status:
                            booking.status,


                        amount:
                            Number(
                                booking.amount || 0
                            ),


                        // =================================================
                        // CORRECT PAYMENT STATUS
                        // =================================================

                        payment_status:
                            paymentStatus,

                        payment_method:
                            booking.payment_method,

                        razorpay_order_id:
                            booking.razorpay_order_id,

                        razorpay_payment_id:
                            booking.razorpay_payment_id ||
                            booking.payment_record_id,


                        created_at:
                            booking.created_at,

                        updated_at:
                            booking.updated_at

                    };

                }
            );


        // ====================================================
        // RESPONSE
        // ====================================================

        return res.status(200).json({

            success: true,

            count:
                updatedBookings.length,

            data:
                updatedBookings,

            // Compatibility with frontend versions
            bookings:
                updatedBookings

        });


    } catch (error) {

        console.error(
            'Get Bookings Error:',
            error
        );


        return res.status(500).json({

            success: false,

            message:
                'Failed to fetch bookings.',

            error:
                process.env.NODE_ENV !== 'production'
                    ? error.message
                    : undefined

        });

    }

};


// ============================================================
// UPDATE BOOKING STATUS
// PUT /api/bookings/:id
// ============================================================

export const updateBooking = async (
    req,
    res
) => {

    try {

        const bookingId =
            Number(
                req.params.id
            );


        const userId =
            req.user?.id ||
            req.user?.userId;


        if (!userId) {

            return res.status(401).json({

                success: false,

                message:
                    'Authentication required.'

            });

        }


        if (
            !bookingId ||
            !Number.isInteger(bookingId)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Invalid booking ID.'

            });

        }


        const {
            status
        } = req.body;


        const allowedStatuses = [

            'Pending',

            'Confirmed',

            'Active',

            'Completed',

            'Cancelled'

        ];


        if (
            !status ||
            !allowedStatuses.includes(
                status
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Invalid booking status.'

            });

        }


        console.log(
            `Updating booking ${bookingId} for user ${userId} to ${status}`
        );


        // ====================================================
        // GET CURRENT BOOKING
        // ====================================================

        const [
            existingRows
        ] =
            await pool.query(
                `
                SELECT
                    id,
                    status,
                    payment_status,
                    booking_date,
                    start_time,
                    end_time
                FROM bookings
                WHERE id = ?
                AND user_id = ?
                LIMIT 1
                `,
                [
                    bookingId,
                    userId
                ]
            );


        if (
            existingRows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    'Booking not found or does not belong to this user.'

            });

        }


        const existingBooking =
            existingRows[0];


        // ====================================================
        // CANCELLATION VALIDATION
        // ====================================================

        if (
            status ===
            'Cancelled'
        ) {

            if (
                String(
                    existingBooking.status || ''
                ).toLowerCase() ===
                'completed'
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        'Completed bookings cannot be cancelled.'

                });

            }


            if (
                String(
                    existingBooking.status || ''
                ).toLowerCase() ===
                'cancelled'
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        'Booking is already cancelled.'

                });

            }

        }


        // ====================================================
        // UPDATE
        // ====================================================

        const [result] =
            await pool.query(
                `
                UPDATE bookings

                SET
                    status = ?,

                    updated_at = CURRENT_TIMESTAMP

                WHERE id = ?

                AND user_id = ?
                `,
                [
                    status,
                    bookingId,
                    userId
                ]
            );


        if (
            result.affectedRows === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    'Booking not found or does not belong to this user.'

            });

        }


        // ====================================================
        // RESPONSE
        // ====================================================

        return res.status(200).json({

            success: true,

            message:
                'Booking status updated successfully.',

            booking_id:
                bookingId,

            status:
                status

        });


    } catch (error) {

        console.error(
            'Update Booking Error:',
            error
        );


        return res.status(500).json({

            success: false,

            message:
                'Failed to update booking status.',

            error:
                process.env.NODE_ENV !== 'production'
                    ? error.message
                    : undefined

        });

    }

};

// ============================================================
// RECURRING CHARGING SCHEDULES
// ============================================================

const DAY_MAP = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime12(timeStr) {
    if (!timeStr) return '';
    let [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minsStr = isNaN(minutes) ? '00' : String(minutes).padStart(2, '0');
    return `${hours}:${minsStr} ${ampm}`;
}

function parseTimeTo24(timeStr) {
    if (!timeStr) return { hours: 19, minutes: 0 };
    const clean = timeStr.trim().toUpperCase();
    if (clean.includes('AM') || clean.includes('PM')) {
        const isPM = clean.includes('PM');
        const parts = clean.replace(/(AM|PM)/g, '').trim().split(':');
        let h = parseInt(parts[0], 10);
        const m = parts[1] ? parseInt(parts[1], 10) : 0;
        if (isPM && h < 12) h += 12;
        if (!isPM && h === 12) h = 0;
        return { hours: h, minutes: m };
    }
    const parts = clean.split(':');
    return {
        hours: parseInt(parts[0], 10) || 0,
        minutes: parts[1] ? parseInt(parts[1], 10) : 0
    };
}

export function calculateNextOccurrence(daysOfWeekInput, timeOfDayInput) {
    const daysArr = Array.isArray(daysOfWeekInput)
        ? daysOfWeekInput
        : String(daysOfWeekInput || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    const targetDayNums = daysArr.map(d => DAY_MAP[d.toLowerCase()]).filter(n => n !== undefined);
    if (targetDayNums.length === 0) {
        targetDayNums.push(0, 1, 2, 3, 4, 5, 6);
    }

    const { hours, minutes } = parseTimeTo24(timeOfDayInput);
    const now = new Date();

    for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
        const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hours, minutes, 0, 0);
        if (targetDayNums.includes(candidate.getDay())) {
            if (candidate.getTime() > now.getTime()) {
                const time12 = formatTime12(`${hours}:${minutes}`);
                let label = '';
                if (dayOffset === 0) {
                    label = `Today • ${time12}`;
                } else if (dayOffset === 1) {
                    label = `Tomorrow • ${time12}`;
                } else {
                    label = `${DAY_NAMES[candidate.getDay()]} • ${time12}`;
                }

                const diffMs = candidate.getTime() - now.getTime();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                let countdown = '';
                if (diffHours >= 24) {
                    const diffDays = Math.floor(diffHours / 24);
                    const remHours = diffHours % 24;
                    countdown = `in ${diffDays}d ${remHours}h`;
                } else if (diffHours > 0) {
                    countdown = `in ${diffHours}h ${diffMins}m`;
                } else {
                    countdown = `in ${diffMins}m`;
                }

                return {
                    timestamp: candidate.getTime(),
                    date: candidate.toISOString().split('T')[0],
                    time: time12,
                    time24: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
                    label,
                    countdown,
                    dayName: DAY_NAMES[candidate.getDay()]
                };
            }
        }
    }
    return null;
}

// POST /api/bookings/recurring
export const createRecurringSchedule = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const { station_id, vehicle_id, days_of_week, time_of_day, duration_minutes = 45 } = req.body;

        if (!station_id) {
            return res.status(400).json({ success: false, message: 'Station ID is required.' });
        }

        const [stations] = await pool.query('SELECT id, name, address FROM charging_stations WHERE id = ?', [station_id]);
        if (!stations || stations.length === 0) {
            return res.status(404).json({ success: false, message: 'Charging station not found.' });
        }
        const station = stations[0];

        const daysStr = Array.isArray(days_of_week) ? days_of_week.join(', ') : String(days_of_week || 'Monday, Wednesday, Friday');
        const timeStr = String(time_of_day || '19:00');
        const duration = parseInt(duration_minutes, 10) || 45;

        let targetVehicleId = vehicle_id ? Number(vehicle_id) : null;
        if (!targetVehicleId) {
            const [vehs] = await pool.query('SELECT id FROM vehicles WHERE user_id = ? ORDER BY id ASC LIMIT 1', [userId]);
            if (vehs && vehs.length > 0) {
                targetVehicleId = vehs[0].id;
            }
        }

        const [insertResult] = await pool.query(
            `INSERT INTO recurring_schedules (user_id, station_id, vehicle_id, days_of_week, time_of_day, duration_minutes, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            [userId, station_id, targetVehicleId, daysStr, timeStr, duration]
        );

        const nextOccur = calculateNextOccurrence(daysStr, timeStr);

        try {
            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type, is_read)
                 VALUES (?, ?, ?, 'reminder', 0)`,
                [
                    userId,
                    '📅 Recurring Charging Active',
                    `Your recurring charging at ${station.name} is scheduled for ${daysStr} at ${formatTime12(timeStr)}. Next charging: ${nextOccur ? nextOccur.label : 'Upcoming'}.`
                ]
            );
        } catch (nErr) {
            console.warn('Could not write notification:', nErr.message);
        }

        return res.status(201).json({
            success: true,
            message: 'Recurring charging schedule created successfully!',
            schedule_id: insertResult.insertId,
            schedule: {
                id: insertResult.insertId,
                station_id,
                station_name: station.name,
                days_of_week: daysStr,
                time_of_day: timeStr,
                duration_minutes: duration,
                next_charging: nextOccur ? nextOccur.label : null,
                countdown: nextOccur ? nextOccur.countdown : null
            }
        });
    } catch (error) {
        console.error('createRecurringSchedule error:', error);
        return res.status(500).json({ success: false, message: 'Failed to create recurring schedule.', error: error.message });
    }
};

// GET /api/bookings/recurring
export const getRecurringSchedules = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const query = `
            SELECT
                rs.id,
                rs.user_id,
                rs.station_id,
                rs.vehicle_id,
                rs.days_of_week,
                rs.time_of_day,
                rs.duration_minutes,
                rs.status,
                rs.created_at,
                s.name AS station_name,
                s.address AS station_address,
                s.city AS station_city,
                v.vehicle_name,
                v.vehicle_model,
                v.connector_type
            FROM recurring_schedules rs
            JOIN charging_stations s ON rs.station_id = s.id
            LEFT JOIN vehicles v ON rs.vehicle_id = v.id
            WHERE rs.user_id = ? AND rs.status = 'active'
            ORDER BY rs.id DESC
        `;

        const [rows] = await pool.query(query, [userId]);

        const formatted = rows.map(r => {
            const nextOccur = calculateNextOccurrence(r.days_of_week, r.time_of_day);
            return {
                ...r,
                formatted_time: formatTime12(r.time_of_day),
                next_charging: nextOccur ? nextOccur.label : 'Upcoming',
                next_timestamp: nextOccur ? nextOccur.timestamp : null,
                countdown: nextOccur ? nextOccur.countdown : null
            };
        });

        formatted.sort((a, b) => (a.next_timestamp || Infinity) - (b.next_timestamp || Infinity));

        return res.status(200).json({
            success: true,
            count: formatted.length,
            schedules: formatted
        });
    } catch (error) {
        console.error('getRecurringSchedules error:', error);
        return res.status(500).json({ success: false, message: 'Failed to retrieve recurring schedules.', error: error.message });
    }
};

// DELETE /api/bookings/recurring/:id
export const deleteRecurringSchedule = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const scheduleId = Number(req.params.id);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        if (!scheduleId || !Number.isInteger(scheduleId)) {
            return res.status(400).json({ success: false, message: 'Valid schedule ID is required.' });
        }

        const [result] = await pool.query(
            "UPDATE recurring_schedules SET status = 'cancelled' WHERE id = ? AND user_id = ?",
            [scheduleId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Recurring schedule not found or already cancelled.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Recurring schedule cancelled successfully.'
        });
    } catch (error) {
        console.error('deleteRecurringSchedule error:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete recurring schedule.', error: error.message });
    }
};

// GET /api/bookings/next-scheduled
export const getNextScheduledCharging = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const upcomingCandidates = [];

        // 1. Check recurring schedules
        const [recurring] = await pool.query(`
            SELECT
                rs.id,
                rs.station_id,
                rs.days_of_week,
                rs.time_of_day,
                rs.duration_minutes,
                s.name AS station_name,
                s.address AS station_address,
                v.vehicle_name,
                v.vehicle_model
            FROM recurring_schedules rs
            JOIN charging_stations s ON rs.station_id = s.id
            LEFT JOIN vehicles v ON rs.vehicle_id = v.id
            WHERE rs.user_id = ? AND rs.status = 'active'
        `, [userId]);

        for (const r of recurring) {
            const nextOccur = calculateNextOccurrence(r.days_of_week, r.time_of_day);
            if (nextOccur) {
                upcomingCandidates.push({
                    type: 'recurring',
                    schedule_id: r.id,
                    station_id: r.station_id,
                    station_name: r.station_name,
                    station_address: r.station_address,
                    vehicle_name: r.vehicle_name || r.vehicle_model || 'Registered EV',
                    duration: `${r.duration_minutes} minutes`,
                    days: r.days_of_week,
                    display_time: nextOccur.label,
                    countdown: nextOccur.countdown,
                    timestamp: nextOccur.timestamp,
                    is_recurring: true
                });
            }
        }

        // 2. Check confirmed single bookings in the future
        const [bookings] = await pool.query(`
            SELECT
                b.id,
                b.station_id,
                b.booking_date,
                b.start_time,
                b.end_time,
                s.name AS station_name,
                s.address AS station_address,
                v.vehicle_name,
                v.vehicle_model
            FROM bookings b
            JOIN charging_stations s ON b.station_id = s.id
            LEFT JOIN vehicles v ON b.vehicle_id = v.id
            WHERE b.user_id = ?
              AND b.status IN ('CONFIRMED', 'PENDING', 'ACTIVE')
              AND b.booking_date >= CURDATE()
        `, [userId]);

        const now = new Date();
        for (const b of bookings) {
            const dateStr = b.booking_date instanceof Date ? b.booking_date.toISOString().split('T')[0] : String(b.booking_date).substring(0, 10);
            const timeStr = String(b.start_time).substring(0, 5);
            const candidateDate = new Date(`${dateStr}T${timeStr}:00`);
            if (candidateDate.getTime() > now.getTime()) {
                const time12 = formatTime12(timeStr);
                const isToday = candidateDate.toDateString() === now.toDateString();
                const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                const isTmrw = candidateDate.toDateString() === tmrw.toDateString();
                const label = isToday ? `Today • ${time12}` : (isTmrw ? `Tomorrow • ${time12}` : `${DAY_NAMES[candidateDate.getDay()]} • ${time12}`);
                const diffMs = candidateDate.getTime() - now.getTime();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const countdown = diffHours > 0 ? `in ${diffHours}h ${diffMins}m` : `in ${diffMins}m`;

                upcomingCandidates.push({
                    type: 'single',
                    booking_id: b.id,
                    station_id: b.station_id,
                    station_name: b.station_name,
                    station_address: b.station_address,
                    vehicle_name: b.vehicle_name || b.vehicle_model || 'Registered EV',
                    duration: 'Scheduled session',
                    display_time: label,
                    countdown,
                    timestamp: candidateDate.getTime(),
                    is_recurring: false
                });
            }
        }

        if (upcomingCandidates.length === 0) {
            return res.status(200).json({
                success: true,
                hasNext: false,
                message: 'No upcoming charging sessions scheduled.'
            });
        }

        upcomingCandidates.sort((a, b) => a.timestamp - b.timestamp);
        const nextPick = upcomingCandidates[0];

        return res.status(200).json({
            success: true,
            hasNext: true,
            nextCharging: nextPick
        });
    } catch (error) {
        console.error('getNextScheduledCharging error:', error);
        return res.status(500).json({ success: false, message: 'Failed to compute next scheduled charging.', error: error.message });
    }
};