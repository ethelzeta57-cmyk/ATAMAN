/**
 * ATAMAN Admin Tree Map Logic
 * High-performance system-wide GIS map, marker clustering, multi-layer analytics,
 * IoT sensor telemetry, and comprehensive administrative controls.
 */

document.addEventListener('DOMContentLoaded', () => {
  initFirebaseAuth();
  initAdminTreeMap();
});

/* ─── 0. Universal Auth State & Admin Profile ─── */
function initFirebaseAuth() {
  const sbUserName = document.getElementById('sbUserName');
  const sbUserRole = document.getElementById('sbUserRole');
  const sbUserAvatar = document.getElementById('sbAvatar') || document.getElementById('sbUserAvatar');
  const logoutBtn = document.getElementById('logoutBtn');
  const authAPI = window.ATAMAN_AUTH;

  if (authAPI) {
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
      showAdminToast('Signing out of ATAMAN Admin...');
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
}

/* ─── 1. System-Wide Tree Dataset Generation & Coordinate Mapping ─── */
const SAMAR_BARANGAY_COORDS = {
  'Guinsorongan': { lat: 11.759800, lng: 124.886100, name: 'Brgy. Guinsorongan', mun: 'Catbalogan City' },
  'Brgy. Guinsorongan': { lat: 11.759800, lng: 124.886100, name: 'Brgy. Guinsorongan', mun: 'Catbalogan City' },
  'San Isidro': { lat: 11.771000, lng: 124.891000, name: 'Brgy. San Isidro', mun: 'Catbalogan City' },
  'Brgy. San Isidro': { lat: 11.771000, lng: 124.891000, name: 'Brgy. San Isidro', mun: 'Catbalogan City' },
  'Santiago': { lat: 11.782000, lng: 124.882000, name: 'Brgy. Santiago', mun: 'Catbalogan City' },
  'Brgy. Santiago': { lat: 11.782000, lng: 124.882000, name: 'Brgy. Santiago', mun: 'Catbalogan City' },
  'Payao': { lat: 11.762000, lng: 124.873000, name: 'Brgy. Payao', mun: 'Catbalogan City' },
  'Brgy. Payao': { lat: 11.762000, lng: 124.873000, name: 'Brgy. Payao', mun: 'Catbalogan City' },
  'Mabini': { lat: 11.791000, lng: 124.875000, name: 'Brgy. Mabini', mun: 'Catbalogan City' },
  'Brgy. Mabini': { lat: 11.791000, lng: 124.875000, name: 'Brgy. Mabini', mun: 'Catbalogan City' },
  'Canlapwas': { lat: 11.782000, lng: 124.887000, name: 'Brgy. Canlapwas', mun: 'Catbalogan City' },
  'Brgy. Canlapwas': { lat: 11.782000, lng: 124.887000, name: 'Brgy. Canlapwas', mun: 'Catbalogan City' },
  'Bunuanan': { lat: 11.791000, lng: 124.879000, name: 'Brgy. Bunuanan', mun: 'Catbalogan City' },
  'Brgy. Bunuanan': { lat: 11.791000, lng: 124.879000, name: 'Brgy. Bunuanan', mun: 'Catbalogan City' },
  'Mercedes': { lat: 11.769000, lng: 124.894000, name: 'Brgy. Mercedes', mun: 'Catbalogan City' },
  'Brgy. Mercedes': { lat: 11.769000, lng: 124.894000, name: 'Brgy. Mercedes', mun: 'Catbalogan City' },
  'Iguid': { lat: 11.802000, lng: 124.881000, name: 'Brgy. Iguid', mun: 'Catbalogan City' },
  'Brgy. Iguid': { lat: 11.802000, lng: 124.881000, name: 'Brgy. Iguid', mun: 'Catbalogan City' },
  'Maulong': { lat: 11.771000, lng: 124.869000, name: 'Brgy. Maulong', mun: 'Catbalogan City' },
  'Brgy. Maulong': { lat: 11.771000, lng: 124.869000, name: 'Brgy. Maulong', mun: 'Catbalogan City' },
  'Silanga': { lat: 11.815000, lng: 124.864000, name: 'Brgy. Silanga', mun: 'Catbalogan City' },
  'Brgy. Silanga': { lat: 11.815000, lng: 124.864000, name: 'Brgy. Silanga', mun: 'Catbalogan City' },
  'Pangdan': { lat: 11.760000, lng: 124.901000, name: 'Brgy. Pangdan', mun: 'Catbalogan City' },
  'Brgy. Pangdan': { lat: 11.760000, lng: 124.901000, name: 'Brgy. Pangdan', mun: 'Catbalogan City' },
  'Bagongon': { lat: 11.758000, lng: 124.952000, name: 'Brgy. Bagongon', mun: 'Jiabong' },
  'Central Hub': { lat: 11.775300, lng: 124.886000, name: 'Central Hub', mun: 'Catbalogan City' }
};

function getAdopterInfoForTree(tree) {
  if (!tree) return null;
  const adopterName = (tree.adopter || tree.sponsorName || '').trim();
  if (!adopterName && (!tree.takenCount || tree.takenCount === 0)) return null;

  let adopterRecord = null;
  try {
    const raw = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
    if (Array.isArray(raw)) {
      adopterRecord = raw.find(a => 
        (adopterName && a.name && a.name.toLowerCase() === adopterName.toLowerCase()) ||
        (Array.isArray(a.treesList) && a.treesList.some(t => t.id === tree.id))
      );
    }
  } catch (e) {}

  let loc = '';
  loc = adopterRecord?.location || adopterRecord?.area || adopterRecord?.barangay || '';
  const cleanBrgy = loc ? loc.replace(/^Brgy\.\s*/i, '').trim() : '';
  const targetCoords = cleanBrgy ? SAMAR_BARANGAY_COORDS[cleanBrgy] : null;

  return {
    name: adopterRecord?.name || adopterName || 'Active Adopter',
    location: loc ? (loc.startsWith('Brgy.') ? loc : `Brgy. ${loc}`) : '—',
    barangay: cleanBrgy,
    targetCoords: targetCoords
  };
}

let ALL_TREES = [];
let CURRENT_FILTERED_TREES = [];
let SELECTED_TREE = null;

function generateSystemWideTrees() {
  let trees = [];
  try {
    const cached = localStorage.getItem('ATAMAN_trees_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) trees = parsed;
    }
  } catch (e) {}

  if (trees.length === 0 && typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_TREES) && window.ATAMAN_DEFAULT_TREES.length > 0) {
    trees = [...window.ATAMAN_DEFAULT_TREES];
    try { localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(trees)); } catch (_) {}
  }

  return trees;
}

/* ─── 2. Map & Clusters Initialization ─── */
let map = null;
let markerClusterGroup = null;
let layerGroups = {
  trees: null,
  caretakerAreas: null,
  barangays: null,
  municipalities: null,
  plantingSites: null,
  monitoringAreas: null,
  farmAreas: null,
  criticalHotspots: null
};

let baseLayers = {};
let currentBaseLayer = 'satellite';

