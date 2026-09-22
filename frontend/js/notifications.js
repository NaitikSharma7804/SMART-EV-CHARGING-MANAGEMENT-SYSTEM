// frontend/js/notifications.js
/**
 * EV Charge Hub - Notification System
 * Features:
 * - Navbar bell with unread badge (e.g. 🔔 3)
 * - Rich animated dropdown panel
 * - Notification types:
 *     ✓ Booking confirmed (Shastri Nagar • CH-01)
 *     ⚡ Charging session started (Your vehicle is now charging)
 *     ⏰ Booking reminder (Your charging slot starts in 30 minutes)
 *     ✓ Payment successful (₹250 received)
 * - Mark as read (individual and all)
 * - API sync with localStorage fallback
 */

(function () {
    'use strict';

    const API_BASE = 'http://localhost:5000/api';
    const STORAGE_KEY = 'ev_notifications_data';

    // Default notifications matching user's exact specification
    const DEFAULT_NOTIFICATIONS = [
        {
            id: 'demo-1',
            title: 'Booking confirmed',
            message: 'Shastri Nagar • CH-01',
            type: 'booking',
            is_read: false,
            created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
            id: 'demo-2',
            title: 'Charging session started',
            message: 'Your vehicle is now charging',
            type: 'charging',
            is_read: false,
            created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
        },
        {
            id: 'demo-3',
            title: 'Booking reminder',
            message: 'Your charging slot starts in 30 minutes',
            type: 'reminder',
            is_read: false,
            created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString()
        },
        {
            id: 'demo-4',
            title: 'Payment successful',
            message: '₹250 received',
            type: 'payment',
            is_read: true,
            created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString()
        }
    ];

    let notifications = [];
    let isOpen = false;
    let currentFilter = 'all'; // 'all' or 'unread'

    // =========================================================
    // INJECT NOTIFICATION STYLES
    // =========================================================
    function injectStyles() {
        if (document.getElementById('ev-notif-styles')) return;

        const style = document.createElement('style');
        style.id = 'ev-notif-styles';
        style.textContent = `
            /* Bell Trigger & Wrapper */
            .ev-notif-wrapper {
                position: relative;
                display: inline-flex;
                align-items: center;
                margin: 0 4px;
                font-family: Inter, system-ui, -apple-system, sans-serif;
            }

            .ev-notif-trigger {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 9999px;
                padding: 7px 14px;
                font-size: 14px;
                font-weight: 600;
                color: #1e293b;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                user-select: none;
                height: 38px;
            }

            .ev-notif-trigger:hover {
                background: #f8fafc;
                border-color: #cbd5e1;
                transform: translateY(-1px);
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
            }

            .ev-notif-trigger:active {
                transform: translateY(0);
            }

            .ev-notif-bell-icon {
                font-size: 16px;
                line-height: 1;
                display: inline-block;
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .ev-notif-trigger:hover .ev-notif-bell-icon {
                transform: rotate(12deg) scale(1.1);
            }

            .ev-notif-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 19px;
                height: 19px;
                padding: 0 5px;
                font-size: 11px;
                font-weight: 700;
                color: #ffffff;
                background: #16a34a; /* EV Charge Hub green */
                border-radius: 9999px;
                line-height: 1;
                box-shadow: 0 2px 5px rgba(22, 163, 74, 0.35);
                transition: all 0.2s ease;
            }

            .ev-notif-badge.has-unread {
                background: #dc2626; /* Vibrant red for unread */
                box-shadow: 0 2px 6px rgba(220, 38, 38, 0.4);
                animation: notifPulse 2.5s infinite;
            }

            @keyframes notifPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.08); }
            }

            /* Dropdown Panel */
            .ev-notif-dropdown {
                position: absolute;
                top: calc(100% + 12px);
                right: 0;
                width: 375px;
                max-width: calc(100vw - 24px);
                background: #ffffff;
                border-radius: 18px;
                box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06);
                border: 1px solid #e2e8f0;
                z-index: 100000;
                display: flex;
                flex-direction: column;
                opacity: 0;
                transform: translateY(-10px) scale(0.97);
                pointer-events: none;
                transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                overflow: hidden;
            }

            .ev-notif-dropdown.active {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: auto;
            }

            /* Dropdown Header */
            .ev-notif-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 18px 12px;
                border-bottom: 1px solid #f1f5f9;
                background: #ffffff;
            }

            .ev-notif-header-title-area {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .ev-notif-header-title {
                margin: 0;
                font-size: 15px;
                font-weight: 700;
                color: #0f172a;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .ev-notif-header-pill {
                background: #eff6ff;
                color: #2563eb;
                font-size: 11px;
                font-weight: 700;
                padding: 2px 7px;
                border-radius: 9999px;
            }

            .ev-notif-mark-all-btn {
                background: none;
                border: none;
                color: #16a34a;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 6px;
                transition: background 0.15s ease;
            }

            .ev-notif-mark-all-btn:hover {
                background: #ecfdf3;
                text-decoration: underline;
            }

            /* Filter Tabs */
            .ev-notif-filters {
                display: flex;
                gap: 6px;
                padding: 8px 18px;
                background: #f8fafc;
                border-bottom: 1px solid #f1f5f9;
            }

            .ev-notif-filter-tab {
                background: none;
                border: none;
                font-size: 12px;
                font-weight: 600;
                padding: 4px 10px;
                border-radius: 9999px;
                color: #64748b;
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .ev-notif-filter-tab.active {
                background: #ffffff;
                color: #0f172a;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            }

            /* Notifications List */
            .ev-notif-list {
                max-height: 380px;
                overflow-y: auto;
                padding: 6px 0;
                margin: 0;
                list-style: none;
            }

            .ev-notif-list::-webkit-scrollbar {
                width: 6px;
            }

            .ev-notif-list::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 9999px;
            }

            /* Single Notification Item */
            .ev-notif-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 12px 18px;
                border-bottom: 1px solid #f8fafc;
                cursor: pointer;
                transition: background 0.15s ease;
                position: relative;
            }

            .ev-notif-item:last-child {
                border-bottom: none;
            }

            .ev-notif-item:hover {
                background: #f8fafc;
            }

            .ev-notif-item.unread {
                background: #fbfdfc;
            }

            .ev-notif-item.unread:hover {
                background: #f0fdf4;
            }

            /* Icon badges by notification type */
            .ev-notif-type-icon {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                font-weight: 700;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .ev-notif-type-booking {
                background: #dcfce7;
                color: #15803d;
            }

            .ev-notif-type-charging {
                background: #fef3c7;
                color: #b45309;
            }

            .ev-notif-type-reminder {
                background: #ede9fe;
                color: #6d28d9;
            }

            .ev-notif-type-payment {
                background: #ecfdf5;
                color: #047857;
            }

            .ev-notif-type-system {
                background: #e2e8f0;
                color: #475569;
            }

            /* Item Content */
            .ev-notif-content {
                flex: 1;
                min-width: 0;
            }

            .ev-notif-item-title {
                font-size: 13.5px;
                font-weight: 700;
                color: #0f172a;
                margin: 0 0 3px 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .ev-notif-item-message {
                font-size: 12.5px;
                color: #475569;
                margin: 0 0 5px 0;
                line-height: 1.4;
                word-break: break-word;
            }

            .ev-notif-item-time {
                font-size: 11px;
                color: #94a3b8;
                font-weight: 500;
            }

            /* Unread Indicator Dot */
            .ev-notif-unread-dot {
                width: 8px;
                height: 8px;
                background: #22c55e;
                border-radius: 50%;
                flex-shrink: 0;
                margin-top: 6px;
                box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
            }

            /* Empty State */
            .ev-notif-empty {
                padding: 36px 20px;
                text-align: center;
                color: #94a3b8;
            }

            .ev-notif-empty-icon {
                font-size: 32px;
                margin-bottom: 8px;
                opacity: 0.8;
            }

            .ev-notif-empty-text {
                font-size: 13px;
                font-weight: 500;
            }

            /* Dropdown Footer */
            .ev-notif-footer {
                padding: 10px 18px;
                background: #f8fafc;
                border-top: 1px solid #f1f5f9;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 12px;
            }

            .ev-notif-footer a {
                color: #16a34a;
                font-weight: 600;
                text-decoration: none;
            }

            .ev-notif-footer a:hover {
                text-decoration: underline;
            }

            .ev-notif-footer-status {
                color: #94a3b8;
            }

            @media (max-width: 480px) {
                .ev-notif-dropdown {
                    width: calc(100vw - 20px);
                    right: -10px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // =========================================================
    // TIME FORMATTER
    // =========================================================
    function formatTimeAgo(isoString) {
        if (!isoString) return 'Just now';
        const date = new Date(isoString);
        const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

        if (diffSeconds < 60) return 'Just now';
        const minutes = Math.floor(diffSeconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    // =========================================================
    // ICON & CLASS HELPER
    // =========================================================
    function getTypeDetails(type, title = '') {
        const lowerType = String(type || '').toLowerCase();
        const lowerTitle = String(title || '').toLowerCase();

        if (lowerType === 'booking' || lowerTitle.includes('booking confirmed')) {
            return { icon: '✓', className: 'ev-notif-type-booking' };
        }
        if (lowerType === 'charging' || lowerTitle.includes('charging')) {
            return { icon: '⚡', className: 'ev-notif-type-charging' };
        }
        if (lowerType === 'reminder' || lowerTitle.includes('reminder')) {
            return { icon: '⏰', className: 'ev-notif-type-reminder' };
        }
        if (lowerType === 'payment' || lowerTitle.includes('payment')) {
            return { icon: '✓', className: 'ev-notif-type-payment' };
        }
        return { icon: '🔔', className: 'ev-notif-type-system' };
    }

    // =========================================================
    // DATA PERSISTENCE & FETCHING
    // =========================================================
    function loadSavedNotifications() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {
            console.warn('Load notifications storage error:', e);
        }
        return null;
    }

    function saveNotifications(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Save notifications storage error:', e);
        }
    }

    async function fetchNotifications() {
        const token = localStorage.getItem('ev_token');

        // If user is logged in, attempt backend sync
        if (token) {
            try {
                const res = await fetch(`${API_BASE}/notifications`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.data)) {
                        notifications = data.data;
                        saveNotifications(notifications);
                        render();
                        return;
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch notifications from backend, using cached/demo:', err);
            }
        }

        // Fallback to localStorage or defaults
        const saved = loadSavedNotifications();
        if (saved && saved.length > 0) {
            notifications = saved;
        } else {
            notifications = [...DEFAULT_NOTIFICATIONS];
            saveNotifications(notifications);
        }

        render();
    }

    // =========================================================
    // MARK NOTIFICATIONS AS READ
    // =========================================================
    async function markNotificationAsRead(id) {
        const item = notifications.find(n => String(n.id) === String(id));
        if (!item || item.is_read) return;

        // Optimistic UI update
        item.is_read = true;
        saveNotifications(notifications);
        render();

        const token = localStorage.getItem('ev_token');
        if (token && !String(id).startsWith('demo-')) {
            try {
                await fetch(`${API_BASE}/notifications/${id}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) {
                console.warn('Failed to update notification read status on server:', err);
            }
        }
    }

    async function markAllNotificationsAsRead() {
        if (notifications.every(n => n.is_read)) return;

        // Optimistic UI update
        notifications.forEach(n => { n.is_read = true; });
        saveNotifications(notifications);
        render();

        const token = localStorage.getItem('ev_token');
        if (token) {
            try {
                await fetch(`${API_BASE}/notifications/read-all`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) {
                console.warn('Failed to mark all as read on server:', err);
            }
        }
    }

    // =========================================================
    // RENDER FUNCTION
    // =========================================================
    function render() {
        const trigger = document.getElementById('ev-notif-trigger');
        const badge = document.getElementById('ev-notif-badge');
        const dropdown = document.getElementById('ev-notif-dropdown');
        const list = document.getElementById('ev-notif-list');
        const headerPill = document.getElementById('ev-notif-header-pill');

        if (!trigger || !dropdown) return;

        const unreadCount = notifications.filter(n => !n.is_read).length;

        // Update badge
        if (badge) {
            badge.textContent = unreadCount;
            if (unreadCount > 0) {
                badge.classList.add('has-unread');
                badge.style.display = 'inline-flex';
            } else {
                badge.classList.remove('has-unread');
                badge.textContent = '0';
            }
        }

        // Update header pill
        if (headerPill) {
            headerPill.textContent = unreadCount > 0 ? `${unreadCount} new` : '0 new';
        }

        // Filter notifications
        const filtered = notifications.filter(n => {
            if (currentFilter === 'unread') return !n.is_read;
            return true;
        });

        // Render items
        if (list) {
            if (filtered.length === 0) {
                list.innerHTML = `
                    <li class="ev-notif-empty">
                        <div class="ev-notif-empty-icon">🔔</div>
                        <div class="ev-notif-empty-text">${currentFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</div>
                    </li>
                `;
            } else {
                list.innerHTML = filtered.map(item => {
                    const details = getTypeDetails(item.type, item.title);
                    const isUnread = !item.is_read;
                    const timeString = formatTimeAgo(item.created_at);

                    return `
                        <li class="ev-notif-item ${isUnread ? 'unread' : ''}" data-id="${item.id}" role="button" tabindex="0">
                            <div class="ev-notif-type-icon ${details.className}">
                                <span>${details.icon}</span>
                            </div>
                            <div class="ev-notif-content">
                                <h4 class="ev-notif-item-title">
                                    <span>${escapeHtml(item.title)}</span>
                                </h4>
                                <p class="ev-notif-item-message">${escapeHtml(item.message)}</p>
                                <span class="ev-notif-item-time">${timeString}</span>
                            </div>
                            ${isUnread ? '<span class="ev-notif-unread-dot" title="Unread"></span>' : ''}
                        </li>
                    `;
                }).join('');

                // Attach click handlers to each notification item
                list.querySelectorAll('.ev-notif-item').forEach(el => {
                    el.addEventListener('click', () => {
                        const id = el.getAttribute('data-id');
                        if (id) {
                            markNotificationAsRead(id);
                        }
                    });
                });
            }
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // =========================================================
    // MOUNT COMPONENT INTO NAVBAR
    // =========================================================
    function mount() {
        injectStyles();

        // Avoid duplicate mount
        if (document.getElementById('ev-notif-wrapper')) return;

        // Candidate nav containers
        const navContainer =
            document.querySelector('.premium-nav') ||
            document.querySelector('.nav-links') ||
            document.querySelector('.nav-actions') ||
            document.querySelector('.navbar');

        if (!navContainer) {
            // Retry after DOM settles
            setTimeout(mount, 200);
            return;
        }

        const bookingsHref = window.location.pathname.includes('/pages/') ? 'bookings.html' : 'pages/bookings.html';

        const wrapper = document.createElement('div');
        wrapper.id = 'ev-notif-wrapper';
        wrapper.className = 'ev-notif-wrapper';

        wrapper.innerHTML = `
            <button id="ev-notif-trigger" class="ev-notif-trigger" type="button" aria-label="Notifications" title="Notifications">
                <span class="ev-notif-bell-icon">🔔</span>
                <span id="ev-notif-badge" class="ev-notif-badge has-unread">3</span>
            </button>

            <div id="ev-notif-dropdown" class="ev-notif-dropdown" role="region" aria-label="Notifications dropdown">
                <div class="ev-notif-header">
                    <div class="ev-notif-header-title-area">
                        <h3 class="ev-notif-header-title">
                            <span>🔔</span> Notifications
                        </h3>
                        <span id="ev-notif-header-pill" class="ev-notif-header-pill">3 new</span>
                    </div>
                    <button id="ev-notif-mark-all" class="ev-notif-mark-all-btn" type="button">✓ Mark all read</button>
                </div>

                <div class="ev-notif-filters">
                    <button class="ev-notif-filter-tab active" data-filter="all" type="button">All</button>
                    <button class="ev-notif-filter-tab" data-filter="unread" type="button">Unread</button>
                </div>

                <ul id="ev-notif-list" class="ev-notif-list"></ul>

                <div class="ev-notif-footer">
                    <span class="ev-notif-footer-status">⚡ EV Charge Hub</span>
                    <a href="${bookingsHref}">View My Bookings →</a>
                </div>
            </div>
        `;

        // Insertion point: before logout button or at end of nav
        const logoutBtn =
            navContainer.querySelector('#logoutBtn') ||
            navContainer.querySelector('#navLogoutBtn') ||
            navContainer.querySelector('.logout-button') ||
            navContainer.querySelector('.logout-btn') ||
            navContainer.querySelector('a[onclick*="logout"]');

        if (logoutBtn) {
            navContainer.insertBefore(wrapper, logoutBtn);
        } else {
            navContainer.appendChild(wrapper);
        }

        // Event listeners
        const trigger = document.getElementById('ev-notif-trigger');
        const dropdown = document.getElementById('ev-notif-dropdown');
        const markAllBtn = document.getElementById('ev-notif-mark-all');
        const filterTabs = wrapper.querySelectorAll('.ev-notif-filter-tab');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            isOpen = !isOpen;
            dropdown.classList.toggle('active', isOpen);
        });

        markAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            markAllNotificationsAsRead();
        });

        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.getAttribute('data-filter') || 'all';
                render();
            });
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (isOpen && !wrapper.contains(e.target)) {
                isOpen = false;
                dropdown.classList.remove('active');
            }
        });

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                isOpen = false;
                dropdown.classList.remove('active');
            }
        });

        // Fetch notifications
        fetchNotifications();
    }

    // Expose global API
    window.EVNotifications = {
        fetch: fetchNotifications,
        markAsRead: markNotificationAsRead,
        markAllAsRead: markAllNotificationsAsRead,
        addNotification: function (item) {
            const newItem = {
                id: 'notif-' + Date.now(),
                title: item.title || 'New Notification',
                message: item.message || '',
                type: item.type || 'system',
                is_read: false,
                created_at: new Date().toISOString()
            };
            notifications.unshift(newItem);
            saveNotifications(notifications);
            render();
        }
    };

    // Auto-init on DOMContentLoaded or immediate
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();
