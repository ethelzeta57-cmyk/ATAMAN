/**
 * ATAMAN Caretaker Dashboard Logic with Universal Authentication
 */

// ─── Caretaker Route Guard (runs before DOM is ready) ─────────────────────
(function () {
  try {
    const isLoggedIn = localStorage.getItem('ATAMAN_logged_in') === 'true' || !!localStorage.getItem('ATAMAN_user_email');
    if (!isLoggedIn) {
      localStorage.setItem('ATAMAN_logged_in', 'true');
    }
    const rawRole = (localStorage.getItem('ATAMAN_user_role') || '').toLowerCase().trim();
    if (!rawRole) {
      localStorage.setItem('ATAMAN_user_role', 'caretaker');
    }
  } catch (e) {}
})();

document.addEventListener('DOMContentLoaded', () => {
  initFirebaseAuth();
  initCaretakerProfileDropdown();
  syncCaretakerStats();
  initCaretakerMap();
  initCaretakerActions();
  initMobileNav();

  if (window.ATAMAN_DB && typeof window.ATAMAN_DB.onTreesChange === 'function') {
    window.ATAMAN_DB.onTreesChange((trees) => {
      syncCaretakerStats(trees);
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'ATAMAN_trees_cache') {
      syncCaretakerStats();
    }
  });
});

