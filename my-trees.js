/**
 * ATAMAN My Trees Logic (Split Screen Layout Matching Reference)
 */

// Helper for dynamic realtime dates
const getMyTreesRealtimeDate = (daysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

// Dynamic tree dataset and state
function mapRawTreeToMyTree(t) {
  const species = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Tree';
  const location = t.barangay ? `Brgy. ${t.barangay}` : (t.location || 'Not Set');
  const health = t.status === 'needs-care' ? 'needs' : (t.status || 'healthy');
  const healthLabel = health === 'healthy' ? 'Healthy' : (health === 'critical' ? 'Critical' : (health === 'dead' ? 'Dead' : 'Needs Care'));
  const count = Math.max(1, parseInt(t.treeCount || t.count) || 1);

  return {
    id: t.id,
    species: species,
    count: count,
    treeCount: count,
    location: location,
    health: health,
    healthLabel: healthLabel,
    lastCheck: t.lastCheck || t.lastMon || getMyTreesRealtimeDate(0),
    nextMonitoring: t.nextMonitor || t.nextMonitoring || 'Due Today',
    dueCategory: t.dueCategory || (t.nextMonitor === 'Due Today' ? 'Due Today' : 'Upcoming'),
    plantDate: t.plantingDate || t.datePlanted || getMyTreesRealtimeDate(0),
    height: `${t.height || 2.4} meters`,
    diameter: `${t.trunkDiam || 3.2} cm`,
    age: t.ageOfTree || t.age || '6 Months',
    caretaker: t.caretaker || getActiveCaretakerName(),
    gps: (t.lat && t.lng) ? `${Number(t.lat).toFixed(4)}, ${Number(t.lng).toFixed(4)}` : 'Not Set',
    img: t.img && !t.img.includes('ATAMAN_bg') ? t.img : 'assets/tree.jpg',
    history: t.history && Array.isArray(t.history) && t.history.length > 0 ? t.history : [
      { date: t.lastCheck || getMyTreesRealtimeDate(0), health: healthLabel, class: health }
    ]
  };
}

function isTreeAssignedToCaretakerOrAdopter(t) {
  if (!t) return false;
  const hasAdopter = Boolean((t.adopter && t.adopter !== 'None' && t.adopter !== 'Not yet adopted' && t.adopter !== 'Available for Adoption') || (t.sponsorName && t.sponsorName !== 'None' && t.sponsorName !== 'Available for Adoption') || (parseInt(t.takenCount) || 0) > 0);
  const hasCaretaker = Boolean(t.caretaker && t.caretaker !== 'Unassigned' && t.caretaker !== 'None');
  return hasAdopter || hasCaretaker;
}

function loadInitialTreesData() {
  try {
    const raw = localStorage.getItem('ATAMAN_trees_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(isTreeAssignedToCaretakerOrAdopter).map(mapRawTreeToMyTree);
      }
    }
  } catch (e) {}
  return [];
}

let treesData = loadInitialTreesData();
let currentFilteredTrees = treesData;
let currentTablePage = 1;
const TABLE_PAGE_SIZE = 10;

function updateSummaryStats(trees = treesData) {
  const getCnt = (t) => Math.max(1, parseInt(t.count || t.treeCount) || 1);
  const total = trees.reduce((sum, t) => sum + getCnt(t), 0);
  const healthy = trees.filter(t => t.health === 'healthy' || t.status === 'healthy').reduce((sum, t) => sum + getCnt(t), 0);
  const needs = trees.filter(t => t.health === 'needs' || t.health === 'needs-care' || t.status === 'needs-care').reduce((sum, t) => sum + getCnt(t), 0);
  const critical = trees.filter(t => t.health === 'critical' || t.status === 'critical').reduce((sum, t) => sum + getCnt(t), 0);
  const dead = trees.filter(t => t.health === 'dead' || t.status === 'dead').reduce((sum, t) => sum + getCnt(t), 0);
  const pending = trees.filter(t => {
    const next = t.nextMonitoring || '';
    const due = t.dueCategory || '';
    return next === 'Due Today' || next === 'Overdue' || due === 'Due Today' || due === 'Overdue';
  }).reduce((sum, t) => sum + getCnt(t), 0);

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('cntTotal', total);
  setTxt('totalTreeCount', total);
  setTxt('cntHealthy', healthy);
  setTxt('cntNeeds', needs);
  setTxt('cntCritical', critical);
  setTxt('cntDead', dead);
  setTxt('cntPending', pending);

  const pct = (c) => total > 0 ? ((c / total) * 100).toFixed(1) + '%' : '0%';
  setTxt('pctHealthy', pct(healthy));
  setTxt('pctNeeds', pct(needs));
  setTxt('pctCritical', pct(critical));
  setTxt('pctDead', pct(dead));
}

