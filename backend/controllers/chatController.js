// backend/controllers/chatController.js
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { GoogleGenAI } from '@google/genai';
import pool from '../config/db.js';

const clientCache = new Map();

function getAiClient(apiKey) {
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) return null;
    const cleanKey = apiKey.trim();
    if (clientCache.has(cleanKey)) {
        return clientCache.get(cleanKey);
    }
    try {
        const client = new GoogleGenAI({ apiKey: cleanKey });
        clientCache.set(cleanKey, client);
        return client;
    } catch (e) {
        console.warn('GoogleGenAI initialization error:', e.message);
        return null;
    }
}

// Popular EV specs database for calculations
const EV_DATABASE = {
    'nexon': { name: 'Tata Nexon EV (Long Range)', battery: 40.5, connector: 'CCS2', maxDc: 50 },
    'nexon ev': { name: 'Tata Nexon EV (Long Range)', battery: 40.5, connector: 'CCS2', maxDc: 50 },
    'nexon ev max': { name: 'Tata Nexon EV Max', battery: 40.5, connector: 'CCS2', maxDc: 50 },
    'nexon ev prime': { name: 'Tata Nexon EV Prime', battery: 30.2, connector: 'CCS2', maxDc: 30 },
    'punch': { name: 'Tata Punch EV', battery: 35.0, connector: 'CCS2', maxDc: 50 },
    'punch ev': { name: 'Tata Punch EV', battery: 35.0, connector: 'CCS2', maxDc: 50 },
    'tiago': { name: 'Tata Tiago EV', battery: 24.0, connector: 'CCS2', maxDc: 25 },
    'tiago ev': { name: 'Tata Tiago EV', battery: 24.0, connector: 'CCS2', maxDc: 25 },
    'curvv': { name: 'Tata Curvv EV', battery: 55.0, connector: 'CCS2', maxDc: 70 },
    'curvv ev': { name: 'Tata Curvv EV', battery: 55.0, connector: 'CCS2', maxDc: 70 },
    'zs ev': { name: 'MG ZS EV', battery: 50.3, connector: 'CCS2', maxDc: 50 },
    'mg zs': { name: 'MG ZS EV', battery: 50.3, connector: 'CCS2', maxDc: 50 },
    'comet': { name: 'MG Comet EV', battery: 17.3, connector: 'Type 2', maxDc: 7.4 },
    'comet ev': { name: 'MG Comet EV', battery: 17.3, connector: 'Type 2', maxDc: 7.4 },
    'xuv400': { name: 'Mahindra XUV400', battery: 39.4, connector: 'CCS2', maxDc: 50 },
    'ioniq 5': { name: 'Hyundai Ioniq 5', battery: 72.6, connector: 'CCS2', maxDc: 230 },
    'byd atto 3': { name: 'BYD Atto 3', battery: 60.5, connector: 'CCS2', maxDc: 80 },
    'byd seal': { name: 'BYD Seal', battery: 82.5, connector: 'CCS2', maxDc: 150 },
    'ather 450x': { name: 'Ather 450X', battery: 3.7, connector: 'Type 2', maxDc: 3.3 },
    'ola s1 pro': { name: 'Ola S1 Pro', battery: 4.0, connector: 'Type 2', maxDc: 3.0 },
};

const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-3.6-flash'];

/**
 * Validate a Gemini API Key
 * POST /api/chat/validate-key
 */
export const validateApiKey = async (req, res) => {
    try {
        const apiKey = (req.body.apiKey || req.headers['x-gemini-api-key'] || '').trim();
        if (!apiKey) {
            return res.status(400).json({ success: false, message: 'API key is required' });
        }

        const client = new GoogleGenAI({ apiKey });
        for (const modelName of GEMINI_MODELS) {
            try {
                const response = await client.models.generateContent({
                    model: modelName,
                    contents: 'Hello'
                });
                if (response && response.text) {
                    return res.status(200).json({ success: true, message: `Gemini API key is valid and connected (${modelName})!` });
                }
            } catch (mErr) {
                // continue to next model
            }
        }
        return res.status(400).json({ success: false, message: 'Could not verify Gemini API key across available models' });
    } catch (err) {
        console.warn('API Key Validation Error:', err.message);
        return res.status(400).json({
            success: false,
            message: err.message || 'Invalid Gemini API key or quota exceeded'
        });
    }
};

/**
 * Handle POST /api/chat
 * General-purpose AI Chatbot with specialized live EV domain knowledge
 */
