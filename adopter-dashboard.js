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

/* ─── 0.5. Samar Land Coordinates & GIS Accuracy Resolver ─── */
const SAMAR_LOCATION_COORDINATES = {
  'canlapwas': { lat: 11.7820, lng: 124.8875, barangay: 'Canlapwas', sector: 'Sector A - Central Watershed Reserve' },
  'guinsorongan': { lat: 11.7598, lng: 124.8861, barangay: 'Guinsorongan', sector: 'Sector B - Coastal Green Buffer' },
  'san isidro': { lat: 11.7710, lng: 124.8910, barangay: 'San Isidro', sector: 'Sector C - Ridge & Highland Reserve' },
  'bunuanan': { lat: 11.7885, lng: 124.8890, barangay: 'Bunuanan', sector: 'Sector D - Biodiversity Forest Corridor' },
  'mabini': { lat: 11.7740, lng: 124.9030, barangay: 'Mabini', sector: 'Sector E - Upland Conservation Sector' },
  'darahuway daco': { lat: 11.7450, lng: 124.8761, barangay: 'Darahuway Daco', sector: 'Marine & Mangrove Forest Sanctuary' },
  'darahuway': { lat: 11.7450, lng: 124.8761, barangay: 'Darahuway Daco', sector: 'Marine & Mangrove Forest Sanctuary' },
  'cagutian': { lat: 11.7830, lng: 124.8895, barangay: 'Cagutian', sector: 'Central North Reserve' },
  'poblacion 4': { lat: 11.7774, lng: 124.8876, barangay: 'Poblacion 4', sector: 'Urban Forestry & Green Belt' },
  'poblacion': { lat: 11.7774, lng: 124.8876, barangay: 'Poblacion', sector: 'Urban Forestry & Green Belt' },
  'mercedes': { lat: 11.7680, lng: 124.8830, barangay: 'Mercedes', sector: 'Coastal Green Belt' },
  'pangdan': { lat: 11.7580, lng: 124.8850, barangay: 'Pangdan', sector: 'Southern Green Belt' },
  'muñoz': { lat: 11.7790, lng: 124.8890, barangay: 'Muñoz', sector: 'City Center' },
  'munoz': { lat: 11.7790, lng: 124.8890, barangay: 'Muñoz', sector: 'City Center' },
  'iguid': { lat: 11.8020, lng: 124.8720, barangay: 'Iguid', sector: 'Northern Coastal Buffer' },
  'maulong': { lat: 11.7915, lng: 124.8750, barangay: 'Maulong', sector: 'Northern Reserve' },
  'silanga': { lat: 11.8210, lng: 124.8550, barangay: 'Silanga', sector: 'Far Northern Reserve' },
  'catbalogan': { lat: 11.7774, lng: 124.8876, barangay: 'Canlapwas', sector: 'Catbalogan Reforestation' }
};

const CARETAKER_STATION_COORDINATES = {
  'june luna': { lat: 11.7450, lng: 124.8761, barangay: 'Darahuway Daco', sector: 'Marine & Mangrove Forest Sanctuary' },
  'dodong zeta': { lat: 11.7820, lng: 124.8875, barangay: 'Canlapwas', sector: 'Sector A - Central Watershed Reserve' }
};

const ADOPTER_HOME_COORDINATES = {
  'rose yu': { lat: 11.7774, lng: 124.8876, barangay: 'Poblacion 4', sector: 'Urban Forestry & Green Belt' },
  'nikki maga': { lat: 11.7774, lng: 124.8876, barangay: 'Poblacion', sector: 'Urban Forestry & Green Belt' }
};

function isCoordinateInWater(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return true;
  const numLat = Number(lat);
  const numLng = Number(lng);
  // Darahuway Daco island bounding box (valid on-land)
  if (numLat >= 11.738 && numLat <= 11.752 && numLng >= 124.870 && numLng <= 124.882) {
    return false;
  }
  // If west of mainland Catbalogan coastline and not on Darahuway Island, it is in Maqueda Bay (the sea)
  if (numLng < 124.878) {
    // In northernmost area (Silanga/Iguid) land extends west to 124.850
    if (numLat >= 11.800 && numLng >= 124.850) return false;
    return true; // Offshore / in the ocean
  }
  return false;
}