function renderPaginationControls(totalItems, currentPage = 1, pageSize = 10) {
  const container = document.getElementById('pagControls');
  const rangeText = document.getElementById('paginationRangeText');
  if (!container) return;
  container.innerHTML = '';

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, currentPage), totalPages);

  if (rangeText) {
    if (totalItems === 0) {
      rangeText.textContent = 'Showing 0 of 0 trees';
    } else {
      const start = (page - 1) * pageSize + 1;
      const end = Math.min(page * pageSize, totalItems);
      rangeText.textContent = `Showing ${start}–${end} of ${totalItems} trees`;
    }
  }

  if (totalPages <= 1) {
    return;
  }

  // Prev Arrow
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn page-arrow';
  prevBtn.textContent = '‹';
  prevBtn.disabled = page === 1;
  prevBtn.addEventListener('click', () => {
    if (page > 1) {
      currentTablePage = page - 1;
      renderTreeTable(currentFilteredTrees, currentTablePage);
    }
  });
  container.appendChild(prevBtn);

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      const numBtn = document.createElement('button');
      numBtn.className = `page-btn ${i === page ? 'active' : ''}`;
      numBtn.textContent = i;
      numBtn.addEventListener('click', () => {
        currentTablePage = i;
        renderTreeTable(currentFilteredTrees, currentTablePage);
      });
      container.appendChild(numBtn);
    } else if (i === page - 3 || i === page + 3) {
      const dots = document.createElement('span');
      dots.className = 'page-dots';
      dots.textContent = '...';
      container.appendChild(dots);
    }
  }

  // Next Arrow
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn page-arrow';
  nextBtn.textContent = '›';
  nextBtn.disabled = page === totalPages;
  nextBtn.addEventListener('click', () => {
    if (page < totalPages) {
      currentTablePage = page + 1;
      renderTreeTable(currentFilteredTrees, currentTablePage);
    }
  });
  container.appendChild(nextBtn);
}

function isCurrentUserAdopter() {
  try {
    const params = new URLSearchParams(window.location.search);
    if ((params.get('role') || '').toLowerCase().includes('adopter')) {
      localStorage.setItem('ATAMAN_user_role', 'adopter');
      return true;
    }
    if ((document.referrer || '').toLowerCase().includes('adopter-dashboard')) {
      localStorage.setItem('ATAMAN_user_role', 'adopter');
      return true;
    }
    const rawRole = (localStorage.getItem('ATAMAN_user_role') || '').toLowerCase().trim();
    if (rawRole === 'adopter' || rawRole.includes('adopter')) {
      return true;
    }
    const userEmail = (localStorage.getItem('ATAMAN_user_email') || '').toLowerCase().trim();
    const userName = (localStorage.getItem('ATAMAN_user_name') || '').toLowerCase().trim();
    const regUsers = JSON.parse(localStorage.getItem('ATAMAN_registered_users') || '[]');
    const matchedUser = regUsers.find(u =>
      (userEmail && u.email && u.email.toLowerCase().trim() === userEmail) ||
      (userName && (u.displayName || u.name || '').toLowerCase().trim() === userName)
    );
    if (matchedUser && String(matchedUser.role || '').toLowerCase().includes('adopter')) {
      localStorage.setItem('ATAMAN_user_role', 'adopter');
      return true;
    }
  } catch (e) {}
  return false;
}