export const handleChat = async (req, res) => {
    try {
        const userMessage = (req.body.message || req.body.prompt || '').trim();
        if (!userMessage) {
            return res.status(400).json({ success: false, message: 'Message cannot be empty' });
        }

        const userId = req.user?.id || req.user?.userId;
        const customApiKey = (req.headers['x-gemini-api-key'] || req.body.apiKey || '').trim();
        const activeApiKey = customApiKey || process.env.GEMINI_API_KEY;
        const rawHistory = Array.isArray(req.body.history) ? req.body.history : [];

        // 1. Gather User Context (if authenticated)
        let userVehicles = [];
        let userBookings = [];
        let userName = 'User';

        if (userId) {
            try {
                const [userRows] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
                if (userRows.length > 0 && userRows[0].name) {
                    userName = userRows[0].name.split(' ')[0];
                }

                const [vehicles] = await pool.query(
                    'SELECT id, vehicle_name, vehicle_model, vehicle_name AS brand, vehicle_model AS model, vehicle_number, battery_capacity, connector_type FROM vehicles WHERE user_id = ?',
                    [userId]
                );
                userVehicles = vehicles;

                const [bookings] = await pool.query(`
                    SELECT b.id, b.booking_date, b.start_time, b.end_time, b.amount, b.status, 
                           s.name as station_name, s.address, c.charger_number, c.connector_type
                    FROM bookings b
                    JOIN charging_stations s ON b.station_id = s.id
                    JOIN chargers c ON b.charger_id = c.id
                    WHERE b.user_id = ?
                    ORDER BY b.booking_date DESC, b.start_time DESC
                    LIMIT 4
                `, [userId]);
                userBookings = bookings;
            } catch (err) {
                console.warn('Error retrieving user context for chat:', err.message);
            }
        }

        // 2. Fetch Active Stations & Live Charger Aggregations from DB
        let stations = [];
        try {
            const [stRows] = await pool.query(`
                SELECT 
                    s.id,
                    s.name,
                    s.address,
                    s.city,
                    s.operator_name,
                    s.is_24_hours,
                    s.rating,
                    s.total_reviews,
                    COUNT(c.id) AS total_chargers,
                    SUM(CASE WHEN LOWER(c.status) IN ('available', 'active') THEN 1 ELSE 0 END) AS available_chargers,
                    GROUP_CONCAT(DISTINCT c.connector_type) AS connectors,
                    GROUP_CONCAT(DISTINCT c.power_kw) AS powers,
                    MIN(c.price_per_hour) AS min_price,
                    MAX(c.price_per_hour) AS max_price,
                    (
                        SELECT GROUP_CONCAT(a.name SEPARATOR ', ')
                        FROM station_amenities sa
                        JOIN amenities a ON sa.amenity_id = a.id
                        WHERE sa.station_id = s.id
                    ) AS amenities
                FROM charging_stations s
                LEFT JOIN chargers c ON s.id = c.station_id
                WHERE s.status != 'Inactive'
                GROUP BY s.id
                ORDER BY s.rating DESC
            `);
            stations = stRows;
        } catch (stErr) {
            console.error('Error fetching stations for chat:', stErr.message);
        }

        // 3. Try Gemini AI Generation with Grounded Multi-Domain Context
        let aiReply = null;
        const clientToUse = getAiClient(activeApiKey);

        if (clientToUse) {
            try {
                const systemContext = buildSystemContext({
                    userName,
                    userVehicles,
                    userBookings,
                    stations
                });

                // Prepare multi-turn contents
                const contents = [];

                if (rawHistory && rawHistory.length > 0) {
                    // Include up to 6 recent turns for context
                    const recentTurns = rawHistory.slice(-6);
                    recentTurns.forEach((turn, idx) => {
                        if (turn.text && turn.role) {
                            let textContent = turn.text;
                            // Prepend system instruction to very first user turn
                            if (idx === 0) {
                                textContent = `${systemContext}\n\nUser: ${textContent}`;
                            }
                            contents.push({
                                role: turn.role === 'user' ? 'user' : 'model',
                                parts: [{ text: textContent }]
                            });
                        }
                    });
                }

                // Append current user message
                if (contents.length === 0) {
                    contents.push({
                        role: 'user',
                        parts: [{ text: `${systemContext}\n\nUser Question: ${userMessage}` }]
                    });
                } else {
                    contents.push({
                        role: 'user',
                        parts: [{ text: userMessage }]
                    });
                }

                for (const modelName of GEMINI_MODELS) {
                    try {
                        const response = await clientToUse.models.generateContent({
                            model: modelName,
                            contents: contents
                        });

                        if (response && response.text) {
                            aiReply = response.text;
                            req._geminiQuotaExceeded = false;
                            break;
                        }
                    } catch (mErr) {
                        console.warn(`Gemini model ${modelName} error:`, mErr.message?.slice(0, 100));
                        if (mErr.message && (mErr.message.includes('429') || mErr.message.includes('RESOURCE_EXHAUSTED') || mErr.message.includes('quota') || mErr.message.includes('Quota exceeded'))) {
                            req._geminiQuotaExceeded = true;
                        }
                    }
                }
            } catch (clientErr) {
                console.warn('Gemini client error:', clientErr.message);
            }
        }

        // 4. Intelligent Fallback Engine (Covers EV math, stations, plus general knowledge & conversation)
        if (!aiReply) {
            aiReply = generateDeterministicReply({
                userMessage,
                userVehicles,
                userBookings,
                stations,
                userName,
                hasCustomKey: Boolean(customApiKey),
                isQuotaExceeded: Boolean(req._geminiQuotaExceeded)
            });
        }

        return res.status(200).json({
            success: true,
            reply: aiReply,
            customKeyUsed: Boolean(customApiKey),
            quotaExceeded: Boolean(req._geminiQuotaExceeded),
            userContext: {
                hasVehicle: userVehicles.length > 0,
                vehicleModel: userVehicles[0]?.model || userVehicles[0]?.vehicle_model || null
            }
        });

    } catch (error) {
        console.error('AI Chat Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate assistant response'
        });
    }
};

