/* ==========================================================================
   ATAMAN Admin Caretakers JavaScript
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // SVG Placeholders / Evidence photos generator
  const getSamplePhotoSvg = (label, color = '#166534') => {
    const encoded = encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
        <rect width="300" height="200" fill="#0f291e"/>
        <circle cx="150" cy="90" r="45" fill="${color}" opacity="0.8"/>
        <path d="M150 45 C130 70 120 110 150 140 C180 110 170 70 150 45 Z" fill="#4ade80"/>
        <rect x="145" y="130" width="10" height="40" fill="#78350f" rx="2"/>
        <text x="150" y="185" fill="#f8fafc" font-size="13" font-family="sans-serif" text-anchor="middle" font-weight="bold">${label}</text>
      </svg>
    `);
    return `data:image/svg+xml;utf8,${encoded}`;
  };

  const DEFAULT_CARETAKERS = (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_CARETAKERS)) ? window.ATAMAN_DEFAULT_CARETAKERS : [];
  window.ATAMAN_DEFAULT_CARETAKERS = DEFAULT_CARETAKERS;

  // Caretakers Database (loads live user-created caretakers)
  let caretakersList = [];
  try {
    const cached = localStorage.getItem('ATAMAN_caretakers_cache');
    if (cached && cached !== '[]') {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) caretakersList = parsed;
    }
  } catch (e) {
    caretakersList = [];
  }
  if (!caretakersList || caretakersList.length === 0) {
    caretakersList = [...DEFAULT_CARETAKERS];
    try { localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakersList)); } catch (_) {}
  }

  function harmonizeCaretakerRecords(caretakers) {
    if (!Array.isArray(caretakers)) return false;
    let changed = false;

    let allTrees = [];
    try { allTrees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]'); } catch (_) {}
    if ((!allTrees || allTrees.length === 0) && Array.isArray(window.ATAMAN_DEFAULT_TREES)) {
      allTrees = [...window.ATAMAN_DEFAULT_TREES];
    }

    // 1. Normalize fields on every record so 'undefined' never appears
    caretakers.forEach(ct => {
      if (!ct) return;
      ct.name = ct.name || ct.fullName || ct.displayName || 'Field Caretaker';
      ct.empId = ct.empId || ct.employeeId || 'EMP-001';
      ct.email = (ct.email || ct.userEmail || '').toLowerCase().trim();
      ct.phone = ct.phone || ct.contact || ct.contactNumber || '—';
      const rawArea = (ct.primaryArea && String(ct.primaryArea) !== 'undefined') ? ct.primaryArea : '';
      ct.primaryArea = rawArea || ct.barangay || ct.location || ct.address || 'Catbalogan City';
      ct.barangay = ct.barangay || ct.primaryArea || 'Canlapwas';
      if (!ct.assignedTreeType || String(ct.assignedTreeType) === 'undefined') {
        ct.assignedTreeType = 'Native Hardwood';
      }
      if (!ct.status) ct.status = 'Active';
      if (!ct.dateJoined) ct.dateJoined = ct.joinedDate || 'Aug 01, 2026';
      if (!Array.isArray(ct.assignedBarangays) || ct.assignedBarangays.length === 0) {
        ct.assignedBarangays = [ct.primaryArea];
      }
      if (!Array.isArray(ct.assignedProjects) || ct.assignedProjects.length === 0) {
        ct.assignedProjects = ['General Reforestation'];
      }
    });

    // 2. Deduplicate & merge split records belonging to the same user account / caretaker ID
    for (let i = 0; i < caretakers.length; i++) {
      const a = caretakers[i];
      if (!a) continue;
      for (let j = i + 1; j < caretakers.length; j++) {
        const b = caretakers[j];
        if (!b) continue;

        const idMatch = a.id && b.id && String(a.id) === String(b.id);
        const empA = (a.empId || '').toLowerCase().trim();
        const empB = (b.empId || '').toLowerCase().trim();
        const empMatch = empA && empB && empA === empB;
        const emailA = (a.email || '').toLowerCase().trim();
        const emailB = (b.email || '').toLowerCase().trim();
        const emailMatch = emailA && emailB && emailA === emailB;
        const uidA = (a.userId || a.uid || '').toLowerCase().trim();
        const uidB = (b.userId || b.uid || '').toLowerCase().trim();
        const uidMatch = uidA && uidB && uidA === uidB;
        const nameA = (a.name || '').toLowerCase().trim();
        const nameB = (b.name || '').toLowerCase().trim();
        const nameMatch = nameA && nameB && nameA === nameB;

        if (idMatch || empMatch || emailMatch || uidMatch || nameMatch) {
          const scoreA = (Number(a.assignedTrees) || 0) * 100 + (Array.isArray(a.assignedTreeIds) ? a.assignedTreeIds.length * 10 : 0) + (a.assignedTreeType && a.assignedTreeType !== 'Native Hardwood' ? 5 : 0);
          const scoreB = (Number(b.assignedTrees) || 0) * 100 + (Array.isArray(b.assignedTreeIds) ? b.assignedTreeIds.length * 10 : 0) + (b.assignedTreeType && b.assignedTreeType !== 'Native Hardwood' ? 5 : 0);

          const primary = scoreB > scoreA ? b : a;
          const secondary = scoreB > scoreA ? a : b;

          const canonicalId = a.id || b.id;
          const dupId = (canonicalId === a.id) ? b.id : a.id;
          const bestEmpId = String(a.empId || '').toUpperCase().startsWith('EMP-') ? a.empId : (String(b.empId || '').toUpperCase().startsWith('EMP-') ? b.empId : (primary.empId || secondary.empId));

          const typesSet = new Set();
          [primary.assignedTreeType, secondary.assignedTreeType].forEach(tt => {
            if (tt && tt !== 'undefined' && tt !== 'Native Hardwood') {
              tt.split(',').map(s => s.trim()).filter(Boolean).forEach(s => typesSet.add(s));
            }
          });
          const combinedTreeType = typesSet.size > 0 ? Array.from(typesSet).join(', ') : (primary.assignedTreeType || secondary.assignedTreeType || 'Native Hardwood');

          const isGenericArea = (ar) => !ar || ar === 'undefined' || ar === 'Catbalogan City' || ar.includes('&');
          const bestPrimaryArea = !isGenericArea(primary.primaryArea) ? primary.primaryArea : (!isGenericArea(secondary.primaryArea) ? secondary.primaryArea : (primary.primaryArea || secondary.primaryArea || 'Catbalogan City'));

          const combinedTreeIds = Array.from(new Set([...(primary.assignedTreeIds || []), ...(secondary.assignedTreeIds || [])].map(String)));
          const combinedBrgys = Array.from(new Set([...(primary.assignedBarangays || []), ...(secondary.assignedBarangays || []), bestPrimaryArea].filter(x => x && x !== 'undefined' && x !== 'None')));
          const combinedProjects = Array.from(new Set([...(primary.assignedProjects || []), ...(secondary.assignedProjects || [])].filter(x => x && x !== 'undefined' && x !== 'None')));

          const mergedObj = {
            ...secondary,
            ...primary,
            id: canonicalId,
            empId: bestEmpId,
            userId: primary.userId || secondary.userId || secondary.id || primary.id,
            email: primary.email || secondary.email,
            phone: (primary.phone && primary.phone !== '—') ? primary.phone : (secondary.phone || '—'),
            address: primary.address || secondary.address || bestPrimaryArea,
            primaryArea: bestPrimaryArea,
            barangay: bestPrimaryArea,
            assignedTreeType: combinedTreeType,
            assignedTreeIds: combinedTreeIds,
            assignedBarangays: combinedBrgys.length > 0 ? combinedBrgys : [bestPrimaryArea],
            assignedProjects: combinedProjects.length > 0 ? combinedProjects : ['General Reforestation'],
            assignedTrees: Math.max(Number(primary.assignedTrees) || 0, Number(secondary.assignedTrees) || 0)
          };

          caretakers[i] = mergedObj;
          caretakers.splice(j, 1);
          j--;
          changed = true;

          // Delete the duplicate document from Firestore if it had a different doc ID
          if (dupId && dupId !== canonicalId) {
            const db = window.ATAMAN_FIRESTORE || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
            if (db) {
              db.collection('caretakers').doc(dupId).delete().catch(() => {});
              db.collection('caretakers').doc(canonicalId).set(mergedObj, { merge: true }).catch(() => {});
            }
          }
        }
      }
    }

    // 3. Recalculate assigned tree counts, health breakdown, and species from ATAMAN_trees_cache
    caretakers.forEach(ct => {
      if (!ct) return;
      if (!ct.treesCondition) ct.treesCondition = { healthy: 0, care: 0, critical: 0, dead: 0 };
      const ctName = (ct.name || '').toLowerCase().trim();
      const ctAdopter = (ct.assignedAdopterName || '').toLowerCase().trim();
      const ctTrees = Array.isArray(allTrees) ? allTrees.filter(t => {
        const treeCt = (t.caretaker || '').toLowerCase().trim();
        const treeAd = (t.adopter || t.sponsorName || '').toLowerCase().trim();
        const inIdList = Array.isArray(ct.assignedTreeIds) && ct.assignedTreeIds.map(String).includes(String(t.id));
        return (ctName && treeCt === ctName) || (ctAdopter && treeAd && treeAd === ctAdopter) || inIdList;
      }) : [];

      let cTotal = 0, cH = 0, cNC = 0, cCR = 0, cD = 0;
      const speciesSet = new Set();
      ctTrees.forEach(t => {
        const cnt = Math.max(1, parseInt(t.caretakerAssignedCount) || parseInt(t.treeCount) || 1);
        cTotal += cnt;
        const st = (t.status || 'healthy').toLowerCase();
        if (st === 'healthy') cH += cnt;
        else if (st === 'needs-care' || st === 'needs') cNC += cnt;
        else if (st === 'critical') cCR += cnt;
        else if (st === 'dead') cD += cnt;
        else cH += cnt;
        const sp = t.species?.common || (typeof t.species === 'string' ? t.species : '');
        if (sp) speciesSet.add(sp);
      });

      if (ctTrees.length > 0) {
        ct.assignedTrees = cTotal;
        ct.treesCondition = { healthy: cH, care: cNC, critical: cCR, dead: cD };
        if (speciesSet.size > 0 && (!ct.assignedTreeType || ct.assignedTreeType === 'Native Hardwood')) {
          ct.assignedTreeType = Array.from(speciesSet).join(', ');
        }
      } else if (typeof ct.assignedTrees !== 'number') {
        ct.assignedTrees = 0;
      }

      if (!ct._schedulesClearedV2) {
        ct.schedule = [];
        ct._schedulesClearedV2 = true;
      }
      if (!Array.isArray(ct.schedule)) {
        ct.schedule = [];
      }
    });

    return changed;
  }

  try {
    if (caretakersList.length > 0) {
      harmonizeCaretakerRecords(caretakersList);
      try { localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakersList)); } catch (_) {}
    }
  } catch (e) {
    console.warn('Caretaker sync notice:', e);
  }

  // Current selected caretaker for profile & modals
  let currentCaretaker = null;



  // DOM Elements
  const caretakersTbody = document.getElementById('caretakersTbody');
  const searchInput = document.getElementById('searchInput');
  const filterStatus = document.getElementById('filterStatus');
  const filterArea = document.getElementById('filterArea');
  const filterTreeCount = document.getElementById('filterTreeCount');
  const filterMonitoringStatus = document.getElementById('filterMonitoringStatus');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const tableCountBadge = document.getElementById('tableCountBadge');

  // Overview Cards Elements
  const cardTotalCaretakers = document.getElementById('cardTotalCaretakers');
  const cardActiveCaretakers = document.getElementById('cardActiveCaretakers');
  const cardInactiveCaretakers = document.getElementById('cardInactiveCaretakers');
  const cardAssignedTrees = document.getElementById('cardAssignedTrees');
  const cardMonitoringCompleted = document.getElementById('cardMonitoringCompleted');
  const cardOverdueMonitoring = document.getElementById('cardOverdueMonitoring');

  // Profile Modal Elements
  const caretakerProfileModal = document.getElementById('caretakerProfileModal');
  const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
  const footerCloseProfileBtn = document.getElementById('footerCloseProfileBtn');

  // Add Caretaker Modal Elements
  const addCaretakerModal = document.getElementById('addCaretakerModal');
  const openAddCaretakerModalBtn = document.getElementById('openAddCaretakerModalBtn');
  const closeAddModalBtn = document.getElementById('closeAddModalBtn');
  const cancelAddBtn = document.getElementById('cancelAddBtn');
  const addCaretakerForm = document.getElementById('addCaretakerForm');

  // Photo Viewer Modal
  const photoViewerModal = document.getElementById('photoViewerModal');
  const closePhotoViewerBtn = document.getElementById('closePhotoViewerBtn');
  const closePvBtn2 = document.getElementById('closePvBtn2');
  const pvImage = document.getElementById('pvImage');
  const pvTreeId = document.getElementById('pvTreeId');
  const pvCategory = document.getElementById('pvCategory');
  const pvTimestamp = document.getElementById('pvTimestamp');
  const pvGps = document.getElementById('pvGps');
  const pvNotes = document.getElementById('pvNotes');
  const pvUploader = document.getElementById('pvUploader');
  const pvTitle = document.getElementById('pvTitle');

  // Sublist Modal Elements
  const subListModal = document.getElementById('subListModal');
  const subListTitle = document.getElementById('subListTitle');
  const subListBody = document.getElementById('subListBody');
  const closeSubListModalBtn = document.getElementById('closeSubListModalBtn');
  const closeSubListBtn2 = document.getElementById('closeSubListBtn2');

  // Action Prompt Modal Elements
  const actionPromptModal = document.getElementById('actionPromptModal');
  const actionModalTitle = document.getElementById('actionModalTitle');
  const actionModalBody = document.getElementById('actionModalBody');
  const closeActionModalBtn = document.getElementById('closeActionModalBtn');
  const cancelActionBtn = document.getElementById('cancelActionBtn');
  const confirmActionBtn = document.getElementById('confirmActionBtn');
  let currentActionCallback = null;

  // Profile Buttons
  const profMoreDropdown = document.getElementById('profMoreDropdown');
  const profMoreBtn = document.getElementById('profMoreBtn');
  const btnViewAssignedTrees = document.getElementById('btnViewAssignedTrees');
  const btnViewMonitoringHistory = document.getElementById('btnViewMonitoringHistory');
  const btnViewOnTreeMap = document.getElementById('btnViewOnTreeMap');
  const btnViewFullSchedule = document.getElementById('btnViewFullSchedule');
  const btnViewCriticalTrees = document.getElementById('btnViewCriticalTrees');

  // Admin Action Buttons inside Profile
  const profEditBtn = document.getElementById('profEditBtn');
  const profManageTreesBtn = document.getElementById('profManageTreesBtn');
  const profManageScheduleBtn = document.getElementById('profManageScheduleBtn');
  const profViewMapBtn = document.getElementById('profViewMapBtn');
  const profViewPerfBtn = document.getElementById('profViewPerfBtn');
  const profMessageBtn = document.getElementById('profMessageBtn');
  const profResetPassBtn = document.getElementById('profResetPassBtn');
  const dropdownTransferTreesBtn = document.getElementById('dropdownTransferTreesBtn');
  const dropdownReassignAreaBtn = document.getElementById('dropdownReassignAreaBtn');
  const dropdownActivityLogBtn = document.getElementById('dropdownActivityLogBtn');
  const dropdownToggleStatusBtn = document.getElementById('dropdownToggleStatusBtn');

  // Top Actions
  const importCaretakersBtn = document.getElementById('importCaretakersBtn');
  const exportCaretakersBtn = document.getElementById('exportCaretakersBtn');

  // Toast Helper
  const showToast = (message, type = 'success') => {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // Update Overview Cards
  const updateOverviewCards = () => {
    const total = caretakersList.length;
    const active = caretakersList.filter(c => c.status === 'Active').length;
    const inactive = total - active;
    const assignedTrees = caretakersList.reduce((sum, c) => sum + (c.assignedTrees || 0), 0);
    const completed = caretakersList.reduce((sum, c) => sum + (c.completedMonitoring || 0), 0);
    const overdue = caretakersList.reduce((sum, c) => sum + (c.overdueMonitoring || 0), 0);

    cardTotalCaretakers.textContent = total;
    cardActiveCaretakers.textContent = active;
    cardInactiveCaretakers.textContent = inactive;
    cardAssignedTrees.textContent = assignedTrees.toLocaleString();
    cardMonitoringCompleted.textContent = completed.toLocaleString();
    cardOverdueMonitoring.textContent = overdue.toLocaleString();
  };

  // Render Main Caretaker Table
  const renderTable = () => {
    const query = (searchInput.value || '').trim().toLowerCase();
    const statusVal = filterStatus.value;
    const areaVal = filterArea.value;
    const countVal = filterTreeCount.value;
    const monVal = filterMonitoringStatus.value;

    const filtered = caretakersList.filter(ct => {
      // Search
      const matchSearch = !query ||
        ct.name.toLowerCase().includes(query) ||
        ct.empId.toLowerCase().includes(query) ||
        ct.primaryArea.toLowerCase().includes(query) ||
        ct.email.toLowerCase().includes(query) ||
        (ct.assignedBarangays && ct.assignedBarangays.some(b => b.toLowerCase().includes(query)));

      if (!matchSearch) return false;

      // Status
      if (statusVal !== 'ALL' && ct.status !== statusVal) return false;

      // Area
      if (areaVal !== 'ALL') {
        const hasArea = ct.primaryArea === areaVal || (ct.assignedBarangays && ct.assignedBarangays.includes(areaVal));
        if (!hasArea) return false;
      }

      // Tree Count
      if (countVal !== 'ALL') {
        const trees = ct.assignedTrees || 0;
        if (countVal === '1-100' && (trees < 1 || trees > 100)) return false;
        if (countVal === '101-300' && (trees < 101 || trees > 300)) return false;
        if (countVal === '301-500' && (trees < 301 || trees > 500)) return false;
        if (countVal === '500+' && trees < 500) return false;
      }

      // Monitoring Status
      if (monVal !== 'ALL') {
        if (monVal === 'high' && ct.completionRate < 90) return false;
        if (monVal === 'normal' && (ct.completionRate < 75 || ct.completionRate >= 90)) return false;
        if (monVal === 'attention' && ct.completionRate >= 75) return false;
        if (monVal === 'overdue' && (ct.overdueMonitoring || 0) === 0) return false;
      }

      return true;
    });

    tableCountBadge.textContent = `Showing ${filtered.length} caretaker${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
      caretakersTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 48px 20px; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">👤</div>
            <p style="font-weight: 700; font-size: 1rem; margin-bottom: 6px;">No caretakers registered yet.</p>
            <p style="font-size: 0.82rem; margin-top: 4px;">Click <strong>+ Add Caretaker</strong> above to add your first caretaker.</p>
          </td>
        </tr>
      `;
      return;
    }

    caretakersTbody.innerHTML = filtered.map(ct => {
      const initials = (ct.name || 'CT').split(' ').map(n => n[0]).join('').substring(0, 2);
      const isInactive = ct.status === 'Inactive';
      const healthy = ct.treesCondition?.healthy || 0;
      const critical = ct.treesCondition?.critical || 0;
      const pending = ct.pendingMonitoring || 0;
      const areaDisplay = (ct.primaryArea && String(ct.primaryArea) !== 'undefined') ? ct.primaryArea : (ct.barangay || ct.location || ct.address || 'Catbalogan City');
      const phoneDisplay = (ct.phone && String(ct.phone) !== 'undefined') ? ct.phone : '—';

      return `
        <tr>
          <td>
            <div class="ct-profile-cell">
              <div class="ct-avatar ${isInactive ? 'inactive' : ''}">${initials}</div>
              <div class="ct-info-meta">
                <button class="ct-name-btn" data-id="${ct.id}">${ct.name}</button>
                <span class="ct-sub-loc">${areaDisplay} • ${ct.assignedTreeType || 'Native Hardwood'} • ${phoneDisplay}</span>
              </div>
            </div>
          </td>
          <td><span class="id-badge">${ct.empId}</span></td>
          <td class="text-right"><span class="trees-count-badge">${(ct.assignedTrees || 0).toLocaleString()}</span></td>
          <td class="text-right"><span class="stat-pill healthy">🟢 ${healthy.toLocaleString()}</span></td>
          <td class="text-right"><span class="stat-pill critical">🔴 ${critical.toLocaleString()}</span></td>
          <td class="text-right"><span class="stat-pill pending">🟡 ${pending.toLocaleString()}</span></td>
          <td>
            <span class="status-badge ${isInactive ? 'inactive' : 'active'}">
              ${isInactive ? '⚪ Inactive' : '🟢 Active'}
            </span>
          </td>
          <td class="text-center">
            <div style="display:inline-flex; align-items:center; gap:6px; justify-content:center;">
              <button class="btn btn-outline btn-sm view-profile-btn" data-id="${ct.id}" type="button">
                View
              </button>
              <button class="btn btn-outline btn-sm delete-caretaker-btn" data-id="${ct.id}" title="Delete Caretaker" type="button"
                style="color:#dc2626; border-color:#fecaca; padding:4px 8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer;"
                onmouseover="this.style.backgroundColor='#fee2e2'" onmouseout="this.style.backgroundColor='transparent'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
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

    // Attach row view click handlers
    document.querySelectorAll('.view-profile-btn, .ct-name-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const target = caretakersList.find(c => c.id === id);
        if (target) {
          openCaretakerProfile(target);
        }
      });
    });

    // Attach row delete click handlers
    document.querySelectorAll('.delete-caretaker-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        confirmDeleteCaretaker(id);
      });
    });
  };

  // Open & Populate Profile Modal
  const openCaretakerProfile = (ct) => {
    currentCaretaker = ct;

    const initials = ct.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    document.getElementById('profAvatar').textContent = initials;
    document.getElementById('profName').textContent = ct.name;
    document.getElementById('profEmpIdBadge').textContent = `ID: ${ct.empId}`;
    document.getElementById('profAreaBadge').textContent = `📍 ${ct.primaryArea}`;

    const isInactive = ct.status === 'Inactive';
    const statusBadge = document.getElementById('profStatusBadge');
    statusBadge.textContent = isInactive ? '⚪ INACTIVE' : '🟢 ACTIVE';
    statusBadge.className = isInactive ? 'profile-pill-badge' : 'profile-pill-badge active-badge';

    // Personal / Account Info
    document.getElementById('profFullName').textContent = ct.name;
    document.getElementById('profEmpId').textContent = ct.empId;
    document.getElementById('profEmail').textContent = ct.email;
    document.getElementById('profPhone').textContent = ct.phone;
    document.getElementById('profAssignedArea').textContent = ct.primaryArea;
    document.getElementById('profDateJoined').textContent = ct.dateJoined;
    document.getElementById('profAccountStatus').innerHTML = isInactive ? '<span style="color:#64748b;">⚪ Inactive</span>' : '<span style="color:#16a34a;">🟢 Active</span>';

    // Dropdown toggle button text
    dropdownToggleStatusBtn.textContent = isInactive ? '🟢 Activate Account' : '🚫 Deactivate Account';

    // 6. Assignment Summary
    const totalTrees = ct.assignedTrees || 0;
    document.getElementById('profTotalTreesHeader').textContent = `${totalTrees.toLocaleString()} Trees Total`;
    document.getElementById('profProjectsCount').textContent = `${(ct.assignedProjects || []).length} Projects • ${(ct.assignedFarms || []).length} Sites`;

    const h = ct.treesCondition?.healthy || 0;
    const c = ct.treesCondition?.care || 0;
    const cr = ct.treesCondition?.critical || 0;
    const d = ct.treesCondition?.dead || 0;

    document.getElementById('profHealthyCount').textContent = h.toLocaleString();
    document.getElementById('profCareCount').textContent = c.toLocaleString();
    document.getElementById('profCriticalCount').textContent = cr.toLocaleString();
    document.getElementById('profDeadCount').textContent = d.toLocaleString();

    if (totalTrees > 0) {
      document.getElementById('tsBarHealthy').style.width = `${(h / totalTrees) * 100}%`;
      document.getElementById('tsBarCare').style.width = `${(c / totalTrees) * 100}%`;
      document.getElementById('tsBarCritical').style.width = `${(cr / totalTrees) * 100}%`;
      document.getElementById('tsBarDead').style.width = `${(d / totalTrees) * 100}%`;
    } else {
      document.getElementById('tsBarHealthy').style.width = '0%';
      document.getElementById('tsBarCare').style.width = '0%';
      document.getElementById('tsBarCritical').style.width = '0%';
      document.getElementById('tsBarDead').style.width = '0%';
    }

    document.getElementById('profAssignedBarangays').textContent = (ct.assignedBarangays || ['None']).join(', ');
    const profTreeType = document.getElementById('profAssignedTreeType');
    if (profTreeType) profTreeType.textContent = ct.assignedTreeType || 'Native Hardwood';
    document.getElementById('profAssignedProjects').textContent = (ct.assignedProjects || ['None']).join(', ');
    document.getElementById('profAssignedFarms').textContent = (ct.assignedFarms || ['None']).join(', ');

    // 7. Monitoring Performance
    const rate = ct.completionRate || 0;
    document.getElementById('profCompletionRateBadge').textContent = `${rate}% Completion`;
    document.getElementById('profCompletionBarFill').style.width = `${rate}%`;
    document.getElementById('profCompletionBarFill').textContent = `${rate}%`;

    document.getElementById('profCompletedCount').textContent = (ct.completedMonitoring || 0).toLocaleString();
    document.getElementById('profPendingCount').textContent = (ct.pendingMonitoring || 0).toLocaleString();
    document.getElementById('profOverdueCount').textContent = (ct.overdueMonitoring || 0).toLocaleString();

    document.getElementById('profWeeklyAvg').textContent = ct.avgWeeklyMonitored || 0;
    document.getElementById('profMonthTrees').textContent = (ct.monitoredThisMonth || 0).toLocaleString();
    document.getElementById('profOnTimeRate').textContent = `${ct.onTimeRate || 0}%`;
    document.getElementById('profPhotosCount').textContent = (ct.photosUploaded || 0).toLocaleString();
    document.getElementById('profMaintLogsCount').textContent = (ct.maintenanceRecords || 0).toLocaleString();

    // 8. Recent Activity List
    const activityList = document.getElementById('profActivityList');
    if (ct.recentActivity && ct.recentActivity.length > 0) {
      activityList.innerHTML = ct.recentActivity.map(act => `
        <div class="activity-item">
          <span class="activity-date-pill">${act.date}</span>
          <div class="activity-content">
            <div class="activity-title-line">
              <span>📷 ${act.treeId}</span>
              <span class="stat-pill ${act.health === 'Healthy' ? 'healthy' : act.health === 'Critical' ? 'critical' : 'care'}">
                ${act.health}
              </span>
              <span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">📍 ${act.location}</span>
            </div>
            <div class="activity-desc">${act.action}</div>
          </div>
        </div>
      `).join('');
    } else {
      activityList.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; padding:8px;">No recent monitoring activity logged.</div>`;
    }

    // 9. Assigned Areas List
    const areasList = document.getElementById('profAreasList');
    if (ct.areaBreakdown && ct.areaBreakdown.length > 0) {
      areasList.innerHTML = ct.areaBreakdown.map(ar => `
        <div class="area-bar-item">
          <div class="abi-meta">
            <span>${ar.area}</span>
            <span><strong>${ar.count} trees</strong> (${ar.percent}%)</span>
          </div>
          <div class="abi-track">
            <div class="abi-fill" style="width: ${ar.percent}%;"></div>
          </div>
        </div>
      `).join('');
    } else {
      areasList.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; padding:8px;">No specific area assignments recorded.</div>`;
    }

    // 10. Monitoring Schedule
    updateProfileScheduleTable(ct);

    // 11. Critical Trees
    const critList = document.getElementById('profCriticalTreesList');
    const critCount = (ct.criticalTrees || []).length;
    document.getElementById('profCritBadge').textContent = critCount;
    if (critCount > 0) {
      critList.innerHTML = ct.criticalTrees.map(crTree => `
        <div class="crit-tree-row">
          <div class="crit-tree-info">
            <span class="crit-tree-id">${crTree.id}</span>
            <span class="crit-tree-issue">${crTree.issue}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.72rem; color:var(--text-muted);">${crTree.lastCheck}</span>
            <span class="stat-pill critical">${crTree.priority}</span>
          </div>
        </div>
      `).join('');
    } else {
      critList.innerHTML = `<div style="color:#16a34a; font-size:0.8rem; padding:8px; font-weight:600;">✅ No critical trees assigned. All trees in healthy/fair condition.</div>`;
    }

    // 12. Maintenance Activity
    document.getElementById('maintWatering').textContent = `${ct.maintenance?.watering || 0} trees`;
    document.getElementById('maintFert').textContent = `${ct.maintenance?.fert || 0} trees`;
    document.getElementById('maintPest').textContent = `${ct.maintenance?.pest || 0} trees`;
    document.getElementById('maintWeed').textContent = `${ct.maintenance?.weed || 0} trees`;
    document.getElementById('maintPrune').textContent = `${ct.maintenance?.prune || 0} trees`;

    const recentLogBox = document.getElementById('profRecentMaintLog');
    if (ct.maintenance?.recentLog) {
      const rl = ct.maintenance.recentLog;
      recentLogBox.innerHTML = `
        <strong>${rl.treeId} — ${rl.type}</strong>
        <span>${rl.desc}</span>
        <span style="color:var(--text-muted); font-size:0.72rem;">${rl.date} • Result: ${rl.result}</span>
      `;
    } else {
      recentLogBox.innerHTML = `<span>No recent maintenance events recorded.</span>`;
    }

    // 13. Photos Uploaded Gallery
    const photoGallery = document.getElementById('profPhotoGallery');
    if (ct.photos && ct.photos.length > 0) {
      photoGallery.innerHTML = ct.photos.map((ph, idx) => `
        <div class="photo-thumb-card" data-idx="${idx}">
          <img src="${ph.img}" alt="${ph.tag}" class="photo-thumb-img" />
          <span class="photo-thumb-tag">${ph.tag}</span>
        </div>
      `).join('');

      photoGallery.querySelectorAll('.photo-thumb-card').forEach(card => {
        card.addEventListener('click', () => {
          const idx = parseInt(card.getAttribute('data-idx'));
          const pData = ct.photos[idx];
          openPhotoViewer(pData, ct);
        });
      });
    } else {
      photoGallery.innerHTML = `<div style="grid-column:1/-1; color:var(--text-muted); font-size:0.8rem; padding:12px;">No field photo uploads available for this caretaker.</div>`;
    }

    // Open Modal
    caretakerProfileModal.classList.remove('hidden');
  };

  // Close Profile Modal
  const closeProfileModal = () => {
    caretakerProfileModal.classList.add('hidden');
    profMoreDropdown.classList.remove('open');
  };

  closeProfileModalBtn.addEventListener('click', closeProfileModal);
  footerCloseProfileBtn.addEventListener('click', closeProfileModal);

  // Photo Viewer Modal
  const openPhotoViewer = (photoData, caretaker) => {
    pvTitle.textContent = `📷 ${photoData.treeId} Inspection Photo`;
    pvImage.src = photoData.img;
    pvTreeId.textContent = photoData.treeId;
    pvCategory.textContent = photoData.tag;
    pvTimestamp.textContent = photoData.date;
    pvGps.textContent = photoData.gps || '14.0722° N, 121.3289° E';
    pvNotes.textContent = photoData.notes || 'Inspection details captured during field monitoring.';
    pvUploader.textContent = `${caretaker.name} (${caretaker.empId})`;
    photoViewerModal.classList.remove('hidden');
  };

  closePhotoViewerBtn.addEventListener('click', () => photoViewerModal.classList.add('hidden'));
  closePvBtn2.addEventListener('click', () => photoViewerModal.classList.add('hidden'));

  // Toggle More Dropdown inside Profile
  profMoreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profMoreDropdown.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!profMoreDropdown.contains(e.target)) {
      profMoreDropdown.classList.remove('open');
    }
  });

  // Action Modal Helper
  const openActionPrompt = (title, bodyHtml, confirmLabel, onConfirm) => {
    actionModalTitle.innerHTML = title;
    actionModalBody.innerHTML = bodyHtml;
    confirmActionBtn.textContent = confirmLabel || 'Confirm';
    currentActionCallback = onConfirm;
    actionPromptModal.classList.remove('hidden');
  };

  const resetActionBtnStyle = () => {
    confirmActionBtn.style.backgroundColor = '';
    confirmActionBtn.style.borderColor = '';
  };

  closeActionModalBtn.addEventListener('click', () => {
    actionPromptModal.classList.add('hidden');
    resetActionBtnStyle();
  });
  cancelActionBtn.addEventListener('click', () => {
    actionPromptModal.classList.add('hidden');
    resetActionBtnStyle();
  });
  confirmActionBtn.addEventListener('click', () => {
    if (currentActionCallback) {
      currentActionCallback();
    }
    actionPromptModal.classList.add('hidden');
    resetActionBtnStyle();
  });

  const confirmDeleteCaretaker = (id) => {
    const ct = caretakersList.find(c => c.id === id);
    if (!ct) return;

    openActionPrompt(
      `<span style="color:#b91c1c;">🗑️ Delete Caretaker — ${ct.name}</span>`,
      `
        <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:14px; font-size:13.5px; color:#7f1d1d; line-height:1.5;">
          ⚠️ Are you sure you want to permanently delete caretaker <strong>${ct.name}</strong> (${ct.empId})?
          <p style="margin-top:8px; font-size:12px; color:#991b1b;">This action will unassign all their assigned trees and cannot be undone.</p>
        </div>
      `,
      '🗑️ Delete Caretaker',
      () => {
        caretakersList = caretakersList.filter(c => c.id !== id);
        try {
          localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakersList));
        } catch(e) {}
        renderTable();
        updateOverviewCards();
        showToast(`Caretaker ${ct.name} deleted successfully!`, 'success');
      }
    );
    if (confirmActionBtn) {
      confirmActionBtn.style.backgroundColor = '#ef4444';
      confirmActionBtn.style.borderColor = '#dc2626';
    }
  };

  // Sublist Modal Helpers
  const openSubList = (title, contentHtml) => {
    subListTitle.innerHTML = title;
    subListBody.innerHTML = contentHtml;
    subListModal.classList.remove('hidden');
  };

  closeSubListModalBtn.addEventListener('click', () => subListModal.classList.add('hidden'));
  closeSubListBtn2.addEventListener('click', () => subListModal.classList.add('hidden'));

  // Real-time dynamic date helpers
  const getRealtimeDate = (daysAgo = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const getRealtimeDateTime = (daysAgo = 0, hoursAgo = 0, minutesAgo = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(d.getHours() - hoursAgo);
    d.setMinutes(d.getMinutes() - minutesAgo);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr} ${timeStr}`;
  };

  const getRealtimeIso = (daysAgo = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  // Section 6: [View My Assigned Trees]
  btnViewAssignedTrees.addEventListener('click', () => {
    const ct = currentCaretaker;
    if (!ct) return;

    // Load actual cached trees
    let allTrees = [];
    try {
      allTrees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
      if (!Array.isArray(allTrees)) allTrees = [];
    } catch (e) {
      allTrees = [];
    }

    const ctName = (ct.name || '').toLowerCase().trim();
    const ctId = (ct.empId || '').toLowerCase().trim();
    const ctArea = (ct.primaryArea || 'Guinsorongan').trim();

    // 1. Direct matches by caretaker name or employee ID
    let matchedTrees = allTrees.filter(t => {
      const c = (t.caretaker || '').toLowerCase().trim();
      return (ctName && c.includes(ctName)) || (ctId && c.includes(ctId));
    });

    // 2. Fallback to trees in primary area or assigned barangays
    if (matchedTrees.length === 0) {
      matchedTrees = allTrees.filter(t => {
        const b = (t.barangay || '').toLowerCase().trim();
        return b === ctArea.toLowerCase();
      });
    }

    const defaultSpecies = [
      'Narra (Pterocarpus indicus)',
      'Mahogany (Swietenia macrophylla)',
      'Acacia mangium',
      'Banaba (Lagerstroemia speciosa)',
      'Molave (Vitex parviflora)',
      'Yakal (Shorea astylosa)',
      'Dao (Dracontomelon dao)',
      'Kamagong (Diospyros blancoi)',
      'Teak (Tectona grandis)',
      'Langka (Artocarpus heterophyllus)',
      'Ipil-ipil (Leucaena leucocephala)'
    ];

    const targetCount = Math.max(1, ct.assignedTrees || matchedTrees.length || 10);
    const treeRows = [];

    // Helper to format or compute a real-time checked date
    const getCheckedDate = (dateVal, index) => {
      const offsets = [0, 1, 2, 3, 5, 6, 8, 9, 11, 14, 16, 18];
      const offset = offsets[index % offsets.length];
      if (!dateVal) return getRealtimeDate(offset);
      const parsed = new Date(dateVal);
      if (isNaN(parsed.getTime())) return getRealtimeDate(offset);
      const diffDays = Math.floor((new Date() - parsed) / (1000 * 60 * 60 * 24));
      // Only keep parsed date if it is recent (within 14 days)
      if (diffDays >= 0 && diffDays <= 14) {
        return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      }
      return getRealtimeDate(offset);
    };

    // Populate from matched actual trees first
    matchedTrees.slice(0, targetCount).forEach((t, i) => {
      let spec = 'Narra (Pterocarpus indicus)';
      if (typeof t.species === 'object' && t.species) {
        spec = `${t.species.common || 'Native'} ${t.species.scientific ? `(${t.species.scientific})` : ''}`.trim();
      } else if (typeof t.species === 'string' && t.species) {
        spec = t.species;
      }

      let health = 'Healthy';
      const st = (t.status || '').toLowerCase();
      if (st === 'critical') health = 'Critical';
      else if (st === 'needs-care' || st === 'needs care') health = 'Needs Care';

      treeRows.push({
        id: t.id || `TR-${10021 + i}`,
        species: spec,
        loc: t.barangay || ctArea,
        h: health,
        date: getCheckedDate(t.lastCheck || t.dateAdded, i)
      });
    });

    // Render a fresh modal — helper so delete can re-render in place
    const renderAssignedTreesModal = () => {
      // Re-read live cache each render
      let liveTrees = [];
      try {
        liveTrees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
        if (!Array.isArray(liveTrees)) liveTrees = [];
      } catch (e) { liveTrees = []; }

      const liveRows = liveTrees
        .filter(t => {
          const c = (t.caretaker || '').toLowerCase().trim();
          return (ctName && c.includes(ctName)) || (ctId && c.includes(ctId));
        })
        .map((t, i) => {
          let spec = 'Unknown';
          if (typeof t.species === 'object' && t.species) {
            spec = `${t.species.common || 'Native'} ${t.species.scientific ? `(${t.species.scientific})` : ''}`.trim();
          } else if (typeof t.species === 'string' && t.species) {
            spec = t.species;
          }
          let health = 'Healthy';
          const st = (t.status || '').toLowerCase();
          if (st === 'critical') health = 'Critical';
          else if (st === 'needs-care' || st === 'needs care') health = 'Needs Care';
          return {
            id: t.id || `TR-${10021 + i}`,
            treeId: t.id,
            species: spec,
            loc: t.barangay || ctArea,
            h: health,
            date: getCheckedDate(t.lastCheck || t.dateAdded, i)
          };
        });

      const emptyState = liveRows.length === 0
        ? `<div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
            <div style="font-size:2.5rem; margin-bottom:12px;">🌿</div>
            <div style="font-weight:600; margin-bottom:6px;">No Assigned Trees</div>
            <div style="font-size:0.85rem;">This caretaker has no trees assigned yet. Use the Trees Directory to assign trees.</div>
           </div>`
        : '';

      const html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span style="font-size:0.9rem; color:var(--text-muted);">Showing assigned trees for <strong>${ct.name} (${ct.empId})</strong></span>
          <a href="admin-trees.html" class="btn btn-outline btn-sm">Open in Trees Directory ↗</a>
        </div>
        ${emptyState}
        ${liveRows.length > 0 ? `
        <div class="table-responsive">
          <table class="caretakers-table">
            <thead>
              <tr>
                <th>Tree ID</th>
                <th>Species</th>
                <th>Barangay / Site</th>
                <th>Health Status</th>
                <th>Last Checked</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              ${liveRows.map(t => `
                <tr data-tree-id="${t.treeId}">
                  <td><span class="id-badge">${t.id}</span></td>
                  <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <strong>${t.species}</strong>
                      <button
                        class="btn-unassign-tree"
                        data-id="${t.treeId}"
                        title="Unassign this tree from caretaker"
                        style="background:none; border:none; cursor:pointer; color:#e53935; font-size:1rem; padding:2px 4px; border-radius:4px; line-height:1; flex-shrink:0;"
                        onmouseover="this.style.background='#fdecea'" onmouseout="this.style.background='none'"
                      >🗑</button>
                    </div>
                  </td>
                  <td>${t.loc}</td>
                  <td>
                    <span class="stat-pill ${t.h === 'Healthy' ? 'healthy' : t.h === 'Critical' ? 'critical' : 'care'}">
                      ${t.h === 'Healthy' ? '🟢' : t.h === 'Critical' ? '🔴' : '🟡'} ${t.h}
                    </span>
                  </td>
                  <td>${t.date}</td>
                  <td class="text-center">
                    <a href="admin-tree-map.html" class="btn btn-outline btn-sm">View on Map</a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : ''}
      `;

      // Render into sub-modal
      openSubList(`🌳 Assigned Trees (${liveRows.length} Total)`, html);

      // Bind delete buttons after modal renders
      setTimeout(() => {
        document.querySelectorAll('.btn-unassign-tree').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tId = btn.getAttribute('data-id');
            if (!tId) return;
            if (!confirm(`Unassign this tree (${tId}) from ${ct.name}?`)) return;
            try {
              let cache = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
              cache = cache.map(tr => {
                if (String(tr.id) === String(tId)) {
                  const updated = { ...tr };
                  delete updated.caretaker;
                  updated.caretakerName = '';
                  return updated;
                }
                return tr;
              });
              localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(cache));
            } catch (ex) {
              console.error('[ATAMAN] Failed to unassign tree:', ex);
            }
            // Re-render the modal with updated data
            renderAssignedTreesModal();
          });
        });
      }, 0);
    };

    renderAssignedTreesModal();
  });

  // Section 8: [View Monitoring History]
  btnViewMonitoringHistory.addEventListener('click', () => {
    const ct = currentCaretaker;
    if (!ct) return;

    const historyLogs = Array.isArray(ct.monitoringHistory) ? ct.monitoringHistory : [];

    const html = historyLogs.length === 0
      ? `<div style="padding:32px;text-align:center;color:#64748b;font-size:0.9rem;">No monitoring logs recorded yet for ${ct.name}.</div>`
      : `
      <div class="table-responsive">
        <table class="caretakers-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Tree ID</th>
              <th>Location</th>
              <th>Field Notes</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${historyLogs.map(log => `
              <tr>
                <td style="white-space:nowrap; font-weight:600;">${log.date}</td>
                <td><span class="id-badge">${log.treeId}</span></td>
                <td>${log.loc}</td>
                <td>${log.notes}</td>
                <td>
                  <span class="stat-pill ${log.status === 'Healthy' ? 'healthy' : log.status === 'Critical' ? 'critical' : 'care'}">
                    ${log.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    openSubList(`⏱️ Monitoring History — ${ct.name}`, html);
  });

  // Section 9: [View on Tree Map]
  const handleViewOnTreeMap = () => {
    const ct = currentCaretaker;
    showToast(`Redirecting to Tree Map filtered for ${ct.name}'s assigned trees...`, 'info');
    setTimeout(() => {
      window.location.href = `admin-tree-map.html?caretaker=${encodeURIComponent(ct.empId)}`;
    }, 800);
  };
  btnViewOnTreeMap.addEventListener('click', handleViewOnTreeMap);
  profViewMapBtn.addEventListener('click', handleViewOnTreeMap);

  // Persistent save helper for caretakers
  const saveCaretakers = () => {
    try {
      localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakersList));
      if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyCaretakers === 'function') {
        window.ATAMAN_SYNC.notifyCaretakers(caretakersList);
      }
      if (window.ATAMAN_DB && typeof window.ATAMAN_DB.updateCaretaker === 'function' && currentCaretaker) {
        window.ATAMAN_DB.updateCaretaker(currentCaretaker.id, currentCaretaker);
      }
    } catch (e) {}
  };

  // Helper to update mini-schedule table inside Profile Modal
  const updateProfileScheduleTable = (ct) => {
    const scheduleTbody = document.getElementById('profScheduleTbody');
    if (!scheduleTbody) return;
    if (ct && Array.isArray(ct.schedule) && ct.schedule.length > 0) {
      scheduleTbody.innerHTML = ct.schedule.map(sc => `
        <tr>
          <td style="font-weight:700;">${sc.date}</td>
          <td>${sc.location || sc.loc || ct.primaryArea || 'Guinsorongan'}</td>
          <td class="text-right"><strong>${sc.target || sc.count || 0}</strong></td>
          <td><span style="font-weight:700; font-size:0.75rem;">${sc.st || sc.status || 'Scheduled'}</span></td>
        </tr>
      `).join('');
    } else {
      scheduleTbody.innerHTML = `<tr><td colspan="4" style="color:var(--text-muted); text-align:center; padding:12px;">No scheduled visits. Click "Full Schedule" to add.</td></tr>`;
    }
  };

  // Section 10: [View Full Schedule]
  const handleViewSchedule = () => {
    const ct = currentCaretaker;
    if (!ct) return;
    if (!Array.isArray(ct.schedule)) ct.schedule = [];
    const loc = ct.primaryArea || 'Guinsorongan';

    const renderScheduleContent = () => {
      const scheduleList = ct.schedule || [];
      const html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
          <div>
            <span style="font-size:0.95rem;">Field Monitoring Schedule for <strong>${ct.name}</strong></span>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
              ${scheduleList.length} ${scheduleList.length === 1 ? 'visit' : 'visits'} scheduled
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-primary btn-sm" id="subBtnAddVisit" type="button">+ Add Field Visit</button>
            ${scheduleList.length > 0 ? `
              <button class="btn btn-outline btn-sm" id="subBtnClearAllSchedule" type="button" style="color:#dc2626; border-color:#fca5a5;">
                🗑️ Clear All
              </button>
            ` : ''}
          </div>
        </div>
        <div class="table-responsive">
          <table class="caretakers-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Barangay / Site</th>
                <th>Plot Details</th>
                <th class="text-right">Target Trees</th>
                <th>Status</th>
                <th class="text-center" style="width:90px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${scheduleList.length > 0 ? scheduleList.map((s, idx) => `
                <tr>
                  <td style="font-weight:700;">${s.date}</td>
                  <td>${s.loc || s.location || loc}</td>
                  <td>${s.plot || 'General Sector'}</td>
                  <td class="text-right"><strong>${s.target || s.count || 0}</strong></td>
                  <td><span style="font-weight:700; font-size:0.8rem;">${s.st || s.status || 'Scheduled'}</span></td>
                  <td class="text-center">
                    <button class="btn btn-outline btn-sm btn-del-sched" data-idx="${idx}" type="button" title="Delete visit" style="padding:2px 8px; color:#dc2626; border-color:#fca5a5;">
                      🗑️
                    </button>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="6" style="text-align:center; padding:38px 16px; color:var(--text-muted);">
                    <div style="font-size:2.2rem; margin-bottom:8px;">📅</div>
                    <div style="font-weight:700; font-size:1rem; color:var(--text-main); margin-bottom:6px;">All Schedules Cleared</div>
                    <div style="font-size:0.86rem; max-width:440px; margin:0 auto 14px; line-height:1.5;">
                      No field monitoring visits scheduled yet. Click <strong>"+ Add Field Visit"</strong> to put an updated schedule monitor.
                    </div>
                    <button class="btn btn-primary btn-sm" id="emptyBtnAddVisit" type="button">+ Add Field Visit</button>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      `;

      openSubList(`📅 Full Monitoring Schedule — ${ct.name}`, html);

      setTimeout(() => {
        const attachAddHandler = (btn) => {
          if (!btn) return;
          btn.addEventListener('click', () => {
            subListModal.classList.add('hidden');
            openActionPrompt(
              `📅 Add Field Visit for ${ct.name}`,
              `
                <div class="form-group" style="margin-bottom:12px;">
                  <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px;">Date</label>
                  <input type="date" id="inputVisitDate" value="${getRealtimeIso(0)}" class="form-control" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px;" required />
                </div>
                <div class="form-group" style="margin-bottom:12px;">
                  <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px;">Barangay / Site</label>
                  <input type="text" id="inputVisitLoc" value="${loc}" placeholder="e.g. ${loc}" class="form-control" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px;" required />
                </div>
                <div class="form-group" style="margin-bottom:12px;">
                  <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px;">Plot / Sector Details</label>
                  <input type="text" id="inputVisitPlot" placeholder="e.g. Plot 4-A, Sector 2, East Bank" class="form-control" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px;" required />
                </div>
                <div class="form-group" style="margin-bottom:12px;">
                  <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px;">Target Tree Count</label>
                  <input type="number" id="inputVisitTarget" value="15" min="1" class="form-control" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px;" required />
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                  <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px;">Monitoring Status</label>
                  <select id="inputVisitStatus" class="form-control" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px;">
                    <option value="🔴 Due Today">🔴 Due Today</option>
                    <option value="🟡 Tomorrow">🟡 Tomorrow</option>
                    <option value="Scheduled" selected>Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              `,
              'Schedule Visit',
              () => {
                const dateVal = document.getElementById('inputVisitDate')?.value;
                const locVal = document.getElementById('inputVisitLoc')?.value.trim() || loc;
                const plotVal = document.getElementById('inputVisitPlot')?.value.trim() || 'Sector 1';
                const targetVal = parseInt(document.getElementById('inputVisitTarget')?.value, 10) || 10;
                const statusVal = document.getElementById('inputVisitStatus')?.value || 'Scheduled';

                let displayDate = getRealtimeDate(0);
                if (dateVal) {
                  const parts = dateVal.split('-');
                  if (parts.length === 3) {
                    const d = new Date(parts[0], parts[1] - 1, parts[2]);
                    displayDate = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                  }
                }

                const newVisit = {
                  id: 'SCH-' + Date.now().toString().slice(-6),
                  date: displayDate,
                  rawDate: dateVal,
                  loc: locVal,
                  location: locVal,
                  plot: plotVal,
                  target: targetVal,
                  count: targetVal,
                  st: statusVal,
                  status: statusVal
                };

                if (!Array.isArray(ct.schedule)) ct.schedule = [];
                ct.schedule.push(newVisit);

                saveCaretakers();
                updateProfileScheduleTable(ct);
                renderScheduleContent();
                showToast(`Field visit scheduled for ${ct.name}!`, 'success');
              }
            );
          });
        };

        attachAddHandler(document.getElementById('subBtnAddVisit'));
        attachAddHandler(document.getElementById('emptyBtnAddVisit'));

        // Clear All Schedule handler
        const clearAllBtn = document.getElementById('subBtnClearAllSchedule');
        if (clearAllBtn) {
          clearAllBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to clear all scheduled monitoring visits for ${ct.name}?`)) {
              ct.schedule = [];
              saveCaretakers();
              updateProfileScheduleTable(ct);
              renderScheduleContent();
              showToast(`All schedule visits cleared for ${ct.name}.`, 'info');
            }
          });
        }

        // Delete single visit handler
        document.querySelectorAll('.btn-del-sched').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            if (!isNaN(idx) && ct.schedule && ct.schedule[idx]) {
              ct.schedule.splice(idx, 1);
              saveCaretakers();
              updateProfileScheduleTable(ct);
              renderScheduleContent();
              showToast('Schedule visit removed.', 'info');
            }
          });
        });
      }, 80);
    };

    renderScheduleContent();
  };
  btnViewFullSchedule.addEventListener('click', handleViewSchedule);
  profManageScheduleBtn.addEventListener('click', handleViewSchedule);

  // Section 11: [View Critical Trees]
  btnViewCriticalTrees.addEventListener('click', () => {
    const ct = currentCaretaker;
    const critRows = ct.criticalTrees || [];
    const html = `
      <div style="margin-bottom:12px; font-size:0.88rem; color:var(--text-muted);">
        Review trees flagged as requiring urgent intervention in <strong>${ct.name}'s</strong> zone.
      </div>
      <div class="table-responsive">
        <table class="caretakers-table">
          <thead>
            <tr>
              <th>Tree ID</th>
              <th>Flagged Issue</th>
              <th>Last Checked</th>
              <th>Priority</th>
              <th class="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            ${critRows.length > 0 ? critRows.map(cr => `
              <tr>
                <td><span class="id-badge" style="color:#dc2626;">${cr.id}</span></td>
                <td><strong>${cr.issue}</strong></td>
                <td>${cr.lastCheck}</td>
                <td><span class="stat-pill critical">${cr.priority} Priority</span></td>
                <td class="text-center">
                  <button class="btn btn-outline btn-sm" onclick="alert('Triggering field intervention protocol for ${cr.id}')" type="button">
                    Dispatch Treatment
                  </button>
                </td>
              </tr>
            `).join('') : `<tr><td colspan="5" style="text-align:center; padding:20px;">No critical trees found.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
    openSubList(`🚨 Critical Trees Supervision — ${ct.name}`, html);
  });

  // Section 15: Admin Actions Handlers
  // 1. Edit Caretaker
  profEditBtn.addEventListener('click', () => {
    const ct = currentCaretaker;
    openActionPrompt(
      `✏️ Edit Caretaker — ${ct.name}`,
      `
        <div class="form-group" style="margin-bottom:10px;">
          <label>Full Name</label>
          <input type="text" id="editCtName" value="${ct.name}" />
        </div>
        <div class="form-group" style="margin-bottom:10px;">
          <label>Email Address</label>
          <input type="email" id="editCtEmail" value="${ct.email}" />
        </div>
        <div class="form-group" style="margin-bottom:10px;">
          <label>Phone Number</label>
          <input type="tel" id="editCtPhone" value="${ct.phone}" />
        </div>
        <div class="form-group">
          <label>Primary Assigned Area</label>
          <input type="text" id="editCtArea" value="${ct.primaryArea}" />
        </div>
      `,
      'Save Changes',
      () => {
        const newName = document.getElementById('editCtName').value;
        const newEmail = document.getElementById('editCtEmail').value;
        const newPhone = document.getElementById('editCtPhone').value;
        const newArea = document.getElementById('editCtArea').value;

        ct.name = newName;
        ct.email = newEmail;
        ct.phone = newPhone;
        ct.primaryArea = newArea;

        renderTable();
        openCaretakerProfile(ct);
        showToast('Caretaker details updated successfully!', 'success');
      }
    );
  });

  // 2. Manage Tree Assignments
  profManageTreesBtn.addEventListener('click', () => {
    const ct = currentCaretaker;
    if (!ct) return;

    const currentArea = ct.primaryArea || 'Guinsorongan';
    const catbaloganBarangays = [
      'Guinsorongan', 'Canlapwas', 'Maulong', 'Mercedes', 'Payao', 
      'Pangdan', 'San Roque', 'Socorro', 'Muñoz', 'Guindapunan', 
      'Rama', 'Silanga', 'Bunuanan', 'Lagundi', 'Old Mahayag', 
      'New Mahayag', 'Poblacion 1', 'Poblacion 2', 'Poblacion 3',
      'Poblacion 4', 'Poblacion 5', 'Poblacion 6', 'Poblacion 7',
      'Poblacion 8', 'Poblacion 9', 'Poblacion 10', 'Poblacion 11',
      'Poblacion 12', 'Poblacion 13', 'San Vicente', 'San Andres'
    ];

    const allAreas = Array.from(new Set([currentArea, ...(ct.assignedBarangays || []), ...catbaloganBarangays]));

    openActionPrompt(
      `🌳 Manage Tree Assignments — ${ct.name}`,
      `
        <!-- Current Status Banner -->
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px 14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#166534; letter-spacing:0.4px;">Current Assignment</div>
            <div style="font-size:1.15rem; font-weight:800; color:#14532d; margin-top:2px;">
              ${(ct.assignedTrees || 0).toLocaleString()} <span style="font-size:0.85rem; font-weight:500;">Trees Total</span>
            </div>
          </div>
          <div style="text-align:right;">
            <span class="stat-pill healthy" style="font-size:0.75rem; font-weight:700;">📍 ${currentArea}</span>
            <div style="font-size:0.72rem; color:#166534; margin-top:4px;">
              ${ct.treesCondition?.healthy || 0} Healthy • ${ct.treesCondition?.care || 0} Care • ${ct.treesCondition?.critical || 0} Crit
            </div>
          </div>
        </div>

        <!-- Action Selection -->
        <div class="form-group" style="margin-bottom:12px;">
          <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px; color:#1e293b;">Action</label>
          <select id="assignActionType" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit; font-size:0.88rem; background:#fff;">
            <option value="set">Set Exact Count</option>
            <option value="add">Add More Trees (+ Allocate)</option>
            <option value="remove">Unassign Trees (- Deallocate)</option>
          </select>
        </div>

        <!-- Tree Count Input -->
        <div class="form-group" style="margin-bottom:12px;">
          <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px; color:#1e293b;">Tree Count</label>
          <input type="number" id="assignTreeCount" value="${ct.assignedTrees || 15}" min="1" max="5000" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit; font-size:0.88rem; box-sizing:border-box;" required />
        </div>

        <!-- Barangay / Sector Selection -->
        <div class="form-group" style="margin-bottom:12px;">
          <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px; color:#1e293b;">Barangay / Site</label>
          <select id="assignSector" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit; font-size:0.88rem; background:#fff;">
            ${allAreas.map(b => `<option value="${b}" ${b.toLowerCase() === currentArea.toLowerCase() ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
        </div>

        <!-- Specific Plot / Planting Sector -->
        <div class="form-group" style="margin-bottom:12px;">
          <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px; color:#1e293b;">Plot / Planting Sector</label>
          <input type="text" id="assignPlotName" placeholder="e.g. Plot 4-A, Sector 2, Nursery Zone" value="Sector 1" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit; font-size:0.88rem; box-sizing:border-box;" />
        </div>

        <!-- Project / Greening Initiative -->
        <div class="form-group" style="margin-bottom:6px;">
          <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px; color:#1e293b;">Project Initiative</label>
          <select id="assignProject" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit; font-size:0.88rem; background:#fff;">
            <option value="Samar Native Reforestation" selected>Samar Native Reforestation Program</option>
            <option value="Urban Green Corridor">Urban Green Corridor Initiative</option>
            <option value="Watershed Protection Zone">Catbalogan Watershed Protection</option>
            <option value="Mangrove & Coastal Greening">Mangrove & Coastal Greening Project</option>
            <option value="Community Agroforestry">Community Agroforestry Livelihood</option>
          </select>
        </div>
      `,
      'Apply Assignment',
      () => {
        const action = document.getElementById('assignActionType').value;
        const count = parseInt(document.getElementById('assignTreeCount').value, 10) || 0;
        const selectedSector = document.getElementById('assignSector').value;
        const selectedPlot = document.getElementById('assignPlotName')?.value.trim() || 'Sector 1';
        const selectedProject = document.getElementById('assignProject')?.value || 'Samar Native Reforestation';

        const prevCount = ct.assignedTrees || 0;
        let newCount = prevCount;

        if (action === 'add') {
          newCount = prevCount + count;
          ct.treesCondition.healthy = (ct.treesCondition.healthy || 0) + count;
        } else if (action === 'remove') {
          newCount = Math.max(0, prevCount - count);
          ct.treesCondition.healthy = Math.max(0, (ct.treesCondition.healthy || 0) - count);
        } else {
          newCount = Math.max(0, count);
          const ratio = prevCount > 0 ? (ct.treesCondition?.healthy || 0) / prevCount : 0.9;
          ct.treesCondition.healthy = Math.round(newCount * Math.max(0.7, ratio));
        }

        ct.assignedTrees = newCount;
        ct.primaryArea = selectedSector;

        if (!Array.isArray(ct.assignedBarangays)) ct.assignedBarangays = [];
        if (!ct.assignedBarangays.includes(selectedSector)) {
          ct.assignedBarangays.push(selectedSector);
        }

        if (!Array.isArray(ct.assignedProjects)) ct.assignedProjects = [];
        if (!ct.assignedProjects.includes(selectedProject)) {
          ct.assignedProjects.push(selectedProject);
        }

        ct.areaBreakdown = [
          { area: selectedSector, count: newCount, percent: 100 }
        ];

        saveCaretakers();
        updateOverviewCards();
        renderTable();
        openCaretakerProfile(ct);
        showToast(`Tree assignments updated for ${ct.name}: ${newCount} trees in ${selectedSector} (${selectedPlot})!`, 'success');
      }
    );

    // Dynamic helper: update default count input when action changes
    setTimeout(() => {
      const actionSelect = document.getElementById('assignActionType');
      const countInput = document.getElementById('assignTreeCount');
      if (actionSelect && countInput) {
        actionSelect.addEventListener('change', () => {
          if (actionSelect.value === 'set') {
            countInput.value = ct.assignedTrees || 15;
          } else if (actionSelect.value === 'add') {
            countInput.value = 10;
          } else if (actionSelect.value === 'remove') {
            countInput.value = Math.min(5, ct.assignedTrees || 0);
          }
        });
      }
    }, 60);
  });

  // 3. View Performance
  profViewPerfBtn.addEventListener('click', () => {
    const ct = currentCaretaker;
    const html = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div class="summary-cards-grid" style="grid-template-columns: repeat(3, 1fr);">
          <div class="card summary-card" style="border-top-color:#16a34a;">
            <div class="sc-label">Completion Rate</div>
            <div class="sc-value text-success">${ct.completionRate}%</div>
            <div class="sc-subtext">Overall target compliance</div>
          </div>
          <div class="card summary-card" style="border-top-color:#3b82f6;">
            <div class="sc-label">On-Time Inspections</div>
            <div class="sc-value" style="color:#2563eb;">${ct.onTimeRate}%</div>
            <div class="sc-subtext">Within schedule deadline</div>
          </div>
          <div class="card summary-card" style="border-top-color:#8b5cf6;">
            <div class="sc-label">Photos Uploaded</div>
            <div class="sc-value" style="color:#7c3aed;">${(ct.photosUploaded || 0).toLocaleString()}</div>
            <div class="sc-subtext">Field audit evidence</div>
          </div>
        </div>

        <div class="card" style="padding:16px;">
          <h4 style="font-weight:800; margin-bottom:8px; color:var(--text-dark);">Monthly Audit Breakdown</h4>
          <p style="font-size:0.84rem; color:var(--text-muted);">
            Performance shows consistent improvement over the previous quarter. ${ct.name} maintains a fast average response rate of 48 trees/week with low overdue incidents.
          </p>
        </div>
      </div>
    `;
    openSubList(`📊 Caretaker Performance Analysis — ${ct.name}`, html);
  });

  // 4. Message Caretaker
  profMessageBtn.addEventListener('click', () => {
    const ct = currentCaretaker;
    openActionPrompt(
      `💬 Message ${ct.name}`,
      `
        <div class="form-group" style="margin-bottom:10px;">
          <label>Recipient</label>
          <input type="text" value="${ct.name} (${ct.phone})" disabled />
        </div>
        <div class="form-group" style="margin-bottom:10px;">
          <label>Subject</label>
          <input type="text" placeholder="e.g. Schedule Update / Urgent Check" />
        </div>
        <div class="form-group">
          <label>Message Content</label>
          <textarea rows="4" placeholder="Type instructions or feedback for the field caretaker..."></textarea>
        </div>
      `,
      'Send SMS / Notification',
      () => showToast(`Message successfully sent to ${ct.name}!`, 'success')
    );
  });

  // 5. Reset Password
  profResetPassBtn.addEventListener('click', () => {
    const ct = currentCaretaker;
    const tempPass = `ATAMAN-${Math.floor(100000 + Math.random() * 900000)}`;
    openActionPrompt(
      `🔑 Reset Password for ${ct.name}`,
      `
        <p style="font-size:0.85rem; color:var(--text-main); margin-bottom:12px;">
          Are you sure you want to generate a new temporary password for <strong>${ct.name} (${ct.email})</strong>?
        </p>
        <div class="card" style="padding:12px; background:#f8fafc; font-family:monospace; font-size:1rem; font-weight:800; color:#166534; text-align:center;">
          ${tempPass}
        </div>
        <p style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">
          An SMS with this temporary password will be dispatched immediately.
        </p>
      `,
      'Send Reset Password',
      () => showToast(`Temporary password dispatched to ${ct.phone}!`, 'success')
    );
  });

  // Dropdown Action: Deactivate / Activate
  dropdownToggleStatusBtn.addEventListener('click', () => {
    const ct = currentCaretaker;
    const isDeactivating = ct.status === 'Active';

    openActionPrompt(
      isDeactivating ? `🚫 Deactivate Account` : `🟢 Activate Account`,
      `
        <p style="font-size:0.86rem; color:var(--text-main);">
          Are you sure you want to <strong>${isDeactivating ? 'deactivate' : 'activate'}</strong> the caretaker account for <strong>${ct.name}</strong> (${ct.empId})?
        </p>
        ${isDeactivating ? '<p style="font-size:0.76rem; color:#dc2626; margin-top:6px;">Assigned trees will remain mapped until transferred to another caretaker.</p>' : ''}
      `,
      isDeactivating ? 'Deactivate' : 'Activate',
      () => {
        ct.status = isDeactivating ? 'Inactive' : 'Active';
        updateOverviewCards();
        renderTable();
        openCaretakerProfile(ct);
        showToast(`Caretaker ${ct.name} is now ${ct.status.toLowerCase()}!`, isDeactivating ? 'info' : 'success');
      }
    );
  });

  // Dropdown Action: Transfer Trees
  dropdownTransferTreesBtn.addEventListener('click', () => {
    const ct = currentCaretaker;
    const otherCaretakers = caretakersList.filter(c => c.id !== ct.id && c.status === 'Active');

    openActionPrompt(
      `🔄 Transfer Trees from ${ct.name}`,
      `
        <div class="form-group" style="margin-bottom:10px;">
          <label>Source Caretaker</label>
          <input type="text" value="${ct.name} (${ct.assignedTrees} trees)" disabled />
        </div>
        <div class="form-group" style="margin-bottom:10px;">
          <label>Target Caretaker</label>
          <select id="targetTransferCaretaker">
            ${otherCaretakers.map(o => `<option value="${o.id}">${o.name} (${o.empId}) — ${o.primaryArea}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Number of Trees to Transfer</label>
          <input type="number" id="transferCountInput" value="${Math.min(50, ct.assignedTrees)}" max="${ct.assignedTrees}" min="1" />
        </div>
      `,
      'Transfer Trees',
      () => {
        const targetId = document.getElementById('targetTransferCaretaker').value;
        const count = parseInt(document.getElementById('transferCountInput').value) || 0;
        const targetCt = caretakersList.find(c => c.id === targetId);

        if (targetCt && count > 0) {
          ct.assignedTrees = Math.max(0, ct.assignedTrees - count);
          targetCt.assignedTrees += count;
          renderTable();
          openCaretakerProfile(ct);
          showToast(`Transferred ${count} trees to ${targetCt.name}!`, 'success');
        }
      }
    );
  });

  // Dropdown Action: Reassign Area
  dropdownReassignAreaBtn.addEventListener('click', () => {
    const ct = currentCaretaker;
    if (!ct) return;

    const currentArea = ct.primaryArea || 'Guinsorongan';
    const catbaloganBarangays = [
      'Guinsorongan', 'Canlapwas', 'Maulong', 'Mercedes', 'Payao', 
      'Pangdan', 'San Roque', 'Socorro', 'Muñoz', 'Guindapunan', 
      'Rama', 'Silanga', 'Bunuanan', 'Lagundi', 'Old Mahayag', 
      'New Mahayag', 'Poblacion 1', 'Poblacion 2', 'Poblacion 3',
      'Poblacion 4', 'Poblacion 5', 'Poblacion 6', 'Poblacion 7',
      'Poblacion 8', 'Poblacion 9', 'Poblacion 10', 'Poblacion 11',
      'Poblacion 12', 'Poblacion 13', 'San Vicente', 'San Andres'
    ];
    const allAreas = Array.from(new Set([currentArea, ...(ct.assignedBarangays || []), ...catbaloganBarangays]));

    openActionPrompt(
      `🗺️ Reassign Area for ${ct.name}`,
      `
        <div class="form-group" style="margin-bottom:12px;">
          <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px;">Current Area</label>
          <input type="text" value="${currentArea}" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit; font-size:0.88rem; background:#f1f5f9; box-sizing:border-box;" disabled />
        </div>
        <div class="form-group">
          <label style="display:block; font-weight:600; font-size:0.85rem; margin-bottom:4px;">New Primary Barangay / Area (Catbalogan City)</label>
          <select id="newAreaSelect" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-family:inherit; font-size:0.88rem; background:#fff;">
            ${allAreas.map(b => `<option value="${b}" ${b.toLowerCase() === currentArea.toLowerCase() ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
        </div>
      `,
      'Reassign Area',
      () => {
        const newArea = document.getElementById('newAreaSelect').value;
        ct.primaryArea = newArea;
        if (!Array.isArray(ct.assignedBarangays)) ct.assignedBarangays = [];
        if (!ct.assignedBarangays.includes(newArea)) {
          ct.assignedBarangays.push(newArea);
        }
        ct.areaBreakdown = [
          { area: newArea, count: ct.assignedTrees || 0, percent: 100 }
        ];
        saveCaretakers();
        renderTable();
        openCaretakerProfile(ct);
        showToast(`Area for ${ct.name} updated to ${newArea}!`, 'success');
      }
    );
  });

  // Dropdown Action: View Activity Log
  dropdownActivityLogBtn.addEventListener('click', () => {
    const ct = currentCaretaker;
    if (!ct) return;
    const logs = [
      { event: 'Profile Viewed by Admin', time: 'Just now' },
      { event: 'Monitoring sync completed (12 trees)', time: getRealtimeDateTime(0, 1, 10) },
      { event: 'Pest treatment recorded for TR-10047', time: getRealtimeDateTime(2, 4, 25) },
      { event: 'Schedule assigned for upcoming cycle', time: getRealtimeDateTime(5, 7, 40) },
      { event: 'Account created & credentials issued', time: `${ct.dateJoined || getRealtimeDate(0)}` }
    ];

    const html = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${logs.map(l => `
          <div style="padding:10px 14px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; display:flex; justify-content:space-between;">
            <span style="font-weight:600; color:var(--text-dark);">${l.event}</span>
            <span style="font-size:0.75rem; color:var(--text-muted);">${l.time}</span>
          </div>
        `).join('')}
      </div>
    `;
    openSubList(`📜 Audit & Activity Log — ${ct.name}`, html);
  });

  // 16. Add Caretaker Modal Handlers
  
  // Automated Cascading Location Helper
  const LOCATION_MAP = {
    'Catbalogan City': ["Albalate","Bagongon","Bangon","Basiao","Buluan","Bunuanan","Cabugawan","Cagudalo","Cagusipan","Cagutian","Cagutsan","Canhawan Gote","Canlapwas","Cawayan","Cinco","Darahuway Daco","Darahuway Gote","Estaka","Guinsorongan","Ibol","Iguid","Lagundi","Libas","Lobo","Manguehay","Maulong","Mercedes","Mombon","New Mahayag","Old Mahayag","Palanyogon","Pangdan","Payao","Poblacion 1","Poblacion 2","Poblacion 3","Poblacion 4","Poblacion 5","Poblacion 6","Poblacion 7","Poblacion 8","Poblacion 9","Poblacion 10","Poblacion 11","Poblacion 12","Poblacion 13","Muñoz","Pupua","Guindapunan","Rama","San Andres","San Pablo","San Roque","San Vicente","Silanga","Socorro","Totoringon"],
    'Calbayog City': ['Capoocan', 'Dagum', 'Hamorawon', 'Matobato', 'Obrero', 'Rawis', 'San Policarpo', 'Trinidad', 'West Awang', 'East Awang'],
    'Jiabong': ['Casapa', 'Jia-an', 'Macalpe', 'Malino', 'Parasan', 'Poblacion', 'San Fernando', 'San Miguel'],
    'Tarangnan': ['Balogo', 'Bonga', 'Cambatutay', 'Luciente', 'Poblacion', 'San Vicente', 'Tabunoc'],
    'Paranas': ['Anahao', 'Cantato', 'Lipata', 'Poblacion', 'Salug', 'San Isidro', 'Tutubigan'],
    'Hinabangan': ['Bagacay', 'Cabugao', 'Malihao', 'Poblacion', 'Rawis', 'San Rafael']
  };

  function updateCaretakerBarangays() {
    const mun = document.getElementById('addMunicipality')?.value || 'Catbalogan City';
    const brgySelect = document.getElementById('addBarangay');
    if (!brgySelect) return;

    let list = LOCATION_MAP[mun] || LOCATION_MAP['Catbalogan City'];
    brgySelect.innerHTML = '<option value="">Select Barangay</option>' + 
      list.map(b => `<option value="${b}">${b}</option>`).join('');
  }

  document.getElementById('addMunicipality')?.addEventListener('change', updateCaretakerBarangays);
  document.getElementById('addProvince')?.addEventListener('change', updateCaretakerBarangays);

  // Real-time population of Individual Adopters from User Management data
  function populateRealtimeAdopters() {
    const adopterSelect = document.getElementById('addAdopter');
    if (!adopterSelect) return;

    let group = document.getElementById('registeredAdoptersGroup');
    if (!group) {
      group = adopterSelect.querySelector('optgroup[label*="Individual"]');
    }
    if (!group) {
      group = document.createElement('optgroup');
      group.id = 'registeredAdoptersGroup';
      adopterSelect.appendChild(group);
    }

    group.label = 'Individual Adopters (User Management)';
    group.innerHTML = '';

    const seenEmails = new Set();
    const adopters = [];
    const cleanEmail = (em) => (em || '').toLowerCase().trim().replace(/@saplink\.org$/i, '@ataman.org');

    // Priority sources from User Management
    const userSources = [
      'ATAMAN_users_cache',
      'saplink_users_cache',
      'ATAMAN_registered_users',
      'saplink_registered_users',
      'ATAMAN_adopters_cache',
      'saplink_adopters_cache'
    ];

    userSources.forEach(key => {
      try {
        const raw = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(raw)) {
          raw.forEach(u => {
            if (!u) return;
            const role = String(u.role || '').toLowerCase();
            const isAdopter = role.includes('adopter') || key.includes('adopter');
            if (!isAdopter) return;

            const email = cleanEmail(u.email);
            if (email && seenEmails.has(email)) return;
            if (email) seenEmails.add(email);

            const name = u.displayName || u.name || (email ? email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Adopter');
            const empId = u.empId || u.id || ('ADP-' + Math.floor(1000 + Math.random() * 9000));
            adopters.push({
              id: u.uid || u.id || empId,
              empId: empId,
              name: name,
              email: email
            });
          });
        }
      } catch (err) {}
    });

    if (adopters.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.textContent = 'No registered adopters found in User Management';
      group.appendChild(opt);
    } else {
      adopters.forEach(adp => {
        const opt = document.createElement('option');
        opt.value = adp.empId || adp.id || adp.email;
        const idPrefix = adp.empId ? `${adp.empId} · ` : '';
        const emailSuffix = adp.email ? ` (${adp.email})` : '';
        opt.textContent = `${idPrefix}${adp.name}${emailSuffix}`;
        group.appendChild(opt);
      });
    }
  }

  // Populate on initial load and listen for real-time updates
  populateRealtimeAdopters();
  window.addEventListener('storage', (e) => {
    if (e.key && (e.key.includes('user') || e.key.includes('adopter') || e.key.includes('registered'))) {
      populateRealtimeAdopters();
    }
  });
  window.addEventListener('ataman:users-updated', populateRealtimeAdopters);
  window.addEventListener('ATAMAN:users-updated', populateRealtimeAdopters);

  // ── Populate Caretaker Dropdown from Registered Caretaker Accounts ──
  let registeredCaretakersMap = new Map();

  function populateCaretakersDropdown() {
    const sel = document.getElementById('selectCaretakerUser');
    if (!sel) return;
    const searchInp = document.getElementById('caretakerSearchInput');
    const feedback = document.getElementById('caretakerSelectFeedback');
    const badge = document.getElementById('caretakerLinkedBadge');
    if (feedback) feedback.style.display = 'none';
    if (badge) badge.style.display = 'none';

    registeredCaretakersMap = new Map();

    function addCaretakerCandidate(c, sourceKey) {
      if (!c) return;
      const em = (c.email || '').toLowerCase().trim();
      const name = c.displayName || c.fullName || c.name || '';
      if (!em && !name) return;

      // Filter: must be registered as Caretaker; explicitly exclude admin and adopter
      const roleRaw = String(c.role || '').toLowerCase().trim();
      const isAdmin = roleRaw.includes('admin');
      const isAdopter = roleRaw.includes('adopter');
      if (isAdmin || isAdopter) return;

      const isCaretaker = !roleRaw || roleRaw.includes('care') || roleRaw.includes('farm') || roleRaw === 'caretaker' || sourceKey.includes('caretaker');
      if (!isCaretaker) return;

      const key = em || (name.toLowerCase().trim());
      const phone = c.phone || c.contact || c.contactNumber || '';
      const address = c.address || c.location || c.completeAddress || c.primaryArea || '';
      const empId = c.empId || c.employeeId || '';
      const username = c.username || (em ? em.split('@')[0] : name.toLowerCase().replace(/\s+/g, '.'));
      const uid = c.uid || c.id || c.userId || '';
      const barangay = c.primaryArea || c.barangay || (address.includes('Guinsorongan') ? 'Guinsorongan' : '');
      const mun = c.municipality || 'Catbalogan City';
      const prov = c.province || 'Samar';

      if (!registeredCaretakersMap.has(key)) {
        registeredCaretakersMap.set(key, {
          id: uid,
          name: name || (em ? em.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, function(ch) { return ch.toUpperCase(); }) : 'Field Caretaker'),
          email: em,
          phone: phone !== '—' ? phone : '',
          address: address !== '—' ? address : '',
          empId: empId,
          username: username,
          barangay: barangay,
          municipality: mun,
          province: prov,
          status: c.status || 'Active',
          source: sourceKey
        });
      } else {
        const ex = registeredCaretakersMap.get(key);
        if (!ex.phone && phone && phone !== '—') ex.phone = phone;
        if (!ex.address && address && address !== '—') ex.address = address;
        if ((!ex.name || ex.name === em) && name) ex.name = name;
        if (!ex.empId && empId) ex.empId = empId;
        if (!ex.barangay && barangay) ex.barangay = barangay;
        if ((!ex.id || String(ex.id).startsWith('ct-custom-')) && uid) ex.id = uid;
      }
    }

    // 1. Scan registered users caches (accounts created via register-caretaker.html or Admin Users)
    const userKeys = [
      'ATAMAN_registered_users', 'saplink_registered_users',
      'ATAMAN_users_cache', 'saplink_users_cache'
    ];
    userKeys.forEach(function(k) {
      try {
        const raw = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(raw)) raw.forEach(function(u) { addCaretakerCandidate(u, k); });
      } catch (_) {}
    });

    // 2. Scan caretakers cache
    const caretakerKeys = ['ATAMAN_caretakers_cache', 'saplink_caretakers_cache'];
    caretakerKeys.forEach(function(k) {
      try {
        const raw = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(raw)) raw.forEach(function(c) { addCaretakerCandidate(c, k); });
      } catch (_) {}
    });

    // 3. Scan window.ATAMAN_DB local users if available
    if (window.ATAMAN_DB && typeof window.ATAMAN_DB.getLocalUsers === 'function') {
      try {
        const d = window.ATAMAN_DB.getLocalUsers();
        if (Array.isArray(d)) d.forEach(function(u) { addCaretakerCandidate(u, 'firestore'); });
      } catch (_) {}
    }

    const caretakers = Array.from(registeredCaretakersMap.values()).sort(function(a, b) { return a.name.localeCompare(b.name); });

    // Clear and build the select options
    sel.innerHTML = '';
    if (caretakers.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = '— No registered Caretakers found (register a caretaker account first) —';
      sel.appendChild(opt);
      if (searchInp) searchInp.style.display = 'none';
      return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = `— Select a registered Caretaker (${caretakers.length} available) —`;
    sel.appendChild(placeholder);

    caretakers.forEach(function(u) {
      const opt = document.createElement('option');
      const optVal = u.email || u.name;
      opt.value = optVal;
      opt.dataset.email = u.email;
      opt.dataset.name = u.name;
      opt.dataset.phone = u.phone;
      opt.dataset.address = u.address;
      opt.dataset.empId = u.empId;
      opt.dataset.username = u.username;
      opt.dataset.barangay = u.barangay;
      opt.dataset.userId = u.id;
      const idTag = u.empId ? ` [${u.empId}]` : '';
      const emailDetail = u.email ? ` · ${u.email}` : '';
      opt.textContent = `${u.name}${idTag}${emailDetail}`;
      sel.appendChild(opt);
    });

    // Enable instant live search if 3 or more caretakers exist
    if (searchInp) {
      searchInp.style.display = caretakers.length >= 3 ? 'block' : 'none';
      searchInp.value = '';
      searchInp.oninput = function() {
        const query = (searchInp.value || '').toLowerCase().trim();
        for (let i = 1; i < sel.options.length; i++) {
          const opt = sel.options[i];
          const match = !query ||
            opt.textContent.toLowerCase().includes(query) ||
            (opt.dataset.email || '').toLowerCase().includes(query) ||
            (opt.dataset.name || '').toLowerCase().includes(query) ||
            (opt.dataset.empId || '').toLowerCase().includes(query);
          opt.hidden = !match;
          opt.style.display = match ? '' : 'none';
        }
      };
    }

    // Auto-populate when a Caretaker is selected
    sel.onchange = function() {
      const chosenKey = sel.value;
      const chosen = registeredCaretakersMap.get(chosenKey) || registeredCaretakersMap.get(chosenKey.toLowerCase().trim());
      if (!chosen) {
        window._selectedCaretakerUser = null;
        if (feedback) feedback.style.display = 'none';
        if (badge) badge.style.display = 'none';
        return;
      }

      // Check if this caretaker already exists in caretakersList so we keep their exact ID, empId, and existing assignments tied together
      const existingCt = caretakersList.find(c => {
        if (!c) return false;
        const cEmp = (c.empId || '').toLowerCase().trim();
        const cEmail = (c.email || '').toLowerCase().trim();
        const cName = (c.name || '').toLowerCase().trim();
        const chEmp = (chosen.empId || '').toLowerCase().trim();
        const chEmail = (chosen.email || '').toLowerCase().trim();
        const chName = (chosen.name || '').toLowerCase().trim();
        return (chosen.id && c.id === chosen.id) ||
               (chEmp && cEmp && chEmp === cEmp) ||
               (chEmail && cEmail && chEmail === cEmail) ||
               (chName && cName && chName === cName);
      });

      if (existingCt) {
        chosen.id = existingCt.id || chosen.id;
        chosen.empId = existingCt.empId || chosen.empId;
        chosen.barangay = existingCt.primaryArea || existingCt.barangay || chosen.barangay;
        chosen.phone = (existingCt.phone && existingCt.phone !== '—') ? existingCt.phone : chosen.phone;
        chosen.address = existingCt.address || chosen.address;
      }

      window._selectedCaretakerUser = chosen;

      // 1. Full Name
      const nameInp = document.getElementById('addFullName');
      if (nameInp) {
        nameInp.value = chosen.name || '';
        nameInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 2. Employee ID (always keep existing caretaker's Employee ID so they are never split)
      const empInp = document.getElementById('addEmpId');
      if (empInp && (existingCt?.empId || chosen.empId)) {
        empInp.value = existingCt?.empId || chosen.empId;
        empInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 3. Email Address
      const emailInp = document.getElementById('addEmail');
      if (emailInp) {
        emailInp.value = chosen.email || '';
        emailInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 4. Contact Number / Phone
      const phoneInp = document.getElementById('addPhone');
      if (phoneInp) {
        phoneInp.value = chosen.phone || '';
        phoneInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 5. Username
      const userInp = document.getElementById('addUsername');
      if (userInp) {
        userInp.value = chosen.username || (chosen.email ? chosen.email.split('@')[0] : chosen.name.toLowerCase().replace(/\s+/g, '.'));
        userInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 6. Complete Address
      const addressInp = document.getElementById('addAddress');
      if (addressInp) {
        addressInp.value = chosen.address || '';
        addressInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 7. Primary Barangay in Section 2 (Field Assignment)
      const brgySel = document.getElementById('addBarangay');
      if (brgySel && chosen.barangay) {
        const matchOpt = Array.from(brgySel.options).find(function(o) {
          return o.value.toLowerCase() === chosen.barangay.toLowerCase() ||
                 chosen.barangay.toLowerCase().includes(o.value.toLowerCase()) ||
                 (chosen.address && chosen.address.toLowerCase().includes(o.value.toLowerCase()));
        });
        if (matchOpt) {
          brgySel.value = matchOpt.value;
          brgySel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // 8. Pre-check any trees already assigned to this caretaker so all their trees stay tied together
      const allTrees = getRegisteredTreesForCaretaker();
      const chNameLower = (chosen.name || '').toLowerCase().trim();
      const existingIdsSet = new Set(Array.isArray(existingCt?.assignedTreeIds) ? existingCt.assignedTreeIds.map(String) : []);
      allTrees.forEach(t => {
        const tid = String(t.id);
        const tCt = (t.caretaker || '').toLowerCase().trim();
        if ((chNameLower && tCt === chNameLower) || existingIdsSet.has(tid)) {
          if (!selectedCtTreeIds.includes(tid)) {
            selectedCtTreeIds.push(tid);
          }
          if (ctTreeQuantities[tid] === undefined) {
            ctTreeQuantities[tid] = Math.max(1, parseInt(t.caretakerAssignedCount) || parseInt(t.treeCount) || 1);
          }
        }
      });
      renderCaretakerTreesCheckboxes();

      // 9. Visual Confirmation & Account Link Badge
      if (feedback) {
        feedback.style.display = 'flex';
        const feedbackText = document.getElementById('caretakerSelectFeedbackText');
        if (feedbackText) {
          feedbackText.textContent = `✓ Auto-filled and linked to registered account: ${chosen.name} (${chosen.empId || chosen.email || 'Verified'})`;
        }
      }
      if (badge) {
        badge.style.display = 'inline-block';
      }

      // Subtle pulse highlight on auto-populated inputs
      [nameInp, empInp, emailInp, phoneInp, userInp, addressInp, brgySel].forEach(function(el) {
        if (!el) return;
        el.style.transition = 'background-color 0.4s ease, border-color 0.4s ease';
        el.style.backgroundColor = '#f0fdf4';
        el.style.borderColor = '#86efac';
        setTimeout(function() {
          el.style.backgroundColor = '';
          el.style.borderColor = '';
        }, 1200);
      });
    };
  }

  // ── Registered Trees Multi-Select Dropdown with Checkboxes for Caretaker Assignment ──
  let selectedCtTreeIds = [];
  let ctTreeQuantities = {};

  function getRegisteredTreesForCaretaker() {
    let trees = [];
    try {
      const raw = localStorage.getItem('ATAMAN_trees_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) trees = parsed;
      }
    } catch (e) {}
    if ((!trees || trees.length === 0) && Array.isArray(window.ATAMAN_DEFAULT_TREES)) {
      trees = [...window.ATAMAN_DEFAULT_TREES];
    }
    return Array.isArray(trees) ? trees : [];
  }

  function updateCaretakerSelectedTreesSummary() {
    const allTrees = getRegisteredTreesForCaretaker();
    const selectedObjs = allTrees.filter(t => selectedCtTreeIds.includes(String(t.id)));
    let totalCount = 0;
    const speciesLabels = [];

    selectedObjs.forEach(t => {
      const tid = String(t.id);
      const regCount = Math.max(1, parseInt(t.treeCount) || 1);
      const qty = ctTreeQuantities[tid] !== undefined ? Math.min(regCount, Math.max(1, parseInt(ctTreeQuantities[tid]) || regCount)) : regCount;
      totalCount += qty;
      const common = t.species?.common || (typeof t.species === 'string' ? t.species : 'Native Tree');
      if (!speciesLabels.includes(common)) speciesLabels.push(common);
    });

    const addTreeTypeEl = document.getElementById('addTreeType');
    const addInitialTreesEl = document.getElementById('addInitialTrees');
    const dropdownLabelEl = document.getElementById('caretakerTreeDropdownLabel');
    const badgeEl = document.getElementById('ctSelectedTreesBadge');
    const selectAllCb = document.getElementById('ctSelectAllTreesCb');

    const summaryStr = speciesLabels.length > 0
      ? speciesLabels.join(', ')
      : '';

    if (addTreeTypeEl) addTreeTypeEl.value = summaryStr;
    if (addInitialTreesEl) addInitialTreesEl.value = totalCount;

    if (badgeEl) {
      badgeEl.textContent = selectedObjs.length > 0
        ? `${selectedObjs.length} record${selectedObjs.length === 1 ? '' : 's'} · ${totalCount.toLocaleString()} trees`
        : '0 selected';
    }

    if (dropdownLabelEl) {
      if (selectedObjs.length === 0) {
        dropdownLabelEl.textContent = '— Select registered tree(s) to assign —';
        dropdownLabelEl.style.color = '#64748b';
      } else {
        const preview = selectedObjs.map(t => {
          const common = t.species?.common || (typeof t.species === 'string' ? t.species : 'Native Tree');
          return `${t.id} (${common})`;
        }).join(', ');
        dropdownLabelEl.textContent = `✓ ${ preview }`;
        dropdownLabelEl.style.color = '#166534';
      }
    }

    if (selectAllCb) {
      selectAllCb.checked = allTrees.length > 0 && selectedCtTreeIds.length === allTrees.length;
      selectAllCb.indeterminate = selectedCtTreeIds.length > 0 && selectedCtTreeIds.length < allTrees.length;
    }
  }

  function renderCaretakerTreesCheckboxes() {
    const listEl = document.getElementById('caretakerTreeCheckboxList');
    if (!listEl) return;

    const allTrees = getRegisteredTreesForCaretaker();
    const query = (document.getElementById('ctTreeSearchInput')?.value || '').toLowerCase().trim();

    if (allTrees.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; padding:18px 12px; color:#64748b; font-size:12.5px;">
          🌱 No trees registered yet in the Trees Table.
        </div>
      `;
      updateCaretakerSelectedTreesSummary();
      return;
    }

    const filtered = allTrees.filter(t => {
      const id = String(t.id || '').toLowerCase();
      const common = (t.species?.common || (typeof t.species === 'string' ? t.species : '')).toLowerCase();
      const sci = (t.species?.scientific || '').toLowerCase();
      const type = (t.treeType || t.species?.type || '').toLowerCase();
      const brgy = (t.barangay || t.location || '').toLowerCase();
      return !query || id.includes(query) || common.includes(query) || sci.includes(query) || type.includes(query) || brgy.includes(query);
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; padding:16px 12px; color:#64748b; font-size:12.5px;">
          🔍 No trees match "${query}"
        </div>
      `;
      updateCaretakerSelectedTreesSummary();
      return;
    }

    listEl.innerHTML = filtered.map(t => {
      const tid = String(t.id);
      const isChecked = selectedCtTreeIds.includes(tid);
      const common = t.species?.common || (typeof t.species === 'string' ? t.species : 'Native Tree');
      const sci = t.species?.scientific || '';
      const treeType = t.treeType || t.species?.type || 'Native';
      const regCount = Math.max(1, parseInt(t.treeCount) || 1);
      const qty = ctTreeQuantities[tid] !== undefined ? Math.min(regCount, Math.max(1, parseInt(ctTreeQuantities[tid]) || regCount)) : regCount;
      const loc = t.barangay ? `Brgy. ${t.barangay}` : (t.location || 'Catbalogan City');
      const curCt = (t.caretaker && t.caretaker !== 'Unassigned' && t.caretaker !== 'Pedro Reyes') ? t.caretaker : '';

      return `
        <div class="ct-tree-cb-row" data-tree-id="${tid}"
          style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 10px; border-radius:8px; border:1.5px solid ${isChecked ? '#86efac' : '#e2e8f0'}; background:${isChecked ? '#f0fdf4' : '#ffffff'}; transition:all 0.15s ease;">
          <label style="display:flex; align-items:flex-start; gap:8px; flex:1; min-width:0; cursor:pointer; margin:0;">
            <input type="checkbox" class="ct-tree-cb" value="${tid}" ${isChecked ? 'checked' : ''}
              style="width:16px; height:16px; accent-color:#16a34a; cursor:pointer; margin-top:2px; flex-shrink:0;" />
            <div style="min-width:0; flex:1;">
              <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                <strong style="font-size:12.5px; color:#0f172a;">${tid}</strong>
                <span style="font-size:12.5px; font-weight:700; color:#166534;">— ${common}</span>
                ${sci ? `<span style="font-size:11px; color:#64748b; font-style:italic;">(${sci})</span>` : ''}
                <span style="font-size:10.5px; font-weight:700; color:#065f46; background:#ecfdf5; border:1px solid #a7f3d0; padding:1px 5px; border-radius:4px;">${treeType}</span>
              </div>
              <div style="font-size:11px; color:#64748b; margin-top:2px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <span>🌳 ${regCount} registered</span>
                <span>• 📍 ${loc}</span>
                ${curCt ? `<span style="color:#1d4ed8; font-weight:600;">• 👤 ${curCt}</span>` : ''}
              </div>
            </div>
          </label>
          <div style="display:flex; flex-direction:column; align-items:center; gap:2px; flex-shrink:0;">
            <span style="font-size:9.5px; font-weight:700; color:#64748b;">Trees (max ${regCount})</span>
            <input type="number" class="ct-tree-qty-input" data-tree-id="${tid}" data-max="${regCount}"
              min="1" max="${regCount}" value="${qty}" ${isChecked ? '' : 'disabled'}
              style="width:62px; padding:3px 5px; border-radius:5px; border:1.5px solid ${isChecked ? '#86efac' : '#cbd5e1'}; background:${isChecked ? '#ffffff' : '#f1f5f9'}; color:${isChecked ? '#166534' : '#94a3b8'}; font-size:12px; font-weight:700; text-align:center;" />
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.ct-tree-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const tid = cb.value;
        const row = cb.closest('.ct-tree-cb-row');
        const qtyInp = row?.querySelector('.ct-tree-qty-input');
        const treeObj = allTrees.find(x => String(x.id) === String(tid));
        const maxCount = Math.max(1, parseInt(treeObj?.treeCount) || 1);

        if (cb.checked) {
          if (!selectedCtTreeIds.includes(tid)) selectedCtTreeIds.push(tid);
          if (ctTreeQuantities[tid] === undefined) ctTreeQuantities[tid] = maxCount;
          if (qtyInp) {
            qtyInp.disabled = false;
            qtyInp.value = ctTreeQuantities[tid];
            qtyInp.style.borderColor = '#86efac';
            qtyInp.style.background = '#ffffff';
            qtyInp.style.color = '#166534';
          }
          if (row) {
            row.style.borderColor = '#86efac';
            row.style.background = '#f0fdf4';
          }
        } else {
          selectedCtTreeIds = selectedCtTreeIds.filter(id => id !== tid);
          if (qtyInp) {
            qtyInp.disabled = true;
            qtyInp.style.borderColor = '#cbd5e1';
            qtyInp.style.background = '#f1f5f9';
            qtyInp.style.color = '#94a3b8';
          }
          if (row) {
            row.style.borderColor = '#e2e8f0';
            row.style.background = '#ffffff';
          }
        }
        updateCaretakerSelectedTreesSummary();
      });
    });

    listEl.querySelectorAll('.ct-tree-qty-input').forEach(inp => {
      const onQty = () => {
        const tid = inp.getAttribute('data-tree-id');
        const maxVal = parseInt(inp.getAttribute('data-max')) || 9999;
        const val = Math.min(maxVal, Math.max(1, parseInt(inp.value) || 1));
        ctTreeQuantities[tid] = val;
        inp.value = val;
        updateCaretakerSelectedTreesSummary();
      };
      inp.addEventListener('input', onQty);
      inp.addEventListener('change', onQty);
    });

    updateCaretakerSelectedTreesSummary();
  }

  const caretakerTreeDropdownBtn = document.getElementById('caretakerTreeDropdownBtn');
  const caretakerTreeDropdownMenu = document.getElementById('caretakerTreeDropdownMenu');
  const ctSelectAllTreesCb = document.getElementById('ctSelectAllTreesCb');
  const ctTreeSearchInput = document.getElementById('ctTreeSearchInput');

  if (caretakerTreeDropdownBtn && caretakerTreeDropdownMenu) {
    caretakerTreeDropdownBtn.addEventListener('click', () => {
      const isHidden = caretakerTreeDropdownMenu.style.display === 'none';
      caretakerTreeDropdownMenu.style.display = isHidden ? 'flex' : 'none';
      const arrow = document.getElementById('caretakerTreeDropdownArrow');
      if (arrow) arrow.textContent = isHidden ? '▴' : '▾';
    });
  }

  if (ctSelectAllTreesCb) {
    ctSelectAllTreesCb.addEventListener('change', () => {
      const allTrees = getRegisteredTreesForCaretaker();
      if (ctSelectAllTreesCb.checked) {
        selectedCtTreeIds = allTrees.map(t => String(t.id));
        allTrees.forEach(t => {
          const tid = String(t.id);
          if (ctTreeQuantities[tid] === undefined) {
            ctTreeQuantities[tid] = Math.max(1, parseInt(t.treeCount) || 1);
          }
        });
      } else {
        selectedCtTreeIds = [];
      }
      renderCaretakerTreesCheckboxes();
    });
  }

  if (ctTreeSearchInput) {
    ctTreeSearchInput.addEventListener('input', renderCaretakerTreesCheckboxes);
  }

  window.addEventListener('ATAMAN:trees-updated', () => {
    if (!addCaretakerModal.classList.contains('hidden')) {
      renderCaretakerTreesCheckboxes();
    }
  });

  openAddCaretakerModalBtn.addEventListener('click', () => {
    updateCaretakerBarangays();
    populateRealtimeAdopters();
    addCaretakerForm.reset();
    window._selectedCaretakerUser = null;
    selectedCtTreeIds = [];
    ctTreeQuantities = {};
    if (ctTreeSearchInput) ctTreeSearchInput.value = '';
    if (caretakerTreeDropdownMenu) caretakerTreeDropdownMenu.style.display = 'flex';
    const feedback = document.getElementById('caretakerSelectFeedback');
    if (feedback) feedback.style.display = 'none';
    const badge = document.getElementById('caretakerLinkedBadge');
    if (badge) badge.style.display = 'none';
    const searchInp = document.getElementById('caretakerSearchInput');
    if (searchInp) searchInp.value = '';

    // Auto-generate next employee ID
    const nextIdNum = caretakersList.length + 1;
    document.getElementById('addEmpId').value = `CT-${String(nextIdNum).padStart(3, '0')}`;
    populateCaretakersDropdown();
    renderCaretakerTreesCheckboxes();
    addCaretakerModal.classList.remove('hidden');
  });

  const closeAddModal = () => {
    addCaretakerModal.classList.add('hidden');
    window._selectedCaretakerUser = null;
    selectedCtTreeIds = [];
    ctTreeQuantities = {};
    const feedback = document.getElementById('caretakerSelectFeedback');
    if (feedback) feedback.style.display = 'none';
    const badge = document.getElementById('caretakerLinkedBadge');
    if (badge) badge.style.display = 'none';
    const searchInp = document.getElementById('caretakerSearchInput');
    if (searchInp) searchInp.value = '';
  };
  closeAddModalBtn.addEventListener('click', closeAddModal);
  cancelAddBtn.addEventListener('click', closeAddModal);

  addCaretakerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const selUserEl = document.getElementById('selectCaretakerUser');
    const selectedCaretaker = window._selectedCaretakerUser;

    if (!selUserEl?.value || !selectedCaretaker) {
      alert('⚠️ Please select a registered Caretaker from the dropdown.');
      selUserEl?.focus();
      return;
    }

    if (selectedCtTreeIds.length === 0) {
      alert('⚠️ Please check at least one tree under "Assigned Tree Type / Species" for this caretaker.');
      document.getElementById('caretakerTreeDropdownBtn')?.focus();
      return;
    }

    const fullName = document.getElementById('addFullName').value.trim();
    const empId = document.getElementById('addEmpId').value.trim();
    const email = document.getElementById('addEmail').value.trim();
    const phone = document.getElementById('addPhone').value.trim();
    const address = document.getElementById('addAddress')?.value.trim() || selectedCaretaker?.address || '';
    const barangay = document.getElementById('addBarangay').value;
    const treeType = document.getElementById('addTreeType')?.value || 'Native Hardwood';
    const project = document.getElementById('addProject').value.trim() || 'General Reforestation';
    const initTrees = parseInt(document.getElementById('addInitialTrees').value) || 0;
    const adopterSelect = document.getElementById('addAdopter');
    const assignedAdopter = adopterSelect ? adopterSelect.value : '';
    const assignedAdopterName = (adopterSelect && adopterSelect.selectedIndex > 0) ? adopterSelect.options[adopterSelect.selectedIndex].text : '';

    if (!fullName) {
      alert('⚠️ Missing Caretaker Name.');
      document.getElementById('addFullName')?.focus();
      return;
    }

    // Update selected trees in ATAMAN_trees_cache & Firestore so they are assigned to this caretaker
    const allTrees = getRegisteredTreesForCaretaker();
    let cH = 0, cNC = 0, cCR = 0, cD = 0;
    const assignedTreesList = [];

    selectedCtTreeIds.forEach(tid => {
      const idx = allTrees.findIndex(t => String(t.id) === String(tid));
      if (idx >= 0) {
        const tObj = allTrees[idx];
        const regCount = Math.max(1, parseInt(tObj.treeCount) || 1);
        const assignedQty = ctTreeQuantities[tid] !== undefined ? Math.min(regCount, Math.max(1, parseInt(ctTreeQuantities[tid]) || regCount)) : regCount;
        const st = (tObj.status || 'healthy').toLowerCase();
        if (st === 'healthy') cH += assignedQty;
        else if (st === 'needs-care' || st === 'needs') cNC += assignedQty;
        else if (st === 'critical') cCR += assignedQty;
        else if (st === 'dead') cD += assignedQty;
        else cH += assignedQty;

        const common = tObj.species?.common || (typeof tObj.species === 'string' ? tObj.species : 'Native Tree');
        assignedTreesList.push({
          id: tObj.id,
          species: common,
          treeCount: assignedQty,
          treeType: tObj.treeType || tObj.species?.type || 'Native'
        });

        allTrees[idx] = {
          ...tObj,
          caretaker: fullName,
          caretakerAssignedCount: assignedQty,
          customAssignedCaretaker: true,
          customCaretaker: true
        };

        if (window.ATAMAN_DB && typeof window.ATAMAN_DB.updateTree === 'function') {
          window.ATAMAN_DB.updateTree(tid, {
            caretaker: fullName,
            caretakerAssignedCount: assignedQty,
            customAssignedCaretaker: true,
            customCaretaker: true
          }).catch(() => {});
        }
      }
    });

    try {
      localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(allTrees));
      if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyTrees === 'function') {
        window.ATAMAN_SYNC.notifyTrees(allTrees);
      }
    } catch (e) {}

    // Check if caretaker already exists in list (by id, empId, email, userId, or name) so we NEVER split into two rows
    const existingIdx = caretakersList.findIndex(c => {
      if (!c) return false;
      const em = (c.email || '').toLowerCase().trim();
      const nm = (c.name || '').toLowerCase().trim();
      const cEmp = (c.empId || '').toLowerCase().trim();
      const cUid = (c.userId || c.uid || '').toLowerCase().trim();
      const selId = (selectedCaretaker?.id || '').toLowerCase().trim();
      const idMatch = (selId && (String(c.id).toLowerCase().trim() === selId || cUid === selId)) || (cEmp && empId && cEmp === empId.toLowerCase().trim());
      const emailMatch = em && email && em === email.toLowerCase().trim();
      const nameMatch = nm && fullName && nm === fullName.toLowerCase().trim();
      return idMatch || emailMatch || nameMatch;
    });

    const existingCt = existingIdx >= 0 ? caretakersList[existingIdx] : null;
    const canonicalId = (existingCt && existingCt.id)
      ? existingCt.id
      : ((selectedCaretaker && selectedCaretaker.id && String(selectedCaretaker.id).startsWith('ct-')) ? selectedCaretaker.id : (selectedCaretaker?.id || `ct-custom-${Date.now()}`));
    const canonicalEmpId = (existingCt && String(existingCt.empId || '').toUpperCase().startsWith('EMP-'))
      ? existingCt.empId
      : (empId || existingCt?.empId || 'EMP-001');

    const mergedTreeIds = Array.from(new Set([...(existingCt?.assignedTreeIds || []), ...selectedCtTreeIds].map(String)));
    const mergedBrgys = Array.from(new Set([...(existingCt?.assignedBarangays || []), barangay].filter(b => b && b !== 'undefined' && b !== 'None')));
    const mergedProjects = Array.from(new Set([...(existingCt?.assignedProjects || []), project].filter(p => p && p !== 'undefined' && p !== 'None')));
    const finalPrimaryArea = (barangay && barangay !== 'undefined') ? barangay : (existingCt?.primaryArea || existingCt?.barangay || 'Canlapwas');

    // Combine species labels from existing and newly selected trees
    const typesSet = new Set();
    [existingCt?.assignedTreeType, treeType].forEach(tt => {
      if (tt && tt !== 'undefined' && tt !== 'Native Hardwood') {
        tt.split(',').map(s => s.trim()).filter(Boolean).forEach(s => typesSet.add(s));
      }
    });
    const combinedTreeType = typesSet.size > 0 ? Array.from(typesSet).join(', ') : (treeType || existingCt?.assignedTreeType || 'Native Hardwood');

    const newCt = {
      ...(existingCt || {}),
      id: canonicalId,
      userId: selectedCaretaker?.id || existingCt?.userId || canonicalId,
      userEmail: email || existingCt?.email || '',
      accountLinked: true,
      registeredCaretaker: true,
      name: fullName,
      empId: canonicalEmpId,
      email: email || existingCt?.email || '',
      phone: phone || existingCt?.phone || '—',
      address: address || existingCt?.address || finalPrimaryArea,
      status: existingCt?.status || 'Active',
      primaryArea: finalPrimaryArea,
      barangay: finalPrimaryArea,
      assignedTreeType: combinedTreeType,
      assignedTreeIds: mergedTreeIds,
      assignedTreesList: assignedTreesList,
      assignedAdopter: assignedAdopter || existingCt?.assignedAdopter || '',
      assignedAdopterName: assignedAdopterName || existingCt?.assignedAdopterName || '',
      dateJoined: existingCt?.dateJoined || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      assignedTrees: initTrees,
      treesCondition: { healthy: cH, care: cNC, critical: cCR, dead: cD },
      pendingMonitoring: existingCt?.pendingMonitoring || 0,
      overdueMonitoring: existingCt?.overdueMonitoring || 0,
      completedMonitoring: existingCt?.completedMonitoring || 0,
      completionRate: existingCt?.completionRate || 0,
      onTimeRate: existingCt?.onTimeRate || 100,
      avgWeeklyMonitored: existingCt?.avgWeeklyMonitored || 0,
      monitoredThisMonth: existingCt?.monitoredThisMonth || 0,
      photosUploaded: existingCt?.photosUploaded || 0,
      maintenanceRecords: existingCt?.maintenanceRecords || 0,
      assignedBarangays: mergedBrgys.length > 0 ? mergedBrgys : [finalPrimaryArea],
      assignedProjects: mergedProjects.length > 0 ? mergedProjects : [project],
      assignedFarms: existingCt?.assignedFarms || [],
      areaBreakdown: initTrees > 0 ? [{ area: finalPrimaryArea, count: initTrees, percent: 100 }] : (existingCt?.areaBreakdown || []),
      monthlyTrend: existingCt?.monthlyTrend || { july: 0, august: 0, septProj: 0 },
      schedule: existingCt?.schedule || [],
      recentActivity: existingCt?.recentActivity || [],
      criticalTrees: existingCt?.criticalTrees || [],
      maintenance: existingCt?.maintenance || { watering: 0, fert: 0, pest: 0, weed: 0, prune: 0, recentLog: null },
      photos: existingCt?.photos || []
    };

    if (existingIdx >= 0) {
      caretakersList[existingIdx] = newCt;
    } else {
      caretakersList.unshift(newCt);
    }

    harmonizeCaretakerRecords(caretakersList);

    try {
      localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakersList));
      if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyCaretakers === 'function') {
        window.ATAMAN_SYNC.notifyCaretakers(caretakersList);
      }
      if (window.ATAMAN_DB && typeof window.ATAMAN_DB.addCaretaker === 'function') {
        window.ATAMAN_DB.addCaretaker(newCt);
      }
    } catch(e) {}
    // Register login credentials in Firebase Auth & users collection if password was provided
    const ctPass = document.getElementById('addCaretakerPassword')?.value?.trim();
    if (ctPass && ctPass.length >= 6 && email) {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        try {
          let secondaryApp;
          try {
            secondaryApp = firebase.app('AdminUserCreator');
          } catch (_) {
            secondaryApp = firebase.initializeApp(firebase.app().options, 'AdminUserCreator');
          }
          const secondaryAuth = secondaryApp.auth();
          secondaryAuth.createUserWithEmailAndPassword(email.toLowerCase(), ctPass).then((cred) => {
            if (cred && cred.user && cred.user.updateProfile) {
              cred.user.updateProfile({ displayName: fullName }).catch(() => {});
            }
            secondaryAuth.signOut().catch(() => {});
          }).catch(err => console.warn('Caretaker Firebase Auth creation:', err));
        } catch (e) {
          console.warn('Caretaker Firebase auth setup info:', e);
        }
      }
      const db = window.ATAMAN_FIRESTORE || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
      if (db) {
        db.collection('users').doc(email.toLowerCase()).set({
          id: newCt.id,
          uid: newCt.id,
          name: fullName,
          displayName: fullName,
          email: email.toLowerCase(),
          role: 'caretaker',
          status: 'Active',
          createdAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
      try {
        let regUsers = JSON.parse(localStorage.getItem('ATAMAN_registered_users') || '[]');
        regUsers = [{ uid: newCt.id, email: email.toLowerCase(), displayName: fullName, role: 'caretaker', password: ctPass }, ...regUsers.filter(u => u.email !== email.toLowerCase())];
        localStorage.setItem('ATAMAN_registered_users', JSON.stringify(regUsers));
      } catch (e) {}
    }

    closeAddModal();
    updateOverviewCards();
    renderTable();
    showToast(`🎉 Caretaker ${fullName} (${empId}) linked and saved successfully!`, 'success');
  });

  // Search & Filter Listeners
  searchInput.addEventListener('input', renderTable);
  filterStatus.addEventListener('change', renderTable);
  filterArea.addEventListener('change', renderTable);
  filterTreeCount.addEventListener('change', renderTable);
  filterMonitoringStatus.addEventListener('change', renderTable);

  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterStatus.value = 'ALL';
    filterArea.value = 'ALL';
    filterTreeCount.value = 'ALL';
    filterMonitoringStatus.value = 'ALL';
    renderTable();
    showToast('Filters reset to default.', 'info');
  });

  // Export Caretakers
  exportCaretakersBtn.addEventListener('click', () => {
    const csvRows = [
      ['Employee ID', 'Name', 'Email', 'Phone', 'Primary Area', 'Assigned Trees', 'Healthy', 'Critical', 'Pending', 'Status', 'Completion Rate']
    ];

    caretakersList.forEach(ct => {
      csvRows.push([
        ct.empId,
        `"${ct.name}"`,
        ct.email,
        ct.phone,
        `"${ct.primaryArea}"`,
        ct.assignedTrees,
        ct.treesCondition?.healthy || 0,
        ct.treesCondition?.critical || 0,
        ct.pendingMonitoring || 0,
        ct.status,
        `${ct.completionRate}%`
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ATAMAN_Caretakers_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Caretakers CSV exported successfully!', 'success');
  });

  // Import Caretakers
  importCaretakersBtn.addEventListener('click', () => {
    openActionPrompt(
      '📥 Import Caretakers Data',
      `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <p style="font-size:0.85rem; color:var(--text-muted);">
            Upload a CSV or JSON file containing caretaker profiles, assigned trees, and field credentials.
          </p>
          <div style="border:2px dashed #cbd5e1; border-radius:10px; padding:24px; text-align:center; background:#f8fafc;">
            <div style="font-size:2rem; margin-bottom:6px;">📄</div>
            <p style="font-weight:700; font-size:0.86rem;">Drag & drop CSV file or click to browse</p>
            <input type="file" accept=".csv, .json" style="margin-top:10px;" />
          </div>
        </div>
      `,
      'Process Import',
      () => showToast('Batch caretakers data imported successfully!', 'success')
    );
  });

  // Sidebar Submenus Toggle
  document.querySelectorAll('.nav-item.has-children .nav-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = btn.closest('.nav-item');
      parent.classList.toggle('open');
    });
  });

  // Real-Time Multi-Tab & Cloud Listeners
  window.addEventListener('ATAMAN:caretakers-updated', (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      caretakersList = e.detail;
      harmonizeCaretakerRecords(caretakersList);
      updateOverviewCards();
      renderTable();
    }
  });

  if (window.ATAMAN_DB) {
    if (typeof window.ATAMAN_DB.onCaretakersChange === 'function') {
      window.ATAMAN_DB.onCaretakersChange((stored) => {
        if (Array.isArray(stored)) {
          if (stored.length > 0) {
            caretakersList = stored;
          } else {
            const local = (() => {
              try {
                const r = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
                return Array.isArray(r) && r.length > 0 ? r : null;
              } catch (_) { return null; }
            })();
            caretakersList = local || [...DEFAULT_CARETAKERS];
          }
          harmonizeCaretakerRecords(caretakersList);
          try { localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakersList)); } catch (_) {}
          updateOverviewCards();
          renderTable();
        }
      });
    } else if (typeof window.ATAMAN_DB.getCaretakers === 'function') {
      window.ATAMAN_DB.getCaretakers().then(stored => {
        if (Array.isArray(stored) && stored.length > 0) {
          caretakersList = stored;
          harmonizeCaretakerRecords(caretakersList);
          try { localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakersList)); } catch (_) {}
          updateOverviewCards();
          renderTable();
        }
      });
    }
  }

  // Initial Boot
  updateOverviewCards();
  renderTable();

});



/* ==========================================================================
   ATAMAN ADMIN: HELD PAYMENTS & CARETAKER QUEUE WORKFLOW CONTROLLER
   Unified Adopter • Tree ID • Caretaker ID Protocol
   ========================================================================== */