function applyAdopterModeUI() {
  if (!isCurrentUserAdopter()) return;

  // 1. Brand Logo & Tag
  const brandLogo = document.querySelector('.ct-brand-logo');
  if (brandLogo) brandLogo.href = 'adopter-dashboard.html';
  const brandTag = document.querySelector('.ct-brand-tag');
  if (brandTag) brandTag.textContent = 'Every Tree. Every Impact.';

  // 2. Replace Caretaker Sidebar Links with Adopter Sidebar Links
  const navList = document.querySelector('.ct-nav-list');
  if (navList) {
    navList.innerHTML = `
      <li class="ct-nav-item">
        <a href="adopter-dashboard.html" class="ct-nav-link">
          <svg class="ct-nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Dashboard</span>
        </a>
      </li>
      <li class="ct-nav-item">
        <a href="adopter-dashboard.html#adopterMap" class="ct-nav-link">
          <svg class="ct-nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Tree Map</span>
        </a>
      </li>
      <li class="ct-nav-item active">
        <a href="my-trees.html?role=adopter" class="ct-nav-link">
          <svg class="ct-nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
          </svg>
          <span>My Trees</span>
        </a>
      </li>
      <li class="ct-nav-item">
        <a href="adopter-dashboard.html" class="ct-nav-link">
          <svg class="ct-nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>Adoption</span>
        </a>
      </li>
      <li class="ct-nav-item">
        <a href="adopter-dashboard.html" class="ct-nav-link">
          <svg class="ct-nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span>Reports</span>
        </a>
      </li>
      <li class="ct-nav-item">
        <a href="adopter-dashboard.html" class="ct-nav-link">
          <svg class="ct-nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="m15 9-6 6"/>
            <path d="M9 9h6v6"/>
          </svg>
          <span>Impact</span>
        </a>
      </li>
      <li class="ct-nav-item">
        <a href="adopter-dashboard.html" class="ct-nav-link">
          <svg class="ct-nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Messages</span>
        </a>
      </li>
      <li class="ct-nav-item">
        <a href="adopter-dashboard.html" class="ct-nav-link">
          <svg class="ct-nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <span>Events</span>
        </a>
      </li>
      <li class="ct-nav-item">
        <a href="#" class="ct-nav-link" id="adMyTreesCertQrLink">
          <svg class="ct-nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="6"/>
            <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
          </svg>
          <span>Certificate &amp; QR</span>
        </a>
      </li>
    `;
    const certLink = document.getElementById('adMyTreesCertQrLink');
    if (certLink) {
      certLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.ATAMAN_INCENTIVES && typeof window.ATAMAN_INCENTIVES.openCertificateModal === 'function') {
          window.ATAMAN_INCENTIVES.openCertificateModal({ role: 'adopter' });
        }
      });
    }
  }

  // 3. Top Header Role & Dropdown Menu for Adopter
  const userRolePill = document.querySelector('#ctUserDropdown .ct-user-role');
  if (userRolePill) userRolePill.textContent = 'Tree Adopter';

  const ddBadge = document.querySelector('#ctProfileDropdown .ct-profile-dd-badge');
  if (ddBadge) ddBadge.textContent = 'Tree Adopter';

  const ddMenu = document.querySelector('#ctProfileDropdown .ct-profile-dd-menu');
  if (ddMenu) {
    ddMenu.innerHTML = `
      <a href="#" class="ct-profile-dd-item" id="adDdSupport" role="menuitem">
        <div class="dd-item-icon dd-icon-trees">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
          </svg>
        </div>
        <div class="dd-item-text">
          <span class="dd-item-title">Support</span>
          <span class="dd-item-subtitle">Help center &amp; adopter assistance</span>
        </div>
      </a>
      <a href="#" class="ct-profile-dd-item" id="adDdSettings" role="menuitem">
        <div class="dd-item-icon dd-icon-settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <div class="dd-item-text">
          <span class="dd-item-title">Settings</span>
          <span class="dd-item-subtitle">Account &amp; notification preferences</span>
        </div>
      </a>
      <a href="adopter-dashboard.html" class="ct-profile-dd-item" role="menuitem">
        <div class="dd-item-icon dd-icon-trees">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div class="dd-item-text">
          <span class="dd-item-title">Dashboard</span>
          <span class="dd-item-subtitle">Back to Adopter overview</span>
        </div>
      </a>
    `;
    const adDdSupport = document.getElementById('adDdSupport');
    if (adDdSupport) {
      adDdSupport.addEventListener('click', (e) => {
        e.preventDefault();
        showCtToast('🎧 Support Center: Reach us at support@ataman.org');
      });
    }
    const adDdSettings = document.getElementById('adDdSettings');
    if (adDdSettings) {
      adDdSettings.addEventListener('click', (e) => {
        e.preventDefault();
        showCtToast('⚙️ Opening Adopter Account Settings...');
      });
    }
  }

  // 4. Page Subtitle, Stat Card Label, and Caretaker-Only Buttons
  const dashSub = document.querySelector('.ct-dash-subtitle');
  if (dashSub) dashSub.textContent = 'View and track the growth and health of your adopted trees.';

  const firstStatLabel = document.querySelector('.card-green .s-label');
  if (firstStatLabel) firstStatLabel.textContent = 'My Adopted Trees';

  const btnTopRecordMon = document.getElementById('btnTopRecordMon');
  if (btnTopRecordMon) btnTopRecordMon.style.display = 'none';

  const btnOpenRecordMon = document.getElementById('btnOpenRecordMon');
  if (btnOpenRecordMon) btnOpenRecordMon.style.display = 'none';

  const btnOpenAddMaint = document.getElementById('btnOpenAddMaint');
  if (btnOpenAddMaint) btnOpenAddMaint.style.display = 'none';
}

