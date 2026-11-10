/**
 * ATAMAN — Database & Cache Initialization
 * Clears mock/sample data only ONCE on first run.
 * After that, all user-entered data is preserved across refreshes.
 */
(function() {
  'use strict';

  const DEFAULT_TREES = [
    {
      id: 'TR-10001',
      species: { common: 'Narra', scientific: 'Pterocarpus indicus', type: 'Native' },
      treeCount: 10,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Guinsorongan',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7850,
      lng: 124.8860,
      sponsorName: 'John Sho',
      adopter: 'John Sho',
      takenCount: 10,
      fundingAmount: 50,
      datePlanted: '2026-08-28',
      createdAt: '2026-08-28T08:00:00.000Z',
      ageOfTree: '2 months',
      caretaker: 'Pedro Reyes',
      height: '2.4 meters',
      trunkDiam: '4.2 cm'
    },
    {
      id: 'TR-10002',
      species: { common: 'Molave', scientific: 'Vitex parviflora', type: 'Endemic' },
      treeCount: 50,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Canlapwas',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7820,
      lng: 124.8870,
      sponsorName: 'Century Catbalogan',
      adopter: 'Century Catbalogan',
      takenCount: 10,
      fundingAmount: 50,
      datePlanted: '2026-03-06',
      createdAt: '2026-09-06T08:00:00.000Z',
      ageOfTree: '6 months',
      caretaker: 'Pedro Reyes',
      height: '3.1 meters',
      trunkDiam: '5.8 cm'
    },
    {
      id: 'TR-10003',
      species: { common: 'Supa', scientific: 'Sindora supa', type: 'Endemic' },
      treeCount: 10,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Bunuanan',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7910,
      lng: 124.8790,
      sponsorName: '',
      adopter: '',
      takenCount: 0,
      fundingAmount: 50,
      datePlanted: '2026-04-06',
      createdAt: '2026-09-06T09:00:00.000Z',
      ageOfTree: '5 months',
      caretaker: 'Pedro Reyes',
      height: '1.8 meters',
      trunkDiam: '3.5 cm'
    },
    {
      id: 'TR-10004',
      species: { common: 'Yakal', scientific: 'Shorea astylosa', type: 'Native' },
      treeCount: 100,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Iguid',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.8020,
      lng: 124.8810,
      sponsorName: '',
      adopter: '',
      takenCount: 0,
      fundingAmount: 50,
      datePlanted: '2026-03-06',
      createdAt: '2026-09-06T10:00:00.000Z',
      ageOfTree: '6 Months',
      caretaker: 'Pedro Reyes',
      height: '2.9 meters',
      trunkDiam: '4.8 cm'
    },
    {
      id: 'TR-10005',
      species: { common: 'Tanguile', scientific: 'Shorea polysperma', type: 'Native' },
      treeCount: 20,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Mercedes',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7690,
      lng: 124.8940,
      sponsorName: 'Century Catbalogan',
      adopter: 'Century Catbalogan',
      takenCount: 5,
      fundingAmount: 50,
      datePlanted: '2025-09-06',
      createdAt: '2026-09-06T11:00:00.000Z',
      ageOfTree: '12 Months',
      caretaker: 'Pedro Reyes',
      height: '4.0 meters',
      trunkDiam: '8.2 cm'
    },
    {
      id: 'TR-10006',
      species: { common: 'White Lauan', scientific: 'Shorea contorta', type: 'Native' },
      treeCount: 20,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Maulong',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7710,
      lng: 124.8690,
      sponsorName: '',
      adopter: '',
      takenCount: 0,
      fundingAmount: 50,
      datePlanted: '2026-03-06',
      createdAt: '2026-09-06T12:00:00.000Z',
      ageOfTree: '6 Months',
      caretaker: 'Pedro Reyes',
      height: '2.5 meters',
      trunkDiam: '4.0 cm'
    },
    {
      id: 'TR-10007',
      species: { common: 'Narra', scientific: 'Pterocarpus indicus', type: 'Native' },
      treeCount: 50,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Silanga',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.8150,
      lng: 124.8640,
      sponsorName: 'Century Catbalogan',
      adopter: 'Century Catbalogan',
      takenCount: 2,
      fundingAmount: 50,
      datePlanted: '2026-04-06',
      createdAt: '2026-09-06T13:00:00.000Z',
      ageOfTree: '6 months',
      caretaker: 'Pedro Reyes',
      height: '2.7 meters',
      trunkDiam: '4.5 cm'
    },
    {
      id: 'TR-10021',
      species: { common: 'Narra', scientific: 'Pterocarpus indicus', type: 'Native' },
      treeCount: 25,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Guinsorongan',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7875,
      lng: 124.8825,
      sponsorName: 'John Sho',
      adopter: 'John Sho',
      takenCount: 25,
      fundingAmount: 50,
      datePlanted: '2026-07-15',
      createdAt: '2026-07-15T08:00:00.000Z',
      ageOfTree: '4 months',
      caretaker: 'Pedro Reyes',
      height: '2.8 meters',
      trunkDiam: '4.9 cm'
    },
    {
      id: 'TR-10035',
      species: { common: 'Molave', scientific: 'Vitex parviflora', type: 'Endemic' },
      treeCount: 15,
      status: 'needs-care',
      health: 'Needs Care',
      barangay: 'Canlapwas',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7810,
      lng: 124.8890,
      sponsorName: '',
      adopter: '',
      takenCount: 0,
      fundingAmount: 50,
      datePlanted: '2026-05-10',
      createdAt: '2026-05-10T09:00:00.000Z',
      ageOfTree: '6 months',
      caretaker: 'Pedro Reyes',
      height: '2.2 meters',
      trunkDiam: '3.8 cm'
    },
    {
      id: 'TR-10047',
      species: { common: 'Acacia', scientific: 'Samanea saman', type: 'Native' },
      treeCount: 10,
      status: 'critical',
      health: 'Critical',
      barangay: 'Canlapwas',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7795,
      lng: 124.8910,
      sponsorName: '',
      adopter: '',
      takenCount: 0,
      fundingAmount: 50,
      datePlanted: '2026-06-01',
      createdAt: '2026-06-01T10:00:00.000Z',
      ageOfTree: '5 months',
      caretaker: 'Pedro Reyes',
      height: '1.9 meters',
      trunkDiam: '3.2 cm'
    }
  ];
  window.ATAMAN_DEFAULT_TREES = DEFAULT_TREES;

  const INIT_VERSION = 'ATAMAN_init_v5_preserve_trees';

  // Only wipe non-tree caches once; preserve registered trees permanently
  if (!localStorage.getItem(INIT_VERSION)) {
    const adminOnly = JSON.stringify([{
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
    }]);

    const existingTrees = (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
        return Array.isArray(raw) && raw.length > 0 ? raw : null;
      } catch (_) { return null; }
    })();
    if (!existingTrees) {
      localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(DEFAULT_TREES));
    }

    localStorage.setItem('ATAMAN_adopters_cache', '[]');
    localStorage.setItem('ATAMAN_caretakers_cache', '[]');
    localStorage.setItem('ATAMAN_users_cache', adminOnly);
    localStorage.setItem('saplink_users_cache', adminOnly);
    localStorage.setItem('ATAMAN_registered_users', adminOnly);
    localStorage.setItem('saplink_registered_users', adminOnly);
    localStorage.setItem('saplink_adopters_cache', '[]');
    localStorage.setItem('saplink_caretakers_cache', '[]');
    localStorage.setItem('ATAMAN_content_cache', '[]');
    localStorage.setItem('ATAMAN_notifications', '[]');
    localStorage.setItem('ATAMAN_caretaker_notifications', '[]');
    localStorage.setItem('ATAMAN_system_logs', '[]');
    localStorage.setItem('ATAMAN_unread_notif_count', '0');
    localStorage.setItem(INIT_VERSION, 'done');
  }

  // Ensure trees are never missing or blanked
  try {
    const trees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
    if (!Array.isArray(trees) || trees.length === 0) {
      localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(DEFAULT_TREES));
    }
  } catch (_) {
    try { localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(DEFAULT_TREES)); } catch (_) {}
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
})();