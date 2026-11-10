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
      lat: 11.7598,
      lng: 124.8861,
      sponsorName: 'Nikki Maga',
      adopter: 'Nikki Maga',
      takenCount: 10,
      fundingAmount: 50,
      datePlanted: '2026-08-28',
      createdAt: '2026-08-28T08:00:00.000Z',
      ageOfTree: '2 months',
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
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
      sponsorName: '',
      adopter: '',
      takenCount: 0,
      fundingAmount: 50,
      datePlanted: '2026-03-06',
      createdAt: '2026-09-06T08:00:00.000Z',
      ageOfTree: '6 months',
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
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
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
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
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
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
      sponsorName: '',
      adopter: '',
      takenCount: 0,
      fundingAmount: 50,
      datePlanted: '2025-09-06',
      createdAt: '2026-09-06T11:00:00.000Z',
      ageOfTree: '12 Months',
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
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
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
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
      sponsorName: '',
      adopter: '',
      takenCount: 0,
      fundingAmount: 50,
      datePlanted: '2026-04-06',
      createdAt: '2026-09-06T13:00:00.000Z',
      ageOfTree: '6 months',
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
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
      sponsorName: '',
      adopter: '',
      takenCount: 0,
      fundingAmount: 50,
      datePlanted: '2026-07-15',
      createdAt: '2026-07-15T08:00:00.000Z',
      ageOfTree: '4 months',
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
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
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
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
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
      height: '1.9 meters',
      trunkDiam: '3.2 cm'
    }
  ];
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
      treesCount: 10,
      funding: 500,
      fundingPaid: 500,
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
      treesAssigned: 10,
      assignedTreeCount: 310,
      location: 'Catbalogan City & Jiabong, Samar',
      municipality: 'Catbalogan City',
      barangay: 'Canlapwas',
      assignedTrees: ['TR-10001', 'TR-10002', 'TR-10003', 'TR-10004', 'TR-10005', 'TR-10006', 'TR-10007', 'TR-10021', 'TR-10035', 'TR-10047'],
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

  const INIT_VERSION = 'ATAMAN_init_v8_cross_device_sync';

  // Seed / migrate registered data when upgrading or if caches are missing
  if (!localStorage.getItem(INIT_VERSION)) {
    // 1. Trees: If missing, empty, or containing old mock caretaker/adopter, reset to DEFAULT_TREES with Dodong Zeta & Nikki Maga
    let existingTrees = (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
        return Array.isArray(raw) && raw.length > 0 ? raw : null;
      } catch (_) { return null; }
    })();

    if (!existingTrees || existingTrees.some(t => t.caretaker === 'Pedro Reyes' || t.caretaker === 'Unassigned' || !t.barangay || t.adopter === 'John Sho' || t.adopter === 'Century Catbalogan')) {
      localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(DEFAULT_TREES));
    }

    // 2. Adopters: Replace old mock adopters (John Sho, Century Catbalogan) with real adopter Nikki Maga
    let existingAdopters = (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
        return Array.isArray(raw) && raw.length > 0 ? raw : null;
      } catch (_) { return null; }
    })();

    if (!existingAdopters || existingAdopters.some(a => a.name === 'John Sho' || a.name === 'Century Catbalogan' || a.email === 'john.sho@gmail.com')) {
      localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(DEFAULT_ADOPTERS));
    }

    // 3. Caretakers: Replace old mock caretaker (Pedro Reyes) with real caretaker Dodong Zeta
    let existingCaretakers = (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
        return Array.isArray(raw) && raw.length > 0 ? raw : null;
      } catch (_) { return null; }
    })();

    if (!existingCaretakers || existingCaretakers.some(c => c.name === 'Pedro Reyes' || c.email === 'pedro.reyes@ataman.org')) {
      localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(DEFAULT_CARETAKERS));
    }

    // 4. Users: Filter out pedro.reyes, john.sho, and centurycatbalogan, ensuring real accounts: ethelzeta57@gmail.com, zetadodong@gmail.com, nikkimaga24@gmail.com
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
    if (!Array.isArray(trees) || trees.length === 0) {
      localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(DEFAULT_TREES));
    } else if (trees.some(t => t.caretaker === 'Pedro Reyes' || t.caretaker === 'Unassigned' || !t.barangay || t.adopter === 'John Sho' || t.adopter === 'Century Catbalogan')) {
      trees = trees.map(t => {
        let updated = Object.assign({}, t);
        const defTree = DEFAULT_TREES.find(dt => dt.id === updated.id);
        if (defTree) {
          if (!updated.barangay) updated.barangay = defTree.barangay;
          if (!updated.municipality) updated.municipality = defTree.municipality;
          if (!updated.province) updated.province = defTree.province;
          if (updated.lat == null) updated.lat = defTree.lat;
          if (updated.lng == null) updated.lng = defTree.lng;
        }
        if (updated.caretaker === 'Pedro Reyes' || updated.caretaker === 'Unassigned' || !updated.caretaker) {
          updated.caretaker = 'Dodong Zeta';
        }
        updated.customCaretaker = true;
        updated.customGps = true;
        updated.customLocation = true;
        if (updated.adopter === 'John Sho' || updated.adopter === 'Century Catbalogan') {
          if (updated.id === 'TR-10001') {
            updated.adopter = 'Nikki Maga';
            updated.sponsorName = 'Nikki Maga';
          } else {
            updated.adopter = '';
            updated.sponsorName = '';
            updated.takenCount = 0;
          }
        }
        return updated;
      });
      localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(trees));
    }
  } catch (_) {
    try { localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(DEFAULT_TREES)); } catch (_) {}
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
          /* Prevent horizontal scroll across all mobile & tablet devices */
          html, body {
            max-width: 100vw !important;
            overflow-x: hidden !important;
            -webkit-text-size-adjust: 100%;
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

})();
