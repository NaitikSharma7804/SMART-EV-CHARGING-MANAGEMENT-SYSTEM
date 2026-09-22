/**
 * EV Charge Hub - Favorite Stations Helper
 * Centralizes favorite station management with local storage cache,
 * optimistic UI toggles, custom events, and backend sync.
 */

const EV_FAV_IDS_KEY = 'ev_favorite_station_ids';
const EV_FAV_STATIONS_KEY = 'ev_favorite_stations_data';
const EV_API_BASE = 'http://localhost:5000/api';

/**
 * Get cached favorite station IDs from localStorage
 * @returns {number[]}
 */
function getCachedFavoriteIds() {
    try {
        const stored = localStorage.getItem(EV_FAV_IDS_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch (_) {
        return [];
    }
}

/**
 * Get cached favorite station objects from localStorage
 * @returns {Array<object>}
 */
function getCachedFavoriteStations() {
    try {
        const stored = localStorage.getItem(EV_FAV_STATIONS_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

/**
 * Check synchronously if a station ID is favorited
 * @param {number|string} stationId
 * @returns {boolean}
 */
function isStationFavorite(stationId) {
    const numericId = Number(stationId);
    if (!numericId) return false;
    const ids = getCachedFavoriteIds();
    return ids.includes(numericId);
}

/**
 * Save favorite IDs to localStorage
 * @param {number[]} ids
 */
function setCachedFavoriteIds(ids) {
    try {
        const unique = Array.from(new Set(ids.map(Number).filter(id => id > 0)));
        localStorage.setItem(EV_FAV_IDS_KEY, JSON.stringify(unique));
    } catch (e) {
        console.warn('Failed to save favorite IDs to cache:', e);
    }
}

/**
 * Save favorite station objects to localStorage
 * @param {Array<object>} stations
 */
function setCachedFavoriteStations(stations) {
    try {
        if (!Array.isArray(stations)) return;
        localStorage.setItem(EV_FAV_STATIONS_KEY, JSON.stringify(stations));
    } catch (e) {
        console.warn('Failed to save favorite stations to cache:', e);
    }
}

/**
 * Fetch favorite stations (tries backend first if logged in, falls back to cache)
 * @returns {Promise<Array<object>>}
 */
async function fetchFavoriteStations() {
    const token = localStorage.getItem('ev_token');
    const cached = getCachedFavoriteStations();

    if (!token) {
        return cached;
    }

    try {
        const response = await fetch(`${EV_API_BASE}/stations/favorites`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const favorites = data.favorites || [];
            
            // Sync with local cache
            setCachedFavoriteStations(favorites);
            setCachedFavoriteIds(favorites.map(f => Number(f.id)));
            return favorites;
        }
    } catch (err) {
        console.warn('fetchFavoriteStations: falling back to cached favorites:', err);
    }

    return cached;
}

/**
 * Synchronize favorite IDs from the server if authenticated
 */
async function syncFavoriteStationIds() {
    const token = localStorage.getItem('ev_token');
    if (!token) return getCachedFavoriteIds();

    try {
        const response = await fetch(`${EV_API_BASE}/stations/favorites/ids`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.favoriteIds)) {
                setCachedFavoriteIds(data.favoriteIds);
                return data.favoriteIds;
            }
        }
    } catch (err) {
        console.warn('syncFavoriteStationIds error:', err);
    }

    return getCachedFavoriteIds();
}

/**
 * Toggle favorite status for a station
 * @param {number|string} stationId
 * @param {object} [stationData] - Optional details of the station
 * @returns {boolean} - New favorite state (true = favorited, false = unfavorited)
 */
async function toggleFavoriteStation(stationId, stationData = {}) {
    const numericId = Number(stationId);
    if (!numericId) return false;

    const currentIds = getCachedFavoriteIds();
    const isCurrentlyFav = currentIds.includes(numericId);
    const newFavState = !isCurrentlyFav;

    let updatedIds;
    let cachedStations = getCachedFavoriteStations();

    if (newFavState) {
        // Add to favorite IDs
        updatedIds = [...currentIds, numericId];
        
        // Add or update station info in cached stations
        const existingIdx = cachedStations.findIndex(s => Number(s.id) === numericId);
        const newStationRecord = {
            id: numericId,
            name: stationData.name || 'EV Charging Station',
            address: stationData.address || '',
            rating: stationData.rating || '4.8',
            operating_hours: stationData.operating_hours || '24/7',
            favorited_at: new Date().toISOString(),
            ...stationData
        };

        if (existingIdx >= 0) {
            cachedStations[existingIdx] = { ...cachedStations[existingIdx], ...newStationRecord };
        } else {
            cachedStations.unshift(newStationRecord);
        }
    } else {
        // Remove from favorite IDs
        updatedIds = currentIds.filter(id => id !== numericId);
        cachedStations = cachedStations.filter(s => Number(s.id) !== numericId);
    }

    setCachedFavoriteIds(updatedIds);
    setCachedFavoriteStations(cachedStations);

    // Dispatch global event for instant UI sync across components
    window.dispatchEvent(new CustomEvent('favoritesChanged', {
        detail: {
            stationId: numericId,
            isFavorite: newFavState,
            station: stationData
        }
    }));

    // Show interactive toast
    showFavoriteToast(
        newFavState 
            ? `♥ Saved "${stationData.name || 'Station'}" to Favorites` 
            : `♡ Removed "${stationData.name || 'Station'}" from Favorites`,
        newFavState
    );

    // Sync with backend asynchronously if logged in
    const token = localStorage.getItem('ev_token');
    if (token) {
        try {
            const method = newFavState ? 'POST' : 'DELETE';
            await fetch(`${EV_API_BASE}/stations/favorites/${numericId}`, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (err) {
            console.warn('Background favorite sync error:', err);
        }
    }

    return newFavState;
}

/**
 * Display a subtle, modern toast notification
 * @param {string} message 
 * @param {boolean} isAdd 
 */
function showFavoriteToast(message, isAdd = true) {
    let toast = document.getElementById('ev-favorite-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'ev-favorite-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            background: #0f172a;
            color: #ffffff;
            padding: 12px 18px;
            border-radius: 12px;
            font-size: 13.5px;
            font-weight: 600;
            font-family: Inter, system-ui, -apple-system, sans-serif;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 10px;
            transform: translateY(100px);
            opacity: 0;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
            pointer-events: none;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        document.body.appendChild(toast);
    }

    toast.innerHTML = `
        <span style="font-size: 16px; color: ${isAdd ? '#ef4444' : '#94a3b8'};">${isAdd ? '♥' : '♡'}</span>
        <span>${message}</span>
    `;

    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    if (window._favToastTimeout) clearTimeout(window._favToastTimeout);
    window._favToastTimeout = setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
    }, 2400);
}

// Auto-sync IDs on script load if token exists
if (typeof window !== 'undefined') {
    syncFavoriteStationIds();
}