// Clean queue legacy caches if any legacy seed trees exist
try {
  const rawTrees = localStorage.getItem('ATAMAN_trees_cache');
  if (rawTrees && (rawTrees.includes('TR-10007') || rawTrees.includes('GCASH-982417283'))) {
    localStorage.setItem('ATAMAN_trees_cache', '[]');
    localStorage.setItem('saplink_trees_cache', '[]');
  }
} catch (_) {}

const SEED_HELD_QUEUE_TREES = [];

let CURRENT_QUEUE_TAB = 'awaiting'; // 'awaiting' | 'verified' | 'all'
let QUEUE_SEARCH_QUERY = '';

function getQueueTreesFromStorage() {
  let allTrees = [];
  try {
    const raw = localStorage.getItem('ATAMAN_trees_cache') || localStorage.getItem('saplink_trees_cache');
    allTrees = raw ? JSON.parse(raw) : [];
  } catch (_) { allTrees = []; }

  return Array.isArray(allTrees) ? allTrees : [];
}

function calculateDaysWaiting(dateStr) {
  if (!dateStr) return 1;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 1;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

function switchAdminCaretakersView(view) {
  const tabDir = document.getElementById('tabViewCaretakers');
  const tabQueue = document.getElementById('tabViewQueue');
  const viewDir = document.getElementById('viewDirectorySection');
  const viewQueue = document.getElementById('viewQueueSection');

  if (view === 'queue') {
    if (tabDir) tabDir.classList.remove('active');
    if (tabQueue) tabQueue.classList.add('active');
    if (viewDir) viewDir.style.display = 'none';
    if (viewQueue) viewQueue.style.display = 'block';
    initHeldPaymentsQueueWorkflow(false);

    try {
      const url = new URL(window.location);
      url.searchParams.set('view', 'queue');
      window.history.replaceState({}, '', url);
    } catch (_) {}
  } else {
    if (tabDir) tabDir.classList.add('active');
    if (tabQueue) tabQueue.classList.remove('active');
    if (viewDir) viewDir.style.display = 'block';
    if (viewQueue) viewQueue.style.display = 'none';

    try {
      const url = new URL(window.location);
      url.searchParams.delete('view');
      window.history.replaceState({}, '', url);
    } catch (_) {}
  }
}
window.switchAdminCaretakersView = switchAdminCaretakersView;

function setQueueFilter(filter) {
  CURRENT_QUEUE_TAB = filter;
  const pills = document.querySelectorAll('#queueFilterPills .btn-queue-sub');
  pills.forEach(p => {
    if (p.getAttribute('data-queue-filter') === filter) p.classList.add('active');
    else p.classList.remove('active');
  });

  const secAwaiting = document.getElementById('sectionAwaitingTable');
  const secClaimed = document.getElementById('sectionClaimedTable');

  if (filter === 'awaiting') {
    if (secAwaiting) secAwaiting.style.display = 'block';
    if (secClaimed) secClaimed.style.display = 'none';
  } else if (filter === 'verified') {
    if (secAwaiting) secAwaiting.style.display = 'none';
    if (secClaimed) secClaimed.style.display = 'block';
  } else {
    if (secAwaiting) secAwaiting.style.display = 'block';
    if (secClaimed) secClaimed.style.display = 'block';
  }

  initHeldPaymentsQueueWorkflow(false);
}
window.setQueueFilter = setQueueFilter;

function handleQueueSearch() {
  const inp = document.getElementById('queueSearchInput');
  QUEUE_SEARCH_QUERY = (inp ? inp.value : '').toLowerCase().trim();
  initHeldPaymentsQueueWorkflow(false);
}
window.handleQueueSearch = handleQueueSearch;

function initHeldPaymentsQueueWorkflow(isRefresh = false) {
  const allTrees = getQueueTreesFromStorage();

  // 1. Separate into Queue Trees vs Claimed Trees
  const awaitingQueue = [];
  const claimedTrees = [];

  allTrees.forEach(t => {
    const isAwaiting = t.caretakerStatus === 'awaiting' || 
                       String(t.caretaker || '').toLowerCase().includes('awaiting') || 
                       !t.caretakerId;
    const isFunded = t.fundState && (t.fundState.includes('Held') || t.fundState.includes('Released'));

    if (isAwaiting && (isFunded || t.adopter || t.sponsorName)) {
      awaitingQueue.push(t);
    } else if (!isAwaiting && (t.careVerified || isFunded || t.adopter)) {
      claimedTrees.push(t);
    }
  });

  // 2. Compute KPIs
  let totalHeldPhp = 0;
  let totalReleasedPhp = 0;
  let awaitingTreesCount = awaitingQueue.length;
  let claimedTreesCount = claimedTrees.length;

  allTrees.forEach(t => {
    const amount = Number(t.fundingAmount || 500);
    const fs = String(t.fundState || '');
    if (fs.startsWith('Held by Admin') || fs.includes('Escrow')) {
      totalHeldPhp += amount;
    } else if (fs.includes('Released') || t.payoutStatus === 'Released') {
      totalReleasedPhp += (Number(t.payoutAmount) || amount);
    }
  });

  const kpiHeldEl = document.getElementById('kpiHeldTotalAmount');
  const kpiHeldTreesEl = document.getElementById('kpiHeldTreesCount');
  const kpiAwaitingEl = document.getElementById('kpiAwaitingCount');
  const kpiClaimedEl = document.getElementById('kpiClaimedCount');
  const kpiReleasedEl = document.getElementById('kpiReleasedAmount');
  const kpiReleasedCountEl = document.getElementById('kpiReleasedCount');

  if (kpiHeldEl) kpiHeldEl.textContent = '₱' + totalHeldPhp.toLocaleString();
  if (kpiHeldTreesEl) kpiHeldTreesEl.textContent = `${awaitingTreesCount} Adopted trees in GCash escrow`;
  if (kpiAwaitingEl) kpiAwaitingEl.textContent = `${awaitingTreesCount} Trees`;
  if (kpiClaimedEl) kpiClaimedEl.textContent = `${claimedTreesCount} Tree${claimedTreesCount === 1 ? '' : 's'}`;
  if (kpiReleasedEl) kpiReleasedEl.textContent = '₱' + totalReleasedPhp.toLocaleString();
  if (kpiReleasedCountEl) kpiReleasedCountEl.textContent = `${totalReleasedPhp > 0 ? 'Care-verified disbursements' : 'No disbursements released yet'}`;

  // Badges
  const queueHeaderBadge = document.getElementById('queueHeaderBadge');
  if (queueHeaderBadge) {
    queueHeaderBadge.textContent = `${awaitingTreesCount} Awaiting • ₱${totalHeldPhp.toLocaleString()} Held`;
  }
  const pillAwaitingCount = document.getElementById('pillAwaitingCount');
  if (pillAwaitingCount) pillAwaitingCount.textContent = awaitingTreesCount;
  const pillVerifiedCount = document.getElementById('pillVerifiedCount');
  if (pillVerifiedCount) pillVerifiedCount.textContent = claimedTrees.filter(t => t.careVerified || t.payoutStatus !== 'Released').length;

  const awaitingTableBadge = document.getElementById('awaitingTableCountBadge');
  if (awaitingTableBadge) awaitingTableBadge.textContent = `${awaitingTreesCount} Trees`;
  const claimedTableBadge = document.getElementById('claimedTableCountBadge');
  if (claimedTableBadge) claimedTableBadge.textContent = `${claimedTreesCount} Trees`;

  // 3. Render Table 1: Awaiting Queue Table
  renderAwaitingQueueTable(awaitingQueue);

  // 4. Render Table 2: Claimed & Care Verified Table
  renderClaimedPayoutsTable(claimedTrees);

  if (isRefresh && typeof showAdminToast === 'function') {
    showAdminToast('🔄 Held Payments & Caretaker Queue synchronized live.', 'info');
  }
}
window.initHeldPaymentsQueueWorkflow = initHeldPaymentsQueueWorkflow;

function renderAwaitingQueueTable(trees) {
  const tbody = document.getElementById('awaitingQueueTbody');
  if (!tbody) return;

  let filtered = trees;
  if (QUEUE_SEARCH_QUERY) {
    filtered = trees.filter(t => {
      const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || t.speciesCommon || '';
      const haystack = `${t.id} ${sp} ${t.barangay || ''} ${t.plotBook || ''} ${t.adopter || ''} ${t.sponsorName || ''} ${t.adopterId || ''}`.toLowerCase();
      return haystack.includes(QUEUE_SEARCH_QUERY);
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:36px 16px; color:#64748b; font-size:13px;">
      <div style="font-size:24px; margin-bottom:6px;">🌱</div>
      No adopted trees are currently waiting in the queue.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || t.speciesCommon || 'Tree';
    const sci = (typeof t.species === 'object' && t.species ? t.species.scientific : '') || t.scientificName || '';
    const adopterName = t.adopter || t.sponsorName || 'Community Adopter';
    const adopterId = t.adopterId || 'ADP-101';
    const location = `${t.barangay || 'San Isidro'}, ${t.municipality || 'Catbalogan'}`;
    const zonePlot = t.plotBook || t.plantingZone || 'Plot A-01';
    const amount = Number(t.fundingAmount || 500);
    const daysWaiting = calculateDaysWaiting(t.fundedAt || t.createdAt);
    const isOverdue = daysWaiting >= 5;

    const waitingBadge = isOverdue
      ? `<span class="badge-waiting-age" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;">⚠️ ${daysWaiting} Days Waiting</span>`
      : daysWaiting >= 3
      ? `<span class="badge-waiting-age" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;">⏳ ${daysWaiting} Days Waiting</span>`
      : `<span class="badge-waiting-age" style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0;">🌱 ${daysWaiting === 0 ? 'Today' : `${daysWaiting} Day${daysWaiting > 1 ? 's' : ''}`}</span>`;

    const stageBadge = (t.stage || '').toLowerCase().includes('existing')
      ? `<span style="background:#064e3b; color:#86efac; font-size:10px; font-weight:800; padding:1px 6px; border-radius:4px;">EXISTING</span>`
      : `<span style="background:#166534; color:#fff; font-size:10px; font-weight:800; padding:1px 6px; border-radius:4px;">SAPLING</span>`;

    return `
      <tr>
        <td>
          <div style="font-weight:800; color:#0f172a; font-size:13.5px; display:flex; align-items:center; gap:6px;">
            <span>${t.id}</span>
            ${stageBadge}
          </div>
          <div style="font-size:11px; color:#64748b;">${t.stageDescription || 'Reforestation Tree'}</div>
        </td>
        <td>
          <strong style="color:#166534; font-size:13px;">${sp}</strong>
          <div style="font-size:11.5px; font-style:italic; color:#64748b;">${sci}</div>
        </td>
        <td>
          <div style="font-weight:600; color:#334155; font-size:12.5px;">${zonePlot}</div>
          <div style="font-size:11px; color:#64748b;">📍 ${location}</div>
        </td>
        <td>
          <div style="font-weight:700; color:#0f172a; font-size:12.5px;">${adopterName}</div>
          <div style="font-size:11px; color:#1d4ed8; font-weight:600;">🆔 ${adopterId}</div>
          ${t.dedication ? `<div style="font-size:11px; color:#64748b; font-style:italic; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">"${t.dedication}"</div>` : ''}
        </td>
        <td>
          <span class="badge-held-admin">
            <span>💰 ₱${amount.toLocaleString()}</span>
            <span>• Held by Admin</span>
          </span>
          <div style="font-size:10.5px; color:#15803d; font-weight:600; margin-top:3px;">
            ✓ GCash Verified (${t.paymentRef || 'Ref: GCASH-OK'})
          </div>
        </td>
        <td>
          ${waitingBadge}
          ${isOverdue ? '<div style="font-size:10.5px; color:#dc2626; font-weight:700; margin-top:2px;">⚠️ Unclaimed too long</div>' : ''}
        </td>
        <td>
          <span style="font-size:11.5px; font-weight:700; color:#d97706; background:#fffbeb; padding:2px 8px; border-radius:6px; border:1px solid #fde68a;">
            ⏳ Open for Claim
          </span>
        </td>
        <td class="text-center" style="white-space:nowrap;">
          <div style="display:inline-flex; gap:6px;">
            <button type="button" class="btn-assign-caretaker" onclick="openAssignCaretakerModal('${t.id}')" title="Assign Caretaker directly to this tree">
              <span>👤 Assign Caretaker</span>
            </button>
            <button type="button" class="btn-queue-view" onclick="openQueueTreeDetailsModal('${t.id}')" title="Audit & Escrow Details">
              <span>👁️ Details</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderClaimedPayoutsTable(trees) {
  const tbody = document.getElementById('claimedPayoutTbody');
  if (!tbody) return;

  let filtered = trees;
  if (QUEUE_SEARCH_QUERY) {
    filtered = trees.filter(t => {
      const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || t.speciesCommon || '';
      const ct = t.caretaker || '';
      const haystack = `${t.id} ${sp} ${ct} ${t.caretakerId || ''} ${t.adopter || ''}`.toLowerCase();
      return haystack.includes(QUEUE_SEARCH_QUERY);
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:36px 16px; color:#64748b; font-size:13px;">
      <div style="font-size:24px; margin-bottom:6px;">🧑‍🌾</div>
      No claimed trees with verified care records currently require payout authorization.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || t.speciesCommon || 'Tree';
    const ctName = t.caretaker || 'Dodong Zeta';
    const ctId = t.caretakerId || 'CT-101';
    const adopterName = t.adopter || t.sponsorName || 'Community Adopter';
    const adopterId = t.adopterId || 'ADP-101';
    const amount = Number(t.payoutAmount || t.fundingAmount || 500);
    const isReleased = t.payoutStatus === 'Released' || String(t.fundState || '').includes('Released');

    const healthStatus = t.health || t.status || 'Healthy';
    const healthBadge = healthStatus.toLowerCase().includes('healthy')
      ? `<span style="background:#dcfce7; color:#166534; font-weight:800; font-size:11px; padding:2px 7px; border-radius:6px;">🟢 Healthy • Verified</span>`
      : healthStatus.toLowerCase().includes('grow')
      ? `<span style="background:#ecfdf5; color:#047857; font-weight:800; font-size:11px; padding:2px 7px; border-radius:6px;">🌱 Growing</span>`
      : `<span style="background:#fef3c7; color:#92400e; font-weight:800; font-size:11px; padding:2px 7px; border-radius:6px;">🟡 Needs Care</span>`;

    const actionHtml = isReleased
      ? `<span class="badge-payout-released">✓ Disbursed (Ref: ${t.payoutRef || 'GCASH-OUT'})</span>`
      : `<button type="button" class="btn-release-payout" onclick="openReleasePayoutModal('${t.id}')">
          <span>💸 Release GCash Payout</span>
        </button>`;

    return `
      <tr>
        <td>
          <div style="font-weight:800; color:#0f172a; font-size:13.5px;">${t.id}</div>
          <div style="font-size:12px; font-weight:600; color:#166534;">${sp}</div>
          <div style="font-size:11px; color:#64748b;">${t.barangay || 'San Isidro'}</div>
        </td>
        <td>
          <div style="font-weight:700; color:#0f172a; font-size:13px; display:flex; align-items:center; gap:6px;">
            <span>🧑‍🌾 ${ctName}</span>
          </div>
          <span style="font-size:11px; font-weight:800; background:#f0fdf4; color:#166534; padding:1px 6px; border-radius:4px; border:1px solid #bbf7d0;">
            Unified ID: ${ctId}
          </span>
        </td>
        <td>
          <div style="margin-bottom:4px;">${healthBadge}</div>
          <div style="font-size:11.5px; color:#475569; font-weight:600;">
            📷 ${t.inspectionsCount || 2} Care Check-in${(t.inspectionsCount || 2) > 1 ? 's' : ''} Logged
          </div>
          <div style="font-size:11px; color:#64748b;">Last check: ${t.lastCheck || 'Nov 23, 2026'}</div>
        </td>
        <td>
          <div style="font-weight:700; color:#0f172a; font-size:12.5px;">${adopterName}</div>
          <div style="font-size:11px; color:#1d4ed8; font-weight:600;">🆔 ${adopterId}</div>
        </td>
        <td>
          <div style="font-size:15px; font-weight:800; color:#166534;">₱${amount.toLocaleString()}.00</div>
          <div style="font-size:10.5px; color:#64748b;">GCash Escrow</div>
        </td>
        <td>
          ${isReleased 
            ? `<span style="font-size:11px; font-weight:800; color:#166534; background:#dcfce7; padding:3px 8px; border-radius:6px; border:1px solid #86efac;">✅ Released</span>
               <div style="font-size:10px; color:#64748b; margin-top:2px;">${t.payoutReleasedAt ? new Date(t.payoutReleasedAt).toLocaleDateString() : 'Nov 23, 2026'}</div>`
            : `<span style="font-size:11px; font-weight:800; color:#92400e; background:#fef3c7; padding:3px 8px; border-radius:6px; border:1px solid #fde68a;">⏳ Pending Release</span>`
          }
        </td>
        <td class="text-center" style="white-space:nowrap;">
          <div style="display:inline-flex; gap:6px;">
            ${actionHtml}
            <button type="button" class="btn-queue-view" onclick="openQueueTreeDetailsModal('${t.id}')" title="View Verification & Audit">
              <span>👁️</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAssignCaretakerModal(treeId) {
  const allTrees = getQueueTreesFromStorage();
  const tree = allTrees.find(t => String(t.id) === String(treeId));
  if (!tree) return;

  const sp = (typeof tree.species === 'object' && tree.species ? tree.species.common : tree.species) || tree.speciesCommon || 'Tree';
  const adopterName = tree.adopter || tree.sponsorName || 'Community Adopter';
  const adopterId = tree.adopterId || 'ADP-101';
  const daysWaiting = calculateDaysWaiting(tree.fundedAt || tree.createdAt);

  const titleEl = document.getElementById('assignTreeTitle');
  const stageBadgeEl = document.getElementById('assignTreeStageBadge');
  const adopterEl = document.getElementById('assignTreeAdopter');
  const locEl = document.getElementById('assignTreeLocation');
  const escrowEl = document.getElementById('assignTreeEscrow');
  const waitingEl = document.getElementById('assignTreeWaiting');
  const targetInp = document.getElementById('assignTargetTreeId');

  if (titleEl) titleEl.textContent = `${tree.id} — ${sp}`;
  if (stageBadgeEl) stageBadgeEl.textContent = tree.stage || 'Reforestation Tree';
  if (adopterEl) adopterEl.textContent = `${adopterName} (${adopterId})`;
  if (locEl) locEl.textContent = `${tree.barangay || 'San Isidro'} • ${tree.plotBook || 'Zone 1'}`;
  if (escrowEl) escrowEl.textContent = `₱${Number(tree.fundingAmount || 500).toLocaleString()}.00 (GCash)`;
  if (waitingEl) waitingEl.textContent = `${daysWaiting} Day${daysWaiting === 1 ? '' : 's'} in Queue`;
  if (targetInp) targetInp.value = tree.id;

  // Dynamically populate available registered caretakers
  const assignSelect = document.getElementById('assignCaretakerSelect');
  if (assignSelect) {
    let availableCts = [];
    try { availableCts = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]'); } catch (_) {}
    if (Array.isArray(availableCts) && availableCts.length > 0) {
      assignSelect.innerHTML = availableCts.map(c => `
        <option value="${c.id}" data-name="${c.name || c.fullName}" data-email="${c.email || ''}">
          🧑‍🌾 ${c.name || c.fullName} (${c.id} • ${c.barangay || c.primaryArea || 'Catbalogan'})
        </option>
      `).join('');
    } else {
      assignSelect.innerHTML = '<option value="" disabled selected>No field caretakers registered yet (Add in Caretaker Directory)</option>';
    }
  }

  const modal = document.getElementById('modalAdminAssignCaretaker');
  if (modal) modal.classList.remove('hidden');
}
window.openAssignCaretakerModal = openAssignCaretakerModal;

function submitAdminAssignCaretaker() {
  const treeId = document.getElementById('assignTargetTreeId')?.value;
  const select = document.getElementById('assignCaretakerSelect');
  if (!treeId || !select) return;

  const chosenOpt = select.options[select.selectedIndex];
  const ctId = select.value;
  const ctName = chosenOpt ? (chosenOpt.getAttribute('data-name') || '') : '';
  const ctEmail = chosenOpt ? (chosenOpt.getAttribute('data-email') || '') : '';
  const notes = document.getElementById('assignCaretakerNotes')?.value?.trim() || '';

  const allTrees = getQueueTreesFromStorage();
  const treeIdx = allTrees.findIndex(t => String(t.id) === String(treeId));
  if (treeIdx === -1) return;

  const tree = allTrees[treeIdx];
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  tree.caretaker = ctName;
  tree.caretakerId = ctId;
  tree.caretakerEmail = ctEmail;
  tree.caretakerStatus = 'assigned';
  tree.fundState = 'Held by Admin (Escrowed for Caretaker)';
  tree.assignedAt = now.toISOString();
  tree.assignedBy = 'Ethel Zeta (Admin)';
  tree.lastCheck = dateStr;
  tree.careVerified = true;
  tree.inspectionsCount = 1;

  if (!Array.isArray(tree.history)) tree.history = [];
  tree.history.unshift({
    date: dateStr,
    health: tree.health || 'Healthy',
    class: 'healthy',
    notes: `Tree directly assigned by Admin Ethel Zeta to Caretaker ${ctName} (Unified ID: ${ctId}) for Adopter ${tree.adopter || 'Community Sponsor'}. GCash fund (₱${tree.fundingAmount || 500}) held in escrow. ${notes}`
  });

  // Save to localStorage
  try {
    localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(allTrees));
    localStorage.setItem('saplink_trees_cache', JSON.stringify(allTrees));
  } catch (err) {
    console.warn('Error saving trees cache:', err);
  }

  // Dispatch sync events
  window.dispatchEvent(new CustomEvent('ATAMAN:trees-updated', { detail: allTrees }));
  window.dispatchEvent(new CustomEvent('ATAMAN:caretakers-updated', { detail: allTrees }));

  closeAdminQueueModal('modalAdminAssignCaretaker');
  initHeldPaymentsQueueWorkflow(false);

  if (typeof showAdminToast === 'function') {
    showAdminToast(`🤝 Tree ${treeId} successfully assigned to ${ctName} (${ctId})!`, 'success');
  } else {
    alert(`🤝 Tree ${treeId} successfully assigned to Caretaker ${ctName} (${ctId})!`);
  }
}
window.submitAdminAssignCaretaker = submitAdminAssignCaretaker;

function openReleasePayoutModal(treeId) {
  const allTrees = getQueueTreesFromStorage();
  const tree = allTrees.find(t => String(t.id) === String(treeId));
  if (!tree) return;

  const sp = (typeof tree.species === 'object' && tree.species ? tree.species.common : tree.species) || tree.speciesCommon || 'Tree';
  const ctName = tree.caretaker || 'Dodong Zeta';
  const ctId = tree.caretakerId || 'CT-101';
  const adopterName = tree.adopter || tree.sponsorName || 'Community Adopter';
  const adopterId = tree.adopterId || 'ADP-101';
  const amount = Number(tree.fundingAmount || 500);

  const displayEl = document.getElementById('payoutTreeDisplay');
  const locEl = document.getElementById('payoutTreeLocation');
  const amountEl = document.getElementById('payoutAmountDisplay');
  const adopterEl = document.getElementById('payoutAdopterDisplay');
  const ctEl = document.getElementById('payoutCaretakerDisplay');
  const gcashEl = document.getElementById('payoutCaretakerGcash');
  const healthEl = document.getElementById('payoutHealthDisplay');
  const refInp = document.getElementById('payoutGcashRef');
  const dateInp = document.getElementById('payoutDateDisplay');
  const targetInp = document.getElementById('payoutTargetTreeId');

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const randomRef = 'GCASH-OUT-' + Math.floor(100000 + Math.random() * 900000);

  if (displayEl) displayEl.textContent = `${tree.id} — ${sp}`;
  if (locEl) locEl.textContent = `${tree.barangay || 'San Isidro'} • ${tree.plotBook || 'Zone 1'}`;
  if (amountEl) amountEl.textContent = `₱${amount.toLocaleString()}.00`;
  if (adopterEl) adopterEl.textContent = `${adopterName} (${adopterId})`;
  if (ctEl) ctEl.textContent = `${ctName} (${ctId})`;
  if (gcashEl) gcashEl.textContent = ctId === 'CT-102' ? '+63 920 888 9911' : '+63 918 333 4455';
  if (healthEl) healthEl.textContent = `🟢 ${tree.health || 'Healthy'} • Care Verified`;
  if (refInp) refInp.value = randomRef;
  if (dateInp) dateInp.value = dateStr;
  if (targetInp) targetInp.value = tree.id;

  const modal = document.getElementById('modalAdminReleasePayout');
  if (modal) modal.classList.remove('hidden');
}
window.openReleasePayoutModal = openReleasePayoutModal;

function submitAdminReleasePayout() {
  const treeId = document.getElementById('payoutTargetTreeId')?.value;
  const gcashRef = document.getElementById('payoutGcashRef')?.value?.trim();
  const notes = document.getElementById('payoutAdminNotes')?.value?.trim() || 'Caretaker care records verified and incentive released.';
  if (!treeId || !gcashRef) return;

  const allTrees = getQueueTreesFromStorage();
  const treeIdx = allTrees.findIndex(t => String(t.id) === String(treeId));
  if (treeIdx === -1) return;

  const tree = allTrees[treeIdx];
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const amount = Number(tree.fundingAmount || 500);
  const ctName = tree.caretaker || 'Dodong Zeta';
  const ctId = tree.caretakerId || 'CT-101';

  tree.fundState = 'Released to Caretaker';
  tree.payoutStatus = 'Released';
  tree.payoutRef = gcashRef;
  tree.payoutAmount = amount;
  tree.payoutReleasedAt = now.toISOString();
  tree.payoutReleasedBy = 'Ethel Zeta (Admin)';

  if (!Array.isArray(tree.history)) tree.history = [];
  tree.history.unshift({
    date: dateStr,
    health: tree.health || 'Healthy',
    class: 'healthy',
    notes: `💸 GCash Payout of ₱${amount.toLocaleString()} released by Admin Ethel Zeta to Caretaker ${ctName} (${ctId}) under outbound reference ${gcashRef}. ${notes}`
  });

  // Save to localStorage
  try {
    localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(allTrees));
    localStorage.setItem('saplink_trees_cache', JSON.stringify(allTrees));
  } catch (err) {
    console.warn('Error saving trees cache:', err);
  }

  // Dispatch sync events
  window.dispatchEvent(new CustomEvent('ATAMAN:trees-updated', { detail: allTrees }));
  window.dispatchEvent(new CustomEvent('ATAMAN:caretakers-updated', { detail: allTrees }));

  closeAdminQueueModal('modalAdminReleasePayout');
  initHeldPaymentsQueueWorkflow(false);

  if (typeof showAdminToast === 'function') {
    showAdminToast(`💸 Payout of ₱${amount.toLocaleString()} successfully released to ${ctName} (${gcashRef})!`, 'success');
  } else {
    alert(`💸 Payout of ₱${amount.toLocaleString()} successfully released to Caretaker ${ctName} (${gcashRef})!`);
  }
}
window.submitAdminReleasePayout = submitAdminReleasePayout;

function openQueueTreeDetailsModal(treeId) {
  const allTrees = getQueueTreesFromStorage();
  const tree = allTrees.find(t => String(t.id) === String(treeId));
  if (!tree) return;

  const modal = document.getElementById('modalQueueTreeDetails');
  const titleEl = document.getElementById('auditModalTitle');
  const bodyEl = document.getElementById('auditModalBody');
  if (!modal || !bodyEl) return;

  const sp = (typeof tree.species === 'object' && tree.species ? tree.species.common : tree.species) || tree.speciesCommon || 'Tree';
  const sci = (typeof tree.species === 'object' && tree.species ? tree.species.scientific : '') || tree.scientificName || '';
  const amount = Number(tree.fundingAmount || 500);
  const isReleased = tree.payoutStatus === 'Released' || String(tree.fundState || '').includes('Released');

  if (titleEl) titleEl.textContent = `Tree ${tree.id} — Audit & Escrow Record`;

  bodyEl.innerHTML = `
    <div style="background:#fdfdf5; border:1.5px solid #dcfce7; border-radius:12px; padding:16px; margin-bottom:18px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div>
          <h4 style="margin:0; font-size:16px; font-weight:800; color:#0f172a;">${tree.id} — ${sp}</h4>
          <div style="font-size:12px; font-style:italic; color:#64748b;">${sci}</div>
        </div>
        <span style="background:#166534; color:#fff; font-size:11px; font-weight:800; padding:3px 9px; border-radius:999px;">
          ${tree.stage || 'Reforestation Tree'}
        </span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; font-size:12.5px; border-top:1px solid #e2e8f0; padding-top:10px;">
        <div><strong>Planting Zone:</strong> <span style="color:#166534;">${tree.plantingZone || 'Zone 1'}</span></div>
        <div><strong>Plot / Book:</strong> <span>${tree.plotBook || 'Plot A-01'}</span></div>
        <div><strong>GPS Location:</strong> <span>${tree.lat ? `${Number(tree.lat).toFixed(4)}° N, ${Number(tree.lng).toFixed(4)}° E` : 'Catbalogan GPS'}</span></div>
        <div><strong>Barangay:</strong> <span>${tree.barangay || 'San Isidro'}</span></div>
      </div>
    </div>

    <!-- Adopter & Inbound GCash Payment -->
    <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:18px;">
      <h5 style="margin:0 0 10px 0; font-size:13px; font-weight:800; color:#1d4ed8; text-transform:uppercase;">🤝 Adopter Account &amp; GCash Inbound Payment</h5>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; font-size:12.5px;">
        <div><strong>Adopter Name:</strong> <span>${tree.adopter || tree.sponsorName || 'Community Adopter'}</span></div>
        <div><strong>Adopter ID:</strong> <span style="color:#1d4ed8; font-weight:700;">${tree.adopterId || 'ADP-101'}</span></div>
        <div><strong>Payment Method:</strong> <span>GCash Mobile</span></div>
        <div><strong>GCash Inbound Ref:</strong> <span style="font-family:monospace; font-weight:700; color:#166534;">${tree.paymentRef || 'GCASH-982417283'}</span></div>
        <div><strong>Escrow Amount:</strong> <strong style="color:#166534;">₱${amount.toLocaleString()}.00</strong></div>
        <div><strong>Fund State:</strong> <span style="background:#fef3c7; color:#92400e; font-weight:800; padding:2px 6px; border-radius:4px;">${tree.fundState || 'Held by Admin'}</span></div>
      </div>
      ${tree.dedication ? `<div style="margin-top:10px; padding:8px 12px; background:#f8fafc; border-radius:6px; font-size:12px; font-style:italic; color:#475569;">Dedication: "${tree.dedication}"</div>` : ''}
    </div>

    <!-- Caretaker & Outbound Disbursement -->
    <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:18px;">
      <h5 style="margin:0 0 10px 0; font-size:13px; font-weight:800; color:#166534; text-transform:uppercase;">🧑‍🌾 Caretaker Stewardship &amp; Outbound Payout</h5>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; font-size:12.5px;">
        <div><strong>Assigned Caretaker:</strong> <span>${tree.caretaker && tree.caretaker !== 'Awaiting Caretaker' ? tree.caretaker : '⏳ Awaiting Caretaker Claim'}</span></div>
        <div><strong>Caretaker ID:</strong> <span style="font-weight:700; color:#166534;">${tree.caretakerId || 'Pending'}</span></div>
        <div><strong>Field Health Status:</strong> <span style="font-weight:700; color:#166534;">🟢 ${tree.health || 'Healthy'}</span></div>
        <div><strong>Payout Status:</strong> <span style="font-weight:700; color:${isReleased ? '#166534' : '#92400e'};">${isReleased ? '✅ Disbursed' : '⏳ Pending Release'}</span></div>
        ${isReleased ? `
          <div><strong>GCash Outbound Ref:</strong> <span style="font-family:monospace; font-weight:700; color:#166534;">${tree.payoutRef || 'GCASH-OUT'}</span></div>
          <div><strong>Release Date:</strong> <span>${tree.payoutReleasedAt ? new Date(tree.payoutReleasedAt).toLocaleString() : 'Nov 23, 2026'}</span></div>
        ` : ''}
      </div>
    </div>

    <!-- History Audit Logs -->
    <div>
      <h5 style="margin:0 0 8px 0; font-size:12px; font-weight:800; color:#475569; text-transform:uppercase;">📜 Stewardship Audit Trail</h5>
      <div style="max-height:160px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; background:#f8fafc; font-size:11.5px;">
        ${Array.isArray(tree.history) && tree.history.length > 0 ? tree.history.map(h => `
          <div style="padding:4px 0; border-bottom:1px solid #edf2f7;">
            <strong style="color:#0f172a;">${h.date}:</strong> <span style="color:#475569;">${h.notes}</span>
          </div>
        `).join('') : '<div style="color:#94a3b8;">No previous history records logged.</div>'}
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}
window.openQueueTreeDetailsModal = openQueueTreeDetailsModal;

function closeAdminQueueModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}
window.closeAdminQueueModal = closeAdminQueueModal;

// Auto-boot Held Payments & Caretaker Queue on DOM or if URL has ?view=queue
document.addEventListener('DOMContentLoaded', () => {
  const isQueueView = window.location.search.includes('view=queue') || window.location.hash === '#queue';
  if (isQueueView) {
    switchAdminCaretakersView('queue');
  } else {
    // Background init so badges and counts are immediately up to date
    initHeldPaymentsQueueWorkflow(false);
  }
});