function initAdminTreeMap() {
  ALL_TREES = generateSystemWideTrees();
  CURRENT_FILTERED_TREES = [...ALL_TREES];

  // 1. Leaflet Map setup centered on Samar / Catbalogan City
  map = L.map('adminTreeMap', {
    center: [11.7753, 124.8850],
    zoom: 13,
    zoomControl: true
  });

  // Base Tile Layers
  baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
  });

  baseLayers.streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  });

  baseLayers.satellite.addTo(map);

  // 2. Initialize MarkerClusterGroup with custom high-contrast count badges
  markerClusterGroup = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 45,
    iconCreateFunction: function (cluster) {
      const markers = cluster.getAllChildMarkers();
      const count = markers.length;
      let hasCritical = false;
      let hasNeedsCare = false;

      markers.forEach(m => {
        if (m.options.status === 'critical') hasCritical = true;
        if (m.options.status === 'needs-care') hasNeedsCare = true;
      });

      let borderColor = '#86efac';
      let bgColor = 'rgba(22, 101, 52, 0.92)';
      if (hasCritical) {
        borderColor = '#ef4444';
        bgColor = 'rgba(153, 27, 27, 0.94)';
      } else if (hasNeedsCare) {
        borderColor = '#f59e0b';
        bgColor = 'rgba(180, 83, 9, 0.92)';
      }

      return L.divIcon({
        html: `
          <div class="custom-cluster-badge" style="background:${bgColor}; border-color:${borderColor}; width:52px; height:52px;">
            <span class="cluster-count">${count}</span>
            <span class="cluster-sub">Trees</span>
          </div>
        `,
        className: 'custom-cluster-icon',
        iconSize: [52, 52]
      });
    }
  });

  map.addLayer(markerClusterGroup);

  // 3. Initialize Admin Map Overlays
  initAdminMapOverlays();

  // 4. Render Markers and Sidebar tables
  renderTreeMarkers(CURRENT_FILTERED_TREES);
  renderAttentionPanel();
  renderGeographicSummary();
  initFilterEvents();
  initDrawerEvents();
  initAdminModalEvents();
  initBannerToolEvents();

  // 5. Real-Time Multi-Tab & Cloud Listeners
  window.addEventListener('ATAMAN:trees-updated', (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      ALL_TREES = e.detail;
      CURRENT_FILTERED_TREES = [...ALL_TREES];
      renderTreeMarkers(CURRENT_FILTERED_TREES);
      renderAttentionPanel();
      renderGeographicSummary();
    }
  });

  if (window.ATAMAN_DB && typeof window.ATAMAN_DB.onTreesChange === 'function') {
    window.ATAMAN_DB.onTreesChange((trees) => {
      if (Array.isArray(trees)) {
        ALL_TREES = trees;
        CURRENT_FILTERED_TREES = [...ALL_TREES];
        renderTreeMarkers(CURRENT_FILTERED_TREES);
        renderAttentionPanel();
        renderGeographicSummary();
      }
    });
  }
}

/* ─── 3. Admin Overlays (Caretaker Zones, Boundaries, Hotspots) ─── */
function initAdminMapOverlays() {
  // Caretaker Areas (populated dynamically as caretakers/sectors are assigned)
  layerGroups.caretakerAreas = L.layerGroup();
  layerGroups.caretakerAreas.addTo(map);

  // Barangay Boundaries (populated dynamically from registered trees)
  layerGroups.barangays = L.layerGroup();
  layerGroups.barangays.addTo(map);

  // Planting Sites & Nurseries
  layerGroups.plantingSites = L.layerGroup();
  layerGroups.plantingSites.addTo(map);

  // Critical Hotspots (populated dynamically when critical trees exist)
  layerGroups.criticalHotspots = L.layerGroup();
  layerGroups.criticalHotspots.addTo(map);
}

let TREE_MARKERS_MAP = new Map();
let RELOCATING_TREE_ID = null;

/* ─── 4. Render Markers on Leaflet ─── */
function isTreeAssignedOrMapped(tree) {
  if (!tree) return false;
  const hasAdopter = Boolean((tree.adopter && tree.adopter !== 'None' && tree.adopter !== 'Not yet adopted' && tree.adopter !== 'Available for Adoption') || (tree.sponsorName && tree.sponsorName !== 'None' && tree.sponsorName !== 'Available for Adoption') || (parseInt(tree.takenCount) || 0) > 0);
  const hasCaretaker = Boolean(tree.caretaker && tree.caretaker !== 'Unassigned' && (hasAdopter || tree.customCaretaker));
  const hasExplicitLocation = Boolean(tree.barangay || (tree.customGps && tree.lat != null && tree.lng != null));
  return hasAdopter || hasCaretaker || hasExplicitLocation;
}