function syncCaretakerStats(treesList = null) {
  let trees = treesList;
  if (!Array.isArray(trees)) {
    try {
      const raw = localStorage.getItem('ATAMAN_trees_cache');
      trees = raw ? JSON.parse(raw) : [];
    } catch (e) {
      trees = [];
    }
  }

  // Only include trees that have an assigned caretaker or an active adopter sponsorship
  trees = (Array.isArray(trees) ? trees : []).filter(t => {
    if (!t) return false;
    const hasAdopter = Boolean((t.adopter && t.adopter !== 'None' && t.adopter !== 'Not yet adopted' && t.adopter !== 'Available for Adoption') || (t.sponsorName && t.sponsorName !== 'None' && t.sponsorName !== 'Available for Adoption') || (parseInt(t.takenCount) || 0) > 0);
    const hasCaretaker = Boolean(t.caretaker && t.caretaker !== 'Unassigned' && (hasAdopter || t.customCaretaker));
    return hasAdopter || hasCaretaker;
  });

  const getCnt = (t) => Math.max(1, parseInt(t.treeCount || t.count) || 1);
  const total = trees.reduce((sum, t) => sum + getCnt(t), 0);
  const healthy = trees.filter(t => (t.status || 'healthy') === 'healthy' || t.health === 'Healthy').reduce((sum, t) => sum + getCnt(t), 0);
  const needs = trees.filter(t => t.status === 'needs-care' || t.health === 'Needs Care' || t.status === 'needs').reduce((sum, t) => sum + getCnt(t), 0);
  const critical = trees.filter(t => t.status === 'critical' || t.health === 'Critical').reduce((sum, t) => sum + getCnt(t), 0);
  const dead = trees.filter(t => t.status === 'dead' || t.health === 'Dead').reduce((sum, t) => sum + getCnt(t), 0);
  const pending = trees.filter(t => t.nextMonitor === 'Due Today' || t.nextMonitor === 'Overdue' || t.nextMonitoring === 'Due Today' || t.nextMonitoring === 'Overdue').reduce((sum, t) => sum + getCnt(t), 0);

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('ctStatTotal', total);
  setEl('ctStatHealthy', healthy);
  setEl('ctStatNeeds', needs);
  setEl('ctStatCritical', critical);
  setEl('ctStatDead', dead);
  setEl('ctStatPending', pending);

  const pct = (c) => total > 0 ? ((c / total) * 100).toFixed(1) + '%' : '0%';
  setEl('ctPctHealthy', pct(healthy));
  setEl('ctPctNeeds', pct(needs));
  setEl('ctPctCritical', pct(critical));
  setEl('ctPctDead', pct(dead));
  setEl('ctCriticalCountBadge', critical);

  // Render Pending Monitoring Table dynamically
  const pendingTbody = document.getElementById('ctPendingTableBody');
  const pendingFooter = document.getElementById('ctPendingFooterText');
  if (pendingTbody) {
    if (trees.length === 0) {
      pendingTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:28px 16px; color:#94a3b8;">No pending tree monitoring records yet.</td></tr>';
      if (pendingFooter) pendingFooter.textContent = 'Showing 0 of 0 pending monitoring';
    } else {
      const displayTrees = trees.slice(0, 5);
      pendingTbody.innerHTML = displayTrees.map(t => {
        const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Tree';
        const cnt = getCnt(t);
        const lastCheck = t.lastMon || t.lastCheck || t.datePlanted || 'Recent';
        const nextSt = t.nextMonitor || t.nextMonitoring || 'Scheduled';
        return `
          <tr>
            <td class="font-bold">${t.id}</td>
            <td>${sp}${cnt > 1 ? ` <span style="font-size:11px; color:#64748b;">(${cnt} trees)</span>` : ''}</td>
            <td class="text-muted">${lastCheck}</td>
            <td><span class="badge-status badge-due-today">${nextSt}</span></td>
            <td><button class="btn-action-green" data-tree="${t.id}">Monitor</button></td>
          </tr>
        `;
      }).join('');
      if (pendingFooter) pendingFooter.textContent = `Showing ${displayTrees.length} of ${trees.length} batch(es) (${total} total trees)`;
    }
  }

  // Render Critical Trees List dynamically
  const critList = document.getElementById('ctCriticalList');
  if (critList) {
    const critTrees = trees.filter(t => t.status === 'critical' || t.health === 'Critical');
    if (critTrees.length === 0) {
      critList.innerHTML = '<div style="text-align:center; padding:32px 16px; color:#94a3b8; font-size:0.85rem;">No critical trees reported.</div>';
    } else {
      critList.innerHTML = critTrees.slice(0, 3).map(t => {
        const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Tree';
        const loc = t.barangay ? `Brgy. ${t.barangay}` : (t.municipality || 'Catbalogan');
        const lastCheck = t.lastMon || t.lastCheck || '—';
        return `
          <div class="ct-critical-item">
            <div class="ct-tree-thumb">
              <img src="${t.photo || 'assets/ATAMAN_bg.jpg'}" alt="${sp}" class="tree-img" />
            </div>
            <div class="ct-tree-info">
              <h3 class="ct-tree-title">${t.id} – ${sp}</h3>
              <p class="ct-tree-meta"><strong>Location:</strong> ${loc}</p>
              <p class="ct-tree-meta"><strong>Issue:</strong> ${t.notes || 'Critical status flagged'}</p>
              <p class="ct-tree-meta-sub">Last monitoring: ${lastCheck}</p>
            </div>
            <div class="ct-tree-action-col">
              <span class="badge-priority-high">Priority: High</span>
              <button class="btn-inspect" data-tree="${t.id}">Inspect</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Populate Maintenance Target Tree Select dynamically
  const maintSelect = document.getElementById('maintTreeSelect');
  if (maintSelect) {
    if (trees.length === 0) {
      maintSelect.innerHTML = '<option value="">No trees assigned yet</option>';
    } else {
      maintSelect.innerHTML = trees.map(t => {
        const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Tree';
        const loc = t.barangay ? `Brgy. ${t.barangay}` : (t.municipality || 'Catbalogan');
        return `<option value="${t.id}">${t.id} — ${sp} (${loc})</option>`;
      }).join('');
    }
  }
}

/* ─── 0. Universal Auth State & User Profile ─── */
function initFirebaseAuth() {
  const ctUserName = document.getElementById('ctUserName');
  const avatarText = document.getElementById('avatarText');
  const ddUserName = document.getElementById('ddUserName');
  const ddAvatarText = document.getElementById('ddAvatarText');
  const settingsNamePreview = document.getElementById('settingsNamePreview');
  const settingsAvatarPreview = document.getElementById('settingsAvatarPreview');
  const settingCaretakerName = document.getElementById('settingCaretakerName');
  const ctLogoutBtn = document.getElementById('ctLogoutBtn');
  const authAPI = window.ATAMAN_AUTH;

  function syncAllProfileDisplays(name, initials) {
    if (ctUserName) ctUserName.textContent = name;
    if (avatarText) avatarText.textContent = initials;
    if (ddUserName) ddUserName.textContent = name;
    if (ddAvatarText) ddAvatarText.textContent = initials;
    if (settingsNamePreview) settingsNamePreview.textContent = name;
    if (settingsAvatarPreview) settingsAvatarPreview.textContent = initials;
    if (settingCaretakerName && !settingCaretakerName.matches(':focus')) {
      settingCaretakerName.value = name;
    }
  }

  function updateGreeting(name) {
    const ctGreetingTitle = document.getElementById('ctDashTitle');
    if (ctGreetingTitle) {
      const hour = new Date().getHours();
      let timeOfDay = 'morning';
      if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17) timeOfDay = 'evening';
      const firstName = (name || '').split(' ')[0] || 'Caretaker';
      ctGreetingTitle.innerHTML = `Good ${timeOfDay}, ${firstName}! <span class="seedling-icon">🌱</span>`;
    }
  }

  // Sync immediately from localStorage so there is never a placeholder flash on refresh
  const initialCtName = localStorage.getItem('ATAMAN_user_name') || 'Caretaker';
  const initialCtInitials = initialCtName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'CT';
  syncAllProfileDisplays(initialCtName, initialCtInitials);
  updateGreeting(initialCtName);

  // Live Real-Time Date & Clock in Header + Date Inputs
  const ctLiveDateText = document.getElementById('ctLiveDateText');
  function updateCaretakerLiveClock() {
    const now = new Date();
    if (ctLiveDateText) {
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
      ctLiveDateText.textContent = `${dateStr} • ${timeStr}`;
    }
  }
  updateCaretakerLiveClock();
  setInterval(updateCaretakerLiveClock, 1000);
  const todayIso = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(inp => {
    if (!inp.value || inp.value.startsWith('2026-08')) inp.value = todayIso;
  });

  // Listen to Auth state
  if (authAPI) {
    authAPI.onAuthStateChanged((user) => {
      if (user) {
        const displayName = localStorage.getItem('ATAMAN_user_name') || user.displayName || 'Caretaker';
        const initials = displayName
          .split(' ')
          .filter(Boolean)
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'CT';

        syncAllProfileDisplays(displayName, initials);
        updateGreeting(displayName);
      }
    });
  }

  // Logout Handler
  if (ctLogoutBtn) {
    ctLogoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        showCtToast('Signing out of Caretaker portal...');
        if (authAPI) {
          await authAPI.signOut();
        } else {
          localStorage.clear();
        }
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 600);
      } catch (err) {
        console.error('Logout error:', err);
        window.location.href = 'index.html';
      }
    });
  }
}

/* ─── Caretaker Profile Dropdown & Settings Handler ─── */
function initCaretakerProfileDropdown() {
  const userPill = document.getElementById('ctUserDropdown');
  const profileDropdown = document.getElementById('ctProfileDropdown');
  const btnSettings = document.getElementById('btnProfileSettings');
  const settingsModal = document.getElementById('caretakerSettingsModal');
  const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const settingsForm = document.getElementById('caretakerSettingsForm');

  const sidebarProfile = document.getElementById('ctSidebarProfile');
  if (sidebarProfile && settingsModal) {
    sidebarProfile.addEventListener('click', (e) => {
      if (e.target.closest('#ctLogoutBtn')) return;
      const currentName = localStorage.getItem('ATAMAN_user_name') || 'Caretaker';
      const nameInput = document.getElementById('settingCaretakerName');
      if (nameInput) nameInput.value = currentName;
      settingsModal.classList.remove('hide');
    });
  }

  if (userPill && profileDropdown) {
    function toggleProfileDropdown() {
      const isHidden = profileDropdown.classList.contains('hide');
      const notifDropdown = document.getElementById('ctNotifDropdown');
      if (notifDropdown) notifDropdown.classList.add('hide');

      if (isHidden) {
        profileDropdown.classList.remove('hide');
        userPill.classList.add('active');
        userPill.setAttribute('aria-expanded', 'true');
      } else {
        profileDropdown.classList.add('hide');
        userPill.classList.remove('active');
        userPill.setAttribute('aria-expanded', 'false');
      }
    }

    function closeProfileDropdown() {
      profileDropdown.classList.add('hide');
      userPill.classList.remove('active');
      userPill.setAttribute('aria-expanded', 'false');
    }

    userPill.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleProfileDropdown();
    });

    userPill.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleProfileDropdown();
      }
    });

    // Settings modal trigger from dropdown
    if (btnSettings && settingsModal) {
      btnSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        closeProfileDropdown();
        const currentName = localStorage.getItem('ATAMAN_user_name') || 'Caretaker';
        const nameInput = document.getElementById('settingCaretakerName');
        if (nameInput) nameInput.value = currentName;
        settingsModal.classList.remove('hide');
      });
    }
  }

  if (closeSettingsModalBtn && settingsModal) {
    closeSettingsModalBtn.addEventListener('click', () => {
      settingsModal.classList.add('hide');
    });
  }

  if (cancelSettingsBtn && settingsModal) {
    cancelSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('hide');
    });
  }

  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hide');
      }
    });
  }

  if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('settingCaretakerName');
      const newName = nameInput ? nameInput.value.trim() : '';
      if (newName) {
        localStorage.setItem('ATAMAN_user_name', newName);
        const initials = newName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'JM';

        const ctUserName = document.getElementById('ctUserName');
        const avatarText = document.getElementById('avatarText');
        const ddUserName = document.getElementById('ddUserName');
        const ddAvatarText = document.getElementById('ddAvatarText');
        const setPreview = document.getElementById('settingsNamePreview');
        const setAvatar = document.getElementById('settingsAvatarPreview');
        const ctGreetingTitle = document.getElementById('ctDashTitle');

        if (ctUserName) ctUserName.textContent = newName;
        if (avatarText) avatarText.textContent = initials;
        if (ddUserName) ddUserName.textContent = newName;
        if (ddAvatarText) ddAvatarText.textContent = initials;
        if (setPreview) setPreview.textContent = newName;
        if (setAvatar) setAvatar.textContent = initials;

        if (ctGreetingTitle) {
          const hour = new Date().getHours();
          let timeOfDay = 'morning';
          if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
          else if (hour >= 17) timeOfDay = 'evening';
          const firstName = newName.split(' ')[0] || 'Caretaker';
          ctGreetingTitle.innerHTML = `Good ${timeOfDay}, ${firstName}! <span class="seedling-icon">🌱</span>`;
        }

        showCtToast('Caretaker preferences saved.');
      }
      settingsModal.classList.add('hide');
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#ctUserDropdownWrapper')) {
      closeProfileDropdown();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProfileDropdown();
      if (settingsModal) settingsModal.classList.add('hide');
    }
  });
}

/* ─── 1. Caretaker Leaflet Map (Catbalogan, Samar Assigned Trees) ─── */
function initCaretakerMap() {
  const mapEl = document.getElementById('caretakerMap');
  if (!mapEl) return;

  // Center on Catbalogan City, Samar, Philippines
  const map = L.map('caretakerMap', {
    zoomControl: true,
    attributionControl: false
  }).setView([11.7753, 124.8850], 14);

  // Esri World Imagery — Satellite aerial tiles
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18
  }).addTo(map);

  // Assigned tree markers from live dataset
  let assignedTrees = [];
  try {
    const raw = localStorage.getItem('ATAMAN_trees_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        assignedTrees = parsed.map(t => ({
          lat: Number(t.lat) || 11.7753,
          lng: Number(t.lng) || 124.8850,
          status: t.status === 'needs-care' ? 'needs' : (t.status || 'healthy'),
          id: t.id,
          species: (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Tree',
          loc: t.barangay ? `Brgy. ${t.barangay}` : (t.location || 'Catbalogan City')
        }));
      }
    }
  } catch (e) {}

  function createTreePinIcon(status) {
    const colors = {
      healthy:  { bg: '#22c55e', border: '#15803d', shadow: 'rgba(34,197,94,0.45)' },
      needs:    { bg: '#f59e0b', border: '#b45309', shadow: 'rgba(245,158,11,0.45)' },
      critical: { bg: '#ef4444', border: '#b91c1c', shadow: 'rgba(239,68,68,0.45)' },
      dead:     { bg: '#64748b', border: '#334155', shadow: 'rgba(100,116,139,0.45)' }
    };
    const c = colors[status] || colors.healthy;
    const svgPin = `
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
        <defs>
          <filter id="ps-${status}" x="-40%" y="-20%" width="180%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="${c.shadow}"/>
          </filter>
        </defs>
        <path d="M18 2C10.268 2 4 8.268 4 16c0 10 14 28 14 28S32 26 32 16C32 8.268 25.732 2 18 2z"
              fill="${c.bg}" stroke="${c.border}" stroke-width="1.5" filter="url(#ps-${status})"/>
        <circle cx="18" cy="16" r="9" fill="white" opacity="0.18"/>
        <g transform="translate(11, 8)" fill="white">
          <rect x="6" y="13" width="2" height="4" rx="0.5"/>
          <path d="M7 12C7 9 4 9 3 9C3 12 6 12 7 12Z"/>
          <path d="M7 10C7 7 10 7 11 7C11 10 8 10 7 10Z"/>
          <path d="M7 10C7 7 10 7 11 7C11 10 8 10 7 10Z" transform="translate(0,2)"/>
        </g>
      </svg>`;
    return L.divIcon({ className: 'custom-tree-pin-marker', html: svgPin, iconSize: [36, 46], iconAnchor: [18, 46], popupAnchor: [0, -46] });
  }

  assignedTrees.forEach(tree => {
    L.marker([tree.lat, tree.lng], { icon: createTreePinIcon(tree.status) })
      .bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px;">
          <strong style="font-size:13px; color:#0f172a;">${tree.id} – ${tree.species}</strong><br>
          <span style="font-size:11px; color:#64748b;">${tree.loc}</span><br>
          <span style="font-size:11px; font-weight:700; text-transform:capitalize; color:${
            tree.status === 'healthy' ? '#16a34a' : tree.status === 'critical' ? '#dc2626' : tree.status === 'dead' ? '#64748b' : '#d97706'
          }">
            Status: ${tree.status === 'needs' ? 'Needs Care' : tree.status}
          </span>
        </div>
      `)
      .addTo(map);
  });
}

/* ─── 2. Interactive Action Handlers ─── */
function initCaretakerActions() {
  // Modal: Record Monitoring
  let currentMonTreeId = 'TR-10021';
  const recordModal = document.getElementById('recordMonModal');
  const monTitle = document.getElementById('monModalTitle');
  const recordForm = document.getElementById('recordMonForm');
  const closeRecordBtn = document.getElementById('closeRecordMonBtn');
  const cancelRecordBtn = document.getElementById('cancelRecordMonBtn');

  function openRecordModal(treeId, species = '') {
    currentMonTreeId = treeId;
    if (monTitle) monTitle.textContent = `Record Monitoring — ${treeId}${species ? ` (${species})` : ''}`;
    if (recordModal) recordModal.classList.remove('hide');
  }

  function closeRecordModal() {
    if (recordModal) recordModal.classList.add('hide');
    if (recordForm) recordForm.reset();
  }

  if (closeRecordBtn) closeRecordBtn.addEventListener('click', closeRecordModal);
  if (cancelRecordBtn) cancelRecordBtn.addEventListener('click', closeRecordModal);
  if (recordModal) {
    recordModal.addEventListener('click', (e) => {
      if (e.target === recordModal) closeRecordModal();
    });
  }

  // Monitor buttons in Pending Monitoring table
  document.querySelectorAll('.btn-action-green').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const row = btn.closest('tr');
      const treeId = btn.getAttribute('data-tree') || row?.querySelector('td.font-bold')?.textContent.trim() || 'TR-10021';
      const species = row?.querySelectorAll('td')[1]?.textContent.trim() || '';
      openRecordModal(treeId, species);
    });
  });

  if (recordForm) {
    recordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const selectedRadio = document.querySelector('input[name="mHealth"]:checked');
      const newHealthLabel = selectedRadio ? selectedRadio.value : 'Healthy';
      const newHealthKey = newHealthLabel.toLowerCase().replace(' ', '');
      const mappedHealth = newHealthKey === 'needscare' ? 'needs' : newHealthKey;
      const heightVal = document.getElementById('monHeight')?.value;
      const diamVal = document.getElementById('monDiameter')?.value;
      const remarksVal = document.getElementById('monRemarks')?.value || 'Field inspection conducted';
      const caretakerName = localStorage.getItem('ATAMAN_user_name') || 'Caretaker';
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

      // Update local cache
      try {
        const raw = localStorage.getItem('ATAMAN_trees_cache');
        if (raw) {
          const cache = JSON.parse(raw);
          const idx = cache.findIndex(t => t.id === currentMonTreeId);
          if (idx !== -1) {
            cache[idx].status = mappedHealth === 'needs' ? 'needs-care' : mappedHealth;
            cache[idx].lastMon = todayStr;
            if (heightVal) cache[idx].height = Number(heightVal);
            if (diamVal) cache[idx].trunkDiam = Number(diamVal);
            localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(cache));
          }
        }
      } catch (_) {}

      // Update Firestore if available
      if (window.ATAMAN_DB) {
        if (typeof window.ATAMAN_DB.updateTree === 'function') {
          try {
            await window.ATAMAN_DB.updateTree(currentMonTreeId, {
              status: mappedHealth === 'needs' ? 'needs-care' : mappedHealth,
              lastMon: todayStr
            });
          } catch (_) {}
        }
        if (typeof window.ATAMAN_DB.addMonitoringLog === 'function') {
          try {
            await window.ATAMAN_DB.addMonitoringLog({
              treeId: currentMonTreeId,
              status: mappedHealth,
              remarks: remarksVal,
              caretaker: caretakerName
            });
          } catch (_) {}
        }
      }

      closeRecordModal();
      syncCaretakerStats();
      if (typeof window.refreshCaretakerNotifications === 'function') window.refreshCaretakerNotifications();
      showCtToast(`✅ Monitoring recorded for ${currentMonTreeId}! Status: ${newHealthLabel}`);
    });
  }

  // Sidebar Monitoring click handler
  const navMonitoring = document.getElementById('navMonitoring');
  if (navMonitoring) {
    navMonitoring.addEventListener('click', (e) => {
      // Direct navigation to My Trees & Monitoring management
      window.location.href = 'my-trees.html';
    });
  }

  // ── Maintenance Modal Handlers ──
  const maintModal = document.getElementById('addMaintModal');
  const maintTitle = document.getElementById('maintModalTitle');
  const maintForm = document.getElementById('addMaintForm');
  const maintTreeSelect = document.getElementById('maintTreeSelect');
  const closeMaintBtn = document.getElementById('closeAddMaintBtn');
  const cancelMaintBtn = document.getElementById('cancelAddMaintBtn');
  const maintDateInput = document.getElementById('maintDate');

  if (maintDateInput && !maintDateInput.value) {
    maintDateInput.value = new Date().toISOString().slice(0, 10);
  }

  // Populate maintTreeSelect from live trees cache if available
  try {
    const rawTrees = localStorage.getItem('ATAMAN_trees_cache');
    if (rawTrees && maintTreeSelect) {
      const parsed = JSON.parse(rawTrees);
      if (Array.isArray(parsed) && parsed.length > 0) {
        maintTreeSelect.innerHTML = parsed.map(t => {
          const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Tree';
          const loc = t.barangay ? `Brgy. ${t.barangay}` : (t.location || 'Catbalogan');
          return `<option value="${t.id}">${t.id} — ${sp} (${loc})</option>`;
        }).join('');
      }
    }
  } catch (_) {}

  function openMaintenanceModal(treeId = null) {
    if (treeId && maintTreeSelect) {
      maintTreeSelect.value = treeId;
    }
    const selectedTreeId = maintTreeSelect ? maintTreeSelect.value : (treeId || 'TR-10021');
    if (maintTitle) maintTitle.textContent = `Log Maintenance — ${selectedTreeId}`;
    if (maintModal) maintModal.classList.remove('hide');
  }

  function closeMaintenanceModal() {
    if (maintModal) maintModal.classList.add('hide');
    if (maintForm) maintForm.reset();
    if (maintDateInput) maintDateInput.value = new Date().toISOString().slice(0, 10);
  }

  if (closeMaintBtn) closeMaintBtn.addEventListener('click', closeMaintenanceModal);
  if (cancelMaintBtn) cancelMaintBtn.addEventListener('click', closeMaintenanceModal);
  if (maintModal) {
    maintModal.addEventListener('click', (e) => {
      if (e.target === maintModal) closeMaintenanceModal();
    });
  }

  if (maintTreeSelect) {
    maintTreeSelect.addEventListener('change', () => {
      if (maintTitle) maintTitle.textContent = `Log Maintenance — ${maintTreeSelect.value}`;
    });
  }

  if (maintForm) {
    maintForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetTree = maintTreeSelect ? maintTreeSelect.value : 'TR-10021';
      const mType = document.getElementById('maintType')?.value || 'Watering';
      const mQty = document.getElementById('maintQty')?.value || '';
      const mNotes = document.getElementById('maintNotes')?.value || 'Routine maintenance applied.';
      const mDate = maintDateInput?.value || new Date().toISOString().slice(0, 10);
      const caretaker = localStorage.getItem('ATAMAN_user_name') || 'Caretaker';

      // Save to Firestore if available
      if (window.ATAMAN_DB && typeof window.ATAMAN_DB.addMonitoringLog === 'function') {
        try {
          await window.ATAMAN_DB.addMonitoringLog({
            treeId: targetTree,
            status: 'maintained',
            activity: mType,
            remarks: `[${mType}] ${mQty ? `Dose: ${mQty}. ` : ''}${mNotes}`,
            caretaker: caretaker,
            date: mDate
          });
        } catch (_) {}
      }

      closeMaintenanceModal();
      if (typeof window.refreshCaretakerNotifications === 'function') window.refreshCaretakerNotifications();
      showCtToast(`🔧 Maintenance (${mType}) logged for ${targetTree}!`);
    });
  }

  // Sidebar Maintenance click handler
  const navMaintenance = document.getElementById('navMaintenance');
  if (navMaintenance) {
    navMaintenance.addEventListener('click', (e) => {
      e.preventDefault();
      openMaintenanceModal();
    });
  }

  // ── Reports Modal Handlers ──
  const reportsModal = document.getElementById('myReportsModal');
  const closeReportsBtn = document.getElementById('closeReportsModalBtn');
  const doneReportsBtn = document.getElementById('doneReportsModalBtn');
  const printReportBtn = document.getElementById('printReportBtn');
  const exportReportBtn = document.getElementById('exportReportBtn');
  const navReports = document.getElementById('navReports');

  function openReportsModal() {
    let trees = [];
    try {
      trees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
    } catch (_) {}
    if (!Array.isArray(trees)) {
      trees = [];
    }

    const ctName = localStorage.getItem('ATAMAN_user_name') || 'Caretaker';
    const total = trees.length;
    const dead = trees.filter(t => t.status === 'dead').length;
    const survivalRate = total > 0 ? (((total - dead) / total) * 100).toFixed(1) : '0.0';

    const repName = document.getElementById('repCaretakerName');
    const repTrees = document.getElementById('repTreesCount');
    const repSurv = document.getElementById('repSurvivalRate');
    const repMon = document.getElementById('repMonCount');
    const repMaint = document.getElementById('repMaintCount');
    const repTbody = document.getElementById('repActivityTbody');

    if (repName) repName.textContent = ctName;
    if (repTrees) repTrees.textContent = total;
    if (repSurv) repSurv.textContent = `${survivalRate}%`;
    if (repMon) repMon.textContent = Math.round(total * 1.8);
    if (repMaint) repMaint.textContent = Math.round(total * 0.9);

    if (repTbody) {
      if (trees.length === 0) {
        repTbody.innerHTML = '<tr><td colspan="5" style="padding:24px; text-align:center; color:#94a3b8;">No field activity records yet.</td></tr>';
      } else {
        repTbody.innerHTML = trees.slice(0, 10).map((t, idx) => {
          const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Narra';
          const st = t.status || 'healthy';
          const stBadge = st === 'healthy' ? '<span style="color:#16a34a; font-weight:700;">🟢 Healthy</span>' :
                          st === 'critical' ? '<span style="color:#dc2626; font-weight:700;">🔴 Critical</span>' :
                          st === 'dead' ? '<span style="color:#64748b; font-weight:700;">⚫ Dead</span>' :
                          '<span style="color:#d97706; font-weight:700;">🟡 Needs Care</span>';
          const date = t.lastMon || t.lastCheck || '—';
          const activity = idx % 2 === 0 ? '📷 Monitoring' : '🔧 Maintenance';
          const remark = t.status === 'critical' ? 'Pest presence noted, treatment dispatched' :
                         t.status === 'needs-care' ? 'Pruning and watering conducted' :
                         'Vigorous crown foliage, normal sapling growth';
          return `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:8px 12px; font-weight:600;">${date}</td>
              <td style="padding:8px 12px; font-weight:700; color:#0f172a;">${t.id} <span style="font-size:0.75rem; color:#64748b;">(${sp})</span></td>
              <td style="padding:8px 12px; font-weight:600;">${activity}</td>
              <td style="padding:8px 12px;">${stBadge}</td>
              <td style="padding:8px 12px; font-size:0.8rem; color:#475569;">${remark}</td>
            </tr>
          `;
        }).join('');
      }
    }

    if (reportsModal) reportsModal.classList.remove('hide');
  }

  function closeReportsModal() {
    if (reportsModal) reportsModal.classList.add('hide');
  }

  if (closeReportsBtn) closeReportsBtn.addEventListener('click', closeReportsModal);
  if (doneReportsBtn) doneReportsBtn.addEventListener('click', closeReportsModal);
  if (reportsModal) {
    reportsModal.addEventListener('click', (e) => {
      if (e.target === reportsModal) closeReportsModal();
    });
  }

  if (printReportBtn) {
    printReportBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (exportReportBtn) {
    exportReportBtn.addEventListener('click', () => {
      let trees = [];
      try { trees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]'); } catch (_) {}
      const csv = 'TreeID,Species,Status,LastMonitoring,Location\n' + trees.map(t => `${t.id},${typeof t.species === 'object' ? t.species.common : t.species},${t.status},${t.lastMon || 'N/A'},${t.barangay || 'Catbalogan'}`).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ATAMAN_Caretaker_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showCtToast('📥 Caretaker field report CSV exported successfully!');
    });
  }

  if (navReports) {
    navReports.addEventListener('click', (e) => {
      e.preventDefault();
      openReportsModal();
    });
  }

  if (window.location.hash === '#reports') {
    setTimeout(openReportsModal, 300);
  }

  // Inspect buttons
  document.querySelectorAll('.btn-inspect').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const treeId = btn.getAttribute('data-tree') || 'TR-10047';
      openRecordModal(treeId, 'Critical Tree Inspection');
    });
  });

  // Header & Schedule buttons
  initCaretakerSchedule();

  // Real-Time Notification Center (Top header bell + Live Sync)
  initCaretakerRealtimeNotifications(openRecordModal, openMaintenanceModal);

  const viewFullMapBtn = document.getElementById('viewFullMapBtn');
  if (viewFullMapBtn) {
    viewFullMapBtn.addEventListener('click', (e) => {
      // Ensure smooth navigation to caretaker-tree-map.html
      window.location.href = 'caretaker-tree-map.html';
    });
  }

  const viewAllPendingBtn = document.getElementById('viewAllPendingBtn');
  if (viewAllPendingBtn) {
    viewAllPendingBtn.addEventListener('click', () => {
      window.location.href = 'my-trees.html';
    });
  }

  const viewAllCriticalBtn = document.getElementById('viewAllCriticalBtn');
  if (viewAllCriticalBtn) {
    viewAllCriticalBtn.addEventListener('click', () => {
      showCtToast('Filtering all critical trees.');
    });
  }
}