function getAdopterUserTrees(allTreesList = null) {
  if (!isCurrentUserAdopter()) return null;

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

  let treesPool = allTreesList;
  if (!Array.isArray(treesPool) || treesPool.length === 0) {
    try {
      treesPool = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
    } catch (e) {
      treesPool = [];
    }
  }
  if ((!Array.isArray(treesPool) || treesPool.length === 0) && typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_TREES)) {
    treesPool = [...window.ATAMAN_DEFAULT_TREES];
  }

  // Deduplicate split registration/adoption records
  if (Array.isArray(adopters) && adopters.length > 0) {
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
        }
      }
    }
  }

  let myAdopter = adopters.find(a => {
    const matchEmail = userEmail && a.email && a.email.toLowerCase().trim() === userEmail;
    const matchName = userName && a.name && a.name.toLowerCase().trim() === userName.toLowerCase();
    const matchContact = userName && a.contactPerson && a.contactPerson.toLowerCase().trim() === userName.toLowerCase();
    return matchEmail || matchName || matchContact;
  });
  if (!myAdopter && adopters.length === 1) {
    myAdopter = adopters[0];
  }

  const adopterTreesList = (myAdopter && Array.isArray(myAdopter.treesList)) ? myAdopter.treesList : [];
  const myTreeIds = adopterTreesList.map(t => String(t.id));

  const matched = [];
  if (Array.isArray(treesPool)) {
    treesPool.forEach(t => {
      const matchId = myTreeIds.includes(String(t.id));
      const searchNames = [userName, myAdopter?.name, myAdopter?.contactPerson].filter(Boolean).map(s => s.toLowerCase().trim());
      const spNameStr = (t.sponsorName || '').toLowerCase();
      const adNameStr = (t.adopter || '').toLowerCase();
      const matchAdopter = searchNames.some(n => (spNameStr && spNameStr.includes(n)) || (adNameStr && adNameStr.includes(n)));

      if (matchId || matchAdopter) {
        const entry = adopterTreesList.find(item => String(item.id) === String(t.id));
        const adoptedCount = entry
          ? Math.max(1, parseInt(entry.treeCount) || 1)
          : (parseInt(myAdopter?.treesCount) || Math.max(1, parseInt(t.takenCount) || 1));

        matched.push({
          id: t.id,
          species: (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Narra',
          count: adoptedCount,
          treeCount: adoptedCount,
          location: t.barangay ? `Brgy. ${t.barangay}` : (t.location || 'Not Set'),
          health: t.status === 'needs-care' ? 'needs' : (t.status || 'healthy'),
          healthLabel: (t.status || 'healthy') === 'healthy' ? 'Healthy' : (t.status === 'critical' ? 'Critical' : (t.status === 'dead' ? 'Dead' : 'Needs Care')),
          lastCheck: t.lastCheck || t.lastMon || getMyTreesRealtimeDate(0),
          nextMonitoring: t.nextMonitor || 'Scheduled',
          dueCategory: 'Upcoming',
          plantDate: t.plantingDate || t.datePlanted || getMyTreesRealtimeDate(0),
          height: `${t.height || 2.4} meters`,
          diameter: `${t.trunkDiam || 3.2} cm`,
          age: t.ageOfTree || t.age || '6 Months',
          caretaker: t.caretaker || 'Assigned Caretaker',
          gps: (t.lat && t.lng) ? `${Number(t.lat).toFixed(4)}, ${Number(t.lng).toFixed(4)}` : 'Not Set',
          img: 'assets/ATAMAN_bg.jpg',
          history: [
            { date: t.lastCheck || getMyTreesRealtimeDate(0), health: (t.status || 'healthy') === 'healthy' ? 'Healthy' : 'Needs Care', class: (t.status || 'healthy') === 'healthy' ? 'healthy' : 'needs' }
          ]
        });
      }
    });
  }

  // Fallback if adopter has treesList entries not yet matched in treesPool
  if (matched.length === 0 && adopterTreesList.length > 0) {
    adopterTreesList.forEach(item => {
      const count = Math.max(1, parseInt(item.treeCount) || 1);
      const rawSp = item.species;
      const spName = (typeof rawSp === 'object' && rawSp ? rawSp.common : rawSp) || 'Narra';
      matched.push({
        id: item.id || 'TR-10001',
        species: spName,
        count: count,
        treeCount: count,
        location: item.barangay ? `Brgy. ${item.barangay}` : 'Not Set',
        health: 'healthy',
        healthLabel: 'Healthy',
        lastCheck: getMyTreesRealtimeDate(0),
        nextMonitoring: 'Scheduled',
        dueCategory: 'Upcoming',
        plantDate: item.datePlanted || getMyTreesRealtimeDate(0),
        height: '2.4 meters',
        diameter: '3.2 cm',
        age: '6 Months',
        caretaker: 'Assigned Caretaker',
        gps: 'Not Set',
        img: 'assets/ATAMAN_bg.jpg',
        history: [{ date: getMyTreesRealtimeDate(0), health: 'Healthy', class: 'healthy' }]
      });
    });
  }

  return matched;
}

// Initial dataset check for adopter
const adopterInitialTrees = getAdopterUserTrees();
if (adopterInitialTrees !== null) {
  treesData = adopterInitialTrees;
}

let selectedTree = treesData[0] || null;

document.addEventListener('DOMContentLoaded', () => {
  applyAdopterModeUI();
  const rawRole = (localStorage.getItem('ATAMAN_user_role') || '').toLowerCase().trim();
  const brandLogo = document.querySelector('.ct-brand-logo');
  const navDash = document.querySelector('.ct-nav-link[href*="dashboard"]');
  if (isCurrentUserAdopter() || rawRole.includes('adopter')) {
    if (brandLogo) brandLogo.href = 'adopter-dashboard.html';
    if (navDash) navDash.href = 'adopter-dashboard.html';
  } else if (rawRole.includes('admin')) {
    if (brandLogo) brandLogo.href = 'dashboard.html';
    if (navDash) navDash.href = 'dashboard.html';
  }

  initFirebaseAuth();
  initCaretakerProfileDropdown();
  const adopterMatched = getAdopterUserTrees();
  if (adopterMatched !== null) {
    treesData = adopterMatched;
  }
  currentFilteredTrees = treesData;
  selectedTree = treesData[0] || null;

  updateSummaryStats(treesData);
  renderTreeTable(treesData, 1);
  updateProfilePanel(selectedTree);
  initDatabaseSync();
  initSearchAndFilters();
  initModals();

  window.addEventListener('storage', (e) => {
    if (e.key === 'ATAMAN_trees_cache' || e.key === 'ATAMAN_adopters_cache') {
      const updated = getAdopterUserTrees();
      if (updated !== null) {
        treesData = updated;
      } else {
        treesData = loadInitialTreesData();
      }
      currentFilteredTrees = treesData;
      selectedTree = treesData.find(t => selectedTree && t.id === selectedTree.id) || treesData[0] || null;
      updateSummaryStats(treesData);
      renderTreeTable(currentFilteredTrees, currentTablePage);
      updateProfilePanel(selectedTree);
    }
  });
});