function renderTreeMarkers(trees) {
  markerClusterGroup.clearLayers();
  TREE_MARKERS_MAP.clear();
  const mappedTrees = (Array.isArray(trees) ? trees : []).filter(isTreeAssignedOrMapped);
  const countBadge = document.getElementById('mapVisibleTreesBadge');
  if (countBadge) {
    countBadge.textContent = `Showing ${mappedTrees.length} Tree${mappedTrees.length === 1 ? '' : 's'}`;
  }

  mappedTrees.forEach(tree => {
    const hasRealGps = tree.lat != null && tree.lat !== '' && !isNaN(Number(tree.lat)) && tree.lng != null && tree.lng !== '' && !isNaN(Number(tree.lng));
    const lat = hasRealGps ? Number(tree.lat) : 11.7753;
    const lng = hasRealGps ? Number(tree.lng) : 124.8850;
    const status = tree.status || 'healthy';
    const speciesName = (typeof tree.species === 'object' && tree.species) ? (tree.species.common || 'Tree') : (tree.species || 'Tree');
    const isRelocating = RELOCATING_TREE_ID === tree.id;

    const pin = L.divIcon({
      className: `custom-tree-pin ${status} ${isRelocating ? 'is-relocating' : ''}`,
      html: status === 'critical' ? '🔴' : status === 'needs-care' ? '🟡' : status === 'dead' ? '⚫' : '🟢',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    // Make marker draggable so user can relocate pin directly to exact spot
    const marker = L.marker([lat, lng], {
      icon: pin,
      status: status,
      treeId: tree.id,
      draggable: true,
      autoPan: true
    });

    TREE_MARKERS_MAP.set(tree.id, marker);

    // Live dragging events for exact placement
    marker.on('dragstart', () => {
      marker.closePopup();
      marker.bindTooltip(`📍 Dragging ${tree.id} to exact location...`, { permanent: true, direction: 'top', className: 'exact-coord-badge' }).openTooltip();
    });

    marker.on('drag', (e) => {
      const pos = e.target.getLatLng();
      marker.setTooltipContent(`📍 ${tree.id}: [${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}]`);
    });

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      marker.unbindTooltip();
      saveTreeExactLocation(tree.id, pos.lat, pos.lng);
    });

    const gpsDisplay = hasRealGps ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'Not set';
    const locDisplay = tree.barangay ? `Brgy. ${tree.barangay}` : (tree.municipality || tree.location || 'Not set');
    const ctDisplay = (tree.caretaker && tree.caretaker !== 'Unassigned') ? tree.caretaker : 'Unassigned';
    const adpDisplay = (tree.sponsorName || tree.adopter) ? (tree.sponsorName || tree.adopter) : 'Not yet adopted';
    const projDisplay = tree.project || '—';

    // Interactive popup with exact GPS coordinates and quick Relocate button
    const popupHtml = `
      <div class="popup-tree-header">
        <span class="popup-tree-title">${tree.id} — ${speciesName}</span>
        <span class="popup-status-badge ${status}">${status.toUpperCase()}</span>
      </div>
      <div class="popup-meta-row" style="background:#f0fdf4; border:1px solid #bbf7d0; padding:4px 8px; border-radius:6px; margin:4px 0 8px;">
        <span class="popup-meta-label" style="color:#15803d; font-weight:700;">📍 Exact GPS:</span>
        <span class="popup-meta-val" style="font-family:monospace; font-weight:800; color:#0f172a;">${gpsDisplay}</span>
      </div>
      <div class="popup-meta-row">
        <span class="popup-meta-label">Location:</span>
        <span class="popup-meta-val">${locDisplay}</span>
      </div>
      <div class="popup-meta-row">
        <span class="popup-meta-label">Caretaker:</span>
        <span class="popup-meta-val">${ctDisplay}</span>
      </div>
      <div class="popup-meta-row">
        <span class="popup-meta-label">Adopter / Sponsor:</span>
        <span class="popup-meta-val">${adpDisplay}</span>
      </div>
      <div class="popup-meta-row">
        <span class="popup-meta-label">Project:</span>
        <span class="popup-meta-val">${projDisplay}</span>
      </div>
      <div class="popup-meta-row">
        <span class="popup-meta-label">Planting Date:</span>
        <span class="popup-meta-val">${tree.savedAt || tree.dateAdded || tree.plantingDate || '—'}</span>
      </div>
      <div class="popup-meta-row">
        <span class="popup-meta-label">Last Monitoring:</span>
        <span class="popup-meta-val">${tree.lastMonitoring || tree.lastCheck || 'Not yet recorded'}</span>
      </div>
      ${tree.issue && tree.status !== 'healthy' ? `
        <div class="popup-meta-row" style="color:#ef4444; font-weight:700; margin-top:4px;">
          <span>Issue:</span>
          <span>${tree.issue}</span>
        </div>
      ` : ''}
      <div class="popup-actions-row" style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
        <button class="btn-popup-action primary" style="background:#16a34a; color:#fff; font-weight:800; padding:7px 10px; border-radius:6px; display:flex; align-items:center; justify-content:center; gap:6px; width:100%; border:none; cursor:pointer;" onclick="startPinRelocationMode('${tree.id}')">
          📍 Relocate Pin to Exact Location
        </button>
        <div style="display:flex; gap:6px; width:100%;">
          <button class="btn-popup-action" style="flex:1;" onclick="openTreeDetails('${tree.id}')">View Tree Profile</button>
          <button class="btn-popup-action" style="flex:1;" onclick="openCorrectGpsModal('${tree.id}')">Edit GPS</button>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, { maxWidth: 300 });
    marker.on('click', () => {
      openTreeDetails(tree.id);
    });

    markerClusterGroup.addLayer(marker);
  });

  const visibleBadge = document.getElementById('mapVisibleTreesBadge');
  if (visibleBadge) {
    visibleBadge.textContent = `Showing ${mappedTrees.length.toLocaleString()} Tree${mappedTrees.length === 1 ? '' : 's'}`;
  }
}

/* ─── 5. Slide-Out Details Panel (Section 6) ─── */
function openTreeDetails(treeId) {
  const tree = ALL_TREES.find(t => t.id === treeId);
  if (!tree) return;
  SELECTED_TREE = tree;

  const drawer = document.getElementById('treeDetailsDrawer');
  const body = document.getElementById('drawerBodyContent');
  if (!drawer || !body) return;

  // Normalise species — stored as object {common, scientific, type} or legacy string
  const speciesCommon     = (typeof tree.species === 'object' ? tree.species?.common     : tree.species)     || '—';
  const speciesScientific = (typeof tree.species === 'object' ? tree.species?.scientific : tree.botanical)   || '—';
  const speciesType       = (typeof tree.species === 'object' ? tree.species?.type       : tree.treeType || tree.type) || '—';

  const statusIcons = {
    healthy: '🟢 Healthy',
    'needs-care': '🟡 Needs Care',
    critical: '🔴 Critical',
    dead: '⚫ Dead'
  };
  const statusLabel = statusIcons[tree.status] || `${tree.status || 'Unknown'}`;

  // Safe coordinate display
  const lat = parseFloat(tree.lat) != null && !isNaN(parseFloat(tree.lat)) ? parseFloat(tree.lat) : (parseFloat(tree.latitude) || null);
  const lng = parseFloat(tree.lng) != null && !isNaN(parseFloat(tree.lng)) ? parseFloat(tree.lng) : (parseFloat(tree.longitude) || null);
  const coordText = (lat !== null && lng !== null)
    ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    : (tree.location || '—');

  // Adopter and location match detection
  const adopterInfo = getAdopterInfoForTree(tree);
  const isLocationMismatch = Boolean(adopterInfo && lat !== null && lng !== null && (
    Math.abs(lat - adopterInfo.targetCoords.lat) > 0.0035 ||
    Math.abs(lng - adopterInfo.targetCoords.lng) > 0.0035 ||
    (tree.barangay && !tree.barangay.toLowerCase().includes(adopterInfo.barangay.toLowerCase()))
  ));

  body.innerHTML = `
    <!-- Tree Photo -->
    <div class="drawer-photo-wrap">
      <img src="${tree.photoUrl || ''}" alt="${speciesCommon}" class="drawer-photo-img"
        onerror="this.style.display='none'" />
      <span class="drawer-health-badge ${tree.status || ''}">${ statusLabel }</span>
    </div>

    <!-- Tree Header -->
    <div class="drawer-tree-id-header">
      <h2 class="drawer-tree-id">${tree.id} — ${speciesCommon.toUpperCase()}</h2>
      <span class="drawer-species-tag">Botanical: <em>${speciesScientific}</em> (${speciesType})</span>
    </div>

    <!-- Location Mismatch Warning Card -->
    ${isLocationMismatch ? `
      <div style="background:#fffbeb; border:1.5px solid #f59e0b; border-radius:10px; padding:12px 14px; margin-bottom:14px; box-shadow:0 2px 8px rgba(245,158,11,0.12);">
        <div style="display:flex; align-items:flex-start; gap:10px;">
          <span style="font-size:22px; line-height:1;">⚠️</span>
          <div style="flex:1;">
            <div style="font-weight:800; font-size:13px; color:#92400e; margin-bottom:3px;">Pin Location Mismatch Detected</div>
            <div style="font-size:12px; color:#78350f; line-height:1.4;">
              Adopter <strong>${adopterInfo.name}</strong> is designated in <strong>${adopterInfo.location}</strong>, but this tree pin is currently mapped to <strong>${tree.barangay || 'Central Hub'} (${coordText})</strong>.
            </div>
            <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
              <button onclick="matchTreeToAdopterLocation('${tree.id}')" style="background:#16a34a; color:#fff; border:none; border-radius:6px; padding:7px 12px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <span>🎯 Relocate Pin to ${adopterInfo.location}</span>
              </button>
              <button onclick="openCorrectGpsModal('${tree.id}')" style="background:#fff; color:#374151; border:1px solid #d1d5db; border-radius:6px; padding:7px 10px; font-size:12px; font-weight:600; cursor:pointer;">
                <span>📍 Calibrate GPS</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Active Issue Alert -->
    ${tree.status !== 'healthy' ? `
      <div class="drawer-issue-alert">
        <span style="font-size:18px;">⚠️</span>
        <div>
          <strong>Current Issue:</strong> ${tree.issue || 'See monitoring notes.'}
        </div>
      </div>
    ` : `
      <div class="drawer-issue-alert" style="background:#f0fdf4; border-color:#bbf7d0; color:#15803d;">
        <span>✅</span>
        <div><strong>Status:</strong> Thriving in optimal ecological balance.</div>
      </div>
    `}

    <!-- Telemetry Mini Grid -->
    <div class="drawer-telemetry-grid">
      <div class="telemetry-mini-card">
        <span class="telemetry-mini-label">Soil Moisture (IoT)</span>
        <div class="telemetry-mini-val">${tree.soilMoisture !== undefined ? tree.soilMoisture + '%' : '—'}</div>
      </div>
      <div class="telemetry-mini-card">
        <span class="telemetry-mini-label">Canopy Health Index</span>
        <div class="telemetry-mini-val">${tree.canopyIndex !== undefined ? tree.canopyIndex + '%' : '—'}</div>
      </div>
      <div class="telemetry-mini-card">
        <span class="telemetry-mini-label">Tree Height</span>
        <div class="telemetry-mini-val">${tree.height !== undefined ? tree.height + ' m' : '—'}</div>
      </div>
      <div class="telemetry-mini-card">
        <span class="telemetry-mini-label">Diameter (DBH)</span>
        <div class="telemetry-mini-val">${tree.dbh !== undefined ? tree.dbh + ' cm' : '—'}</div>
      </div>
    </div>

    <!-- Detailed Metadata Grid -->
    <div class="drawer-data-grid">
      <div class="drawer-data-row" style="${isLocationMismatch ? 'background:#fff7ed;' : ''}">
        <span class="drawer-data-label">📍 GPS Coordinates</span>
        <span class="drawer-data-value" style="font-family:monospace; font-weight:700;">${coordText}</span>
      </div>
      <div class="drawer-data-row">
        <span class="drawer-data-label">🏠 Tree Location</span>
        <span class="drawer-data-value">${[tree.barangay, tree.municipality].filter(Boolean).join(', ') || '—'}</span>
      </div>
      ${adopterInfo ? `
      <div class="drawer-data-row" style="background:${isLocationMismatch ? '#fef3c7' : '#f0fdf4'};">
        <span class="drawer-data-label">📍 Adopter Location</span>
        <span class="drawer-data-value" style="font-weight:700; color:${isLocationMismatch ? '#b45309' : '#15803d'};">
          ${adopterInfo.location}
          ${isLocationMismatch ? ' ⚠️ (Mismatch)' : ' ✅ (Aligned)'}
        </span>
      </div>
      ` : ''}
      <div class="drawer-data-row">
        <span class="drawer-data-label">👤 Caretaker</span>
        <span class="drawer-data-value">${tree.caretaker || '—'}</span>
      </div>
      <div class="drawer-data-row">
        <span class="drawer-data-label">📞 Caretaker Contact</span>
        <span class="drawer-data-value">${tree.caretakerPhone || tree.caretakerContact || '—'}</span>
      </div>
      <div class="drawer-data-row">
        <span class="drawer-data-label">🧑‍🌾 Landowner / Farmer</span>
        <span class="drawer-data-value">${tree.landowner || tree.farmer || '—'}</span>
      </div>
      <div class="drawer-data-row">
        <span class="drawer-data-label">🤝 Adopter</span>
        <span class="drawer-data-value">${tree.adopter || tree.sponsorName || '—'}</span>
      </div>
      <div class="drawer-data-row">
        <span class="drawer-data-label">🌳 Project</span>
        <span class="drawer-data-value">${tree.project || '—'}</span>
      </div>
      <div class="drawer-data-row">
        <span class="drawer-data-label">📅 Planting Date</span>
        <span class="drawer-data-value">${tree.plantingDate || tree.dateAdded || '—'}</span>
      </div>
      <div class="drawer-data-row">
        <span class="drawer-data-label">🔍 Last Monitoring</span>
        <span class="drawer-data-value">${tree.lastMonitoring || tree.lastMonitoringDate || '—'}</span>
      </div>
    </div>

    <!-- Admin Actions Grid (Section 10) -->
    <div class="drawer-actions-grid">
      ${isLocationMismatch ? `
      <button class="btn-drawer-action primary" onclick="matchTreeToAdopterLocation('${tree.id}')" style="background:#16a34a; color:#fff; border-color:#16a34a; grid-column:1 / -1; justify-content:center; padding:10px; font-weight:800; box-shadow:0 2px 8px rgba(22,163,74,0.3);">
        <span>🎯 Relocate Pin to Match Adopter (${adopterInfo.location})</span>
      </button>
      ` : ''}
      <button class="btn-drawer-action primary" onclick="viewFullProfileModal('${tree.id}')">
        <span>👁️ View Full Tree Profile</span>
      </button>
      <button class="btn-drawer-action" onclick="openEditTreeModal('${tree.id}')">
        <span>✏️ Edit Tree</span>
      </button>
      <button class="btn-drawer-action" onclick="openReassignModal('${tree.id}')">
        <span>👤 Change Caretaker</span>
      </button>
      <button class="btn-drawer-action primary" onclick="startPinRelocationMode('${tree.id}')" style="background:#2563eb; color:#fff; border-color:#2563eb;">
        <span>🎯 Click Map to Place Pin</span>
      </button>
      <button class="btn-drawer-action" onclick="openCorrectGpsModal('${tree.id}')">
        <span>📍 Calibrate GPS</span>
      </button>
      <button class="btn-drawer-action" onclick="showAdminToast('Telemetry log exported for ${tree.id}')">
        <span>📊 View Telemetry</span>
      </button>
      <button class="btn-drawer-action danger" onclick="archiveTreeAction('${tree.id}')">
        <span>🗑️ Archive Tree</span>
      </button>
    </div>
  `;

  drawer.classList.add('open');

  // Center map on clicked tree (only when valid coords available)
  if (lat !== null && lng !== null) {
    map.setView([lat, lng], 16, { animate: true });
  }
}

function closeTreeDetails() {
  const drawer = document.getElementById('treeDetailsDrawer');
  if (drawer) drawer.classList.remove('open');
}

/* ─── 6. Multi-Criteria Filters Engine (Section 3) ─── */
function initFilterEvents() {
  const keywordInput = document.getElementById('filterKeywordInput');
  const speciesSelect = document.getElementById('filterSpecies');
  const healthSelect = document.getElementById('filterHealth');
  const provinceSelect = document.getElementById('filterProvince');
  const municipalitySelect = document.getElementById('filterMunicipality');
  const barangaySelect = document.getElementById('filterBarangay');
  const caretakerSelect = document.getElementById('filterCaretaker');
  const adopterSelect = document.getElementById('filterAdopter');
  const plantingDateSelect = document.getElementById('filterPlantingDate');
  const monitoringStatusSelect = document.getElementById('filterMonitoringStatus');
  const projectSelect = document.getElementById('filterProject');
  const treeTypeSelect = document.getElementById('filterTreeType');
  const resetBtn = document.getElementById('btnResetFilters');

  const filterInputs = [
    keywordInput, speciesSelect, healthSelect, provinceSelect, municipalitySelect,
    barangaySelect, caretakerSelect, adopterSelect, plantingDateSelect,
    monitoringStatusSelect, projectSelect, treeTypeSelect
  ];

  filterInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', applyAllFilters);
      input.addEventListener('change', applyAllFilters);
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', resetAllFilters);
  }
}

function applyAllFilters() {
  const keyword = (document.getElementById('filterKeywordInput')?.value || '').toLowerCase().trim();
  const species = document.getElementById('filterSpecies')?.value || 'all';
  const health = document.getElementById('filterHealth')?.value || 'all';
  const province = document.getElementById('filterProvince')?.value || 'all';
  const municipality = document.getElementById('filterMunicipality')?.value || 'all';
  const barangay = document.getElementById('filterBarangay')?.value || 'all';
  const caretaker = document.getElementById('filterCaretaker')?.value || 'all';
  const adopter = document.getElementById('filterAdopter')?.value || 'all';
  const plantingDate = document.getElementById('filterPlantingDate')?.value || 'all';
  const monitoringStatus = document.getElementById('filterMonitoringStatus')?.value || 'all';
  const project = document.getElementById('filterProject')?.value || 'all';
  const treeType = document.getElementById('filterTreeType')?.value || 'all';

  CURRENT_FILTERED_TREES = ALL_TREES.filter(t => {
    if (keyword) {
      const match = t.id.toLowerCase().includes(keyword) ||
                    t.species.toLowerCase().includes(keyword) ||
                    t.landowner.toLowerCase().includes(keyword) ||
                    t.caretaker.toLowerCase().includes(keyword) ||
                    t.barangay.toLowerCase().includes(keyword) ||
                    (t.issue && t.issue.toLowerCase().includes(keyword));
      if (!match) return false;
    }

    if (species !== 'all' && t.species !== species) return false;
    if (health !== 'all' && t.status !== health) return false;
    if (province !== 'all' && t.province !== province) return false;
    if (municipality !== 'all' && t.municipality !== municipality) return false;
    if (barangay !== 'all' && t.barangay !== barangay) return false;
    if (caretaker !== 'all' && t.caretaker !== caretaker) return false;
    if (adopter !== 'all' && t.adopter !== adopter) return false;
    if (plantingDate !== 'all' && t.plantingYear !== plantingDate) return false;
    if (monitoringStatus !== 'all' && t.monitoringStatus !== monitoringStatus) return false;
    if (project !== 'all' && t.project !== project) return false;
    if (treeType !== 'all' && t.type !== treeType) return false;

    return true;
  });

  renderTreeMarkers(CURRENT_FILTERED_TREES);
  updateActiveFilterTags();
}

function updateActiveFilterTags() {
  const container = document.getElementById('activeTagsRow');
  const badge = document.getElementById('filterCountBadge');
  if (!container) return;

  if (badge) {
    badge.textContent = `Showing ${CURRENT_FILTERED_TREES.length.toLocaleString()} of ${ALL_TREES.length.toLocaleString()} Trees`;
  }

  container.innerHTML = '';
  const activeFilters = [];

  const species = document.getElementById('filterSpecies')?.value;
  if (species && species !== 'all') activeFilters.push({ label: `Species: ${species}`, clear: () => document.getElementById('filterSpecies').value = 'all' });

  const health = document.getElementById('filterHealth')?.value;
  if (health && health !== 'all') activeFilters.push({ label: `Status: ${health}`, clear: () => document.getElementById('filterHealth').value = 'all' });

  const barangay = document.getElementById('filterBarangay')?.value;
  if (barangay && barangay !== 'all') activeFilters.push({ label: `Barangay: ${barangay}`, clear: () => document.getElementById('filterBarangay').value = 'all' });

  const caretaker = document.getElementById('filterCaretaker')?.value;
  if (caretaker && caretaker !== 'all') activeFilters.push({ label: `Caretaker: ${caretaker}`, clear: () => document.getElementById('filterCaretaker').value = 'all' });

  activeFilters.forEach(f => {
    const chip = document.createElement('span');
    chip.className = 'active-tag-chip';
    chip.innerHTML = `${f.label} <button>×</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      f.clear();
      applyAllFilters();
    });
    container.appendChild(chip);
  });
}

function resetAllFilters() {
  document.getElementById('filterKeywordInput').value = '';
  document.getElementById('filterSpecies').value = 'all';
  document.getElementById('filterHealth').value = 'all';
  document.getElementById('filterProvince').value = 'all';
  document.getElementById('filterMunicipality').value = 'all';
  document.getElementById('filterBarangay').value = 'all';
  document.getElementById('filterCaretaker').value = 'all';
  document.getElementById('filterAdopter').value = 'all';
  document.getElementById('filterPlantingDate').value = 'all';
  document.getElementById('filterMonitoringStatus').value = 'all';
  document.getElementById('filterProject').value = 'all';
  document.getElementById('filterTreeType').value = 'all';
  applyAllFilters();
  showAdminToast('All filters have been reset.');
}

/* ─── 7. Attention Panel & Geographic Summary (Sections 8 & 9) ─── */
function renderAttentionPanel() {
  const list = document.getElementById('attentionUrgentList');
  const totalBadge = document.getElementById('attTotalBadge');
  const critCount = document.getElementById('attCritCount');
  const needsCount = document.getElementById('attNeedsCount');
  const deadCount = document.getElementById('attDeadCount');

  const crit = ALL_TREES.filter(t => t.status === 'critical').length;
  const needs = ALL_TREES.filter(t => t.status === 'needs-care').length;
  const dead = ALL_TREES.filter(t => t.status === 'dead').length;
  const total = crit + needs + dead;

  if (totalBadge) totalBadge.textContent = total;
  if (critCount) critCount.textContent = crit;
  if (needsCount) needsCount.textContent = needs;
  if (deadCount) deadCount.textContent = dead;

  if (!list) return;

  const urgentTrees = ALL_TREES.filter(t => t.status === 'critical' || t.status === 'needs-care' || t.status === 'dead').slice(0, 6);

  if (urgentTrees.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:18px 8px; color:var(--text-muted); font-size:12px; font-weight:600;">✅ No problem trees requiring attention.</div>`;
  } else {
    list.innerHTML = urgentTrees.map(t => `
      <div class="attention-tree-row" onclick="openTreeDetails('${t.id}')">
        <div>
          <span class="att-tree-id">${t.id} — ${t.species}</span>
          <div class="att-tree-issue">⚠️ ${t.issue || 'Requires inspection'}</div>
        </div>
        <span class="popup-status-badge ${t.status}">${t.status.toUpperCase()}</span>
      </div>
    `).join('');
  }

  // Attention box filter shortcuts
  document.getElementById('filterAttCrit')?.addEventListener('click', () => {
    document.getElementById('filterHealth').value = 'critical';
    applyAllFilters();
  });
  document.getElementById('filterAttNeeds')?.addEventListener('click', () => {
    document.getElementById('filterHealth').value = 'needs-care';
    applyAllFilters();
  });
  document.getElementById('filterAttDead')?.addEventListener('click', () => {
    document.getElementById('filterHealth').value = 'dead';
    applyAllFilters();
  });
  document.getElementById('btnViewAllIssues')?.addEventListener('click', () => {
    CURRENT_FILTERED_TREES = ALL_TREES.filter(t => t.status !== 'healthy');
    renderTreeMarkers(CURRENT_FILTERED_TREES);
    showAdminToast(`Filtering problem trees (${CURRENT_FILTERED_TREES.length} found).`);
  });
}

function renderGeographicSummary() {
  const tbody = document.getElementById('geoSummaryTableBody');
  if (!tbody) return;

  if (ALL_TREES.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:24px 8px; color:var(--text-muted); font-size:12px; font-weight:600;">📍 No trees mapped by location yet.</td></tr>`;
    return;
  }

  // Group dynamically by barangay from real tree data
  const grouped = {};
  ALL_TREES.forEach(t => {
    const b = t.barangay || 'Unknown';
    if (!grouped[b]) grouped[b] = { name: b, total: 0, healthy: 0, critical: 0, lat: t.lat, lng: t.lng };
    grouped[b].total++;
    if (t.status === 'healthy') grouped[b].healthy++;
    if (t.status === 'critical') grouped[b].critical++;
  });

  const summary = Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 8);

  tbody.innerHTML = summary.map(s => `
    <tr class="clickable" onclick="zoomToLocation(${s.lat}, ${s.lng}, '${s.name}')">
      <td><strong>${s.name}</strong></td>
      <td class="num">${s.total}</td>
      <td class="num" style="color:#16a34a;">${s.healthy}</td>
      <td class="num critical-num">${s.critical}</td>
    </tr>
  `).join('');
}

window.zoomToLocation = function (lat, lng, name) {
  map.flyTo([lat, lng], 16, { duration: 1.2 });
  showAdminToast(`📍 Zooming into ${name}`);
};

/* ─── 8. Drawer, Layers & Banner Tools ─── */
function initDrawerEvents() {
  document.getElementById('btnCloseDrawer')?.addEventListener('click', closeTreeDetails);
}

function initBannerToolEvents() {
  // Banner Quick Search
  const bannerSearch = document.getElementById('bannerQuickSearch');
  if (bannerSearch) {
    bannerSearch.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        const val = bannerSearch.value.trim().toUpperCase();
        const tree = ALL_TREES.find(t => t.id === val || t.id.includes(val));
        if (tree) {
          openTreeDetails(tree.id);
          showAdminToast(`Found ${tree.id}`);
        } else {
          showAdminToast(`No tree found matching "${val}"`);
        }
      }
    });
  }

  // Location Preset Dropdown
  const preset = document.getElementById('locationPresetSelect');
  if (preset) {
    preset.addEventListener('change', (e) => {
      const v = e.target.value;
      if (v === 'catbalogan') map.flyTo([11.7753, 124.8850], 14);
      if (v === 'calbayog') map.flyTo([12.0650, 124.5950], 13);
      if (v === 'jiabong') map.flyTo([11.7510, 124.9520], 14);
      if (v === 'tarangnan') map.flyTo([11.9010, 124.7500], 13);
      if (v === 'samar-all') map.flyTo([11.8500, 124.8000], 11);
    });
  }

  // Base Layer Toggle
  const btnBaseLayer = document.getElementById('btnToggleBaseLayer');
  const baseText = document.getElementById('baseLayerText');
  if (btnBaseLayer) {
    btnBaseLayer.addEventListener('click', () => {
      if (currentBaseLayer === 'satellite') {
        map.removeLayer(baseLayers.satellite);
        baseLayers.streets.addTo(map);
        currentBaseLayer = 'streets';
        baseText.textContent = '🗺️ Street View';
        showAdminToast('Switched to OpenStreetMap Street layer.');
      } else {
        map.removeLayer(baseLayers.streets);
        baseLayers.satellite.addTo(map);
        currentBaseLayer = 'satellite';
        baseText.textContent = '🗺️ Satellite View';
        showAdminToast('Switched to Esri High-Res Satellite layer.');
      }
    });
  }

  // Fullscreen
  const btnFull = document.getElementById('btnFullscreen');
  if (btnFull) {
    btnFull.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
  }

  // Map Layers Panel Toggle
  const btnToggleLayers = document.getElementById('btnToggleLayersPanel');
  const layersPanel = document.getElementById('mapLayersFloatingPanel');
  if (btnToggleLayers && layersPanel) {
    btnToggleLayers.addEventListener('click', (e) => {
      e.stopPropagation();
      layersPanel.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!layersPanel.contains(e.target) && e.target !== btnToggleLayers) {
        layersPanel.classList.remove('show');
      }
    });
  }

  // Layer Checkbox Toggles
  const setupLayerCheckbox = (id, layer) => {
    const cb = document.getElementById(id);
    if (cb && layer) {
      cb.addEventListener('change', (e) => {
        if (e.target.checked) map.addLayer(layer);
        else map.removeLayer(layer);
      });
    }
  };

  setupLayerCheckbox('layerToggleTrees', markerClusterGroup);
  setupLayerCheckbox('layerToggleCaretakerAreas', layerGroups.caretakerAreas);
  setupLayerCheckbox('layerToggleBarangays', layerGroups.barangays);
  setupLayerCheckbox('layerTogglePlantingSites', layerGroups.plantingSites);
  setupLayerCheckbox('layerToggleCriticalHotspots', layerGroups.criticalHotspots);

  // Zoom to Extent
  document.getElementById('btnZoomToExtent')?.addEventListener('click', () => {
    if (markerClusterGroup.getLayers().length > 0) {
      map.fitBounds(markerClusterGroup.getBounds(), { padding: [40, 40] });
    }
  });

  // Export Data button
  document.getElementById('btnExportData')?.addEventListener('click', () => {
    openAdminModal('modalExport');
  });

  // Sync All Sensors — full real-time data pull & broadcast
  document.getElementById('btnRecalibrateAll')?.addEventListener('click', async function () {
    const btn = this;
    if (btn.disabled) return;
    btn.disabled = true;
    const svgEl = btn.querySelector('svg');
    const spanEl = btn.querySelector('span');
    if (spanEl) spanEl.textContent = 'Syncing\u2026';
    if (svgEl) svgEl.style.animation = 'spin 0.7s linear infinite';

    showAdminToast('\uD83D\uDD04 Syncing all sensors and ATAMAN data across dashboards\u2026');

    try {
      const now = new Date();
      const syncLabel = `[${now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]`;
      let source = 'local';
      let trees = [], adopters = [], caretakers = [], users = [];

      // 1. Read current local caches
      try { trees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]'); } catch (_) {}
      try { adopters = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]'); } catch (_) {}
      try { caretakers = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]'); } catch (_) {}
      try { users = JSON.parse(localStorage.getItem('ATAMAN_users_cache') || localStorage.getItem('ATAMAN_registered_users') || '[]'); } catch (_) {}

      // 2. Pull from Firestore if available
      if (window.ATAMAN_DB) {
        const tasks = [];
        if (typeof window.ATAMAN_DB.getTrees === 'function') {
          tasks.push(window.ATAMAN_DB.getTrees().then(res => {
            const d = res && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : null);
            if (d && d.length > 0) { trees = d; localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(d)); source = 'firestore'; }
          }).catch(() => {}));
        }
        if (typeof window.ATAMAN_DB.getAdopters === 'function') {
          tasks.push(window.ATAMAN_DB.getAdopters().then(res => {
            const d = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : null);
            if (d && d.length > 0) { adopters = d; localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(d)); source = 'firestore'; }
          }).catch(() => {}));
        }
        if (typeof window.ATAMAN_DB.getCaretakers === 'function') {
          tasks.push(window.ATAMAN_DB.getCaretakers().then(res => {
            const d = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : null);
            if (d && d.length > 0) { caretakers = d; localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(d)); source = 'firestore'; }
          }).catch(() => {}));
        }
        await Promise.allSettled(tasks);
      }

      // 3. Broadcast to ALL open ATAMAN tabs (admin dashboard, caretaker, adopter)
      if (window.ATAMAN_SYNC) {
        if (trees.length > 0)      window.ATAMAN_SYNC.notifyTrees(trees);
        if (adopters.length > 0)   window.ATAMAN_SYNC.notifyAdopters(adopters);
        if (caretakers.length > 0) window.ATAMAN_SYNC.notifyCaretakers(caretakers);
        if (users.length > 0)      window.ATAMAN_SYNC.notifyUsers(users);
      }

      // 4. Re-render tree map with fresh data
      if (typeof ALL_TREES !== 'undefined' && trees.length > 0) {
        ALL_TREES.length = 0;
        trees.forEach(t => ALL_TREES.push(t));
      }
      if (typeof renderTreeMarkers === 'function' && typeof CURRENT_FILTERED_TREES !== 'undefined') {
        renderTreeMarkers(CURRENT_FILTERED_TREES.length > 0 ? CURRENT_FILTERED_TREES : trees);
      }

      // 5. Audit log
      try {
        const logs = JSON.parse(localStorage.getItem('ATAMAN_system_logs') || '[]');
        logs.unshift({
          id: `LOG-SYNC-${Date.now()}`,
          timestamp: now.toISOString(),
          type: 'sync',
          level: 'info',
          message: `${syncLabel} Tree Map sensor sync completed. Trees: ${trees.length}, Adopters: ${adopters.length}, Caretakers: ${caretakers.length}. Source: ${source === 'firestore' ? '\u2601 Cloud Firestore' : '\uD83D\uDCBE Local Cache'}.`,
          user: localStorage.getItem('ATAMAN_user_name') || 'Admin',
          source
        });
        localStorage.setItem('ATAMAN_system_logs', JSON.stringify(logs.slice(0, 200)));
      } catch (_) {}

      localStorage.setItem('ATAMAN_last_full_sync', now.toISOString());

      const srcLabel = source === 'firestore' ? '\u2601 Cloud Firestore' : '\uD83D\uDCBE Local Cache';
      showAdminToast(`\u2705 Sync complete ${syncLabel} \u2014 ${trees.length} trees synced across all dashboards from ${srcLabel}.`);

    } catch (err) {
      console.error('[ATAMAN] Tree map sync error:', err);
      showAdminToast('\u26A0\uFE0F Sync error. Map refreshed from local cache.');
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        if (svgEl) svgEl.style.animation = '';
        if (spanEl) spanEl.textContent = 'Sync All Sensors';
      }, 1800);
    }
  });
}