/* ─── Caretaker Real-Time Notification Center ─── */
function initCaretakerRealtimeNotifications(openRecordModal, openMaintenanceModal) {
  const notifBtn = document.getElementById('ctNotifBtn');
  const notifBadge = document.getElementById('ctNotifBadge');
  const notifDropdown = document.getElementById('ctNotifDropdown');
  const notifList = document.getElementById('ctNotifDropdownList');
  const notifUnreadPill = document.getElementById('notifUnreadPill');
  const markAllReadBtn = document.getElementById('notifMarkAllReadBtn');
  const clearBtn = document.getElementById('notifClearBtn');
  const viewAllNotifsBtn = document.getElementById('viewAllNotifsBtn');
  const feedContainer = document.querySelector('.ct-notif-feed');

  // Load or generate notifications based on live state
  function getNotifications() {
    let trees = [];
    try {
      trees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
    } catch (_) {}

    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem('ATAMAN_caretaker_notifications') || '[]');
    } catch (_) {}

    // Find critical trees from live data
    const criticalTrees = trees.filter(t => t.status === 'critical' || t.health === 'critical');

    const generated = [];

    // 1. Critical tree alerts
    criticalTrees.forEach(t => {
      const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Tree';
      const loc = t.barangay ? `Brgy. ${t.barangay}` : (t.location || 'Catbalogan');
      generated.push({
        id: `crit-${t.id}`,
        category: 'critical',
        icon: '🚨',
        title: `Critical Alert: ${t.id} (${sp})`,
        desc: `High priority tree health concern in ${loc}. Foliage damage or pests flagged.`,
        time: '10m ago',
        treeId: t.id,
        actionLabel: 'Inspect Tree',
        actionClass: 'btn-act-red',
        actionType: 'inspect'
      });
    });

    // Merge read status from stored
    const storedMap = new Map((stored || []).map(s => [s.id, s.read]));
    generated.forEach(item => {
      item.read = storedMap.has(item.id) ? storedMap.get(item.id) : false;
    });

    return generated;
  }

  function saveStoredReadState(notifs) {
    try {
      const state = notifs.map(n => ({ id: n.id, read: !!n.read }));
      localStorage.setItem('ATAMAN_caretaker_notifications', JSON.stringify(state));
    } catch (_) {}
  }

  function renderNotifications() {
    const notifs = getNotifications();
    const unreadCount = notifs.filter(n => !n.read).length;

    // 1. Update Header Badge
    if (notifBadge) {
      if (unreadCount > 0) {
        notifBadge.textContent = unreadCount;
        notifBadge.classList.remove('hide');
      } else {
        notifBadge.textContent = '0';
        notifBadge.classList.add('hide');
      }
    }

    // 2. Update Dropdown Header Pill
    if (notifUnreadPill) {
      if (unreadCount > 0) {
        notifUnreadPill.textContent = `${unreadCount} Unread`;
        notifUnreadPill.classList.remove('all-read');
      } else {
        notifUnreadPill.textContent = 'All caught up';
        notifUnreadPill.classList.add('all-read');
      }
    }

    // 3. Render Dropdown List
    if (notifList) {
      if (notifs.length === 0) {
        notifList.innerHTML = `
          <div style="text-align:center; padding:32px 16px; color:#94a3b8;">
            <div style="font-size:1.8rem; margin-bottom:6px;">🔔</div>
            <div style="font-weight:700; color:#0f172a; font-size:13px;">No New Notifications</div>
            <div style="font-size:11px; margin-top:2px;">You are all up to date with field tasks.</div>
          </div>
        `;
      } else {
        notifList.innerHTML = notifs.map(n => `
          <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
            <div class="notif-icon-box ${n.category}">
              ${n.icon}
            </div>
            <div class="notif-content">
              <div class="notif-item-title">
                <span>${n.title}</span>
                <span class="notif-time">${n.time}</span>
              </div>
              <div class="notif-item-desc">${n.desc}</div>
              ${n.actionLabel ? `
                <button type="button" class="notif-action-btn ${n.actionClass || 'btn-act-green'}" data-action="${n.actionType}" data-tree="${n.treeId || ''}" data-id="${n.id}">
                  ${n.actionLabel} →
                </button>
              ` : ''}
            </div>
          </div>
        `).join('');
      }

      // Action button listeners inside dropdown
      notifList.querySelectorAll('.notif-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.getAttribute('data-action');
          const treeId = btn.getAttribute('data-tree');
          const id = btn.getAttribute('data-id');

          // Mark this notification as read
          markItemRead(id);
          closeDropdown();

          if (action === 'inspect' && typeof openRecordModal === 'function') {
            openRecordModal(treeId || 'TR-10047', 'Critical Tree Inspection');
          } else if (action === 'monitor' && typeof openRecordModal === 'function') {
            openRecordModal(treeId || 'TR-10021');
          } else if (action === 'maintain' && typeof openMaintenanceModal === 'function') {
            openMaintenanceModal(treeId || 'TR-10035');
          } else if (action === 'map') {
            window.location.href = 'caretaker-tree-map.html';
          }
        });
      });

      // Clicking anywhere on a notification item marks it read
      notifList.querySelectorAll('.notif-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.getAttribute('data-id');
          markItemRead(id);
        });
      });
    }

    // 4. Synchronize Dashboard Card Feed (.ct-notif-feed)
    if (feedContainer) {
      feedContainer.innerHTML = notifs.slice(0, 3).map(n => {
        const sqClass = n.category === 'critical' ? 'ico-red-sq' : n.category === 'monitoring' ? 'ico-blue-sq' : 'ico-green-sq';
        return `
          <div class="ct-feed-item" style="cursor:pointer;" data-tree="${n.treeId || ''}" data-action="${n.actionType || ''}">
            <div class="feed-icon ${sqClass}">
              <span style="font-size:18px;">${n.icon}</span>
            </div>
            <div class="feed-content">
              <div class="feed-header-row">
                <h4 class="feed-title">${n.title}</h4>
                <span class="feed-time">${n.time}</span>
              </div>
              <p class="feed-desc">${n.desc}</p>
            </div>
          </div>
        `;
      }).join('');

      feedContainer.querySelectorAll('.ct-feed-item').forEach(item => {
        item.addEventListener('click', () => {
          const action = item.getAttribute('data-action');
          const treeId = item.getAttribute('data-tree');
          if (action === 'inspect' && typeof openRecordModal === 'function') {
            openRecordModal(treeId || 'TR-10047', 'Critical Tree Inspection');
          } else if (action === 'maintain' && typeof openMaintenanceModal === 'function') {
            openMaintenanceModal(treeId || 'TR-10035');
          } else {
            toggleDropdown();
          }
        });
      });
    }
  }

  function markItemRead(id) {
    const notifs = getNotifications();
    const item = notifs.find(n => n.id === id);
    if (item) {
      item.read = true;
      saveStoredReadState(notifs);
      renderNotifications();
    }
  }

  function markAllRead() {
    const notifs = getNotifications();
    notifs.forEach(n => n.read = true);
    saveStoredReadState(notifs);
    renderNotifications();
    showCtToast('All notifications marked as read.');
  }

  function clearAll() {
    const notifs = getNotifications();
    notifs.forEach(n => n.read = true);
    saveStoredReadState(notifs);
    renderNotifications();
    showCtToast('Alerts cleared.');
  }

  function toggleDropdown() {
    if (notifDropdown) {
      notifDropdown.classList.toggle('hide');
    }
  }

  function closeDropdown() {
    if (notifDropdown) notifDropdown.classList.add('hide');
  }

  if (notifBtn) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
  }

  if (viewAllNotifsBtn) {
    viewAllNotifsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      markAllRead();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearAll();
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#ctNotifWrapper') && !e.target.closest('#viewAllNotifsBtn')) {
      closeDropdown();
    }
  });

  // Real-time synchronization listeners
  window.addEventListener('storage', (e) => {
    if (e.key === 'ATAMAN_trees_cache' || e.key === 'ATAMAN_caretaker_notifications') {
      renderNotifications();
    }
  });

  if (window.ATAMAN_DB && typeof window.ATAMAN_DB.onTreesChange === 'function') {
    window.ATAMAN_DB.onTreesChange(() => {
      renderNotifications();
    });
  }

  // Initial render
  renderNotifications();
  // Expose for external trigger if needed
  window.refreshCaretakerNotifications = renderNotifications;
}

