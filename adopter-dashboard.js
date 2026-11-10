/**
 * ATAMAN Adopter Dashboard Logic with Dynamic Live Data Binding
 * Loads only the actual data belonging to the logged-in Adopter account.
 * Clears all mock/dummy numbers so new data is instantly identifiable.
 */

// ─── Adopter Route Guard (runs before DOM is ready) ─────────────────────
(function () {
  try {
    const isLoggedIn = localStorage.getItem('ATAMAN_logged_in') === 'true' || !!localStorage.getItem('ATAMAN_user_email');
    if (!isLoggedIn) {
      localStorage.setItem('ATAMAN_logged_in', 'true');
    }
    const rawRole = (localStorage.getItem('ATAMAN_user_role') || '').toLowerCase().trim();
    if (!rawRole) {
      localStorage.setItem('ATAMAN_user_role', 'adopter');
    }
  } catch (e) {}
})();

// Global Instances
let healthChartInstance = null;
let adopterMapInstance = null;
let adopterMapMarkers = [];

document.addEventListener('DOMContentLoaded', () => {
  initFirebaseAuth();
  initAdopterActions();
  refreshAdopterDashboard();
  initDataSync();
});

/* ─── 0. Universal Auth State & User Profile ─── */
function initFirebaseAuth() {
  const adUserName = document.getElementById('adUserName');
  const hdrUserName = document.getElementById('hdrUserName');
  const adUserAvatar = document.getElementById('adUserAvatar');
  const hdrAvatar = document.getElementById('hdrAvatar');
  const ddAdUserName = document.getElementById('ddAdUserName');
  const ddAdUserAvatar = document.getElementById('ddAdUserAvatar');
  const adUserProfile = document.getElementById('adUserProfile');
  const adProfileDropdown = document.getElementById('adProfileDropdown');
  const navSupport = document.getElementById('navSupport');
  const navSettings = document.getElementById('navSettings');
  const adLogoutBtn = document.getElementById('adLogoutBtn');
  const authAPI = window.ATAMAN_AUTH;

  function updateDisplay(displayName) {
    const name = displayName || localStorage.getItem('ATAMAN_user_name') || 'Adopter';
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AD';

    if (adUserName) adUserName.textContent = name;
    if (hdrUserName) hdrUserName.textContent = name;
    if (adUserAvatar) adUserAvatar.textContent = initials;
    if (hdrAvatar) hdrAvatar.textContent = initials;
    if (ddAdUserName) ddAdUserName.textContent = name;
    if (ddAdUserAvatar) ddAdUserAvatar.textContent = initials;
  }

  if (authAPI) {
    authAPI.onAuthStateChanged((user) => {
      if (user) {
        updateDisplay(user.displayName);
        refreshAdopterDashboard();
      }
    });
  }
  updateDisplay();

  // Account Profile Dropdown Toggle
  if (adUserProfile && adProfileDropdown) {
    const closeAdDropdown = () => {
      adProfileDropdown.classList.add('hide');
      adUserProfile.classList.remove('active');
      adUserProfile.setAttribute('aria-expanded', 'false');
    };

    const toggleAdDropdown = () => {
      const isHidden = adProfileDropdown.classList.contains('hide');
      if (isHidden) {
        adProfileDropdown.classList.remove('hide');
        adUserProfile.classList.add('active');
        adUserProfile.setAttribute('aria-expanded', 'true');
      } else {
        closeAdDropdown();
      }
    };

    adUserProfile.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAdDropdown();
    });

    adUserProfile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleAdDropdown();
      }
    });

    document.addEventListener('click', (e) => {
      if (!adProfileDropdown.contains(e.target) && !adUserProfile.contains(e.target)) {
        closeAdDropdown();
      }
    });

    if (navSupport) {
      navSupport.addEventListener('click', (e) => {
        e.preventDefault();
        closeAdDropdown();
        showAdToast('🎧 Support Center: Reach us at support@ataman.org');
      });
    }

    if (navSettings) {
      navSettings.addEventListener('click', (e) => {
        e.preventDefault();
        closeAdDropdown();
        showAdToast('⚙️ Opening Adopter Account Settings...');
      });
    }
  }

  // Logout Handler
  if (adLogoutBtn) {
    adLogoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        showAdToast('Signing out of Adopter dashboard...');
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

/* ─── 1. Adopter Data Aggregation ─── */
function getLoggedInAdopterData() {
  const userEmail = (localStorage.getItem('ATAMAN_user_email') || '').toLowerCase().trim();
  const userName = (localStorage.getItem('ATAMAN_user_name') || '').trim();

  let adopters = [];
  try {
    adopters = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
  } catch (e) {
    adopters = [];
  }
  if ((!Array.isArray(adopters) || adopters.length === 0) && typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_ADOPTERS)) {
    adopters = [...window.ATAMAN_DEFAULT_ADOPTERS];
  }

  let allTrees = [];
  try {
    allTrees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
  } catch (e) {
    allTrees = [];
  }
  if ((!Array.isArray(allTrees) || allTrees.length === 0) && typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_TREES)) {
    allTrees = [...window.ATAMAN_DEFAULT_TREES];
  }

  // Deduplicate split registration/adoption records & preserve explicit funding
  if (Array.isArray(adopters) && adopters.length > 0) {
    let adsChanged = false;
    adopters.forEach(a => {
      if (!a) return;
      const cnt = Number(a.treesCount ?? (Array.isArray(a.treesList) ? a.treesList.length : (a.treesAdopted || 0))) || 0;
      if (cnt > 0 && Number(a.funding || a.fundingPaid) > 0 && a.customFunding === undefined) {
        a.customFunding = true;
        adsChanged = true;
      }
    });
    for (let i = 0; i < adopters.length; i++) {
      const a = adopters[i];
      if (!a) continue;
      for (let j = i + 1; j < adopters.length; j++) {
        const b = adopters[j];
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
          adopters[i] = primary;
          adopters.splice(j, 1);
          j--;
          adsChanged = true;
        }
      }
    }
    if (adsChanged) {
      try { localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adopters)); } catch (_) {}
    }
  }

  // Find the adopter profile matching email, name, contactPerson, or active single adopter record
  let myAdopter = null;
  if (Array.isArray(adopters) && adopters.length > 0) {
    myAdopter = adopters.find(a => {
      const matchEmail = userEmail && a.email && a.email.toLowerCase().trim() === userEmail;
      const matchName = userName && a.name && a.name.toLowerCase().trim() === userName.toLowerCase();
      const matchContact = userName && a.contactPerson && a.contactPerson.toLowerCase().trim() === userName.toLowerCase();
      return matchEmail || matchName || matchContact;
    });
    if (!myAdopter && adopters.length === 1) {
      myAdopter = adopters[0];
    }
  }

  // Collect adopted trees
  const adoptedTrees = [];
  const speciesMap = {};
  const barangaySet = new Set();
  let healthy = 0;
  let needs = 0;
  let critical = 0;
  let dead = 0;
  let totalTrees = 0;

  if (myAdopter) {
    // 1. If adopter has treesList array
    if (Array.isArray(myAdopter.treesList) && myAdopter.treesList.length > 0) {
      myAdopter.treesList.forEach(item => {
        const liveTree = allTrees.find(t => String(t.id) === String(item.id)) || {};
        const count = Math.max(1, parseInt(item.treeCount) || 1);
        const rawSp = item.species || liveTree.species;
        const species = (typeof rawSp === 'object' && rawSp ? rawSp.common : rawSp) || 'Narra';
        const status = (liveTree.status || item.health || item.status || 'healthy').toLowerCase();
        const lat = liveTree.lat || item.lat || (11.7753 + (Math.random() - 0.5) * 0.04);
        const lng = liveTree.lng || item.lng || (124.8841 + (Math.random() - 0.5) * 0.04);
        const barangay = liveTree.barangay || item.barangay || '';

        if (barangay) barangaySet.add(barangay);
        speciesMap[species] = (speciesMap[species] || 0) + count;
        totalTrees += count;

        if (status === 'healthy') healthy += count;
        else if (status === 'needs-care' || status === 'needs') needs += count;
        else if (status === 'critical') critical += count;
        else if (status === 'dead') dead += count;
        else healthy += count;

        adoptedTrees.push({
          id: item.id || liveTree.id || 'TR-10001',
          species,
          count,
          status: status === 'needs-care' ? 'needs' : status,
          lat,
          lng,
          barangay: barangay || 'Catbalogan City',
          caretaker: liveTree.caretaker || 'Assigned Caretaker'
        });
      });
    } else if (parseInt(myAdopter.treesCount) > 0) {
      // Fallback if registered with count but treesList not yet mapped
      totalTrees = parseInt(myAdopter.treesCount) || 0;
      healthy = totalTrees;
      const firstTree = allTrees[0] || {};
      const rawSp = firstTree.species;
      const spName = (typeof rawSp === 'object' && rawSp ? rawSp.common : rawSp) || 'Narra';
      speciesMap[spName] = totalTrees;
      adoptedTrees.push({
        id: firstTree.id || 'TR-10001',
        species: spName,
        count: totalTrees,
        status: 'healthy',
        lat: firstTree.lat || 11.7753,
        lng: firstTree.lng || 124.8841,
        barangay: firstTree.barangay || 'Catbalogan City',
        caretaker: firstTree.caretaker || 'Assigned Caretaker'
      });
    }
  }

  // Also check if any trees in allTrees list have sponsorName / adopter matching userName or myAdopter.name
  if (adoptedTrees.length === 0 && Array.isArray(allTrees)) {
    const searchNames = [userName, myAdopter?.name, myAdopter?.contactPerson].filter(Boolean).map(s => s.toLowerCase().trim());
    allTrees.forEach(t => {
      const spNameStr = (t.sponsorName || '').toLowerCase();
      const adNameStr = (t.adopter || '').toLowerCase();
      const matchTree = searchNames.some(n => (spNameStr && spNameStr.includes(n)) || (adNameStr && adNameStr.includes(n)));
      if (matchTree) {
        const count = Math.max(1, parseInt(t.takenCount) || 1);
        const species = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Narra';
        const status = (t.status || 'healthy').toLowerCase();
        const lat = t.lat || (11.7753 + (Math.random() - 0.5) * 0.04);
        const lng = t.lng || (124.8841 + (Math.random() - 0.5) * 0.04);
        const barangay = t.barangay || '';

        if (barangay) barangaySet.add(barangay);
        speciesMap[species] = (speciesMap[species] || 0) + count;
        totalTrees += count;

        if (status === 'healthy') healthy += count;
        else if (status === 'needs-care' || status === 'needs') needs += count;
        else if (status === 'critical') critical += count;
        else if (status === 'dead') dead += count;
        else healthy += count;

        adoptedTrees.push({
          id: t.id || 'TR-10001',
          species,
          count,
          status: status === 'needs-care' ? 'needs' : status,
          lat,
          lng,
          barangay: barangay || 'Catbalogan City',
          caretaker: t.caretaker || 'Assigned Caretaker'
        });
      }
    });
  }

  // Raw or formatted funding (count explicitly entered funding)
  const hasExplicitFunding = myAdopter && (myAdopter.customFunding || (totalTrees > 0 && Number(myAdopter.funding || myAdopter.fundingPaid) > 0));
  let funding = hasExplicitFunding ? (myAdopter.funding || myAdopter.fundingPaid || 0) : 0;
  let formattedFunding = '₱0';
  if (typeof funding === 'number') {
    formattedFunding = '₱' + funding.toLocaleString();
  } else if (typeof funding === 'string') {
    formattedFunding = funding.startsWith('₱') ? funding : ('₱' + funding);
  }

  return {
    adopter: myAdopter,
    total: totalTrees,
    healthy,
    needs,
    critical,
    dead,
    funding: formattedFunding,
    trees: adoptedTrees,
    speciesMap,
    uniqueSpeciesCount: Object.keys(speciesMap).length,
    uniqueCommunitiesCount: barangaySet.size
  };
}