/* ─── 9. Modals & Admin Action Workflows (Section 10) ─── */
function initAdminModalEvents() {
  // Export Buttons
  document.getElementById('btnExportGeoJSON')?.addEventListener('click', exportGeoJSON);
  document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);
  document.getElementById('btnExportReport')?.addEventListener('click', exportReport);

  // Save Edit Tree
  document.getElementById('btnSaveEditTree')?.addEventListener('click', () => {
    if (!SELECTED_TREE) return;
    SELECTED_TREE.species = document.getElementById('editSpecies').value;
    SELECTED_TREE.status = document.getElementById('editHealthStatus').value;
    SELECTED_TREE.landowner = document.getElementById('editLandowner').value;
    SELECTED_TREE.issue = document.getElementById('editIssues').value || 'None';
    SELECTED_TREE.height = Number(document.getElementById('editHeight').value);
    SELECTED_TREE.dbh = Number(document.getElementById('editDbh').value);

    renderTreeMarkers(CURRENT_FILTERED_TREES);
    openTreeDetails(SELECTED_TREE.id);
    closeAdminModal('modalEditTree');
    showAdminToast(`✅ Tree ${SELECTED_TREE.id} information updated successfully!`);
  });

  // Confirm Reassign Caretaker
  document.getElementById('btnConfirmReassign')?.addEventListener('click', () => {
    if (!SELECTED_TREE) return;
    const newCaretaker = document.getElementById('reassignCaretakerSelect').value;
    SELECTED_TREE.caretaker = newCaretaker;
    SELECTED_TREE.customCaretaker = true;
    try { localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(ALL_TREES)); } catch (_) {}
    renderTreeMarkers(CURRENT_FILTERED_TREES);
    openTreeDetails(SELECTED_TREE.id);
    closeAdminModal('modalReassignCaretaker');
    showAdminToast(`👤 Tree ${SELECTED_TREE.id} reassigned to ${newCaretaker}.`);
  });

  // Save GPS Correction
  document.getElementById('btnSaveGpsCorrect')?.addEventListener('click', async () => {
    if (!SELECTED_TREE) return;
    const newLat = parseFloat(document.getElementById('gpsInputLat').value);
    const newLng = parseFloat(document.getElementById('gpsInputLng').value);
    const newBrgy = document.getElementById('gpsInputBarangay').value.trim();

    if (!isNaN(newLat) && !isNaN(newLng)) {
      await saveTreeExactLocation(SELECTED_TREE.id, newLat, newLng, newBrgy || null);
      closeAdminModal('modalCorrectGps');
      showAdminToast(`📍 GPS for ${SELECTED_TREE.id} calibrated to [${newLat.toFixed(5)}, ${newLng.toFixed(5)}].`);
    } else {
      showAdminToast('⚠️ Please enter valid numeric latitude and longitude.');
    }
  });
}