/**
 * Build universal system prompt for Gemini
 */
function buildSystemContext({ userName, userVehicles, userBookings, stations }) {
    const stationsSummary = stations.map(s => 
        `- ID ${s.id}: "${s.name}" in ${s.address}, ${s.city}. Connectors: [${s.connectors || 'CCS2'}]. Max Power: ${Math.max(...(s.powers ? s.powers.split(',').map(Number) : [60]))}kW. Price: ₹${s.min_price || 15} - ₹${s.max_price || 20}/hr. Live Status: ${s.available_chargers} available. Rating: ★${s.rating}. Amenities: ${s.amenities || 'Parking'}.`
    ).join('\n');

    const vehicleSummary = userVehicles.length > 0
        ? userVehicles.map(v => `${v.brand || v.vehicle_name} ${v.model || v.vehicle_model} (${v.vehicle_number}, Battery: ${v.battery_capacity} kWh, Connector: ${v.connector_type})`).join('; ')
        : 'None registered (guest session)';

    const bookingSummary = userBookings.length > 0
        ? userBookings.map(b => `${b.booking_date} ${b.start_time}: ${b.station_name} (${b.connector_type}, ₹${b.amount}, Status: ${b.status})`).join('; ')
        : 'No recent bookings recorded';

    return `You are "ChargeBot AI", a versatile, brilliant, and friendly AI assistant.

CORE INSTRUCTIONS & PERSONA:
1. UNIVERSAL AI CAPABILITIES:
   - You can answer ANY question the user asks across ANY topic or field!
   - You excel in:
     • General knowledge, history, geography, science, culture, current concepts
     • Programming, software engineering, algorithms, web development, code debugging (Python, JS, SQL, etc.)
     • Mathematics, physics, calculations, logic puzzles
     • Writing, rewriting, summaries, emails, essays, poems, casual conversation
     • Travel recommendations, Pune city local attractions, hotels, road trip itineraries
   - CRITICAL RULE FOR GENERAL QUESTIONS:
     When the user asks general, non-EV questions (e.g. "What is Dijkstra algorithm?", "How does photosynthesis work?", "Write a poem about rain", "What is the capital of Japan?"):
     Answer naturally, thoroughly, and insightfully. DO NOT force EV charging station plugs, links, or EV disclaimers into answers that have nothing to do with EV charging!

2. SPECIALIZED EV CHARGING SUPERPOWERS (WHEN EV/TRAVEL IS RELEVANT):
   - You have exclusive live database access to the EV Charge Hub network in Pune, India:
     • Driver Name: ${userName}
     • Registered Vehicles: ${vehicleSummary}
     • Recent Bookings: ${bookingSummary}
     • Live Pune Network Stations (${stations.length} total stations):
${stationsSummary}

   - EV Battery Specifications Reference:
     • Tata Nexon EV / Max: 40.5 kWh, CCS2, ~50-60kW DC Fast Charge
     • Tata Nexon EV Prime: 30.2 kWh, CCS2
     • Tata Punch EV: 35 kWh (Long Range) / 25 kWh (Standard), CCS2
     • Tata Tiago EV: 24 kWh, CCS2
     • Tata Curvv EV: 55 kWh, CCS2
     • MG ZS EV: 50.3 kWh, CCS2
     • MG Comet EV: 17.3 kWh, Type 2
     • Mahindra XUV400: 39.4 kWh, CCS2
     • Hyundai Ioniq 5: 72.6 kWh, CCS2 (up to 230kW Ultra-Fast)
     • BYD Atto 3: 60.5 kWh, CCS2 | BYD Seal: 82.5 kWh, CCS2
     • Ather 450X: 3.7 kWh | Ola S1 Pro: 4.0 kWh

   - EV Guidelines:
     • When asked to find or recommend chargers (e.g. "Recommend a station for me", "Find me a charger near Hinjewadi with CCS2 under ₹20/hour", "What is the best station?"):
       Recommend the top matching stations from the LIVE NETWORK STATIONS above using multi-factor criteria (Connector compatibility, live availability, power, distance, price, rating).
       Provide a transparent "Why recommended?" checklist for each pick:
       ✓ Compatible with your [Vehicle] ([Connector])
       ✓ [X] chargers currently available
       ✓ Fast charging ([Power] kW)
       ✓ Within your preferred price (₹[Price]/hr)
       ✓ Top-rated station ([Rating] ★)
       Include station name, location, connector types, max speed in kW, price per hour, live availability, and ALWAYS include a clickable Markdown booking link: [Book Slot](pages/booking.html?station_id=ID) using the exact station ID.
     • When asked about charging costs or battery percentages (e.g. "How much will it cost to charge my Nexon EV from 20% to 80%?"):
       Calculate: Energy required (kWh) = Battery * (Target% - Current%) / 100.
       Calculate: Estimated cost = Energy required * benchmark rate (~₹15/kWh).
       Estimate charging duration on DC Fast (~25-35 mins) vs AC Standard (~3.5 hrs).
     • When asked about "my vehicle" or "my bookings", use the Driver Context above.

3. TONE & FORMATTING:
   - Provide structured, beautiful Markdown with clear bold highlights, bullet points, and code blocks.
   - Be helpful, clear, and polite at all times.`;
}

