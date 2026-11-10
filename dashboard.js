/**
 * ATAMAN Admin Dashboard Logic
 * Universal Authentication, Real-Time Firestore & Local Cache Sync, Dynamic Leaflet GIS Map,
 * Interactive Health Donut Chart, and Real-Time Operational Analytics.
 */

'use strict';

/* ─── Global State ─── */
let healthDonutChart = null;
let leafletMap = null;
let mapMarkerLayers = [];
let currentTrees = [];
let currentAdopters = [];
let currentCaretakers = [];
let currentUsers = [];

document.addEventListener('DOMContentLoaded', () => {
  initFirebaseAuth();
  initSidebarToggles();
  initQuickActions();
  initLeafletMap();
  initDonutChart([0, 0, 0, 0]);

  // Initial Load from LocalStorage and Firestore
  loadDashboardData();

  // Attach Real-Time Listeners
  initRealtimeSync();
});

/* ─── 0. Universal Auth State & User Profile ─── */
function initFirebaseAuth() {
  const sbUserName = document.getElementById('sbUserName');
  const sbUserRole = document.getElementById('sbUserRole');
  const sbUserAvatar = document.getElementById('sbAvatar') || document.getElementById('sbUserAvatar');
  const logoutBtn = document.getElementById('logoutBtn');
  const authAPI = window.ATAMAN_AUTH;

  const savedRole = localStorage.getItem('ATAMAN_user_role') || 'admin';
  const roleDisplayNames = {
    admin: 'Super Administrator',
    caretaker: 'Field Caretaker',
    adopter: 'Tree Adopter'
  };

  if (sbUserRole) {
    sbUserRole.textContent = roleDisplayNames[savedRole] || 'Super Administrator';
  }

  if (authAPI && typeof authAPI.onAuthStateChanged === 'function') {
    authAPI.onAuthStateChanged((user) => {
      if (user) {
        const displayName = user.displayName || localStorage.getItem('ATAMAN_user_name') || 'Ethel Zeta (Admin)';
        const initials = displayName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'EZ';

        if (sbUserName) sbUserName.textContent = displayName;
        if (sbUserAvatar) sbUserAvatar.textContent = initials;
      }
    });
  } else {
    const displayName = localStorage.getItem('ATAMAN_user_name') || 'Ethel Zeta (Admin)';
    if (sbUserName) sbUserName.textContent = displayName;
    if (sbUserAvatar) sbUserAvatar.textContent = 'EZ';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        showDashToast('Signing out of ATAMAN...');
        if (authAPI && typeof authAPI.signOut === 'function') {
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

/* ─── 1. Data Loader & State Engine ─── */
function loadDashboardData() {
  // 1. Load Trees
  try {
    const cachedTrees = localStorage.getItem('ATAMAN_trees_cache');
    let parsed = null;
    if (cachedTrees) {
      try { parsed = JSON.parse(cachedTrees); } catch (_) {}
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      if (typeof window.ATAMAN_DEFAULT_TREES !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_TREES)) {
        parsed = [...window.ATAMAN_DEFAULT_TREES];
        try { localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(parsed)); } catch (_) {}
      }
    }
    if (Array.isArray(parsed)) {
      let treesChanged = false;
      parsed.forEach(t => {
        if (t && !t.customFunding && (t.fundingAmount === 50 || t.totalFunding)) {
          t.fundingAmount = 0;
          t.totalFunding = 0;
          treesChanged = true;
        }
      });
      if (treesChanged) {
        localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(parsed));
      }
      currentTrees = parsed;
    }
  } catch (e) {
    console.warn('Error reading ATAMAN_trees_cache:', e);
  }

  // 2. Load Adopters (and deduplicate any split registration/adoption records for the same account)
  try {
    const cachedAdopters = localStorage.getItem('ATAMAN_adopters_cache');
    if (cachedAdopters) {
      const parsed = JSON.parse(cachedAdopters);
      if (Array.isArray(parsed)) {
        let adsChanged = false;
        parsed.forEach(a => {
          if (!a) return;
          const cnt = Number(a.treesCount ?? (Array.isArray(a.treesList) ? a.treesList.length : (a.treesAdopted || 0))) || 0;
          if (cnt > 0 && Number(a.funding || a.fundingPaid) > 0 && a.customFunding === undefined) {
            a.customFunding = true;
          }
          if (!a.customFunding && (a.funding || a.fundingPaid)) {
            a.funding = 0;
            a.fundingPaid = 0;
            adsChanged = true;
          }
        });
        for (let i = 0; i < parsed.length; i++) {
          const a = parsed[i];
          if (!a) continue;
          for (let j = i + 1; j < parsed.length; j++) {
            const b = parsed[j];
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
              parsed[i] = primary;
              parsed.splice(j, 1);
              j--;
              adsChanged = true;
            }
          }
        }
        if (adsChanged) {
          localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(parsed));
        }
        currentAdopters = parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading ATAMAN_adopters_cache:', e);
  }

  // 3. Load Caretakers
  try {
    const cachedCaretakers = localStorage.getItem('ATAMAN_caretakers_cache');
    if (cachedCaretakers) {
      const parsed = JSON.parse(cachedCaretakers);
      if (Array.isArray(parsed)) currentCaretakers = parsed;
    }
  } catch (e) {
    console.warn('Error reading ATAMAN_caretakers_cache:', e);
  }

  // 4. Load Users
  try {
    const cachedUsers = localStorage.getItem('ATAMAN_registered_users') || localStorage.getItem('ATAMAN_users_cache');
    if (cachedUsers) {
      const parsed = JSON.parse(cachedUsers);
      if (Array.isArray(parsed)) currentUsers = parsed;
    }
  } catch (e) {
    console.warn('Error reading ATAMAN_registered_users:', e);
  }

  // Render everything immediately from cached data
  renderAllDashboardMetrics();

  // Also query Firestore if online
  if (window.ATAMAN_DB) {
    if (typeof window.ATAMAN_DB.getTrees === 'function') {
      window.ATAMAN_DB.getTrees().then(res => {
        if (res && Array.isArray(res.data) && res.data.length > 0) {
          currentTrees = res.data;
          renderAllDashboardMetrics();
        }
      }).catch(() => {});
    }

    if (typeof window.ATAMAN_DB.getAdopters === 'function') {
      window.ATAMAN_DB.getAdopters().then(res => {
        if (Array.isArray(res) && res.length > 0) {
          currentAdopters = res;
          renderAllDashboardMetrics();
        }
      }).catch(() => {});
    }

    if (typeof window.ATAMAN_DB.getCaretakers === 'function') {
      window.ATAMAN_DB.getCaretakers().then(res => {
        if (Array.isArray(res) && res.length > 0) {
          currentCaretakers = res;
          renderAllDashboardMetrics();
        }
      }).catch(() => {});
    }
  }
}