/* ─── Exact Pin Relocation & Adopter Alignment Engine ─── */
async function saveTreeExactLocation(treeId, lat, lng, newBarangay = null) {
  const tree = ALL_TREES.find(t => t.id === treeId);
  if (!tree) return;

  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  if (isNaN(numLat) || isNaN(numLng)) return;

  tree.lat = numLat;
  tree.lng = numLng;
  tree.customGps = true;
  if (newBarangay) {
    tree.barangay = newBarangay.replace(/^Brgy\.\s*/i, '').trim();
  }

  // Update in filtered array too
  const filteredTree = CURRENT_FILTERED_TREES.find(t => t.id === treeId);
  if (filteredTree) {
    filteredTree.lat = tree.lat;
    filteredTree.lng = tree.lng;
    if (newBarangay) filteredTree.barangay = tree.barangay;
  }

  // Persist to localStorage
  try {
    localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(ALL_TREES));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }

  // Broadcast real-time update
  if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyTrees === 'function') {
    window.ATAMAN_SYNC.notifyTrees(ALL_TREES);
  } else if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.broadcast === 'function') {
    window.ATAMAN_SYNC.broadcast('trees', ALL_TREES);
  }

  // Persist to Firestore if available
  if (window.ATAMAN_DB && typeof window.ATAMAN_DB.updateTree === 'function') {
    try {
      await window.ATAMAN_DB.updateTree(treeId, {
        lat: tree.lat,
        lng: tree.lng,
        ...(newBarangay ? { barangay: tree.barangay } : {})
      });
    } catch (err) {
      console.warn('Firestore updateTree failed:', err);
    }
  }

  // Update markers on the map
  renderTreeMarkers(CURRENT_FILTERED_TREES);

  // If tree details drawer is open for this tree, update it
  if (SELECTED_TREE && SELECTED_TREE.id === treeId) {
    SELECTED_TREE = tree;
    openTreeDetails(treeId);
  }

  // Smoothly center the map on the new location
  if (map) {
    map.flyTo([numLat, numLng], 16, { duration: 1.0 });
  }

  showAdminToast(`📍 Pin for ${treeId} updated to [${numLat.toFixed(5)}, ${numLng.toFixed(5)}] in Brgy. ${tree.barangay || 'San Isidro'}`);
}
window.saveTreeExactLocation = saveTreeExactLocation;

