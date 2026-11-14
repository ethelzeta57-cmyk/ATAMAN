
function syncLinkedAdopterAndCaretaker(allTrees) {
  try {
    const list = Array.isArray(allTrees) ? allTrees : [];

    // 1. Sync Adopters
    let adopters = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
    if (Array.isArray(adopters)) {
      adopters = adopters.map(ad => {
        const adName = (ad.name || '').toLowerCase().trim();
        const myTrees = list.filter(t => {
          const sp = (t.sponsorName || '').toLowerCase().trim();
          const adp = (t.adopter || '').toLowerCase().trim();
          return (sp && (sp === adName || sp.includes(adName))) || (adp && (adp === adName || adp.includes(adName)));
        });
        const treesCount = myTrees.reduce((sum, t) => sum + (parseInt(t.takenCount || t.treeCount) || 1), 0);
        const treesList = myTrees.map(t => ({
          id: t.id,
          treeCount: parseInt(t.takenCount || t.treeCount) || 1,
          species: t.species?.common || 'Tree',
          location: [t.barangay, t.municipality].filter(Boolean).join(', ') || 'Samar',
          fundingAmount: parseInt(t.fundingAmount) || 50
        }));
        const funding = treesList.reduce((sum, it) => sum + ((it.treeCount || 1) * (it.fundingAmount || 50)), 0);
        return {
          ...ad,
          treesCount: treesCount,
          treesAdopted: treesCount,
          funding: funding,
          fundingPaid: funding,
          treesList: treesList
        };
      });
      localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adopters));
      localStorage.setItem('saplink_adopters_cache', JSON.stringify(adopters));
      window.dispatchEvent(new CustomEvent('ATAMAN:adopters-updated', { detail: adopters }));
      if (window.ATAMAN_DB && window.ATAMAN_DB.isFirestore && window.ATAMAN_FIRESTORE) {
        adopters.forEach(ad => {
          window.ATAMAN_FIRESTORE.collection('adopters').doc(ad.id).set(ad, { merge: true }).catch(() => {});
        });
      }
    }

    // 2. Sync Caretakers
    let caretakers = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
    if (Array.isArray(caretakers)) {
      caretakers = caretakers.map(ct => {
        const ctName = (ct.name || '').toLowerCase().trim();
        const myTrees = list.filter(t => {
          const c = (t.caretaker || '').toLowerCase().trim();
          return c && (c === ctName || c.includes(ctName) || ctName.includes(c));
        });
        const treesAssigned = myTrees.reduce((sum, t) => sum + (parseInt(t.treeCount) || 1), 0);
        const assignedTrees = myTrees.map(t => t.id);
        return {
          ...ct,
          treesAssigned: myTrees.length,
          assignedTreeCount: treesAssigned,
          assignedTrees: assignedTrees,
          treesList: myTrees
        };
      });
      localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakers));
      localStorage.setItem('saplink_caretakers_cache', JSON.stringify(caretakers));
      window.dispatchEvent(new CustomEvent('ATAMAN:caretakers-updated', { detail: caretakers }));
      if (window.ATAMAN_DB && window.ATAMAN_DB.isFirestore && window.ATAMAN_FIRESTORE) {
        caretakers.forEach(ct => {
          window.ATAMAN_FIRESTORE.collection('caretakers').doc(ct.id).set(ct, { merge: true }).catch(() => {});
        });
      }
    }
  } catch (err) {
    console.warn('syncLinkedAdopterAndCaretaker error:', err);
  }
}
window.syncLinkedAdopterAndCaretaker = syncLinkedAdopterAndCaretaker;

/* ============================================================
   ATAMAN Admin Trees — admin-trees.js
   Full tree database management: table, filters, profile drawer,
   bulk actions, modals, and lifecycle timeline.
   ============================================================ */

'use strict';

/* ── 0. DATASET ── */
// Species list — add your own entries as needed
const SPECIES_LIST = [
  { common: 'Narra',        scientific: 'Pterocarpus indicus',        type: 'Native'  },
  { common: 'Molave',       scientific: 'Vitex parviflora',           type: 'Endemic' },
  { common: 'Supa',         scientific: 'Sindora supa',               type: 'Endemic' },
  { common: 'Yakal',        scientific: 'Shorea astylosa',            type: 'Native'  },
  { common: 'Tanguile',     scientific: 'Shorea polysperma',          type: 'Native'  },
  { common: 'White Lauan',  scientific: 'Shorea contorta',            type: 'Native'  },
  { common: 'Mahogany',     scientific: 'Swietenia macrophylla',      type: 'Exotic'  },
  { common: 'Acacia',       scientific: 'Vachellia farnesiana',       type: 'Native'  },
  { common: 'Ipil-ipil',    scientific: 'Leucaena leucocephala',      type: 'Exotic'  },
  { common: 'Bamboo',       scientific: 'Bambusa vulgaris',           type: 'Bamboo'  },
  { common: 'Teak',         scientific: 'Tectona grandis',            type: 'Exotic'  },
  { common: 'Banaba',       scientific: 'Lagerstroemia speciosa',     type: 'Native'  },
  { common: 'Langka',       scientific: 'Artocarpus heterophyllus',   type: 'Fruit-bearing' },
  { common: 'Kamagong',     scientific: 'Diospyros blancoi',          type: 'Native'  },
];

// All lookup arrays empty — add your real locations, caretakers, etc.
const CARETAKERS = [];
const BARANGAYS = [];
const MUNICIPALITIES = [];
const PROJECTS = [];
const ADOPTERS = []; 
const STATUSES   = ['healthy', 'needs-care', 'critical', 'dead'];
const LANDOWNERS = [];
const MONITORING_DATES = [];
const NEXT_MONITOR_DATES = [];
const PLANTING_DATES = [];

// Default registered Samar reforestation tree registry
// Zero Ghost Data: default tree registry starts completely empty until inputted by Admin
const DEFAULT_TREES = [];
window.ATAMAN_DEFAULT_TREES = DEFAULT_TREES;

// Load persisted data from localStorage (fallback when Firestore is not available)
const _cachedTrees = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_) { return []; }
})();
let ALL_TREES = _cachedTrees || [];

let filteredTrees = [...ALL_TREES];

let selectedIds = new Set();
let currentPage = 1;
let pageSize = 20;
let currentActiveFilter = '';
let currentAvailabilityFilter = 'all';
let currentArchiveTreeId = null;

function getTreeCounts(t) {
  const total = Math.max(1, parseInt(t.treeCount) || 1);

  // 1. Calculate taken count ONLY from FULLY REGISTERED (status === 'Active') adopters
  let adopterTaken = 0;
  let adoptersForTree = [];
  let adopterFundingPerTree = 0;
  let adopterTotalFunding = 0;

  try {
    const rawAdopters = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
      // Only count adopters who are fully registered (Active status)
      const activeAdopters = Array.isArray(rawAdopters)
        ? rawAdopters.filter(ad => !ad.status || ad.status === 'Active')
        : [];
      activeAdopters.forEach(ad => {
        if (Array.isArray(ad.treesList)) {
          ad.treesList.forEach(item => {
            if (String(item.id) === String(t.id)) {
              const count = Math.max(1, parseInt(item.treeCount) || 1);
              adopterTaken += count;
              if (ad.name && !adoptersForTree.includes(ad.name)) {
                adoptersForTree.push(ad.name);
              }

              // Compute funding rate from adopter record or item only if explicitly funded
              const adTreesCount = Math.max(1, parseInt(ad.treesCount) || count);
              const adFunding = ad.customFunding ? parseFloat(ad.funding || ad.fundingPaid || 0) : 0;
              const rate = adFunding > 0 ? (adFunding / adTreesCount) : (t.customFunding ? (parseFloat(item.fundingRate || item.fundingAmount || t.fundingAmount) || 0) : 0);
              adopterFundingPerTree = rate;
              adopterTotalFunding += (count * rate);
            }
          });
        }
      });

      // Secondary match by sponsor / adopter name if treesList not populated
      if (adopterTaken === 0 && (t.sponsorName || t.adopter)) {
        const normName = String(t.sponsorName || t.adopter).toLowerCase().trim();
        const matchedAd = activeAdopters.find(ad => ad.name && ad.name.toLowerCase().trim() === normName);
        if (matchedAd) {
          const adTreesCount = Math.max(1, parseInt(matchedAd.treesCount) || (parseInt(t.takenCount) || 1));
          const adFunding = matchedAd.customFunding ? parseFloat(matchedAd.funding || matchedAd.fundingPaid || 0) : 0;
          const rate = adFunding > 0 ? (adFunding / adTreesCount) : (t.customFunding ? (parseFloat(t.fundingAmount) || 0) : 0);
          adopterFundingPerTree = rate;
          const currentTaken = Math.max(1, parseInt(t.takenCount) || 1);
          adopterTaken = currentTaken;
          adopterTotalFunding = currentTaken * rate;
          if (!adoptersForTree.includes(matchedAd.name)) {
            adoptersForTree.push(matchedAd.name);
          }
        }
      } // close: if (adopterTaken === 0 ...)
  } catch (e) {}

  let taken = 0;
  if (adopterTaken > 0) {
    taken = Math.min(total, adopterTaken);
    t.takenCount = taken;
    if (adoptersForTree.length > 0) {
      t.sponsorName = adoptersForTree.join(', ');
      t.adopter = adoptersForTree.join(', ');
    }
  } else if (t.takenCount !== undefined && t.takenCount !== null && t.takenCount !== '') {
    taken = Math.min(total, Math.max(0, parseInt(t.takenCount) || 0));
  }

  const remaining = Math.max(0, total - taken);
  const adopterNames = adoptersForTree.length > 0 ? adoptersForTree.join(', ') : (t.sponsorName || t.adopter || '');

  // Keep tree fundingAmount updated only if explicitly set
  const fundingPerTree = (t.customFunding ? parseFloat(t.fundingAmount) : 0) || adopterFundingPerTree || 0;
  if (!t.fundingAmount && fundingPerTree > 0) {
    t.fundingAmount = fundingPerTree;
  }
  const totalFunding = adopterTotalFunding || (taken * fundingPerTree);

  return { total, taken, remaining, adopterNames, fundingPerTree, totalFunding };
}

function updateStats() {
  let totalTrees = 0;
  let takenTrees = 0;
  let availableTrees = 0;
  const speciesSet = new Set();

  ALL_TREES.forEach(t => {
    const { total, taken, remaining } = getTreeCounts(t);
    totalTrees += total;
    takenTrees += taken;
    availableTrees += remaining;
    if (t.species?.common) speciesSet.add(t.species.common);
  });

  const totalBatches = ALL_TREES.length;
  const takenPercent = totalTrees > 0 ? ((takenTrees / totalTrees) * 100).toFixed(1) : '0.0';
  const availPercent = totalTrees > 0 ? ((availableTrees / totalTrees) * 100).toFixed(1) : '0.0';

  const statTotalEl = document.getElementById('statTotalTrees');
  if (statTotalEl) statTotalEl.textContent = totalTrees.toLocaleString();

  const statBatchesEl = document.getElementById('statTotalBatches');
  if (statBatchesEl) statBatchesEl.textContent = `${totalBatches.toLocaleString()} registered batch${totalBatches === 1 ? '' : 'es'}`;

  const statTakenEl = document.getElementById('statTakenTrees');
  if (statTakenEl) statTakenEl.textContent = takenTrees.toLocaleString();

  const statTakenRateEl = document.getElementById('statTakenRate');
  if (statTakenRateEl) statTakenRateEl.textContent = `${takenPercent}% of all trees taken`;

  const statAvailEl = document.getElementById('statAvailableTrees');
  if (statAvailEl) statAvailEl.textContent = availableTrees.toLocaleString();

  const statAvailRateEl = document.getElementById('statAvailableRate');
  if (statAvailRateEl) statAvailRateEl.textContent = `${availPercent}% currently available`;

  const statSpeciesEl = document.getElementById('statSpeciesCount');
  if (statSpeciesEl) statSpeciesEl.textContent = `${speciesSet.size} Species`;

  const statBatchCountEl = document.getElementById('statBatchCount');
  if (statBatchCountEl) statBatchCountEl.textContent = `${totalBatches} active batch${totalBatches === 1 ? '' : 'es'}`;

  const navCount = document.getElementById('navTreeCount');
  if (navCount) {
    navCount.textContent = `${totalTrees.toLocaleString()} trees (${availableTrees.toLocaleString()} available · ${takenTrees.toLocaleString()} taken)`;
  }

  const tableBadge = document.getElementById('tableBadgeCount');
  if (tableBadge) {
    tableBadge.textContent = `${filteredTrees.length} batch${filteredTrees.length === 1 ? '' : 'es'} · ${totalTrees.toLocaleString()} total trees (${availableTrees.toLocaleString()} available)`;
  }
}