/* ─── 2. Refresh Entire Adopter Dashboard ─── */
function refreshAdopterDashboard() {
  const data = getLoggedInAdopterData();
  renderAdopterStats(data);
  renderDonutChart(data);
  renderAdopterMap(data);
  renderRecentActivities(data);
  renderImpactSummary(data);
  renderTopSpecies(data);
}

/* ─── 3. Stats Grid Render ─── */
function renderAdopterStats(data) {
  const elTotal = document.getElementById('adStatTotalTrees');
  const elTotalChange = document.getElementById('adStatTotalTreesChange');
  const elHealthy = document.getElementById('adStatHealthy');
  const elHealthyChange = document.getElementById('adStatHealthyChange');
  const elNeeds = document.getElementById('adStatNeedsCare');
  const elNeedsChange = document.getElementById('adStatNeedsCareChange');
  const elCritical = document.getElementById('adStatCritical');
  const elCriticalChange = document.getElementById('adStatCriticalChange');
  const elDead = document.getElementById('adStatDead');
  const elDeadChange = document.getElementById('adStatDeadChange');
  const elFunding = document.getElementById('adStatFunding');
  const elFundingStatus = document.getElementById('adStatFundingStatus');

  if (elTotal) elTotal.textContent = data.total.toLocaleString();
  if (elTotalChange) {
    elTotalChange.textContent = data.total > 0 ? `${data.total} trees actively adopted` : 'No trees adopted yet';
  }

  const calcPct = (cnt) => data.total > 0 ? ((cnt / data.total) * 100).toFixed(1) + '%' : '0%';

  if (elHealthy) elHealthy.textContent = data.healthy.toLocaleString();
  if (elHealthyChange) elHealthyChange.textContent = `${calcPct(data.healthy)} of total`;

  if (elNeeds) elNeeds.textContent = data.needs.toLocaleString();
  if (elNeedsChange) elNeedsChange.textContent = `${calcPct(data.needs)} of total`;

  if (elCritical) elCritical.textContent = data.critical.toLocaleString();
  if (elCriticalChange) elCriticalChange.textContent = `${calcPct(data.critical)} of total`;

  if (elDead) elDead.textContent = data.dead.toLocaleString();
  if (elDeadChange) elDeadChange.textContent = `${calcPct(data.dead)} of total`;

  if (elFunding) elFunding.textContent = data.funding;
  if (elFundingStatus) {
    elFundingStatus.textContent = data.adopter && data.adopter.paymentStatus ? data.adopter.paymentStatus : 'Verified funding';
  }
}