async function matchTreeToAdopterLocation(treeId) {
  const tree = ALL_TREES.find(t => t.id === treeId);
  if (!tree) return;
  const adopterInfo = getAdopterInfoForTree(tree);
  const target = adopterInfo?.targetCoords || SAMAR_BARANGAY_COORDS['San Isidro'];
  const newBarangay = adopterInfo?.barangay || 'San Isidro';

  // Apply slight random offset (within ~15 meters) so multiple trees in the same barangay do not overlap 100%
  const jitterLat = (Math.random() - 0.5) * 0.0004;
  const jitterLng = (Math.random() - 0.5) * 0.0004;
  const newLat = parseFloat((target.lat + jitterLat).toFixed(6));
  const newLng = parseFloat((target.lng + jitterLng).toFixed(6));

  await saveTreeExactLocation(treeId, newLat, newLng, newBarangay);
  showAdminToast(`🎯 Relocated pin for ${treeId} to match adopter's location in ${adopterInfo ? adopterInfo.location : 'Brgy. San Isidro'}!`);
}
window.matchTreeToAdopterLocation = matchTreeToAdopterLocation;
window._execMatchTreeToAdopterLocation = matchTreeToAdopterLocation;

let RELOCATION_CLICK_HANDLER = null;
let PENDING_RELOCATION_COORDS = null;

