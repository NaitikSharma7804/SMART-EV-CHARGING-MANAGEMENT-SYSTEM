// backend/controllers/reviewController.js

import pool from "../config/db.js";

/**
 * Convert a value to a valid integer ID.
 */
const toId = (value) => {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }

    return id;
};

/**
 * Convert rating to integer.
 * Rating must be between 1 and 5.
 */
const normalizeRating = (value) => {
    const rating = Number(value);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return null;
    }

    return rating;
};

/**
 * Check whether a rating is valid.
 */
const isValidRating = (value) => {
    const rating = Number(value);
    return Number.isInteger(rating) && rating >= 1 && rating <= 5;
};

/**
 * Check whether booking session has completed based on date/time.
 */
const hasSessionEnded = (bookingDate, endTime) => {
    if (!bookingDate || !endTime) {
        return false;
    }

    try {
        const dateString =
            bookingDate instanceof Date
                ? bookingDate.toISOString().split("T")[0]
                : String(bookingDate).slice(0, 10);

        const timeString = String(endTime).slice(0, 8);

        const sessionEnd = new Date(
            `${dateString}T${timeString}`
        );

        if (Number.isNaN(sessionEnd.getTime())) {
            return false;
        }

        return new Date() >= sessionEnd;
    } catch (error) {
        return false;
    }
};

/**
 * GET
 * /api/reviews/station/:stationId
 *
 * Get all reviews and rating summary for a station.
 */
export const getStationReviews = async (req, res) => {
    try {
        const stationId = toId(req.params.stationId);

        if (!stationId) {
            return res.status(400).json({
                success: false,
                message: "Invalid station ID."
            });
        }

        /*
         * Check whether station exists.
         */
        const [stations] = await pool.query(
            `
            SELECT
                id,
                station_name,
                rating
            FROM charging_stations
            WHERE id = ?
            LIMIT 1
            `,
            [stationId]
        );

        if (stations.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Charging station not found."
            });
        }

        /*
         * Fetch reviews.
         */
        const [reviews] = await pool.query(
            `
            SELECT
                r.id,
                r.booking_id,
                r.user_id,
                r.station_id,
                r.rating,
                r.charging_speed_rating,
                r.availability_rating,
                r.cleanliness_rating,
                r.staff_rating,
                r.comment,
                r.created_at,
                u.name AS user_name
            FROM reviews r
            LEFT JOIN users u
                ON u.id = r.user_id
            WHERE r.station_id = ?
            ORDER BY r.created_at DESC
            `,
            [stationId]
        );

        /*
         * Calculate rating summary.
         *
         * COALESCE is used so that stations with no reviews
         * still return 0 instead of NULL.
         */
        const [summaryRows] = await pool.query(
            `
            SELECT
                COUNT(*) AS total_reviews,

                ROUND(AVG(rating), 1) AS overall_rating,

                ROUND(
                    AVG(charging_speed_rating),
                    1
                ) AS charging_speed_rating,

                ROUND(
                    AVG(availability_rating),
                    1
                ) AS availability_rating,

                ROUND(
                    AVG(cleanliness_rating),
                    1
                ) AS cleanliness_rating,

                ROUND(
                    AVG(staff_rating),
                    1
                ) AS staff_rating

            FROM reviews
            WHERE station_id = ?
            `,
            [stationId]
        );

        const summary = summaryRows[0] || {};

        const totalReviews = Number(summary.total_reviews || 0);

        const overallRating =
            totalReviews > 0
                ? Number(summary.overall_rating || 0)
                : Number(stations[0].rating || 0);

        const ratingSummary = {
            total_reviews: totalReviews,

            overall_rating: Number(
                overallRating.toFixed(1)
            ),

            charging_speed_rating:
                totalReviews > 0
                    ? Number(
                        Number(
                            summary.charging_speed_rating || 0
                        ).toFixed(1)
                    )
                    : 0,

            availability_rating:
                totalReviews > 0
                    ? Number(
                        Number(
                            summary.availability_rating || 0
                        ).toFixed(1)
                    )
                    : 0,

            cleanliness_rating:
                totalReviews > 0
                    ? Number(
                        Number(
                            summary.cleanliness_rating || 0
                        ).toFixed(1)
                    )
                    : 0,

            staff_rating:
                totalReviews > 0
                    ? Number(
                        Number(
                            summary.staff_rating || 0
                        ).toFixed(1)
                    )
                    : 0
        };

        return res.status(200).json({
            success: true,

            station: {
                id: stations[0].id,
                station_name: stations[0].station_name,
                rating: Number(stations[0].rating || 0)
            },

            summary: ratingSummary,

            reviews: reviews.map((review) => ({
                id: review.id,
                booking_id: review.booking_id,
                user_id: review.user_id,
                station_id: review.station_id,

                rating: Number(review.rating),

                charging_speed_rating:
                    review.charging_speed_rating !== null
                        ? Number(review.charging_speed_rating)
                        : Number(review.rating),

                availability_rating:
                    review.availability_rating !== null
                        ? Number(review.availability_rating)
                        : Number(review.rating),

                cleanliness_rating:
                    review.cleanliness_rating !== null
                        ? Number(review.cleanliness_rating)
                        : Number(review.rating),

                staff_rating:
                    review.staff_rating !== null
                        ? Number(review.staff_rating)
                        : Number(review.rating),

                comment: review.comment || "",

                user_name:
                    review.user_name || "EV Charge Hub User",

                created_at: review.created_at
            }))
        });

    } catch (error) {
        console.error(
            "Get Station Reviews Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch station reviews."
        });
    }
};


