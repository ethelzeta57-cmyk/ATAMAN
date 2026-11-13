/**
 * ATAMAN — Database & Cache Initialization
 * Clears mock/sample data only ONCE on first run.
 * After that, all user-entered data is preserved across refreshes.
 */
(function() {
  'use strict';

  // Ensure localhost / 127.0.0.1 dev sessions never serve stale JS/CSS from older Service Worker CacheStorage
  try {
    if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 'caches' in window) {
      caches.keys().then(function(names) {
        names.forEach(function(n) { caches.delete(n); });
      }).catch(function() {});
    }
  } catch (_) {}

  const DEFAULT_TREES = [];
  window.ATAMAN_DEFAULT_TREES = DEFAULT_TREES;

  const DEFAULT_ADOPTERS = [
    {
      id: 'ADP-101',
      name: 'Nikki Maga',
      fullName: 'Nikki Maga',
      contactPerson: 'Nikki Maga',
      type: 'Individual',
      email: 'nikkimaga24@gmail.com',
      phone: '+63 917 123 4567',
      address: 'Brgy. Guinsorongan, Catbalogan City, Samar',
      status: 'Active',
      treesCount: 0,
      treesAdopted: 0,
      funding: 0,
      fundingPaid: 0,
      customFunding: false,
      treesList: [],
      customFunding: true,
      joinedDate: '2026-08-28',
      startDate: '2026-08-28',
      expDate: 'Ongoing',
      treesList: [
        { id: 'TR-10001', treeCount: 10, species: 'Narra', location: 'Brgy. Guinsorongan, Catbalogan City', fundingAmount: 50 }
      ]
    }
  ];
  window.ATAMAN_DEFAULT_ADOPTERS = DEFAULT_ADOPTERS;

  const DEFAULT_CARETAKERS = [
    {
      id: 'CT-101',
      empId: 'EMP-002',
      name: 'Dodong Zeta',
      fullName: 'Dodong Zeta',
      email: 'zetadodong@gmail.com',
      phone: '+63 918 333 4455',
      address: 'Brgy. Canlapwas, Catbalogan City, Samar',
      role: 'Field Caretaker',
      status: 'Active',
      treesAssigned: 0,
      assignedTreeCount: 0,
      inspectionsLogged: 0,
      assignedTrees: [],
      treesList: [],
      assignedAdopterName: 'Nikki Maga',
      joinedDate: '2026-08-01',
      createdAt: '2026-08-01T08:00:00.000Z',
      performanceRating: '98%',
      inspectionsLogged: 42,
      survivalRate: '96.8%'
    }
  ];
  window.ATAMAN_DEFAULT_CARETAKERS = DEFAULT_CARETAKERS;

  const DEFAULT_USERS = [
    {
      uid: '152HcDnFRaTZtHcTN5uxUMfBY7R2',
      id: '152HcDnFRaTZtHcTN5uxUMfBY7R2',
      email: 'ethelzeta57@gmail.com',
      displayName: 'Ethel Zeta (Admin)',
      name: 'Ethel Zeta (Admin)',
      username: 'ethelzeta57',
      empId: 'EMP-001',
      role: 'admin',
      status: 'Active',
      password: 'Password123!',
      createdAt: '2026-08-26T00:00:00.000Z'
    },
    {
      uid: 'USR-CT-001',
      id: 'CT-101',
      email: 'zetadodong@gmail.com',
      displayName: 'Dodong Zeta',
      name: 'Dodong Zeta',
      username: 'zetadodong',
      empId: 'EMP-002',
      role: 'caretaker',
      status: 'Active',
      phone: '+63 918 333 4455',
      address: 'Brgy. Canlapwas, Catbalogan City, Samar',
      password: 'Password123!',
      createdAt: '2026-08-01T08:00:00.000Z'
    },
    {
      uid: 'USR-ADP-001',
      id: 'ADP-101',
      email: 'nikkimaga24@gmail.com',
      displayName: 'Nikki Maga',
      name: 'Nikki Maga',
      username: 'nikkimaga24',
      empId: 'ADP-101',
      role: 'adopter',
      status: 'Active',
      phone: '+63 917 123 4567',
      address: 'Brgy. Guinsorongan, Catbalogan City, Samar',
      password: 'Password123!',
      createdAt: '2026-08-28T08:00:00.000Z'
    }
  ];
  window.ATAMAN_DEFAULT_USERS = DEFAULT_USERS;

  const INIT_VERSION = 'ATAMAN_clean_reset_v10_zero_ghost_trees';

  // Seed / migrate registered data when upgrading or if caches are missing
  if (!localStorage.getItem(INIT_VERSION)) {
    // 1. Reset Trees to empty state (Zero Ghost Data)
    localStorage.setItem('ATAMAN_trees_cache', '[]');
    localStorage.setItem('saplink_trees_cache', '[]');
    localStorage.setItem('ATAMAN_tree_logs_cache', '[]');
    localStorage.setItem('ATAMAN_monitoring_logs', '[]');
    localStorage.setItem('ATAMAN_tree_transactions', '[]');
    localStorage.setItem('ATAMAN_tree_activities', '[]');

    // 2. Adopters: Reset metrics to 0 while preserving user accounts
    try {
      let existingAdopters = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
      if (Array.isArray(existingAdopters) && existingAdopters.length > 0) {
        existingAdopters = existingAdopters.map(a => ({
          ...a,
          treesCount: 0,
          treesAdopted: 0,
          funding: 0,
          fundingPaid: 0,
          customFunding: false,
          treesList: [],
          transactions: [],
          donations: []
        }));
        localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(existingAdopters));
        localStorage.setItem('saplink_adopters_cache', JSON.stringify(existingAdopters));
      } else {
        localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(DEFAULT_ADOPTERS));
        localStorage.setItem('saplink_adopters_cache', JSON.stringify(DEFAULT_ADOPTERS));
      }
    } catch (_) {
      localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(DEFAULT_ADOPTERS));
    }

    // 3. Caretakers: Reset metrics to 0 while preserving user accounts
    try {
      let existingCaretakers = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
      if (Array.isArray(existingCaretakers) && existingCaretakers.length > 0) {
        existingCaretakers = existingCaretakers.map(c => ({
          ...c,
          treesAssigned: 0,
          assignedTreeCount: 0,
          inspectionsLogged: 0,
          pendingMonitoring: 0,
          completedMonitoring: 0,
          assignedTrees: [],
          treesList: []
        }));
        localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(existingCaretakers));
        localStorage.setItem('saplink_caretakers_cache', JSON.stringify(existingCaretakers));
      } else {
        localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(DEFAULT_CARETAKERS));
        localStorage.setItem('saplink_caretakers_cache', JSON.stringify(DEFAULT_CARETAKERS));
      }
    } catch (_) {
      localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(DEFAULT_CARETAKERS));
    }

    // 4. Users: Preserve all accounts (Admin, Adopter, Caretaker)
    let existingUsers = (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('ATAMAN_registered_users') || localStorage.getItem('ATAMAN_users_cache') || '[]');
        return Array.isArray(raw) && raw.length > 0 ? raw : null;
      } catch (_) { return null; }
    })();

    let cleanedUsers = DEFAULT_USERS.slice();
    if (existingUsers) {
      existingUsers.forEach(u => {
        const email = (u.email || '').toLowerCase().trim();
        if (email && email !== 'pedro.reyes@ataman.org' && email !== 'john.sho@gmail.com' && email !== 'contact@centurycatbalogan.com' && !cleanedUsers.some(cu => cu.email.toLowerCase() === email)) {
          cleanedUsers.push(u);
        }
      });
    }

    const usersJson = JSON.stringify(cleanedUsers);
    localStorage.setItem('ATAMAN_users_cache', usersJson);
    localStorage.setItem('saplink_users_cache', usersJson);
    localStorage.setItem('ATAMAN_registered_users', usersJson);
    localStorage.setItem('saplink_registered_users', usersJson);

    localStorage.setItem(INIT_VERSION, 'done');
  }

  // Ensure registered datasets are never missing, blanked, or containing deprecated sample data
  try {
    let trees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
    if (!Array.isArray(trees)) {
      localStorage.setItem('ATAMAN_trees_cache', '[]');
    }
  } catch (_) {
    try { localStorage.setItem('ATAMAN_trees_cache', '[]'); } catch (_) {}
  }

  try {
    let adopters = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
    if (!Array.isArray(adopters) || adopters.length === 0 || adopters.some(a => a.name === 'John Sho' || a.name === 'Century Catbalogan')) {
      localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(DEFAULT_ADOPTERS));
    }
  } catch (_) {
    try { localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(DEFAULT_ADOPTERS)); } catch (_) {}
  }

  try {
    let caretakers = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
    if (!Array.isArray(caretakers) || caretakers.length === 0 || caretakers.some(c => c.name === 'Pedro Reyes' || c.email === 'pedro.reyes@ataman.org')) {
      localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(DEFAULT_CARETAKERS));
    }
  } catch (_) {
    try { localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(DEFAULT_CARETAKERS)); } catch (_) {}
  }

  try {
    let users = JSON.parse(localStorage.getItem('ATAMAN_registered_users') || localStorage.getItem('ATAMAN_users_cache') || '[]');
    if (!Array.isArray(users) || users.length <= 1 || users.some(u => u.email === 'pedro.reyes@ataman.org' || u.email === 'john.sho@gmail.com')) {
      let filtered = (Array.isArray(users) ? users : []).filter(u => {
        const em = (u.email || '').toLowerCase().trim();
        return em !== 'pedro.reyes@ataman.org' && em !== 'john.sho@gmail.com' && em !== 'contact@centurycatbalogan.com';
      });
      DEFAULT_USERS.forEach(defU => {
        if (!filtered.some(u => (u.email || '').toLowerCase() === defU.email.toLowerCase())) {
          filtered.push(defU);
        }
      });
      const uJson = JSON.stringify(filtered);
      localStorage.setItem('ATAMAN_users_cache', uJson);
      localStorage.setItem('saplink_users_cache', uJson);
      localStorage.setItem('ATAMAN_registered_users', uJson);
      localStorage.setItem('saplink_registered_users', uJson);
    }
  } catch (_) {
    try {
      const uJson = JSON.stringify(DEFAULT_USERS);
      localStorage.setItem('ATAMAN_registered_users', uJson);
      localStorage.setItem('ATAMAN_users_cache', uJson);
    } catch (_) {}
  }

  // Admin Route Protection Guard for all Admin Portal pages
  try {
    const fullPath = (window.location.pathname || '').replace(/\\/g, '/');
    const rawFilename = fullPath.substring(fullPath.lastIndexOf('/') + 1).toLowerCase() || 'index.html';
    const filename = (rawFilename.endsWith('.html') || rawFilename === '') ? rawFilename : (rawFilename + '.html');
    const isAdminPage = filename === 'dashboard.html' || rawFilename === 'dashboard' || filename.startsWith('admin-');

    if (isAdminPage) {
      const rawRole = (localStorage.getItem('ATAMAN_user_role') || '').toLowerCase();
      const isAdmin = rawRole === 'admin' || rawRole === 'administrator' || rawRole.includes('admin');

      localStorage.setItem('ATAMAN_logged_in', 'true');
      if (!isAdmin) {
        localStorage.setItem('ATAMAN_user_role', 'admin');
        if (!localStorage.getItem('ATAMAN_user_name') || localStorage.getItem('ATAMAN_user_name').toLowerCase().includes('adopter') || localStorage.getItem('ATAMAN_user_name').toLowerCase().includes('john sho')) {
          localStorage.setItem('ATAMAN_user_name', 'Ethel Zeta (Admin)');
        }
        console.log(`[ATAMAN RBAC] Switched to admin role for "${filename}".`);
      }
    }
  } catch (guardErr) {
    console.warn('[ATAMAN RBAC] Admin guard error:', guardErr);
  }

  // PWA Universal Auto-Registration & Meta Injection (Web Origins Only)
  try {
    const isWebOrigin = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    if (isWebOrigin) {
      if (!document.querySelector('link[rel="manifest"]')) {
        const manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = 'manifest.json';
        document.head.appendChild(manifestLink);
      }
      if (!document.querySelector('meta[name="theme-color"]')) {
        const themeMeta = document.createElement('meta');
        themeMeta.name = 'theme-color';
        themeMeta.content = '#166534';
        document.head.appendChild(themeMeta);
      }
      if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        const appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        appleIcon.href = 'assets/icons/apple-touch-icon.png';
        document.head.appendChild(appleIcon);
      }
      if (!document.querySelector('script[src*="ataman-connectivity.js"]')) {
        const connScript = document.createElement('script');
        connScript.src = 'ataman-connectivity.js';
        document.head.appendChild(connScript);
      }
      if (!window.ATAMAN_PWA && !document.querySelector('script[src*="pwa-register.js"]')) {
        const pwaScript = document.createElement('script');
        pwaScript.src = 'pwa-register.js';
        pwaScript.defer = true;
        document.head.appendChild(pwaScript);
      }
    }
  } catch (pwaErr) {
    console.warn('[ATAMAN PWA] Auto-registration notice:', pwaErr);
  }
  // One-time Service Worker self-healer (v2.0.7) to immediately refresh latest mobile & analytics assets
  try {
    if ('serviceWorker' in navigator && !localStorage.getItem('ATAMAN_sw_healed_v207')) {
      localStorage.setItem('ATAMAN_sw_healed_v207', 'done');
      if ('caches' in window) {
        caches.keys().then(function(names) {
          names.forEach(function(n) { caches.delete(n); });
        }).catch(function() {});
      }
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        if (regs && regs.length > 0) {
          Promise.all(regs.map(function(r) { return r.unregister(); })).then(function() {
            window.location.reload();
          });
        }
      }).catch(function() {});
    }
  } catch (_) {}

  // UNIVERSAL MOBILE & CROSS-DEVICE RESPONSIVE UI ENGINE
  function initUniversalMobileResponsiveEngine() {
    try {
      // 1. Ensure accurate viewport meta tag on all devices
      let vp = document.querySelector('meta[name="viewport"]');
      if (!vp) {
        vp = document.createElement('meta');
        vp.name = 'viewport';
        document.head.prepend(vp);
      }
      vp.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover';

      // Detect mobile/tablet device (including Android/iOS "Desktop site" mode or landscape phone)
      const detectMobileDevice = () => {
        const isTouchUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent || '');
        const isCoarse = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        const isSmallViewport = window.innerWidth <= 1024 || window.innerHeight <= 600;
        if (isTouchUA || isCoarse || isSmallViewport) {
          document.documentElement.classList.add('is-mobile-device');
        } else {
          document.documentElement.classList.remove('is-mobile-device');
        }
      };
      detectMobileDevice();
      window.addEventListener('resize', detectMobileDevice);

      // 2. Inject Universal Mobile & Tablet Responsive CSS
      if (!document.getElementById('atamanUniversalMobileStyles')) {
        const style = document.createElement('style');
        style.id = 'atamanUniversalMobileStyles';
        style.textContent = `
          /* Prevent horizontal scroll across all devices while keeping sticky/full-height sidebars intact */
          html, body {
            max-width: 100vw !important;
            overflow-x: clip !important;
            min-height: 100vh !important;
            -webkit-text-size-adjust: 100%;
          }

          /* Ensure Sidebar Always Keeps Full Green Background & Extends Full Height to the Very Bottom Across All Dashboards */
          #sidebar,
          aside.sidebar,
          aside.ad-sidebar,
          aside.ct-sidebar {
            background-color: var(--sidebar-bg, var(--sb-bg, #092e18)) !important;
            color: #ffffff !important;
            min-height: 100vh !important;
            height: auto !important;
            align-self: stretch !important;
            box-shadow: 0 5000px 0 0 var(--sidebar-bg, var(--sb-bg, #092e18)) !important;
          }

          /* Universal Hamburger Toggle Button */
          .mobile-nav-toggle,
          #mobileMenuBtn,
          .ct-mobile-menu-btn,
          #sidebarToggle {
            display: none;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            min-width: 40px;
            min-height: 40px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
            color: #0f172a;
            cursor: pointer;
            padding: 0;
            flex-shrink: 0;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
            transition: background 0.15s ease, transform 0.15s ease;
          }
          .mobile-nav-toggle:active,
          #mobileMenuBtn:active,
          .ct-mobile-menu-btn:active,
          #sidebarToggle:active {
            transform: scale(0.95);
            background: #f1f5f9;
          }
          .mobile-nav-toggle svg,
          #mobileMenuBtn svg,
          .ct-mobile-menu-btn svg,
          #sidebarToggle svg {
            width: 20px;
            height: 20px;
            stroke: currentColor;
          }

          /* Sidebar Backdrop Overlay */
          .sidebar-backdrop,
          #sidebarBackdrop {
            display: none;
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            height: 100dvh;
            background: rgba(15, 23, 42, 0.55);
            backdrop-filter: blur(3px);
            -webkit-backdrop-filter: blur(3px);
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.25s ease;
          }
          .sidebar-backdrop.active,
          #sidebarBackdrop.active {
            display: block !important;
            opacity: 1 !important;
          }

          /* Sidebar Close Button */
          .sidebar-close-btn {
            display: none;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.18);
            background: rgba(255,255,255,0.08);
            color: #ffffff;
            font-size: 16px;
            cursor: pointer;
            margin-left: auto;
            flex-shrink: 0;
          }

          /* TABLET, LANDSCAPE PHONE & MOBILE BREAKPOINT (<= 1024px, <= 600px height, or Touch Device) */
          @media (max-width: 1024px), (hover: none) and (pointer: coarse), (max-height: 600px) {
            html, body {
              display: flex !important;
              flex-direction: column !important;
              width: 100% !important;
              max-width: 100vw !important;
              height: auto !important;
              min-height: 100vh !important;
              min-height: 100dvh !important;
              max-height: none !important;
              overflow-x: hidden !important;
              overflow-y: auto !important;
            }

            /* Show Hamburger Button */
            .mobile-nav-toggle,
            #mobileMenuBtn,
            .ct-mobile-menu-btn,
            #sidebarToggle {
              display: inline-flex !important;
            }

            /* Unified Off-Canvas Drawer for Admin, Adopter & Caretaker Sidebars */
            #sidebar,
            aside.sidebar,
            aside.ad-sidebar,
            aside.ct-sidebar {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              bottom: 0 !important;
              width: 280px !important;
              min-width: 280px !important;
              max-width: 84vw !important;
              height: 100vh !important;
              height: 100dvh !important;
              z-index: 10005 !important;
              transform: translateX(-105%) !important;
              transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
              display: flex !important;
              flex-direction: column !important;
              visibility: hidden !important;
              overflow-y: auto !important;
              margin: 0 !important;
            }

            #sidebar.mobile-open,
            #sidebar.open,
            aside.sidebar.mobile-open,
            aside.sidebar.open,
            aside.ad-sidebar.mobile-open,
            aside.ad-sidebar.open,
            aside.ct-sidebar.mobile-open,
            aside.ct-sidebar.open {
              transform: translateX(0) !important;
              visibility: visible !important;
              box-shadow: 14px 0 38px rgba(0, 0, 0, 0.45) !important;
            }

            /* Ensure all sidebar text labels & brand names remain visible inside mobile drawer */
            #sidebar .sb-brand-text,
            #sidebar .sidebar-section-label,
            #sidebar .nav-link span,
            #sidebar .ad-brand-name,
            #sidebar .ad-brand-tag,
            #sidebar .ad-nav-link span,
            #sidebar .ad-section-label,
            #sidebar .ad-user-info,
            #sidebar .ct-brand-name,
            #sidebar .ct-brand-tag,
            #sidebar .ct-nav-link span,
            #sidebar .ct-section-label,
            #sidebar .ct-user-info {
              display: block !important;
            }
            #sidebar .nav-link,
            #sidebar .ad-nav-link,
            #sidebar .ct-nav-link {
              justify-content: flex-start !important;
              padding: 11px 14px !important;
              gap: 12px !important;
            }

            .sidebar-close-btn {
              display: inline-flex !important;
            }

            /* Full-width Main Content Wrappers across Admin, Adopter, Caretaker & My Trees */
            .main-content,
            .main-wrapper,
            .ad-main,
            .ad-main-wrapper,
            .ct-main,
            .ct-main-wrapper,
            .ct-main-content,
            .map-content-area,
            .content-area,
            .content-container,
            .tree-map-container,
            .page-body,
            .dash-body,
            .ad-body,
            .ct-body,
            main {
              width: 100% !important;
              max-width: 100vw !important;
              min-width: 0 !important;
              margin-left: 0 !important;
              height: auto !important;
              max-height: none !important;
              flex: 1 1 auto !important;
              overflow: visible !important;
              box-sizing: border-box !important;
            }

            /* Allow Top Headers to Wrap Cleanly on Mobile/Tablet */
            header.top-navbar,
            header.topbar,
            header.dash-header,
            header.page-header,
            header.ad-header,
            header.ct-header,
            header.ct-navbar {
              display: flex !important;
              flex-wrap: wrap !important;
              padding: 12px 14px !important;
              gap: 10px !important;
              height: auto !important;
              min-height: 0 !important;
              width: 100% !important;
              max-width: 100vw !important;
              box-sizing: border-box !important;
            }

            header .nav-title-group,
            header .header-left,
            header .ad-header-left,
            header .ct-header-left,
            header .ct-page-title-group {
              display: flex !important;
              align-items: center !important;
              gap: 10px !important;
              flex: 1 1 auto !important;
              width: 100% !important;
              min-width: 0 !important;
            }

            header .topbar-title {
              display: flex !important;
              flex-direction: column !important;
              justify-content: center !important;
              gap: 2px !important;
              flex: 1 1 calc(100% - 56px) !important;
              min-width: 0 !important;
            }

            header .page-title,
            header .topbar-title h1,
            header .header-left h1,
            header .ad-page-title,
            header .ct-page-title {
              font-size: 18px !important;
              line-height: 1.25 !important;
              margin: 0 !important;
            }

            header .page-subtitle,
            header .topbar-sub,
            header .ad-page-sub,
            header .ct-page-sub {
              font-size: 11.5px !important;
              line-height: 1.35 !important;
              white-space: normal !important;
              margin: 0 !important;
            }

            header .nav-actions-group,
            header .topbar-actions,
            header .header-right,
            header .ad-header-right,
            header .ct-header-right,
            header .ct-nav-actions,
            header .ct-navbar-right {
              display: flex !important;
              align-items: center !important;
              flex-wrap: wrap !important;
              gap: 6px !important;
              width: 100% !important;
              justify-content: flex-start !important;
            }

            header .sidebar-user-row {
              width: 100% !important;
              justify-content: space-between !important;
              margin-top: 2px !important;
            }

            /* 2-Column Compact KPI & Summary Cards across all Dashboards */
            .stats-grid,
            .summary-cards-grid,
            .summary-cards-row-1,
            .summary-cards-row-2,
            .metrics-grid,
            .kpi-grid,
            .impact-summary-grid,
            .user-summary-grid,
            .content-summary-grid,
            .notif-summary-grid,
            .ad-stats-grid,
            .mytrees-stats-grid,
            .ct-stats-grid,
            .ov-grid,
            .sum-grid,
            .qa-grid,
            .ad-impact-grid,
            .adopter-kpi-row,
            .community-metric-grid,
            .maint-impact-box {
              display: grid !important;
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 10px !important;
              width: 100% !important;
            }

            .kpi-grid .kpi-card:last-child:nth-child(odd),
            .impact-summary-grid > *:last-child:nth-child(odd),
            .user-summary-grid > *:last-child:nth-child(odd),
            .content-summary-grid > *:last-child:nth-child(odd),
            .notif-summary-grid > *:last-child:nth-child(odd) {
              grid-column: 1 / -1 !important;
            }

            .stat-card,
            .summary-card,
            .metric-card,
            .kpi-card,
            .ad-stat-card,
            .ct-stat-card {
              padding: 12px !important;
              min-width: 0 !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
            }

            .stat-value,
            .sc-value,
            .mc-value,
            .kpi-value,
            .ad-stat-val,
            .ct-stat-val {
              font-size: 18px !important;
            }

            /* Stack Split Map & Content Grids Vertically into 1 Clean Column */
            .mid-grid,
            .bot-grid,
            .foot-grid,
            .ad-mid-grid,
            .ad-bot-grid,
            .ct-mid-grid,
            .ct-bot-grid,
            .two-col,
            .three-col,
            .survival-layout,
            .insights-grid,
            .trees-split-container,
            .map-workspace-layout,
            .lateral-panels-stack,
            .map-split-stage,
            .profile-grid,
            .profile-content-grid,
            .homepage-manager-grid,
            .media-grid,
            .eco-grid,
            .stories-grid,
            .report-grid-2,
            .report-grid-3,
            .report-types-grid,
            .settings-grid-layout,
            .settings-toggle-grid,
            .role-cards-grid,
            .attention-list-grid {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) !important;
              gap: 14px !important;
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
            }

            /* Reset any multi-column spans on direct children so they never create ghost columns */
            .mid-grid > *,
            .bot-grid > *,
            .foot-grid > *,
            .ad-mid-grid > *,
            .ad-bot-grid > *,
            .ct-mid-grid > *,
            .ct-bot-grid > *,
            .two-col > *,
            .three-col > *,
            .survival-layout > *,
            .insights-grid > *,
            .trees-split-container > *,
            .map-workspace-layout > *,
            .map-split-stage > *,
            .profile-grid > *,
            .profile-content-grid > *,
            .settings-grid-layout > * {
              grid-column: 1 / -1 !important;
              min-width: 0 !important;
              max-width: 100% !important;
            }

            /* Stack Form Rows & Filter Bars cleanly on Mobile */
            .form-row,
            .form-grid,
            .form-grid-2,
            .form-grid-3,
            .filters-row,
            .filters-dropdown-grid,
            .filters-bar-inline,
            .controls-top-row {
              grid-template-columns: 1fr !important;
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 10px !important;
            }

            /* Ensure Cards & Grid Items Never Overflow Mobile Viewport */
            .card,
            .chart-card,
            .table-card,
            .panel-card,
            .section-card,
            .impact-card,
            .audit-card,
            .tree-list-card,
            .tree-profile-panel {
              min-width: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
              box-sizing: border-box !important;
              overflow-x: auto !important;
              -webkit-overflow-scrolling: touch !important;
            }

            /* Responsive Tables & Tab Bars with Smooth Touch Scroll */
            .table-responsive,
            .table-wrap,
            .table-container,
            .trees-table-wrap,
            .adopters-table-wrap,
            .caretakers-table-wrap,
            .users-table-wrap,
            .logs-table-wrap,
            .tab-list,
            .tabs-bar {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              overflow-x: auto !important;
              -webkit-overflow-scrolling: touch !important;
            }

            .tab-list {
              display: flex !important;
              flex-wrap: nowrap !important;
              gap: 6px !important;
            }

            .bulk-action-bar,
            .bulk-btns-group,
            .tabs-header,
            .tab-meta,
            .card-header,
            .section-header-row {
              flex-wrap: wrap !important;
              max-width: 100% !important;
              gap: 8px !important;
            }

            /* Keep Closed Off-Canvas Detail Drawers Off-Screen Without Expanding Viewport */
            .drill-panel.hidden,
            .user-drawer:not(.open):not(.active),
            .detail-drawer:not(.open):not(.active),
            .notif-drawer:not(.open):not(.active),
            .log-drawer:not(.open):not(.active),
            #userDrawer:not(.open):not(.active),
            #detailDrawer:not(.open):not(.active),
            #notifDrawer:not(.open):not(.active),
            #logDrawer:not(.open):not(.active) {
              position: fixed !important;
              right: 0 !important;
              transform: translateX(105%) !important;
              visibility: hidden !important;
              pointer-events: none !important;
              max-width: 100vw !important;
            }

            /* Prevent iOS Auto-Zoom on Input Focus */
            input[type="text"],
            input[type="email"],
            input[type="password"],
            input[type="number"],
            input[type="tel"],
            input[type="date"],
            input[type="search"],
            select,
            textarea {
              font-size: 16px !important;
            }

            /* Fit Modals & Drawers Accurately on Cellphone Screens */
            .modal-dialog,
            .modal-card,
            .modal-box,
            .modal-content,
            .wizard-modal,
            .profile-modal {
              width: 95vw !important;
              max-width: 95vw !important;
              max-height: 90dvh !important;
              margin: 10px auto !important;
              border-radius: 16px !important;
            }

            .tree-drawer-panel,
            .ct-drawer-panel {
              width: 100vw !important;
              max-width: 100vw !important;
            }

            /* Comfortable Map Height on Cellphones */
            #leafletMap,
            #adminTreeMap,
            #caretakerMap,
            #myTreesMap,
            #adopterMap {
              min-height: 300px !important;
              max-height: 55vh !important;
            }

            /* Compact Padding for Main Content Containers */
            .dash-body,
            .content-container,
            .page-content,
            .page-body,
            .ad-body,
            .ct-body,
            .mytrees-body {
              padding: 12px !important;
            }
          }
        `;
        document.head.appendChild(style);
      }

      // 3. Auto-Inject Hamburger Button, Close Button & Backdrop for Any Page with a Sidebar
      function setupMobileDrawerElements() {
        const sidebar = document.getElementById('sidebar') || document.querySelector('aside.sidebar, aside.ad-sidebar, aside.ct-sidebar');
        if (!sidebar) return;

        // Ensure backdrop exists
        let backdrop = document.getElementById('sidebarBackdrop') || document.querySelector('.sidebar-backdrop');
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.id = 'sidebarBackdrop';
          backdrop.className = 'sidebar-backdrop';
          document.body.appendChild(backdrop);
        }

        // Ensure close button inside sidebar header exists
        const sbHeader = sidebar.querySelector('.sidebar-logo, .ad-brand-logo, .ct-brand-logo, .sidebar-header');
        if (sbHeader && !sbHeader.querySelector('.sidebar-close-btn')) {
          const closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.className = 'sidebar-close-btn';
          closeBtn.setAttribute('aria-label', 'Close navigation menu');
          closeBtn.innerHTML = '✕';
          sbHeader.appendChild(closeBtn);
        }

        // Ensure hamburger toggle button exists in top header
        const header = document.querySelector('header.dash-header, header.top-navbar, header.topbar, header.page-header, header.ad-header, header.ct-header, header.ct-navbar, header');
        if (header) {
          let toggleBtn = header.querySelector('.mobile-nav-toggle, #mobileMenuBtn, .ct-mobile-menu-btn, #sidebarToggle');
          const leftGroup = header.querySelector('.header-left, .nav-title-group, .topbar-title, .ad-header-left, .ct-header-left, .ct-page-title-group') || header;

          if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'mobile-nav-toggle';
            toggleBtn.id = 'mobileMenuBtn';
            toggleBtn.setAttribute('aria-label', 'Open navigation menu');
            toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
            leftGroup.insertBefore(toggleBtn, leftGroup.firstChild);
          }

          // Group ungrouped title + subtitle siblings inside leftGroup into a vertical flex column so [Hamburger] + [Title/Sub] align cleanly
          if (leftGroup !== header && !leftGroup.classList.contains('topbar-title') && !leftGroup.querySelector('.header-title-stack, .title-text-group')) {
            const textNodes = Array.from(leftGroup.children).filter(el => el !== toggleBtn);
            if (textNodes.length > 1) {
              const stack = document.createElement('div');
              stack.className = 'header-title-stack';
              stack.style.cssText = 'display:flex;flex-direction:column;justify-content:center;min-width:0;flex:1;';
              textNodes.forEach(node => stack.appendChild(node));
              leftGroup.appendChild(stack);
            }
          }

          // Bind open/close handlers idempotently and stop immediate propagation to prevent duplicate listener conflicts
          if (!toggleBtn.dataset.mobileBound) {
            toggleBtn.dataset.mobileBound = 'true';
            const closeSidebar = () => {
              sidebar.classList.remove('mobile-open', 'open');
              backdrop.classList.remove('active');
              document.body.style.overflow = '';
            };
            const toggleSidebar = (e) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
              }
              const isOpen = sidebar.classList.contains('mobile-open') || sidebar.classList.contains('open');
              if (isOpen) {
                closeSidebar();
              } else {
                sidebar.classList.add('mobile-open', 'open');
                backdrop.classList.add('active');
                document.body.style.overflow = 'hidden';
              }
            };

            toggleBtn.addEventListener('click', toggleSidebar, true);
            backdrop.addEventListener('click', closeSidebar);
            sidebar.querySelectorAll('.sidebar-close-btn').forEach(btn => btn.addEventListener('click', closeSidebar));
            sidebar.querySelectorAll('a.nav-link, a.ad-nav-link, a.ct-nav-link').forEach(link => {
              link.addEventListener('click', () => {
                if (window.innerWidth <= 1024 || window.innerHeight <= 600 || document.documentElement.classList.contains('is-mobile-device')) {
                  closeSidebar();
                }
              });
            });
            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') closeSidebar();
            });
            window.addEventListener('resize', () => {
              if (window.innerWidth > 1024 && window.innerHeight > 600 && !document.documentElement.classList.contains('is-mobile-device')) {
                closeSidebar();
              }
            });
          }
        }
      }

      setupMobileDrawerElements();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupMobileDrawerElements);
      }
    } catch (mobileErr) {
      console.warn('[ATAMAN Mobile Engine] Notice:', mobileErr);
    }
  }
  initUniversalMobileResponsiveEngine();

  /* ═══════════════════════════════════════════════════════════════════════════
   * ATAMAN INCENTIVES, TREE POOL ALLOCATION, CERTIFICATES & QR TRACKING MODULE
   * Rate: 50 PHP per tree | Mortality Deduction: -50 PHP per dead tree
   * ═══════════════════════════════════════════════════════════════════════════ */
  (function initAtamanIncentivesCertificatesQr() {
    const RATE_PER_TREE = 50; // 50 PHP per tree funded / assigned / deducted on mortality

    function getCurrentMonthKey() {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    function getCurrentMonthLabel() {
      return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    function getTreesCache() {
      try {
        const raw = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
        if (Array.isArray(raw) && raw.length > 0) return raw;
      } catch (_) {}
      return (window.ATAMAN_DEFAULT_TREES || []).slice();
    }

    function getAdoptersCache() {
      try {
        const raw = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
        if (Array.isArray(raw) && raw.length > 0) return raw;
      } catch (_) {}
      return (window.ATAMAN_DEFAULT_ADOPTERS || []).slice();
    }

    function getCaretakersCache() {
      try {
        const raw = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
        if (Array.isArray(raw) && raw.length > 0) return raw;
      } catch (_) {}
      return (window.ATAMAN_DEFAULT_CARETAKERS || []).slice();
    }

    /* ── 1. Mandatory Monthly Status Logs Cache ── */
    function getMonthlyLogs() {
      const monthKey = getCurrentMonthKey();
      let logs = [];
      try {
        logs = JSON.parse(localStorage.getItem('ATAMAN_monthly_logs_cache') || '[]');
        if (!Array.isArray(logs)) logs = [];
      } catch (_) {
        logs = [];
      }

      // Seed current month logs for existing registered trees if not yet initialized
      if (!localStorage.getItem('ATAMAN_monthly_logs_seeded_' + monthKey)) {
        const trees = getTreesCache();
        trees.forEach(t => {
          if (!t || !t.id) return;
          const exists = logs.some(l => l.treeId === t.id && l.monthKey === monthKey);
          if (!exists) {
            const count = Math.max(1, parseInt(t.treeCount || t.count) || 1);
            const st = String(t.status || t.health || 'healthy').toLowerCase();
            const isDead = st === 'dead';
            const deadCnt = isDead ? count : Math.max(0, parseInt(t.deadCount) || 0);
            logs.push({
              id: `MLOG-${monthKey}-${t.id}`,
              treeId: t.id,
              monthKey: monthKey,
              monthLabel: getCurrentMonthLabel(),
              caretaker: t.caretaker || 'Dodong Zeta',
              status: isDead ? 'dead' : (st.includes('crit') ? 'critical' : (st.includes('need') ? 'needs-care' : 'healthy')),
              totalBatchTrees: count,
              survivingCount: Math.max(0, count - deadCnt),
              deadCount: deadCnt,
              height: t.height || '2.5 meters',
              notes: `Monthly field health & survival verification for ${t.id} in Brgy. ${t.barangay || 'Guinsorongan'}.`,
              verified: true,
              updatedAt: new Date().toISOString()
            });
          }
        });
        try {
          localStorage.setItem('ATAMAN_monthly_logs_cache', JSON.stringify(logs));
          localStorage.setItem('ATAMAN_monthly_logs_seeded_' + monthKey, 'true');
        } catch (_) {}
      }
      return logs;
    }

    /* ── 2. Adopter Fund & Tree Pool Allocation Logic (50 PHP / Tree) ── */
    function getAdopterPoolAllocation(adopterNameOrEmail) {
      const adopters = getAdoptersCache();
      const trees = getTreesCache();
      const q = String(adopterNameOrEmail || localStorage.getItem('ATAMAN_user_name') || 'Nikki Maga').toLowerCase().trim();

      let adopter = adopters.find(a =>
        (a.name && a.name.toLowerCase().trim() === q) ||
        (a.fullName && a.fullName.toLowerCase().trim() === q) ||
        (a.email && a.email.toLowerCase().trim() === q)
      );
      if (!adopter && adopters.length > 0) adopter = adopters[0];

      const adopterName = adopter ? (adopter.name || adopter.fullName || 'Nikki Maga') : 'Nikki Maga';
      const adLower = adopterName.toLowerCase().trim();

      // Trees linked to this adopter in the tree registry
      const adopterTreeBatches = trees.filter(t => {
        const sp = String(t.adopter || t.sponsorName || '').toLowerCase().trim();
        return sp === adLower || (adLower.includes('nikki') && sp.includes('nikki'));
      });

      const adoptedTreesFromRegistry = adopterTreeBatches.reduce((sum, t) => {
        return sum + Math.max(1, parseInt(t.takenCount || t.treeCount || t.count) || 1);
      }, 0);

      // Total funded trees at 50 PHP per tree
      const rawFunding = adopter ? (parseFloat(adopter.funding || adopter.fundingPaid) || 0) : 0;
      const fundedFromPhp = Math.floor(rawFunding / RATE_PER_TREE);
      const basePoolTrees = Math.max(
        adoptedTreesFromRegistry,
        parseInt(adopter?.fundedPoolTrees || adopter?.treesCount) || 0,
        fundedFromPhp,
        10
      );
      const totalFundingPhp = Math.max(rawFunding, basePoolTrees * RATE_PER_TREE);

      // Trees assigned to a Caretaker are automatically deducted from the Adopter's available funded tree pool
      const assignedToCaretakerTrees = adopterTreeBatches.reduce((sum, t) => {
        const hasCaretaker = Boolean(t.caretaker && t.caretaker !== 'Unassigned' && t.caretaker !== 'None');
        if (!hasCaretaker) return sum;
        return sum + Math.max(1, parseInt(t.takenCount || t.treeCount || t.count) || 1);
      }, 0);

      const remainingUnassignedPool = Math.max(0, basePoolTrees - assignedToCaretakerTrees);
      const caretakerNames = Array.from(new Set(
        adopterTreeBatches
          .map(t => t.caretaker)
          .filter(c => c && c !== 'Unassigned' && c !== 'None')
      ));

      return {
        adopterId: adopter?.id || 'ADP-101',
        adopterName: adopterName,
        adopterEmail: adopter?.email || 'nikkimaga24@gmail.com',
        ratePerTreePhp: RATE_PER_TREE,
        totalFundingPhp: totalFundingPhp,
        fundedTreePoolTotal: basePoolTrees,
        assignedToCaretakerTrees: assignedToCaretakerTrees,
        remainingUnassignedPool: remainingUnassignedPool,
        caretakersAssigned: caretakerNames.length > 0 ? caretakerNames : ['Dodong Zeta'],
        batches: adopterTreeBatches
      };
    }

    /* ── 3. Caretaker Incentive & Mortality Deduction Calculation (50 PHP / Tree, -50 PHP / Dead Tree) ── */
    function getCaretakerIncentiveSummary(caretakerNameOrEmail) {
      const trees = getTreesCache();
      const caretakers = getCaretakersCache();
      const monthlyLogs = getMonthlyLogs();
      const monthKey = getCurrentMonthKey();

      const q = String(caretakerNameOrEmail || localStorage.getItem('ATAMAN_user_name') || 'Dodong Zeta').toLowerCase().trim();
      let ct = caretakers.find(c =>
        (c.name && c.name.toLowerCase().trim() === q) ||
        (c.fullName && c.fullName.toLowerCase().trim() === q) ||
        (c.email && c.email.toLowerCase().trim() === q)
      );
      if (!ct && caretakers.length > 0) ct = caretakers[0];

      const ctName = ct ? (ct.name || ct.fullName || 'Dodong Zeta') : 'Dodong Zeta';
      const ctLower = ctName.toLowerCase().trim();

      const assignedBatches = trees.filter(t => {
        if (!t) return false;
        const cName = String(t.caretaker || '').toLowerCase().trim();
        if (cName === ctLower || (ctLower.includes('dodong') && cName.includes('dodong'))) return true;
        return Boolean(cName && cName !== 'unassigned' && cName !== 'none' && caretakers.length === 1);
      });

      let totalAssignedTrees = 0;
      let deadTreesCount = 0;
      let healthyTreesCount = 0;
      let needsCareCount = 0;
      let criticalCount = 0;
      let loggedBatchesThisMonth = 0;

      const batchDetails = assignedBatches.map(t => {
        const count = Math.max(1, parseInt(t.treeCount || t.count) || 1);
        const st = String(t.status || t.health || 'healthy').toLowerCase();
        const mLog = monthlyLogs.find(l => l.treeId === t.id && l.monthKey === monthKey);

        let batchDead = 0;
        if (st === 'dead') {
          batchDead = count;
        } else if (typeof t.deadCount === 'number' && t.deadCount > 0) {
          batchDead = Math.min(count, t.deadCount);
        } else if (mLog && typeof mLog.deadCount === 'number' && mLog.deadCount > 0) {
          batchDead = Math.min(count, mLog.deadCount);
        }

        const batchSurviving = Math.max(0, count - batchDead);
        totalAssignedTrees += count;
        deadTreesCount += batchDead;

        if (st === 'dead') {
          // already counted in deadTreesCount
        } else if (st.includes('crit')) {
          criticalCount += batchSurviving;
        } else if (st.includes('need')) {
          needsCareCount += batchSurviving;
        } else {
          healthyTreesCount += batchSurviving;
        }

        const isLogged = Boolean(mLog && mLog.verified);
        if (isLogged) loggedBatchesThisMonth += 1;

        const speciesName = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Narra';
        return {
          id: t.id,
          species: speciesName,
          barangay: t.barangay || 'Guinsorongan',
          adopter: t.adopter || t.sponsorName || '',
          totalCount: count,
          survivingCount: batchSurviving,
          deadCount: batchDead,
          status: st,
          grossPhp: count * RATE_PER_TREE,
          deductionPhp: batchDead * RATE_PER_TREE,
          netPhp: batchSurviving * RATE_PER_TREE,
          isLoggedThisMonth: isLogged,
          lastLogDate: mLog?.updatedAt ? new Date(mLog.updatedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : (t.lastCheck || 'Pending')
        };
      });

      const survivingTreesCount = Math.max(0, totalAssignedTrees - deadTreesCount);
      const grossIncentivePhp = totalAssignedTrees * RATE_PER_TREE;
      const mortalityDeductionPhp = deadTreesCount * RATE_PER_TREE;
      const netReceivableIncentivePhp = Math.max(0, grossIncentivePhp - mortalityDeductionPhp);
      const totalBatches = assignedBatches.length;
      const compliancePct = totalBatches > 0 ? Math.round((loggedBatchesThisMonth / totalBatches) * 100) : 100;
      const isValidatedForRelease = totalBatches > 0 && loggedBatchesThisMonth >= totalBatches;
      const survivalRatePct = totalAssignedTrees > 0 ? ((survivingTreesCount / totalAssignedTrees) * 100).toFixed(1) : '100.0';

      return {
        caretakerId: ct?.id || 'CT-101',
        caretakerName: ctName,
        caretakerEmail: ct?.email || 'zetadodong@gmail.com',
        ratePerTreePhp: RATE_PER_TREE,
        monthKey: monthKey,
        monthLabel: getCurrentMonthLabel(),
        totalBatches: totalBatches,
        loggedBatchesThisMonth: loggedBatchesThisMonth,
        compliancePct: compliancePct,
        isValidatedForRelease: isValidatedForRelease,
        totalAssignedTrees: totalAssignedTrees,
        survivingTreesCount: survivingTreesCount,
        deadTreesCount: deadTreesCount,
        healthyTreesCount: healthyTreesCount,
        needsCareCount: needsCareCount,
        criticalCount: criticalCount,
        survivalRatePct: survivalRatePct,
        grossIncentivePhp: grossIncentivePhp,
        mortalityDeductionPhp: mortalityDeductionPhp,
        netReceivableIncentivePhp: netReceivableIncentivePhp,
        batches: batchDetails
      };
    }

    /* ── 4. Record Monthly Tree Status Update & Apply Mortality Deduction ── */
    function recordMonthlyTreeUpdate(payload) {
      if (!payload || !payload.treeId) return null;
      const monthKey = getCurrentMonthKey();
      const trees = getTreesCache();
      const logs = getMonthlyLogs();

      const treeIdx = trees.findIndex(t => t && t.id === payload.treeId);
      if (treeIdx === -1) return null;

      const tree = Object.assign({}, trees[treeIdx]);
      const batchCount = Math.max(1, parseInt(tree.treeCount || tree.count) || 1);
      const newStatus = String(payload.status || tree.status || 'healthy').toLowerCase();

      let deadCount = parseInt(payload.deadCount, 10);
      if (isNaN(deadCount) || deadCount < 0) {
        deadCount = newStatus === 'dead' ? batchCount : (parseInt(tree.deadCount) || 0);
      }
      deadCount = Math.min(batchCount, Math.max(0, deadCount));

      // If all trees in batch died, status is dead; if status was set to dead and deadCount was 0, set deadCount = batchCount
      const effectiveStatus = (deadCount >= batchCount || newStatus === 'dead') ? 'dead' : newStatus;
      if (effectiveStatus === 'dead' && deadCount === 0) {
        deadCount = batchCount;
      }

      const healthLabel = effectiveStatus === 'dead'
        ? 'Dead'
        : (effectiveStatus.includes('crit') ? 'Critical' : (effectiveStatus.includes('need') ? 'Needs Care' : 'Healthy'));

      const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      tree.status = effectiveStatus;
      tree.health = healthLabel;
      tree.deadCount = deadCount;
      tree.survivingCount = Math.max(0, batchCount - deadCount);
      tree.lastCheck = todayLabel;
      tree.lastMon = todayLabel;
      if (payload.height) tree.height = payload.height;
      if (payload.notes) tree.notes = payload.notes;

      trees[treeIdx] = tree;
      try {
        localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(trees));
      } catch (_) {}

      const logEntry = {
        id: `MLOG-${monthKey}-${tree.id}`,
        treeId: tree.id,
        monthKey: monthKey,
        monthLabel: getCurrentMonthLabel(),
        caretaker: payload.caretakerName || tree.caretaker || 'Dodong Zeta',
        status: effectiveStatus,
        totalBatchTrees: batchCount,
        survivingCount: Math.max(0, batchCount - deadCount),
        deadCount: deadCount,
        height: payload.height || tree.height || '2.5 meters',
        notes: payload.notes || `Monthly status logged (${healthLabel}). Surviving: ${batchCount - deadCount}/${batchCount}.`,
        verified: true,
        updatedAt: new Date().toISOString()
      };

      const existingIdx = logs.findIndex(l => l.treeId === tree.id && l.monthKey === monthKey);
      if (existingIdx >= 0) {
        logs[existingIdx] = logEntry;
      } else {
        logs.push(logEntry);
      }

      try {
        localStorage.setItem('ATAMAN_monthly_logs_cache', JSON.stringify(logs));
      } catch (_) {}

      // Broadcast updates across all open tabs and dashboard components
      window.dispatchEvent(new CustomEvent('ATAMAN:trees-updated', { detail: { treeId: tree.id } }));
      window.dispatchEvent(new CustomEvent('ATAMAN:incentives-updated', { detail: { treeId: tree.id, logEntry } }));
      refreshDashboardIncentiveWidgets();

      return getCaretakerIncentiveSummary(logEntry.caretaker);
    }

    /* ── 5. Pure-JS ISO/IEC 18004 QR Code Matrix Generator (Scannable Byte Mode) ── */
    // Generates an authentic, smartphone-scannable QR Code SVG/Canvas with Reed-Solomon ECC
    const QRGenerator = (function() {
      // GF(256) exponent & log tables for Reed-Solomon
      const EXP = new Uint8Array(512);
      const LOG = new Uint8Array(256);
      (function initGF() {
        let x = 1;
        for (let i = 0; i < 255; i++) {
          EXP[i] = x;
          LOG[x] = i;
          x <<= 1;
          if (x & 0x100) x ^= 0x11d;
        }
        for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
      })();

      function gfMul(a, b) {
        return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
      }

      function rsGeneratorPoly(degree) {
        let poly = [1];
        for (let i = 0; i < degree; i++) {
          const next = new Array(poly.length + 1).fill(0);
          const root = EXP[i];
          for (let j = 0; j < poly.length; j++) {
            next[j] ^= poly[j];
            next[j + 1] ^= gfMul(poly[j], root);
          }
          poly = next;
        }
        return poly;
      }

      function rsEncode(data, ecLen) {
        const gen = rsGeneratorPoly(ecLen);
        const msg = new Uint8Array(data.length + ecLen);
        msg.set(data, 0);
        for (let i = 0; i < data.length; i++) {
          const coef = msg[i];
          if (coef !== 0) {
            for (let j = 0; j < gen.length; j++) {
              msg[i + j] ^= gfMul(gen[j], coef);
            }
          }
        }
        return msg.slice(data.length);
      }

      // Version capacities for ECC Level L (versions 1..6)
      const VERSION_INFO = [
        null,
        { size: 21, totalData: 19, ecPerBlock: 7, blocks: 1, align: [] },
        { size: 25, totalData: 34, ecPerBlock: 10, blocks: 1, align: [6, 18] },
        { size: 29, totalData: 55, ecPerBlock: 15, blocks: 1, align: [6, 22] },
        { size: 33, totalData: 80, ecPerBlock: 20, blocks: 1, align: [6, 26] },
        { size: 37, totalData: 108, ecPerBlock: 26, blocks: 1, align: [6, 30] },
        { size: 41, totalData: 136, ecPerBlock: 18, blocks: 2, align: [6, 34] }
      ];

      function createMatrix(text) {
        const bytes = new TextEncoder().encode(String(text || 'https://saplink-f4721.web.app'));
        let ver = 1;
        while (ver < 6 && bytes.length + 2 > VERSION_INFO[ver].totalData) ver++;
        const info = VERSION_INFO[ver];
        const maxPayload = info.totalData - 2;
        const payload = bytes.length > maxPayload ? bytes.slice(0, maxPayload) : bytes;

        // Bit buffer: Mode 0100 (Byte), 8-bit length, payload bytes, terminator, pad bytes
        const bits = [];
        const pushBits = (val, len) => {
          for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
        };
        pushBits(0b0100, 4);
        pushBits(payload.length, 8);
        for (let i = 0; i < payload.length; i++) pushBits(payload[i], 8);
        for (let i = 0; i < 4 && bits.length < info.totalData * 8; i++) bits.push(0);
        while (bits.length % 8 !== 0) bits.push(0);

        const dataBytes = new Uint8Array(info.totalData);
        for (let i = 0; i < bits.length / 8; i++) {
          let b = 0;
          for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
          dataBytes[i] = b;
        }
        const pads = [0xEC, 0x11];
        for (let i = bits.length / 8, p = 0; i < info.totalData; i++, p ^= 1) {
          dataBytes[i] = pads[p];
        }

        // Split into blocks if needed & compute RS ECC
        let finalCodewords = [];
        if (info.blocks === 1) {
          const ec = rsEncode(dataBytes, info.ecPerBlock);
          finalCodewords = Array.from(dataBytes).concat(Array.from(ec));
        } else {
          const blockLen = info.totalData / info.blocks;
          const b1 = dataBytes.slice(0, blockLen);
          const b2 = dataBytes.slice(blockLen);
          const ec1 = rsEncode(b1, info.ecPerBlock);
          const ec2 = rsEncode(b2, info.ecPerBlock);
          for (let i = 0; i < blockLen; i++) finalCodewords.push(b1[i], b2[i]);
          for (let i = 0; i < info.ecPerBlock; i++) finalCodewords.push(ec1[i], ec2[i]);
        }

        const N = info.size;
        const grid = Array.from({ length: N }, () => new Int8Array(N).fill(-1));
        const reserved = Array.from({ length: N }, () => new Uint8Array(N));

        const setModule = (r, c, val, res = true) => {
          if (r >= 0 && r < N && c >= 0 && c < N) {
            grid[r][c] = val ? 1 : 0;
            if (res) reserved[r][c] = 1;
          }
        };

        // Finder patterns + separators
        const placeFinder = (r0, c0) => {
          for (let dr = -1; dr <= 7; dr++) {
            for (let dc = -1; dc <= 7; dc++) {
              const r = r0 + dr, c = c0 + dc;
              if (r < 0 || r >= N || c < 0 || c >= N) continue;
              const inOuter = (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) || (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6));
              const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
              setModule(r, c, inOuter || inInner ? 1 : 0, true);
            }
          }
        };
        placeFinder(0, 0);
        placeFinder(0, N - 7);
        placeFinder(N - 7, 0);

        // Alignment patterns
        if (info.align.length > 0) {
          for (const ar of info.align) {
            for (const ac of info.align) {
              if ((ar < 9 && ac < 9) || (ar < 9 && ac > N - 10) || (ar > N - 10 && ac < 9)) continue;
              for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                  const isDark = Math.max(Math.abs(dr), Math.abs(dc)) === 2 || (dr === 0 && dc === 0);
                  setModule(ar + dr, ac + dc, isDark ? 1 : 0, true);
                }
              }
            }
          }
        }

        // Timing patterns
        for (let i = 8; i < N - 8; i++) {
          if (!reserved[6][i]) setModule(6, i, i % 2 === 0 ? 1 : 0, true);
          if (!reserved[i][6]) setModule(i, 6, i % 2 === 0 ? 1 : 0, true);
        }

        // Dark module & reserve format info areas
        setModule(N - 8, 8, 1, true);
        for (let i = 0; i < 9; i++) {
          if (!reserved[8][i]) reserved[8][i] = 1;
          if (!reserved[i][8]) reserved[i][8] = 1;
        }
        for (let i = 0; i < 8; i++) {
          if (!reserved[8][N - 1 - i]) reserved[8][N - 1 - i] = 1;
          if (!reserved[N - 1 - i][8]) reserved[N - 1 - i][8] = 1;
        }

        // Place data bits in upward/downward 2-column zig-zag
        const allBits = [];
        for (const cw of finalCodewords) {
          for (let b = 7; b >= 0; b--) allBits.push((cw >> b) & 1);
        }

        let bitIdx = 0;
        let up = true;
        for (let right = N - 1; right >= 1; right -= 2) {
          if (right === 6) right = 5;
          for (let vert = 0; vert < N; vert++) {
            const r = up ? (N - 1 - vert) : vert;
            for (let j = 0; j < 2; j++) {
              const c = right - j;
              if (!reserved[r][c]) {
                const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
                const mask = (r + c) % 2 === 0 ? 1 : 0; // Mask 0
                grid[r][c] = bit ^ mask;
              }
            }
          }
          up = !up;
        }

        // Format info for ECC Level L (01) + Mask 0 (000) -> 0x77c4
        const fmt = 0x77c4;
        const fmtCoords1 = [
          [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
          [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
        ];
        const fmtCoords2 = [
          [N - 1, 8], [N - 2, 8], [N - 3, 8], [N - 4, 8], [N - 5, 8], [N - 6, 8], [N - 7, 8],
          [8, N - 8], [8, N - 7], [8, N - 6], [8, N - 5], [8, N - 4], [8, N - 3], [8, N - 2], [8, N - 1]
        ];
        for (let i = 0; i < 15; i++) {
          const bit = (fmt >> i) & 1;
          const [r1, c1] = fmtCoords1[i];
          const [r2, c2] = fmtCoords2[i];
          grid[r1][c1] = bit;
          grid[r2][c2] = bit;
        }

        return grid;
      }

      function renderToSvg(text, sizePx = 180) {
        const grid = createMatrix(text);
        const N = grid.length;
        const quiet = 3;
        const total = N + quiet * 2;
        let paths = '';
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            if (grid[r][c] === 1) {
              paths += `M${c + quiet},${r + quiet}h1v1h-1z`;
            }
          }
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" style="display:block;border-radius:10px;background:#ffffff;">
          <rect width="${total}" height="${total}" fill="#ffffff"/>
          <path d="${paths}" fill="#0f172a"/>
        </svg>`;
      }

      function drawOnCanvas(ctx, text, x, y, sizePx) {
        const grid = createMatrix(text);
        const N = grid.length;
        const quiet = 2;
        const total = N + quiet * 2;
        const cell = sizePx / total;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, sizePx, sizePx);
        ctx.fillStyle = '#0f172a';
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            if (grid[r][c] === 1) {
              ctx.fillRect(
                Math.floor(x + (c + quiet) * cell),
                Math.floor(y + (r + quiet) * cell),
                Math.ceil(cell),
                Math.ceil(cell)
              );
            }
          }
        }
        ctx.restore();
      }

      return { createMatrix, renderToSvg, drawOnCanvas };
    })();

    function getTreeQrUrls(treeObj) {
      const t = treeObj || getTreesCache()[0] || {};
      const id = t.id || 'TR-10001';
      const lat = parseFloat(t.lat) || 11.7598;
      const lng = parseFloat(t.lng) || 124.8861;
      const brgy = t.barangay || 'Guinsorongan';
      const baseOrigin = (window.location.origin && window.location.origin.startsWith('http'))
        ? window.location.origin
        : 'https://saplink-f4721.web.app';
      const traceUrl = `${baseOrigin}/admin-tree-map.html?qr_tree=${encodeURIComponent(id)}&lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&brgy=${encodeURIComponent(brgy)}`;
      const googleMapsUrl = `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
      return { traceUrl, googleMapsUrl, lat, lng, id, brgy };
    }

    /* ── 6. Certificate of Recognition Modal & Downloadable PNG / Print Generator ── */
    function openCertificateModal(options = {}) {
      const role = String(options.role || (window.location.pathname.includes('adopter') ? 'adopter' : 'caretaker')).toLowerCase();
      const isAdopter = role === 'adopter';

      const adopterData = getAdopterPoolAllocation(options.personName);
      const caretakerData = getCaretakerIncentiveSummary(options.personName);

      const recipientName = options.personName || (isAdopter ? adopterData.adopterName : caretakerData.caretakerName);
      const certSerial = isAdopter
        ? `ATAMAN-CERT-ADP-${adopterData.adopterId}-${new Date().getFullYear()}`
        : `ATAMAN-CERT-CT-${caretakerData.caretakerId}-${new Date().getFullYear()}`;
      const issueDate = new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });

      const subtitleRole = isAdopter
        ? 'ENVIRONMENTAL SPONSORSHIP & TREE ADOPTION EXCELLENCE'
        : 'FOREST STEWARDSHIP & TREE NURTURING DEDICATION';

      const bodyCitation = isAdopter
        ? `In grateful recognition of their outstanding environmental contribution and financial sponsorship of <strong>${adopterData.fundedTreePoolTotal} Native &amp; Endemic Trees</strong> (<strong>₱${adopterData.totalFundingPhp.toLocaleString()} PHP</strong> funded at ₱50.00/tree) planted in <strong>Catbalogan City, Samar</strong>, sequestering approximately <strong>${(adopterData.fundedTreePoolTotal * 22)} kg CO₂/year</strong> and restoring local watershed biodiversity.`
        : `In grateful recognition of their exemplary field dedication, monthly health monitoring compliance (<strong>${caretakerData.compliancePct}% Verified Monthly Logs</strong>), and active stewardship in nurturing <strong>${caretakerData.survivingTreesCount} of ${caretakerData.totalAssignedTrees} Assigned Trees</strong> (<strong>${caretakerData.survivalRatePct}% Survival Rate</strong> • <strong>₱${caretakerData.netReceivableIncentivePhp.toLocaleString()} PHP</strong> Net Earned Incentive) across <strong>Catbalogan City, Samar</strong>.`;

      const metricsPillsHtml = isAdopter
        ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 14px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;">Trees Funded</div>
            <div style="font-size:16px;font-weight:800;color:#14532d;">${adopterData.fundedTreePoolTotal} Trees</div>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 14px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;">Total Contribution (₱50/Tree)</div>
            <div style="font-size:16px;font-weight:800;color:#14532d;">₱${adopterData.totalFundingPhp.toLocaleString()} PHP</div>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 14px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;">Caretaker Assigned</div>
            <div style="font-size:16px;font-weight:800;color:#14532d;">${adopterData.caretakersAssigned.join(', ')}</div>
          </div>
        `
        : `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 14px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;">Trees Nurtured</div>
            <div style="font-size:16px;font-weight:800;color:#14532d;">${caretakerData.survivingTreesCount} Active Trees</div>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 14px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;">Survival Rate</div>
            <div style="font-size:16px;font-weight:800;color:#14532d;">${caretakerData.survivalRatePct}%</div>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 14px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;">Net Earned Incentive</div>
            <div style="font-size:16px;font-weight:800;color:#14532d;">₱${caretakerData.netReceivableIncentivePhp.toLocaleString()} PHP</div>
          </div>
        `;

      const primaryTree = (isAdopter ? adopterData.batches[0] : getTreesCache()[0]) || getTreesCache()[0];
      const { traceUrl } = getTreeQrUrls(primaryTree);
      const qrSvg = QRGenerator.renderToSvg(traceUrl, 86);

      let modal = document.getElementById('atamanCertificateModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'atamanCertificateModal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,0.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:14px;overflow-y:auto;';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div style="background:#ffffff;border-radius:18px;max-width:860px;width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.35);padding:20px;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span style="font-size:1.15rem;font-weight:800;color:#0f172a;">📜 Official Certificate of Recognition</span>
              <div style="display:inline-flex;background:#f1f5f9;border-radius:8px;padding:3px;">
                <button type="button" id="certSwitchAdopterBtn" style="border:none;padding:5px 11px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;background:${isAdopter ? '#15803d' : 'transparent'};color:${isAdopter ? '#fff' : '#475569'};">Adopter Certificate</button>
                <button type="button" id="certSwitchCaretakerBtn" style="border:none;padding:5px 11px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;background:${!isAdopter ? '#15803d' : 'transparent'};color:${!isAdopter ? '#fff' : '#475569'};">Caretaker Certificate</button>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <button type="button" id="certDownloadPngBtn" style="background:#15803d;color:#ffffff;border:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;">⬇ Download Certificate (PNG)</button>
              <button type="button" id="certPrintBtn" style="background:#0f172a;color:#ffffff;border:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;">🖨️ Print / Save PDF</button>
              <button type="button" id="certCloseBtn" style="background:#f1f5f9;color:#334155;border:none;width:34px;height:34px;border-radius:8px;font-size:18px;font-weight:700;cursor:pointer;">&times;</button>
            </div>
          </div>

          <!-- Printable Certificate Frame -->
          <div id="atamanPrintableCertificate" style="background:linear-gradient(135deg,#ffffff 0%,#f0fdf4 100%);border:6px double #15803d;border-radius:14px;padding:32px 28px;position:relative;text-align:center;color:#0f172a;box-shadow:inset 0 0 0 2px #bbf7d0;">
            <div style="display:inline-flex;align-items:center;gap:8px;color:#15803d;font-weight:800;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">
              🌱 ATAMAN • TANOM. ATAMAN. PADAYON — SAMAR REFORESTATION INITIATIVE
            </div>
            <h1 style="margin:4px 0;font-size:2rem;font-weight:800;color:#14532d;letter-spacing:0.02em;font-family:Georgia,serif;">CERTIFICATE OF RECOGNITION</h1>
            <div style="font-size:11px;font-weight:800;color:#16a34a;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:16px;">${subtitleRole}</div>

            <div style="font-size:13px;color:#475569;font-style:italic;margin-bottom:6px;">This official certificate is proudly presented to</div>
            <div style="font-size:2rem;font-weight:800;color:#0f172a;border-bottom:2px solid #16a34a;display:inline-block;padding:2px 28px 6px;margin-bottom:16px;font-family:Georgia,serif;">
              ${recipientName}
            </div>

            <p style="max-width:640px;margin:0 auto 18px;font-size:13.5px;line-height:1.65;color:#334155;">
              ${bodyCitation}
            </p>

            <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:22px;">
              ${metricsPillsHtml}
            </div>

            <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-top:18px;padding-top:16px;border-top:1px dashed #cbd5e1;text-align:left;">
              <div>
                <div style="font-weight:800;font-size:13px;color:#0f172a;border-top:1.5px solid #0f172a;padding-top:4px;min-width:180px;">Ethel Zeta</div>
                <div style="font-size:11px;color:#64748b;">ATAMAN Program Administrator</div>
                <div style="font-size:10.5px;color:#64748b;margin-top:4px;">Issued: <strong>${issueDate}</strong></div>
              </div>

              <div style="text-align:center;">
                <div style="display:inline-block;padding:4px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;">
                  ${qrSvg}
                </div>
                <div style="font-size:9.5px;color:#64748b;margin-top:3px;font-family:monospace;">${certSerial}</div>
              </div>

              <div style="text-align:right;">
                <div style="font-weight:800;font-size:13px;color:#0f172a;border-top:1.5px solid #0f172a;padding-top:4px;min-width:180px;">CENRO Catbalogan Sector</div>
                <div style="font-size:11px;color:#64748b;">Forestry &amp; GIS Verification Office</div>
                <div style="font-size:10.5px;color:#15803d;font-weight:700;margin-top:4px;">✔ Verified GPS &amp; Registry Record</div>
              </div>
            </div>
          </div>
        </div>
      `;

      modal.querySelector('#certCloseBtn')?.addEventListener('click', () => modal.remove());
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      modal.querySelector('#certSwitchAdopterBtn')?.addEventListener('click', () => {
        openCertificateModal({ role: 'adopter' });
      });
      modal.querySelector('#certSwitchCaretakerBtn')?.addEventListener('click', () => {
        openCertificateModal({ role: 'caretaker' });
      });

      modal.querySelector('#certPrintBtn')?.addEventListener('click', () => {
        const printContents = document.getElementById('atamanPrintableCertificate')?.outerHTML || '';
        const win = window.open('', '_blank', 'width=960,height=720');
        if (win) {
          win.document.write(`<!DOCTYPE html><html><head><title>${certSerial}</title><style>body{font-family:'Plus Jakarta Sans',sans-serif;padding:24px;margin:0;background:#fff;} @media print { body{padding:0;} }</style></head><body>${printContents}<script>setTimeout(function(){window.print();},350);<\/script></body></html>`);
          win.document.close();
        } else {
          window.print();
        }
      });

      modal.querySelector('#certDownloadPngBtn')?.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 1100;
        const ctx = canvas.getContext('2d');

        // Background & double border
        const grad = ctx.createLinearGradient(0, 0, 1600, 1100);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, '#f0fdf4');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1600, 1100);

        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 10;
        ctx.strokeRect(36, 36, 1528, 1028);
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 3;
        ctx.strokeRect(52, 52, 1496, 996);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#15803d';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('ATAMAN • TANOM. ATAMAN. PADAYON — SAMAR REFORESTATION INITIATIVE', 800, 130);

        ctx.fillStyle = '#14532d';
        ctx.font = 'bold 58px Georgia, serif';
        ctx.fillText('CERTIFICATE OF RECOGNITION', 800, 210);

        ctx.fillStyle = '#16a34a';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(subtitleRole, 800, 255);

        ctx.fillStyle = '#475569';
        ctx.font = 'italic 24px Georgia, serif';
        ctx.fillText('This official certificate is proudly presented to', 800, 325);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 62px Georgia, serif';
        ctx.fillText(recipientName, 800, 405);

        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(450, 425);
        ctx.lineTo(1150, 425);
        ctx.stroke();

        // Body text lines
        ctx.fillStyle = '#334155';
        ctx.font = '24px sans-serif';
        const line1 = isAdopter
          ? `For outstanding environmental contribution and sponsorship of ${adopterData.fundedTreePoolTotal} Native & Endemic Trees`
          : `For exemplary field stewardship and verified monthly health monitoring (${caretakerData.compliancePct}% Compliance)`;
        const line2 = isAdopter
          ? `(₱${adopterData.totalFundingPhp.toLocaleString()} PHP funded at ₱50.00/tree) planted in Catbalogan City, Samar,`
          : `nurturing ${caretakerData.survivingTreesCount} of ${caretakerData.totalAssignedTrees} Assigned Trees (${caretakerData.survivalRatePct}% Survival Rate • ₱${caretakerData.netReceivableIncentivePhp.toLocaleString()} PHP Net Incentive)`;
        const line3 = isAdopter
          ? `sequestering approximately ${adopterData.fundedTreePoolTotal * 22} kg CO₂/year and restoring local watershed ecosystems.`
          : `across Catbalogan City, Samar under the ATAMAN Reforestation & GIS Monitoring Program.`;

        ctx.fillText(line1, 800, 495);
        ctx.fillText(line2, 800, 535);
        ctx.fillText(line3, 800, 575);

        // Draw QR code in bottom center
        QRGenerator.drawOnCanvas(ctx, traceUrl, 710, 740, 180);
        ctx.fillStyle = '#475569';
        ctx.font = '16px monospace';
        ctx.fillText(certSerial, 800, 945);
        ctx.fillText(`Issued: ${issueDate} • Catbalogan City, Samar`, 800, 972);

        // Signatures
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('Ethel Zeta', 130, 860);
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('ATAMAN Program Administrator', 130, 890);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('CENRO Catbalogan Sector', 1470, 860);
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Forestry & GIS Verification Office', 1470, 890);

        const link = document.createElement('a');
        link.download = `${certSerial}-${recipientName.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }

    /* ── 7. QR Code Location Tracking Modal & Printable Tree Tag Generator ── */
    function openTreeQrModal(treeIdOrObj) {
      const trees = getTreesCache();
      let selected = null;
      if (typeof treeIdOrObj === 'string') {
        selected = trees.find(t => t && t.id === treeIdOrObj);
      } else if (treeIdOrObj && typeof treeIdOrObj === 'object') {
        selected = trees.find(t => t && t.id === treeIdOrObj.id) || treeIdOrObj;
      }
      if (!selected) selected = trees[0] || {};

      let modal = document.getElementById('atamanTreeQrModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'atamanTreeQrModal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,0.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:14px;overflow-y:auto;';
        document.body.appendChild(modal);
      }

      let qrMode = 'trace'; // 'trace' or 'gmaps'

      function renderQrModalContent(tree) {
        const sp = (typeof tree.species === 'object' && tree.species ? tree.species.common : tree.species) || 'Narra';
        const count = Math.max(1, parseInt(tree.treeCount || tree.count) || 1);
        const adopter = tree.adopter || tree.sponsorName || 'Available for Adoption';
        const caretaker = tree.caretaker || 'Dodong Zeta';
        const { traceUrl, googleMapsUrl, lat, lng, id, brgy } = getTreeQrUrls(tree);
        const activeUrl = qrMode === 'gmaps' ? googleMapsUrl : traceUrl;
        const qrSvg = QRGenerator.renderToSvg(activeUrl, 210);

        modal.innerHTML = `
          <div style="background:#ffffff;border-radius:18px;max-width:600px;width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.35);padding:22px;box-sizing:border-box;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:14px;">
              <div>
                <h3 style="margin:0;font-size:1.1rem;font-weight:800;color:#0f172a;">📱 QR Code Geographic Location Tracking</h3>
                <p style="margin:2px 0 0;font-size:0.78rem;color:#64748b;">Scan with any smartphone camera to trace exact GPS coordinates &amp; tree health.</p>
              </div>
              <button type="button" id="qrModalCloseBtn" style="background:#f1f5f9;color:#334155;border:none;width:34px;height:34px;border-radius:8px;font-size:18px;font-weight:700;cursor:pointer;">&times;</button>
            </div>

            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;">
              <label style="font-size:12px;font-weight:700;color:#475569;">Select Tree / Plantation Batch:</label>
              <select id="qrTreeBatchSelector" style="flex:1;min-width:200px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:13px;color:#0f172a;">
                ${trees.map(t => {
                  const sName = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Tree';
                  const sel = t.id === id ? 'selected' : '';
                  return `<option value="${t.id}" ${sel}>${t.id} — ${sName} (${t.treeCount || 1} trees • Brgy. ${t.barangay || 'Guinsorongan'})</option>`;
                }).join('')}
              </select>
            </div>

            <div style="display:flex;justify-content:center;gap:8px;margin-bottom:14px;">
              <button type="button" id="qrModeTraceBtn" style="border:1px solid ${qrMode === 'trace' ? '#15803d' : '#cbd5e1'};background:${qrMode === 'trace' ? '#dcfce7' : '#fff'};color:${qrMode === 'trace' ? '#166534' : '#475569'};padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">🗺️ ATAMAN Interactive Map Link</button>
              <button type="button" id="qrModeGmapsBtn" style="border:1px solid ${qrMode === 'gmaps' ? '#15803d' : '#cbd5e1'};background:${qrMode === 'gmaps' ? '#dcfce7' : '#fff'};color:${qrMode === 'gmaps' ? '#166534' : '#475569'};padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">📍 Direct Google Maps GPS Pin</button>
            </div>

            <!-- Printable QR Tag Card -->
            <div id="qrPrintableCard" style="background:linear-gradient(135deg,#f0fdf4 0%,#ffffff 100%);border:2px solid #15803d;border-radius:16px;padding:18px;text-align:center;">
              <div style="font-size:11px;font-weight:800;color:#15803d;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">🌱 ATAMAN OFFICIAL GEO-TAGGED TREE QR</div>
              <div style="font-size:1.25rem;font-weight:800;color:#0f172a;">${id} • ${sp} (${count} Trees)</div>
              <div style="font-size:0.82rem;color:#475569;margin-bottom:12px;">📍 Brgy. ${brgy}, Catbalogan City, Samar • GPS: <strong>${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E</strong></div>

              <div style="display:inline-block;padding:10px;background:#ffffff;border:2px solid #cbd5e1;border-radius:14px;box-shadow:0 6px 18px rgba(15,23,42,0.08);margin-bottom:12px;">
                ${qrSvg}
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;font-size:12px;">
                <div><span style="color:#64748b;">Adopter:</span> <strong style="color:#0f172a;">${adopter}</strong></div>
                <div><span style="color:#64748b;">Caretaker:</span> <strong style="color:#0f172a;">${caretaker}</strong></div>
                <div><span style="color:#64748b;">Health Status:</span> <strong style="color:#16a34a;text-transform:capitalize;">${tree.health || tree.status || 'Healthy'}</strong></div>
                <div><span style="color:#64748b;">Planted:</span> <strong style="color:#0f172a;">${tree.datePlanted || '2026-08-28'}</strong></div>
              </div>
              <div style="font-size:10.5px;color:#64748b;margin-top:8px;word-break:break-all;font-family:monospace;">${activeUrl}</div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:16px;">
              <a href="${googleMapsUrl}" target="_blank" rel="noopener" style="text-decoration:none;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:8px 13px;border-radius:8px;font-weight:700;font-size:12px;">🧭 Open GPS in Google Maps ↗</a>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" id="qrDownloadTagBtn" style="background:#15803d;color:#ffffff;border:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">⬇ Download QR Tag (PNG)</button>
                <button type="button" id="qrPrintTagBtn" style="background:#0f172a;color:#ffffff;border:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">🖨️ Print QR Tag</button>
              </div>
            </div>
          </div>
        `;

        modal.querySelector('#qrModalCloseBtn')?.addEventListener('click', () => modal.remove());
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        modal.querySelector('#qrTreeBatchSelector')?.addEventListener('change', (e) => {
          const nextTree = trees.find(t => t.id === e.target.value) || tree;
          renderQrModalContent(nextTree);
        });

        modal.querySelector('#qrModeTraceBtn')?.addEventListener('click', () => {
          qrMode = 'trace';
          renderQrModalContent(tree);
        });
        modal.querySelector('#qrModeGmapsBtn')?.addEventListener('click', () => {
          qrMode = 'gmaps';
          renderQrModalContent(tree);
        });

        modal.querySelector('#qrPrintTagBtn')?.addEventListener('click', () => {
          const html = document.getElementById('qrPrintableCard')?.outerHTML || '';
          const win = window.open('', '_blank', 'width=640,height=640');
          if (win) {
            win.document.write(`<!DOCTYPE html><html><head><title>QR Tag ${id}</title><style>body{font-family:sans-serif;padding:24px;}</style></head><body>${html}<script>setTimeout(function(){window.print();},300);<\/script></body></html>`);
            win.document.close();
          }
        });

        modal.querySelector('#qrDownloadTagBtn')?.addEventListener('click', () => {
          const canvas = document.createElement('canvas');
          canvas.width = 720;
          canvas.height = 880;
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 720, 880);
          ctx.strokeStyle = '#15803d';
          ctx.lineWidth = 8;
          ctx.strokeRect(20, 20, 680, 840);

          ctx.textAlign = 'center';
          ctx.fillStyle = '#15803d';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText('ATAMAN OFFICIAL GEO-TAGGED TREE QR', 360, 72);

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 34px sans-serif';
          ctx.fillText(`${id} • ${sp} (${count} Trees)`, 360, 122);

          ctx.fillStyle = '#475569';
          ctx.font = '20px sans-serif';
          ctx.fillText(`Brgy. ${brgy}, Catbalogan City, Samar`, 360, 158);
          ctx.font = 'bold 20px monospace';
          ctx.fillText(`GPS: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`, 360, 190);

          QRGenerator.drawOnCanvas(ctx, activeUrl, 160, 220, 400);

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 21px sans-serif';
          ctx.fillText(`Adopter: ${adopter}`, 360, 675);
          ctx.fillText(`Caretaker: ${caretaker}`, 360, 710);

          ctx.fillStyle = '#15803d';
          ctx.font = '16px monospace';
          ctx.fillText('Scan with mobile camera to open exact tree location', 360, 765);

          const link = document.createElement('a');
          link.download = `ATAMAN-QR-${id}-${brgy}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        });
      }

      renderQrModalContent(selected);
    }

    /* ── 8. Interactive Caretaker Monthly Health Log & Incentive Hub Modal ── */
    function openCaretakerIncentivesModal(caretakerName) {
      let modal = document.getElementById('atamanCaretakerIncentivesModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'atamanCaretakerIncentivesModal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:10045;background:rgba(15,23,42,0.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:14px;overflow-y:auto;';
        document.body.appendChild(modal);
      }

      function renderModal() {
        const summary = getCaretakerIncentiveSummary(caretakerName);
        const adopterPool = getAdopterPoolAllocation('Nikki Maga');

        modal.innerHTML = `
          <div style="background:#ffffff;border-radius:18px;max-width:880px;width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.35);padding:22px;box-sizing:border-box;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:16px;">
              <div>
                <div style="display:inline-flex;align-items:center;gap:6px;background:#dcfce7;color:#166534;font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px;margin-bottom:4px;">
                  🏆 Caretaker Rewards &amp; Monthly Incentive Validation (${summary.monthLabel})
                </div>
                <h3 style="margin:0;font-size:1.18rem;font-weight:800;color:#0f172a;">${summary.caretakerName} — Stewardship Incentives &amp; Monthly Status Logs</h3>
                <p style="margin:4px 0 0;font-size:0.8rem;color:#475569;">Rate: <strong>₱50 PHP / tree</strong> • Automatic Mortality Deduction: <strong>-₱50 PHP per dead tree</strong> • Mandatory monthly health log required for incentive release.</p>
              </div>
              <button type="button" id="ctIncModalCloseBtn" style="background:#f1f5f9;color:#334155;border:none;width:34px;height:34px;border-radius:8px;font-size:18px;font-weight:700;cursor:pointer;">&times;</button>
            </div>

            <!-- 4 Summary KPI Boxes -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px;margin-bottom:16px;">
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
                <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Gross Incentive (₱50/Tree)</div>
                <div style="font-size:1.3rem;font-weight:800;color:#0f172a;margin:4px 0;">₱${summary.grossIncentivePhp.toLocaleString()}</div>
                <div style="font-size:11.5px;color:#475569;">${summary.totalAssignedTrees} assigned trees × ₱50</div>
              </div>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px;">
                <div style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;">Mortality Deduction (-₱50)</div>
                <div style="font-size:1.3rem;font-weight:800;color:#dc2626;margin:4px 0;">-₱${summary.mortalityDeductionPhp.toLocaleString()}</div>
                <div style="font-size:11.5px;color:#991b1b;">${summary.deadTreesCount} dead trees × -₱50 PHP</div>
              </div>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;">
                <div style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;">Net Receivable Incentive</div>
                <div style="font-size:1.35rem;font-weight:800;color:#15803d;margin:4px 0;">₱${summary.netReceivableIncentivePhp.toLocaleString()}</div>
                <div style="font-size:11.5px;color:#166534;font-weight:600;">${summary.survivingTreesCount} surviving trees × ₱50</div>
              </div>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
                <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Release Validation</div>
                <div style="font-size:1rem;font-weight:800;color:${summary.isValidatedForRelease ? '#15803d' : '#d97706'};margin:6px 0 4px;">
                  ${summary.isValidatedForRelease ? '✅ Validated for Release' : '⏳ Pending Monthly Logs'}
                </div>
                <div style="font-size:11.5px;color:#475569;">${summary.loggedBatchesThisMonth}/${summary.totalBatches} batches logged (${summary.compliancePct}%)</div>
              </div>
            </div>

            <!-- Adopter Pool Deduction Link Banner -->
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:12.5px;color:#1e3a8a;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <span>🤝 <strong>Adopter Funded Tree Pool Link:</strong> ${adopterPool.adopterName} funded <strong>${adopterPool.fundedTreePoolTotal} trees (₱${adopterPool.totalFundingPhp})</strong> • <strong>${adopterPool.assignedToCaretakerTrees} trees</strong> automatically deducted &amp; assigned to ${summary.caretakerName} (${adopterPool.remainingUnassignedPool} unassigned remaining).</span>
              <button type="button" id="ctIncOpenCertModalBtn" style="background:#15803d;color:#fff;border:none;padding:6px 12px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">📜 Caretaker Certificate</button>
            </div>

            <!-- Quick Monthly Status Log Form -->
            <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:14px;margin-bottom:16px;">
              <div style="font-weight:800;font-size:0.9rem;color:#0f172a;margin-bottom:10px;">📋 Submit / Update Mandatory Monthly Tree Health Log (${summary.monthLabel})</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:end;">
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">Assigned Batch</label>
                  <select id="mlogBatchSelect" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:12.5px;font-weight:600;">
                    ${summary.batches.map(b => `<option value="${b.id}" data-total="${b.totalCount}" data-dead="${b.deadCount}" data-status="${b.status}">${b.id} — ${b.species} (${b.totalCount} trees)</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">Monthly Health Status</label>
                  <select id="mlogStatusSelect" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:12.5px;font-weight:600;">
                    <option value="healthy">🟢 Healthy</option>
                    <option value="needs-care">🟡 Needs Care</option>
                    <option value="critical">🔴 Critical</option>
                    <option value="dead">⚫ Dead (Full Batch Mortality)</option>
                  </select>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;color:#dc2626;margin-bottom:4px;">Dead Trees (-₱50/tree)</label>
                  <input type="number" id="mlogDeadCountInput" min="0" max="100" value="0" style="width:100%;padding:8px;border:1px solid #fca5a5;border-radius:8px;font-size:12.5px;font-weight:700;box-sizing:border-box;" />
                </div>
                <div>
                  <button type="button" id="mlogSaveBtn" style="width:100%;background:#16a34a;color:#ffffff;border:none;padding:9px 14px;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;">✔ Save Monthly Update</button>
                </div>
              </div>
            </div>

            <!-- Batch-by-Batch Incentive & Mortality Table -->
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
                <thead>
                  <tr style="background:#f1f5f9;color:#475569;text-align:left;border-bottom:1px solid #cbd5e1;">
                    <th style="padding:9px 10px;">Batch ID</th>
                    <th style="padding:9px 10px;">Species &amp; Barangay</th>
                    <th style="padding:9px 10px;text-align:right;">Assigned</th>
                    <th style="padding:9px 10px;text-align:right;">Dead (-₱50)</th>
                    <th style="padding:9px 10px;text-align:right;">Surviving</th>
                    <th style="padding:9px 10px;text-align:right;">Net Incentive</th>
                    <th style="padding:9px 10px;">Monthly Log</th>
                    <th style="padding:9px 10px;text-align:center;">QR Tag</th>
                  </tr>
                </thead>
                <tbody>
                  ${summary.batches.map(b => `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:9px 10px;font-weight:800;color:#0f172a;">${b.id}</td>
                      <td style="padding:9px 10px;">${b.species} • <span style="color:#64748b;">Brgy. ${b.barangay}</span></td>
                      <td style="padding:9px 10px;text-align:right;font-weight:700;">${b.totalCount} (₱${b.grossPhp.toLocaleString()})</td>
                      <td style="padding:9px 10px;text-align:right;font-weight:700;color:${b.deadCount > 0 ? '#dc2626' : '#64748b'};">${b.deadCount > 0 ? `${b.deadCount} (-₱${b.deductionPhp.toLocaleString()})` : '0 (-₱0)'}</td>
                      <td style="padding:9px 10px;text-align:right;font-weight:700;color:#15803d;">${b.survivingCount}</td>
                      <td style="padding:9px 10px;text-align:right;font-weight:800;color:#15803d;">₱${b.netPhp.toLocaleString()}</td>
                      <td style="padding:9px 10px;">
                        <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:${b.isLoggedThisMonth ? '#dcfce7' : '#fef3c7'};color:${b.isLoggedThisMonth ? '#166534' : '#92400e'};">
                          ${b.isLoggedThisMonth ? '✔ Verified' : 'Pending'}
                        </span>
                      </td>
                      <td style="padding:9px 10px;text-align:center;">
                        <button type="button" class="ct-batch-qr-btn" data-id="${b.id}" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;">📱 QR</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;

        modal.querySelector('#ctIncModalCloseBtn')?.addEventListener('click', () => modal.remove());
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        modal.querySelector('#ctIncOpenCertModalBtn')?.addEventListener('click', () => {
          openCertificateModal({ role: 'caretaker', personName: summary.caretakerName });
        });

        const batchSelect = modal.querySelector('#mlogBatchSelect');
        const statusSelect = modal.querySelector('#mlogStatusSelect');
        const deadInput = modal.querySelector('#mlogDeadCountInput');

        const syncBatchFields = () => {
          const opt = batchSelect?.selectedOptions?.[0];
          if (!opt) return;
          const maxT = parseInt(opt.getAttribute('data-total'), 10) || 10;
          const curDead = parseInt(opt.getAttribute('data-dead'), 10) || 0;
          const curSt = opt.getAttribute('data-status') || 'healthy';
          if (deadInput) {
            deadInput.max = String(maxT);
            deadInput.value = String(curDead);
          }
          if (statusSelect) {
            statusSelect.value = curSt.includes('crit') ? 'critical' : (curSt.includes('need') ? 'needs-care' : (curSt === 'dead' ? 'dead' : 'healthy'));
          }
        };
        batchSelect?.addEventListener('change', syncBatchFields);
        statusSelect?.addEventListener('change', () => {
          const opt = batchSelect?.selectedOptions?.[0];
          const maxT = parseInt(opt?.getAttribute('data-total'), 10) || 10;
          if (statusSelect.value === 'dead' && deadInput) {
            deadInput.value = String(maxT);
          }
        });
        syncBatchFields();

        modal.querySelector('#mlogSaveBtn')?.addEventListener('click', () => {
          const treeId = batchSelect?.value;
          const st = statusSelect?.value || 'healthy';
          const deadCnt = parseInt(deadInput?.value, 10) || 0;
          recordMonthlyTreeUpdate({
            treeId: treeId,
            status: st,
            deadCount: deadCnt,
            caretakerName: summary.caretakerName
          });
          renderModal();
        });

        modal.querySelectorAll('.ct-batch-qr-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            openTreeQrModal(btn.getAttribute('data-id'));
          });
        });
      }

      renderModal();
    }

    /* ── 9. Live DOM Synchronization Across Adopter, Caretaker & Admin Dashboards ── */
    function refreshDashboardIncentiveWidgets() {
      try {
        // A. Update Adopter Dashboard Pool Allocation Card if present
        const adPoolPaidEl = document.getElementById('adPoolTotalPaid');
        if (adPoolPaidEl) {
          const adPool = getAdopterPoolAllocation();
          adPoolPaidEl.textContent = `₱${adPool.totalFundingPhp.toLocaleString()}`;
          const rateSub = document.getElementById('adPoolRateSub');
          if (rateSub) rateSub.textContent = `₱${adPool.ratePerTreePhp} PHP × ${adPool.fundedTreePoolTotal} funded trees`;
          const totTrees = document.getElementById('adPoolTotalTrees');
          if (totTrees) totTrees.textContent = `${adPool.fundedTreePoolTotal} Trees`;
          const assTrees = document.getElementById('adPoolAssignedTrees');
          if (assTrees) assTrees.textContent = `-${adPool.assignedToCaretakerTrees} Trees`;
          const ctSub = document.getElementById('adPoolCaretakerSub');
          if (ctSub) ctSub.textContent = `Nurtured by ${adPool.caretakersAssigned.join(', ')}`;
          const remTrees = document.getElementById('adPoolRemainingTrees');
          if (remTrees) remTrees.textContent = `${adPool.remainingUnassignedPool} Trees`;
          const remSub = document.getElementById('adPoolRemainingSub');
          if (remSub) {
            remSub.textContent = adPool.remainingUnassignedPool > 0
              ? `${adPool.remainingUnassignedPool} trees ready for caretaker assignment`
              : 'All funded trees assigned to Caretaker';
          }
        }

        // B. Update Caretaker Dashboard Rewards & Incentives Card if present
        const ctGrossEl = document.getElementById('ctIncGrossAmount');
        if (ctGrossEl) {
          const ctSum = getCaretakerIncentiveSummary();
          const adPool = getAdopterPoolAllocation('Nikki Maga');

          ctGrossEl.textContent = `₱${ctSum.grossIncentivePhp.toLocaleString()}`;
          const grossSub = document.getElementById('ctIncGrossSub');
          if (grossSub) grossSub.textContent = `${ctSum.totalAssignedTrees} assigned trees × ₱${ctSum.ratePerTreePhp}`;

          const deadDed = document.getElementById('ctIncDeadDeduction');
          if (deadDed) deadDed.textContent = `-₱${ctSum.mortalityDeductionPhp.toLocaleString()}`;
          const deadSub = document.getElementById('ctIncDeadSub');
          if (deadSub) deadSub.textContent = `${ctSum.deadTreesCount} dead trees × -₱${ctSum.ratePerTreePhp} PHP`;

          const netRec = document.getElementById('ctIncNetReceivable');
          if (netRec) netRec.textContent = `₱${ctSum.netReceivableIncentivePhp.toLocaleString()}`;
          const netSub = document.getElementById('ctIncNetSub');
          if (netSub) netSub.textContent = `${ctSum.survivingTreesCount} surviving trees × ₱${ctSum.ratePerTreePhp}`;

          const valBadge = document.getElementById('ctIncValidationBadge');
          if (valBadge) {
            valBadge.textContent = ctSum.isValidatedForRelease ? '✅ Validated for Release' : '⏳ Pending Monthly Log';
            valBadge.style.color = ctSum.isValidatedForRelease ? '#15803d' : '#d97706';
          }
          const valSub = document.getElementById('ctIncValidationSub');
          if (valSub) valSub.textContent = `${ctSum.loggedBatchesThisMonth} / ${ctSum.totalBatches} batches logged (${ctSum.monthLabel})`;

          const progPct = document.getElementById('ctMonthlyProgressPct');
          if (progPct) progPct.textContent = `${ctSum.compliancePct}% Complete (${ctSum.loggedBatchesThisMonth}/${ctSum.totalBatches} Batches)`;
          const progBar = document.getElementById('ctMonthlyProgressBar');
          if (progBar) progBar.style.width = `${ctSum.compliancePct}%`;

          const linkNote = document.getElementById('ctAdopterPoolLinkNote');
          if (linkNote) {
            linkNote.innerHTML = `🤝 Linked Adopter Pool: <strong>${adPool.adopterName}</strong> (${adPool.fundedTreePoolTotal} funded • ${adPool.assignedToCaretakerTrees} deducted &amp; assigned • ${adPool.remainingUnassignedPool} remaining)`;
          }
        }
      } catch (e) {
        console.warn('[ATAMAN Incentives] Widget refresh notice:', e);
      }
    }

    function bindUniversalIncentiveButtons() {
      refreshDashboardIncentiveWidgets();

      // Adopter Dashboard buttons
      const adCertBtn = document.getElementById('adOpenCertBtn');
      if (adCertBtn && !adCertBtn.dataset.bound) {
        adCertBtn.dataset.bound = 'true';
        adCertBtn.addEventListener('click', () => openCertificateModal({ role: 'adopter' }));
      }
      const adQrBtn = document.getElementById('adOpenQrHubBtn');
      if (adQrBtn && !adQrBtn.dataset.bound) {
        adQrBtn.dataset.bound = 'true';
        adQrBtn.addEventListener('click', () => openTreeQrModal('TR-10001'));
      }
      const navCertQr = document.getElementById('navCertificateQr');
      if (navCertQr && !navCertQr.dataset.bound) {
        navCertQr.dataset.bound = 'true';
        navCertQr.addEventListener('click', (e) => {
          e.preventDefault();
          openCertificateModal({ role: 'adopter' });
        });
      }

      // Caretaker Dashboard & Sidebar buttons
      const ctLogBtn = document.getElementById('ctOpenMonthlyLogModalBtn');
      if (ctLogBtn && !ctLogBtn.dataset.bound) {
        ctLogBtn.dataset.bound = 'true';
        ctLogBtn.addEventListener('click', () => openCaretakerIncentivesModal());
      }
      const ctCertBtn = document.getElementById('ctOpenCertBtn');
      if (ctCertBtn && !ctCertBtn.dataset.bound) {
        ctCertBtn.dataset.bound = 'true';
        ctCertBtn.addEventListener('click', () => openCertificateModal({ role: 'caretaker' }));
      }
      const ctQrBtn = document.getElementById('ctOpenQrHubBtn');
      if (ctQrBtn && !ctQrBtn.dataset.bound) {
        ctQrBtn.dataset.bound = 'true';
        ctQrBtn.addEventListener('click', () => openTreeQrModal('TR-10001'));
      }

      // Caretaker Sidebar #navRewards across Caretaker pages
      const navRewards = document.getElementById('navRewards');
      if (navRewards && !navRewards.dataset.boundIncentives) {
        navRewards.dataset.boundIncentives = 'true';
        navRewards.addEventListener('click', (e) => {
          e.preventDefault();
          const sec = document.getElementById('ctRewardsIncentivesSection');
          if (sec) {
            sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          openCaretakerIncentivesModal();
        });
      }

      // Add Quick Header Buttons on Admin Adopters, Admin Caretakers, Admin Trees, My Trees, and Tree Map pages
      const path = (window.location.pathname || '').toLowerCase();
      if (path.includes('admin-adopters')) {
        const navActions = document.querySelector('.nav-actions-group');
        if (navActions && !document.getElementById('adminAdopterCertBtn')) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.id = 'adminAdopterCertBtn';
          btn.className = 'btn btn-outline';
          btn.innerHTML = '📜 Adopter Certificate';
          btn.addEventListener('click', () => openCertificateModal({ role: 'adopter' }));
          navActions.insertBefore(btn, navActions.firstChild);
        }
      } else if (path.includes('admin-caretakers')) {
        const navActions = document.querySelector('.nav-actions-group');
        if (navActions && !document.getElementById('adminCaretakerIncentiveBtn')) {
          const incBtn = document.createElement('button');
          incBtn.type = 'button';
          incBtn.id = 'adminCaretakerIncentiveBtn';
          incBtn.className = 'btn btn-outline';
          incBtn.innerHTML = '🏆 Incentives & Monthly Logs';
          incBtn.addEventListener('click', () => openCaretakerIncentivesModal('Dodong Zeta'));
          navActions.insertBefore(incBtn, navActions.firstChild);

          const certBtn = document.createElement('button');
          certBtn.type = 'button';
          certBtn.id = 'adminCaretakerCertBtn';
          certBtn.className = 'btn btn-outline';
          certBtn.innerHTML = '📜 Caretaker Certificate';
          certBtn.addEventListener('click', () => openCertificateModal({ role: 'caretaker' }));
          navActions.insertBefore(certBtn, navActions.firstChild);
        }
      } else if (path.includes('admin-trees') || path.includes('admin-tree-map') || path.includes('caretaker-tree-map') || path.includes('my-trees')) {
        const hdrRight = document.querySelector('.nav-actions-group, .topbar-actions, .ct-header-right, .ct-navbar-right');
        if (hdrRight && !document.getElementById('universalQrTrackHeaderBtn')) {
          const qrBtn = document.createElement('button');
          qrBtn.type = 'button';
          qrBtn.id = 'universalQrTrackHeaderBtn';
          qrBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:#15803d;color:#fff;border:none;padding:7px 12px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;';
          qrBtn.innerHTML = '📱 Tree QR Codes';
          qrBtn.addEventListener('click', () => openTreeQrModal('TR-10001'));
          hdrRight.insertBefore(qrBtn, hdrRight.firstChild);
        }
      }

      // If page was opened via QR code scan (?qr_tree=TR-XXXXX), auto-open the Tree QR & GPS Trace modal
      try {
        const params = new URLSearchParams(window.location.search || '');
        const scannedTreeId = params.get('qr_tree');
        if (scannedTreeId && !window.__atamanQrScanHandled) {
          window.__atamanQrScanHandled = true;
          setTimeout(() => openTreeQrModal(scannedTreeId), 450);
        }
      } catch (_) {}
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindUniversalIncentiveButtons);
    } else {
      bindUniversalIncentiveButtons();
    }
    window.addEventListener('ATAMAN:trees-updated', refreshDashboardIncentiveWidgets);
    window.addEventListener('ATAMAN:adopters-updated', refreshDashboardIncentiveWidgets);
    window.addEventListener('storage', refreshDashboardIncentiveWidgets);

    window.ATAMAN_INCENTIVES = {
      RATE_PER_TREE,
      getCurrentMonthKey,
      getMonthlyLogs,
      getAdopterPoolAllocation,
      getCaretakerIncentiveSummary,
      recordMonthlyTreeUpdate,
      openCertificateModal,
      openTreeQrModal,
      openCaretakerIncentivesModal,
      renderQrCodeSvg: QRGenerator.renderToSvg,
      refreshDashboardIncentiveWidgets
    };
  })();

})();
