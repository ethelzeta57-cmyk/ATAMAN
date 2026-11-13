/**
 * ATAMAN Mobile Bottom Navigation Engine
 * Responsive, thumb-friendly navigation bar for all dashboard viewports
 */

(function () {
  'use strict';

  function initBottomNav() {
    // Only run on dashboards, not public login/register/splash pages
    const path = window.location.pathname.toLowerCase();
    const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

    if (filename === 'index.html' || filename === 'login.html' || filename === 'splash.html' ||
      filename === 'register-adopter.html' || filename === 'register-caretaker.html' || filename === 'offline.html') {
      return;
    }

    // Determine current user role
    let role = 'admin';
    if (filename.startsWith('caretaker-') || (filename === 'my-trees.html' && (!window.location.search.includes('role=adopter')))) {
      role = 'caretaker';
    } else if (filename.startsWith('adopter-') || (filename === 'my-trees.html' && window.location.search.includes('role=adopter'))) {
      role = 'adopter';
    } else {
      const storedRole = (localStorage.getItem('ATAMAN_user_role') || '').toLowerCase();
      if (storedRole === 'caretaker') role = 'caretaker';
      else if (storedRole === 'adopter') role = 'adopter';
      else role = 'admin';
    }

    // Check if bottom nav already exists in DOM
    let nav = document.querySelector('.ataman-bottom-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'ataman-bottom-nav';
      nav.setAttribute('aria-label', 'Mobile Navigation');
      document.body.appendChild(nav);
    }

    // Role-specific configuration
    let items = [];

    if (role === 'caretaker') {
      items = [
        {
          id: 'ct-nav-home',
          label: 'Home',
          href: 'caretaker-dashboard.html',
          active: filename === 'caretaker-dashboard.html' && !window.location.hash.includes('ctRewardsIncentivesSection'),
          icon: `<svg viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
        },
        {
          id: 'ct-nav-trees',
          label: 'My Trees',
          href: 'my-trees.html',
          active: filename === 'my-trees.html' && !window.location.search.includes('role=adopter'),
          icon: `<svg viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`
        },
        {
          id: 'ct-nav-map',
          label: 'Tree Map',
          href: 'caretaker-tree-map.html',
          active: filename === 'caretaker-tree-map.html',
          icon: `<svg viewBox="0 0 24 24"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>`
        },
        {
          id: 'ct-nav-rewards',
          label: 'Rewards',
          href: 'caretaker-dashboard.html#ctRewardsIncentivesSection',
          active: window.location.hash.includes('ctRewardsIncentivesSection'),
          icon: `<svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"/><path d="M18 4H6v7a6 6 0 0 0 12 0V4Z"/></svg>`,
          action: (e) => {
            if (filename === 'caretaker-dashboard.html') {
              e.preventDefault();
              const el = document.getElementById('ctRewardsIncentivesSection');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
              setActiveTab('ct-nav-rewards');
            }
          }
        },
        {
          id: 'ct-nav-profile',
          label: 'Profile',
          href: '#',
          active: false,
          icon: `<svg viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
          action: (e) => {
            e.preventDefault();
            const btn = document.getElementById('ctUserDropdown');
            if (btn) {
              btn.click();
            } else {
              const menu = document.getElementById('ctProfileDropdown');
              if (menu) menu.classList.toggle('hide');
            }
          }
        }
      ];
    } else if (role === 'adopter') {
      items = [
        {
          id: 'ad-nav-home',
          label: 'Home',
          href: 'adopter-dashboard.html',
          active: filename === 'adopter-dashboard.html',
          icon: `<svg viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
        },
        {
          id: 'ad-nav-trees',
          label: 'My Trees',
          href: 'my-trees.html?role=adopter',
          active: filename === 'my-trees.html' && window.location.search.includes('role=adopter'),
          icon: `<svg viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`
        },
        {
          id: 'ad-nav-map',
          label: 'Tree Map',
          href: 'my-trees.html?role=adopter#map',
          active: false,
          icon: `<svg viewBox="0 0 24 24"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>`,
          action: (e) => {
            const mapBtn = document.getElementById('navTreeMap');
            if (mapBtn) {
              e.preventDefault();
              mapBtn.click();
            }
          }
        },
        {
          id: 'ad-nav-certs',
          label: 'Cert & QR',
          href: '#',
          active: false,
          icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
          action: (e) => {
            e.preventDefault();
            if (window.ATAMAN_INCENTIVES && typeof window.ATAMAN_INCENTIVES.openCertificateModal === 'function') {
              window.ATAMAN_INCENTIVES.openCertificateModal({ role: 'adopter' });
            } else {
              const certLink = document.getElementById('navCertificateQr') || document.getElementById('adMyTreesCertQrLink');
              if (certLink) certLink.click();
            }
          }
        },
        {
          id: 'ad-nav-profile',
          label: 'Profile',
          href: '#',
          active: false,
          icon: `<svg viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
          action: (e) => {
            e.preventDefault();
            const btn = document.getElementById('adUserDropdown');
            if (btn) {
              btn.click();
            } else {
              const menu = document.getElementById('adProfileDropdown');
              if (menu) menu.classList.toggle('hide');
            }
          }
        }
      ];
    } else {
      // Admin Dashboard (default)
      // Determine dynamic slot based on which admin page is currently open
      let dynamicItem = {
        id: 'adm-nav-alerts',
        label: 'Alerts',
        href: 'admin-notifications.html',
        active: filename === 'admin-notifications.html',
        badge: 0,
        icon: `<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`
      };

      if (filename === 'admin-reports.html') {
        dynamicItem = {
          id: 'adm-nav-reports',
          label: 'Reports',
          href: 'admin-reports.html',
          active: true,
          icon: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
        };
      } else if (filename === 'admin-adopters.html') {
        dynamicItem = {
          id: 'adm-nav-adopters',
          label: 'Adopters',
          href: 'admin-adopters.html',
          active: true,
          icon: `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
        };
      } else if (filename === 'admin-caretakers.html') {
        dynamicItem = {
          id: 'adm-nav-caretakers',
          label: 'Caretakers',
          href: 'admin-caretakers.html',
          active: true,
          icon: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
        };
      } else if (filename === 'admin-analytics.html') {
        dynamicItem = {
          id: 'adm-nav-analytics',
          label: 'Analytics',
          href: 'admin-analytics.html',
          active: true,
          icon: `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`
        };
      }

      items = [
        {
          id: 'adm-nav-home',
          label: 'Dashboard',
          href: 'dashboard.html',
          active: filename === 'dashboard.html',
          icon: `<svg viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`
        },
        {
          id: 'adm-nav-map',
          label: 'Tree Map',
          href: 'admin-tree-map.html',
          active: filename === 'admin-tree-map.html',
          icon: `<svg viewBox="0 0 24 24"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>`
        },
        {
          id: 'adm-nav-trees',
          label: 'Trees',
          href: 'admin-trees.html',
          active: filename === 'admin-trees.html',
          icon: `<svg viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`
        },
        dynamicItem,
        {
          id: 'adm-nav-settings',
          label: 'Settings',
          href: 'admin-settings.html',
          active: filename === 'admin-settings.html',
          icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
        }
      ];
    }

    // Render HTML inside the bottom navigation element
    nav.innerHTML = items.map(item => `
      <a href="${item.href}" class="ataman-bottom-nav-item ${item.active ? 'active' : ''}" id="${item.id}" data-id="${item.id}" aria-label="${item.label}">
        <div class="ataman-bottom-nav-icon-wrap">
          ${item.icon}
          ${item.badge && item.badge > 0 ? `<span class="ataman-bottom-nav-badge">${item.badge}</span>` : ''}
        </div>
        <span class="ataman-bottom-nav-label">${item.label}</span>
      </a>
    `).join('');

    // Attach custom click actions if defined
    items.forEach(item => {
      if (typeof item.action === 'function') {
        const el = document.getElementById(item.id);
        if (el) {
          el.addEventListener('click', item.action);
        }
      }
    });

    function setActiveTab(id) {
      nav.querySelectorAll('.ataman-bottom-nav-item').forEach(el => {
        el.classList.toggle('active', el.id === id);
      });
    }

    // Listen for real-time notification changes to update badges if on admin
    if (role === 'admin') {
      try {
        const checkNotifBadge = () => {
          const badgeEl = document.getElementById('notifBadge') || document.querySelector('.badge-pill');
          const bottomAlertItem = document.getElementById('adm-nav-alerts');
          if (bottomAlertItem && badgeEl) {
            const count = parseInt(badgeEl.textContent, 10) || 0;
            let iconWrap = bottomAlertItem.querySelector('.ataman-bottom-nav-icon-wrap');
            let bEl = iconWrap ? iconWrap.querySelector('.ataman-bottom-nav-badge') : null;
            if (count > 0) {
              if (!bEl) {
                bEl = document.createElement('span');
                bEl.className = 'ataman-bottom-nav-badge';
                iconWrap.appendChild(bEl);
              }
              bEl.textContent = count > 99 ? '99+' : count;
            } else if (bEl) {
              bEl.remove();
            }
          }
        };
        setTimeout(checkNotifBadge, 800);
        setInterval(checkNotifBadge, 5000);
      } catch (err) { }
    }
  }

  // Self-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBottomNav);
  } else {
    initBottomNav();
  }

  // Export helper
  window.ATAMAN_BOTTOM_NAV = { init: initBottomNav };
})();