/**
 * Deterministic Fallback Engine
 * Handles EV math, live stations, greetings, and common general queries if API is offline
 */
function generateDeterministicReply({ userMessage, userVehicles, userBookings, stations, userName, hasCustomKey, isQuotaExceeded }) {
    const q = userMessage.toLowerCase().trim();

    // 1. Cost / Battery calculation query (e.g., "cost to charge my Nexon EV from 20% to 80%")
    if (q.includes('cost') || q.includes('how much') || q.includes('charge my') || q.includes('battery') || q.includes('%')) {
        let matchedCar = null;
        for (const [key, spec] of Object.entries(EV_DATABASE)) {
            if (q.includes(key)) {
                matchedCar = spec;
                break;
            }
        }

        // If no car in query, check user registered vehicle
        if (!matchedCar && userVehicles.length > 0) {
            const v = userVehicles[0];
            matchedCar = {
                name: `${v.brand || v.vehicle_name} ${v.model || v.vehicle_model}`,
                battery: Number(v.battery_capacity) || 40.5,
                connector: v.connector_type || 'CCS2',
                maxDc: 50
            };
        }

        // Default to Nexon EV if not specified
        if (!matchedCar) {
            matchedCar = EV_DATABASE['nexon'];
        }

        // Parse percentages (e.g., 20% to 80%)
        const percentMatches = q.match(/(\d+)\s*%/g);
        let fromPct = 20;
        let toPct = 80;

        if (percentMatches && percentMatches.length >= 2) {
            fromPct = parseInt(percentMatches[0]);
            toPct = parseInt(percentMatches[1]);
        } else if (q.includes('full') || q.includes('100')) {
            toPct = 100;
        }

        const delta = Math.max(1, toPct - fromPct);
        const energyNeeded = (matchedCar.battery * (delta / 100)).toFixed(1);
        const avgRate = 15.00; // ₹15 per kWh / unit
        const estCost = (energyNeeded * avgRate).toFixed(2);
        const estMinutesFast = Math.round((energyNeeded / (matchedCar.maxDc || 50)) * 60) + 10;
        const estHoursAc = (energyNeeded / 7.2).toFixed(1);

        return `🔋 **Charging Cost & Time Estimate for ${matchedCar.name}**\n\n` +
            `• **Battery Capacity:** ${matchedCar.battery} kWh\n` +
            `• **Charging Span:** ${fromPct}% ➔ ${toPct}% (+${delta}% state of charge)\n` +
            `• **Energy Required:** **${energyNeeded} kWh**\n` +
            `• **Estimated Energy Cost:** **₹${estCost}** (at benchmark rate of ₹${avgRate}/kWh)\n\n` +
            `⏱️ **Estimated Duration:**\n` +
            `• **DC Fast Charger (60kW+):** ~${estMinutesFast} mins\n` +
            `• **AC Standard Charger (7.2kW):** ~${estHoursAc} hours\n\n` +
            `Would you like me to find a fast ${matchedCar.connector} charging station near your location?`;
    }

    // 2. Station recommendation query (e.g. "Find me a charger near Hinjewadi with CCS2 under 20")
    if (q.includes('find') || q.includes('charger') || q.includes('station') || q.includes('near') || q.includes('hinjewadi') || q.includes('kothrud') || q.includes('ccs2') || q.includes('chademo')) {
        let matching = stations.slice();

        // Location filtering
        const areas = ['hinjewadi', 'kothrud', 'aundh', 'wakad', 'baner', 'magarpatta', 'pimpri', 'swargate', 'camp', 'viman nagar', 'kharadi', 'chakan', 'urse', 'expressway', 'bavdhan', 'senapati bapat', 'kalyani nagar'];
        for (const area of areas) {
            if (q.includes(area)) {
                matching = matching.filter(s => 
                    s.name.toLowerCase().includes(area) || s.address.toLowerCase().includes(area)
                );
                break;
            }
        }

        // Connector filtering
        if (q.includes('ccs2')) {
            matching = matching.filter(s => (s.connectors || '').toLowerCase().includes('ccs2'));
        } else if (q.includes('chademo')) {
            matching = matching.filter(s => (s.connectors || '').toLowerCase().includes('chademo'));
        } else if (q.includes('gb/t') || q.includes('gbt')) {
            matching = matching.filter(s => (s.connectors || '').toLowerCase().includes('gb/t'));
        } else if (q.includes('type 2') || q.includes('type2')) {
            matching = matching.filter(s => (s.connectors || '').toLowerCase().includes('type 2'));
        }

        // Price filtering (e.g., "under 20" or "under ₹20")
        const priceMatch = q.match(/under\s*₹?\s*(\d+)/);
        if (priceMatch) {
            const maxP = Number(priceMatch[1]);
            matching = matching.filter(s => Number(s.min_price || 0) <= maxP);
        }

        if (matching.length === 0) {
            matching = stations.slice(0, 3);
        }

        const top = matching.slice(0, 3);

        let reply = `⚡ **I found ${matching.length} station${matching.length > 1 ? 's' : ''} matching your requirements:**\n\n`;
        top.forEach((s, i) => {
            const maxPower = Math.max(...(s.powers ? s.powers.split(',').map(Number) : [60]));
            reply += `**${i + 1}. ${s.name}**\n` +
                `• **Location:** ${s.address}\n` +
                `• **Connectors:** ${s.connectors || 'CCS2'} (Up to ${maxPower} kW)\n` +
                `• **Price:** ₹${s.min_price || 15} - ₹${s.max_price || 20}/hr\n` +
                `• **Live Status:** ${s.available_chargers > 0 ? `🟢 ${s.available_chargers} Available` : '🔴 Busy'} | ★${s.rating}\n` +
                `👉 [Book Slot at this Station](pages/booking.html?station_id=${s.id})\n\n`;
        });

        reply += `You can view all stations on the [Find Chargers Page](pages/search.html).`;
        return reply;
    }

    // 3. User Vehicle query
    if (q.includes('my vehicle') || q.includes('my car') || q.includes('vehicle registered')) {
        if (userVehicles.length > 0) {
            let resText = `🚗 **Your Registered Vehicle${userVehicles.length > 1 ? 's' : ''}:**\n\n`;
            userVehicles.forEach(v => {
                resText += `• **${v.brand || v.vehicle_name} ${v.model || v.vehicle_model}** (${v.vehicle_number})\n` +
                    `  - Battery: **${v.battery_capacity} kWh**\n` +
                    `  - Fast Charge Port: **${v.connector_type}**\n\n`;
            });
            return resText;
        } else {
            return `You don't have a vehicle saved in your account yet. You can add your EV in the [Vehicles Tab](pages/vehicles.html) to get personalized range and charging insights!`;
        }
    }

    // 4. User Bookings query
    if (q.includes('my booking') || q.includes('bookings') || q.includes('reservation')) {
        if (userBookings.length > 0) {
            let resText = `📅 **Your Recent Charging Bookings:**\n\n`;
            userBookings.forEach(b => {
                resText += `• **${b.station_name}**\n` +
                    `  - Date & Time: ${b.booking_date} at ${b.start_time}\n` +
                    `  - Slot: ${b.charger_number} (${b.connector_type})\n` +
                    `  - Status: **${b.status}** (₹${b.amount})\n\n`;
            });
            resText += `View and manage all reservations in [My Bookings](pages/bookings.html).`;
            return resText;
        } else {
            return `You have no recent bookings. Would you like to reserve a charging slot for today? I can help you find a station!`;
        }
    }

    // 5. Basic Math / Expressions (e.g. "what is 25 * 4")
    const mathMatch = q.match(/(?:what is|calculate|solve)?\s*([0-9\.\s\+\-\*\/\(\)\%]+)/);
    if (mathMatch && mathMatch[1] && mathMatch[1].trim().length >= 3 && /[\+\-\*\/]/.test(mathMatch[1])) {
        try {
            const expr = mathMatch[1].replace(/[^0-9\.\+\-\*\/]/g, '');
            const result = Function(`'use strict'; return (${expr})`)();
            if (typeof result === 'number' && !isNaN(result)) {
                return `The result of \`${expr}\` is **${result}**.`;
            }
        } catch (e) {
            // ignore math eval
        }
    }

    // 6. Greetings & General conversation
    if (q === 'hi' || q === 'hello' || q === 'hey' || q.startsWith('hello') || q.startsWith('hi ')) {
        return `Hello ${userName}! 👋 I am **ChargeBot AI**, your intelligent assistant powered by Google Gemini.\n\n` +
            `You can ask me **any type of question**, including:\n` +
            `• 🌐 **General Knowledge & Science** (*"Explain quantum computing"*, *"Why is the sky blue?"*)\n` +
            `• 💻 **Programming & Coding** (*"Write a python function to check prime numbers"*)\n` +
            `• ⚡ **EV Charging & Stations** (*"Find CCS2 chargers in Hinjewadi under ₹20/hr"*)\n` +
            `• 🔋 **Battery & Cost Math** (*"Cost to charge Nexon EV from 20% to 80%"*)\n` +
            `• 🗺️ **Travel & City Advice** (*"Plan a road trip from Pune to Lonavala"*)\n\n` +
            `What would you like to explore today?`;
    }

    // 7. General Knowledge / Fallback Response
    if (isQuotaExceeded && !hasCustomKey) {
        return `⚠️ **Server AI Quota Reached for Today**\n\n` +
            `The server's default shared Gemini API free-tier quota has been reached for today.\n\n` +
            `🔑 **You can connect your own free Gemini API Key in 30 seconds:**\n` +
            `1. Get a free API key at **[Google AI Studio](https://aistudio.google.com/app/apikey)**.\n` +
            `2. Click the **🔑 API Key** button in the chat header above.\n` +
            `3. Paste your key and click **Save Key**.\n\n` +
            `Once connected, you can ask **any type of question** (coding, general knowledge, math, science, etc.) without limits!`;
    }

    let fallbackText = `I am **ChargeBot AI**, your multi-purpose AI assistant!\n\n` +
        `I can help you with programming, general science, math, travel advice, everyday questions, and live EV charging station lookups.\n\n`;
    
    if (!hasCustomKey) {
        fallbackText += `💡 **Pro-Tip:** To enable unlimited, unrestricted AI reasoning on any topic, you can also link your personal **Google Gemini API Key** by clicking the **🔑 API Key** button in the chat header!`;
    } else {
        fallbackText += `Please feel free to ask your question in detail and I'll be glad to help!`;
    }

    return fallbackText;
}