function initDatabaseSync() {
  if (window.ATAMAN_DB) {
    window.ATAMAN_DB.onTreesChange((trees) => {
      if (trees && Array.isArray(trees)) {
        const adopterMatched = getAdopterUserTrees(trees);
        if (adopterMatched !== null) {
          treesData = adopterMatched;
        } else {
          treesData = trees.filter(isTreeAssignedToCaretakerOrAdopter).map(mapRawTreeToMyTree);
        }
        currentFilteredTrees = treesData;
        selectedTree = treesData.find(t => selectedTree && t.id === selectedTree.id) || treesData[0] || null;
        updateSummaryStats(treesData);
        renderTreeTable(currentFilteredTrees, currentTablePage);
        updateProfilePanel(selectedTree);
      }
    });
  }
}

function getActiveCaretakerName() {
  const authAPI = window.ATAMAN_AUTH;
  const user = authAPI?.getCurrentUser ? authAPI.getCurrentUser() : null;
  return user?.displayName || localStorage.getItem('ATAMAN_user_name') || 'Assigned Caretaker';
}

/* ─── 0. Universal Auth State & User Profile ─── */
function initFirebaseAuth() {
  const ctUserName = document.getElementById('ctUserName');
  const avatarText = document.getElementById('avatarText');
  const ddUserName = document.getElementById('ddUserName');
  const ddAvatarText = document.getElementById('ddAvatarText');
  const ctLogoutBtn = document.getElementById('ctLogoutBtn');
  const authAPI = window.ATAMAN_AUTH;

  function syncAllProfileDisplays(name) {
    const cleanName = name || localStorage.getItem('ATAMAN_user_name') || (isCurrentUserAdopter() ? 'Adopter' : 'Caretaker');
    const initials = cleanName
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || (isCurrentUserAdopter() ? 'AD' : 'CT');
    if (ctUserName) ctUserName.textContent = cleanName;
    if (avatarText) avatarText.textContent = initials;
    if (ddUserName) ddUserName.textContent = cleanName;
    if (ddAvatarText) ddAvatarText.textContent = initials;
  }

  // Sync immediately from localStorage so there is never a placeholder flash on refresh
  syncAllProfileDisplays(localStorage.getItem('ATAMAN_user_name'));

  // Live Real-Time Date & Clock in Header + Date Inputs
  const ctLiveDateText = document.getElementById('ctLiveDateText');
  function updateMyTreesLiveClock() {
    const now = new Date();
    if (ctLiveDateText) {
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
      ctLiveDateText.textContent = `${dateStr} • ${timeStr}`;
    }
  }
  updateMyTreesLiveClock();
  setInterval(updateMyTreesLiveClock, 1000);
  const todayIso = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(inp => {
    if (!inp.value || inp.value.startsWith('2026-08')) inp.value = todayIso;
  });

  if (authAPI) {
    authAPI.onAuthStateChanged((user) => {
      if (user) {
        const displayName = localStorage.getItem('ATAMAN_user_name') || user.displayName;
        syncAllProfileDisplays(displayName);
        applyAdopterModeUI();
      }
    });
  }

  if (ctLogoutBtn) {
    ctLogoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        showCtToast('Signing out...');
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

/* ─── Caretaker Profile Dropdown ─── */
function initCaretakerProfileDropdown() {
  const userPill = document.getElementById('ctUserDropdown');
  const profileDropdown = document.getElementById('ctProfileDropdown');

  if (!userPill || !profileDropdown) return;

  function toggleProfileDropdown() {
    const isHidden = profileDropdown.classList.contains('hide');
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

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#ctUserDropdownWrapper')) {
      closeProfileDropdown();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProfileDropdown();
    }
  });
}

/* ─── 1. Render Table Rows with Dynamic Pagination ─── */
function renderTreeTable(filteredTrees = treesData, page = 1) {
  const tbody = document.getElementById('treeTableBody');
  const emptyState = document.getElementById('emptyState');
  currentFilteredTrees = filteredTrees;
  currentTablePage = page;

  if (!tbody) return;
  tbody.innerHTML = '';

  const total = filteredTrees.length;
  renderPaginationControls(total, page, TABLE_PAGE_SIZE);

  if (total === 0) {
    if (emptyState) emptyState.classList.remove('hide');
    return;
  } else {
    if (emptyState) emptyState.classList.add('hide');
  }

  const startIdx = (page - 1) * TABLE_PAGE_SIZE;
  const pageItems = filteredTrees.slice(startIdx, startIdx + TABLE_PAGE_SIZE);

  pageItems.forEach((tree) => {
    const tr = document.createElement('tr');
    const isSelected = selectedTree && selectedTree.id === tree.id;
    if (isSelected) tr.classList.add('selected-row');

    // Health class
    let healthClass = 'b-healthy';
    let dot = '🟢';
    if (tree.health === 'needs') { healthClass = 'b-needs'; dot = '🟡'; }
    if (tree.health === 'critical') { healthClass = 'b-critical'; dot = '🔴'; }
    if (tree.health === 'dead') { healthClass = 'b-dead'; dot = '⚫'; }

    // Next monitoring badge
    let dueClass = 'nd-upcoming';
    if (tree.nextMonitoring === 'Due Today') dueClass = 'nd-due-today';
    if (tree.nextMonitoring === 'Tomorrow') dueClass = 'nd-tomorrow';
    if (tree.nextMonitoring === 'Overdue') dueClass = 'nd-overdue';
    if (tree.nextMonitoring === 'For validation') dueClass = 'nd-validation';

    const btnClass = isSelected ? 'btn-row-action btn-action-filled' : 'btn-row-action btn-action-outline';

    const qtyText = (tree.count || tree.treeCount) > 1 ? ` <span style="font-size:11px; color:#64748b; font-weight:600;">(${tree.count || tree.treeCount} trees)</span>` : '';

    tr.innerHTML = `
      <td class="cell-tree-id">${tree.id}</td>
      <td class="cell-species">${tree.species}${qtyText}</td>
      <td class="cell-location">${tree.location}</td>
      <td><span class="badge-status ${healthClass}">${dot} ${tree.healthLabel}</span></td>
      <td>${tree.lastCheck}</td>
      <td><span class="badge-next-due ${dueClass}">${tree.nextMonitoring}</span></td>
      <td class="th-action">
        <button class="${btnClass}" data-id="${tree.id}">View</button>
      </td>
    `;

    tr.addEventListener('click', () => {
      selectedTree = tree;
      renderTreeTable(filteredTrees, currentTablePage);
      updateProfilePanel(tree);
    });

    tbody.appendChild(tr);
  });
}