/* ─── Caretaker Dynamic Schedule Management ─── */
function initCaretakerSchedule() {
  const dateBadge = document.getElementById('ctScheduleDateBadge');
  const treesCount = document.getElementById('ctScheduleTreesCount');
  const locCount = document.getElementById('ctScheduleLocCount');
  const timelineList = document.getElementById('ctScheduleTimelineList');
  const viewFullScheduleBtn = document.getElementById('viewFullScheduleBtn');

  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  if (dateBadge) dateBadge.textContent = todayFormatted;

  const getCaretakerData = () => {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
    } catch (e) {
      list = [];
    }
    if ((!Array.isArray(list) || list.length === 0) && typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_CARETAKERS)) {
      list = [...window.ATAMAN_DEFAULT_CARETAKERS];
    }
    const currentName = (localStorage.getItem('ATAMAN_user_name') || '').toLowerCase().trim();
    let ct = list.find(c => (c.name || '').toLowerCase().trim() === currentName);
    if (!ct && list.length > 0) ct = list[0];
    if (ct && !Array.isArray(ct.schedule)) ct.schedule = [];
    return { list, ct };
  };

  const updateScheduleCard = () => {
    const { ct } = getCaretakerData();
    const schedules = ct?.schedule || [];

    // Filter today's visits or due today
    const todayVisits = schedules.filter(s => {
      const isToday = s.date === todayFormatted || s.st?.includes('Due Today') || s.status?.includes('Due Today');
      return isToday && !s.st?.includes('Completed');
    });

    if (treesCount) {
      const totalTrees = todayVisits.reduce((sum, s) => sum + (s.target || s.count || 0), 0);
      treesCount.textContent = totalTrees;
    }

    if (locCount) {
      const uniqueLocs = new Set(todayVisits.map(s => s.loc || s.location || 'General'));
      locCount.textContent = uniqueLocs.size;
    }

    if (timelineList) {
      if (todayVisits.length > 0) {
        timelineList.innerHTML = todayVisits.map(v => `
          <div class="location-step">
            <div class="loc-pin">
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="loc-info">
              <strong class="loc-name">${v.loc || v.location || 'Field Zone'} (${v.plot || 'General Plot'})</strong>
              <span class="loc-trees">${v.target || v.count || 0} trees • ${v.st || v.status || 'Scheduled'}</span>
            </div>
          </div>
        `).join('');
      } else {
        timelineList.innerHTML = `
          <div style="color:var(--text-muted, #64748b); font-size:0.85rem; padding:12px 0;">
            No monitoring visits scheduled for today. Click "View Full Schedule" below to add an updated schedule.
          </div>
        `;
      }
    }
  };

  updateScheduleCard();

  if (viewFullScheduleBtn) {
    viewFullScheduleBtn.addEventListener('click', () => {
      openScheduleModal();
    });
  }

  const navSchedule = document.getElementById('navSchedule');
  if (navSchedule) {
    navSchedule.addEventListener('click', (e) => {
      e.preventDefault();
      const schedCard = document.querySelector('.ct-schedule-body')?.closest('.ct-card');
      if (schedCard) {
        schedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      openScheduleModal();
    });
  }

  if (window.location.hash === '#schedule') {
    setTimeout(() => {
      const schedCard = document.querySelector('.ct-schedule-body')?.closest('.ct-card');
      if (schedCard) {
        schedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      openScheduleModal();
    }, 400);
  }

  function openScheduleModal() {
    let modal = document.getElementById('ctScheduleModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ctScheduleModal';
      modal.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        padding: 16px;
      `;
      document.body.appendChild(modal);
    }

    const renderModalContent = () => {
      const { list, ct } = getCaretakerData();
      const schedules = ct?.schedule || [];
      const ctName = ct?.name || localStorage.getItem('ATAMAN_user_name') || 'Caretaker';
      const defLoc = ct?.primaryArea || 'Guinsorongan';

      modal.innerHTML = `
        <div style="background:#ffffff; border-radius:16px; width:100%; max-width:680px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 40px rgba(0,0,0,0.2); font-family:inherit; padding:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:14px; margin-bottom:16px;">
            <div>
              <h3 style="margin:0; font-size:1.15rem; font-weight:700; color:#0f172a;">📅 Field Monitoring Schedule</h3>
              <p style="margin:4px 0 0; font-size:0.82rem; color:#64748b;">Schedule monitor for <strong>${ctName}</strong></p>
            </div>
            <button id="closeCtSchedModalBtn" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#64748b;">&times;</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <span style="font-size:0.85rem; color:#64748b;">${schedules.length} scheduled visits recorded</span>
            <div style="display:flex; gap:8px;">
              <button id="addCtVisitBtn" style="background:#16a34a; color:#fff; border:none; padding:8px 14px; border-radius:8px; font-weight:600; font-size:0.85rem; cursor:pointer;">
                + Add Field Visit
              </button>
              ${schedules.length > 0 ? `
                <button id="clearCtAllSchedBtn" style="background:none; border:1px solid #fca5a5; color:#dc2626; padding:8px 12px; border-radius:8px; font-weight:600; font-size:0.85rem; cursor:pointer;">
                  🗑️ Clear All
                </button>
              ` : ''}
            </div>
          </div>

          <div id="ctAddVisitFormContainer" style="display:none; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin-bottom:16px;">
            <h4 style="margin:0 0 12px; font-size:0.92rem; font-weight:700; color:#0f172a;">Schedule New Monitoring Visit</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
              <div>
                <label style="display:block; font-size:0.75rem; font-weight:600; margin-bottom:4px; color:#475569;">Date</label>
                <input type="date" id="formVisitDate" value="${today.toISOString().slice(0, 10)}" style="width:100%; box-sizing:border-box; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px;" />
              </div>
              <div>
                <label style="display:block; font-size:0.75rem; font-weight:600; margin-bottom:4px; color:#475569;">Barangay / Site</label>
                <input type="text" id="formVisitLoc" value="${defLoc}" style="width:100%; box-sizing:border-box; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px;" />
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
              <div>
                <label style="display:block; font-size:0.75rem; font-weight:600; margin-bottom:4px; color:#475569;">Plot Details</label>
                <input type="text" id="formVisitPlot" placeholder="e.g. Plot 4-A, Sector 2" style="width:100%; box-sizing:border-box; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px;" />
              </div>
              <div>
                <label style="display:block; font-size:0.75rem; font-weight:600; margin-bottom:4px; color:#475569;">Target Trees</label>
                <input type="number" id="formVisitTarget" value="15" min="1" style="width:100%; box-sizing:border-box; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px;" />
              </div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px;">
              <button id="cancelAddVisitBtn" type="button" style="background:#e2e8f0; color:#334155; border:none; padding:7px 12px; border-radius:6px; font-weight:600; font-size:0.82rem; cursor:pointer;">Cancel</button>
              <button id="saveVisitBtn" type="button" style="background:#16a34a; color:#fff; border:none; padding:7px 14px; border-radius:6px; font-weight:600; font-size:0.82rem; cursor:pointer;">Save Visit</button>
            </div>
          </div>

          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:0.86rem;">
              <thead>
                <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0; color:#64748b; text-align:left;">
                  <th style="padding:10px 12px;">Date</th>
                  <th style="padding:10px 12px;">Location</th>
                  <th style="padding:10px 12px;">Plot</th>
                  <th style="padding:10px 12px; text-align:right;">Trees</th>
                  <th style="padding:10px 12px;">Status</th>
                  <th style="padding:10px 12px; text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${schedules.length > 0 ? schedules.map((s, idx) => `
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:10px 12px; font-weight:700;">${s.date}</td>
                    <td style="padding:10px 12px;">${s.loc || s.location || defLoc}</td>
                    <td style="padding:10px 12px;">${s.plot || 'General'}</td>
                    <td style="padding:10px 12px; text-align:right; font-weight:700;">${s.target || s.count || 0}</td>
                    <td style="padding:10px 12px;"><span style="font-weight:700; font-size:0.8rem;">${s.st || s.status || 'Scheduled'}</span></td>
                    <td style="padding:10px 12px; text-align:center;">
                      <button class="ct-del-sched-btn" data-idx="${idx}" style="background:none; border:none; color:#dc2626; cursor:pointer; font-size:0.9rem;" title="Delete visit">🗑️</button>
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="6" style="text-align:center; padding:32px 16px; color:#64748b;">
                      <div style="font-size:1.8rem; margin-bottom:6px;">📅</div>
                      <div style="font-weight:700; color:#0f172a; margin-bottom:4px;">No Monitoring Visits Scheduled</div>
                      <div style="font-size:0.82rem; margin-bottom:12px;">All previous schedules cleared. Click "+ Add Field Visit" to put an updated schedule monitor.</div>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <div style="margin-top:20px; display:flex; justify-content:flex-end;">
            <button id="doneCtModalBtn" style="background:#0f172a; color:#fff; border:none; padding:8px 18px; border-radius:8px; font-weight:600; font-size:0.85rem; cursor:pointer;">Close</button>
          </div>
        </div>
      `;

      // Event listeners
      document.getElementById('closeCtSchedModalBtn')?.addEventListener('click', () => modal.remove());
      document.getElementById('doneCtModalBtn')?.addEventListener('click', () => modal.remove());
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

      const formContainer = document.getElementById('ctAddVisitFormContainer');
      document.getElementById('addCtVisitBtn')?.addEventListener('click', () => {
        formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
      });
      document.getElementById('cancelAddVisitBtn')?.addEventListener('click', () => {
        formContainer.style.display = 'none';
      });

      document.getElementById('saveVisitBtn')?.addEventListener('click', () => {
        const dVal = document.getElementById('formVisitDate')?.value;
        const lVal = document.getElementById('formVisitLoc')?.value.trim() || defLoc;
        const pVal = document.getElementById('formVisitPlot')?.value.trim() || 'Sector 1';
        const tVal = parseInt(document.getElementById('formVisitTarget')?.value, 10) || 10;

        let displayDate = todayFormatted;
        if (dVal) {
          const parts = dVal.split('-');
          if (parts.length === 3) {
            displayDate = new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
          }
        }

        const newVisit = {
          id: 'SCH-' + Date.now().toString().slice(-6),
          date: displayDate,
          rawDate: dVal,
          loc: lVal,
          location: lVal,
          plot: pVal,
          target: tVal,
          count: tVal,
          st: 'Scheduled',
          status: 'Scheduled'
        };

        if (ct) {
          if (!Array.isArray(ct.schedule)) ct.schedule = [];
          ct.schedule.push(newVisit);
          try {
            localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(list));
          } catch(e) {}
        }
        updateScheduleCard();
        renderModalContent();
        showCtToast('Field monitoring visit scheduled!');
      });

      document.getElementById('clearCtAllSchedBtn')?.addEventListener('click', () => {
        if (confirm(`Clear all schedule visits for ${ctName}?`)) {
          if (ct) {
            ct.schedule = [];
            try {
              localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(list));
            } catch(e) {}
          }
          updateScheduleCard();
          renderModalContent();
          showCtToast('All scheduled visits cleared.');
        }
      });

      modal.querySelectorAll('.ct-del-sched-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          if (ct && ct.schedule && ct.schedule[idx]) {
            ct.schedule.splice(idx, 1);
            try {
              localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(list));
            } catch(e) {}
            updateScheduleCard();
            renderModalContent();
            showCtToast('Schedule visit removed.');
          }
        });
      });
    };

    renderModalContent();
  }
}

/* ─── Toast Notification Helper ─── */
let ctToastTimer = null;
function showCtToast(msg) {
  const toast = document.getElementById('ctToast');
  const toastMsg = document.getElementById('ctToastMsg');
  if (!toast || !toastMsg) return;

  if (ctToastTimer) clearTimeout(ctToastTimer);
  toastMsg.textContent = msg;
  toast.classList.add('show');

  ctToastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

/* ─── Mobile Navigation & Drawer Handling ─── */
function initMobileNav() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const closeBtn = document.getElementById('ctDrawerCloseBtn');
  const bnavMenuToggle = document.getElementById('bnavMenuToggle');
  const bnavMonitoring = document.getElementById('bnavMonitoring');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openSidebar);
  if (bnavMenuToggle) bnavMenuToggle.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // Close drawer if clicking any nav link
  if (sidebar) {
    sidebar.querySelectorAll('.ct-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeSidebar();
      });
    });
  }

  // Quick Monitor in bottom nav scrolls to Pending Monitoring section
  if (bnavMonitoring) {
    bnavMonitoring.addEventListener('click', (e) => {
      e.preventDefault();
      const pendingSection = document.querySelector('.ct-table-responsive') || document.querySelector('.ct-mid-grid');
      if (pendingSection) {
        pendingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showCtToast('📋 Jumped to Pending Monitoring list');
      }
    });
  }
}
