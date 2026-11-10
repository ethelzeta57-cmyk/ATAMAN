/**
 * ATAMAN Admin — Real-Time Date, Clock & Notification Sync Engine
 * Synchronizes unread badges, live date scopes, and system alerts in real-time.
 */

(function () {
  'use strict';

  // 1. LIVE DATE & CLOCK CALCULATOR
  function getLiveDateLabels() {
    const now = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const day = now.getDate();
    const dayPadded = String(day).padStart(2, '0');
    
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
    const lastDayPadded = String(lastDayOfMonth).padStart(2, '0');

    return {
      today: `${shortMonths[monthIndex]} ${dayPadded}, ${year}`,
      thisMonth: `${shortMonths[monthIndex]} 01 – ${shortMonths[monthIndex]} ${lastDayPadded}, ${year}`,
      last7Days: `${shortMonths[monthIndex]} ${Math.max(1, day - 7)} – ${shortMonths[monthIndex]} ${dayPadded}, ${year}`,
      last30Days: `Last 30 Days (${shortMonths[monthIndex]} ${year})`,
      fullYear: `${year} Full Year`
    };
  }

  // 2. REAL-TIME UNREAD NOTIFICATION BADGE SYNC
  function updateNotifBadges() {
    // Get count from storage or default to 8 unread
    let unreadCount = 0;
    const stored = localStorage.getItem('ATAMAN_unread_notif_count');
    if (stored !== null) {
      unreadCount = parseInt(stored, 10);
      if (isNaN(unreadCount)) unreadCount = 0;
    } else {
      localStorage.setItem('ATAMAN_unread_notif_count', '0');
    }

    // Update all notification badges on the page
    const badgeElements = document.querySelectorAll('.notif-badge, #notifBadge, .nav-badge, #sidebarUrgentBadge, #headerNotifBadge');
    badgeElements.forEach(badge => {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'inline-flex';
      } else {
        badge.textContent = '0';
        badge.style.display = 'none';
      }
    });
  }

  // 3. REAL-TIME DATE RANGE DROPDOWN PICKER & LIVE CLOCK PILL
  let adminClockInterval = null;
  function setupDateRangePicker() {
    // Sync all date inputs with stale hardcoded dates to today's real-time date
    const nowInit = new Date();
    const todayIso = nowInit.toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(inp => {
      if (inp.value && inp.value.startsWith('2026-08')) {
        inp.value = todayIso;
      }
    });

    // Update static date filter option labels (e.g. in admin-system-logs.html)
    const liveDates = getLiveDateLabels();
    const fullMonthName = nowInit.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.querySelectorAll('option[value="today"]').forEach(opt => {
      opt.textContent = opt.textContent.includes('Logs') ? `Today's Logs (${liveDates.today})` : `Today (${liveDates.today})`;
    });
    document.querySelectorAll('option[value="thisMonth"]').forEach(opt => {
      opt.textContent = `This Month (${fullMonthName})`;
    });
    document.querySelectorAll('option[value="last7"]').forEach(opt => {
      opt.textContent = `Last 7 Days (${liveDates.last7Days})`;
    });
    document.querySelectorAll('option[value="last30"]').forEach(opt => {
      opt.textContent = `Last 30 Days (${fullMonthName} Full Audit)`;
    });

    // Remove any legacy duplicate static calendar badge (e.g., #topDateRangeBadge)
    const legacyTopBadge = document.getElementById('topDateRangeBadge');
    if (legacyTopBadge) legacyTopBadge.remove();

    let dateBtn = document.getElementById('dateRangeBtn') || document.querySelector('.date-range-btn');

    // If the current Admin page does not have #dateRangeBtn in the top header, inject a live real-time date pill
    if (!dateBtn) {
      const headerRight = document.querySelector('header .header-right, header .nav-actions-group, header .topbar-actions');
      if (headerRight && !document.getElementById('adminLiveDatePill')) {
        const pill = document.createElement('div');
        pill.id = 'adminLiveDatePill';
        pill.style.cssText = 'display:inline-flex; align-items:center; gap:6px; padding:0 11px; height:36px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; font-size:12px; font-weight:600; color:#334155; white-space:nowrap; flex-shrink:0;';
        pill.title = 'Live Real-Time Date & Clock';
        pill.innerHTML = `<span>📅</span><span id="adminLiveDateText">${liveDates.today}</span>`;
        headerRight.insertBefore(pill, headerRight.firstChild);
      }
    }

    let currentRangeKey = 'today';
    
    function applyDateLabel(key) {
      currentRangeKey = key;
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
      const freshDates = getLiveDateLabels();

      const adminLiveText = document.getElementById('adminLiveDateText');
      if (adminLiveText) {
        adminLiveText.textContent = `${freshDates.today} • ${timeStr}`;
      }

      if (!dateBtn) return;
      const baseLabel = freshDates[key] || freshDates.today;
      const label = key === 'today' ? `${freshDates.today} • ${timeStr}` : baseLabel;
      const span = dateBtn.querySelector('span') || dateBtn;
      if (span && span.tagName === 'SPAN') {
        span.textContent = label;
      } else if (dateBtn.querySelector('span')) {
        dateBtn.querySelector('span').textContent = label;
      }
    }

    // Apply initial label and tick every second in real-time
    applyDateLabel(currentRangeKey);
    if (adminClockInterval) clearInterval(adminClockInterval);
    adminClockInterval = setInterval(() => applyDateLabel(currentRangeKey), 1000);

    if (!dateBtn) return;
    const dates = getLiveDateLabels();

    // Create Dropdown Menu if not present
    let dropdown = document.getElementById('ATAMANDateDropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'ATAMANDateDropdown';
      dropdown.className = 'date-picker-dropdown';
      dropdown.innerHTML = `
        <div class="dp-header">
          <span>📅 Select Analytics Date Scope</span>
        </div>
        <div class="dp-options">
          <button class="dp-opt ${currentRangeKey === 'thisMonth' ? 'active' : ''}" data-key="thisMonth">
            <span class="dp-opt-icon">📅</span>
            <div class="dp-opt-text">
              <span class="dp-opt-name">This Month</span>
              <span class="dp-opt-val">${dates.thisMonth}</span>
            </div>
          </button>
          <button class="dp-opt ${currentRangeKey === 'today' ? 'active' : ''}" data-key="today">
            <span class="dp-opt-icon">📌</span>
            <div class="dp-opt-text">
              <span class="dp-opt-name">Today Only</span>
              <span class="dp-opt-val">${dates.today}</span>
            </div>
          </button>
          <button class="dp-opt ${currentRangeKey === 'last7Days' ? 'active' : ''}" data-key="last7Days">
            <span class="dp-opt-icon">🕒</span>
            <div class="dp-opt-text">
              <span class="dp-opt-name">Last 7 Days</span>
              <span class="dp-opt-val">${dates.last7Days}</span>
            </div>
          </button>
          <button class="dp-opt ${currentRangeKey === 'last30Days' ? 'active' : ''}" data-key="last30Days">
            <span class="dp-opt-icon">🗓️</span>
            <div class="dp-opt-text">
              <span class="dp-opt-name">Last 30 Days</span>
              <span class="dp-opt-val">${dates.last30Days}</span>
            </div>
          </button>
          <button class="dp-opt ${currentRangeKey === 'fullYear' ? 'active' : ''}" data-key="fullYear">
            <span class="dp-opt-icon">📆</span>
            <div class="dp-opt-text">
              <span class="dp-opt-name">Full Year 2026</span>
              <span class="dp-opt-val">${dates.fullYear}</span>
            </div>
          </button>
        </div>
      `;

      // Inject dropdown CSS if needed
      if (!document.getElementById('ATAMANDateDropdownStyles')) {
        const style = document.createElement('style');
        style.id = 'ATAMANDateDropdownStyles';
        style.textContent = `
          .date-range-btn, .filter-pill#dateRangeBtn {
            position: relative;
            cursor: pointer;
            user-select: none;
          }
          .date-picker-dropdown {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            width: 260px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            z-index: 999;
            padding: 8px;
            display: none;
            flex-direction: column;
            gap: 4px;
            animation: dpFadeIn 0.18s ease;
          }
          @keyframes dpFadeIn {
            from { opacity: 0; transform: translateY(-6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .date-picker-dropdown.show {
            display: flex;
          }
          .dp-header {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 6px 8px 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .dp-options {
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin-top: 4px;
          }
          .dp-opt {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            background: transparent;
            border: none;
            border-radius: 8px;
            text-align: left;
            cursor: pointer;
            font-family: inherit;
            transition: background 0.15s ease;
          }
          .dp-opt:hover {
            background: #f1f5f9;
          }
          .dp-opt.active {
            background: #dcfce7;
          }
          .dp-opt-icon {
            font-size: 14px;
          }
          .dp-opt-text {
            display: flex;
            flex-direction: column;
            gap: 1px;
          }
          .dp-opt-name {
            font-size: 12.5px;
            font-weight: 700;
            color: #0f172a;
          }
          .dp-opt.active .dp-opt-name {
            color: #166534;
          }
          .dp-opt-val {
            font-size: 11px;
            color: #64748b;
          }
          .notif-badge {
            animation: badgePulse 2s infinite;
          }
          @keyframes badgePulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.08); }
            100% { transform: scale(1); }
          }
        `;
        document.head.appendChild(style);
      }

      // Position dropdown in parent wrapper or body
      dateBtn.style.position = 'relative';
      dateBtn.appendChild(dropdown);

      // Toggle dropdown click
      dateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });

      // Handle Option Selection
      dropdown.querySelectorAll('.dp-opt').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const key = opt.getAttribute('data-key');
          dropdown.querySelectorAll('.dp-opt').forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
          applyDateLabel(key);
          dropdown.classList.remove('show');

          // Trigger custom event for page listeners
          window.dispatchEvent(new CustomEvent('ATAMAN:date-range-change', { detail: { key, label: dates[key] } }));
        });
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        dropdown.classList.remove('show');
      });
    }
  }

  // 4. REAL-TIME MULTI-TAB & CLOUD DATA SYNCHRONIZATION ENGINE
  const SYNC_BUS_NAME = 'ATAMAN_realtime_sync_bus';
  let syncChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      syncChannel = new BroadcastChannel(SYNC_BUS_NAME);
    }
  } catch (e) {
    console.warn('BroadcastChannel not supported, using storage event fallback');
  }

  // Handle incoming broadcasts from other tabs/windows
  if (syncChannel) {
    syncChannel.onmessage = (evt) => {
      const { entity, data, source } = evt.data || {};
      if (!entity) return;

      // Update local storage cache if data is present
      try {
        if (entity === 'trees' && Array.isArray(data)) {
          localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(data));
        } else if (entity === 'adopters' && Array.isArray(data)) {
          localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(data));
        } else if (entity === 'caretakers' && Array.isArray(data)) {
          localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(data));
        } else if (entity === 'users' && Array.isArray(data)) {
          localStorage.setItem('ATAMAN_users_cache', JSON.stringify(data));
        }
      } catch (err) {}

      // Dispatch window event so current page immediately re-renders
      window.dispatchEvent(new CustomEvent(`ATAMAN:${entity}-updated`, {
        detail: data,
        bubbles: true
      }));
    };
  }

  // Cross-tab storage fallback
  function handleStorageEvent(e) {
    if (!e.key) return;

    if (e.key === 'ATAMAN_unread_notif_count') {
      updateNotifBadges();
      return;
    }
    if (e.key === 'ATAMAN_active_date_range_key') {
      setupDateRangePicker();
      return;
    }

    // Data keys
    const entityMap = {
      'ATAMAN_trees_cache': 'trees',
      'ATAMAN_adopters_cache': 'adopters',
      'ATAMAN_caretakers_cache': 'caretakers',
      'ATAMAN_users_cache': 'users'
    };

    const entity = entityMap[e.key];
    if (entity && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        window.dispatchEvent(new CustomEvent(`ATAMAN:${entity}-updated`, { detail: parsed }));
      } catch (err) {}
    }
  }

  // 5. GLOBAL SYNC API
  const ATAMAN_SYNC = {
    broadcast(entity, data, source = 'local') {
      const ent = String(entity).toLowerCase();
      // 1. Send via BroadcastChannel to other tabs
      if (syncChannel) {
        try {
          syncChannel.postMessage({ entity: ent, data, source, timestamp: Date.now() });
        } catch (e) {}
      }

      // 2. Dispatch local event on this tab
      window.dispatchEvent(new CustomEvent(`ATAMAN:${ent}-updated`, { detail: data }));

      // 3. Update storage timestamp to trigger storage event in legacy tabs
      try {
        localStorage.setItem(`ATAMAN_sync_ts_${ent}`, String(Date.now()));
      } catch (e) {}
    },

    notifyTrees(trees) {
      try {
        localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(trees));
      } catch (e) {}
      this.broadcast('trees', trees);
    },

    notifyAdopters(adopters) {
      try {
        localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adopters));
      } catch (e) {}
      this.broadcast('adopters', adopters);
    },

    notifyCaretakers(caretakers) {
      try {
        localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakers));
      } catch (e) {}
      this.broadcast('caretakers', caretakers);
    },

    notifyUsers(users) {
      try {
        localStorage.setItem('ATAMAN_users_cache', JSON.stringify(users));
      } catch (e) {}
      this.broadcast('users', users);
    },

    on(entity, callback) {
      if (typeof callback !== 'function') return;
      window.addEventListener(`ATAMAN:${entity.toLowerCase()}-updated`, (e) => {
        callback(e.detail);
      });
    }
  };

  // Expose to window
  window.ATAMAN_SYNC = ATAMAN_SYNC;

  // 6. ATTACH TO ATAMAN_DB FIRESTORE REAL-TIME STREAMS
  function connectDatabaseStreams() {
    if (!window.ATAMAN_DB) return;

    // Connect trees stream
    if (typeof window.ATAMAN_DB.onTreesChange === 'function' && !window.__ATAMAN_trees_connected) {
      window.__ATAMAN_trees_connected = true;
      window.ATAMAN_DB.onTreesChange((trees, src) => {
        if (src === 'firestore') {
          ATAMAN_SYNC.broadcast('trees', trees, 'firestore');
        }
      });
    }

    // Connect adopters stream
    if (typeof window.ATAMAN_DB.onAdoptersChange === 'function' && !window.__ATAMAN_adopters_connected) {
      window.__ATAMAN_adopters_connected = true;
      window.ATAMAN_DB.onAdoptersChange((adopters, src) => {
        if (src === 'firestore') {
          ATAMAN_SYNC.broadcast('adopters', adopters, 'firestore');
        }
      });
    }

    // Connect caretakers stream
    if (typeof window.ATAMAN_DB.onCaretakersChange === 'function' && !window.__ATAMAN_caretakers_connected) {
      window.__ATAMAN_caretakers_connected = true;
      window.ATAMAN_DB.onCaretakersChange((caretakers, src) => {
        if (src === 'firestore') {
          ATAMAN_SYNC.broadcast('caretakers', caretakers, 'firestore');
        }
      });
    }
  }

  // 7. LISTEN FOR STORAGE & GLOBAL EVENTS
  function initRealtimeListeners() {
    window.addEventListener('storage', handleStorageEvent);

    window.addEventListener('ATAMAN:notif-update', () => {
      updateNotifBadges();
    });

    // Attempt connecting to ATAMAN_DB
    connectDatabaseStreams();
    let dbAttempts = 0;
    const dbInterval = setInterval(() => {
      dbAttempts++;
      if (window.ATAMAN_DB || dbAttempts > 20) {
        connectDatabaseStreams();
        clearInterval(dbInterval);
      }
    }, 250);

    // Periodic check every 5 seconds for simulated realtime events
    setInterval(updateNotifBadges, 5000);
  }

  // 8. UNIVERSAL MOBILE NAVIGATION DRAWER CONTROLLER
  function initMobileNavigation() {
    const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
    if (!sidebar) return;

    // Inject mobile drawer styles if not already present
    if (!document.getElementById('ATAMANMobileNavStyles')) {
      const style = document.createElement('style');
      style.id = 'ATAMANMobileNavStyles';
      style.textContent = `
        .sidebar-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(4, 21, 11, 0.6);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 9999;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease;
        }
        .sidebar-backdrop.active {
          opacity: 1;
          pointer-events: auto;
        }
        .mobile-nav-toggle {
          display: none;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
          padding: 0;
        }
        .mobile-nav-toggle:active {
          transform: scale(0.95);
        }
        .sidebar-close-btn {
          display: none !important;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #ffffff;
          cursor: pointer;
          flex-shrink: 0;
          margin-left: auto;
          transition: all 0.15s ease;
        }
        .sidebar-close-btn:hover {
          background: rgba(239, 68, 68, 0.22);
          border-color: rgba(239, 68, 68, 0.45);
          color: #fca5a5;
        }
        @media (max-width: 992px) {
          .mobile-nav-toggle {
            display: inline-flex !important;
          }
          .sidebar-close-btn {
            display: inline-flex !important;
          }
          .sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 285px !important;
            min-width: 285px !important;
            max-width: 86vw !important;
            height: 100vh !important;
            height: 100dvh !important;
            min-height: 100vh !important;
            z-index: 10000 !important;
            transform: translateX(-100%) !important;
            transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.28s ease !important;
            visibility: hidden !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .sidebar.mobile-open {
            transform: translateX(0) !important;
            visibility: visible !important;
            box-shadow: 12px 0 35px rgba(0, 0, 0, 0.5) !important;
          }
          .sb-brand-name, .sb-brand-tag, .sidebar-section-label, .nav-link span, .sb-user-info, .sb-user-expand {
            display: block !important;
          }
          .sb-brand-text {
            display: flex !important;
            flex-direction: column !important;
          }
          .sb-user-info {
            display: flex !important;
            flex-direction: column !important;
          }
          .sidebar-logo {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 18px 18px !important;
          }
          .sidebar-logo-brand {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
          }
          .nav-link {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            padding: 11px 14px !important;
            gap: 12px !important;
          }
          .sidebar-user {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 10px !important;
          }
          .main-content, .main-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin-left: 0 !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Ensure Backdrop exists
    let backdrop = document.getElementById('sidebarBackdrop') || document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'sidebarBackdrop';
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }

    // Ensure Hamburger Toggle Button exists
    let menuBtn = document.getElementById('mobileMenuBtn') || document.querySelector('.mobile-nav-toggle');
    if (!menuBtn) {
      const headerLeft = document.querySelector('.dash-header .header-left, .topbar .topbar-left, .page-header .header-left, .header-left, .dash-header');
      if (headerLeft) {
        menuBtn = document.createElement('button');
        menuBtn.type = 'button';
        menuBtn.id = 'mobileMenuBtn';
        menuBtn.className = 'mobile-nav-toggle';
        menuBtn.setAttribute('aria-label', 'Open Navigation Menu');
        menuBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        `;
        headerLeft.prepend(menuBtn);
      }
    }

    // Ensure Close Button exists inside sidebar logo
    let closeBtn = document.getElementById('sidebarCloseBtn') || sidebar.querySelector('.sidebar-close-btn');
    if (!closeBtn) {
      const sidebarLogo = sidebar.querySelector('.sidebar-logo');
      if (sidebarLogo) {
        closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.id = 'sidebarCloseBtn';
        closeBtn.className = 'sidebar-close-btn';
        closeBtn.setAttribute('aria-label', 'Close sidebar navigation');
        closeBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        sidebarLogo.appendChild(closeBtn);
      }
    }

    function openSidebar() {
      sidebar.classList.add('mobile-open');
      if (backdrop) backdrop.classList.add('active');
      document.body.classList.add('sidebar-drawer-open');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.remove('active');
      document.body.classList.remove('sidebar-drawer-open');
      document.body.style.overflow = '';
    }

    if (menuBtn) {
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (sidebar.classList.contains('mobile-open')) {
          closeSidebar();
        } else {
          openSidebar();
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeSidebar();
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
    }

    // Close when tapping a navigation link on mobile
    sidebar.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 992) {
          closeSidebar();
        }
      });
    });

    // Close with Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
        closeSidebar();
      }
    });

    // Close when resized back to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 992 && sidebar.classList.contains('mobile-open')) {
        closeSidebar();
      }
    });
  }

  // 9. DYNAMIC REGISTERED USERS DROPDOWN SYNC (Strict Registration Records Only)
  const UNREGISTERED_DUMMY_NAMES = new Set([
    'pedro reyes', 'maria santos', 'ana cruz', 'juan dela cruz', 'esang babon',
    'john sho', 'jojo maga', 'juan santos', 'maria garcia', 'roberto lim',
    'carlos mendoza', 'elena bautista', 'elena gomez', 'roberto cruz',
    'maria valdez', 'carlos lim', 'abc foundation', 'greenlife corp.',
    'greenlife corp', 'ecofuture ph', 'ecofuture ngo', 'green earth corp',
    'metro sustainability', 'global forest fund', 'samar green alliance',
    'eco-students guild', 'carlo mendoza', 'rosa lim', 'ramon bautista',
    'lito villanueva', 'amara yes'
  ]);

  function isDummyName(name) {
    if (!name) return true;
    const norm = String(name).toLowerCase().trim();
    return UNREGISTERED_DUMMY_NAMES.has(norm);
  }

  function syncRegisteredUserDropdowns() {
    const userMap = new Map();
    const caretakerMap = new Map();
    const adopterMap = new Map();

    // Always include the Super Admin account
    userMap.set('ethelzeta57@gmail.com', {
      name: 'Ethel Zeta (Admin)',
      roleLabel: 'Super Admin',
      role: 'admin'
    });

    const userKeys = ['ATAMAN_registered_users', 'ATAMAN_users_cache'];
    userKeys.forEach(key => {
      try {
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(list)) return;
        list.forEach(u => {
          if (!u) return;
          const email = (u.email || '').toLowerCase().trim();
          const name = (u.displayName || u.name || '').trim();
          if (!name || isDummyName(name)) return;
          const roleRaw = (u.role || '').toLowerCase().trim();
          let roleLabel = 'User';
          if (roleRaw.includes('admin')) roleLabel = 'Super Admin';
          else if (roleRaw.includes('caretaker')) roleLabel = 'Caretaker';
          else if (roleRaw.includes('adopter')) roleLabel = 'Adopter';

          const mapKey = email || name.toLowerCase();
          userMap.set(mapKey, { name, roleLabel, role: roleRaw });
          if (roleRaw.includes('caretaker')) caretakerMap.set(mapKey, name);
          if (roleRaw.includes('adopter')) adopterMap.set(mapKey, name);
        });
      } catch (e) {}
    });

    try {
      const cts = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
      if (Array.isArray(cts)) {
        cts.forEach(c => {
          const name = (c?.name || c?.displayName || '').trim();
          if (!name || isDummyName(name)) return;
          const mapKey = (c.email || name).toLowerCase().trim();
          caretakerMap.set(mapKey, name);
          if (!userMap.has(mapKey)) {
            userMap.set(mapKey, { name, roleLabel: 'Caretaker', role: 'caretaker' });
          }
        });
      }
    } catch (e) {}

    try {
      const ads = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
      if (Array.isArray(ads)) {
        ads.forEach(a => {
          const name = (a?.name || a?.displayName || '').trim();
          if (!name || isDummyName(name)) return;
          const mapKey = (a.email || name).toLowerCase().trim();
          adopterMap.set(mapKey, name);
          if (!userMap.has(mapKey)) {
            userMap.set(mapKey, { name, roleLabel: 'Adopter', role: 'adopter' });
          }
        });
      }
    } catch (e) {}

    // 1. User / Actor dropdown (admin-system-logs.html #filterUser)
    const filterUser = document.getElementById('filterUser');
    if (filterUser) {
      const cur = filterUser.value;
      const opts = ['<option value="all">All Users & Actors</option>'];
      Array.from(userMap.values()).forEach(u => {
        const label = u.name.toLowerCase().includes(u.roleLabel.toLowerCase())
          ? u.name
          : `${u.name} (${u.roleLabel})`;
        opts.push(`<option value="${u.name}">${label}</option>`);
      });
      filterUser.innerHTML = opts.join('');
      if (cur && Array.from(filterUser.options).some(o => o.value === cur)) {
        filterUser.value = cur;
      }
    }

    // 2. Caretaker filter & assignment dropdowns
    ['filterCaretaker', 'bulkNewCaretaker', 'reassignCaretakerSelect', 'maintCaretaker'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const cur = sel.value;
      const firstOpt = sel.options[0]
        ? `<option value="${sel.options[0].value}">${sel.options[0].textContent}</option>`
        : '<option value="all">All Caretakers</option>';
      const opts = [firstOpt];
      Array.from(caretakerMap.values()).forEach(name => {
        opts.push(`<option value="${name}">${name}</option>`);
      });
      sel.innerHTML = opts.join('');
      if (cur && Array.from(sel.options).some(o => o.value === cur)) {
        sel.value = cur;
      }
    });

    // 3. Adopter filter dropdowns
    ['filterAdopter', 'impactAdopterFilter'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const cur = sel.value;
      const firstOpt = sel.options[0]
        ? `<option value="${sel.options[0].value}">${sel.options[0].textContent}</option>`
        : '<option value="all">All Adopters</option>';
      const opts = [firstOpt];
      Array.from(adopterMap.values()).forEach(name => {
        opts.push(`<option value="${name}">${name}</option>`);
      });
      sel.innerHTML = opts.join('');
      if (cur && Array.from(sel.options).some(o => o.value === cur)) {
        sel.value = cur;
      }
    });
  }

  // 7. UNIVERSAL DATA CACHE SYNCHRONIZER (Trees <-> Adopters <-> Caretakers <-> Registered Users)
  function syncAllSystemCaches() {
    try {
      const regUsers = JSON.parse(localStorage.getItem('ATAMAN_registered_users') || '[]');
      let trees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
      let adopters = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
      let caretakers = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');

      if (!Array.isArray(trees)) trees = [];
      if (!Array.isArray(adopters)) adopters = [];
      if (!Array.isArray(caretakers)) caretakers = [];

      let adsModified = false;
      let ctsModified = false;
      let treesModified = false;

      // A. Deduplicate Adopters & Preserve Custom Funding
      adopters.forEach(a => {
        if (!a) return;
        const cnt = Number(a.treesCount ?? (Array.isArray(a.treesList) ? a.treesList.length : (a.treesAdopted || 0))) || 0;
        if (cnt > 0 && Number(a.funding || a.fundingPaid) > 0 && a.customFunding === undefined) {
          a.customFunding = true;
          adsModified = true;
        }
      });
      for (let i = 0; i < adopters.length; i++) {
        const a = adopters[i];
        if (!a) continue;
        for (let j = i + 1; j < adopters.length; j++) {
          const b = adopters[j];
          if (!b) continue;
          const emailA = (a.email || '').toLowerCase().trim();
          const emailB = (b.email || '').toLowerCase().trim();
          const nameA = (a.name || '').toLowerCase().trim();
          const nameB = (b.name || '').toLowerCase().trim();
          const contactA = (a.contactPerson || a.contact || '').toLowerCase().trim();
          const contactB = (b.contactPerson || b.contact || '').toLowerCase().trim();
          if ((emailA && emailB && emailA === emailB) ||
              (nameA && contactB && nameA === contactB) ||
              (nameB && contactA && nameB === contactA) ||
              (nameA && nameB && nameA === nameB)) {
            const scoreA = (Number(a.treesCount) || 0) * 100 + (Array.isArray(a.treesList) ? a.treesList.length * 10 : 0);
            const scoreB = (Number(b.treesCount) || 0) * 100 + (Array.isArray(b.treesList) ? b.treesList.length * 10 : 0);
            const primary = scoreB > scoreA ? b : a;
            const secondary = scoreB > scoreA ? a : b;
            if (!primary.email && secondary.email) primary.email = secondary.email;
            if ((!primary.contactPerson || primary.contactPerson === primary.email) && secondary.name) primary.contactPerson = secondary.name;
            adopters[i] = primary;
            adopters.splice(j, 1);
            j--;
            adsModified = true;
          }
        }
      }

      // B. Sync Registered Caretakers into ATAMAN_caretakers_cache
      if (Array.isArray(regUsers)) {
        regUsers.forEach((u, idx) => {
          const role = String(u?.role || '').toLowerCase();
          if (!role.includes('caretaker')) return;
          const name = (u.displayName || u.name || '').trim();
          const email = (u.email || '').trim();
          if (!name) return;
          const exists = caretakers.some(c =>
            (email && c.email && c.email.toLowerCase().trim() === email.toLowerCase()) ||
            (c.name && c.name.toLowerCase().trim() === name.toLowerCase())
          );
          if (!exists) {
            caretakers.push({
              id: u.uid || u.id || `CT-REG-${idx + 1}`,
              empId: `CT-2026-0${caretakers.length + 1}`,
              name: name,
              email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@ataman.org`,
              phone: u.phone || '0917-000-0000',
              status: 'Active',
              primaryArea: u.barangay || 'Catbalogan City',
              assignedTreeType: 'Native Hardwood',
              dateJoined: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
              assignedTrees: 0,
              treesCondition: { healthy: 0, care: 0, critical: 0, dead: 0 },
              pendingMonitoring: 0,
              overdueMonitoring: 0,
              completedMonitoring: 0,
              completionRate: 100,
              onTimeRate: 100,
              assignedBarangays: [u.barangay || 'Catbalogan City'],
              assignedProjects: ['Community Reforestation 2026'],
              assignedFarms: [],
              schedule: [],
              recentActivity: [],
              criticalTrees: [],
              photos: []
            });
            ctsModified = true;
          }
        });
      }

      // C. Sync Tree Adoptions from ATAMAN_adopters_cache & Clean Unassigned Trees
      adopters.forEach(ad => {
        if (!ad || !Array.isArray(ad.treesList)) return;
        ad.treesList.forEach(item => {
          const tree = trees.find(t => String(t.id) === String(item.id));
          if (tree) {
            const count = Math.max(1, parseInt(item.treeCount) || 1);
            if ((parseInt(tree.takenCount) || 0) < count) {
              tree.takenCount = count;
              treesModified = true;
            }
            if (!tree.adopter || tree.adopter === 'None' || tree.adopter === 'Not yet adopted') {
              tree.adopter = ad.name;
              tree.sponsorName = ad.name;
              treesModified = true;
            }
          }
        });
      });

      // Ensure all registered Samar trees retain their location and caretaker assignment
      const defTrees = (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_TREES)) ? window.ATAMAN_DEFAULT_TREES : [];
      trees.forEach(t => {
        if (!t) return;
        const defT = defTrees.find(d => d.id === t.id);
        if (defT) {
          if (!t.barangay && defT.barangay) { t.barangay = defT.barangay; treesModified = true; }
          if (!t.municipality && defT.municipality) { t.municipality = defT.municipality; treesModified = true; }
          if (!t.province && defT.province) { t.province = defT.province; treesModified = true; }
          if (t.lat == null && defT.lat != null) { t.lat = defT.lat; treesModified = true; }
          if (t.lng == null && defT.lng != null) { t.lng = defT.lng; treesModified = true; }
        }
        if (!t.caretaker || t.caretaker === 'Unassigned' || t.caretaker === 'Pedro Reyes') {
          t.caretaker = 'Dodong Zeta';
          treesModified = true;
        }
        t.customCaretaker = true;
        t.customGps = true;
        t.customLocation = true;
      });

      // Recalculate each caretaker's assignedTrees strictly from trees explicitly assigned to them
      if (caretakers.length > 0) {
        caretakers.forEach(ct => {
          if (!ct) return;
          const ctName = (ct.name || '').toLowerCase().trim();
          const ctAdopter = (ct.assignedAdopterName || '').toLowerCase().trim();
          let cTotal = 0, cH = 0, cNC = 0, cCR = 0, cD = 0;

          trees.forEach(t => {
            const treeCt = (t.caretaker || '').toLowerCase().trim();
            const treeAd = (t.adopter || t.sponsorName || '').toLowerCase().trim();
            const isAssignedToCt = (ctName && treeCt === ctName) || (ctAdopter && treeAd && treeAd === ctAdopter);
            if (isAssignedToCt) {
              if (treeCt !== ctName) {
                t.caretaker = ct.name;
                treesModified = true;
              }
              const cnt = Math.max(1, parseInt(t.treeCount) || 1);
              cTotal += cnt;
              const st = (t.status || 'healthy').toLowerCase();
              if (st === 'healthy') cH += cnt;
              else if (st === 'needs-care' || st === 'needs') cNC += cnt;
              else if (st === 'critical') cCR += cnt;
              else if (st === 'dead') cD += cnt;
              else cH += cnt;
            }
          });

          if (ct.assignedTrees !== cTotal) {
            ct.assignedTrees = cTotal;
            ct.treesCondition = { healthy: cH, care: cNC, critical: cCR, dead: cD };
            ctsModified = true;
          }
        });
      }

      if (adsModified) localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adopters));
      if (ctsModified) localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakers));
      if (treesModified) localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(trees));
    } catch (e) {}
  }

  // Run immediately so page scripts reading localStorage on DOMContentLoaded get synced data
  syncAllSystemCaches();

  window.addEventListener('ATAMAN:users-updated', syncRegisteredUserDropdowns);
  window.addEventListener('ATAMAN:caretakers-updated', syncRegisteredUserDropdowns);
  window.addEventListener('ATAMAN:adopters-updated', syncRegisteredUserDropdowns);
  window.addEventListener('storage', syncRegisteredUserDropdowns);

  // Global API exposed for other scripts
  window.ATAMAN_REALTIME = {
    updateNotifCount: function (newCount) {
      localStorage.setItem('ATAMAN_unread_notif_count', String(newCount));
      updateNotifBadges();
      window.dispatchEvent(new CustomEvent('ATAMAN:notif-update', { detail: { count: newCount } }));
    },
    getLiveDateLabels,
    initMobileNavigation,
    syncRegisteredUserDropdowns
  };

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateNotifBadges();
      setupDateRangePicker();
      initMobileNavigation();
      initRealtimeListeners();
      syncRegisteredUserDropdowns();
    });
  } else {
    updateNotifBadges();
    setupDateRangePicker();
    initMobileNavigation();
    initRealtimeListeners();
    syncRegisteredUserDropdowns();
  }
})();