/* ─── 2. Update Right Inline Tree Profile Panel ─── */
function updateProfilePanel(tree) {
  if (!tree) {
    document.getElementById('panelTreeTitle').textContent = 'No Tree Selected';
    const badgeEl = document.getElementById('panelHealthBadge');
    if (badgeEl) {
      badgeEl.className = 'panel-health-badge b-healthy';
      badgeEl.textContent = '—';
    }
    ['specLoc', 'specPlantDate', 'specHeight', 'specDiameter', 'specAge', 'specCaretaker', 'specGps', 'specLastMon'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
    const timelineEl = document.getElementById('historyTimeline');
    if (timelineEl) timelineEl.innerHTML = '<div style="color:#94a3b8; font-size:0.8rem; padding:8px 0;">No monitoring history yet.</div>';
    return;
  }

  const qtyVal = tree.count || tree.treeCount || 1;
  document.getElementById('panelTreeTitle').textContent = `${tree.id} — ${tree.species.toUpperCase()}${qtyVal > 1 ? ` (${qtyVal} TREES)` : ''}`;

  const badgeEl = document.getElementById('panelHealthBadge');
  let dot = '🟢';
  let badgeClass = 'b-healthy';
  if (tree.health === 'needs') { dot = '🟡'; badgeClass = 'b-needs'; }
  if (tree.health === 'critical') { dot = '🔴'; badgeClass = 'b-critical'; }
  if (tree.health === 'dead') { dot = '⚫'; badgeClass = 'b-dead'; }
  badgeEl.className = `panel-health-badge ${badgeClass}`;
  badgeEl.textContent = `${dot} ${tree.healthLabel}`;

  // Specs
  document.getElementById('specLoc').textContent = tree.location;
  document.getElementById('specPlantDate').textContent = tree.plantDate;
  document.getElementById('specHeight').textContent = tree.height;
  document.getElementById('specDiameter').textContent = tree.diameter;
  document.getElementById('specAge').textContent = tree.age;
  document.getElementById('specCaretaker').textContent = tree.caretaker;
  document.getElementById('specGps').textContent = tree.gps;
  document.getElementById('specLastMon').textContent = tree.lastCheck;

  // Ensure a QR Code Location Tag button is shown in the profile panel
  const gpsEl = document.getElementById('specGps');
  if (gpsEl && gpsEl.parentElement) {
    let qrInlineBtn = document.getElementById('myTreesProfileQrBtn');
    if (!qrInlineBtn) {
      qrInlineBtn = document.createElement('button');
      qrInlineBtn.type = 'button';
      qrInlineBtn.id = 'myTreesProfileQrBtn';
      qrInlineBtn.style.cssText = 'margin-top:6px;display:inline-flex;align-items:center;gap:5px;background:#15803d;color:#fff;border:none;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;';
      qrInlineBtn.innerHTML = '📱 QR Code Location Tag';
      gpsEl.parentElement.appendChild(qrInlineBtn);
    }
    qrInlineBtn.onclick = () => {
      if (window.ATAMAN_INCENTIVES && typeof window.ATAMAN_INCENTIVES.openTreeQrModal === 'function') {
        window.ATAMAN_INCENTIVES.openTreeQrModal(tree.id);
      }
    };
  }

  // Timeline
  const timelineEl = document.getElementById('historyTimeline');
  timelineEl.innerHTML = '';

  tree.history.forEach(item => {
    const row = document.createElement('div');
    row.className = 'compact-timeline-item';

    let tagClass = 'b-healthy';
    let hDot = '🟢';
    if (item.class === 'needs') { tagClass = 'b-needs'; hDot = '🟡'; }
    if (item.class === 'critical') { tagClass = 'b-critical'; hDot = '🔴'; }
    if (item.class === 'dead') { tagClass = 'b-dead'; hDot = '⚫'; }

    row.innerHTML = `
      <div class="tl-left">
        <span class="tl-dot ${item.class}"></span>
        <span class="tl-date">${item.date}</span>
      </div>
      <span class="tl-tag ${tagClass}">${hDot} ${item.health}</span>
    `;
    timelineEl.appendChild(row);
  });
}

/* ─── 3. Search & Filter Controls ─── */
function initSearchAndFilters() {
  const searchInput = document.getElementById('treeSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const speciesFilter = document.getElementById('speciesFilter');
  const healthFilter = document.getElementById('healthFilter');
  const locationFilter = document.getElementById('locationFilter');
  const dueFilter = document.getElementById('dueFilter');
  const btnReset = document.getElementById('btnResetFilters');
  const emptyReset = document.getElementById('emptyResetBtn');
  const sortSelect = document.getElementById('sortSelect');

  function applyFilters() {
    const searchVal = searchInput.value.toLowerCase().trim();
    const speciesVal = speciesFilter.value;
    const healthVal = healthFilter.value;
    const locVal = locationFilter.value;
    const dueVal = dueFilter.value;

    if (searchVal) {
      clearSearchBtn.classList.remove('hide');
    } else {
      clearSearchBtn.classList.add('hide');
    }

    let filtered = treesData.filter(tree => {
      const matchSearch = !searchVal || 
        tree.id.toLowerCase().includes(searchVal) || 
        tree.species.toLowerCase().includes(searchVal) ||
        tree.location.toLowerCase().includes(searchVal);

      const matchSpecies = speciesVal === 'all' || tree.species === speciesVal;
      const matchHealth = healthVal === 'all' || tree.health === healthVal;
      const matchLoc = locVal === 'all' || tree.location === locVal;
      const matchDue = dueVal === 'all' || tree.nextMonitoring === dueVal || (dueVal === 'Upcoming' && tree.dueCategory === 'Upcoming');

      return matchSearch && matchSpecies && matchHealth && matchLoc && matchDue;
    });

    // Sorting
    const sortVal = sortSelect ? sortSelect.value : 'lastCheckDesc';
    if (sortVal === 'treeId') {
      filtered.sort((a, b) => a.id.localeCompare(b.id));
    } else if (sortVal === 'species') {
      filtered.sort((a, b) => a.species.localeCompare(b.species));
    }

    renderTreeTable(filtered, 1);
  }

  searchInput.addEventListener('input', applyFilters);
  speciesFilter.addEventListener('change', applyFilters);
  healthFilter.addEventListener('change', applyFilters);
  locationFilter.addEventListener('change', applyFilters);
  dueFilter.addEventListener('change', applyFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    applyFilters();
  });

  function resetAll() {
    searchInput.value = '';
    speciesFilter.value = 'all';
    healthFilter.value = 'all';
    locationFilter.value = 'all';
    dueFilter.value = 'all';
    applyFilters();
    showCtToast('Filters reset.');
  }

  if (btnReset) btnReset.addEventListener('click', resetAll);
  if (emptyReset) emptyReset.addEventListener('click', resetAll);
}

/* ─── 4. Modals & Actions ─── */
function initModals() {
  const monModal = document.getElementById('monModalBackdrop');
  const btnOpenRecordMon = document.getElementById('btnOpenRecordMon');
  const btnTopRecordMon = document.getElementById('btnTopRecordMon');
  const monModalCloseBtn = document.getElementById('monModalCloseBtn');
  const monModalCancelBtn = document.getElementById('monModalCancelBtn');
  const recordMonForm = document.getElementById('recordMonForm');
  const monTitle = document.getElementById('monModalTitle');

  const maintModal = document.getElementById('maintModalBackdrop');
  const btnOpenAddMaint = document.getElementById('btnOpenAddMaint');
  const maintModalCloseBtn = document.getElementById('maintModalCloseBtn');
  const maintModalCancelBtn = document.getElementById('maintModalCancelBtn');
  const addMaintForm = document.getElementById('addMaintForm');
  const maintTitle = document.getElementById('maintModalTitle');

  function openMon() {
    monTitle.textContent = `Record Monitoring — ${selectedTree.id} (${selectedTree.species})`;
    monModal.classList.remove('hide');
  }

  if (btnOpenRecordMon) btnOpenRecordMon.addEventListener('click', openMon);
  if (btnTopRecordMon) btnTopRecordMon.addEventListener('click', openMon);

  const navMonitoring = document.getElementById('navMonitoring');
  if (navMonitoring) {
    navMonitoring.addEventListener('click', (e) => {
      e.preventDefault();
      openMon();
    });
  }

  if (window.location.search.includes('action=record')) {
    setTimeout(openMon, 200);
  }

  function closeMon() {
    monModal.classList.add('hide');
    recordMonForm.reset();
  }
  monModalCloseBtn.addEventListener('click', closeMon);
  monModalCancelBtn.addEventListener('click', closeMon);

  recordMonForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedHealth = document.querySelector('input[name="newHealth"]:checked').value;
    const newHeight = document.getElementById('monHeight').value;
    const newDiam = document.getElementById('monDiameter').value;

    selectedTree.health = selectedHealth.toLowerCase().replace(' ', '');
    selectedTree.healthLabel = selectedHealth;
    selectedTree.lastCheck = getMyTreesRealtimeDate(0);
    selectedTree.nextMonitoring = getMyTreesRealtimeDate(-7);
    if (newHeight) selectedTree.height = `${newHeight} meters`;
    if (newDiam) selectedTree.diameter = `${newDiam} cm`;

    selectedTree.history.unshift({
      date: getMyTreesRealtimeDate(0),
      health: selectedHealth,
      class: selectedTree.health
    });

    closeMon();
    updateSummaryStats(treesData);
    updateProfilePanel(selectedTree);
    renderTreeTable(currentFilteredTrees, currentTablePage);

    if (window.ATAMAN_INCENTIVES && typeof window.ATAMAN_INCENTIVES.recordMonthlyTreeUpdate === 'function') {
      window.ATAMAN_INCENTIVES.recordMonthlyTreeUpdate({
        treeId: selectedTree.id,
        status: selectedTree.health === 'needs' ? 'needs-care' : selectedTree.health,
        height: selectedTree.height,
        notes: `Field inspection by ${getActiveCaretakerName()}`,
        caretakerName: getActiveCaretakerName()
      });
    }

    if (window.ATAMAN_DB) {
      window.ATAMAN_DB.updateTree(selectedTree.id, {
        status: selectedTree.health === 'needs' ? 'needs-care' : selectedTree.health,
        health: selectedTree.healthLabel,
        lastMon: selectedTree.lastCheck,
        height: selectedTree.height,
        trunkDiam: selectedTree.diameter,
        lastCheck: selectedTree.lastCheck
      });
      window.ATAMAN_DB.addMonitoringLog({
        treeId: selectedTree.id,
        status: selectedTree.health === 'needs' ? 'needs-care' : selectedTree.health,
        remarks: `Field inspection by ${getActiveCaretakerName()}`,
        caretaker: getActiveCaretakerName()
      });
    }
    showCtToast(`✅ Monitoring recorded for ${selectedTree.id}!`);
  });

  function openMaint() {
    if (selectedTree) {
      maintTitle.textContent = `Log Maintenance — ${selectedTree.id} (${selectedTree.species})`;
    }
    maintModal.classList.remove('hide');
  }

  if (btnOpenAddMaint) {
    btnOpenAddMaint.addEventListener('click', openMaint);
  }

  const navMaintenance = document.getElementById('navMaintenance');
  if (navMaintenance) {
    navMaintenance.addEventListener('click', (e) => {
      e.preventDefault();
      openMaint();
    });
  }

  if (window.location.search.includes('action=maintenance')) {
    setTimeout(openMaint, 200);
  }

  function closeMaint() {
    maintModal.classList.add('hide');
    addMaintForm.reset();
  }
  maintModalCloseBtn.addEventListener('click', closeMaint);
  maintModalCancelBtn.addEventListener('click', closeMaint);

  addMaintForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('maintType').value;
    const notes = document.getElementById('maintNotes')?.value || 'Maintenance conducted';
    const qty = document.getElementById('maintQty')?.value || '';
    const caretaker = getActiveCaretakerName();

    if (window.ATAMAN_DB && typeof window.ATAMAN_DB.addMonitoringLog === 'function') {
      try {
        await window.ATAMAN_DB.addMonitoringLog({
          treeId: selectedTree.id,
          status: 'maintained',
          activity: type,
          remarks: `[${type}] ${qty ? `Dose: ${qty}. ` : ''}${notes}`,
          caretaker: caretaker
        });
      } catch (_) {}
    }

    closeMaint();
    showCtToast(`🔧 Maintenance (${type}) logged for ${selectedTree.id}!`);
  });

  const btnViewOnMap = document.getElementById('btnViewOnMap');
  if (btnViewOnMap) {
    btnViewOnMap.addEventListener('click', () => {
      showCtToast(`📍 Navigating to Tree Map GPS: ${selectedTree ? selectedTree.gps : ''}...`);
      setTimeout(() => {
        window.location.href = isCurrentUserAdopter() ? 'adopter-dashboard.html#adopterMap' : 'caretaker-tree-map.html';
      }, 700);
    });
  }

  // Photo Uploader Dropzone
  const dropzone = document.getElementById('photoDropzone');
  const photoInput = document.getElementById('monPhotoInput');
  const previews = document.getElementById('uploadedPreviews');

  if (dropzone && photoInput) {
    dropzone.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', (e) => {
      previews.innerHTML = '';
      Array.from(e.target.files).forEach(file => {
        const chip = document.createElement('span');
        chip.className = 'preview-chip';
        chip.textContent = `📷 ${file.name}`;
        previews.appendChild(chip);
      });
    });
  }

  // View All buttons
  const viewAllHist = document.getElementById('viewAllHistoryBtn');
  if (viewAllHist) viewAllHist.addEventListener('click', (e) => { e.preventDefault(); showCtToast('Displaying full monitoring timeline...'); });
  const viewAllPhotos = document.getElementById('viewAllPhotosBtn');
  if (viewAllPhotos) viewAllPhotos.addEventListener('click', (e) => { e.preventDefault(); showCtToast('Opening full photo gallery for ' + selectedTree.id); });
}

/* ─── Toast Notification ─── */
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