function setAvailabilityFilter(filter) {
  currentAvailabilityFilter = filter;
  currentPage = 1;

  document.querySelectorAll('.btn-avail-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
  });

  document.querySelectorAll('.summary-card').forEach(c => c.classList.remove('active-filter'));
  if (filter === 'all') {
    document.getElementById('cardTotalTrees')?.classList.add('active-filter');
  } else if (filter === 'taken') {
    document.getElementById('cardTakenTrees')?.classList.add('active-filter');
  } else if (filter === 'available') {
    document.getElementById('cardAvailableTrees')?.classList.add('active-filter');
  }

  const dropdown = document.getElementById('filterAvailability');
  if (dropdown) {
    if (filter === 'all') dropdown.value = 'all';
    else if (filter === 'available') dropdown.value = 'has-available';
    else if (filter === 'taken') dropdown.value = 'fully-taken';
  }

  applyFilters();
}
window.setAvailabilityFilter = setAvailabilityFilter;

/* ── 1. INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initSidebarToggles();
  initDatabaseSync();
  renderTable();
  initFilters();
  initSummaryCards();
  updateStats();
  initBulkActions();
  initModals();
  initDrawer();

  // Support ?filter=critical / ?filter=monitoring-due links from dashboard
  const urlParams = new URLSearchParams(window.location.search);
  const urlFilter = urlParams.get('filter');
  if (urlFilter) {
    setTimeout(() => filterByStatus(urlFilter), 50);
  }
  // Support #add anchor from dashboard
  if (window.location.hash === '#add') {
    setTimeout(() => {
      document.getElementById('btnAddTree')?.click();
    }, 100);
  }
});

function harmonizeAdopterTreeLocations(trees) {
  if (!Array.isArray(trees)) return false;
  let changed = false;
  const defTrees = (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_TREES)) ? window.ATAMAN_DEFAULT_TREES : DEFAULT_TREES;
  trees.forEach(t => {
    if (!t) return;
    const defT = Array.isArray(defTrees) ? defTrees.find(d => d.id === t.id) : null;
    if (defT) {
      if (!t.barangay && defT.barangay) { t.barangay = defT.barangay; changed = true; }
      if (!t.municipality && defT.municipality) { t.municipality = defT.municipality; changed = true; }
      if (!t.province && defT.province) { t.province = defT.province; changed = true; }
      if (t.lat == null && defT.lat != null) { t.lat = defT.lat; changed = true; }
      if (t.lng == null && defT.lng != null) { t.lng = defT.lng; changed = true; }
    }
    if (!t.caretaker || t.caretaker === 'Pedro Reyes') {
      t.caretaker = 'Unassigned';
      changed = true;
    } else if (t.caretaker === 'Dodong Zeta' && (parseInt(t.takenCount, 10) || 0) === 0 && !t.adopter && !t.sponsorName && !t.customAssignedCaretaker) {
      t.caretaker = 'Unassigned';
      changed = true;
    }
    t.customCaretaker = true;
    t.customGps = true;
    t.customLocation = true;
  });
  return changed;
}

/* ── Database Sync with Cloud Firestore & Real-Time Sync Bus ── */
async function initDatabaseSync() {
  if (harmonizeAdopterTreeLocations(ALL_TREES)) {
    localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(ALL_TREES));
  }

  // Listen for multi-tab & cross-device real-time sync
  window.addEventListener('ATAMAN:trees-updated', (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      ALL_TREES = e.detail;
      harmonizeAdopterTreeLocations(ALL_TREES);
      filteredTrees = [...ALL_TREES];
      renderTable();
      if (typeof updateStats === 'function') updateStats();
    }
  });

  if (window.ATAMAN_DB) {
    // Seed initial dataset to Firestore if first time
    // Zero Ghost Data: seedInitialTrees disabled

    // Listen for live Firestore / local updates
    window.ATAMAN_DB.onTreesChange((trees, source) => {
      if (Array.isArray(trees) && trees.length > 0) {
        ALL_TREES = trees;
      } else {
        const local = (() => {
          try {
            const raw = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
            return Array.isArray(raw) && raw.length > 0 ? raw : null;
          } catch (_) { return null; }
        })();
        ALL_TREES = local || [];
      }
      harmonizeAdopterTreeLocations(ALL_TREES);
      filteredTrees = [...ALL_TREES];
      // Also persist to localStorage so we have offline fallback
      localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(ALL_TREES));
      renderTable();
      if (typeof updateStats === 'function') updateStats();
      console.log(`[ATAMAN] Loaded ${ALL_TREES.length} trees from ${source}.`);
    });
  } else {
    // No Firestore — use localStorage data already loaded at top
    filteredTrees = [...ALL_TREES];
    renderTable();
    console.log(`[ATAMAN] Offline mode: loaded ${ALL_TREES.length} trees from localStorage.`);
  }
}

/* ── 2. AUTH ── */
function initAuth() {
  try {
    if (window.ATAMAN_AUTH) {
      window.ATAMAN_AUTH.onAuthStateChanged(user => {
        if (!user) { window.location.href = 'index.html'; return; }
        const name = user.displayName || localStorage.getItem('ATAMAN_user_name') || 'Ethel Zeta (Admin)';
        setUserMeta(name, 'Super Administrator');
      });
    } else {
      const stored = JSON.parse(localStorage.getItem('ATAMANUser') || 'null');
      const name = stored?.name || localStorage.getItem('ATAMAN_user_name') || 'Ethel Zeta (Admin)';
      const role = stored?.role || 'Super Administrator';
      setUserMeta(name, role);
    }
  } catch (e) {
    setUserMeta('Ethel Zeta (Admin)', 'Super Administrator');
  }

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('ATAMANUser');
    window.location.href = 'index.html';
  });
}

function setUserMeta(name, role) {
  const sbUserName = document.getElementById('sbUserName');
  const sbUserRole = document.getElementById('sbUserRole');
  const sbAvatar = document.getElementById('sbUserAvatar') || document.getElementById('sbAvatar');
  if (sbUserName) sbUserName.textContent = name;
  if (sbUserRole) sbUserRole.textContent = role;
  if (sbAvatar) sbAvatar.textContent = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'EZ';
}

/* ── 3. SIDEBAR TOGGLES ── */
function initSidebarToggles() {
  document.querySelectorAll('.nav-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const li = btn.closest('.nav-item');
      if (li) li.classList.toggle('open');
    });
  });
  // Quick-link sidebar shortcuts
  const sbCritical = document.getElementById('sbCriticalTrees');
  if (sbCritical) sbCritical.addEventListener('click', e => { e.preventDefault(); filterByStatus('critical'); });
  const sbDue = document.getElementById('sbMonitoringDue');
  if (sbDue) sbDue.addEventListener('click', e => { e.preventDefault(); filterByStatus('monitoring-due'); });
  const sbAdd = document.getElementById('sbAddTree');
  if (sbAdd) sbAdd.addEventListener('click', e => { e.preventDefault(); openModal('modalAddTree'); });
}

