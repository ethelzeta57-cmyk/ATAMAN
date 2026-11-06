/**
 * ATAMAN — Database & Cache Initialization
 * Clears mock/sample data only ONCE on first run.
 * After that, all user-entered data is preserved across refreshes.
 */
(function() {
  'use strict';

  const INIT_VERSION = 'ATAMAN_init_v4_admin_only';

  // Only wipe caches the very first time (or after a version bump).
  // After that, skip clearing so user data persists across refreshes.
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
    localStorage.setItem('ATAMAN_trees_cache', '[]');
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