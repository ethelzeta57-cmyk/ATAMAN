/**
 * ATAMAN Caretaker Tree Map Logic — Catbalogan, Samar Edition
 * High-performance real-time telemetry, IoT sensors, and live field navigation.
 */

document.addEventListener('DOMContentLoaded', () => {
  initFirebaseAuth();
  initCaretakerTreeMap();
});

function getActiveCaretakerName() {
  const authAPI = window.ATAMAN_AUTH;
  const user = authAPI?.getCurrentUser ? authAPI.getCurrentUser() : null;
  return localStorage.getItem('ATAMAN_user_name') || user?.displayName || 'Caretaker';
}

/* ─── 0. Universal Auth State & User Profile ─── */
function initFirebaseAuth() {
  const ctUserName = document.getElementById('ctUserName');
  const avatarText = document.getElementById('avatarText');
  const ctLogoutBtn = document.getElementById('ctLogoutBtn');
  const navLogout = document.getElementById('navLogout');
  const authAPI = window.ATAMAN_AUTH;

  const applyCaretakerProfile = (displayName) => {
    const cleanName = displayName || 'Caretaker';
    const initials = cleanName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'CT';
    if (ctUserName) ctUserName.textContent = cleanName;
    if (avatarText) avatarText.textContent = initials;
  };

  applyCaretakerProfile(localStorage.getItem('ATAMAN_user_name') || 'Caretaker');

  // Live Real-Time Date & Clock in Header + Date Inputs
  const ctMapLiveDateText = document.getElementById('ctMapLiveDateText');
  function updateMapLiveClock() {
    const now = new Date();
    if (ctMapLiveDateText) {
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
      ctMapLiveDateText.textContent = `${dateStr} • ${timeStr}`;
    }
  }
  updateMapLiveClock();
  setInterval(updateMapLiveClock, 1000);
  const todayIso = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(inp => {
    if (!inp.value || inp.value.startsWith('2026-08')) inp.value = todayIso;
  });

  if (authAPI) {
    authAPI.onAuthStateChanged((user) => {
      if (user) {
        applyCaretakerProfile(user.displayName || localStorage.getItem('ATAMAN_user_name') || 'Caretaker');
      }
    });
  }

  [ctLogoutBtn, navLogout].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        showCtToast('Signing out of Caretaker portal...');
        if (authAPI) {
          await authAPI.signOut();
        } else {
          localStorage.clear();
        }
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 600);
      });
    }
  });

  const navMaint = document.getElementById('navMaintenance');
  if (navMaint) {
    navMaint.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.openAddMaintModalFor === 'function') {
        window.openAddMaintModalFor();
      } else {
        showCtToast('Opening maintenance scheduler...');
      }
    });
  }

  const navRep = document.getElementById('navReports');
  if (navRep) navRep.addEventListener('click', (e) => { e.preventDefault(); showCtToast('Accessing field inspection reports...'); });
  const navNotif = document.getElementById('navNotifications');
  if (navNotif) navNotif.addEventListener('click', (e) => { e.preventDefault(); showCtToast('No urgent alerts in Samar sector.'); });
  const navSet = document.getElementById('navSettings');
  if (navSet) navSet.addEventListener('click', (e) => { e.preventDefault(); showCtToast('Opening Caretaker profile settings...'); });
}

/* ─── 1. Tree Dataset Generator (Dynamic Sync with Firestore & Local Cache) ─── */
function mapRawTreeToCaretakerTreeMap(t, index) {
  const species = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Narra';
  const location = t.barangay ? `Brgy. ${t.barangay}` : (t.location || 'Catbalogan City');
  const health = t.status === 'needs-care' ? 'needs' : (t.status || t.health || 'healthy');
  const healthLabel = health === 'healthy' ? 'Healthy' : (health === 'critical' ? 'Critical' : (health === 'dead' ? 'Dead' : 'Needs Care'));

  let lat = t.lat ? parseFloat(t.lat) : null;
  let lng = t.lng ? parseFloat(t.lng) : null;
  if (!lat || isNaN(lat)) {
    lat = 11.7753 + (Math.sin((index + 1) * 1.3) * 0.012);
  }
  if (!lng || isNaN(lng)) {
    lng = 124.8850 + (Math.cos((index + 1) * 1.5) * 0.012);
  }

  const activeCaretaker = getActiveCaretakerName();

  return {
    id: t.id || `TR-${10001 + index}`,
    species: species,
    treeCount: Math.max(1, parseInt(t.treeCount || t.count) || 1),
    location: location,
    health: health,
    healthLabel: healthLabel,
    lastCheck: t.lastCheck || t.lastMon || t.datePlanted || 'Recent',
    nextMonitoring: t.nextMonitor || t.nextMonitoring || 'Due Today',
    plantDate: t.plantingDate || t.datePlanted || 'Recent',
    age: t.ageOfTree || t.age || '6 Months',
    height: t.height ? (typeof t.height === 'number' ? `${t.height} meters` : t.height) : '2.4 meters',
    diameter: t.trunkDiam ? `${t.trunkDiam} cm` : (t.diameter || '3.2 cm'),
    issue: t.issue || (health === 'critical' ? 'Urgent foliage stress' : (health === 'needs' ? 'Needs supplementary watering' : '')),
    moisture: t.moisture || (health === 'healthy' ? 65 : (health === 'needs' ? 44 : 28)),
    temp: t.temp || 28.5,
    lat: lat,
    lng: lng,
    caretaker: t.caretaker || activeCaretaker,
    img: t.img && !t.img.includes('ATAMAN_bg') ? t.img : 'assets/tree.jpg',
    history: t.history && Array.isArray(t.history) && t.history.length > 0 ? t.history : [
      { date: t.lastCheck || t.lastMon || 'Recent', health: healthLabel, class: health }
    ]
  };
}