/* ─── 2. Full Dashboard Render Pipeline ─── */
function renderAllDashboardMetrics() {
  updateTopKpis();
  updateHealthDonut();
  updateMapMarkers();
  updateRecentAdoptions();
  updateRecentActivities();
  updateAdoptionsOverview();
  updateTopSpeciesTable();
  updateSystemSummary();
}

/* ─── 2.1 Top KPI Cards ─── */
function updateTopKpis() {
  let totalTrees = 0;
  let healthy = 0;
  let needs = 0;
  let critical = 0;
  let dead = 0;

  currentTrees.forEach(t => {
    const count = Math.max(1, parseInt(t.treeCount) || 1);
    totalTrees += count;

    const s = String(t.status || 'healthy').toLowerCase().trim();
    if (s === 'healthy') healthy += count;
    else if (s === 'needs-care' || s === 'needs') needs += count;
    else if (s === 'critical') critical += count;
    else if (s === 'dead') dead += count;
    else healthy += count;
  });

  const totalEl = document.getElementById('dashTotalPlanted');
  if (totalEl) totalEl.textContent = totalTrees.toLocaleString();

  const plantedDeltaEl = document.getElementById('dashPlantedDelta');
  if (plantedDeltaEl) {
    plantedDeltaEl.textContent = totalTrees > 0 ? `${currentTrees.length} registered batch${currentTrees.length === 1 ? '' : 'es'}` : '—';
  }

  const healthyEl = document.getElementById('dashHealthy');
  if (healthyEl) healthyEl.textContent = healthy.toLocaleString();
  const healthyPctEl = document.getElementById('dashHealthyPct');
  if (healthyPctEl) healthyPctEl.textContent = totalTrees > 0 ? `${((healthy / totalTrees) * 100).toFixed(1)}% of total` : '0% of total';

  const needsEl = document.getElementById('dashNeedsCare');
  if (needsEl) needsEl.textContent = needs.toLocaleString();
  const needsPctEl = document.getElementById('dashNeedsCarePct');
  if (needsPctEl) needsPctEl.textContent = totalTrees > 0 ? `${((needs / totalTrees) * 100).toFixed(1)}% of total` : '0% of total';

  const critEl = document.getElementById('dashCritical');
  if (critEl) critEl.textContent = critical.toLocaleString();
  const critPctEl = document.getElementById('dashCriticalPct');
  if (critPctEl) critPctEl.textContent = totalTrees > 0 ? `${((critical / totalTrees) * 100).toFixed(1)}% of total` : '0% of total';

  const deadEl = document.getElementById('dashDead');
  if (deadEl) deadEl.textContent = dead.toLocaleString();
  const deadPctEl = document.getElementById('dashDeadPct');
  if (deadPctEl) deadPctEl.textContent = totalTrees > 0 ? `${((dead / totalTrees) * 100).toFixed(1)}% of total` : '0% of total';

  // Total Adopters Card
  const adoptersEl = document.getElementById('dashTotalAdopters');
  if (adoptersEl) adoptersEl.textContent = currentAdopters.length.toLocaleString();

  const adoptersDeltaEl = document.getElementById('dashAdoptersDelta');
  if (adoptersDeltaEl) {
    const activeCount = currentAdopters.filter(a => (a.status || 'Active').toLowerCase() === 'active').length;
    adoptersDeltaEl.textContent = currentAdopters.length > 0 ? `${activeCount} active adopter${activeCount === 1 ? '' : 's'}` : '—';
  }
}

