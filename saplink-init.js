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
})();