function generateAssignedTrees() {
  try {
    const raw = localStorage.getItem('ATAMAN_trees_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const assignedOnly = parsed.filter(t => {
          if (!t) return false;
          const hasAdopter = Boolean((t.adopter && t.adopter !== 'None' && t.adopter !== 'Not yet adopted' && t.adopter !== 'Available for Adoption') || (t.sponsorName && t.sponsorName !== 'None' && t.sponsorName !== 'Available for Adoption') || (parseInt(t.takenCount) || 0) > 0);
          const hasCaretaker = Boolean(t.caretaker && t.caretaker !== 'Unassigned' && t.caretaker !== 'None');
          return hasAdopter || hasCaretaker;
        });
        return assignedOnly.map((t, idx) => mapRawTreeToCaretakerTreeMap(t, idx));
      }
    }
  } catch (e) {
    console.warn('Error reading ATAMAN_trees_cache in caretaker-tree-map:', e);
  }

  return [];
}

/* ─── Shared SVG Teardrop Tree Pin Icon Factory ─── */
function createTreePinIcon(status) {
  const colors = {
    healthy:  { bg: '#22c55e', border: '#15803d', shadow: 'rgba(34,197,94,0.45)' },
    needs:    { bg: '#f59e0b', border: '#b45309', shadow: 'rgba(245,158,11,0.45)' },
    critical: { bg: '#ef4444', border: '#b91c1c', shadow: 'rgba(239,68,68,0.45)' },
    dead:     { bg: '#64748b', border: '#334155', shadow: 'rgba(100,116,139,0.45)' }
  };
  const c = colors[status] || colors.healthy;

  // SVG teardrop pin with white tree-leaf icon inside
  const svgPin = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
      <defs>
        <filter id="pin-shadow-${status}" x="-40%" y="-20%" width="180%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="${c.shadow}"/>
        </filter>
      </defs>
      <!-- Teardrop body -->
      <path d="M18 2C10.268 2 4 8.268 4 16c0 10 14 28 14 28S32 26 32 16C32 8.268 25.732 2 18 2z"
            fill="${c.bg}" stroke="${c.border}" stroke-width="1.5"
            filter="url(#pin-shadow-${status})"/>
      <!-- White inner circle highlight -->
      <circle cx="18" cy="16" r="9" fill="white" opacity="0.18"/>
      <!-- Tree / Leaf icon (white) -->
      <g transform="translate(11, 8)" fill="white">
        <!-- trunk -->
        <rect x="6" y="13" width="2" height="4" rx="0.5"/>
        <!-- left branch -->
        <path d="M7 12C7 9 4 9 3 9C3 12 6 12 7 12Z"/>
        <!-- right branch -->
        <path d="M7 10C7 7 10 7 11 7C11 10 8 10 7 10Z"/>
        <!-- top canopy -->
        <path d="M7 14C7 11 10 11 11 11C11 14 8 14 7 14Z" transform="translate(0,-4)"/>
      </g>
    </svg>
  `;

  return L.divIcon({
    className: '',
    html: svgPin,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46]
  });
}

/* ─── 2. Main Map Controller ─── */
function initCaretakerTreeMap() {
  const mapElement = document.getElementById('caretakerMapMain');
  if (!mapElement) return;

  let treesData = generateAssignedTrees();
  let filteredTrees = [...treesData];
  let selectedTree = treesData[0] || null;

  function updateMapStats(trees = treesData) {
    const getCnt = (t) => Math.max(1, parseInt(t.treeCount || t.count) || 1);
    const total = trees.reduce((sum, t) => sum + getCnt(t), 0);
    const healthy = trees.filter(t => t.health === 'healthy').reduce((sum, t) => sum + getCnt(t), 0);
    const needs = trees.filter(t => t.health === 'needs' || t.health === 'needs-care').reduce((sum, t) => sum + getCnt(t), 0);
    const critical = trees.filter(t => t.health === 'critical').reduce((sum, t) => sum + getCnt(t), 0);
    const dead = trees.filter(t => t.health === 'dead').reduce((sum, t) => sum + getCnt(t), 0);

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('cntAll', total);
    setEl('cntHealthy', healthy);
    setEl('cntNeeds', needs);
    setEl('cntCritical', critical);
    setEl('cntDead', dead);

    const pct = (c) => total > 0 ? ((c / total) * 100).toFixed(1) + '%' : '0%';
    setEl('pctHealthy', pct(healthy));
    setEl('pctNeeds', pct(needs));
    setEl('pctCritical', pct(critical));
    setEl('pctDead', pct(dead));

    setEl('legHealthy', healthy);
    setEl('legNeeds', needs);
    setEl('legCritical', critical);
    setEl('legDead', dead);
  }

  // Pedro's Field Base Location in Catbalogan City, Samar
  const caretakerPos = { lat: 11.7758, lng: 124.8842 };

  // Initialize Leaflet Map centered on Catbalogan Samar
  const map = L.map('caretakerMapMain', {
    zoomControl: false
  }).setView([11.7753, 124.8850], 15);

  // Esri World Imagery — Satellite aerial tiles (matches screenshot)
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA | ATAMAN Samar',
    maxZoom: 18
  }).addTo(map);

  // Add zoom control at bottom-right
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Markers Layer Group
  const markerGroup = L.layerGroup().addTo(map);
  let activeNavPolyline = null;

  // Add Caretaker Location Marker
  const ctIcon = L.divIcon({
    className: 'custom-caretaker-location-pin',
    html: '👤',
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });

  const currentCtName = getActiveCaretakerName();
  const caretakerMarker = L.marker([caretakerPos.lat, caretakerPos.lng], { icon: ctIcon }).addTo(map);
  caretakerMarker.bindPopup(`
    <div style="font-family: var(--font-family); padding: 6px 8px;">
      <strong style="color: #2563eb; font-size: 13.5px;">📍 You are here</strong><br>
      <span style="font-size: 12px; color: #334155; font-weight: 600;">${currentCtName} — Catbalogan Station</span><br>
      <span style="font-size: 11px; color: #64748b;">Samar Forest Protection Sector</span>
    </div>
  `);

  // Initial statistics and UI render
  updateMapStats(treesData);
  renderAttentionPanel(treesData);
  renderMarkers();
  if (selectedTree) updateSelectedTreePanel(selectedTree);

  // Fit bounds if trees exist
  if (treesData.length > 0) {
    const latLngs = treesData.map(t => [t.lat, t.lng]);
    try { map.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50], maxZoom: 16 }); } catch(_) {}
  }

  // Start Real-Time Telemetry & Alert Stream
  startRealtimeSimulation();

  /* ─── Marker Rendering ─── */
  function renderMarkers() {
    markerGroup.clearLayers();

    filteredTrees.forEach(tree => {
      const treeIcon = createTreePinIcon(tree.health);


      const marker = L.marker([tree.lat, tree.lng], { icon: treeIcon });

      const statusClass = tree.health === 'healthy' ? 'chip-healthy' :
                         tree.health === 'needs' ? 'chip-needs' :
                         tree.health === 'critical' ? 'chip-critical' : 'chip-dead';

      const popupContent = `
        <div class="tree-popup-card">
          <div class="popup-title-row">
            <span class="popup-tree-id">${tree.id} — ${tree.species}</span>
            <span class="popup-status-badge ${statusClass}">${tree.healthLabel}</span>
          </div>

          <div class="popup-details-list">
            <span>📍 <strong>${tree.location}</strong></span>
            <span>📅 Last monitored: <strong>${tree.lastCheck}</strong></span>
            <span>🌱 Height: <strong>${tree.height}</strong></span>
            <span>💧 Live Moisture: <strong>${tree.moisture || 64}%</strong></span>
            ${tree.issue && tree.health !== 'healthy' ? `<div class="popup-issue-warning">⚠️ ${tree.issue}</div>` : ''}
            <span>👤 Caretaker: <strong>${tree.caretaker}</strong></span>
          </div>

          <div class="popup-actions-grid">
            <button class="popup-btn popup-btn-outline" onclick="selectAndFocusTree('${tree.id}')">👁 View Tree Profile</button>
            <button class="popup-btn popup-btn-green" onclick="openRecordMonModalFor('${tree.id}')">📷 Record Monitoring</button>
            <button class="popup-btn popup-btn-outline" onclick="openAddMaintModalFor('${tree.id}')">🔧 Add Maintenance</button>
            <button class="popup-btn popup-btn-blue" onclick="startNavigationTo('${tree.id}')">🧭 Navigate to Tree</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 290 });

      marker.on('click', () => {
        selectedTree = tree;
        updateSelectedTreePanel(tree);
      });

      markerGroup.addLayer(marker);
    });

    // Update count badge
    const visibleCountEl = document.getElementById('visibleTreeCount');
    if (visibleCountEl) visibleCountEl.textContent = filteredTrees.length;
  }

  /* ─── Update Right-Side "Selected Tree" Panel ─── */
  function updateSelectedTreePanel(tree) {
    if (!tree) return;

    const pTreeTitle = document.getElementById('pTreeTitle');
    const pTreeStatus = document.getElementById('pTreeStatus');
    const pTreeLocation = document.getElementById('pTreeLocation');
    const pTreePlantDate = document.getElementById('pTreePlantDate');
    const pTreeNextMon = document.getElementById('pTreeNextMon');
    const pTreeLastMon = document.getElementById('pTreeLastMon');
    const pTreeHeight = document.getElementById('pTreeHeight');
    const pTreeDiameter = document.getElementById('pTreeDiameter');
    const pTreeAge = document.getElementById('pTreeAge');
    const pTreeCaretaker = document.getElementById('pTreeCaretaker');
    const pTreeGps = document.getElementById('pTreeGps');
    const pTreeIssueRow = document.getElementById('pTreeIssueRow');
    const pTreeIssue = document.getElementById('pTreeIssue');
    const pTreeImg = document.getElementById('panelTreeImg');

    const teleMoisture = document.getElementById('teleMoisture');
    const teleTemp = document.getElementById('teleTemp');

    if (pTreeImg) {
      pTreeImg.src = tree.img || 'assets/tree.jpg';
    }

    if (pTreeTitle) pTreeTitle.textContent = `${tree.id} — ${tree.species.toUpperCase()}`;
    
    if (pTreeStatus) {
      let dot = '🟢';
      let badgeClass = 'chip-healthy';
      if (tree.health === 'needs') { dot = '🟡'; badgeClass = 'chip-needs'; }
      if (tree.health === 'critical') { dot = '🔴'; badgeClass = 'chip-critical'; }
      if (tree.health === 'dead') { dot = '⚫'; badgeClass = 'chip-dead'; }
      pTreeStatus.textContent = `${dot} ${tree.healthLabel}`;
      pTreeStatus.className = `panel-health-badge ${badgeClass}`;
    }

    if (pTreeLocation) pTreeLocation.textContent = tree.location;
    if (pTreePlantDate) pTreePlantDate.textContent = tree.plantDate || 'Sep 05, 2026';
    if (pTreeNextMon) {
      pTreeNextMon.textContent = tree.nextMonitoring;
      pTreeNextMon.className = `s-val ${tree.nextMonitoring === 'Due Today' || tree.nextMonitoring === 'Overdue' ? 'due-today' : ''}`;
    }
    if (pTreeLastMon) pTreeLastMon.textContent = tree.lastCheck;
    if (pTreeHeight) pTreeHeight.textContent = tree.height;
    if (pTreeDiameter) pTreeDiameter.textContent = tree.diameter;
    if (pTreeAge) pTreeAge.textContent = tree.age || '3 months';
    if (pTreeCaretaker) pTreeCaretaker.textContent = tree.caretaker;
    if (pTreeGps) pTreeGps.textContent = `${tree.lat.toFixed(4)}, ${tree.lng.toFixed(4)}`;

    if (teleMoisture) teleMoisture.textContent = `${tree.moisture || 64}%`;
    if (teleTemp) teleTemp.textContent = `${tree.temp || 27.6}°C`;

    if (pTreeIssueRow && pTreeIssue) {
      if (tree.issue && tree.health !== 'healthy') {
        pTreeIssueRow.style.display = 'block';
        pTreeIssue.textContent = tree.issue;
      } else {
        pTreeIssueRow.style.display = 'none';
      }
    }

    // Monitoring History Timeline
    const timelineEl = document.getElementById('historyTimeline');
    if (timelineEl) {
      timelineEl.innerHTML = '';
      const historyList = (tree.history && Array.isArray(tree.history) && tree.history.length > 0) ? tree.history : [
        { date: tree.lastCheck || 'Oct 19, 2026', health: tree.healthLabel || 'Healthy', class: tree.health || 'healthy' }
      ];

      historyList.forEach(item => {
        const row = document.createElement('div');
        row.className = 'compact-timeline-item';

        let tagClass = 'chip-healthy';
        let hDot = '🟢';
        if (item.class === 'needs') { tagClass = 'chip-needs'; hDot = '🟡'; }
        if (item.class === 'critical') { tagClass = 'chip-critical'; hDot = '🔴'; }
        if (item.class === 'dead') { tagClass = 'chip-dead'; hDot = '⚫'; }

        row.innerHTML = `
          <div class="tl-left">
            <span class="tl-dot ${item.class || 'healthy'}"></span>
            <span class="tl-date">${item.date}</span>
          </div>
          <span class="tl-tag ${tagClass}">${hDot} ${item.health}</span>
        `;
        timelineEl.appendChild(row);
      });
    }
  }

  /* ─── Render "Trees Needing Attention" Panel ─── */
  function renderAttentionPanel(trees = treesData) {
    const grid = document.getElementById('attentionListGrid');
    if (!grid) return;

    const attentionTrees = trees.filter(t => t.health === 'critical' || t.health === 'needs' || t.nextMonitoring === 'Overdue' || t.nextMonitoring === 'Due Today');
    const criticalCount = trees.filter(t => t.health === 'critical').length;
    const needsCount = trees.filter(t => t.health === 'needs' || t.health === 'needs-care').length;
    const dueCount = trees.filter(t => t.nextMonitoring === 'Overdue' || t.nextMonitoring === 'Due Today').length;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('attTotalCount', attentionTrees.length);
    const pillCrit = document.getElementById('attPillCritical');
    if (pillCrit) pillCrit.textContent = `🔴 ${criticalCount} Critical`;
    const pillNeeds = document.getElementById('attPillNeeds');
    if (pillNeeds) pillNeeds.textContent = `🟡 ${needsCount} Needs Care`;
    const pillDue = document.getElementById('attPillDue');
    if (pillDue) pillDue.textContent = `⏰ ${dueCount} Monitoring Overdue/Due`;

    grid.innerHTML = '';
    if (attentionTrees.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-muted); font-size: 13.5px;">✅ All assigned trees in Catbalogan are healthy with no urgent attention required.</div>';
      return;
    }

    attentionTrees.forEach(tree => {
      const card = document.createElement('div');
      card.className = `att-tree-card ${selectedTree && tree.id === selectedTree.id ? 'active' : ''}`;
      card.id = `attCard-${tree.id}`;

      const icon = tree.health === 'critical' ? '🔴' : (tree.health === 'needs' ? '🟡' : '⏰');

      card.innerHTML = `
        <div class="att-card-top">
          <span class="att-id">${icon} ${tree.id}</span>
          <span class="att-species">${tree.species}</span>
        </div>
        <div class="att-card-details">
          <span>📍 ${tree.location}</span>
          <strong style="color: ${tree.nextMonitoring === 'Overdue' ? '#dc2626' : '#d97706'};">${tree.nextMonitoring}</strong>
        </div>
        ${tree.issue ? `<span class="att-issue-tag" title="${tree.issue}">⚠️ ${tree.issue}</span>` : ''}
      `;

      card.addEventListener('click', () => {
        selectAndFocusTree(tree.id);
      });

      grid.appendChild(card);
    });
  }

  /* ─── Global Helper to Select & Zoom to Tree ─── */
  window.selectAndFocusTree = function(treeId) {
    const tree = treesData.find(t => t.id === treeId);
    if (!tree) return;

    selectedTree = tree;
    updateSelectedTreePanel(tree);

    // Center map on Catbalogan coordinates
    map.flyTo([tree.lat, tree.lng], 17, { duration: 1.2 });

    // Open popup
    markerGroup.eachLayer(layer => {
      if (layer.getLatLng && Math.abs(layer.getLatLng().lat - tree.lat) < 0.0001 && Math.abs(layer.getLatLng().lng - tree.lng) < 0.0001) {
        layer.openPopup();
      }
    });

    document.querySelectorAll('.att-tree-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`attCard-${tree.id}`);
    if (activeCard) activeCard.classList.add('active');

    showCtToast(`Selected ${tree.id} (${tree.species}) in ${tree.location}`);
  };

  /* ─── 7. Navigation Feature (Route Polyline & Distance HUD) ─── */
  window.startNavigationTo = function(treeId) {
    const tree = treesData.find(t => t.id === treeId) || selectedTree;
    if (!tree) return;

    if (activeNavPolyline) {
      map.removeLayer(activeNavPolyline);
    }

    // Generate walking path coordinates in Catbalogan
    const waypoints = [
      [caretakerPos.lat, caretakerPos.lng],
      [caretakerPos.lat + (tree.lat - caretakerPos.lat) * 0.35, caretakerPos.lng + (tree.lng - caretakerPos.lng) * 0.15],
      [caretakerPos.lat + (tree.lat - caretakerPos.lat) * 0.68, caretakerPos.lng + (tree.lng - caretakerPos.lng) * 0.82],
      [tree.lat, tree.lng]
    ];

    activeNavPolyline = L.polyline(waypoints, {
      color: '#0284c7',
      weight: 5,
      opacity: 0.85,
      dashArray: '8, 8',
      lineCap: 'round'
    }).addTo(map);

    const distMeters = Math.round(map.distance([caretakerPos.lat, caretakerPos.lng], [tree.lat, tree.lng]));
    const estMinutes = Math.max(1, Math.round(distMeters / 80));

    const hud = document.getElementById('navHud');
    const hudDist = document.getElementById('hudDistance');
    const hudEst = document.getElementById('hudEstTime');

    if (hud && hudDist && hudEst) {
      hudDist.textContent = `📍 ${distMeters} meters away`;
      hudEst.textContent = `~ ${estMinutes} min walk to ${tree.id} (${tree.location})`;
      hud.classList.remove('hide');
    }

    map.fitBounds(activeNavPolyline.getBounds(), { padding: [60, 60] });
    showCtToast(`🧭 Navigation active: ${distMeters}m to ${tree.id} in Catbalogan!`);
  };

  // Close Navigation HUD
  const closeNavHud = document.getElementById('closeNavHud');
  if (closeNavHud) {
    closeNavHud.addEventListener('click', () => {
      if (activeNavPolyline) map.removeLayer(activeNavPolyline);
      const hud = document.getElementById('navHud');
      if (hud) hud.classList.add('hide');
      showCtToast('Navigation cancelled');
    });
  }

  // Right Panel Navigate Button
  const btnNavToTree = document.getElementById('btnNavToTree');
  if (btnNavToTree) {
    btnNavToTree.addEventListener('click', () => {
      startNavigationTo(selectedTree.id);
    });
  }

  // Center Map Button
  const btnFocusMap = document.getElementById('btnFocusMap');
  if (btnFocusMap) {
    btnFocusMap.addEventListener('click', () => {
      map.flyTo([selectedTree.lat, selectedTree.lng], 17);
    });
  }

  // My Location Buttons
  const btnTopMyLocation = document.getElementById('btnTopMyLocation');
  const btnBannerMyLocation = document.getElementById('btnBannerMyLocation');

  function centerOnMyLocation() {
    map.flyTo([caretakerPos.lat, caretakerPos.lng], 16, { duration: 1 });
    caretakerMarker.openPopup();
    showCtToast('📍 Centered on your current location: Catbalogan Field Base');
  }

  if (btnTopMyLocation) btnTopMyLocation.addEventListener('click', centerOnMyLocation);
  if (btnBannerMyLocation) btnBannerMyLocation.addEventListener('click', centerOnMyLocation);

  /* ─── 3. Filters & Search Engine ─── */
  const searchInput = document.getElementById('mapSearchInput');
  const healthSelect = document.getElementById('filterHealthSelect');
  const speciesSelect = document.getElementById('filterSpeciesSelect');
  const locationSelect = document.getElementById('filterLocationSelect');
  const monSelect = document.getElementById('filterMonitoringSelect');
  const chkOverdue = document.getElementById('chkOnlyOverdue');

  function applyFilters() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const health = healthSelect ? healthSelect.value : 'all';
    const species = speciesSelect ? speciesSelect.value : 'all';
    const loc = locationSelect ? locationSelect.value : 'all';
    const mon = monSelect ? monSelect.value : 'all';
    const onlyOverdue = chkOverdue ? chkOverdue.checked : false;

    filteredTrees = treesData.filter(tree => {
      const matchesQuery = !query || 
        tree.id.toLowerCase().includes(query) ||
        tree.species.toLowerCase().includes(query) ||
        tree.location.toLowerCase().includes(query) ||
        (tree.issue && tree.issue.toLowerCase().includes(query));

      const matchesHealth = health === 'all' || tree.health === health;
      const matchesSpecies = species === 'all' || tree.species === species;
      const matchesLoc = loc === 'all' || tree.location === loc;
      const matchesMon = mon === 'all' || tree.nextMonitoring.toLowerCase().includes(mon.toLowerCase());
      const matchesOverdue = !onlyOverdue || tree.nextMonitoring === 'Overdue';

      return matchesQuery && matchesHealth && matchesSpecies && matchesLoc && matchesMon && matchesOverdue;
    });

    renderMarkers();
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (healthSelect) healthSelect.addEventListener('change', applyFilters);
  if (speciesSelect) speciesSelect.addEventListener('change', applyFilters);
  if (locationSelect) locationSelect.addEventListener('change', applyFilters);
  if (monSelect) monSelect.addEventListener('change', applyFilters);
  if (chkOverdue) chkOverdue.addEventListener('change', applyFilters);

  // Summary Cards click filters
  const summaryCards = document.querySelectorAll('.summary-card');
  summaryCards.forEach(card => {
    card.addEventListener('click', () => {
      summaryCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const filterVal = card.getAttribute('data-filter');
      if (healthSelect) healthSelect.value = filterVal;
      applyFilters();
    });
  });

  // Legend Pills toggle filters
  const legendPills = document.querySelectorAll('.legend-pill');
  legendPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const status = pill.getAttribute('data-status');
      if (healthSelect) {
        healthSelect.value = healthSelect.value === status ? 'all' : status;
      }
      applyFilters();
    });
  });

  /* ─── 8. Real-Time Telemetry & Alert Feed Loop ─── */
  function startRealtimeSimulation() {
    const tickerEl = document.getElementById('liveTickerMsg');
    if (treesData.length === 0) {
      if (tickerEl) {
        tickerEl.innerHTML = 'No active sensor telemetry — 0 trees assigned';
      }
      return;
    }

    const currentCtName = getActiveCaretakerName();
    const liveMessages = [
      `GPS location refreshed • ${treesData.length} assigned trees connected live in Catbalogan City, Samar`,
      `Caretaker ${currentCtName} synced field inspection log • Battery 98%`
    ];

    let msgIndex = 0;

    setInterval(() => {
      if (treesData.length === 0) return;
      msgIndex = (msgIndex + 1) % liveMessages.length;
      if (tickerEl) {
        const timeStr = new Date().toLocaleTimeString();
        tickerEl.innerHTML = `<strong>[${timeStr}]</strong> ${liveMessages[msgIndex]}`;
      }

      // Small realistic live fluctuation on active selected tree
      if (selectedTree) {
        selectedTree.moisture = Math.max(30, Math.min(85, (selectedTree.moisture || 60) + (Math.random() > 0.5 ? 1 : -1)));
        selectedTree.temp = parseFloat((27 + Math.random() * 2).toFixed(1));

        const teleMoisture = document.getElementById('teleMoisture');
        const teleTemp = document.getElementById('teleTemp');
        if (teleMoisture) teleMoisture.textContent = `${selectedTree.moisture}%`;
        if (teleTemp) teleTemp.textContent = `${selectedTree.temp}°C`;
      }
    }, 4000);
  }

  /* ─── 9. Modals (Record Monitoring & Add Maintenance) ─── */
  const recordModal = document.getElementById('recordMonModal');
  const monTitle = document.getElementById('monModalTitle');
  const recordForm = document.getElementById('recordMonForm');
  const closeRecordBtn = document.getElementById('closeRecordMonBtn');
  const cancelRecordBtn = document.getElementById('cancelRecordMonBtn');

  const maintModal = document.getElementById('addMaintModal');
  const maintTitle = document.getElementById('maintModalTitle');
  const maintForm = document.getElementById('addMaintForm');
  const closeMaintBtn = document.getElementById('closeAddMaintBtn');
  const cancelMaintBtn = document.getElementById('cancelAddMaintBtn');

  window.openRecordMonModalFor = function(treeId) {
    const tree = treesData.find(t => t.id === treeId) || selectedTree;
    if (monTitle) monTitle.textContent = `Record Monitoring — ${tree.id} (${tree.species})`;
    if (recordModal) recordModal.classList.remove('hide');
  };

  window.openAddMaintModalFor = function(treeId) {
    const tree = treesData.find(t => t.id === treeId) || selectedTree;
    if (maintTitle) maintTitle.textContent = `Log Maintenance — ${tree.id} (${tree.species})`;
    if (maintModal) maintModal.classList.remove('hide');
  };

  const btnOpenRecordMon = document.getElementById('btnOpenRecordMon');
  if (btnOpenRecordMon) btnOpenRecordMon.addEventListener('click', () => openRecordMonModalFor(selectedTree.id));

  const btnOpenAddMaint = document.getElementById('btnOpenAddMaint');
  if (btnOpenAddMaint) btnOpenAddMaint.addEventListener('click', () => openAddMaintModalFor(selectedTree.id));

  const viewAllHist = document.getElementById('viewAllHistoryBtn');
  if (viewAllHist) viewAllHist.addEventListener('click', (e) => { e.preventDefault(); showCtToast('Displaying full monitoring timeline for ' + selectedTree.id); });
  const viewAllPhotos = document.getElementById('viewAllPhotosBtn');
  if (viewAllPhotos) viewAllPhotos.addEventListener('click', (e) => { e.preventDefault(); showCtToast('Opening full photo gallery for ' + selectedTree.id); });

  const navMonitoring = document.getElementById('navMonitoring');
  if (navMonitoring) {
    navMonitoring.addEventListener('click', (e) => {
      e.preventDefault();
      if (selectedTree) {
        openRecordMonModalFor(selectedTree.id);
        showCtToast(`📷 Record Monitoring opened for ${selectedTree.id}`);
      } else {
        window.location.href = 'my-trees.html';
      }
    });
  }

  function closeRecordModal() {
    if (recordModal) recordModal.classList.add('hide');
    if (recordForm) recordForm.reset();
  }

  function closeMaintModal() {
    if (maintModal) maintModal.classList.add('hide');
    if (maintForm) maintForm.reset();
  }

  if (closeRecordBtn) closeRecordBtn.addEventListener('click', closeRecordModal);
  if (cancelRecordBtn) cancelRecordBtn.addEventListener('click', closeRecordModal);

  if (closeMaintBtn) closeMaintBtn.addEventListener('click', closeMaintModal);
  if (cancelMaintBtn) cancelMaintBtn.addEventListener('click', closeMaintModal);

  if (recordForm) {
    recordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedTree) return;
      const selectedRadio = document.querySelector('input[name="mHealth"]:checked');
      const newHealthLabel = selectedRadio ? selectedRadio.value : 'Healthy';
      const newHealthKey = newHealthLabel.toLowerCase().replace(' ', '');
      const mappedHealth = newHealthKey === 'needscare' ? 'needs' : newHealthKey;

      selectedTree.healthLabel = newHealthLabel;
      selectedTree.health = mappedHealth;
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 7);
      const nextStr = nextDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      selectedTree.lastCheck = todayStr;
      selectedTree.nextMonitoring = nextStr;

      // Update local cache
      try {
        const raw = localStorage.getItem('ATAMAN_trees_cache');
        if (raw) {
          const cache = JSON.parse(raw);
          const idx = cache.findIndex(t => t.id === selectedTree.id);
          if (idx !== -1) {
            cache[idx].status = mappedHealth === 'needs' ? 'needs-care' : mappedHealth;
            cache[idx].lastMon = todayStr;
            cache[idx].nextMonitor = nextStr;
            localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(cache));
          }
        }
      } catch (_) {}

      // Update Firestore
      if (window.ATAMAN_DB && typeof window.ATAMAN_DB.updateTree === 'function') {
        try {
          await window.ATAMAN_DB.updateTree(selectedTree.id, {
            status: mappedHealth === 'needs' ? 'needs-care' : mappedHealth,
            lastMon: todayStr,
            nextMonitor: nextStr
          });
        } catch (_) {}
      }

      closeRecordModal();
      updateMapStats(treesData);
      renderAttentionPanel(treesData);
      updateSelectedTreePanel(selectedTree);
      renderMarkers();
      showCtToast(`✅ Monitoring recorded for ${selectedTree.id}! Health: ${newHealthLabel}`);
    });
  }

  // Real-time synchronization with Firestore and LocalStorage
  if (window.ATAMAN_DB && typeof window.ATAMAN_DB.onTreesChange === 'function') {
    window.ATAMAN_DB.onTreesChange((rawTrees) => {
      if (Array.isArray(rawTrees) && rawTrees.length > 0) {
        treesData = rawTrees.map((t, idx) => mapRawTreeToCaretakerTreeMap(t, idx));
        if (!selectedTree || !treesData.some(t => t.id === selectedTree.id)) {
          selectedTree = treesData[0] || null;
        }
        updateMapStats(treesData);
        renderAttentionPanel(treesData);
        applyFilters();
        if (selectedTree) updateSelectedTreePanel(selectedTree);
      }
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'ATAMAN_trees_cache') {
      treesData = generateAssignedTrees();
      if (!selectedTree || !treesData.some(t => t.id === selectedTree.id)) {
        selectedTree = treesData[0] || null;
      }
      updateMapStats(treesData);
      renderAttentionPanel(treesData);
      applyFilters();
      if (selectedTree) updateSelectedTreePanel(selectedTree);
    }
  });

  if (maintForm) {
    maintForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = document.getElementById('maintType').value;
      closeMaintModal();
      showCtToast(`🔧 Maintenance (${type}) logged for ${selectedTree.id}!`);
    });
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
