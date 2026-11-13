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

  const DEFAULT_CARETAKERS = (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_CARETAKERS) && window.ATAMAN_DEFAULT_CARETAKERS.length > 0)
    ? window.ATAMAN_DEFAULT_CARETAKERS
    : [
      {
        id: 'CT-101',
        empId: 'EMP-002',
        name: 'Dodong Zeta',
        fullName: 'Dodong Zeta',
        email: 'zetadodong@gmail.com',
        phone: '+63 918 333 4455',
        address: 'Brgy. Canlapwas, Catbalogan City, Samar',
        role: 'Field Caretaker',
        status: 'Active',
        treesAssigned: 0,
        assignedTreeCount: 0,
        location: 'Catbalogan City & Jiabong, Samar',
        municipality: 'Catbalogan City',
        barangay: 'Canlapwas',
        assignedTrees: [],
        assignedAdopterName: 'Nikki Maga',
        joinedDate: '2026-08-01',
        createdAt: '2026-08-01T08:00:00.000Z',
        performanceRating: '98%',
        inspectionsLogged: 0,
        survivalRate: '96.8%'
      }
    ];
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

  try {
    if (caretakersList.length > 0) {
      // Clean any previously generated synthetic percentages and clear schedules
      let allTrees = [];
      try { allTrees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]'); } catch (_) {}
      let sysTotal = 0, sysH = 0, sysNC = 0, sysCR = 0, sysD = 0;
      if (Array.isArray(allTrees)) {
        allTrees.forEach(t => {
          const cnt = Math.max(1, parseInt(t.treeCount) || 1);
          sysTotal += cnt;
          const st = (t.status || 'healthy').toLowerCase();
          if (st === 'healthy') sysH += cnt;
          else if (st === 'needs-care' || st === 'needs') sysNC += cnt;
          else if (st === 'critical') sysCR += cnt;
          else if (st === 'dead') sysD += cnt;
          else sysH += cnt;
        });
      }

      caretakersList.forEach(ct => {
        if (!ct.treesCondition) ct.treesCondition = { healthy: 0, care: 0, critical: 0, dead: 0 };
        const ctName = (ct.name || '').toLowerCase().trim();
        const ctAdopter = (ct.assignedAdopterName || '').toLowerCase().trim();
        // Sync assigned tree counts & health breakdown strictly from trees assigned to this caretaker or their assigned adopter
        const ctTrees = Array.isArray(allTrees) ? allTrees.filter(t => {
          const treeCt = (t.caretaker || '').toLowerCase().trim();
          const treeAd = (t.adopter || t.sponsorName || '').toLowerCase().trim();
          return (ctName && treeCt === ctName) || (ctAdopter && treeAd && treeAd === ctAdopter);
        }) : [];
        let cTotal = 0, cH = 0, cNC = 0, cCR = 0, cD = 0;
        ctTrees.forEach(t => {
          const cnt = Math.max(1, parseInt(t.treeCount) || 1);
          cTotal += cnt;
          const st = (t.status || 'healthy').toLowerCase();
          if (st === 'healthy') cH += cnt;
          else if (st === 'needs-care' || st === 'needs') cNC += cnt;
          else if (st === 'critical') cCR += cnt;
          else if (st === 'dead') cD += cnt;
          else cH += cnt;
        });
        ct.assignedTrees = cTotal;
        ct.treesCondition = { healthy: cH, care: cNC, critical: cCR, dead: cD };
        // Clear all mock schedules so caretaker can put updated schedule monitor
        if (!ct._schedulesClearedV2) {
          ct.schedule = [];
          ct._schedulesClearedV2 = true;
        }
        if (!Array.isArray(ct.schedule)) {
          ct.schedule = [];
        }
      });
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
      const initials = ct.name.split(' ').map(n => n[0]).join('').substring(0, 2);
      const isInactive = ct.status === 'Inactive';
      const healthy = ct.treesCondition?.healthy || 0;
      const critical = ct.treesCondition?.critical || 0;
      const pending = ct.pendingMonitoring || 0;

      return `
        <tr>
          <td>
            <div class="ct-profile-cell">
              <div class="ct-avatar ${isInactive ? 'inactive' : ''}">${initials}</div>
              <div class="ct-info-meta">
                <button class="ct-name-btn" data-id="${ct.id}">${ct.name}</button>
                <span class="ct-sub-loc">${ct.primaryArea} • ${ct.assignedTreeType || 'Native Hardwood'} • ${ct.phone}</span>
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

      window._selectedCaretakerUser = chosen;

      // 1. Full Name
      const nameInp = document.getElementById('addFullName');
      if (nameInp) {
        nameInp.value = chosen.name || '';
        nameInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 2. Employee ID (use registered if present, else keep auto-generated)
      const empInp = document.getElementById('addEmpId');
      if (empInp && chosen.empId) {
        empInp.value = chosen.empId;
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

      // 8. Visual Confirmation & Account Link Badge
      if (feedback) {
        feedback.style.display = 'flex';
        const feedbackText = document.getElementById('caretakerSelectFeedbackText');
        if (feedbackText) {
          feedbackText.textContent = `✓ Auto-filled and linked to registered account: ${chosen.name} (${chosen.email || chosen.empId || 'Verified'})`;
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

  openAddCaretakerModalBtn.addEventListener('click', () => {
    updateCaretakerBarangays();
    populateRealtimeAdopters();
    addCaretakerForm.reset();
    window._selectedCaretakerUser = null;
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
    addCaretakerModal.classList.remove('hidden');
  });

  const closeAddModal = () => {
    addCaretakerModal.classList.add('hidden');
    window._selectedCaretakerUser = null;
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

    const newCt = {
      id: (selectedCaretaker && selectedCaretaker.id && String(selectedCaretaker.id).startsWith('ct-')) ? selectedCaretaker.id : (selectedCaretaker?.id || `ct-custom-${Date.now()}`),
      userId: selectedCaretaker?.id || '',
      userEmail: email,
      accountLinked: true,
      registeredCaretaker: true,
      name: fullName,
      empId: empId,
      email: email,
      phone: phone,
      address: address,
      status: 'Active',
      primaryArea: barangay,
      assignedTreeType: treeType,
      assignedAdopter: assignedAdopter,
      assignedAdopterName: assignedAdopterName,
      dateJoined: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      assignedTrees: initTrees,
      treesCondition: { healthy: 0, care: 0, critical: 0, dead: 0 },
      pendingMonitoring: 0,
      overdueMonitoring: 0,
      completedMonitoring: 0,
      completionRate: 0,
      onTimeRate: 100,
      avgWeeklyMonitored: 0,
      monitoredThisMonth: 0,
      photosUploaded: 0,
      maintenanceRecords: 0,
      assignedBarangays: [barangay],
      assignedProjects: [project],
      assignedFarms: [],
      areaBreakdown: initTrees > 0 ? [{ area: barangay, count: initTrees, percent: 100 }] : [],
      monthlyTrend: { july: 0, august: 0, septProj: 0 },
      schedule: [],
      recentActivity: [],
      criticalTrees: [],
      maintenance: { watering: 0, fert: 0, pest: 0, weed: 0, prune: 0, recentLog: null },
      photos: []
    };

    // Check if caretaker already exists in list (by empId, email, or id)
    const existingIdx = caretakersList.findIndex(c => {
      if (!c) return false;
      const em = (c.email || '').toLowerCase().trim();
      const idMatch = c.empId && c.empId.toLowerCase().trim() === empId.toLowerCase().trim();
      const emailMatch = em && email && em === email.toLowerCase().trim();
      return idMatch || emailMatch;
    });

    if (existingIdx >= 0) {
      caretakersList[existingIdx] = { ...caretakersList[existingIdx], ...newCt };
    } else {
      caretakersList.unshift(newCt);
    }

    try {
      localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakersList));
      if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyCaretakers === 'function') {
        window.ATAMAN_SYNC.notifyCaretakers(caretakersList);
      }
      if (window.ATAMAN_DB && typeof window.ATAMAN_DB.addCaretaker === 'function') {
        window.ATAMAN_DB.addCaretaker(newCt);
      }
    } catch(e) {}
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
          updateOverviewCards();
          renderTable();
        }
      });
    } else if (typeof window.ATAMAN_DB.getCaretakers === 'function') {
      window.ATAMAN_DB.getCaretakers().then(stored => {
        if (Array.isArray(stored) && stored.length > 0) {
          caretakersList = stored;
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