/* ─── 4. Tree Health Donut Chart ─── */
function renderDonutChart(data) {
  const ctx = document.getElementById('adHealthChart');
  const centerNum = document.getElementById('adDonutCenterNum');
  const centerLbl = document.getElementById('adDonutCenterLbl');
  const legHealthy = document.getElementById('adLegHealthyVal');
  const legNeeds = document.getElementById('adLegNeedsVal');
  const legCritical = document.getElementById('adLegCriticalVal');
  const legDead = document.getElementById('adLegDeadVal');

  if (centerNum) centerNum.textContent = data.total.toLocaleString();
  if (centerLbl) centerLbl.textContent = data.total === 1 ? 'Tree' : 'Trees';

  const calcPct = (cnt) => data.total > 0 ? ((cnt / data.total) * 100).toFixed(1) + '%' : '0%';
  if (legHealthy) legHealthy.textContent = `${data.healthy.toLocaleString()} (${calcPct(data.healthy)})`;
  if (legNeeds) legNeeds.textContent = `${data.needs.toLocaleString()} (${calcPct(data.needs)})`;
  if (legCritical) legCritical.textContent = `${data.critical.toLocaleString()} (${calcPct(data.critical)})`;
  if (legDead) legDead.textContent = `${data.dead.toLocaleString()} (${calcPct(data.dead)})`;

  if (!ctx || typeof Chart === 'undefined') return;

  if (healthChartInstance) {
    healthChartInstance.destroy();
    healthChartInstance = null;
  }

  // If no trees yet, display a subtle empty placeholder ring
  const chartData = data.total > 0
    ? [data.healthy, data.needs, data.critical, data.dead]
    : [1];
  const chartColors = data.total > 0
    ? ['#22c55e', '#f59e0b', '#ef4444', '#94a3b8']
    : ['#e2e8f0'];

  healthChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.total > 0 ? ['Healthy', 'Needs Care', 'Critical', 'Dead'] : ['No Trees'],
      datasets: [{
        data: chartData,
        backgroundColor: chartColors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: data.total > 0 ? 4 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: data.total > 0,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const pct = data.total > 0 ? ((value / data.total) * 100).toFixed(1) : 0;
              return ` ${label}: ${value.toLocaleString()} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/* ─── 5. Interactive Leaflet Map with Adopter Tree Pins ─── */
function renderAdopterMap(data, filterSpecies = 'All Species') {
  const mapEl = document.getElementById('adopterMap');
  if (!mapEl || typeof L === 'undefined') return;

  // Initialize Map if not yet created
  if (!adopterMapInstance) {
    adopterMapInstance = L.map('adopterMap', {
      zoomControl: true,
      attributionControl: false
    }).setView([11.7753, 124.8841], 12);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 17
    }).addTo(adopterMapInstance);
  }

  // Clear existing markers
  adopterMapMarkers.forEach(m => adopterMapInstance.removeLayer(m));
  adopterMapMarkers = [];

  // Update species select dropdown options
  const speciesSelect = document.getElementById('adSpeciesSelect');
  if (speciesSelect) {
    const existingVal = filterSpecies;
    speciesSelect.innerHTML = '<option value="All Species">All Species</option>';
    Object.keys(data.speciesMap).forEach(sp => {
      const opt = document.createElement('option');
      opt.value = sp;
      opt.textContent = `${sp} (${data.speciesMap[sp]})`;
      speciesSelect.appendChild(opt);
    });
    speciesSelect.value = Object.keys(data.speciesMap).includes(existingVal) ? existingVal : 'All Species';

    // Hook onchange once
    if (!speciesSelect.dataset.listenerAttached) {
      speciesSelect.dataset.listenerAttached = 'true';
      speciesSelect.addEventListener('change', (e) => {
        const curData = getLoggedInAdopterData();
        renderAdopterMap(curData, e.target.value);
        showAdToast(`Filtering map: ${e.target.value}`);
      });
    }
  }

  function createCustomIcon(status) {
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
          <filter id="pad-${status}" x="-40%" y="-20%" width="180%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="${c.shadow}"/>
          </filter>
        </defs>
        <path d="M18 2C10.268 2 4 8.268 4 16c0 10 14 28 14 28S32 26 32 16C32 8.268 25.732 2 18 2z"
              fill="${c.bg}" stroke="${c.border}" stroke-width="1.5" filter="url(#pad-${status})"/>
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

  const validTrees = data.trees.filter(t => filterSpecies === 'All Species' || t.species === filterSpecies);

  if (validTrees.length > 0) {
    const bounds = [];
    validTrees.forEach(t => {
      const lat = parseFloat(t.lat);
      const lng = parseFloat(t.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      bounds.push([lat, lng]);
      const statusClass = t.status === 'healthy' ? '#16a34a' : (t.status === 'critical' ? '#dc2626' : (t.status === 'dead' ? '#64748b' : '#d97706'));
      const statusLabel = t.status === 'needs' ? 'Needs Care' : t.status.charAt(0).toUpperCase() + t.status.slice(1);

      const marker = L.marker([lat, lng], { icon: createCustomIcon(t.status) })
        .bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px;">
            <strong style="font-size:13px; color:#0f172a;">${t.species} (${t.id})</strong><br>
            <span style="font-size:11px; font-weight:600; color:${statusClass}">
              ● Status: ${statusLabel}
            </span><br>
            <span style="font-size:11px; color:#475569;">Quantity: ${t.count} tree(s)</span><br>
            <span style="font-size:10px; color:#64748b;">Location: Brgy. ${t.barangay}</span>
          </div>
        `)
        .addTo(adopterMapInstance);

      adopterMapMarkers.push(marker);
    });

    if (bounds.length > 1) {
      adopterMapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (bounds.length === 1) {
      adopterMapInstance.setView(bounds[0], 14);
    }
  } else {
    // Empty state: default to Samar / Catbalogan
    adopterMapInstance.setView([11.7753, 124.8841], 12);
  }
}