/* ─── 2.2 Tree Health Donut Chart ─── */
function initDonutChart(counts) {
  const ctx = document.getElementById('healthChart');
  if (!ctx || typeof Chart === 'undefined') return;

  const dataCounts = counts || [0, 0, 0, 0];
  const total = dataCounts.reduce((a, b) => a + b, 0);

  if (healthDonutChart) {
    healthDonutChart.data.datasets[0].data = dataCounts;
    healthDonutChart.update();
    return;
  }

  healthDonutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Healthy', 'Needs Care', 'Critical', 'Dead'],
      datasets: [{
        data: dataCounts,
        backgroundColor: [
          '#22c55e', // Green
          '#f59e0b', // Amber
          '#ef4444', // Red
          '#94a3b8'  // Gray
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return ` ${label}: ${value.toLocaleString()} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function updateHealthDonut() {
  let totalTrees = 0;
  let healthy = 0, needs = 0, critical = 0, dead = 0;

  currentTrees.forEach(t => {
    const count = Math.max(1, parseInt(t.treeCount) || 1);
    totalTrees += count;

    const s = String(t.status || 'healthy').toLowerCase().trim();
    if (s === 'healthy') healthy += count;
    else if (s === 'needs-care' || s === 'needs') needs += count;
    else if (s === 'critical') critical += count;
    else if (s === 'dead') dead += count;
    else healthy += count;
  });

  const donutVal = document.querySelector('.donut-val');
  if (donutVal) donutVal.textContent = totalTrees.toLocaleString();

  // Legend
  const calcPct = (val) => totalTrees > 0 ? `${((val / totalTrees) * 100).toFixed(1)}%` : '0%';

  const hlHealthyCnt = document.getElementById('hlHealthyCnt');
  if (hlHealthyCnt) hlHealthyCnt.textContent = healthy.toLocaleString();
  const hlHealthyPct = document.getElementById('hlHealthyPct');
  if (hlHealthyPct) hlHealthyPct.textContent = calcPct(healthy);

  const hlNeedsCnt = document.getElementById('hlNeedsCnt');
  if (hlNeedsCnt) hlNeedsCnt.textContent = needs.toLocaleString();
  const hlNeedsPct = document.getElementById('hlNeedsPct');
  if (hlNeedsPct) hlNeedsPct.textContent = calcPct(needs);

  const hlCritCnt = document.getElementById('hlCritCnt');
  if (hlCritCnt) hlCritCnt.textContent = critical.toLocaleString();
  const hlCritPct = document.getElementById('hlCritPct');
  if (hlCritPct) hlCritPct.textContent = calcPct(critical);

  const hlDeadCnt = document.getElementById('hlDeadCnt');
  if (hlDeadCnt) hlDeadCnt.textContent = dead.toLocaleString();
  const hlDeadPct = document.getElementById('hlDeadPct');
  if (hlDeadPct) hlDeadPct.textContent = calcPct(dead);

  initDonutChart([healthy, needs, critical, dead]);
}

/* ─── 2.3 Interactive Leaflet Map ─── */
function initLeafletMap() {
  const mapElement = document.getElementById('leafletMap');
  if (!mapElement || typeof L === 'undefined') return;

  try {
    leafletMap = L.map('leafletMap', {
      zoomControl: true,
      attributionControl: false
    }).setView([11.78, 124.89], 12);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 17
    }).addTo(leafletMap);
  } catch (err) {
    console.warn('Leaflet initialization note:', err);
  }

  const speciesFilter = document.getElementById('speciesFilter');
  if (speciesFilter) {
    speciesFilter.addEventListener('change', (e) => {
      renderMapMarkers(e.target.value);
    });
  }
}

function createCustomIcon(status) {
  const colors = {
    healthy:     { bg: '#22c55e', border: '#15803d', shadow: 'rgba(34,197,94,0.45)' },
    'needs-care':{ bg: '#f59e0b', border: '#b45309', shadow: 'rgba(245,158,11,0.45)' },
    needs:       { bg: '#f59e0b', border: '#b45309', shadow: 'rgba(245,158,11,0.45)' },
    critical:    { bg: '#ef4444', border: '#b91c1c', shadow: 'rgba(239,68,68,0.45)' },
    dead:        { bg: '#64748b', border: '#334155', shadow: 'rgba(100,116,139,0.45)' }
  };
  const c = colors[status] || colors.healthy;
  const svgPin = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 36 46">
      <defs>
        <filter id="pd-${status}" x="-40%" y="-20%" width="180%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="${c.shadow}"/>
        </filter>
      </defs>
      <path d="M18 2C10.268 2 4 8.268 4 16c0 10 14 28 14 28S32 26 32 16C32 8.268 25.732 2 18 2z"
            fill="${c.bg}" stroke="${c.border}" stroke-width="1.5" filter="url(#pd-${status})"/>
      <circle cx="18" cy="16" r="9" fill="white" opacity="0.18"/>
      <g transform="translate(11, 8)" fill="white">
        <rect x="6" y="13" width="2" height="4" rx="0.5"/>
        <path d="M7 12C7 9 4 9 3 9C3 12 6 12 7 12Z"/>
        <path d="M7 10C7 7 10 7 11 7C11 10 8 10 7 10Z"/>
        <path d="M7 10C7 7 10 7 11 7C11 10 8 10 7 10Z" transform="translate(0,2)"/>
      </g>
    </svg>`;
  return L.divIcon({ className: 'custom-tree-pin-marker', html: svgPin, iconSize: [34, 44], iconAnchor: [17, 44], popupAnchor: [0, -44] });
}

function updateMapMarkers() {
  // Update species filter options dynamically
  const speciesFilter = document.getElementById('speciesFilter');
  if (speciesFilter) {
    const currentVal = speciesFilter.value || 'All Species';
    const distinctSpecies = new Set();
    currentTrees.forEach(t => {
      const spName = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || '';
      if (spName) distinctSpecies.add(spName);
    });

    let optionsHtml = '<option value="All Species">All Species</option>';
    Array.from(distinctSpecies).sort().forEach(sp => {
      optionsHtml += `<option value="${sp}" ${sp === currentVal ? 'selected' : ''}>${sp}</option>`;
    });
    speciesFilter.innerHTML = optionsHtml;
  }

  renderMapMarkers(speciesFilter ? speciesFilter.value : 'All Species');
}

function renderMapMarkers(filterSpecies = 'All Species') {
  if (!leafletMap) return;

  mapMarkerLayers.forEach(m => leafletMap.removeLayer(m));
  mapMarkerLayers = [];

  const markersBounds = [];

  const mappedTrees = currentTrees.filter(t => {
    if (!t) return false;
    const hasAdopter = Boolean((t.adopter && t.adopter !== 'None' && t.adopter !== 'Not yet adopted' && t.adopter !== 'Available for Adoption') || (t.sponsorName && t.sponsorName !== 'None' && t.sponsorName !== 'Available for Adoption') || (parseInt(t.takenCount) || 0) > 0);
    const hasCaretaker = Boolean(t.caretaker && t.caretaker !== 'Unassigned' && (hasAdopter || t.customCaretaker));
    const hasExplicitLocation = Boolean(t.barangay || (t.customGps && t.lat != null && t.lng != null));
    return hasAdopter || hasCaretaker || hasExplicitLocation;
  });

  mappedTrees.slice(0, 50).forEach((t, idx) => {
    const spName = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Tree Batch';
    if (filterSpecies !== 'All Species' && spName !== filterSpecies) return;

    // Use actual GPS or realistic distributed locations around Samar if missing
    let lat = typeof t.lat === 'number' ? t.lat : parseFloat(t.lat);
    let lng = typeof t.lng === 'number' ? t.lng : parseFloat(t.lng);

    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      lat = 11.775 + ((idx * 0.007) % 0.05) - 0.02;
      lng = 124.885 + ((idx * 0.009) % 0.06) - 0.03;
    }

    const st = (t.status || 'healthy').toLowerCase();
    const statusColor = st === 'healthy' ? '#16a34a' : st === 'critical' ? '#dc2626' : '#d97706';
    const count = Math.max(1, parseInt(t.treeCount) || 1);
    const location = [t.barangay, t.municipality].filter(Boolean).join(', ') || 'Samar Province';

    try {
      const marker = L.marker([lat, lng], { icon: createCustomIcon(st) })
        .bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px; min-width:160px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
              <strong style="font-size:13px; color:#0f172a;">${spName}</strong>
              <span style="font-size:10px; font-weight:700; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#475569;">${t.id || 'TR-#'}</span>
            </div>
            <div style="font-size:11px; margin-bottom:2px; color:#334155;">
              Quantity: <strong>${count} tree${count === 1 ? '' : 's'}</strong>
            </div>
            <div style="font-size:11px; text-transform:capitalize; color:${statusColor}; font-weight:600; margin-bottom:2px;">
              ● Health: ${st === 'needs-care' ? 'Needs Care' : st}
            </div>
            <div style="font-size:10.5px; color:#64748b;">
              📍 ${location}
            </div>
            ${t.sponsorName || t.adopter ? `<div style="font-size:10.5px; color:#166534; margin-top:3px; font-weight:600;">🤝 Adopted by ${t.sponsorName || t.adopter}</div>` : ''}
          </div>
        `)
        .addTo(leafletMap);

      mapMarkerLayers.push(marker);
      markersBounds.push([lat, lng]);
    } catch (e) {}
  });

  if (markersBounds.length > 0 && leafletMap) {
    try {
      leafletMap.fitBounds(markersBounds, { padding: [20, 20], maxZoom: 13 });
    } catch (e) {}
  }
}

/* ─── 2.4 Recent Adoptions List ─── */
function updateRecentAdoptions() {
  const listEl = document.getElementById('dashAdoptionList');
  if (!listEl) return;

  if (currentAdopters.length === 0) {
    listEl.innerHTML = `
      <div style="padding:32px 16px; text-align:center; color:#94a3b8; font-weight:600; font-size:13px;">
        🌱 No tree adoptions recorded yet.<br>New adoptions will automatically appear here.
        <div style="margin-top:12px;">
          <a href="admin-adopters.html" style="display:inline-block; font-size:12px; background:#166534; color:#fff; padding:6px 14px; border-radius:8px; text-decoration:none; font-weight:600;">
            + Register First Adopter
          </a>
        </div>
      </div>
    `;
    return;
  }

  const avatarClasses = ['av-green', 'av-blue', 'av-emerald', 'av-purple', 'av-teal'];
  const sorted = [...currentAdopters].slice(0, 5);

  let html = '';
  sorted.forEach((ad, idx) => {
    const name = ad.name || ad.adopterName || ad.displayName || 'Tree Adopter';
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AD';
    const avClass = avatarClasses[idx % avatarClasses.length];

    let treeDetail = 'Adopted trees';
    if (ad.treesCount) {
      treeDetail = `${ad.treesCount} Tree${ad.treesCount === 1 ? '' : 's'} Adopted`;
    } else if (ad.treesList && ad.treesList.length > 0) {
      treeDetail = `${ad.treesList.length} Tree${ad.treesList.length === 1 ? '' : 's'} Adopted`;
    }

    const st = (ad.status || 'Active').toLowerCase();
    const isDone = st === 'active' || st === 'completed';
    const badgeText = isDone ? 'Active' : (ad.status || 'Pending');
    const badgeClass = isDone ? 'b-done' : 'b-pend';

    let dateStr = 'Recent';
    if (ad.joinedDate || ad.createdAt || ad.date) {
      try {
        const d = new Date(ad.joinedDate || ad.createdAt || ad.date);
        dateStr = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch (e) {}
    }

    html += `
      <div class="adp-item">
        <div class="adp-av ${avClass}">${initials}</div>
        <div class="adp-info">
          <p class="adp-name" title="${name}">${name}</p>
          <p class="adp-tree">${treeDetail}</p>
        </div>
        <div class="adp-meta">
          <span class="adp-date">${dateStr}</span>
          <span class="adp-badge ${badgeClass}">${badgeText}</span>
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

/* ─── 2.5 Recent Activities Feed ─── */
function updateRecentActivities() {
  const actListEl = document.getElementById('dashActList');
  if (!actListEl) return;

  const activities = [];

  // Generate activities from recent trees
  currentTrees.slice(0, 4).forEach((t, i) => {
    const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Narra';
    const count = Math.max(1, parseInt(t.treeCount) || 1);
    const loc = t.barangay || 'Samar';
    const timeLabels = ['Just now', '15m ago', '2h ago', '1d ago'];

    activities.push({
      iconClass: 'ai-green',
      iconSvg: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
      desc: `Registered <strong>${count}x ${sp}</strong> in ${loc}`,
      actor: t.caretaker ? `By Caretaker ${t.caretaker}` : 'By Field Caretaker',
      time: timeLabels[i % timeLabels.length],
      ts: Date.now() - (i * 3600000)
    });
  });

  // Generate activities from recent adoptions
  currentAdopters.slice(0, 3).forEach((ad, i) => {
    const name = ad.name || 'Adopter';
    const count = ad.treesCount || (ad.treesList ? ad.treesList.length : 1);

    activities.push({
      iconClass: 'ai-blue',
      iconSvg: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      desc: `<strong>${name}</strong> adopted <strong>${count} trees</strong>`,
      actor: 'Tree Adoption Portal',
      time: i === 0 ? 'Today' : `${i + 1}d ago`,
      ts: Date.now() - (i * 86400000)
    });
  });

  if (activities.length === 0) {
    actListEl.innerHTML = `
      <div style="padding:32px 16px; text-align:center; color:#94a3b8; font-weight:600; font-size:13px;">
        📋 No recent activities.<br>Actions taken across ATAMAN will be logged here.
      </div>
    `;
    return;
  }

  activities.sort((a, b) => b.ts - a.ts);

  let html = '';
  activities.slice(0, 5).forEach(item => {
    html += `
      <div class="act-item">
        <div class="act-ico ${item.iconClass}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${item.iconSvg}
          </svg>
        </div>
        <div class="act-info">
          <p class="act-desc">${item.desc}</p>
          <p class="act-by">${item.actor}</p>
        </div>
        <span class="act-time">${item.time}</span>
      </div>
    `;
  });

  actListEl.innerHTML = html;
}

/* ─── 2.6 Adoptions Overview 2x2 ─── */
function updateAdoptionsOverview() {
  let totalAdoptionsCount = 0;
  let activeAdoptersCount = 0;
  let pendingAdoptersCount = 0;
  let totalFunded = 0;

  currentAdopters.forEach(ad => {
    const st = String(ad.status || 'Active').toLowerCase();
    if (st === 'active' || st === 'completed') activeAdoptersCount++;
    else if (st === 'pending') pendingAdoptersCount++;
    else activeAdoptersCount++;

    const count = parseInt(ad.treesCount, 10) || (Array.isArray(ad.treesList) ? ad.treesList.length : (parseInt(ad.treesAdopted, 10) || 0));
    totalAdoptionsCount += count;

    const funding = ad.customFunding ? (parseFloat(ad.funding || ad.fundingPaid || ad.amount || 0) || 0) : 0;
    totalFunded += funding;
  });

  // Also check taken trees from tree batches
  currentTrees.forEach(t => {
    const taken = parseInt(t.takenCount) || 0;
    if (taken > 0 && currentAdopters.length === 0) {
      totalAdoptionsCount += taken;
      activeAdoptersCount++;
      const rate = t.customFunding ? (parseFloat(t.fundingAmount) || 0) : 0;
      totalFunded += (taken * rate);
    }
  });

  const ovTotalAdoptions = document.getElementById('ovTotalAdoptions');
  if (ovTotalAdoptions) ovTotalAdoptions.textContent = totalAdoptionsCount.toLocaleString();

  const ovTotalAdoptionsDelta = document.getElementById('ovTotalAdoptionsDelta');
  if (ovTotalAdoptionsDelta) ovTotalAdoptionsDelta.textContent = totalAdoptionsCount > 0 ? 'Trees adopted' : '—';

  const ovActiveAdopters = document.getElementById('ovActiveAdopters');
  if (ovActiveAdopters) ovActiveAdopters.textContent = activeAdoptersCount.toLocaleString();

  const ovActiveAdoptersDelta = document.getElementById('ovActiveAdoptersDelta');
  if (ovActiveAdoptersDelta) ovActiveAdoptersDelta.textContent = activeAdoptersCount > 0 ? 'Active accounts' : '—';

  const ovTotalFunded = document.getElementById('ovTotalFunded');
  if (ovTotalFunded) ovTotalFunded.textContent = '₱' + Math.round(totalFunded).toLocaleString();

  const ovTotalFundedDelta = document.getElementById('ovTotalFundedDelta');
  if (ovTotalFundedDelta) ovTotalFundedDelta.textContent = totalFunded > 0 ? 'Pledged & paid' : '—';

  const ovPendingAdoptions = document.getElementById('ovPendingAdoptions');
  if (ovPendingAdoptions) ovPendingAdoptions.textContent = pendingAdoptersCount.toLocaleString();

  const ovPendingAdoptionsDelta = document.getElementById('ovPendingAdoptionsDelta');
  if (ovPendingAdoptionsDelta) ovPendingAdoptionsDelta.textContent = pendingAdoptersCount > 0 ? 'Needs confirmation' : '0 pending';
}

/* ─── 2.7 Top Tree Species Table ─── */
function updateTopSpeciesTable() {
  const tbody = document.getElementById('dashSpeciesTableBody');
  if (!tbody) return;

  const speciesCounts = {};
  let totalTreesSum = 0;

  currentTrees.forEach(t => {
    const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Narra';
    const count = Math.max(1, parseInt(t.treeCount) || 1);
    speciesCounts[sp] = (speciesCounts[sp] || 0) + count;
    totalTreesSum += count;
  });

  const sortedSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1]);

  if (sortedSpecies.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:28px 12px; color:#94a3b8; font-weight:600; font-size:13px;">
          🍃 No species data recorded yet.<br>Plant trees in the Trees Registry to populate species analytics.
        </td>
      </tr>
    `;
    return;
  }

  const dotColors = ['#22c55e', '#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'];

  let rowsHtml = '';
  sortedSpecies.slice(0, 5).forEach(([sp, count], idx) => {
    const pct = totalTreesSum > 0 ? ((count / totalTreesSum) * 100).toFixed(1) : 0;
    const color = dotColors[idx % dotColors.length];

    rowsHtml += `
      <tr>
        <td>
          <div class="sp-name">
            <span class="sp-dot" style="background:${color}"></span>
            <span>${sp}</span>
          </div>
        </td>
        <td class="bar-col">
          <div class="sp-bar-bg">
            <div class="sp-bar" style="width:${pct}%; background:${color}"></div>
          </div>
        </td>
        <td class="sp-count">${count.toLocaleString()}</td>
        <td class="sp-pct">${pct}%</td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;
}

/* ─── 2.8 System Summary ─── */
function updateSystemSummary() {
  // Total Users: registered users + adopters + caretakers
  const userSet = new Set();
  currentUsers.forEach(u => userSet.add(u.email || u.id || u.uid));
  currentAdopters.forEach(a => userSet.add(a.email || a.name || a.id));
  currentCaretakers.forEach(c => userSet.add(c.email || c.name || c.id));

  const totalUserCount = userSet.size;

  const sumUsersEl = document.getElementById('dashSumUsers');
  if (sumUsersEl) sumUsersEl.textContent = totalUserCount.toLocaleString();

  const sumUsersTag = document.getElementById('dashSumUsersTag');
  if (sumUsersTag) sumUsersTag.textContent = `${currentAdopters.length} adopters`;

  // Caretakers
  const caretakerCount = currentCaretakers.length;
  const sumCtEl = document.getElementById('dashSumCaretakers');
  if (sumCtEl) sumCtEl.textContent = caretakerCount.toLocaleString();

  // Locations: distinct barangays & municipalities
  const locationSet = new Set();
  currentTrees.forEach(t => {
    if (t.barangay) locationSet.add(t.barangay);
    if (t.municipality) locationSet.add(t.municipality);
  });
  const locationCount = locationSet.size;
  const sumLocEl = document.getElementById('dashSumLocations');
  if (sumLocEl) sumLocEl.textContent = locationCount.toLocaleString();

  // Reports Logged
  const sumReportsEl = document.getElementById('dashSumReports');
  if (sumReportsEl) {
    const reportCount = currentTrees.length + currentAdopters.length;
    sumReportsEl.textContent = reportCount.toLocaleString();
  }
}

/* ─── 3. Real-Time Multi-Tab & Database Sync Engine ─── */
function initRealtimeSync() {
  // 1. Cross-Tab storage events — refresh when any ATAMAN cache changes in another tab
  window.addEventListener('storage', (e) => {
    const watchedKeys = [
      'ATAMAN_trees_cache', 'ATAMAN_adopters_cache',
      'ATAMAN_caretakers_cache', 'ATAMAN_registered_users',
      'ATAMAN_users_cache', 'ATAMAN_notifications_cache'
    ];
    if (watchedKeys.includes(e.key)) loadDashboardData();
  });

  // 2. Custom ATAMAN_SYNC events (dispatched by realtime-admin.js BroadcastChannel)
  window.addEventListener('ATAMAN:trees-updated', (e) => {
    if (e.detail && Array.isArray(e.detail)) { currentTrees = e.detail; renderAllDashboardMetrics(); }
    else loadDashboardData();
  });
  window.addEventListener('ATAMAN:adopters-updated', (e) => {
    if (e.detail && Array.isArray(e.detail)) { currentAdopters = e.detail; renderAllDashboardMetrics(); }
    else loadDashboardData();
  });
  window.addEventListener('ATAMAN:caretakers-updated', (e) => {
    if (e.detail && Array.isArray(e.detail)) { currentCaretakers = e.detail; renderAllDashboardMetrics(); }
    else loadDashboardData();
  });
  window.addEventListener('ATAMAN:users-updated', () => { loadDashboardData(); });

  // 3. Cloud Firestore real-time snapshot streams
  if (window.ATAMAN_DB) {
    if (typeof window.ATAMAN_DB.onTreesChange === 'function') {
      window.ATAMAN_DB.onTreesChange((trees) => {
        if (trees && Array.isArray(trees)) {
          if (trees.length > 0) {
            currentTrees = trees;
          } else if (currentTrees.length === 0 && typeof window.ATAMAN_DEFAULT_TREES !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_TREES)) {
            currentTrees = [...window.ATAMAN_DEFAULT_TREES];
          }
          renderAllDashboardMetrics();
        }
      });
    }
    if (typeof window.ATAMAN_DB.onAdoptersChange === 'function') {
      window.ATAMAN_DB.onAdoptersChange((adopters) => {
        if (adopters && Array.isArray(adopters)) { currentAdopters = adopters; renderAllDashboardMetrics(); }
      });
    }
    if (typeof window.ATAMAN_DB.onCaretakersChange === 'function') {
      window.ATAMAN_DB.onCaretakersChange((caretakers) => {
        if (caretakers && Array.isArray(caretakers)) { currentCaretakers = caretakers; renderAllDashboardMetrics(); }
      });
    }
  }

  // 4. Sync All Data Button — pulls every data source, rebroadcasts, re-renders
  const syncBtn = document.getElementById('btnSyncAllDash');
  if (!syncBtn) return;

  syncBtn.addEventListener('click', async () => {
    if (syncBtn.disabled) return;
    const spanEl = syncBtn.querySelector('span');

    // Start visual feedback
    syncBtn.classList.add('syncing');
    syncBtn.disabled = true;
    if (spanEl) spanEl.textContent = 'Syncing\u2026';
    showDashToast('\uD83D\uDD04 Syncing all ATAMAN data across dashboards\u2026');

    try {
      const now = new Date();
      const syncLabel = `[${now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]`;
      let source = 'local';

      // Step 1: Fetch fresh data from Cloud Firestore (if online)
      if (window.ATAMAN_DB) {
        const tasks = [];

        if (typeof window.ATAMAN_DB.getTrees === 'function') {
          tasks.push(window.ATAMAN_DB.getTrees().then(res => {
            const d = res && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : null);
            if (d && d.length > 0) {
              currentTrees = d;
              localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(d));
              source = 'firestore';
            }
          }).catch(() => {}));
        }
        if (typeof window.ATAMAN_DB.getAdopters === 'function') {
          tasks.push(window.ATAMAN_DB.getAdopters().then(res => {
            const d = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : null);
            if (d && d.length > 0) {
              currentAdopters = d;
              localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(d));
              source = 'firestore';
            }
          }).catch(() => {}));
        }
        if (typeof window.ATAMAN_DB.getCaretakers === 'function') {
          tasks.push(window.ATAMAN_DB.getCaretakers().then(res => {
            const d = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : null);
            if (d && d.length > 0) {
              currentCaretakers = d;
              localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(d));
              source = 'firestore';
            }
          }).catch(() => {}));
        }
        if (typeof window.ATAMAN_DB.getUsers === 'function') {
          tasks.push(window.ATAMAN_DB.getUsers().then(res => {
            const d = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : null);
            if (d && d.length > 0) {
              currentUsers = d;
              localStorage.setItem('ATAMAN_users_cache', JSON.stringify(d));
              source = 'firestore';
            }
          }).catch(() => {}));
        }

        await Promise.allSettled(tasks);
      }

      // Step 2: Re-read every localStorage cache (catches local-only changes)
      loadDashboardData();

      // Step 3: Broadcast to ALL other open ATAMAN tabs/windows via BroadcastChannel
      if (window.ATAMAN_SYNC) {
        if (currentTrees.length > 0)      window.ATAMAN_SYNC.notifyTrees(currentTrees);
        if (currentAdopters.length > 0)   window.ATAMAN_SYNC.notifyAdopters(currentAdopters);
        if (currentCaretakers.length > 0) window.ATAMAN_SYNC.notifyCaretakers(currentCaretakers);
        if (currentUsers.length > 0)      window.ATAMAN_SYNC.notifyUsers(currentUsers);
      }

      // Step 4: Write audit log entry
      try {
        const existingLogs = JSON.parse(localStorage.getItem('ATAMAN_system_logs') || '[]');
        existingLogs.unshift({
          id: `LOG-SYNC-${Date.now()}`,
          timestamp: now.toISOString(),
          type: 'sync',
          level: 'info',
          message: `${syncLabel} Manual full sync completed. Trees: ${currentTrees.length}, Adopters: ${currentAdopters.length}, Caretakers: ${currentCaretakers.length}, Users: ${currentUsers.length}. Source: ${source === 'firestore' ? '\u2601 Cloud Firestore' : '\uD83D\uDCBE Local Cache'}.`,
          user: localStorage.getItem('ATAMAN_user_name') || 'Admin',
          source
        });
        localStorage.setItem('ATAMAN_system_logs', JSON.stringify(existingLogs.slice(0, 200)));
      } catch (_) {}

      // Step 5: Update last-sync timestamps
      localStorage.setItem('ATAMAN_last_full_sync', now.toISOString());

      // Step 6: Success toast
      const srcLabel = source === 'firestore' ? '\u2601 Cloud Firestore' : '\uD83D\uDCBE Local Cache';
      showDashToast(`\u2705 Sync complete ${syncLabel} \u2014 ${currentTrees.length} trees, ${currentAdopters.length} adopters, ${currentCaretakers.length} caretakers synced from ${srcLabel}.`);

    } catch (err) {
      console.error('[ATAMAN] Sync error:', err);
      showDashToast('\u26A0\uFE0F Sync encountered an error. Local data has been refreshed.');
      loadDashboardData();
    } finally {
      setTimeout(() => {
        syncBtn.classList.remove('syncing');
        syncBtn.disabled = false;
        if (spanEl) spanEl.textContent = 'Sync All Data';
      }, 1800);
    }
  });
}