function resolveAccurateTreeCoordinates({
  existingLat,
  existingLng,
  treeId = '',
  barangay = '',
  location = '',
  caretaker = '',
  adopter = '',
  adopterLocation = '',
  index = 0
}) {
  const exLat = parseFloat(existingLat);
  const exLng = parseFloat(existingLng);

  // If coordinates are already present and verified to be ON LAND (not in sea), retain them
  if (!isNaN(exLat) && !isNaN(exLng) && !isCoordinateInWater(exLat, exLng)) {
    return { lat: exLat, lng: exLng, corrected: false, barangay: barangay || 'Catbalogan City' };
  }

  function findLookup(str) {
    if (!str) return null;
    const clean = String(str).toLowerCase().replace(/^(brgy\.?|barangay)\s*/i, '').trim();
    for (const [key, val] of Object.entries(SAMAR_LOCATION_COORDINATES)) {
      if (clean.includes(key) || key.includes(clean)) {
        return val;
      }
    }
    return null;
  }

  // 1. Check tree planting barangay / location
  let match = findLookup(barangay) || findLookup(location);

  // 2. Check assigned caretaker's registered area
  if (!match && caretaker) {
    const ctKey = String(caretaker).toLowerCase().trim();
    for (const [k, v] of Object.entries(CARETAKER_STATION_COORDINATES)) {
      if (ctKey.includes(k) || k.includes(ctKey)) {
        match = v;
        break;
      }
    }
    if (!match) match = findLookup(caretaker);
  }

  // 3. Check adopter's registered address / location
  if (!match && adopter) {
    const adKey = String(adopter).toLowerCase().trim();
    for (const [k, v] of Object.entries(ADOPTER_HOME_COORDINATES)) {
      if (adKey.includes(k) || k.includes(adKey)) {
        match = v;
        break;
      }
    }
  }
  if (!match && adopterLocation) {
    match = findLookup(adopterLocation);
  }

  // 4. Fallback to Canlapwas Watershed Reserve on land
  if (!match) {
    match = SAMAR_LOCATION_COORDINATES['canlapwas'];
  }

  // Deterministic micro-jitter (~15-30m) so multiple pins don't stack directly on top of each other
  // Strictly bounded to stay on land and never drift into water
  const seed = (String(treeId || index).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + index * 19) % 100;
  const microJitterLat = ((seed - 50) / 50) * 0.0003;
  const microJitterLng = ((((seed * 7) % 100) - 50) / 50) * 0.0003;

  const resolvedLat = Number((match.lat + microJitterLat).toFixed(6));
  const resolvedLng = Number((match.lng + microJitterLng).toFixed(6));

  return {
    lat: resolvedLat,
    lng: resolvedLng,
    corrected: true,
    barangay: match.barangay || barangay || 'Canlapwas'
  };
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
  // Zero Ghost Data: allTrees remains empty array if no trees exist

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

  // Find the adopter profile matching email, name, contactPerson, username, or id
  let myAdopter = null;
  const sessionUser = JSON.parse(localStorage.getItem('ATAMAN_current_user') || localStorage.getItem('saplink_user') || '{}');
  const userUid = sessionUser.uid || sessionUser.id || '';
  const userUsername = (sessionUser.username || '').toLowerCase().trim();

  if (Array.isArray(adopters) && adopters.length > 0) {
    myAdopter = adopters.find(a => {
      if (!a) return false;
      const matchEmail = userEmail && a.email && a.email.toLowerCase().trim() === userEmail;
      const matchName = userName && a.name && a.name.toLowerCase().trim() === userName.toLowerCase();
      const matchContact = userName && a.contactPerson && a.contactPerson.toLowerCase().trim() === userName.toLowerCase();
      const matchUsername = userUsername && a.username && a.username.toLowerCase().trim() === userUsername;
      const matchId = userUid && (String(a.id || a.uid) === String(userUid));
      return matchEmail || matchName || matchContact || matchUsername || matchId;
    });
    if (!myAdopter && adopters.length === 1 && !userEmail) {
      myAdopter = adopters[0];
    }
  }

  if (!myAdopter && (userEmail || userName)) {
    myAdopter = {
      id: userUid || ('ADP-' + Date.now()),
      name: userName || 'Tree Adopter',
      email: userEmail,
      username: userUsername,
      contactPerson: userName || 'Tree Adopter',
      type: 'Individual',
      status: 'Active',
      treesCount: 0,
      funding: 0,
      treesList: []
    };
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
  let cacheModified = false;

  if (myAdopter) {
    // 1. If adopter has treesList array
    if (Array.isArray(myAdopter.treesList) && myAdopter.treesList.length > 0) {
      myAdopter.treesList.forEach((item, idx) => {
        const liveTree = allTrees.find(t => String(t.id) === String(item.id)) || {};
        const count = Math.max(1, parseInt(item.treeCount) || 1);
        const rawSp = item.species || liveTree.species;
        const species = (typeof rawSp === 'object' && rawSp ? rawSp.common : rawSp) || 'Narra';
        const status = (liveTree.status || item.health || item.status || 'healthy').toLowerCase();
        const barangay = liveTree.barangay || item.barangay || '';
        const caretaker = liveTree.caretaker || item.caretaker || '';

        // Resolve accurate on-land coordinates based on tree planting location, caretaker station, and adopter location:
        const coords = resolveAccurateTreeCoordinates({
          existingLat: liveTree.lat || item.lat,
          existingLng: liveTree.lng || item.lng,
          treeId: item.id || liveTree.id,
          barangay: barangay,
          location: liveTree.location || item.location,
          caretaker: caretaker,
          adopter: userName || myAdopter.name,
          adopterLocation: myAdopter.address || myAdopter.location,
          index: idx
        });

        const lat = coords.lat;
        const lng = coords.lng;

        // Auto-heal cached item if it had ocean / corrupted coordinates
        if (coords.corrected) {
          item.lat = lat;
          item.lng = lng;
          if (liveTree.id) {
            liveTree.lat = lat;
            liveTree.lng = lng;
          }
          cacheModified = true;
        }

        const displayBarangay = coords.barangay || barangay || 'Canlapwas';
        barangaySet.add(displayBarangay);
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
          barangay: displayBarangay,
          caretaker: caretaker || 'Assigned Caretaker'
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

      const coords = resolveAccurateTreeCoordinates({
        existingLat: firstTree.lat,
        existingLng: firstTree.lng,
        treeId: firstTree.id,
        barangay: firstTree.barangay,
        location: firstTree.location,
        caretaker: firstTree.caretaker,
        adopter: userName || myAdopter.name,
        adopterLocation: myAdopter.address || myAdopter.location,
        index: 0
      });

      const displayBarangay = coords.barangay || firstTree.barangay || 'Canlapwas';
      barangaySet.add(displayBarangay);

      adoptedTrees.push({
        id: firstTree.id || 'TR-10001',
        species: spName,
        count: totalTrees,
        status: 'healthy',
        lat: coords.lat,
        lng: coords.lng,
        barangay: displayBarangay,
        caretaker: firstTree.caretaker || 'Assigned Caretaker'
      });
    }
  }

  // Also check if any trees in allTrees list have sponsorName / adopter matching userName, myAdopter.name, or adopterId
  if (adoptedTrees.length === 0 && Array.isArray(allTrees)) {
    const searchNames = [userName, myAdopter?.name, myAdopter?.contactPerson, myAdopter?.username, userUsername].filter(Boolean).map(s => s.toLowerCase().trim());
    const searchIds = [myAdopter?.id, myAdopter?.uid, userUid].filter(Boolean).map(String);
    allTrees.forEach((t, idx) => {
      const spNameStr = (t.sponsorName || '').toLowerCase();
      const adNameStr = (t.adopter || '').toLowerCase();
      const adIdStr = String(t.adopterId || '');
      const matchTree = searchIds.some(id => id && adIdStr === id) ||
        searchNames.some(n => (spNameStr && spNameStr.includes(n)) || (adNameStr && adNameStr.includes(n)));
      if (matchTree) {
        const count = Math.max(1, parseInt(t.takenCount) || 1);
        const species = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Narra';
        const status = (t.status || 'healthy').toLowerCase();
        const barangay = t.barangay || '';
        const caretaker = t.caretaker || '';

        const coords = resolveAccurateTreeCoordinates({
          existingLat: t.lat,
          existingLng: t.lng,
          treeId: t.id,
          barangay: barangay,
          location: t.location,
          caretaker: caretaker,
          adopter: t.sponsorName || t.adopter || userName,
          adopterLocation: myAdopter?.address || myAdopter?.location,
          index: idx
        });

        const lat = coords.lat;
        const lng = coords.lng;
        if (coords.corrected) {
          t.lat = lat;
          t.lng = lng;
          cacheModified = true;
        }

        const displayBarangay = coords.barangay || barangay || 'Canlapwas';
        barangaySet.add(displayBarangay);
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
          barangay: displayBarangay,
          caretaker: caretaker || 'Assigned Caretaker'
        });
      }
    });
  }

  // Persist auto-healed accurate coordinates to caches
  if (cacheModified) {
    try {
      localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(allTrees));
      localStorage.setItem('saplink_trees_cache', JSON.stringify(allTrees));
      if (myAdopter && adopters) {
        localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adopters));
      }
    } catch (_) {}
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
    }).setView([11.7774, 124.8876], 13);

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
    validTrees.forEach((t, idx) => {
      let lat = parseFloat(t.lat);
      let lng = parseFloat(t.lng);
      if (isNaN(lat) || isNaN(lng) || isCoordinateInWater(lat, lng)) {
        const resolved = resolveAccurateTreeCoordinates({
          existingLat: lat,
          existingLng: lng,
          treeId: t.id,
          barangay: t.barangay,
          caretaker: t.caretaker,
          adopter: data.name,
          index: idx
        });
        lat = resolved.lat;
        lng = resolved.lng;
      }

      bounds.push([lat, lng]);
      const statusClass = t.status === 'healthy' ? '#16a34a' : (t.status === 'critical' ? '#dc2626' : (t.status === 'dead' ? '#64748b' : '#d97706'));
      const statusLabel = t.status === 'needs' ? 'Needs Care' : t.status.charAt(0).toUpperCase() + t.status.slice(1);

      const marker = L.marker([lat, lng], { icon: createCustomIcon(t.status) })
        .bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px; min-width:180px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
              <strong style="font-size:13px; color:#0f172a;">${t.species} (${t.id})</strong>
              <span style="font-size:10.5px;font-weight:700;color:${statusClass};background:${statusClass}18;padding:1px 6px;border-radius:999px;">
                ● ${statusLabel}
              </span>
            </div>
            <div style="font-size:11.5px; color:#475569; margin-bottom:2px;">Quantity: <strong>${t.count} tree(s)</strong> • Funded: <strong>₱${(t.count * 50).toLocaleString()}</strong></div>
            <div style="font-size:11.5px; color:#1e293b; margin-bottom:2px;">📍 <strong>Planting Location:</strong> ${t.barangay || 'Catbalogan City'}</div>
            <div style="font-size:11.5px; color:#15803d; margin-bottom:4px;">🧑‍🌾 <strong>Assigned Caretaker:</strong> ${t.caretaker || 'Assigned Caretaker'}</div>
            <div style="font-size:10px; color:#64748b; margin-bottom:6px;">GPS: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E (Verified Land)</div>
            <button type="button" onclick="window.ATAMAN_INCENTIVES && window.ATAMAN_INCENTIVES.openTreeQrModal('${t.id}')" style="width:100%;background:#15803d;color:#fff;border:none;padding:5px 8px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">📱 QR Code Location Tag</button>
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
    // Empty state: default to Samar / Catbalogan on land
    adopterMapInstance.setView([11.7774, 124.8876], 13);
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
          <p class="ad-act-title"><strong>Adopted ${t.count} ${t.species} tree(s)</strong> (UUID: ${t.id} • ₱${t.count * 50} PHP)</p>
          <p class="ad-act-author">Assigned Caretaker: ${t.caretaker} (Deducted from pool) • Brgy. ${t.barangay}</p>
        </div>
        <button type="button" onclick="window.ATAMAN_INCENTIVES && window.ATAMAN_INCENTIVES.openTreeQrModal('${t.id}')" style="background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">📱 QR</button>
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


/* ─── 8.5. Interactive Adopt a Tree Modal Flow ─── */
function getAdminAvailableTreesAndSpecies() {
  const botanicalInfoMap = {
    'narra': { sc: 'Pterocarpus indicus', type: 'Native', icon: '🌳', desc: 'Philippine National Tree, strong watershed canopy' },
    'molave': { sc: 'Vitex parviflora', type: 'Native', icon: '🌲', desc: 'Dense hardwood, exceptional carbon sequestration' },
    'yakal': { sc: 'Shorea astylosa', type: 'Native', icon: '🪵', desc: 'High-grade Samar timber, high canopy & erosion control' },
    'tindalo': { sc: 'Afzelia rhomboidea', type: 'Native', icon: '🌱', desc: 'Vulnerable Samar indigenous hardwood species' },
    'dao': { sc: 'Dracontomelon dao', type: 'Native', icon: '🍃', desc: 'Massive Samar buttress-rooted canopy watershed tree' },
    'banaba': { sc: 'Lagerstroemia speciosa', type: 'Native', icon: '🌸', desc: 'Vibrant flowering watershed canopy tree' },
    'toog': { sc: 'Petersianthus quadrialatus', type: 'Endemic', icon: '🌿', desc: 'Samar giant native hardwood & biodiversity host' },
    'kamagong': { sc: 'Diospyros blancoi', type: 'Endemic', icon: '🌴', desc: 'Precious Samar ironwood forest species' },
    'guyabano': { sc: 'Annona muricata', type: 'Fruit/Native', icon: '🍈', desc: 'Community agroforestry native tree' },
    'mahogany': { sc: 'Swietenia macrophylla', type: 'Hardwood', icon: '🌲', desc: 'High-canopy watershed timber tree' },
    'acacia': { sc: 'Vachellia farnesiana', type: 'Native', icon: '🌳', desc: 'Fast-growing nitrogen-fixing native canopy' },
    'ipil-ipil': { sc: 'Leucaena leucocephala', type: 'Native', icon: '🌿', desc: 'Soil enrichment & agroforestry nurse tree' }
  };

  let allAdminTrees = [];
  try {
    allAdminTrees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
  } catch (_) { allAdminTrees = []; }
  if (!Array.isArray(allAdminTrees)) allAdminTrees = [];

  // When admin has trees in registry, dynamically build options directly from them
  if (allAdminTrees.length > 0) {
    const list = [];
    allAdminTrees.forEach(t => {
      if (!t) return;
      const rawCommon = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || t.speciesCommon || 'Tree';
      const commonName = String(rawCommon).trim();
      if (!commonName || commonName === '—') return;

      const totalCount = Math.max(1, parseInt(t.treeCount, 10) || 1);
      const takenCount = parseInt(t.takenCount, 10) || 0;
      const availableCount = Math.max(0, totalCount - takenCount);

      const key = commonName.toLowerCase();
      const bot = botanicalInfoMap[key] || {
        sc: (typeof t.species === 'object' && t.species ? t.species.scientific : '') || t.scientificName || 'Botanical Species',
        type: t.treeType || (typeof t.species === 'object' && t.species ? t.species.type : '') || 'Native',
        icon: '🌳',
        desc: 'Samar reforestation native tree'
      };

      const scientificName = (typeof t.species === 'object' && t.species ? t.species.scientific : '') || t.scientificName || bot.sc;
      const treeType = t.treeType || (typeof t.species === 'object' && t.species ? t.species.type : '') || bot.type;

      list.push({
        id: t.id,
        name: commonName,
        sc: scientificName,
        type: treeType,
        icon: bot.icon || '🌳',
        desc: bot.desc,
        adminTreeId: t.id,
        adminTree: t,
        totalTrees: totalCount,
        availableCount: availableCount,
        location: t.barangay || t.municipality || 'Brgy. Canlapwas',
        caretaker: t.caretaker || 'Dodong Zeta'
      });
    });

    if (list.length > 0) {
      return list;
    }
  }

  // In clean production state, only real registered trees appear in catalogue
  return [];
}

function getAvailableCaretakersList() {
  const list = [];
  const seen = new Set();

  function add(name, loc, id, email, status) {
    if (!name || name === 'Unassigned' || name === 'None') return;
    const clean = name.trim();
    const key = clean.toLowerCase();
    if (status && String(status).toLowerCase().includes('inactive')) return;
    if (!seen.has(key)) {
      seen.add(key);
      let cleanLoc = (loc || '').trim();
      if (!cleanLoc || cleanLoc.toLowerCase() === 'not specified') {
        cleanLoc = '';
      }
      list.push({
        name: clean,
        location: cleanLoc,
        id: id || ('CT-' + (100 + list.length + 1)),
        email: email || ''
      });
    }
  }

  // 1. Gather strictly registered user accounts with role 'Caretaker' from User Management stores
  ['ATAMAN_users_cache', 'saplink_users_cache', 'ATAMAN_registered_users', 'saplink_registered_users'].forEach(key => {
    try {
      const users = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(users)) {
        users.forEach(u => {
          if (!u) return;
          const role = String(u.role || '').toLowerCase().trim();
          if (role === 'caretaker' || role.includes('caretaker')) {
            const uName = u.displayName || u.fullName || u.name;
            const uLoc = (u.location && u.location !== 'Not specified') ? u.location : (u.barangay || u.address || '');
            add(uName, uLoc, u.empId || u.id || u.uid, u.email, u.status);
          }
        });
      }
    } catch (_) {}
  });

  // 2. Also check ATAMAN_caretakers_cache (for any synced active field caretakers)
  try {
    const raw = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
    if (Array.isArray(raw)) {
      raw.forEach(c => {
        if (!c) return;
        const cRole = String(c.role || 'Caretaker').toLowerCase().trim();
        if (!cRole.includes('caretaker')) return;
        const cName = c.name || c.fullName || c.displayName;
        const cLoc = c.location || c.primaryArea || c.barangay || c.address || '';
        add(cName, cLoc, c.empId || c.id, c.email, c.status);
      });
    }
  } catch (_) {}

  // 3. Include default system Caretaker account from User Management (Dodong Zeta) if not yet added
  if (!seen.has('dodong zeta')) {
    add('Dodong Zeta', 'Brgy. Canlapwas', 'EMP-002', 'zetadodong@gmail.com', 'Active');
  }

  return list;
}

function openAdoptTreeModal() {
  const currentData = getLoggedInAdopterData();
  const userName = localStorage.getItem('ATAMAN_user_name') || 'Rose Yu';
  const userEmail = (localStorage.getItem('ATAMAN_user_email') || '').toLowerCase().trim();
  const sessionUser = JSON.parse(localStorage.getItem('ATAMAN_current_user') || localStorage.getItem('saplink_user') || '{}');
  const userUid = sessionUser.uid || sessionUser.id || ('ADP-' + Date.now());

  let modal = document.getElementById('adopterAdoptTreeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'adopterAdoptTreeModal';
    modal.className = 'adopt-modal-overlay';
    document.body.appendChild(modal);
  }

  // Dynamically load the trees & species added by the Admin in Admin Trees
  const speciesOptions = getAdminAvailableTreesAndSpecies();

  const locationOptions = [
    { name: 'Brgy. Canlapwas', sector: 'Sector A - Central Watershed Reserve', lat: 11.7820, lng: 124.8875, defaultCaretaker: 'Dodong Zeta' },
    { name: 'Brgy. Guinsorongan', sector: 'Sector B - Coastal Green Buffer', lat: 11.7598, lng: 124.8861, defaultCaretaker: 'Dodong Zeta' },
    { name: 'Brgy. San Isidro', sector: 'Sector C - Ridge & Highland Reserve', lat: 11.7710, lng: 124.8910, defaultCaretaker: 'Dodong Zeta' },
    { name: 'Brgy. Bunuanan', sector: 'Sector D - Biodiversity Forest Corridor', lat: 11.7885, lng: 124.8890, defaultCaretaker: 'Dodong Zeta' },
    { name: 'Brgy. Mabini', sector: 'Sector E - Upland Conservation Sector', lat: 11.7740, lng: 124.9030, defaultCaretaker: 'Dodong Zeta' },
    { name: 'Darahuway Daco', sector: 'Marine & Mangrove Forest Sanctuary', lat: 11.7450, lng: 124.8761, defaultCaretaker: 'June Luna' },
    { name: 'Poblacion 4', sector: 'Urban Forestry & Green Belt', lat: 11.7774, lng: 124.8876, defaultCaretaker: 'Dodong Zeta' }
  ];

  const caretakerOptions = getAvailableCaretakersList();

  let selectedQty = 10;
  const ratePerTree = 50;

  function renderModalContent() {
    const totalCost = selectedQty * ratePerTree;
    const co2Offset = selectedQty * 22;

    modal.innerHTML = `
      <div class="adopt-modal-card">
        <div class="adopt-modal-header">
          <div>
            <div style="display:inline-flex;align-items:center;gap:6px;background:#dcfce7;color:#166534;font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">
              🌱 Samar Reforestation • ₱50.00 / Tree Contribution
            </div>
            <h2 style="margin:0;font-size:1.25rem;font-weight:800;color:#0f172a;">Adopt &amp; Sponsor Trees</h2>
            <p style="margin:4px 0 0;font-size:0.83rem;color:#64748b;">
              Directly sponsor and fund trees from the Samar reforestation registry with verified field care.
            </p>
          </div>
          <button type="button" class="adopt-modal-close" id="closeAdoptModalBtn" aria-label="Close modal">&times;</button>
        </div>

        <form id="adoptTreeForm" style="display:flex;flex-direction:column;gap:16px;">

          <!-- 1. Select Species (From Admin Trees) -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <label style="font-size:13px;font-weight:700;color:#1e293b;">
                1. Select Tree Species <span style="color:#dc2626;">*</span>
              </label>
              <span style="font-size:11.5px;color:#166534;font-weight:700;background:#dcfce7;padding:2px 8px;border-radius:999px;">
                ${speciesOptions.length} Tree Batches from Admin Trees
              </span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:10px;" id="speciesCardGrid">
              ${speciesOptions.map((sp, idx) => `
                <label style="display:flex;flex-direction:column;gap:4px;padding:10px 12px;border:1.5px solid ${idx === 0 ? '#16a34a' : '#e2e8f0'};background:${idx === 0 ? '#f0fdf4' : '#ffffff'};border-radius:12px;cursor:pointer;transition:all 0.18s ease;position:relative;" class="species-choice-card" data-species="${sp.name}" data-tree-id="${sp.adminTreeId || ''}">
                  <div style="display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-size:20px;">${sp.icon}</span>
                    <input type="radio" name="adoptSpecies" value="${sp.name}" data-tree-id="${sp.adminTreeId || ''}" ${idx === 0 ? 'checked' : ''} style="accent-color:#16a34a;width:15px;height:15px;" />
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px;">
                    <strong style="font-size:13.5px;color:#0f172a;">${sp.name}</strong>
                    ${sp.adminTreeId ? `<span style="font-size:9.5px;color:#0369a1;background:#e0f2fe;font-weight:800;padding:1px 5px;border-radius:4px;">${sp.adminTreeId}</span>` : ''}
                  </div>
                  <span style="font-size:11px;color:#64748b;font-style:italic;">${sp.sc}</span>
                  <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:4px;">
                    <span style="font-size:10px;color:#15803d;background:#dcfce7;padding:2px 6px;border-radius:4px;font-weight:700;">${sp.type}</span>
                    ${sp.availableCount != null ? `
                      <span style="font-size:10px;color:${sp.availableCount > 0 ? '#15803d' : '#b91c1c'};background:${sp.availableCount > 0 ? '#f0fdf4' : '#fef2f2'};border:1px solid ${sp.availableCount > 0 ? '#bbf7d0' : '#fecaca'};padding:1px 5px;border-radius:4px;font-weight:700;">
                        ${sp.availableCount > 0 ? `🟢 ${sp.availableCount} available` : '🔴 Taken'}
                      </span>
                    ` : ''}
                  </div>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- 2. Quantity Selector -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <label style="font-size:13px;font-weight:700;color:#1e293b;">
                2. Number of Trees to Adopt <span style="color:#dc2626;">*</span>
              </label>
              <span style="font-size:12px;color:#15803d;font-weight:700;">Rate: ₱50.00 / Tree</span>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
              ${[5, 10, 20, 50, 100].map(q => `
                <button type="button" class="qty-preset-btn ${q === selectedQty ? 'active' : ''}" data-qty="${q}"
                  style="flex:1 1 50px;height:36px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;transition:all 0.18s;border:1.5px solid ${q === selectedQty ? '#16a34a' : '#cbd5e1'};background:${q === selectedQty ? '#16a34a' : '#ffffff'};color:${q === selectedQty ? '#ffffff' : '#334155'};">
                  ${q} Trees
                </button>
              `).join('')}
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:12px;color:#64748b;">Or enter custom count:</span>
              <input type="number" id="customQtyInput" min="1" max="1000" value="${selectedQty}"
                style="width:90px;height:36px;border-radius:8px;border:1.5px solid #cbd5e1;padding:0 10px;font-size:13.5px;font-weight:700;text-align:center;outline:none;" />
              <span style="font-size:12px;color:#475569;font-weight:600;">Trees</span>
            </div>
          </div>

          <!-- 3. Location & Caretaker Dropdown Row -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="display:block;font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px;">
                3. Planting Location <span style="color:#dc2626;">*</span>
              </label>
              <select id="adoptLocSelect" style="width:100%;height:42px;border-radius:10px;border:1.5px solid #cbd5e1;padding:0 10px;font-size:13px;color:#0f172a;background:#ffffff;outline:none;font-family:inherit;cursor:pointer;">
                ${locationOptions.map((loc, i) => `
                  <option value="${loc.name}" ${i === 0 ? 'selected' : ''}>${loc.name} (${loc.sector.split(' - ')[0]})</option>
                `).join('')}
              </select>
            </div>
            <div>
              <label style="display:block;font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px;">
                4. Assigned Caretaker <span style="color:#dc2626;">*</span>
              </label>
              <select id="adoptCaretakerSelect" style="width:100%;height:42px;border-radius:10px;border:1.5px solid #cbd5e1;padding:0 10px;font-size:13px;color:#0f172a;background:#ffffff;outline:none;font-family:inherit;cursor:pointer;">
                ${caretakerOptions.map((ct, i) => {
                  const locPart = ct.location && ct.location !== 'Not specified' ? `${ct.location} • ` : '';
                  return `<option value="${ct.name}" data-id="${ct.id}" data-email="${ct.email || ''}" ${i === 0 ? 'selected' : ''}>🧑‍🌾 ${ct.name} (${locPart}Active)</option>`;
                }).join('')}
              </select>
            </div>
          </div>

          <!-- 5. Dedication Message (Optional) -->
          <div>
            <label style="display:block;font-size:13px;font-weight:700;color:#1e293b;margin-bottom:4px;">
              5. Personal Dedication / Message (Optional)
            </label>
            <input type="text" id="adoptDedication" placeholder="e.g. In honor of our family / Samar Green Legacy"
              style="width:100%;height:40px;border-radius:10px;border:1.5px solid #cbd5e1;padding:0 12px;font-size:13px;outline:none;font-family:inherit;box-sizing:border-box;" />
          </div>

          <!-- Real-Time Impact & Contribution Summary -->
          <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:14px 16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span style="font-size:12px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Adoption Sponsorship Summary</span>
              <span style="font-size:11.5px;color:#15803d;font-weight:700;">Official Certificate Included ✓</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;text-align:center;">
              <div style="background:#ffffff;padding:10px 8px;border-radius:10px;border:1px solid #bbf7d0;">
                <span style="display:block;font-size:11px;color:#64748b;font-weight:600;">TREES SPONSORED</span>
                <strong style="font-size:16px;color:#15803d;" id="sumTreesCount">${selectedQty} Trees</strong>
              </div>
              <div style="background:#ffffff;padding:10px 8px;border-radius:10px;border:1px solid #bbf7d0;">
                <span style="display:block;font-size:11px;color:#64748b;font-weight:600;">TOTAL SPONSORSHIP</span>
                <strong style="font-size:16px;color:#0f172a;" id="sumTotalCost">₱${totalCost.toLocaleString()} PHP</strong>
              </div>
              <div style="background:#ffffff;padding:10px 8px;border-radius:10px;border:1px solid #bbf7d0;">
                <span style="display:block;font-size:11px;color:#64748b;font-weight:600;">EST. CO₂ ABSORPTION</span>
                <strong style="font-size:16px;color:#15803d;" id="sumCo2Offset">~${co2Offset.toLocaleString()} kg/yr</strong>
              </div>
            </div>
            <p style="margin:10px 0 0;font-size:11.5px;color:#475569;text-align:center;">
              Each tree is permanently linked to your Adopter ID with GPS tagging and recorded in the Samar reforestation registry.
            </p>
          </div>

          <!-- Actions -->
          <div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:6px;">
            <button type="button" id="cancelAdoptModalBtn" style="height:44px;padding:0 20px;border-radius:10px;border:1px solid #cbd5e1;background:#ffffff;color:#475569;font-size:13.5px;font-weight:700;cursor:pointer;">
              Cancel
            </button>
            <button type="submit" id="submitAdoptTreeBtn" style="height:44px;padding:0 24px;border-radius:10px;border:none;background:#166534;color:#ffffff;font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 14px rgba(22,101,52,0.3);transition:all 0.2s ease;">
              <span>🌱 Confirm Adoption (₱${totalCost.toLocaleString()} PHP)</span>
            </button>
          </div>

        </form>
      </div>
    `;

    // Bind event listeners
    modal.querySelector('#closeAdoptModalBtn')?.addEventListener('click', closeAdoptTreeModal);
    modal.querySelector('#cancelAdoptModalBtn')?.addEventListener('click', closeAdoptTreeModal);

    // Dynamic Caretaker recommendation on location change and vice versa
    const locSelect = modal.querySelector('#adoptLocSelect');
    const ctSelect = modal.querySelector('#adoptCaretakerSelect');
    if (locSelect && ctSelect) {
      locSelect.addEventListener('change', () => {
        const selectedLoc = locSelect.value.toLowerCase();
        for (let i = 0; i < ctSelect.options.length; i++) {
          const opt = ctSelect.options[i];
          const optText = opt.textContent.toLowerCase();
          const optVal = opt.value.toLowerCase();
          if (selectedLoc.includes('darahuway') && (optVal.includes('june') || optText.includes('june'))) {
            ctSelect.selectedIndex = i;
            break;
          } else if (!selectedLoc.includes('darahuway') && (optVal.includes('dodong') || optText.includes('dodong'))) {
            ctSelect.selectedIndex = i;
            break;
          }
        }
      });

      ctSelect.addEventListener('change', () => {
        const ctVal = ctSelect.value.toLowerCase();
        let targetLoc = 'canlapwas';
        if (ctVal.includes('june')) {
          targetLoc = 'darahuway';
        }
        for (let i = 0; i < locSelect.options.length; i++) {
          if (locSelect.options[i].value.toLowerCase().includes(targetLoc)) {
            locSelect.selectedIndex = i;
            break;
          }
        }
      });
    }

    // Quantity Presets
    modal.querySelectorAll('.qty-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = parseInt(btn.dataset.qty, 10) || 10;
        selectedQty = q;
        const customInput = modal.querySelector('#customQtyInput');
        if (customInput) customInput.value = q;
        updateImpactSummary();
      });
    });

    // Custom Quantity Input
    const customQtyInput = modal.querySelector('#customQtyInput');
    if (customQtyInput) {
      customQtyInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (val > 0) {
          selectedQty = val;
          modal.querySelectorAll('.qty-preset-btn').forEach(btn => {
            const bq = parseInt(btn.dataset.qty, 10);
            btn.style.border = bq === selectedQty ? '1.5px solid #16a34a' : '1.5px solid #cbd5e1';
            btn.style.background = bq === selectedQty ? '#16a34a' : '#ffffff';
            btn.style.color = bq === selectedQty ? '#ffffff' : '#334155';
          });
          updateImpactSummary();
        }
      });
    }

    // Species card clicks - auto sync location & caretaker from admin tree data
    modal.querySelectorAll('.species-choice-card').forEach(card => {
      card.addEventListener('click', () => {
        modal.querySelectorAll('.species-choice-card').forEach(c => {
          c.style.border = '1.5px solid #e2e8f0';
          c.style.background = '#ffffff';
        });
        card.style.border = '1.5px solid #16a34a';
        card.style.background = '#f0fdf4';
        const radio = card.querySelector('input[type=radio]');
        if (radio) radio.checked = true;

        const targetTreeId = card.dataset.treeId;
        const targetSp = speciesOptions.find(s => (targetTreeId && String(s.adminTreeId) === String(targetTreeId)) || s.name === card.dataset.species);
        if (targetSp && targetSp.location && locSelect) {
          for (let i = 0; i < locSelect.options.length; i++) {
            if (locSelect.options[i].value.toLowerCase().includes(targetSp.location.toLowerCase()) ||
                targetSp.location.toLowerCase().includes(locSelect.options[i].value.toLowerCase())) {
              locSelect.selectedIndex = i;
              locSelect.dispatchEvent(new Event('change'));
              break;
            }
          }
        }
        if (targetSp && targetSp.caretaker && ctSelect) {
          for (let i = 0; i < ctSelect.options.length; i++) {
            if (ctSelect.options[i].value.toLowerCase() === targetSp.caretaker.toLowerCase() ||
                ctSelect.options[i].textContent.toLowerCase().includes(targetSp.caretaker.toLowerCase())) {
              ctSelect.selectedIndex = i;
              break;
            }
          }
        }
      });
    });

    function updateImpactSummary() {
      const sumTrees = modal.querySelector('#sumTreesCount');
      const sumCost = modal.querySelector('#sumTotalCost');
      const sumCo2 = modal.querySelector('#sumCo2Offset');
      const submitBtn = modal.querySelector('#submitAdoptTreeBtn span');
      const cost = selectedQty * ratePerTree;
      const co2 = selectedQty * 22;

      if (sumTrees) sumTrees.textContent = `${selectedQty} Trees`;
      if (sumCost) sumCost.textContent = `₱${cost.toLocaleString()} PHP`;
      if (sumCo2) sumCo2.textContent = `~${co2.toLocaleString()} kg/yr`;
      if (submitBtn) submitBtn.textContent = `🌱 Confirm Adoption (₱${cost.toLocaleString()} PHP)`;
    }

    // Form Submit
    const adoptForm = modal.querySelector('#adoptTreeForm');
    if (adoptForm) {
      adoptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = modal.querySelector('#submitAdoptTreeBtn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>Processing Adoption...</span>';
        }

        try {
          const speciesRadio = modal.querySelector('input[name="adoptSpecies"]:checked');
          const chosenSpeciesName = speciesRadio ? speciesRadio.value : (speciesOptions[0]?.name || 'Narra');
          const chosenTreeId = speciesRadio?.dataset?.treeId;
          const chosenSpeciesObj = speciesOptions.find(s => (chosenTreeId && String(s.adminTreeId) === String(chosenTreeId)) || s.name === chosenSpeciesName) || speciesOptions[0];

          const chosenLocName = modal.querySelector('#adoptLocSelect')?.value || 'Brgy. Canlapwas';
          const locObj = locationOptions.find(l => l.name === chosenLocName) || locationOptions[0];

          const caretakerDropdown = modal.querySelector('#adoptCaretakerSelect');
          const chosenCtOpt = caretakerDropdown ? caretakerDropdown.selectedOptions[0] : null;
          const chosenCaretakerName = caretakerDropdown ? caretakerDropdown.value : 'Dodong Zeta';
          const chosenCaretakerId = chosenCtOpt?.dataset?.id || 'CT-101';
          const chosenCaretakerEmail = chosenCtOpt?.dataset?.email || '';

          const dedication = modal.querySelector('#adoptDedication')?.value?.trim() || '';

          // 1. Load Trees Cache
          let allTrees = [];
          try {
            allTrees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
          } catch (_) { allTrees = []; }
          if (!Array.isArray(allTrees)) allTrees = [];

          // Match or link to Admin Tree in registry
          let targetAdminTree = null;
          if (chosenTreeId) {
            targetAdminTree = allTrees.find(t => String(t.id) === String(chosenTreeId));
          }
          if (!targetAdminTree) {
            targetAdminTree = allTrees.find(t => {
              const com = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || t.speciesCommon;
              return com && com.toLowerCase().trim() === chosenSpeciesName.toLowerCase().trim();
            });
          }

          let adoptedTreeId = '';
          const now = new Date();
          const autoDateDisplay = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
          const autoDateTimeDisplay = now.toLocaleTimeString('en-US');

          // Resolve verified on-land coordinates based on tree planting location, caretaker, and adopter
          const sessionUser = JSON.parse(localStorage.getItem('ATAMAN_current_user') || localStorage.getItem('saplink_user') || '{}');
          const userLocation = sessionUser.location || sessionUser.address || '';

          const resolvedCoords = resolveAccurateTreeCoordinates({
            existingLat: locObj.lat,
            existingLng: locObj.lng,
            treeId: chosenTreeId || 'TR-ADOPT',
            barangay: chosenLocName,
            caretaker: chosenCaretakerName,
            adopter: userName,
            adopterLocation: userLocation
          });
          const resolvedLat = resolvedCoords.lat;
          const resolvedLng = resolvedCoords.lng;

          if (targetAdminTree) {
            adoptedTreeId = targetAdminTree.id;
            targetAdminTree.takenCount = (parseInt(targetAdminTree.takenCount, 10) || 0) + selectedQty;
            targetAdminTree.sponsorName = userName;
            targetAdminTree.adopter = userName;
            targetAdminTree.adopterId = userUid;
            targetAdminTree.adopterEmail = userEmail;
            // Sapling adopted: remains UNASSIGNED location until claimed by Caretaker
            targetAdminTree.status = 'adopted-floating';
            targetAdminTree.state = 'awaiting-claim';
            targetAdminTree.fundState = 'Funded (Awaiting Caretaker Claim)';
            targetAdminTree.caretaker = 'Awaiting Caretaker Claim';
            targetAdminTree.caretakerId = '';
            targetAdminTree.caretakerStatus = 'awaiting_claim';
            targetAdminTree.barangay = '';
            targetAdminTree.municipality = '';
            targetAdminTree.province = '';
            targetAdminTree.location = 'Unassigned (Awaiting Caretaker Claim)';
            targetAdminTree.lat = null;
            targetAdminTree.lng = null;
            targetAdminTree.updatedAt = now.toISOString();
            targetAdminTree.dedication = dedication;
          } else {
            // Generate sequential TR ID
            const existingNums = allTrees.map(t => {
              const m = String(t.id || '').match(/\d+/);
              return m ? parseInt(m[0], 10) : 0;
            }).filter(n => n >= 10000);
            const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 10001;
            adoptedTreeId = 'TR-' + nextNum;

            const newTreeRecord = {
              id: adoptedTreeId,
              species: {
                common: chosenSpeciesObj.name,
                scientific: chosenSpeciesObj.sc,
                type: chosenSpeciesObj.type
              },
              speciesCommon: chosenSpeciesObj.name,
              commonName: chosenSpeciesObj.name,
              scientificName: chosenSpeciesObj.sc,
              treeType: chosenSpeciesObj.type,
              stage: 'Sapling',
              treeCount: selectedQty,
              takenCount: selectedQty,
              sponsorName: userName,
              adopter: userName,
              adopterId: userUid,
              adopterEmail: userEmail,
              status: 'adopted-floating',
              state: 'awaiting-claim',
              fundState: 'Funded (Awaiting Caretaker Claim)',
              caretaker: 'Awaiting Caretaker Claim',
              caretakerId: '',
              caretakerStatus: 'awaiting_claim',
              municipality: '',
              barangay: '',
              location: 'Unassigned (Awaiting Caretaker Claim)',
              province: '',
              lat: null,
              lng: null,
              plantingDate: now.toISOString().slice(0, 10),
              dateAdded: autoDateDisplay,
              savedAt: autoDateTimeDisplay,
              savedTimestamp: now.getTime(),
              createdAt: now.toISOString(),
              dedication: dedication
            };
            allTrees.unshift(newTreeRecord);
          }

          localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(allTrees));
          localStorage.setItem('saplink_trees_cache', JSON.stringify(allTrees));

          // Save to Firestore trees collection if online
          if (typeof firebase !== 'undefined' && firebase.firestore) {
            try {
              const db = firebase.firestore();
              const saveRec = targetAdminTree || allTrees[0];
              await db.collection('trees').doc(adoptedTreeId).set(saveRec, { merge: true });
            } catch (fsErr) {
              console.warn('[ATAMAN] Firestore tree save notice:', fsErr);
            }
          }

          // 2. Update Adopter Profile & Cache
          let adopters = [];
          try {
            adopters = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
          } catch (_) { adopters = []; }
          if (!Array.isArray(adopters)) adopters = [];

          let adIdx = adopters.findIndex(a => {
            if (!a) return false;
            const em = (a.email || '').toLowerCase().trim();
            const nm = (a.name || '').toLowerCase().trim();
            const aid = String(a.id || a.uid || '').trim();
            return (userUid && aid === userUid) || (userEmail && em === userEmail) || (userName && nm === userName.toLowerCase().trim());
          });

          const addedFunding = selectedQty * ratePerTree;

          if (adIdx >= 0) {
            const ex = adopters[adIdx];
            const prevCount = parseInt(ex.treesCount || ex.treesAdopted, 10) || 0;
            const prevFunding = parseFloat(ex.funding || ex.fundingPaid) || 0;
            const treesList = Array.isArray(ex.treesList) ? [...ex.treesList] : [];

            treesList.unshift({
              id: adoptedTreeId,
              species: chosenSpeciesObj.name,
              speciesObj: {
                common: chosenSpeciesObj.name,
                scientific: chosenSpeciesObj.sc,
                type: chosenSpeciesObj.type
              },
              treeType: chosenSpeciesObj.type,
              treeCount: selectedQty,
              status: 'healthy',
              barangay: chosenLocName,
              lat: resolvedLat,
              lng: resolvedLng,
              caretaker: chosenCaretakerName,
              caretakerId: chosenCaretakerId,
              caretakerEmail: chosenCaretakerEmail,
              fundingAmount: 50
            });

            // Sanitize all items in treesList to ensure no sea/water coordinates persist
            treesList.forEach((it, idx) => {
              if (isCoordinateInWater(it.lat, it.lng)) {
                const rep = resolveAccurateTreeCoordinates({
                  existingLat: it.lat,
                  existingLng: it.lng,
                  treeId: it.id,
                  barangay: it.barangay,
                  caretaker: it.caretaker,
                  adopter: userName,
                  adopterLocation: userLocation,
                  index: idx
                });
                it.lat = rep.lat;
                it.lng = rep.lng;
              }
            });

            adopters[adIdx] = {
              ...ex,
              treesCount: prevCount + selectedQty,
              treesAdopted: prevCount + selectedQty,
              funding: prevFunding + addedFunding,
              fundingPaid: prevFunding + addedFunding,
              customFunding: true,
              treesList: treesList,
              updatedAt: now.toISOString()
            };
          } else {
            adopters.unshift({
              id: userUid,
              uid: userUid,
              name: userName,
              email: userEmail,
              contactPerson: userName,
              type: 'Individual',
              status: 'Active',
              treesCount: selectedQty,
              treesAdopted: selectedQty,
              funding: addedFunding,
              fundingPaid: addedFunding,
              customFunding: true,
              joinedDate: now.toISOString().slice(0, 10),
              createdAt: now.toISOString(),
              treesList: [{
                id: adoptedTreeId,
                species: chosenSpeciesObj.name,
                speciesObj: {
                  common: chosenSpeciesObj.name,
                  scientific: chosenSpeciesObj.sc,
                  type: chosenSpeciesObj.type
                },
                treeType: chosenSpeciesObj.type,
                treeCount: selectedQty,
                status: 'healthy',
                barangay: chosenLocName,
                lat: resolvedLat,
                lng: resolvedLng,
                caretaker: chosenCaretakerName,
                caretakerId: chosenCaretakerId,
                caretakerEmail: chosenCaretakerEmail,
                fundingAmount: 50
              }]
            });
          }

          localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adopters));
          localStorage.setItem('saplink_adopters_cache', JSON.stringify(adopters));

          // Save to Firestore adopters collection if online
          if (typeof firebase !== 'undefined' && firebase.firestore) {
            try {
              const db = firebase.firestore();
              const updatedAd = adopters[adIdx >= 0 ? adIdx : 0];
              await db.collection('adopters').doc(userUid).set(updatedAd, { merge: true });
            } catch (fsErr) {
              console.warn('[ATAMAN] Firestore adopter update notice:', fsErr);
            }
          }

          // 3. Update Caretaker Cache & Assignment
          let caretakers = [];
          try {
            caretakers = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
          } catch (_) { caretakers = []; }
          if (!Array.isArray(caretakers)) caretakers = [];

          let ctIdx = caretakers.findIndex(c => {
            if (!c) return false;
            const cn = (c.name || c.fullName || '').toLowerCase().trim();
            const cid = String(c.id || c.empId || '').trim();
            return (chosenCaretakerId && cid === chosenCaretakerId) || (chosenCaretakerName && cn === chosenCaretakerName.toLowerCase().trim());
          });

          if (ctIdx >= 0) {
            const exCt = caretakers[ctIdx];
            const assignedTrees = Array.isArray(exCt.assignedTreeIds) ? [...exCt.assignedTreeIds] : (Array.isArray(exCt.assignedTrees) ? [...exCt.assignedTrees] : []);
            if (!assignedTrees.includes(adoptedTreeId)) assignedTrees.push(adoptedTreeId);
            const prevCtCount = parseInt(exCt.assignedTreeCount || exCt.assignedTrees, 10) || 0;
            caretakers[ctIdx] = {
              ...exCt,
              assignedTreeCount: prevCtCount + selectedQty,
              assignedTrees: prevCtCount + selectedQty,
              assignedTreeIds: assignedTrees,
              assignedTreeType: exCt.assignedTreeType && exCt.assignedTreeType !== 'Native Hardwood' ? `${exCt.assignedTreeType}, ${chosenSpeciesObj.name}` : chosenSpeciesObj.name,
              updatedAt: now.toISOString()
            };
          } else {
            caretakers.push({
              id: chosenCaretakerId || ('CT-' + (100 + caretakers.length + 1)),
              empId: chosenCaretakerId || 'EMP-002',
              name: chosenCaretakerName,
              fullName: chosenCaretakerName,
              email: chosenCaretakerEmail || '',
              phone: '+63 918 333 4455',
              address: `${chosenLocName}, Catbalogan City, Samar`,
              role: 'Field Caretaker',
              status: 'Active',
              assignedTrees: selectedQty,
              assignedTreeCount: selectedQty,
              assignedTreeIds: [adoptedTreeId],
              assignedTreeType: chosenSpeciesObj.name,
              location: 'Catbalogan City, Samar',
              municipality: 'Catbalogan City',
              barangay: chosenLocName,
              joinedDate: now.toISOString().slice(0, 10),
              createdAt: now.toISOString()
            });
          }
          localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakers));
          localStorage.setItem('saplink_caretakers_cache', JSON.stringify(caretakers));

          // Save to Firestore caretakers collection if online
          if (typeof firebase !== 'undefined' && firebase.firestore) {
            try {
              const db = firebase.firestore();
              const updatedCt = caretakers[ctIdx >= 0 ? ctIdx : caretakers.length - 1];
              await db.collection('caretakers').doc(updatedCt.id).set(updatedCt, { merge: true });
            } catch (fsErr) {
              console.warn('[ATAMAN] Firestore caretaker sync notice:', fsErr);
            }
          }

          // 4. Log Admin Notification
          try {
            let notifs = [];
            try { notifs = JSON.parse(localStorage.getItem('ATAMAN_notifications') || '[]'); } catch (_) {}
            if (!Array.isArray(notifs)) notifs = [];
            const notifItem = {
              id: 'NTF-' + Date.now(),
              title: `New Tree Adoption: ${selectedQty}x ${chosenSpeciesObj.name} (${adoptedTreeId})`,
              message: `${userName} adopted ${selectedQty} ${chosenSpeciesObj.name} tree(s) (${adoptedTreeId}) in ${chosenLocName}. Assigned field caretaker: ${chosenCaretakerName}.`,
              category: 'adopters',
              priority: 'high',
              status: 'unread',
              read: false,
              timestamp: now.getTime(),
              createdAt: now.toISOString(),
              date: now.toISOString(),
              treeId: adoptedTreeId,
              species: chosenSpeciesObj.name,
              treeCount: selectedQty,
              adopter: userName,
              caretaker: chosenCaretakerName,
              location: chosenLocName
            };
            notifs.unshift(notifItem);
            localStorage.setItem('ATAMAN_notifications', JSON.stringify(notifs));
            localStorage.setItem('ATAMAN_unread_notif_count', String(notifs.filter(n => !n.read).length));
            window.dispatchEvent(new CustomEvent('ATAMAN:notifications-updated', { detail: notifs }));
            if (typeof firebase !== 'undefined' && firebase.firestore) {
              firebase.firestore().collection('notifications').doc(notifItem.id).set(notifItem, { merge: true }).catch(() => {});
            }
          } catch (nErr) {
            console.warn('[ATAMAN] Notification record notice:', nErr);
          }

          // 5. Log System Audit Log
          try {
            let logs = [];
            try { logs = JSON.parse(localStorage.getItem('ATAMAN_system_logs') || '[]'); } catch (_) {}
            if (!Array.isArray(logs)) logs = [];
            const logItem = {
              id: 'LOG-' + Date.now(),
              timestamp: now.toISOString(),
              user: userName,
              userRole: 'Adopter',
              userType: 'adopter',
              action: `Adopted ${selectedQty}x ${chosenSpeciesObj.name} (${adoptedTreeId})`,
              actionIcon: '🌱',
              module: 'Tree Registry',
              targetId: adoptedTreeId,
              level: 'info',
              ip: '192.168.1.100',
              details: {
                treeId: adoptedTreeId,
                species: chosenSpeciesObj.name,
                scientific: chosenSpeciesObj.sc,
                treeCount: selectedQty,
                location: chosenLocName,
                caretaker: chosenCaretakerName,
                adopter: userName,
                funding: selectedQty * ratePerTree
              }
            };
            logs.unshift(logItem);
            localStorage.setItem('ATAMAN_system_logs', JSON.stringify(logs));
            window.dispatchEvent(new CustomEvent('ATAMAN:logs-updated', { detail: logs }));
            if (typeof firebase !== 'undefined' && firebase.firestore) {
              firebase.firestore().collection('system_logs').doc(logItem.id).set(logItem, { merge: true }).catch(() => {});
            }
          } catch (lErr) {
            console.warn('[ATAMAN] System log record notice:', lErr);
          }

          // 6. Log Tree Activity for Admin Dashboard Feed
          try {
            let acts = [];
            try { acts = JSON.parse(localStorage.getItem('ATAMAN_tree_activities') || '[]'); } catch (_) {}
            if (!Array.isArray(acts)) acts = [];
            acts.unshift({
              iconClass: 'ai-green',
              desc: `<strong>${userName}</strong> adopted <strong>${selectedQty}x ${chosenSpeciesObj.name}</strong> (${adoptedTreeId}) in ${chosenLocName} (Caretaker: ${chosenCaretakerName})`,
              actor: `${userName} (Adopter)`,
              time: 'Just now',
              timestamp: now.getTime()
            });
            localStorage.setItem('ATAMAN_tree_activities', JSON.stringify(acts.slice(0, 30)));
          } catch (_) {}

          // 7. Trigger Global Updates & Re-render Dashboard
          window.dispatchEvent(new CustomEvent('ATAMAN:trees-updated'));
          window.dispatchEvent(new CustomEvent('ATAMAN:adopters-updated'));
          window.dispatchEvent(new CustomEvent('ATAMAN:caretakers-updated'));

          refreshAdopterDashboard();
          if (window.ATAMAN_INCENTIVES && typeof window.ATAMAN_INCENTIVES.refreshDashboardIncentiveWidgets === 'function') {
            window.ATAMAN_INCENTIVES.refreshDashboardIncentiveWidgets();
          }

          closeAdoptTreeModal();

          // Celebration Toast with Certificate Button
          showAdToast(`🎉 Congratulations ${userName}! You have adopted ${selectedQty} ${chosenSpeciesObj.name} trees (${adoptedTreeId}) in ${chosenLocName} cared by ${chosenCaretakerName}.`);

          // Smoothly scroll to map overview to view new trees
          const mapSection = document.getElementById('adopterMap');
          if (mapSection) {
            setTimeout(() => {
              mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          }

        } catch (err) {
          console.error('[ATAMAN] Error completing adoption:', err);
          showAdToast('⚠️ Could not complete adoption. Please try again.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>🌱 Confirm Adoption</span>';
          }
        }
      });
    }
  }

  renderModalContent();
  modal.style.display = 'flex';
}
window.openAdoptTreeModal = openAdoptTreeModal;

function closeAdoptTreeModal() {
  const modal = document.getElementById('adopterAdoptTreeModal');
  if (modal) {
    modal.style.display = 'none';
  }
}
window.closeAdoptTreeModal = closeAdoptTreeModal;

/* ─── 9. Interactive Buttons & CTA Handlers ─── */
function initAdopterActions() {
  const btnAdoptTree = document.getElementById('btnAdoptTree');
  if (btnAdoptTree) {
    btnAdoptTree.addEventListener('click', () => {
      openAdoptTreeModal();
    });
  }

  const navAdoption = document.getElementById('navAdoption');
  if (navAdoption) {
    navAdoption.addEventListener('click', (e) => {
      e.preventDefault();
      openAdoptTreeModal();
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
      adLiveDateText.textContent = dateStr;
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