/* ── 4. RENDER TABLE ── */
function renderTable() {
  const tbody = document.getElementById('treesTableBody');
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, filteredTrees.length);
  const slice = filteredTrees.slice(start, end);

  updateStats();

  document.getElementById('tablePageInfo').textContent = `Showing ${filteredTrees.length === 0 ? 0 : start + 1}–${end} of ${filteredTrees.length.toLocaleString()}`;

  if (slice.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:56px 20px; color:#64748b; font-weight:600; font-size:14px;">
      <div style="font-size:28px; margin-bottom:8px;">🌱</div>
      No trees match your filter.<br>
      <span style="font-size:12px; color:#94a3b8; font-weight:500;">Try resetting your filters or click <strong>+ Add Tree</strong> above to enter your own tree data.</span>
    </td></tr>`;
    renderPagination();
    return;
  }

  tbody.innerHTML = slice.map(t => {
    const { total, taken, remaining, adopterNames } = getTreeCounts(t);
    const checked = selectedIds.has(t.id) ? 'checked' : '';
    const isFullyTaken = remaining === 0;
    const isPartiallyTaken = taken > 0 && remaining > 0;
    const displayAdopter = adopterNames || t.sponsorName || t.adopter || '';

    return `
      <tr class="${selectedIds.has(t.id) ? 'selected' : ''}" id="row-${t.id}">
        <td><input type="checkbox" class="row-check" data-id="${t.id}" ${checked} onchange="handleRowCheck(this)" style="width:16px;height:16px;cursor:pointer;" /></td>
        <td>
          <div class="tree-id-cell" onclick="openTreeProfile('${t.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
            ${t.id}
          </div>
        </td>
        <td>
          <div class="tree-species-cell">
            <span class="species-common">${t.species?.common || '—'}</span>
            <span class="species-scientific" style="font-style:italic; color:#64748b; font-size:12px;">${t.species?.scientific || ''}</span>
            ${displayAdopter ? `
              <div style="margin-top:3px;">
                <span style="display:inline-flex; align-items:center; gap:3px; padding:1px 7px; font-size:11px; font-weight:700; border-radius:4px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">
                  🤝 Adopted by ${displayAdopter}
                </span>
              </div>
            ` : ''}
          </div>
        </td>
        <td>
          <span style="display:inline-block; padding:3px 9px; font-size:12px; font-weight:700; border-radius:6px; background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">
            ${t.treeType || t.species?.type || 'Native'}
          </span>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:4px; min-width:180px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <span style="font-weight:800; font-size:13.5px; color:#0f172a;">
                🌳 ${total.toLocaleString()} ${total === 1 ? 'tree' : 'trees'}
              </span>
              ${isFullyTaken ? `
                <span style="font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:10px; background:#fef2f2; color:#dc2626; border:1px solid #fecaca; white-space:nowrap;">
                  🔴 Fully Taken
                </span>
              ` : isPartiallyTaken ? `
                <span style="font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:10px; background:#fefce8; color:#a16207; border:1px solid #fde047; white-space:nowrap;">
                  🟡 Partially Taken
                </span>
              ` : displayAdopter ? `
                <span style="font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:10px; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; white-space:nowrap;">
                  🟢 Available
                </span>
              ` : `
                <span style="font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:10px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; white-space:nowrap;">
                  ⏳ Standby
                </span>
              `}
            </div>

            <!-- Numbers breakdown: Available & Taken -->
            <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap; font-size:11.5px;">
              <span style="font-weight:700; color:#15803d; background:#ecfdf5; border:1px solid #a7f3d0; padding:1px 6px; border-radius:4px;" title="Remaining trees currently available">
                🟢 ${remaining.toLocaleString()} available
              </span>
              ${taken > 0 ? `
                <span style="font-weight:700; color:#1d4ed8; background:#eff6ff; border:1px solid #bfdbfe; padding:1px 6px; border-radius:4px;" title="Trees already taken / adopted">
                  🤝 ${taken.toLocaleString()} taken
                </span>
              ` : ''}
            </div>

            <!-- Visual Progress Bar showing Taken vs Available ratio -->
            <div style="width:100%; height:5px; background:#e2e8f0; border-radius:4px; overflow:hidden; display:flex;" title="${taken} taken, ${remaining} available out of ${total}">
              <div style="width:${(taken / total) * 100}%; background:#3b82f6;"></div>
              <div style="width:${(remaining / total) * 100}%; background:#22c55e;"></div>
            </div>
          </div>
        </td>
        <td style="font-weight:600; font-size:13px; color:#334155;">
          ${t.ageOfTree || t.age || '—'}
        </td>
        <td style="white-space:nowrap; font-size:13px; color:#64748b; font-weight:600;">
          ${t.dateAdded || formatDateShort(t.createdAt || t.plantingDate || t.datePlanted)}
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <button onclick="openTreeProfile('${t.id}')" title="View tree details"
              style="background:none; border:none; cursor:pointer; padding:3px 5px; border-radius:6px; color:#16a34a; display:flex; align-items:center; transition:background 0.15s;"
              onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='none'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button onclick="confirmDeleteTree('${t.id}')" title="Delete tree"
              style="background:none; border:none; cursor:pointer; padding:3px 5px; border-radius:6px; color:#dc2626; display:flex; align-items:center; transition:background 0.15s;"
              onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='none'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        </td>


      </tr>
    `;
  }).join('');

  renderPagination();

  // Update check-all state
  const checkAll = document.getElementById('checkAll');
  const pageIds = slice.map(t => t.id);
  checkAll.indeterminate = pageIds.some(id => selectedIds.has(id)) && !pageIds.every(id => selectedIds.has(id));
  checkAll.checked = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
}

function statusBadgeHTML(status) {
  const map = {
    healthy: '<span class="status-badge healthy">🟢 Healthy</span>',
    'needs-care': '<span class="status-badge needs-care">🟡 Needs Care</span>',
    critical: '<span class="status-badge critical">🔴 Critical</span>',
    dead: '<span class="status-badge dead">⚫ Dead</span>',
  };
  return map[status] || status;
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

/* ── 5. PAGINATION ── */
function renderPagination() {
  const total = filteredTrees.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  document.getElementById('paginationInfo').textContent =
    `Page ${currentPage} of ${totalPages} — ${total.toLocaleString()} trees`;

  const ctrl = document.getElementById('paginationControls');
  let html = `<button class="btn-page" onclick="goPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>← Prev</button>`;

  const visiblePages = getPageRange(currentPage, totalPages);
  visiblePages.forEach(p => {
    if (p === '…') {
      html += `<span style="padding:6px 4px; color:#94a3b8; font-weight:700;">…</span>`;
    } else {
      html += `<button class="btn-page ${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
    }
  });

  html += `<button class="btn-page" onclick="goPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>Next →</button>`;
  ctrl.innerHTML = html;
}

function getPageRange(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (cur >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', cur - 1, cur, cur + 1, '…', total];
}

function goPage(page) {
  const totalPages = Math.ceil(filteredTrees.length / pageSize) || 1;
  currentPage = Math.max(1, Math.min(page, totalPages));
  renderTable();
  document.querySelector('.content-area').scrollIntoView({ behavior: 'smooth' });
}

/* ── 6. FILTERS ── */
function initFilters() {
  // Toggle advanced panel
  document.getElementById('btnToggleAdvFilters').addEventListener('click', () => {
    const panel = document.getElementById('advancedFiltersPanel');
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'grid';
  });

  // Search input
  document.getElementById('tableSearchInput').addEventListener('input', () => {
    currentPage = 1;
    applyFilters();
  });

  // All dropdowns
  ['filterSpecies', 'filterHealth', 'filterCaretaker', 'filterProvince',
   'filterMunicipality', 'filterBarangay', 'filterProject', 'filterMonitoring',
   'filterPlantingDate', 'filterTreeType', 'filterAvailability'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  });

  // Reset
  document.getElementById('btnResetFilters').addEventListener('click', resetFilters);

  // Page size
  document.getElementById('tablePageSize').addEventListener('change', e => {
    pageSize = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
  });

  // Check-all
  document.getElementById('checkAll').addEventListener('change', function () {
    const start = (currentPage - 1) * pageSize;
    const slice = filteredTrees.slice(start, start + pageSize);
    slice.forEach(t => {
      if (this.checked) selectedIds.add(t.id);
      else selectedIds.delete(t.id);
    });
    updateBulkBar();
    renderTable();
  });
}

function applyFilters() {
  const keyword = document.getElementById('tableSearchInput').value.toLowerCase().trim();
  const species  = document.getElementById('filterSpecies')?.value || 'all';
  const health   = document.getElementById('filterHealth')?.value || 'all';
  const ctaker   = document.getElementById('filterCaretaker')?.value || 'all';
  const prov     = document.getElementById('filterProvince')?.value || 'all';
  const muni     = document.getElementById('filterMunicipality')?.value || 'all';
  const brngy    = document.getElementById('filterBarangay')?.value || 'all';
  const proj     = document.getElementById('filterProject')?.value || 'all';
  const mstatus  = document.getElementById('filterMonitoring')?.value || 'all';
  const pdate    = document.getElementById('filterPlantingDate')?.value || 'all';
  const ttype    = document.getElementById('filterTreeType')?.value || 'all';
  const avail    = document.getElementById('filterAvailability')?.value || 'all';

  let statusFilter = health !== 'all' ? health : currentActiveFilter;

  filteredTrees = ALL_TREES.filter(t => {
    const { total, taken, remaining } = getTreeCounts(t);

    // Quick Pill / Metric Card Availability Filter
    if (currentAvailabilityFilter === 'available' && remaining <= 0) return false;
    if (currentAvailabilityFilter === 'taken' && taken <= 0) return false;

    // Advanced Dropdown Filter
    if (avail === 'has-available' && remaining <= 0) return false;
    if (avail === 'all-available' && taken > 0) return false;
    if (avail === 'partially-taken' && (taken <= 0 || remaining <= 0)) return false;
    if (avail === 'fully-taken' && (taken < total || total === 0)) return false;

    if (keyword) {
      const adopterStr = `${t.sponsorName || ''} ${t.adopter || ''}`;
      const haystack = `${t.id} ${t.species?.common || ''} ${t.species?.scientific || ''} ${t.caretaker || ''} ${t.barangay || ''} ${t.municipality || ''} ${t.landowner || ''} ${adopterStr}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    if (statusFilter) {
      if (statusFilter === 'monitoring-due') {
        if (!['monitoring-due', 'overdue'].includes(t.monitoringStatus)) return false;
      } else {
        if (t.status !== statusFilter) return false;
      }
    }
    if (species !== 'all' && t.species?.common !== species) return false;
    if (ctaker !== 'all' && t.caretaker !== ctaker) return false;
    if (prov !== 'all' && t.province !== prov) return false;
    if (muni !== 'all' && t.municipality !== muni) return false;
    if (brngy !== 'all' && t.barangay !== brngy) return false;
    if (proj !== 'all' && t.project !== proj) return false;
    if (mstatus !== 'all' && t.monitoringStatus !== mstatus) return false;
    if (pdate !== 'all' && !t.plantingDate?.startsWith(pdate)) return false;
    if (ttype !== 'all' && (t.treeType || t.species?.type) !== ttype) return false;
    return true;
  });

  renderTable();
}

function filterByStatus(status) {
  currentActiveFilter = status;
  currentPage = 1;
  // Update card highlights
  document.querySelectorAll('.summary-card').forEach(c => c.classList.remove('active-filter'));
  const dataMap = { healthy: 'cardHealthy', 'needs-care': 'cardNeedsCare', critical: 'cardCritical', dead: 'cardDead', 'monitoring-due': 'cardPending', '': 'cardTotal' };
  const targetCard = document.getElementById(dataMap[status]);
  if (targetCard) targetCard.classList.add('active-filter');
  applyFilters();
}

function resetFilters() {
  document.getElementById('tableSearchInput').value = '';
  ['filterSpecies', 'filterHealth', 'filterCaretaker', 'filterProvince',
   'filterMunicipality', 'filterBarangay', 'filterProject', 'filterMonitoring',
   'filterPlantingDate', 'filterTreeType', 'filterAvailability'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  currentActiveFilter = '';
  currentAvailabilityFilter = 'all';
  currentPage = 1;
  document.querySelectorAll('.summary-card').forEach(c => c.classList.remove('active-filter'));
  document.getElementById('cardTotalTrees')?.classList.add('active-filter');
  document.querySelectorAll('.btn-avail-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === 'all');
  });
  filteredTrees = [...ALL_TREES];
  renderTable();
  updateStats();
  showAdminToast('Filters cleared.');
}

function initSummaryCards() {
  document.querySelectorAll('.summary-card').forEach(card => {
    card.addEventListener('click', () => {
      const avail = card.dataset.availFilter;
      if (avail) {
        setAvailabilityFilter(avail);
        return;
      }
      const f = card.dataset.filter;
      if (f) {
        if (currentActiveFilter === f) {
          currentActiveFilter = '';
          card.classList.remove('active-filter');
        } else {
          filterByStatus(f);
        }
      }
    });
  });
}

/* ── 7. ROW SELECTION & BULK ACTIONS ── */
function handleRowCheck(checkbox) {
  const id = checkbox.dataset.id;
  if (checkbox.checked) selectedIds.add(id);
  else selectedIds.delete(id);
  updateBulkBar();
  const row = document.getElementById(`row-${id}`);
  if (row) row.classList.toggle('selected', checkbox.checked);
}

function updateBulkBar() {
  const bar = document.getElementById('bulkActionsBar');
  const count = selectedIds.size;
  document.getElementById('bulkCountLabel').textContent = `${count} tree${count !== 1 ? 's' : ''} selected`;
  bar.classList.toggle('show', count > 0);
}

function clearBulkSelection() {
  selectedIds.clear();
  updateBulkBar();
  renderTable();
}

function initBulkActions() {
  updateBulkBar(); // Initial state sync
  document.getElementById('btnBulkAssign').addEventListener('click', () => {
    document.getElementById('bulkAssignDesc').innerHTML =
      `Assign a new caretaker to <strong>${selectedIds.size} selected trees</strong>.`;
    openModal('modalBulkAssign');
  });

  document.getElementById('btnBulkProject').addEventListener('click', () =>
    showAdminToast(`Changing project for ${selectedIds.size} trees...`));

  document.getElementById('btnBulkSchedule').addEventListener('click', () =>
    showAdminToast(`Scheduling monitoring for ${selectedIds.size} trees...`));

  document.getElementById('btnBulkExport').addEventListener('click', () => {
    openModal('modalExport');
    document.getElementById('exportScope').value = 'Selected Trees Only';
  });

  document.getElementById('btnBulkArchive').addEventListener('click', () => {
    document.getElementById('archiveCount').textContent = selectedIds.size;
    openModal('modalArchiveConfirm');
  });

  document.getElementById('btnAddTree').addEventListener('click', () => {
    openEditTree();
  });

  document.getElementById('btnImportTrees').addEventListener('click', () => openModal('modalImport'));
  document.getElementById('btnExportTrees').addEventListener('click', () => openModal('modalExport'));
}

function handleBulkAssign() {
  const caretaker = document.getElementById('bulkNewCaretaker').value;
  showAdminToast(`✅ ${selectedIds.size} trees assigned to ${caretaker}.`);
  clearBulkSelection();
  closeModal('modalBulkAssign');
}

function handleArchive() {
  showAdminToast(`🗄 ${selectedIds.size} trees archived.`);
  clearBulkSelection();
  closeModal('modalArchiveConfirm');
}

function confirmArchiveSingle(id) {
  document.getElementById('archiveCount').textContent = `tree ${id}`;
  openModal('modalArchiveConfirm');
}

function handleExport() {
  showAdminToast('⬇️ Export started — downloading...');
  closeModal('modalExport');
}

/* ── 8. ROW CONTEXT MENUS ── */
function toggleRowMenu(event, id) {
  event.stopPropagation();
  const menu = document.getElementById(`menu-${id}`);
  const isOpen = menu.classList.contains('show');
  document.querySelectorAll('.row-action-menu').forEach(m => m.classList.remove('show'));
  if (!isOpen) menu.classList.add('show');
}

document.addEventListener('click', () => {
  document.querySelectorAll('.row-action-menu').forEach(m => m.classList.remove('show'));
});

/* ── 9. TREE PROFILE DRAWER ── */
function initDrawer() {
  document.getElementById('drawerCloseBtn').addEventListener('click', closeDrawer);
  document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);
}

function openTreeProfile(treeId) {
  const t = ALL_TREES.find(x => x.id === treeId);
  if (!t) return;

  document.getElementById('drawerTopTitle').textContent = `${t.id} — ${t.species.common}`;

  const statusColors = {
    healthy: { bg: '#dcfce7', color: '#15803d' },
    'needs-care': { bg: '#fef9c3', color: '#a16207' },
    critical: { bg: '#fee2e2', color: '#b91c1c' },
    dead: { bg: '#f1f5f9', color: '#475569' },
  };
  const sc = statusColors[t.status] || {};

  const statusLabel = { healthy: '🟢 Healthy', 'needs-care': '🟡 Needs Care', critical: '🔴 Critical', dead: '⚫ Dead' }[t.status] || t.status;

  const { total, taken, remaining, adopterNames, fundingPerTree, totalFunding } = getTreeCounts(t);
  const effectiveFundingPerTree = fundingPerTree > 0 ? fundingPerTree : (parseFloat(t.fundingAmount) || 0);
  const effectiveTotalFunding = totalFunding > 0 ? totalFunding : (taken * effectiveFundingPerTree);
  const estAgeMonths = t.plantingDate
    ? Math.max(0, Math.floor((Date.now() - new Date(t.plantingDate)) / (30 * 24 * 3600 * 1000)))
    : 0;

  const html = `
    <!-- Header -->
    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:14px;">
      <div class="profile-id-headline">
        <div class="profile-tree-id">${t.id} — ${t.species.common.toUpperCase()}</div>
        <div class="profile-botanical-tag">${t.species.scientific}</div>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
        <span class="profile-status-badge" style="background:${sc.bg}; color:${sc.color};">${statusLabel}</span>
        ${(t.sponsorName || t.adopter || adopterNames) ? `<span class="profile-status-badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:11px; font-weight:700;">🤝 Adopted by ${t.sponsorName || t.adopter || adopterNames}</span>` : ''}
      </div>
    </div>

    <!-- Admin Action Buttons -->
    <div class="profile-actions-bar">
      <button class="btn-profile-tool" onclick="openEditTree('${t.id}')">✏️ Edit Tree</button>
      <button class="btn-profile-tool" onclick="showAdminToast('Change caretaker...')">👤 Change Caretaker</button>
      <a class="btn-profile-tool" href="admin-tree-map.html">📍 View on Map</a>
      <button class="btn-profile-tool" onclick="openPhotoEvidenceModal('${t.id}', 0)">📷 Photos</button>
      <button class="btn-profile-tool" onclick="showAdminToast('Loading monitoring history...')">📊 Monitoring</button>
      <button class="btn-profile-tool" onclick="openLogMaintenanceModal('${t.id}')">🔧 Maintenance</button>
      <button class="btn-profile-tool danger" onclick="confirmArchiveSingle('${t.id}')">🗄 Archive</button>
    </div>

    <!-- 5. Basic Information & Availability -->
    <div class="profile-section-card">
      <div class="profile-section-hdr">📋 Basic Information &amp; Availability</div>
      <div class="profile-data-row"><span class="profile-data-label">Tree ID</span><span class="profile-data-val">${t.id}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Name of Tree</span><span class="profile-data-val">${t.species?.common || '—'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Scientific Name</span><span class="profile-data-val" style="font-style:italic;">${t.species?.scientific || '—'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Tree Type</span><span class="profile-data-val">${t.treeType || t.species?.type || 'Native'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Total Trees Registered</span><span class="profile-data-val" style="font-weight:800; color:#0f172a;">🌳 ${total.toLocaleString()}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Trees Taken / Adopted</span><span class="profile-data-val" style="font-weight:700; color:#2563eb;">🤝 ${taken.toLocaleString()} ${taken > 0 && (t.sponsorName || t.adopter || adopterNames) ? `(by ${t.sponsorName || t.adopter || adopterNames})` : ''}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Remaining &amp; Available</span><span class="profile-data-val" style="font-weight:800; color:#16a34a;">🟢 ${remaining.toLocaleString()} trees available</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Availability Status</span><span class="profile-data-val">${remaining === 0 ? '<span style="color:#dc2626;font-weight:700;">🔴 Fully Taken</span>' : taken > 0 ? '<span style="color:#a16207;font-weight:700;">🟡 Partially Taken</span>' : '<span style="color:#15803d;font-weight:700;">🟢 100% Available</span>'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Age / Growth Stage</span><span class="profile-data-val">${t.age || (estAgeMonths ? `${estAgeMonths} months` : '—')}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Date Added</span><span class="profile-data-val">${t.savedAt || formatDateShort(t.plantingDate)}</span></div>
    </div>

    <!-- Location (only shown when location data is explicitly provided) -->
    ${(t.province || t.municipality || t.barangay || (t.lat != null && t.lat !== '') || (t.lng != null && t.lng !== '')) ? `
    <div class="profile-section-card">
      <div class="profile-section-hdr">📍 Location</div>
      <div class="profile-data-row"><span class="profile-data-label">Province</span><span class="profile-data-val">${t.province || '—'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Municipality</span><span class="profile-data-val">${t.municipality || '—'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Barangay</span><span class="profile-data-val">${t.barangay ? (String(t.barangay).startsWith('Brgy.') ? t.barangay : `Brgy. ${t.barangay}`) : '—'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">GPS Latitude</span><span class="profile-data-val">${t.lat != null && t.lat !== '' && !isNaN(Number(t.lat)) ? Number(t.lat).toFixed(6) : '—'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">GPS Longitude</span><span class="profile-data-val">${t.lng != null && t.lng !== '' && !isNaN(Number(t.lng)) ? Number(t.lng).toFixed(6) : '—'}</span></div>
    </div>` : ''}

    <!-- Assignment & Sponsorship -->
    <div class="profile-section-card">
      <div class="profile-section-hdr">🤝 Sponsorship &amp; Assignment</div>
      <div class="profile-data-row"><span class="profile-data-label">Sponsor / Adopter</span><span class="profile-data-val">${(t.sponsorName || t.adopter || adopterNames) ? `<strong style="color:#1d4ed8;">🤝 ${t.sponsorName || t.adopter || adopterNames}</strong>` : '<span style="color:#94a3b8;">Not yet adopted</span>'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Funding per Tree</span><span class="profile-data-val">${effectiveFundingPerTree > 0 ? '₱' + Number(effectiveFundingPerTree).toLocaleString() : '—'}</span></div>
      ${taken > 0 && effectiveTotalFunding > 0 ? `<div class="profile-data-row"><span class="profile-data-label">Total Sponsoring Funding</span><span class="profile-data-val" style="font-weight:700; color:#16a34a;">₱${Number(effectiveTotalFunding).toLocaleString()}</span></div>` : ''}
      <div class="profile-data-row"><span class="profile-data-label">Project</span><span class="profile-data-val">${t.project || '—'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Caretaker</span><span class="profile-data-val">${(t.caretaker && t.caretaker !== 'Unassigned') ? t.caretaker : 'Unassigned'}</span></div>
    </div>

    <!-- 6. Tree Condition -->
    <div class="profile-section-card">
      <div class="profile-section-hdr">🌱 Current Condition</div>
      <div class="profile-data-row"><span class="profile-data-label">Health</span><span class="profile-data-val">${statusLabel}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Height</span><span class="profile-data-val">${t.height && !String(t.height).includes('month') ? (String(t.height).match(/[a-zA-Z]/) ? t.height : `${t.height} m`) : (t.height || '—')}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Trunk Diameter</span><span class="profile-data-val">${t.trunkDiam && t.trunkDiam !== 'undefined' ? `${t.trunkDiam} cm` : '—'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Pest / Disease</span><span class="profile-data-val">${t.pest && t.pest !== 'undefined' ? t.pest : 'None detected'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Soil Condition</span><span class="profile-data-val">${t.soil && t.soil !== 'undefined' ? t.soil : 'Good / Moist'}</span></div>
      <div class="profile-data-row"><span class="profile-data-label">Watering</span><span class="profile-data-val">${t.watering && t.watering !== 'undefined' ? t.watering : 'Adequate'}</span></div>
      ${t.remarks ? `<div class="profile-data-row"><span class="profile-data-label">Remarks</span><span class="profile-data-val" style="text-align:right; max-width:200px;">${t.remarks}</span></div>` : ''}
      <div style="margin-top:8px; padding-top:8px; border-top:1px solid #e2e8f0;">
        <div style="font-size:12px; color:#64748b; font-weight:600;">Last monitored: <strong style="color:#0f172a;">${t.lastCheck && t.lastCheck !== 'undefined' ? t.lastCheck : (t.savedAt || 'Recently registered')}</strong></div>
        <div style="font-size:12px; color:#64748b; font-weight:600; margin-top:3px;">Monitored by: <strong style="color:#0f172a;">${t.caretaker && t.caretaker !== 'undefined' ? t.caretaker : 'Unassigned'}</strong></div>
      </div>
    </div>

    <!-- 7. Monitoring History -->
    <div class="profile-section-card">
      <div class="profile-section-hdr">📷 Monitoring History</div>
      ${generateMonitoringHistory(t)}
      <button class="btn-nav-action" style="margin-top:8px; width:100%; justify-content:center;" onclick="showAdminToast('Loading complete monitoring history...')">
        View Complete Monitoring History →
      </button>
    </div>

    <!-- 8. Photo Evidence -->
    <div class="profile-section-card" style="overflow:hidden; max-width:100%; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div class="profile-section-hdr" style="margin:0; border:none; padding:0;">🖼 Photo Evidence (4 Views)</div>
        <div style="display:flex; gap:6px;">
          <button class="btn-profile-tool" style="padding:4px 10px; font-size:11px; font-weight:700; background:#16a34a; color:#fff; border-color:#16a34a; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" onclick="triggerDirectPhotoUpload('${t.id}', 0)">
            📤 Upload Photo
          </button>
          <button class="btn-profile-tool" style="padding:4px 8px; font-size:11px; height:auto; cursor:pointer;" onclick="openPhotoEvidenceModal('${t.id}', 0)">
            🔍 View Full
          </button>
        </div>
      </div>
      <div class="photo-evidence-grid" style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px; width:100%; box-sizing:border-box;">
        ${generatePhotoThumbs(t)}
      </div>
      <div style="padding:8px 10px; background:#f0fdf4; border:1px dashed #86efac; border-radius:8px; font-size:11px; color:#15803d; display:flex; align-items:center; justify-content:space-between;">
        <span>💡 Click <strong>📷 Upload</strong> below any photo to attach new field evidence.</span>
      </div>
    </div>

    <!-- 9. Maintenance History -->
    <div class="profile-section-card">
      <div class="profile-section-hdr">🔧 Maintenance History</div>
      ${generateMaintenanceHistory(t)}
    </div>

    <!-- 10. Tree Lifecycle Timeline -->
    <div class="profile-section-card">
      <div class="profile-section-hdr">📅 Tree Activity Timeline</div>
      <div class="lifecycle-timeline-wrap">
        ${generateTimeline(t)}
      </div>
    </div>
  `;

  document.getElementById('drawerContentScroll').innerHTML = html;
  document.getElementById('treeProfileDrawer').classList.add('open');
  document.getElementById('drawerOverlay').style.display = 'block';
}

function closeDrawer() {
  document.getElementById('treeProfileDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').style.display = 'none';
}

function generateMonitoringHistory(t) {
  if (Array.isArray(t.monitoringHistory) && t.monitoringHistory.length > 0) {
    const statusLabel = (s) => ({ healthy: '🟢 Healthy', 'needs-care': '🟡 Needs Care', critical: '🔴 Critical', dead: '⚫ Dead' }[s] || s);
    return t.monitoringHistory.map(e => `
      <div style="padding:10px 0; border-bottom:1px solid #f1f5f9;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:12.5px; font-weight:800; color:#0f172a;">${e.date}</span>
          <span>${statusLabel(e.status)}</span>
        </div>
        <div style="font-size:12px; color:#64748b; margin-top:3px;">
          Height: ${e.height ? `${e.height}m` : '—'} &nbsp;·&nbsp; Trunk: ${e.trunk ? `${e.trunk}cm` : '—'} &nbsp;·&nbsp; By: ${e.by || 'Unassigned'}
        </div>
      </div>
    `).join('');
  }

  // Clean state until monitoring logs exist
  return `
    <div style="padding:14px 10px; text-align:center; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:10px; margin:4px 0;">
      <div style="font-size:18px; margin-bottom:2px;">📷</div>
      <div style="font-size:12.5px; font-weight:700; color:#475569;">No field monitoring logs yet.</div>
      <div style="font-size:11.5px; color:#94a3b8; margin-top:2px;">Initial record: ${t.savedAt || formatDateShort(t.plantingDate) || 'Recently registered'} · Health: ${t.status || 'Healthy'}</div>
    </div>
  `;
}

function generatePhotoThumbs(t) {
  const keys = ['treePhoto', 'leaves', 'trunk', 'soil'];
  const types = ['Tree Photo', 'Leaves', 'Trunk', 'Soil'];
  const colors = ['#dcfce7', '#fef9c3', '#dbeafe', '#fce7f3'];
  const emojis = ['🌳', '🌿', '🪵', '🪨'];

  return keys.map((key, i) => {
    const photoUrl = (t.photos && t.photos[key]) ? t.photos[key] : (DEFAULT_TREE_PHOTOS[key]?.url || getPhotoFallback(key));
    const fallback = getPhotoFallback(key);
    const dateStr = t.savedAt || t.dateAdded || formatDateShort(t.plantingDate) || 'Nov 5, 2026';
    const hasCustomPhoto = !!(t.photos && t.photos[key]);

    return `
      <div class="photo-evidence-box" style="min-width:0; width:100%; box-sizing:border-box; display:flex; flex-direction:column; gap:4px;">
        <div class="photo-evidence-thumb-container" onclick="openPhotoEvidenceModal('${t.id}', ${i})" title="Click to view full ${types[i]}" style="position:relative; width:100%; height:78px; min-width:0; border-radius:8px; overflow:hidden; border:1px solid #cbd5e1; background:${colors[i]}; cursor:pointer; box-sizing:border-box;">
          <img src="${photoUrl}" alt="${types[i]}" 
            onerror="this.onerror=null; this.src='${fallback}';"
            style="width:100%; max-width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.25s ease;"
            onmouseover="this.style.transform='scale(1.08)'"
            onmouseout="this.style.transform='scale(1)'"
          />
          <div class="photo-thumb-hover-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; gap:6px; opacity:0; transition:opacity 0.15s ease;"
            onmouseover="this.style.opacity='1'"
            onmouseout="this.style.opacity='0'"
          >
            <span onclick="event.stopPropagation(); openPhotoEvidenceModal('${t.id}', ${i})" title="View photo" style="background:rgba(255,255,255,0.95); color:#0f172a; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.3); cursor:pointer;">🔍</span>
            <span onclick="event.stopPropagation(); triggerPhotoUploadForAngle('${t.id}', ${i})" title="Upload/Change photo" style="background:#16a34a; color:#fff; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.3); cursor:pointer;">📷</span>
          </div>
          <span style="position:absolute; bottom:3px; right:3px; font-size:11px; background:rgba(255,255,255,0.9); border-radius:4px; padding:1px 4px; line-height:1; backdrop-filter:blur(2px);">${emojis[i]}</span>
          ${hasCustomPhoto ? `<span style="position:absolute; top:3px; left:3px; font-size:9px; background:#16a34a; color:#fff; font-weight:800; border-radius:4px; padding:1px 4px; line-height:1;">VERIFIED</span>` : ''}
        </div>
        <div class="photo-evidence-caption" style="font-size:11px; font-weight:700; color:#1e293b; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">${types[i]}</div>
        <div class="photo-evidence-date" style="font-size:10px; color:#64748b; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${dateStr}</div>
        <button onclick="event.stopPropagation(); triggerPhotoUploadForAngle('${t.id}', ${i})" title="Upload evidence photo for ${types[i]}" style="font-size:10.5px; padding:3px 4px; border-radius:6px; border:1px solid #bbf7d0; background:#f0fdf4; color:#15803d; font-weight:700; cursor:pointer; width:100%; display:flex; align-items:center; justify-content:center; gap:3px; transition:all 0.15s;" onmouseover="this.style.background='#dcfce7';this.style.borderColor='#86efac'" onmouseout="this.style.background='#f0fdf4';this.style.borderColor='#bbf7d0'">
          📷 Upload
        </button>
      </div>
    `;
  }).join('');
}

function generateMaintenanceHistory(t) {
  const maintenanceItems = Array.isArray(t.maintenanceHistory) ? t.maintenanceHistory : [];

  // Left completely blank / clean placeholder until maintenance data is updated
  if (maintenanceItems.length === 0) {
    return `
      <div style="padding:16px 12px; text-align:center; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:10px; margin:4px 0;">
        <div style="font-size:20px; margin-bottom:4px;">🔧</div>
        <div style="font-size:12.5px; font-weight:700; color:#475569;">No maintenance records logged yet.</div>
        <div style="font-size:11.5px; color:#94a3b8; margin-top:2px;">Maintenance activities will appear here in real-time once recorded.</div>
        <button class="btn-profile-tool" style="margin:10px auto 0; font-size:11.5px; padding:4px 12px; color:#15803d; border-color:#86efac; background:#f0fdf4;" onclick="openLogMaintenanceModal('${t.id}')">
          ➕ Record Maintenance
        </button>
      </div>
    `;
  }

  return maintenanceItems.map(m => `
    <div style="padding:12px 0; border-bottom:1px solid #f1f5f9;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; font-weight:800; color:#0f172a;">${m.date} — ${m.type}</span>
        <span style="font-size:11.5px; font-weight:700; color:#64748b;">📷 ${m.photos || 1} photo${(m.photos || 1) === 1 ? '' : 's'}</span>
      </div>
      <div style="font-size:12px; color:#475569; margin-top:4px; display:grid; gap:2px;">
        <span><strong>Treatment:</strong> ${m.desc}</span>
        <span><strong>Result:</strong> ${m.result}</span>
        <span><strong>By:</strong> ${m.by}</span>
      </div>
    </div>
  `).join('');
}

function generateTimeline(t) {
  const events = [];
  const toTs = (v) => {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };
  const fmtShort = (v, fallback = 'Recent') => {
    const ts = toTs(v);
    if (!ts) return (typeof v === 'string' && v) ? v.split(',')[0] : fallback;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const peso = (n) => '₱' + (Number(n) || 0).toLocaleString();

  // 1. Real-time maintenance events if recorded
  if (Array.isArray(t.maintenanceHistory) && t.maintenanceHistory.length > 0) {
    t.maintenanceHistory.forEach(m => {
      events.push({
        icon: '🔧',
        color: 'maintenance',
        ts: m.timestamp || toTs(m.date),
        date: fmtShort(m.timestamp || m.date),
        title: m.type,
        desc: `${m.desc} (${m.result}) · By ${m.by || t.caretaker || 'Field Team'}`
      });
    });
  }

  // 2. Real monitoring events if recorded
  if (Array.isArray(t.monitoringHistory) && t.monitoringHistory.length > 0) {
    t.monitoringHistory.forEach(mon => {
      events.push({
        icon: '📷',
        color: '',
        ts: mon.timestamp || toTs(mon.date),
        date: fmtShort(mon.timestamp || mon.date),
        title: 'Monitoring',
        desc: `Status: ${mon.status || t.status} · By ${mon.by || t.caretaker}`
      });
    });
  }

  // 3. All activity connected to the adopter(s) of this tree
  let linkedAdopters = [];
  try {
    const rawAds = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
    const sponsorNames = String(t.sponsorName || t.adopter || '')
      .split(',').map(s => s.toLowerCase().trim()).filter(Boolean);
    if (Array.isArray(rawAds)) {
      linkedAdopters = rawAds.filter(a => a && (
        (Array.isArray(a.treesList) && a.treesList.some(it => String(it.id) === String(t.id))) ||
        (a.name && sponsorNames.includes(a.name.toLowerCase().trim()))
      ));
    }
  } catch (e) {}

  let caretakersCache = [];
  try { caretakersCache = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]'); } catch (e) {}

  linkedAdopters.forEach(ad => {
    const adName = ad.name || 'Adopter';
    const entry = Array.isArray(ad.treesList) ? ad.treesList.find(it => String(it.id) === String(t.id)) : null;
    const qty = entry ? Math.max(1, parseInt(entry.treeCount) || 1) : (parseInt(t.takenCount) || 0);
    const hasFunding = ad.customFunding || Number(ad.funding || ad.fundingPaid) > 0;
    const totalAdTrees = Math.max(1, parseInt(ad.treesCount) || qty || 1);
    const treeFunding = hasFunding ? Math.round((Number(ad.funding || ad.fundingPaid) || 0) * (qty / totalAdTrees)) : 0;
    const adoptTs = toTs(t.adoptedAt) || toTs(ad.startDate) || toTs(ad.dateReg) || toTs(ad.createdAt);

    // Adopter registration
    const regTs = toTs(ad.createdAt) || toTs(ad.dateReg);
    if (regTs) {
      events.push({
        icon: '📝',
        color: 'planted',
        ts: regTs - 1,
        date: fmtShort(regTs),
        title: 'Adopter Registered',
        desc: `${adName}${ad.type ? ` (${ad.type})` : ''}${ad.contactPerson && ad.contactPerson !== adName ? ` · Contact: ${ad.contactPerson}` : ''}${ad.regId ? ` · ${ad.regId}` : ''}`
      });
    }

    // Adoption
    events.push({
      icon: '🤝',
      color: 'adopted',
      ts: adoptTs,
      date: fmtShort(adoptTs, t.savedAt ? t.savedAt.split(',')[0] : 'Recent'),
      title: 'Tree Adopted',
      desc: `Adopted by ${adName} · ${qty.toLocaleString()} tree${qty === 1 ? '' : 's'}${ad.plan ? ` · ${ad.plan}` : ''}${ad.project ? ` · ${ad.project}` : ''}`
    });

    // Funding / payments
    if (Array.isArray(ad.payments) && ad.payments.length > 0) {
      ad.payments.forEach(p => {
        events.push({
          icon: '💰',
          color: 'adopted',
          ts: toTs(p.date) || adoptTs,
          date: fmtShort(p.date),
          title: `Funding ${p.status || 'Received'}`,
          desc: `${peso(p.amount)} from ${adName}${p.ref ? ` · Ref ${p.ref}` : ''}${treeFunding > 0 ? ` · ${peso(treeFunding)} allocated to this tree` : ''}`
        });
      });
    } else if (hasFunding) {
      events.push({
        icon: '💰',
        color: 'adopted',
        ts: adoptTs + 1,
        date: fmtShort(adoptTs),
        title: 'Funding Recorded',
        desc: `${peso(ad.funding || ad.fundingPaid)} pledged by ${adName}${treeFunding > 0 ? ` · ${peso(treeFunding)} allocated to this tree` : ''}`
      });
    }

    // Adopter timeline (reports, renewals, updates)
    if (Array.isArray(ad.timeline)) {
      ad.timeline.forEach(ev => {
        events.push({
          icon: '📌',
          color: '',
          ts: toTs(ev.date),
          date: fmtShort(ev.date),
          title: String(ev.title || 'Adopter Update').replace(/^[^\w₱]+\s*/u, ''),
          desc: ev.desc || ''
        });
      });
    }

    // Communications with adopter
    if (Array.isArray(ad.communications)) {
      ad.communications.forEach(c => {
        events.push({
          icon: '💬',
          color: '',
          ts: toTs(c.date),
          date: fmtShort(c.date),
          title: `Message to ${adName}`,
          desc: `${c.sender || 'Admin'}: "${c.text || ''}"`
        });
      });
    }

    // Caretaker field visits scheduled for this adopter
    if (Array.isArray(caretakersCache)) {
      caretakersCache.forEach(ct => {
        if (!ct || !Array.isArray(ct.schedule)) return;
        ct.schedule.forEach(v => {
          const matchAd = (v.adopterId && String(v.adopterId) === String(ad.id)) ||
                          (v.adopterName && v.adopterName.toLowerCase() === adName.toLowerCase());
          const matchTree = v.treeId && String(v.treeId) === String(t.id);
          if (!matchAd && !matchTree) return;
          const done = String(v.status || v.st || '').toLowerCase() === 'completed';
          events.push({
            icon: done ? '🌿' : '📅',
            color: done ? 'maintenance' : '',
            ts: toTs(v.rawDate || v.date),
            date: fmtShort(v.rawDate || v.date),
            title: done ? 'Field Visit Completed' : 'Field Visit Scheduled',
            desc: `Caretaker ${ct.name} · ${adName}${v.target ? ` · ${v.target} trees` : ''}${v.loc || v.location ? ` · ${v.loc || v.location}` : ''}`
          });
        });
      });
    }

    // Caretaker assignment
    if (t.caretaker && t.caretaker !== 'Unassigned') {
      events.push({
        icon: '👤',
        color: '',
        ts: adoptTs + 2,
        date: fmtShort(adoptTs),
        title: 'Caretaker Assigned',
        desc: `${t.caretaker} assigned to care for ${adName}'s adopted trees`
      });
    }
  });

  // Fallback adoption event if adopter record not found in cache
  if (linkedAdopters.length === 0 && (t.sponsorName || t.adopter)) {
    const adoptTs = toTs(t.adoptedAt);
    events.push({
      icon: '🤝',
      color: 'adopted',
      ts: adoptTs,
      date: fmtShort(adoptTs, t.savedAt ? t.savedAt.split(',')[0] : 'Recent'),
      title: 'Tree Adopted',
      desc: `Adopted by ${t.sponsorName || t.adopter}`
    });
  }

  // 4. Tree registered (real-time registration date)
  const regTs = t.savedTimestamp || toTs(t.createdAt) || toTs(t.plantingDate);
  events.push({
    icon: '🌱',
    color: 'planted',
    ts: regTs ? regTs - 10 : 0,
    date: t.savedAt ? t.savedAt.split(',')[0] : fmtShort(regTs),
    title: 'Tree Registered',
    desc: `${t.species?.common || 'Tree'} batch registered in system · ${Math.max(1, parseInt(t.treeCount) || 1).toLocaleString()} trees`
  });

  // Newest first; de-duplicate identical entries
  const seen = new Set();
  const finalEvents = events
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .filter(e => {
      const key = `${e.date}|${e.title}|${e.desc}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return finalEvents.map(e => `
    <div class="timeline-event-node">
      <div class="timeline-dot ${e.color}"></div>
      <div class="timeline-date">${e.date} &nbsp; ${e.icon}</div>
      <div class="timeline-title">${e.title}</div>
      <div class="timeline-desc">${e.desc}</div>
    </div>
  `).join('');
}

function openLogMaintenanceModal(treeId) {
  const t = ALL_TREES.find(x => x.id === treeId);
  if (!t) return;

  const now = new Date();
  const realTimeFormatted = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const idInp = document.getElementById('maintTreeId');
  if (idInp) idInp.value = t.id;

  const disp = document.getElementById('maintTreeDisplay');
  if (disp) disp.textContent = `${t.id} — ${t.species?.common || 'Native Tree'}`;

  const dateInp = document.getElementById('maintDate');
  if (dateInp) dateInp.value = realTimeFormatted;

  const descInp = document.getElementById('maintDesc');
  if (descInp) descInp.value = '';

  const byInp = document.getElementById('maintBy');
  if (byInp) byInp.value = t.caretaker && t.caretaker !== 'Unassigned' ? t.caretaker : (localStorage.getItem('ATAMAN_user_name') || 'Field Team');

  const photosInp = document.getElementById('maintPhotos');
  if (photosInp) photosInp.value = 1;

  openModal('modalLogMaintenance');
}

function saveMaintenanceRecord() {
  const treeId = document.getElementById('maintTreeId')?.value?.trim();
  const t = ALL_TREES.find(x => x.id === treeId);
  if (!t) {
    showAdminToast('⚠️ Tree not found.', 'warning');
    return;
  }

  const type = document.getElementById('maintType')?.value || 'Pest Control';
  const now = new Date();
  const realTimeFallback = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const dateVal = document.getElementById('maintDate')?.value?.trim() || realTimeFallback;
  const descVal = document.getElementById('maintDesc')?.value?.trim();
  if (!descVal) {
    showAdminToast('⚠️ Please describe the treatment or action taken.', 'warning');
    document.getElementById('maintDesc')?.focus();
    return;
  }
  const resultVal = document.getElementById('maintResult')?.value || 'Completed successfully';
  const byVal = document.getElementById('maintBy')?.value?.trim() || t.caretaker || 'Field Team';
  const photosCount = parseInt(document.getElementById('maintPhotos')?.value) || 1;
  const newHealth = document.getElementById('maintNewHealth')?.value || t.status || 'healthy';

  const newEntry = {
    id: 'maint-' + Date.now(),
    date: dateVal,
    timestamp: Date.now(),
    type: type,
    desc: descVal,
    result: resultVal,
    by: byVal,
    photos: photosCount
  };

  if (!Array.isArray(t.maintenanceHistory)) {
    t.maintenanceHistory = [];
  }
  t.maintenanceHistory.unshift(newEntry);
  t.status = newHealth;
  t.lastCheck = dateVal;

  // Persist updated ALL_TREES
  localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(ALL_TREES));
  if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyTrees === 'function') {
    window.ATAMAN_SYNC.notifyTrees(ALL_TREES);
  }
  if (window.ATAMAN_DB && typeof window.ATAMAN_DB.updateTree === 'function') {
    window.ATAMAN_DB.updateTree(t.id, t).catch(err => console.warn('Firestore tree sync:', err));
  }

  closeModal('modalLogMaintenance');
  showAdminToast(`✅ Real-time maintenance record logged for ${t.id}!`);

  // Refresh drawer if open
  openTreeProfile(t.id);
  renderTable();
}

window.openLogMaintenanceModal = openLogMaintenanceModal;
window.saveMaintenanceRecord = saveMaintenanceRecord;

function getNextTreeId() {
  let maxNum = 10000;
  ALL_TREES.forEach(t => {
    const m = String(t.id).match(/TR-(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return `TR-${maxNum + 1}`;
}

/* ── 10. EDIT / ADD TREE ── */
function openEditTree(treeId) {
  const t = treeId ? ALL_TREES.find(x => x.id === treeId) : null;
  if (!t) { 
    document.getElementById('editTreeId').value = getNextTreeId();
    document.getElementById('editSpecies').value = '';
    document.getElementById('editScientific').value = '';
    if (document.getElementById('editTreeType')) document.getElementById('editTreeType').value = 'Native';
    document.getElementById('editTreeCount').value = '1';
    if (document.getElementById('editTakenCount')) document.getElementById('editTakenCount').value = '0';
    if (document.getElementById('editAdopterName')) document.getElementById('editAdopterName').value = '';
    if (document.getElementById('editTreeAge')) document.getElementById('editTreeAge').value = '';
    if (document.getElementById('editBarangay')) document.getElementById('editBarangay').value = 'San Isidro';
    if (document.getElementById('editMunicipality')) document.getElementById('editMunicipality').value = 'Catbalogan City';
    if (document.getElementById('editLat')) document.getElementById('editLat').value = '11.771000';
    if (document.getElementById('editLng')) document.getElementById('editLng').value = '124.891000';
    document.getElementById('modalAddTreeTitle').textContent = '✏️ Add New Tree';
    updateModalRemainingPreview();
    openModal('modalAddTree'); 
    return; 
  }
  const { total, taken, remaining } = getTreeCounts(t);
  document.getElementById('editTreeId').value = t.id;
  document.getElementById('editSpecies').value = t.species?.common || '';
  document.getElementById('editScientific').value = t.species?.scientific || '';
  if (document.getElementById('editTreeType')) {
    document.getElementById('editTreeType').value = t.treeType || t.species?.type || 'Native';
  }
  document.getElementById('editTreeCount').value = total;
  if (document.getElementById('editTakenCount')) {
    document.getElementById('editTakenCount').value = taken;
  }
  if (document.getElementById('editAdopterName')) {
    document.getElementById('editAdopterName').value = t.sponsorName || t.adopter || '';
  }
  if (document.getElementById('editTreeAge')) {
    document.getElementById('editTreeAge').value = t.age || '';
  }
  if (document.getElementById('editBarangay')) {
    document.getElementById('editBarangay').value = t.barangay ? t.barangay.replace(/^Brgy\.\s*/i, '') : 'San Isidro';
  }
  if (document.getElementById('editMunicipality')) {
    document.getElementById('editMunicipality').value = t.municipality || 'Catbalogan City';
  }
  if (document.getElementById('editLat')) {
    const latNum = t.lat != null ? Number(t.lat) : 11.7710;
    document.getElementById('editLat').value = isNaN(latNum) ? '11.771000' : latNum.toFixed(6);
  }
  if (document.getElementById('editLng')) {
    const lngNum = t.lng != null ? Number(t.lng) : 124.8910;
    document.getElementById('editLng').value = isNaN(lngNum) ? '124.891000' : lngNum.toFixed(6);
  }
  document.getElementById('modalAddTreeTitle').textContent = `✏️ Edit Tree — ${t.id}`;
  updateModalRemainingPreview();
  openModal('modalAddTree');
}

const SAMAR_BARANGAY_COORDS = {
  'Guinsorongan': { lat: 11.7598, lng: 124.8861, mun: 'Catbalogan City' },
  'Brgy. Guinsorongan': { lat: 11.7598, lng: 124.8861, mun: 'Catbalogan City' },
  'San Isidro': { lat: 11.7710, lng: 124.8910, mun: 'Catbalogan City' },
  'Canlapwas': { lat: 11.7820, lng: 124.8870, mun: 'Catbalogan City' },
  'Bunuanan': { lat: 11.7885, lng: 124.8790, mun: 'Catbalogan City' },
  'Mercedes': { lat: 11.7680, lng: 124.8810, mun: 'Catbalogan City' },
  'Iguid': { lat: 11.8020, lng: 124.8690, mun: 'Catbalogan City' },
  'Maulong': { lat: 11.7915, lng: 124.8720, mun: 'Catbalogan City' },
  'Silanga': { lat: 11.8210, lng: 124.8510, mun: 'Catbalogan City' },
  'Pangdan': { lat: 11.7580, lng: 124.8850, mun: 'Catbalogan City' },
  'Santiago': { lat: 11.7820, lng: 124.8820, mun: 'Catbalogan City' },
  'Payao': { lat: 11.7620, lng: 124.8730, mun: 'Catbalogan City' },
  'Mabini': { lat: 11.7910, lng: 124.8750, mun: 'Catbalogan City' },
  'Bagongon': { lat: 11.7510, lng: 124.9540, mun: 'Jiabong' },
  'Central Hub': { lat: 11.7753, lng: 124.8860, mun: 'Catbalogan City' }
};

function onTreeModalBarangayChange(val) {
  const c = SAMAR_BARANGAY_COORDS[val];
  if (c) {
    const latInp = document.getElementById('editLat');
    const lngInp = document.getElementById('editLng');
    const munInp = document.getElementById('editMunicipality');
    if (latInp) latInp.value = Number(c.lat).toFixed(6);
    if (lngInp) lngInp.value = Number(c.lng).toFixed(6);
    if (munInp && c.mun) munInp.value = c.mun;
  }
}
window.onTreeModalBarangayChange = onTreeModalBarangayChange;

function updateModalRemainingPreview() {
  const countInp = document.getElementById('editTreeCount');
  const prevEl = document.getElementById('editRemainingPreview');
  const badgeEl = document.getElementById('editAvailabilityStatusBadge');
  if (!prevEl || !badgeEl) return;

  const total = Math.max(1, parseInt(countInp?.value) || 1);

  // Look up real takenCount from ALL_TREES for edit mode
  const editId = document.getElementById('editTreeId')?.value?.trim();
  const existingTree = editId ? ALL_TREES.find(t => t.id === editId) : null;
  const taken = existingTree ? Math.min(total, Math.max(0, parseInt(existingTree.takenCount) || 0)) : 0;

  const remaining = Math.max(0, total - taken);
  const percentAvail = Math.round((remaining / total) * 100);

  prevEl.textContent = `${remaining.toLocaleString()} tree${remaining === 1 ? '' : 's'} available (${taken.toLocaleString()} taken via adoptions)`;

  if (remaining === 0) {
    badgeEl.textContent = '🔴 0% Available (Fully Taken)';
    badgeEl.style.background = '#fef2f2';
    badgeEl.style.color = '#dc2626';
    badgeEl.style.borderColor = '#fecaca';
  } else if (taken > 0) {
    badgeEl.textContent = `🟡 ${percentAvail}% Available (${remaining} remaining)`;
    badgeEl.style.background = '#fefce8';
    badgeEl.style.color = '#a16207';
    badgeEl.style.borderColor = '#fde047';
  } else {
    badgeEl.textContent = '🟢 100% Available';
    badgeEl.style.background = '#dcfce7';
    badgeEl.style.color = '#15803d';
    badgeEl.style.borderColor = '#86efac';
  }
}
window.updateModalRemainingPreview = updateModalRemainingPreview;

async function saveTree() {
  const id = document.getElementById('editTreeId')?.value?.trim();
  const speciesCommon = document.getElementById('editSpecies')?.value?.trim();
  if (!speciesCommon) {
    showAdminToast('⚠️ Please enter the Name of the Tree.', 'warning');
    document.getElementById('editSpecies')?.focus();
    return;
  }
  const scientific = document.getElementById('editScientific')?.value?.trim() || '';
  const treeType = document.getElementById('editTreeType')?.value || 'Native';
  const treeCount = Math.max(1, parseInt(document.getElementById('editTreeCount')?.value) || 1);
  // takenCount is auto-computed from adopter adoption records — preserve existing value
  const existingTreeForTaken = ALL_TREES.find(t => t.id === (document.getElementById('editTreeId')?.value?.trim() || ''));
  let takenCount = Math.min(treeCount, Math.max(0, parseInt(existingTreeForTaken?.takenCount) || 0));
  const adopterName = existingTreeForTaken?.sponsorName || existingTreeForTaken?.adopter || '';
  const treeAge = document.getElementById('editTreeAge')?.value?.trim() || '—';

  // Auto-capture current system date and time
  const now = new Date();
  const autoDateFormatted = now.toISOString().slice(0, 10);
  const autoDateDisplay = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const autoDateTimeDisplay = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const matchedSpecies = {
    common: speciesCommon,
    scientific: scientific,
    type: treeType
  };

  const treeId = id || getNextTreeId();
  const existingTree = ALL_TREES.find(t => t.id === treeId);

  const editBarangay = document.getElementById('editBarangay')?.value || existingTree?.barangay || '';
  const editMunicipality = document.getElementById('editMunicipality')?.value?.trim() || existingTree?.municipality || '';
  const parsedLat = parseFloat(document.getElementById('editLat')?.value);
  const parsedLng = parseFloat(document.getElementById('editLng')?.value);
  const editLat = !isNaN(parsedLat) ? parsedLat : (existingTree?.lat != null ? Number(existingTree.lat) : null);
  const editLng = !isNaN(parsedLng) ? parsedLng : (existingTree?.lng != null ? Number(existingTree.lng) : null);

  const treeData = {
    ...(existingTree || {}),
    id: treeId,
    species: matchedSpecies,
    treeType: treeType,
    treeCount: treeCount,
    takenCount: takenCount,
    sponsorName: adopterName || (takenCount > 0 ? (existingTree?.sponsorName || existingTree?.adopter || '') : ''),
    adopter: adopterName || (takenCount > 0 ? (existingTree?.adopter || existingTree?.sponsorName || '') : ''),
    age: treeAge,
    height: existingTree?.height || treeAge,
    plantingDate: existingTree?.plantingDate || autoDateFormatted,
    dateAdded: existingTree?.dateAdded || autoDateDisplay,
    savedAt: autoDateTimeDisplay,
    savedTimestamp: now.getTime(),
    status: existingTree?.status || 'healthy',
    caretaker: existingTree?.caretaker || 'Unassigned',
    municipality: editMunicipality,
    barangay: editBarangay,
    province: (editBarangay || editMunicipality) ? (existingTree?.province || 'Samar') : '',
    lat: editLat,
    lng: editLng
  };

  // Update in-memory array first
  const existingIdx = ALL_TREES.findIndex(t => t.id === treeId);
  if (existingIdx >= 0) {
    ALL_TREES[existingIdx] = { ...ALL_TREES[existingIdx], ...treeData };
  } else {
    ALL_TREES.unshift(treeData);
  }

  // Always persist to localStorage so data survives page refresh
  localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(ALL_TREES));
  if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyTrees === 'function') {
    window.ATAMAN_SYNC.notifyTrees(ALL_TREES);
  }

  if (window.ATAMAN_DB) {
    if (existingIdx >= 0) {
      await window.ATAMAN_DB.updateTree(treeId, treeData);
      showAdminToast(`✅ Tree ${treeId} updated!`);
    } else {
      await window.ATAMAN_DB.addTree(treeData);
      showAdminToast(`✅ Tree ${treeId} saved! (Auto-saved: ${autoDateTimeDisplay})`);
    }
  } else {
    showAdminToast(`✅ Tree ${treeId} saved! (Auto-saved: ${autoDateTimeDisplay})`);
  }

  filteredTrees = [...ALL_TREES];
  applyFilters();
  updateStats();
  closeModal('modalAddTree');
  if (document.getElementById('treeProfileDrawer')?.classList.contains('open')) {
    openTreeProfile(treeId);
  }
}

function confirmArchiveSingle(treeId) {
  currentArchiveTreeId = treeId;
  openModal('modalArchiveConfirm');
}

async function handleArchive() {
  if (!currentArchiveTreeId) {
    closeModal('modalArchiveConfirm');
    return;
  }

  const id = currentArchiveTreeId;
  if (window.ATAMAN_DB) {
    await window.ATAMAN_DB.deleteTree(id);
    showAdminToast(`🗄 Tree ${id} archived & removed from Firestore.`);
  } else {
    showAdminToast(`🗄 Tree ${id} archived.`);
  }

  ALL_TREES = ALL_TREES.filter(t => t.id !== id);
  filteredTrees = filteredTrees.filter(t => t.id !== id);
  selectedIds.delete(id);
  localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(ALL_TREES));
  if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyTrees === 'function') {
    window.ATAMAN_SYNC.notifyTrees(ALL_TREES);
  }

  renderTable();
  if (typeof updateStats === 'function') updateStats();
  closeDrawer();
  closeModal('modalArchiveConfirm');
  currentArchiveTreeId = null;
}

let currentDeleteTreeId = null;

function confirmDeleteTree(treeId) {
  currentDeleteTreeId = treeId;
  const label = document.getElementById('deleteTreeIdLabel');
  if (label) label.textContent = treeId;
  openModal('modalDeleteConfirm');
}

async function executeDeleteTree() {
  if (!currentDeleteTreeId) {
    closeModal('modalDeleteConfirm');
    return;
  }

  const id = currentDeleteTreeId;
  if (window.ATAMAN_DB) {
    await window.ATAMAN_DB.deleteTree(id);
  }

  ALL_TREES = ALL_TREES.filter(t => t.id !== id);
  filteredTrees = filteredTrees.filter(t => t.id !== id);
  selectedIds.delete(id);
  localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(ALL_TREES));
  if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyTrees === 'function') {
    window.ATAMAN_SYNC.notifyTrees(ALL_TREES);
  }

  renderTable();
  if (typeof updateStats === 'function') updateStats();
  closeDrawer();
  closeModal('modalDeleteConfirm');
  showAdminToast(`🗑️ Tree ${id} deleted.`);
  currentDeleteTreeId = null;
}

/* ── 11. MODALS ── */
function initModals() {
  document.querySelectorAll('.admin-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('show');
    });
  });
}

function openModal(id) {
  document.getElementById(id)?.classList.add('show');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('show');
}

/* ── 11.1 PHOTO EVIDENCE VIEWER & UPLOAD CONTROLLER ── */
const PHOTO_KEYS = ['treePhoto', 'leaves', 'trunk', 'soil'];

let pendingUploadTreeId = null;
let pendingUploadAngleIndex = null;

function makeSvgPhotoFallback(bg1, bg2, emoji, title, textColor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#g)"/>
    <circle cx="300" cy="165" r="75" fill="rgba(255,255,255,0.7)"/>
    <text x="300" y="190" dominant-baseline="middle" text-anchor="middle" font-size="70">${emoji}</text>
    <rect x="70" y="275" width="460" height="50" rx="25" fill="rgba(255,255,255,0.92)"/>
    <text x="300" y="304" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="20" fill="${textColor}">${title}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEFAULT_TREE_PHOTOS = {
  treePhoto: {
    title: 'Tree Canopy (Full View)',
    type: 'Tree Photo',
    icon: '🌳',
    url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&auto=format&fit=crop&q=80',
    desc: 'Full canopy and crown structure inspection showing branch spread, foliage fullness, and healthy vertical growth.'
  },
  leaves: {
    title: 'Leaves & Foliage',
    type: 'Leaves',
    icon: '🌿',
    url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
    desc: 'Close-up examination of leaf pigmentation, healthy chlorophyll density, and absence of leaf spot or pest blight.'
  },
  trunk: {
    title: 'Trunk & Bark Structure',
    type: 'Trunk',
    icon: '🪵',
    url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80',
    desc: 'Trunk circumference, clean bark integrity, upright vertical alignment, and sturdy stem development.'
  },
  soil: {
    title: 'Soil & Root Base',
    type: 'Soil',
    icon: '🪨',
    url: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&auto=format&fit=crop&q=80',
    desc: 'Soil moisture balance, organic mulch layer coverage, root flare stability, and good ground aeration.'
  }
};

function getPhotoFallback(key) {
  const fallbacks = {
    treePhoto: makeSvgPhotoFallback('#dcfce7', '#bbf7d0', '🌳', 'Full Tree Canopy Photo', '#166534'),
    leaves: makeSvgPhotoFallback('#fef9c3', '#fef08a', '🌿', 'Leaves & Foliage Photo', '#854d0e'),
    trunk: makeSvgPhotoFallback('#dbeafe', '#bfdbfe', '🪵', 'Trunk & Bark Photo', '#1e40af'),
    soil: makeSvgPhotoFallback('#fce7f3', '#fbcfe8', '🪨', 'Soil & Root Base Photo', '#9d174d')
  };
  return fallbacks[key] || fallbacks.treePhoto;
}

// Client-side image compression to prevent exceeding localStorage quota
function compressImageForStorage(file, maxDimension = 1280, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

let currentViewingTreeId = null;
let currentViewingPhotoIndex = 0;

function openPhotoEvidenceModal(treeId, photoIndex = 0) {
  currentViewingTreeId = treeId;
  const t = ALL_TREES.find(x => x.id === treeId);
  if (!t) return;

  currentViewingPhotoIndex = photoIndex >= 0 && photoIndex < 4 ? photoIndex : 0;

  const titleEl = document.getElementById('photoModalTitle');
  const subEl = document.getElementById('photoModalSubtitle');
  if (titleEl) titleEl.textContent = `📷 Photo Evidence — ${t.id}`;
  if (subEl) subEl.textContent = `${t.species?.common || 'Tree'} (${t.species?.scientific || 'Botanical Species'}) · ${(t.treeCount || 1).toLocaleString()} tree${(t.treeCount || 1) === 1 ? '' : 's'} · ${t.treeType || 'Native'}`;

  switchPhotoAngle(currentViewingPhotoIndex);
  initPhotoDropzone();
  openModal('modalPhotoEvidence');
}

function switchPhotoAngle(index) {
  currentViewingPhotoIndex = (index + 4) % 4;
  const key = PHOTO_KEYS[currentViewingPhotoIndex];
  const conf = DEFAULT_TREE_PHOTOS[key];
  const t = ALL_TREES.find(x => x.id === currentViewingTreeId);
  if (!t) return;

  const currentSrc = (t.photos && t.photos[key]) ? t.photos[key] : (conf?.url || getPhotoFallback(key));
  const fallback = getPhotoFallback(key);

  const img = document.getElementById('photoModalImg');
  if (img) {
    img.src = currentSrc;
    img.onerror = () => { img.onerror = null; img.src = fallback; };
  }

  // Update tab highlights
  [0, 1, 2, 3].forEach(i => {
    const tab = document.getElementById('photoTab' + i);
    if (tab) {
      if (i === currentViewingPhotoIndex) {
        tab.style.background = '#ecfdf5';
        tab.style.color = '#166534';
        tab.style.borderColor = '#86efac';
        tab.style.boxShadow = '0 1px 3px rgba(22,101,52,0.15)';
      } else {
        tab.style.background = '#fff';
        tab.style.color = '#475569';
        tab.style.borderColor = '#e2e8f0';
        tab.style.boxShadow = 'none';
      }
    }
  });

  const tag = document.getElementById('photoModalAngleTag');
  if (tag) tag.innerHTML = `${conf.icon} ${conf.title}`;

  const metaAngle = document.getElementById('photoMetaAngle');
  if (metaAngle) metaAngle.textContent = conf.title;

  const metaDate = document.getElementById('photoMetaDate');
  if (metaDate) metaDate.textContent = t.savedAt || t.dateAdded || formatDateShort(t.plantingDate) || 'Nov 5, 2026';

  const metaBy = document.getElementById('photoMetaBy');
  if (metaBy) metaBy.textContent = (t.caretaker && t.caretaker !== 'Unassigned') ? t.caretaker : 'Unassigned';

  const metaCoords = document.getElementById('photoMetaCoords');
  if (metaCoords) {
    if (t.lat != null && t.lng != null && !isNaN(Number(t.lat)) && !isNaN(Number(t.lng))) {
      metaCoords.textContent = `${Number(t.lat).toFixed(6)}, ${Number(t.lng).toFixed(6)}`;
    } else {
      metaCoords.textContent = 'Location not recorded';
    }
  }

  const metaObs = document.getElementById('photoMetaObservation');
  if (metaObs) metaObs.textContent = conf.desc;
}

function prevPhotoAngle() {
  switchPhotoAngle(currentViewingPhotoIndex - 1);
}

function nextPhotoAngle() {
  switchPhotoAngle(currentViewingPhotoIndex + 1);
}

function triggerDirectPhotoUpload(treeId, angleIndex = 0) {
  pendingUploadTreeId = treeId;
  pendingUploadAngleIndex = angleIndex >= 0 && angleIndex < 4 ? angleIndex : 0;
  currentViewingTreeId = treeId;
  currentViewingPhotoIndex = pendingUploadAngleIndex;
  
  const input = document.getElementById('photoUploadInput');
  if (input) {
    input.click();
  }
}

function triggerPhotoUploadForAngle(treeId, angleIndex) {
  triggerDirectPhotoUpload(treeId, angleIndex);
}

async function handlePhotoUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  await processAndSaveEvidencePhoto(file);
  input.value = '';
}

async function processAndSaveEvidencePhoto(file) {
  const targetTreeId = pendingUploadTreeId || currentViewingTreeId;
  if (!targetTreeId) return;

  const t = ALL_TREES.find(x => x.id === targetTreeId);
  if (!t) return;

  const angleIndex = (pendingUploadAngleIndex != null) ? pendingUploadAngleIndex : currentViewingPhotoIndex;
  const key = PHOTO_KEYS[angleIndex];
  const angleInfo = DEFAULT_TREE_PHOTOS[key];

  try {
    showAdminToast(`⏳ Processing and optimizing photo for ${angleInfo.type}...`);
    const base64Url = await compressImageForStorage(file, 1280, 0.85);

    if (!t.photos) t.photos = {};
    t.photos[key] = base64Url;

    // Record in activity timeline
    if (!Array.isArray(t.activityTimeline)) {
      t.activityTimeline = [];
    }
    const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    t.activityTimeline.unshift({
      date: todayFormatted,
      title: `📷 Evidence Photo Uploaded`,
      desc: `New photo evidence for ${angleInfo.type} was uploaded to tree profile.`,
      icon: angleInfo.icon || '📷'
    });

    // Persist to local cache
    localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(ALL_TREES));
    if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyTrees === 'function') {
      window.ATAMAN_SYNC.notifyTrees(ALL_TREES);
    }

    // Persist to Firestore
    if (window.ATAMAN_DB && typeof window.ATAMAN_DB.updateTree === 'function') {
      try {
        await window.ATAMAN_DB.updateTree(t.id, { 
          photos: t.photos, 
          activityTimeline: t.activityTimeline,
          lastPhotoUpdate: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Error saving photo to DB:', err);
      }
    }

    // Refresh modal if active
    const modal = document.getElementById('modalPhotoEvidence');
    if (modal && modal.classList.contains('show')) {
      switchPhotoAngle(angleIndex);
    }

    // Refresh thumbnails in the drawer
    const grid = document.querySelector('.photo-evidence-grid');
    if (grid) {
      grid.innerHTML = generatePhotoThumbs(t);
    }

    // Refresh timeline in the drawer
    const timelineWrap = document.querySelector('.lifecycle-timeline-wrap');
    if (timelineWrap && typeof generateTimeline === 'function') {
      timelineWrap.innerHTML = generateTimeline(t);
    }

    showAdminToast(`✅ Uploaded new ${angleInfo.type} photo evidence for ${t.id}!`);
  } catch (err) {
    console.error('Photo upload error:', err);
    showAdminToast(`❌ Failed to upload photo: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    pendingUploadAngleIndex = null;
  }
}

let dropzoneInitialized = false;
function initPhotoDropzone() {
  if (dropzoneInitialized) return;
  const stage = document.getElementById('photoModalDropzone');
  const overlay = document.getElementById('photoDropOverlay');
  if (!stage) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    stage.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
      if (overlay) overlay.style.display = 'flex';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    stage.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
      if (overlay) overlay.style.display = 'none';
    }, false);
  });

  stage.addEventListener('drop', async e => {
    const dt = e.dataTransfer;
    const file = dt?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await processAndSaveEvidencePhoto(file);
    }
  });

  dropzoneInitialized = true;
}

async function resetCurrentPhotoToDefault() {
  if (!currentViewingTreeId) return;
  const t = ALL_TREES.find(x => x.id === currentViewingTreeId);
  if (!t || !t.photos) return;

  const key = PHOTO_KEYS[currentViewingPhotoIndex];
  delete t.photos[key];

  localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(ALL_TREES));
  if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyTrees === 'function') {
    window.ATAMAN_SYNC.notifyTrees(ALL_TREES);
  }
  if (window.ATAMAN_DB && typeof window.ATAMAN_DB.updateTree === 'function') {
    await window.ATAMAN_DB.updateTree(t.id, { photos: t.photos });
  }

  switchPhotoAngle(currentViewingPhotoIndex);
  const grid = document.querySelector('.photo-evidence-grid');
  if (grid) grid.innerHTML = generatePhotoThumbs(t);

  showAdminToast(`🔄 Photo reset to default view.`);
}

function downloadCurrentPhoto() {
  const img = document.getElementById('photoModalImg');
  if (!img || !img.src) return;
  const a = document.createElement('a');
  a.href = img.src;
  a.download = `${currentViewingTreeId || 'tree'}_${PHOTO_KEYS[currentViewingPhotoIndex]}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showAdminToast('⬇️ Photo download started.');
}

function openFullPhotoInNewTab() {
  const img = document.getElementById('photoModalImg');
  if (!img || !img.src) return;
  const w = window.open('');
  if (w) {
    w.document.write(`<title>${currentViewingTreeId} - Photo Evidence</title><body style="margin:0; background:#0f172a; display:flex; align-items:center; justify-content:center; min-height:100vh;"><img src="${img.src}" style="max-width:98vw; max-height:98vh; object-fit:contain; box-shadow:0 8px 30px rgba(0,0,0,0.5); border-radius:8px;" /></body>`);
  }
}

// Keyboard shortcuts for Photo Modal
document.addEventListener('keydown', e => {
  const modal = document.getElementById('modalPhotoEvidence');
  if (!modal || !modal.classList.contains('show')) return;
  if (e.key === 'ArrowLeft') prevPhotoAngle();
  else if (e.key === 'ArrowRight') nextPhotoAngle();
  else if (e.key === 'Escape') closeModal('modalPhotoEvidence');
});

/* ── 12. TOAST NOTIFICATIONS ── */
function showAdminToast(message, type = 'info') {
  const container = document.getElementById('adminToastContainer');
  const toast = document.createElement('div');
  toast.className = 'admin-toast';
  const icons = { info: '✅', warning: '⚠️', error: '❌' };
  toast.innerHTML = `<span>${icons[type] || '✅'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}


// Automated Cascading Location for Add/Edit Tree Modal
const TREE_LOCATION_MAP = {
  'Catbalogan City': ["Albalate","Bagongon","Bangon","Basiao","Buluan","Bunuanan","Cabugawan","Cagudalo","Cagusipan","Cagutian","Cagutsan","Canhawan Gote","Canlapwas","Cawayan","Cinco","Darahuway Daco","Darahuway Gote","Estaka","Guinsorongan","Ibol","Iguid","Lagundi","Libas","Lobo","Manguehay","Maulong","Mercedes","Mombon","New Mahayag","Old Mahayag","Palanyogon","Pangdan","Payao","Poblacion 1","Poblacion 2","Poblacion 3","Poblacion 4","Poblacion 5","Poblacion 6","Poblacion 7","Poblacion 8","Poblacion 9","Poblacion 10","Poblacion 11","Poblacion 12","Poblacion 13","Muñoz","Pupua","Guindapunan","Rama","San Andres","San Pablo","San Roque","San Vicente","Silanga","Socorro","Totoringon"],
  'Calbayog City': ['Capoocan', 'Dagum', 'Hamorawon', 'Matobato', 'Obrero', 'Rawis', 'San Policarpo', 'Trinidad', 'West Awang', 'East Awang'],
  'Jiabong': ['Casapa', 'Jia-an', 'Macalpe', 'Malino', 'Parasan', 'Poblacion', 'San Fernando', 'San Miguel'],
  'Tarangnan': ['Balogo', 'Bonga', 'Cambatutay', 'Luciente', 'Poblacion', 'San Vicente', 'Tabunoc'],
  'Paranas': ['Anahao', 'Cantato', 'Lipata', 'Poblacion', 'Salug', 'San Isidro', 'Tutubigan'],
  'Hinabangan': ['Bagacay', 'Cabugao', 'Malihao', 'Poblacion', 'Rawis', 'San Rafael']
};

function updateTreeModalBarangays() {
  const munSelect = document.getElementById('editMunicipality');
  const brgySelect = document.getElementById('editBarangay');
  if (!munSelect || !brgySelect) return;
  const mun = munSelect.value || 'Catbalogan City';
  let list = TREE_LOCATION_MAP[mun] || TREE_LOCATION_MAP['Catbalogan City'];
  const currentVal = brgySelect.value;
  brgySelect.innerHTML = '<option value="">Select Barangay</option>' + 
    list.map(b => `<option value="${b}">${b}</option>`).join('');
  if (currentVal && list.includes(currentVal)) {
    brgySelect.value = currentVal;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('editMunicipality')?.addEventListener('change', updateTreeModalBarangays);
  document.getElementById('editProvince')?.addEventListener('change', updateTreeModalBarangays);
  updateTreeModalBarangays();
});