/**
 * POST
 * /api/reviews
 *
 * Add a review for a completed charging booking.
 *
 * Expected body:
 *
 * {
 *   booking_id: 4,
 *   station_id: 1,
 *   rating: 5,
 *   charging_speed_rating: 5,
 *   availability_rating: 4,
 *   cleanliness_rating: 5,
 *   staff_rating: 5,
 *   comment: "Excellent charging experience."
 * }
 */
export const addReview = async (req, res) => {
    let connection;

    try {
        /*
         * Authentication middleware should provide req.user.
         */
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const userId = toId(
            req.user.id ||
            req.user.user_id ||
            req.user.userId
        );

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid authenticated user."
            });
        }

        const bookingId = toId(req.body.booking_id);
        const stationId = toId(req.body.station_id);

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required."
            });
        }

        if (!stationId) {
            return res.status(400).json({
                success: false,
                message: "Valid station ID is required."
            });
        }

        /*
         * Overall rating.
         */
        const rating = normalizeRating(
            req.body.rating
        );

        if (!rating) {
            return res.status(400).json({
                success: false,
                message: "Overall rating must be between 1 and 5."
            });
        }

        /*
         * Category ratings.
         *
         * If the frontend does not send a category rating,
         * use the overall rating for backward compatibility.
         */
        const chargingSpeedRating =
            req.body.charging_speed_rating !== undefined &&
            req.body.charging_speed_rating !== null &&
            req.body.charging_speed_rating !== ""
                ? normalizeRating(
                    req.body.charging_speed_rating
                )
                : rating;

        const availabilityRating =
            req.body.availability_rating !== undefined &&
            req.body.availability_rating !== null &&
            req.body.availability_rating !== ""
                ? normalizeRating(
                    req.body.availability_rating
                )
                : rating;

        const cleanlinessRating =
            req.body.cleanliness_rating !== undefined &&
            req.body.cleanliness_rating !== null &&
            req.body.cleanliness_rating !== ""
                ? normalizeRating(
                    req.body.cleanliness_rating
                )
                : rating;

        const staffRating =
            req.body.staff_rating !== undefined &&
            req.body.staff_rating !== null &&
            req.body.staff_rating !== ""
                ? normalizeRating(
                    req.body.staff_rating
                )
                : rating;

        if (
            !isValidRating(chargingSpeedRating) ||
            !isValidRating(availabilityRating) ||
            !isValidRating(cleanlinessRating) ||
            !isValidRating(staffRating)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "All category ratings must be between 1 and 5."
            });
        }

        /*
         * Comment is optional.
         */
        const comment =
            typeof req.body.comment === "string"
                ? req.body.comment.trim()
                : "";

        /*
         * Prevent extremely large comments.
         */
        if (comment.length > 2000) {
            return res.status(400).json({
                success: false,
                message:
                    "Review comment cannot exceed 2000 characters."
            });
        }

        /*
         * Get booking.
         */
        const [bookings] = await pool.query(
            `
            SELECT
                id,
                user_id,
                station_id,
                booking_date,
                start_time,
                end_time,
                status
            FROM bookings
            WHERE id = ?
            LIMIT 1
            `,
            [bookingId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found."
            });
        }

        const booking = bookings[0];

        /*
         * Make sure booking belongs to logged-in user.
         */
        if (Number(booking.user_id) !== Number(userId)) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not authorized to review this booking."
            });
        }

        /*
         * Make sure booking belongs to selected station.
         */
        if (Number(booking.station_id) !== Number(stationId)) {
            return res.status(400).json({
                success: false,
                message:
                    "Booking does not belong to this charging station."
            });
        }

        /*
         * Cancelled bookings cannot be reviewed.
         */
        const bookingStatus = String(
            booking.status || ""
        ).toLowerCase();

        if (
            bookingStatus === "cancelled" ||
            bookingStatus === "canceled"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cancelled bookings cannot be reviewed."
            });
        }

        /*
         * A review can only be submitted after
         * the charging session has completed.
         */
        const sessionEnded = hasSessionEnded(
            booking.booking_date,
            booking.end_time
        );

        if (
            bookingStatus !== "completed" &&
            !sessionEnded
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "You can submit a review only after your charging session is completed."
            });
        }

        /*
         * If the end time has passed but status was not
         * automatically updated, mark the booking Completed.
         */
        if (
            sessionEnded &&
            bookingStatus !== "completed"
        ) {
            await pool.query(
                `
                UPDATE bookings
                SET status = 'Completed'
                WHERE id = ?
                `,
                [bookingId]
            );
        }

        /*
         * Prevent duplicate review for the same booking.
         */
        const [existingReviews] = await pool.query(
            `
            SELECT id
            FROM reviews
            WHERE booking_id = ?
            LIMIT 1
            `,
            [bookingId]
        );

        if (existingReviews.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "You have already submitted a review for this charging session."
            });
        }

        /*
         * Confirm station exists.
         */
        const [stations] = await pool.query(
            `
            SELECT id
            FROM charging_stations
            WHERE id = ?
            LIMIT 1
            `,
            [stationId]
        );

        if (stations.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Charging station not found."
            });
        }

        /*
         * Start transaction.
         */
        connection = await pool.getConnection();

        await connection.beginTransaction();

        /*
         * Insert review.
         */
        await connection.query(
            `
            INSERT INTO reviews
            (
                booking_id,
                user_id,
                station_id,
                rating,
                charging_speed_rating,
                availability_rating,
                cleanliness_rating,
                staff_rating,
                comment
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                bookingId,
                userId,
                stationId,
                rating,
                chargingSpeedRating,
                availabilityRating,
                cleanlinessRating,
                staffRating,
                comment || null
            ]
        );

        /*
         * Recalculate station overall rating.
         *
         * Only the overall rating is used for the main
         * station rating.
         */
        const [ratingRows] = await connection.query(
            `
            SELECT
                AVG(rating) AS average_rating,
                COUNT(*) AS total_reviews
            FROM reviews
            WHERE station_id = ?
            `,
            [stationId]
        );

        const averageRating = Number(
            ratingRows[0]?.average_rating || 0
        );

        const roundedRating = Number(
            averageRating.toFixed(1)
        );

        /*
         * Update charging station rating.
         */
        await connection.query(
            `
            UPDATE charging_stations
            SET rating = ?
            WHERE id = ?
            `,
            [
                roundedRating,
                stationId
            ]
        );

        await connection.commit();

        connection.release();
        connection = null;

        /*
         * Get updated summary.
         */
        const [summaryRows] = await pool.query(
            `
            SELECT
                COUNT(*) AS total_reviews,

                ROUND(AVG(rating), 1) AS overall_rating,

                ROUND(
                    AVG(charging_speed_rating),
                    1
                ) AS charging_speed_rating,

                ROUND(
                    AVG(availability_rating),
                    1
                ) AS availability_rating,

                ROUND(
                    AVG(cleanliness_rating),
                    1
                ) AS cleanliness_rating,

                ROUND(
                    AVG(staff_rating),
                    1
                ) AS staff_rating

            FROM reviews
            WHERE station_id = ?
            `,
            [stationId]
        );

        const summary = summaryRows[0] || {};

        return res.status(201).json({
            success: true,
            message: "Review submitted successfully.",

            review: {
                booking_id: bookingId,
                station_id: stationId,
                rating,
                charging_speed_rating:
                    chargingSpeedRating,
                availability_rating:
                    availabilityRating,
                cleanliness_rating:
                    cleanlinessRating,
                staff_rating:
                    staffRating,
                comment
            },

            summary: {
                total_reviews: Number(
                    summary.total_reviews || 0
                ),

                overall_rating: Number(
                    Number(
                        summary.overall_rating || 0
                    ).toFixed(1)
                ),

                charging_speed_rating: Number(
                    Number(
                        summary.charging_speed_rating || 0
                    ).toFixed(1)
                ),

                availability_rating: Number(
                    Number(
                        summary.availability_rating || 0
                    ).toFixed(1)
                ),

                cleanliness_rating: Number(
                    Number(
                        summary.cleanliness_rating || 0
                    ).toFixed(1)
                ),

                staff_rating: Number(
                    Number(
                        summary.staff_rating || 0
                    ).toFixed(1)
                )
            }
        });

    } catch (error) {

        /*
         * Rollback transaction if something fails.
         */
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Review rollback error:",
                    rollbackError
                );
            }

            connection.release();
        }

        /*
         * MySQL duplicate entry protection.
         */
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message:
                    "You have already submitted a review for this booking."
            });
        }

        console.error(
            "Add Review Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to submit review."
        });
    }
};