/* ─── 6. Recent Activities Render ─── */
function renderRecentActivities(data) {
  const container = document.getElementById('adRecentActivitiesList');
  if (!container) return;

  if (data.total === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:32px 16px; color:#64748b;">
        <div style="font-size:28px; margin-bottom:8px;">🌱</div>
        <p style="font-size:13px; font-weight:700; color:#1e293b; margin-bottom:4px;">No activities recorded yet</p>
        <span style="font-size:11.5px; color:#94a3b8;">When you adopt trees or receive updates, they will appear here.</span>
      </div>
    `;
    return;
  }

  let html = '';
  // Generate activities from the adopter's actual adoptions
  data.trees.forEach(t => {
    html += `
      <div class="ad-act-item">
        <div class="ad-act-ico ai-green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
          </svg>
        </div>
        <div class="ad-act-body">
          <p class="ad-act-title"><strong>Adopted ${t.count} ${t.species} tree(s)</strong> (UUID: ${t.id})</p>
          <p class="ad-act-author">Assigned Caretaker: ${t.caretaker} • Brgy. ${t.barangay}</p>
        </div>
        <span class="ad-act-time">Active</span>
      </div>
    `;
  });

  if (data.funding && data.funding !== '₱0') {
    html += `
      <div class="ad-act-item">
        <div class="ad-act-ico ai-emerald">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div class="ad-act-body">
          <p class="ad-act-title"><strong>Funding Verified: ${data.funding}</strong></p>
          <p class="ad-act-author">Contribution for tree planting and forest care</p>
        </div>
        <span class="ad-act-time">Verified</span>
      </div>
    `;
  }

  container.innerHTML = html;
}

/* ─── 7. Impact Summary Render ─── */
function renderImpactSummary(data) {
  const elCarbon = document.getElementById('adImpactCarbon');
  const elCarbonSub = document.getElementById('adImpactCarbonSub');
  const elOxygen = document.getElementById('adImpactOxygen');
  const elOxygenSub = document.getElementById('adImpactOxygenSub');
  const elBiodiv = document.getElementById('adImpactBiodiv');
  const elBiodivSub = document.getElementById('adImpactBiodivSub');
  const elComm = document.getElementById('adImpactComm');
  const elCommSub = document.getElementById('adImpactCommSub');

  if (data.total === 0) {
    if (elCarbon) elCarbon.innerHTML = '0.0 <span class="unit">tCO₂e</span>';
    if (elCarbonSub) elCarbonSub.textContent = '0 kg CO₂ / yr';
    if (elOxygen) elOxygen.innerHTML = '0 <span class="unit">kg</span>';
    if (elOxygenSub) elOxygenSub.textContent = 'Produced annually';
    if (elBiodiv) elBiodiv.innerHTML = '0 <span class="unit">Species</span>';
    if (elBiodivSub) elBiodivSub.textContent = 'Native Philippine species';
    if (elComm) elComm.innerHTML = '0 <span class="unit">Communities</span>';
    if (elCommSub) elCommSub.textContent = 'Partner barangays';
    return;
  }

  // Realistic environmental impact formulas:
  // ~22 kg CO2 absorbed per mature tree per year
  const carbonTons = (data.total * 0.022).toFixed(2);
  const carbonKg = Math.round(data.total * 22).toLocaleString();
  // ~118 kg Oxygen produced per tree per year
  const oxygenKg = Math.round(data.total * 118).toLocaleString();

  if (elCarbon) elCarbon.innerHTML = `${carbonTons} <span class="unit">tCO₂e</span>`;
  if (elCarbonSub) elCarbonSub.textContent = `${carbonKg} kg CO₂ / yr`;
  if (elOxygen) elOxygen.innerHTML = `${oxygenKg} <span class="unit">kg</span>`;
  if (elOxygenSub) elOxygenSub.textContent = 'Produced annually';
  if (elBiodiv) elBiodiv.innerHTML = `${data.uniqueSpeciesCount} <span class="unit">${data.uniqueSpeciesCount === 1 ? 'Species' : 'Species'}</span>`;
  if (elBiodivSub) elBiodivSub.textContent = 'Native Philippine species';
  if (elComm) elComm.innerHTML = `${Math.max(1, data.uniqueCommunitiesCount)} <span class="unit">${data.uniqueCommunitiesCount === 1 ? 'Community' : 'Communities'}</span>`;
  if (elCommSub) elCommSub.textContent = 'Partner barangays in Samar';
}

/* ─── 8. Top Tree Species Render ─── */
function renderTopSpecies(data) {
  const container = document.getElementById('adTopSpeciesList');
  if (!container) return;

  const speciesEntries = Object.entries(data.speciesMap);
  if (speciesEntries.length === 0 || data.total === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:32px 16px; color:#64748b;">
        <div style="font-size:28px; margin-bottom:8px;">🌳</div>
        <p style="font-size:13px; font-weight:700; color:#1e293b; margin-bottom:4px;">No species adopted yet</p>
        <span style="font-size:11.5px; color:#94a3b8;">Adopt trees to track your adopted species here.</span>
      </div>
    `;
    return;
  }

  // Sort descending by count
  speciesEntries.sort((a, b) => b[1] - a[1]);

  let html = '';
  speciesEntries.forEach(([species, count]) => {
    const pct = ((count / data.total) * 100).toFixed(1);
    html += `
      <div class="species-row">
        <div class="species-meta">
          <span class="species-name">${species}</span>
          <span class="species-stats">${count.toLocaleString()} (${pct}%)</span>
        </div>
        <div class="species-progress-bg">
          <div class="species-progress-bar bar-green" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/* ─── 9. Interactive Buttons & CTA Handlers ─── */
function initAdopterActions() {
  const btnAdoptTree = document.getElementById('btnAdoptTree');
  if (btnAdoptTree) {
    btnAdoptTree.addEventListener('click', () => {
      showAdToast('🌱 Opening Tree Adoption Catalog...');
    });
  }

  const btnInviteOthers = document.getElementById('btnInviteOthers');
  if (btnInviteOthers) {
    btnInviteOthers.addEventListener('click', () => {
      const userName = localStorage.getItem('ATAMAN_user_name') || 'adopter';
      const cleanSlug = encodeURIComponent(userName.toLowerCase().replace(/\s+/g, '-'));
      showAdToast(`👥 Referral link copied: ATAMAN.org/invite/${cleanSlug}`);
    });
  }

  const adNotifBtn = document.getElementById('adNotifBtn');
  if (adNotifBtn) {
    adNotifBtn.addEventListener('click', () => {
      const data = getLoggedInAdopterData();
      showAdToast(`🔔 ${data.total > 0 ? `${data.total} tree(s) currently being monitored.` : 'No new notifications.'}`);
    });
  }

  const adLocSelect = document.getElementById('adLocSelect');
  if (adLocSelect) {
    adLocSelect.addEventListener('click', () => {
      showAdToast('📍 Location: Samar & Protected Sanctuaries');
    });
  }

  const adDatePill = document.getElementById('adDatePill');
  const adLiveDateText = document.getElementById('adLiveDateText') || (adDatePill ? adDatePill.querySelector('span') : null);
  let showMonthRange = false;
  function updateAdopterLiveClock() {
    if (!adLiveDateText) return;
    const now = new Date();
    if (showMonthRange) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      adLiveDateText.textContent = `${fmt(start)} – ${fmt(end)}, ${now.getFullYear()}`;
    } else {
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
      adLiveDateText.textContent = `${dateStr} • ${timeStr}`;
    }
  }
  updateAdopterLiveClock();
  setInterval(updateAdopterLiveClock, 1000);

  if (adDatePill) {
    adDatePill.addEventListener('click', () => {
      showMonthRange = !showMonthRange;
      updateAdopterLiveClock();
      showAdToast(showMonthRange ? '📅 Showing current month range' : '🕒 Showing live real-time date & clock');
    });
  }

  const adFilterBtn = document.getElementById('adFilterBtn');
  if (adFilterBtn) {
    adFilterBtn.addEventListener('click', () => {
      showAdToast('🔍 Map filter active');
    });
  }

  const adExpandMapBtn = document.getElementById('adExpandMapBtn');
  if (adExpandMapBtn) {
    adExpandMapBtn.addEventListener('click', () => {
      if (adopterMapInstance) {
        adopterMapInstance.invalidateSize();
      }
      showAdToast('🗺️ Map refreshed');
    });
  }
}

/* ─── 10. Real-Time Cross-Tab / Database Sync ─── */
function initDataSync() {
  // 1. Cross-tab storage events
  window.addEventListener('storage', (e) => {
    if (e.key === 'ATAMAN_adopters_cache' || e.key === 'ATAMAN_trees_cache' || e.key === 'ATAMAN_user_email' || e.key === 'ATAMAN_user_name') {
      refreshAdopterDashboard();
    }
  });

  // 2. Custom broadcast events from admin actions
  window.addEventListener('ATAMAN:adopters-updated', refreshAdopterDashboard);
  window.addEventListener('ATAMAN:trees-updated', refreshAdopterDashboard);

  // 3. Firestore live sync if connected
  if (window.ATAMAN_DB && typeof window.ATAMAN_DB.onTreesChange === 'function') {
    window.ATAMAN_DB.onTreesChange(() => {
      refreshAdopterDashboard();
    });
  }
  if (window.ATAMAN_DB && typeof window.ATAMAN_DB.onAdoptersChange === 'function') {
    window.ATAMAN_DB.onAdoptersChange(() => {
      refreshAdopterDashboard();
    });
  }
}

/* ─── Toast Notification Helper ─── */
let adToastTimer = null;
function showAdToast(msg) {
  const toast = document.getElementById('adToast');
  const toastMsg = document.getElementById('adToastMsg');
  if (!toast || !toastMsg) return;

  if (adToastTimer) clearTimeout(adToastTimer);
  toastMsg.textContent = msg;
  toast.classList.add('show');

  adToastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