function startPinRelocationMode(treeId) {
  const tree = ALL_TREES.find(t => t.id === treeId);
  if (!tree) return;
  RELOCATING_TREE_ID = treeId;
  PENDING_RELOCATION_COORDS = null;

  closeTreeDetails();
  closeAdminModal('modalCorrectGps');

  if (map) {
    map.getContainer().style.cursor = 'crosshair';
  }

  // Show built-in HTML banner if present
  const htmlBanner = document.getElementById('pinModeBanner');
  const treeIdSpan = document.getElementById('pinModeTreeId');
  if (htmlBanner) {
    if (treeIdSpan) treeIdSpan.textContent = `${tree.id} (${(typeof tree.species === 'object' && tree.species?.common) || tree.species || 'Tree'})`;
    htmlBanner.style.display = 'flex';
  }

  const cleanupRelocation = () => {
    RELOCATING_TREE_ID = null;
    PENDING_RELOCATION_COORDS = null;
    if (map) {
      map.getContainer().style.cursor = '';
      if (RELOCATION_CLICK_HANDLER) {
        map.off('click', RELOCATION_CLICK_HANDLER);
        RELOCATION_CLICK_HANDLER = null;
      }
    }
    const b = document.getElementById('pinModeBanner');
    if (b) b.style.display = 'none';
    document.removeEventListener('keydown', escListener);
  };

  const escListener = (e) => {
    if (e.key === 'Escape') {
      cleanupRelocation();
      showAdminToast('Pin relocation cancelled.');
    }
  };
  document.addEventListener('keydown', escListener);

  RELOCATION_CLICK_HANDLER = async (e) => {
    const clickLat = parseFloat(e.latlng.lat.toFixed(6));
    const clickLng = parseFloat(e.latlng.lng.toFixed(6));
    cleanupRelocation();
    await saveTreeExactLocation(treeId, clickLat, clickLng);
  };

  map.once('click', RELOCATION_CLICK_HANDLER);
  showAdminToast(`🎯 Crosshair active: Click on map to place pin for ${tree.id}`);
}
window.startPinRelocationMode = startPinRelocationMode;
window._execStartPinRelocationMode = startPinRelocationMode;

window.exitPinRelocationMode = async function(save) {
  const treeId = RELOCATING_TREE_ID;
  if (!treeId) {
    const b = document.getElementById('pinModeBanner');
    if (b) b.style.display = 'none';
    if (map) map.getContainer().style.cursor = '';
    return;
  }

  if (save && PENDING_RELOCATION_COORDS) {
    const coords = PENDING_RELOCATION_COORDS;
    RELOCATING_TREE_ID = null;
    PENDING_RELOCATION_COORDS = null;
    if (map) map.getContainer().style.cursor = '';
    const b = document.getElementById('pinModeBanner');
    if (b) b.style.display = 'none';
    await saveTreeExactLocation(treeId, coords.lat, coords.lng);
  } else {
    RELOCATING_TREE_ID = null;
    PENDING_RELOCATION_COORDS = null;
    if (map) {
      map.getContainer().style.cursor = '';
      if (RELOCATION_CLICK_HANDLER) {
        map.off('click', RELOCATION_CLICK_HANDLER);
        RELOCATION_CLICK_HANDLER = null;
      }
    }
    const b = document.getElementById('pinModeBanner');
    if (b) b.style.display = 'none';
    showAdminToast(save ? 'No new pin position selected.' : 'Pin relocation cancelled.');
  }
};

window.acquireDeviceGpsForPinMode = function() {
  if (!navigator.geolocation) {
    showAdminToast('⚠️ Geolocation not supported by your browser.');
    return;
  }
  const treeId = RELOCATING_TREE_ID;
  if (!treeId) return;

  showAdminToast('📡 Acquiring device GPS for pin...');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = parseFloat(pos.coords.latitude.toFixed(6));
      const lng = parseFloat(pos.coords.longitude.toFixed(6));
      PENDING_RELOCATION_COORDS = { lat, lng };
      if (map) map.flyTo([lat, lng], 17);
      await window.exitPinRelocationMode(true);
      showAdminToast(`✅ Pinned ${treeId} to device GPS: [${lat}, ${lng}]`);
    },
    (err) => {
      showAdminToast(`⚠️ GPS acquisition error: ${err.message}`);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};

window.startPinFromGpsModal = function() {
  if (!SELECTED_TREE) return;
  const treeId = SELECTED_TREE.id;
  closeAdminModal('modalCorrectGps');
  window.startPinRelocationMode(treeId);
};