/* ─── 4. Quick Actions & Navigation ─── */
function initQuickActions() {
  const qaAddTree = document.getElementById('qaAddTree');
  if (qaAddTree) {
    qaAddTree.addEventListener('click', () => {
      window.location.href = 'admin-trees.html';
    });
  }

  const qaAddUser = document.getElementById('qaAddUser');
  if (qaAddUser) {
    qaAddUser.addEventListener('click', () => {
      window.location.href = 'admin-users.html';
    });
  }

  const qaReport = document.getElementById('qaReport');
  if (qaReport) {
    qaReport.addEventListener('click', () => {
      window.location.href = 'admin-reports.html';
    });
  }

  const qaAnnounce = document.getElementById('qaAnnounce');
  if (qaAnnounce) {
    qaAnnounce.addEventListener('click', () => {
      window.location.href = 'admin-notifications.html';
    });
  }
}

/* ─── 5. Sidebar Navigation Submenu Accordion ─── */
function initSidebarToggles() {
  const toggles = document.querySelectorAll('.nav-toggle');
  toggles.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = btn.closest('.has-children');
      if (parent) {
        parent.classList.toggle('open');
      }
    });
  });
}

/* ─── 7. Toast Notification Helper ─── */
let toastTimer = null;
function showDashToast(msg) {
  const toast = document.getElementById('dashToast');
  const toastMsg = document.getElementById('dashToastMsg');
  if (!toast || !toastMsg) return;

  if (toastTimer) clearTimeout(toastTimer);
  toastMsg.textContent = msg;
  toast.classList.add('show');

  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