window.fillGpsWithAdopterLocation = function() {
  if (!SELECTED_TREE) return;
  const adopterInfo = getAdopterInfoForTree(SELECTED_TREE);
  const target = adopterInfo?.targetCoords || SAMAR_BARANGAY_COORDS['San Isidro'];
  const brgyName = adopterInfo?.barangay || 'San Isidro';

  const latInp = document.getElementById('gpsInputLat');
  const lngInp = document.getElementById('gpsInputLng');
  const brgyInp = document.getElementById('gpsInputBarangay');
  const quickSelect = document.getElementById('gpsQuickBarangaySelect');

  if (latInp) latInp.value = target.lat.toFixed(6);
  if (lngInp) lngInp.value = target.lng.toFixed(6);
  if (brgyInp) brgyInp.value = brgyName;
  if (quickSelect) quickSelect.value = brgyName;

  showAdminToast(`Matched adopter location: Brgy. ${brgyName} [${target.lat.toFixed(6)}, ${target.lng.toFixed(6)}]`);
};

window.acquireDeviceGpsForModal = function() {
  if (!navigator.geolocation) {
    showAdminToast('⚠️ Geolocation is not supported by your browser.');
    return;
  }
  showAdminToast('📡 Acquiring high-precision GPS from device...');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const latInp = document.getElementById('gpsInputLat');
      const lngInp = document.getElementById('gpsInputLng');
      if (latInp) latInp.value = lat.toFixed(6);
      if (lngInp) lngInp.value = lng.toFixed(6);
      showAdminToast(`✅ GPS acquired: [${lat.toFixed(6)}, ${lng.toFixed(6)}] (±${Math.round(pos.coords.accuracy)}m)`);
    },
    (err) => {
      showAdminToast(`⚠️ GPS acquisition failed: ${err.message}`);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};

window.onGpsQuickBarangayChange = function(val) {
  if (!val) return;
  const c = SAMAR_BARANGAY_COORDS[val];
  if (c) {
    const latInp = document.getElementById('gpsInputLat');
    const lngInp = document.getElementById('gpsInputLng');
    const brgyInp = document.getElementById('gpsInputBarangay');
    if (latInp) latInp.value = c.lat.toFixed(6);
    if (lngInp) lngInp.value = c.lng.toFixed(6);
    if (brgyInp) brgyInp.value = c.name.replace(/^Brgy\.\s*/i, '');
  }
};

window.openTreeDetails = openTreeDetails;

window.openAdminModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('show');
};

window.closeAdminModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('show');
};

window.openEditTreeModal = function (treeId) {
  const tree = ALL_TREES.find(t => t.id === treeId);
  if (!tree) return;
  SELECTED_TREE = tree;

  document.getElementById('editModalTreeTitle').textContent = `✏️ Edit ${tree.id} (${tree.species})`;
  document.getElementById('editTreeId').value = tree.id;
  document.getElementById('editSpecies').value = tree.species;
  document.getElementById('editHealthStatus').value = tree.status;
  document.getElementById('editLandowner').value = tree.landowner;
  document.getElementById('editIssues').value = tree.issue === 'None — Optimal growth condition' ? '' : tree.issue;
  document.getElementById('editHeight').value = tree.height;
  document.getElementById('editDbh').value = tree.dbh;

  openAdminModal('modalEditTree');
};

window.openReassignModal = function (treeId) {
  const tree = ALL_TREES.find(t => t.id === treeId);
  if (!tree) return;
  SELECTED_TREE = tree;

  document.getElementById('reassignSubtext').textContent = `Reassign tree ${tree.id} (${tree.species}) to another registered field caretaker.`;
  document.getElementById('reassignCaretakerSelect').value = tree.caretaker;

  openAdminModal('modalReassignCaretaker');
};

window.openCorrectGpsModal = function (treeId) {
  const tree = ALL_TREES.find(t => t.id === treeId);
  if (!tree) return;
  SELECTED_TREE = tree;

  const latInp = document.getElementById('gpsInputLat');
  const lngInp = document.getElementById('gpsInputLng');
  const brgyInp = document.getElementById('gpsInputBarangay');
  const quickSelect = document.getElementById('gpsQuickBarangaySelect');

  const latNum = parseFloat(tree.lat);
  const lngNum = parseFloat(tree.lng);

  if (latInp) latInp.value = !isNaN(latNum) ? latNum.toFixed(6) : '11.771000';
  if (lngInp) lngInp.value = !isNaN(lngNum) ? lngNum.toFixed(6) : '124.891000';
  if (brgyInp) brgyInp.value = tree.barangay || 'San Isidro';
  if (quickSelect) {
    const cleanB = (tree.barangay || 'San Isidro').replace(/^Brgy\.\s*/i, '').trim();
    quickSelect.value = SAMAR_BARANGAY_COORDS[cleanB] ? cleanB : '';
  }

  openAdminModal('modalCorrectGps');
};

window.viewFullProfileModal = function (treeId) {
  showAdminToast(`Opening full telemetry & monitoring archive for ${treeId}...`);
};

window.archiveTreeAction = function (treeId) {
  if (confirm(`Are you sure you want to archive tree ${treeId}? It will be removed from the active operational GIS layer.`)) {
    ALL_TREES = ALL_TREES.filter(t => t.id !== treeId);
    CURRENT_FILTERED_TREES = CURRENT_FILTERED_TREES.filter(t => t.id !== treeId);
    renderTreeMarkers(CURRENT_FILTERED_TREES);
    closeTreeDetails();
    showAdminToast(`🗑️ Tree ${treeId} has been archived.`);
  }
};

/* ─── 10. GIS Data Export Handlers ─── */
function exportGeoJSON() {
  const geojson = {
    type: 'FeatureCollection',
    features: CURRENT_FILTERED_TREES.map(t => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [t.lng, t.lat] },
      properties: {
        id: t.id,
        species: t.species,
        status: t.status,
        barangay: t.barangay,
        municipality: t.municipality,
        caretaker: t.caretaker,
        landowner: t.landowner,
        project: t.project,
        issue: t.issue
      }
    }))
  };

  downloadFile('ATAMAN-trees-export.geojson', JSON.stringify(geojson, null, 2), 'application/json');
  closeAdminModal('modalExport');
  showAdminToast('📥 Exported GeoJSON with spatial coordinates.');
}

function exportCSV() {
  const headers = ['Tree ID', 'Species', 'Health Status', 'Latitude', 'Longitude', 'Barangay', 'Municipality', 'Caretaker', 'Landowner', 'Project', 'Last Monitoring', 'Issue'];
  const rows = CURRENT_FILTERED_TREES.map(t => [
    t.id, t.species, t.status, t.lat, t.lng, `"${t.barangay}"`, `"${t.municipality}"`, `"${t.caretaker}"`, `"${t.landowner}"`, `"${t.project}"`, t.lastMonitoring, `"${t.issue}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile('ATAMAN-trees-dataset.csv', csvContent, 'text/csv');
  closeAdminModal('modalExport');
  showAdminToast('📥 Exported CSV dataset with 2,485 records.');
}

function exportReport() {
  const text = `
=====================================================
ATAMAN ADMIN GIS & HEALTH REPORT
Generated: ${new Date().toLocaleString()}
=====================================================
Total Registered Trees: 2,485
🟢 Healthy: 2,051 (82.5%)
🟡 Needs Care: 287 (11.5%)
🔴 Critical: 62 (2.5%)
⚫ Dead: 85 (3.4%)
⏰ Pending Monitoring: 143

CRITICAL HOTSPOT AREAS:
- Brgy. Santiago (21 Critical Cases - Stem Borer Alert)
- Brgy. San Isidro (12 Critical Cases)
- Payao Mangrove Sanctuary (9 Critical Cases)

OPERATIONAL CARETAKERS:
- Pedro Reyes: 485 Trees (Catbalogan Hub)
- Roberto Cruz: 521 Trees (North Ridge)
- Elena Gomez: 392 Trees (East Sector)
=====================================================
  `.trim();

  downloadFile('ATAMAN-admin-report.txt', text, 'text/plain');
  closeAdminModal('modalExport');
  showAdminToast('📥 Exported executive summary report.');
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type: type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─── 11. Toast Notifications ─── */
function showAdminToast(msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'admin-toast';
  toast.innerHTML = `<span>🌳</span> <span>${msg}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
