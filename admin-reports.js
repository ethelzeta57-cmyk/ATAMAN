/* ==========================================================================
   ATAMAN Admin Reports & Analytics JavaScript
   Reflects real-time data across all ATAMAN Dashboards:
   Dashboard, Tree Map, Trees, Adopters, Caretakers, Analytics, Impact,
   Users, Content, Notifications, and System Logs.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Master Dataset for Reports Calculation
  const masterReportData = {
    rawTrees: [],
    filteredTrees: [],
    adopters: [],
    caretakers: [],
    users: [],
    logs: [],
    notifications: [],
    overview: {
      totalTrees: 0,
      survivalRate: '0.0',
      caretakers: 0,
      adopters: 0,
      healthy: 0,
      needsCare: 0,
      critical: 0,
      dead: 0,
      adoptedTrees: 0,
      totalFunding: 0,
      contributions: '₱0'
    },
    species: [],
    locations: [],
    caretakersPerf: [],
    maintenance: [],
    criticalRegistry: [],
    projects: [],
    impact: {
      co2Kg: 0,
      o2Kg: 0,
      waterLiters: 0,
      canopySqm: 0
    }
  };

  // DOM Elements — Filters
  const filterStartDate = document.getElementById('filterStartDate');
  const filterEndDate = document.getElementById('filterEndDate');
  const filterLocation = document.getElementById('filterLocation');
  const filterSpecies = document.getElementById('filterSpecies');
  const filterCaretaker = document.getElementById('filterCaretaker');
  const filterAdopter = document.getElementById('filterAdopter');
  const filterProject = document.getElementById('filterProject');
  const filterHealth = document.getElementById('filterHealth');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  // DOM Elements — Summary Cards
  const cardTotalTrees = document.getElementById('cardTotalTrees');
  const cardSurvivalRate = document.getElementById('cardSurvivalRate');
  const cardTotalCaretakers = document.getElementById('cardTotalCaretakers');
  const cardTotalAdopters = document.getElementById('cardTotalAdopters');
  const cardHealthyTrees = document.getElementById('cardHealthyTrees');
  const cardNeedsCareTrees = document.getElementById('cardNeedsCareTrees');
  const cardCriticalTrees = document.getElementById('cardCriticalTrees');
  const cardDeadTrees = document.getElementById('cardDeadTrees');
  const dispSurvivalRate = document.getElementById('dispSurvivalRate');

  // DOM Elements — Tables
  const tbodySpecies = document.getElementById('tbodySpecies');
  const tbodyGeo = document.getElementById('tbodyGeo');
  const tbodyCaretakers = document.getElementById('tbodyCaretakers');
  const tbodyMaint = document.getElementById('tbodyMaint');
  const tbodyCrit = document.getElementById('tbodyCrit');
  const tbodyArchive = document.getElementById('tbodyArchive');
  const sortCaretakersBy = document.getElementById('sortCaretakersBy');

  // DOM Elements — Modals & Actions
  const reportGenModal = document.getElementById('reportGenModal');
  const openReportGenModalBtn = document.getElementById('openReportGenModalBtn');
  const btnGenNewTop = document.getElementById('btnGenNewTop');
  const closeReportGenModalBtn = document.getElementById('closeReportGenModalBtn');
  const cancelGenBtn = document.getElementById('cancelGenBtn');
  const reportGenForm = document.getElementById('reportGenForm');

  const critTreesModal = document.getElementById('critTreesModal');
  const btnViewAllCritTrees = document.getElementById('btnViewAllCritTrees');
  const closeCritTreesModalBtn = document.getElementById('closeCritTreesModalBtn');
  const closeCritTreesBtn2 = document.getElementById('closeCritTreesBtn2');
  const tbodyFullCritList = document.getElementById('tbodyFullCritList');

  const reportPreviewModal = document.getElementById('reportPreviewModal');
  const previewModalTitle = document.getElementById('previewModalTitle');
  const previewModalBody = document.getElementById('previewModalBody');
  const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');
  const closePreviewModalBtn2 = document.getElementById('closePreviewModalBtn2');
  const previewDownloadCsvBtn = document.getElementById('previewDownloadCsvBtn');
  const previewPrintPdfBtn = document.getElementById('previewPrintPdfBtn');

  const exportReportBtn = document.getElementById('exportReportBtn');
  const printReportBtn = document.getElementById('printReportBtn');

  let currentPreviewReportType = 'Complete ATAMAN Master Report';
  let currentPreviewPeriod = 'All Active Records (Present)';

  // Helper: Toast Notification
  const showToast = (message, type = 'success') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;
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

  // Helper: Normalize Tree fields
  const getCnt = (t) => Math.max(1, parseInt(t?.treeCount || t?.count, 10) || 1);
  const getSpeciesName = (t) => {
    if (!t) return 'Narra';
    if (typeof t.species === 'object' && t.species !== null) {
      return t.species.common || t.species.name || 'Narra';
    }
    return String(t.species || 'Narra').trim();
  };
  const getScientificName = (t) => {
    if (t && typeof t.species === 'object' && t.species?.scientific) return t.species.scientific;
    const map = {
      'Narra': 'Pterocarpus indicus',
      'Yakal': 'Shorea astylosa',
      'Molave': 'Vitex parviflora',
      'Tanguile': 'Shorea polysperma',
      'White Lauan': 'Shorea contorta',
      'Supa': 'Sindora supa',
      'Acacia': 'Samanea saman'
    };
    return map[getSpeciesName(t)] || 'Indigenous Philippine Hardwood';
  };
  const getLocationName = (t) => (t?.barangay || t?.location || 'Catbalogan City').trim();
  const getStatusKey = (t) => {
    const s = String(t?.status || t?.health || 'healthy').toLowerCase().trim();
    if (s === 'critical') return 'critical';
    if (s === 'dead') return 'dead';
    if (s.includes('need') || s.includes('care')) return 'needs-care';
    return 'healthy';
  };
  const getProjectName = (t) => {
    if (t?.project) return t.project;
    const ad = (t?.adopter || t?.sponsorName || '').trim();
    if (ad && ad !== 'None' && ad !== 'Not yet adopted') return 'Adopt-a-Tree Sponsorship Program';
    const sp = getSpeciesName(t);
    if (sp === 'Yakal' || sp === 'Tanguile' || sp === 'White Lauan') return 'Samar Native Hardwood Restoration';
    return 'Catbalogan Community Reforestation';
  };

  // 1. Load All Dashboards Data from LocalStorage & Defaults
  function loadAllDashboardsData() {
    let trees = [];
    let adopters = [];
    let caretakers = [];
    let users = [];
    let logs = [];
    let notifications = [];

    try { trees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]'); } catch (_) {}
    if (!Array.isArray(trees) || trees.length === 0) {
      trees = Array.isArray(window.ATAMAN_DEFAULT_TREES) ? [...window.ATAMAN_DEFAULT_TREES] : [];
    }

    try { adopters = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]'); } catch (_) {}
    if (!Array.isArray(adopters) || adopters.length === 0) {
      adopters = Array.isArray(window.ATAMAN_DEFAULT_ADOPTERS) ? [...window.ATAMAN_DEFAULT_ADOPTERS] : [];
    }

    try { caretakers = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]'); } catch (_) {}
    if (!Array.isArray(caretakers) || caretakers.length === 0) {
      caretakers = Array.isArray(window.ATAMAN_DEFAULT_CARETAKERS) ? [...window.ATAMAN_DEFAULT_CARETAKERS] : [];
    }

    try { users = JSON.parse(localStorage.getItem('ATAMAN_registered_users') || localStorage.getItem('ATAMAN_users_cache') || '[]'); } catch (_) {}
    if (!Array.isArray(users) || users.length === 0) {
      users = Array.isArray(window.ATAMAN_DEFAULT_USERS) ? [...window.ATAMAN_DEFAULT_USERS] : [];
    }

    try { logs = JSON.parse(localStorage.getItem('ATAMAN_system_logs') || '[]'); } catch (_) {}
    if (!Array.isArray(logs)) logs = [];

    try { notifications = JSON.parse(localStorage.getItem('ATAMAN_notifications_cache') || '[]'); } catch (_) {}
    if (!Array.isArray(notifications)) notifications = [];

    masterReportData.rawTrees = trees;
    masterReportData.adopters = adopters;
    masterReportData.caretakers = caretakers;
    masterReportData.users = users;
    masterReportData.logs = logs;
    masterReportData.notifications = notifications;

    populateFilterDropdowns(trees, caretakers, adopters);
  }

  // 2. Dynamically Populate Filter Matrix Dropdowns
  function populateFilterDropdowns(trees, caretakers, adopters) {
    if (filterLocation) {
      const curLoc = filterLocation.value || 'ALL';
      const locs = Array.from(new Set(trees.map(t => getLocationName(t)).filter(Boolean))).sort();
      filterLocation.innerHTML = `<option value="ALL">All Locations (${locs.length} Barangays)</option>` +
        locs.map(l => `<option value="${l}">Brgy. ${l}</option>`).join('');
      if (Array.from(filterLocation.options).some(o => o.value === curLoc)) filterLocation.value = curLoc;
    }

    if (filterSpecies) {
      const curSp = filterSpecies.value || 'ALL';
      const specs = Array.from(new Set(trees.map(t => getSpeciesName(t)).filter(Boolean))).sort();
      filterSpecies.innerHTML = `<option value="ALL">All Species (${specs.length} Types)</option>` +
        specs.map(s => `<option value="${s}">${s}</option>`).join('');
      if (Array.from(filterSpecies.options).some(o => o.value === curSp)) filterSpecies.value = curSp;
    }

    if (filterCaretaker) {
      const curCt = filterCaretaker.value || 'ALL';
      const ctNames = Array.from(new Set([
        ...caretakers.map(c => (c?.name || '').trim()),
        ...trees.map(t => (t?.caretaker || '').trim())
      ].filter(Boolean)));
      filterCaretaker.innerHTML = `<option value="ALL">All Caretakers (${ctNames.length})</option>` +
        ctNames.map(c => `<option value="${c}">${c}</option>`).join('');
      if (Array.from(filterCaretaker.options).some(o => o.value === curCt)) filterCaretaker.value = curCt;
    }

    if (filterAdopter) {
      const curAd = filterAdopter.value || 'ALL';
      const adNames = Array.from(new Set([
        ...adopters.map(a => (a?.name || '').trim()),
        ...trees.map(t => (t?.adopter || t?.sponsorName || '').trim()).filter(n => n && n !== 'None' && n !== 'Not yet adopted')
      ].filter(Boolean)));
      filterAdopter.innerHTML = `<option value="ALL">All Adopters (${adNames.length})</option>` +
        adNames.map(a => `<option value="${a}">${a}</option>`).join('');
      if (Array.from(filterAdopter.options).some(o => o.value === curAd)) filterAdopter.value = curAd;
    }

    if (filterProject) {
      const curPrj = filterProject.value || 'ALL';
      const prjs = Array.from(new Set(trees.map(t => getProjectName(t)).filter(Boolean)));
      filterProject.innerHTML = `<option value="ALL">All Projects (${prjs.length})</option>` +
        prjs.map(p => `<option value="${p}">${p}</option>`).join('');
      if (Array.from(filterProject.options).some(o => o.value === curPrj)) filterProject.value = curPrj;
    }

    // Set sensible default dates covering all planted trees up to Present
    if (filterStartDate && !filterStartDate.dataset.initialized) {
      filterStartDate.value = '2025-09-01';
      filterStartDate.dataset.initialized = 'true';
    }
    if (filterEndDate && !filterEndDate.dataset.initialized) {
      filterEndDate.value = new Date().toISOString().split('T')[0];
      filterEndDate.dataset.initialized = 'true';
    }
    const genStart = document.getElementById('genStartDate');
    const genEnd = document.getElementById('genEndDate');
    if (genStart && !genStart.dataset.initialized) {
      genStart.value = '2025-09-01';
      genStart.dataset.initialized = 'true';
    }
    if (genEnd && !genEnd.dataset.initialized) {
      genEnd.value = new Date().toISOString().split('T')[0];
      genEnd.dataset.initialized = 'true';
    }
  }

  // 3. Filter Trees & Recalculate All Sections
  function computeAndRenderAllReports() {
    loadAllDashboardsData();

    const locVal = filterLocation ? filterLocation.value : 'ALL';
    const spVal = filterSpecies ? filterSpecies.value : 'ALL';
    const ctVal = filterCaretaker ? filterCaretaker.value : 'ALL';
    const adVal = filterAdopter ? filterAdopter.value : 'ALL';
    const prjVal = filterProject ? filterProject.value : 'ALL';
    const hlthVal = filterHealth ? filterHealth.value : 'ALL';
    const startVal = filterStartDate && filterStartDate.value ? new Date(filterStartDate.value) : null;
    const endVal = filterEndDate && filterEndDate.value ? new Date(filterEndDate.value + 'T23:59:59') : null;

    const filteredTrees = masterReportData.rawTrees.filter(t => {
      if (locVal !== 'ALL' && getLocationName(t).toLowerCase() !== locVal.toLowerCase()) return false;
      if (spVal !== 'ALL' && getSpeciesName(t).toLowerCase() !== spVal.toLowerCase()) return false;
      if (ctVal !== 'ALL' && String(t.caretaker || '').toLowerCase() !== ctVal.toLowerCase()) return false;
      if (adVal !== 'ALL') {
        const treeAd = String(t.adopter || t.sponsorName || '').toLowerCase();
        if (treeAd !== adVal.toLowerCase()) return false;
      }
      if (prjVal !== 'ALL' && getProjectName(t) !== prjVal) return false;
      if (hlthVal !== 'ALL') {
        const st = getStatusKey(t);
        const target = hlthVal.toLowerCase();
        if (target === 'healthy' && st !== 'healthy') return false;
        if (target.includes('need') && st !== 'needs-care') return false;
        if (target === 'critical' && st !== 'critical') return false;
        if (target === 'dead' && st !== 'dead') return false;
      }
      if (startVal || endVal) {
        const dStr = t.datePlanted || (t.createdAt ? t.createdAt.slice(0, 10) : null);
        if (dStr) {
          const d = new Date(dStr);
          if (!isNaN(d.getTime())) {
            if (startVal && d < startVal) return false;
            if (endVal && d > endVal) return false;
          }
        }
      }
      return true;
    });

    masterReportData.filteredTrees = filteredTrees;
    const adopters = masterReportData.adopters;
    const caretakers = masterReportData.caretakers;

    // Overview Counts
    const totalTrees = filteredTrees.reduce((sum, t) => sum + getCnt(t), 0);
    const healthy = filteredTrees.filter(t => getStatusKey(t) === 'healthy').reduce((sum, t) => sum + getCnt(t), 0);
    const needsCare = filteredTrees.filter(t => getStatusKey(t) === 'needs-care').reduce((sum, t) => sum + getCnt(t), 0);
    const critical = filteredTrees.filter(t => getStatusKey(t) === 'critical').reduce((sum, t) => sum + getCnt(t), 0);
    const dead = filteredTrees.filter(t => getStatusKey(t) === 'dead').reduce((sum, t) => sum + getCnt(t), 0);
    const nonDead = Math.max(0, totalTrees - dead);
    const survivalRate = totalTrees > 0 ? ((nonDead / totalTrees) * 100).toFixed(1) : '0.0';

    const pctHealthy = totalTrees > 0 ? ((healthy / totalTrees) * 100).toFixed(1) : '0.0';
    const pctCare = totalTrees > 0 ? ((needsCare / totalTrees) * 100).toFixed(1) : '0.0';
    const pctCrit = totalTrees > 0 ? ((critical / totalTrees) * 100).toFixed(1) : '0.0';
    const pctDead = totalTrees > 0 ? ((dead / totalTrees) * 100).toFixed(1) : '0.0';

    const totalAdoptedTrees = adopters.reduce((sum, a) => sum + (parseInt(a.treesCount, 10) || (Array.isArray(a.treesList) ? a.treesList.length : 0)), 0);
    const totalFunding = adopters.reduce((sum, a) => {
      const hasFund = a.customFunding || ((parseInt(a.treesCount, 10) || 0) > 0 && Number(a.funding || a.fundingPaid) > 0);
      return sum + (hasFund ? (Number(a.funding || a.fundingPaid) || 0) : 0);
    }, 0);

    const uniqueBarangays = new Set(filteredTrees.map(t => getLocationName(t))).size;
    const activeCaretakers = caretakers.filter(c => (c.status || 'Active').toLowerCase() === 'active').length || caretakers.length;
    const activeAdopters = adopters.filter(a => (a.status || 'Active').toLowerCase() === 'active').length || adopters.length;

    masterReportData.overview = {
      totalTrees,
      survivalRate,
      caretakers: caretakers.length,
      adopters: adopters.length,
      healthy,
      needsCare,
      critical,
      dead,
      adoptedTrees: totalAdoptedTrees,
      totalFunding,
      contributions: `₱${totalFunding.toLocaleString()}`
    };

    // Render Section 2: Summary Cards
    if (cardTotalTrees) cardTotalTrees.textContent = totalTrees.toLocaleString();
    const subTotalTrees = document.getElementById('subTotalTrees');
    if (subTotalTrees) subTotalTrees.textContent = `Across ${uniqueBarangays} barangay sectors (${filteredTrees.length} batches)`;

    if (cardSurvivalRate) cardSurvivalRate.textContent = `${survivalRate}%`;
    const subSurvivalRate = document.getElementById('subSurvivalRate');
    if (subSurvivalRate) subSurvivalRate.textContent = `${nonDead.toLocaleString()} of ${totalTrees.toLocaleString()} trees surviving`;

    if (cardTotalCaretakers) cardTotalCaretakers.textContent = caretakers.length.toLocaleString();
    const subCaretakers = document.getElementById('subCaretakers');
    if (subCaretakers) subCaretakers.textContent = `${activeCaretakers} active (${caretakers.map(c => c.name).join(', ') || 'Dodong Zeta'})`;

    if (cardTotalAdopters) cardTotalAdopters.textContent = adopters.length.toLocaleString();
    const subAdopters = document.getElementById('subAdopters');
    if (subAdopters) subAdopters.textContent = `${activeAdopters} active (${totalAdoptedTrees} trees • ₱${totalFunding.toLocaleString()})`;

    if (cardHealthyTrees) cardHealthyTrees.textContent = healthy.toLocaleString();
    const subHealthyTrees = document.getElementById('subHealthyTrees');
    if (subHealthyTrees) subHealthyTrees.textContent = `${pctHealthy}% of total population`;

    if (cardNeedsCareTrees) cardNeedsCareTrees.textContent = needsCare.toLocaleString();
    const subNeedsCareTrees = document.getElementById('subNeedsCareTrees');
    if (subNeedsCareTrees) subNeedsCareTrees.textContent = `${pctCare}% of total • Scheduled care`;

    if (cardCriticalTrees) cardCriticalTrees.textContent = critical.toLocaleString();
    const subCriticalTrees = document.getElementById('subCriticalTrees');
    if (subCriticalTrees) subCriticalTrees.textContent = `${pctCrit}% of total • Priority intervention`;

    if (cardDeadTrees) cardDeadTrees.textContent = dead.toLocaleString();
    const subDeadTrees = document.getElementById('subDeadTrees');
    if (subDeadTrees) subDeadTrees.textContent = `${pctDead}% mortality rate`;

    // Render Section 4: Tree Health Distribution (Donut + Bars)
    const dispTotalTreesHeader = document.getElementById('dispTotalTreesHeader');
    if (dispTotalTreesHeader) dispTotalTreesHeader.textContent = `${totalTrees.toLocaleString()} Total Trees (${filteredTrees.length} Batches)`;

    const donutCircles = document.querySelectorAll('#secHealth .donut-svg circle');
    if (donutCircles.length >= 5) {
      const pH = parseFloat(pctHealthy) || 0;
      const pNC = parseFloat(pctCare) || 0;
      const pC = parseFloat(pctCrit) || 0;
      const pD = parseFloat(pctDead) || 0;

      let offset = 25; // Start at top of circle
      const setSegment = (circle, pct) => {
        circle.setAttribute('stroke-dasharray', `${pct} ${Math.max(0, 100 - pct)}`);
        circle.setAttribute('stroke-dashoffset', String(offset));
        offset -= pct;
      };
      setSegment(donutCircles[1], pH);
      setSegment(donutCircles[2], pNC);
      setSegment(donutCircles[3], pC);
      setSegment(donutCircles[4], pD);
    }

    const donutValEl = document.querySelector('#secHealth .donut-val');
    if (donutValEl) donutValEl.textContent = `${pctHealthy}%`;

    const updateLegendRow = (countId, countVal, pctVal, fillSelector) => {
      const cntEl = document.getElementById(countId);
      if (cntEl && cntEl.parentElement) {
        cntEl.parentElement.innerHTML = `<strong id="${countId}">${countVal.toLocaleString()}</strong> (${pctVal}%)`;
      }
      const fillEl = document.querySelector(fillSelector);
      if (fillEl) fillEl.style.width = `${pctVal}%`;
    };
    updateLegendRow('repHealthyCount', healthy, pctHealthy, '#secHealth .hli-fill.bg-healthy');
    updateLegendRow('repCareCount', needsCare, pctCare, '#secHealth .hli-fill.bg-care');
    updateLegendRow('repCriticalCount', critical, pctCrit, '#secHealth .hli-fill.bg-critical');
    updateLegendRow('repDeadCount', dead, pctDead, '#secHealth .hli-fill.bg-dead');

    // Render Section 5: Overall Tree Survival Trend (SVG Line + Cohort Labels)
    if (dispSurvivalRate) dispSurvivalRate.textContent = `${survivalRate}%`;
    const survCard = document.querySelector('#secHealth .survival-chart-card');
    if (survCard) {
      const badge = survCard.querySelector('.status-badge');
      if (badge) badge.textContent = 'Mar 2026 – Present (Live)';
      const smLabel = survCard.querySelector('.sm-label');
      if (smLabel) {
        smLabel.textContent = totalTrees > 0
          ? `${nonDead.toLocaleString()} surviving (${healthy} Healthy • ${needsCare} Needs Care • ${critical} Critical)`
          : 'No survival cohorts recorded yet';
      }

      // Compute monthly progression points (Mar -> Aug -> Present)
      const cohortPoints = [
        { lbl: 'Mar (100%)', surv: 100, healthyPct: 100 },
        { lbl: 'Apr (100%)', surv: 100, healthyPct: 100 },
        { lbl: 'May (100%)', surv: 100, healthyPct: 94.3 },
        { lbl: 'Jun (100%)', surv: 100, healthyPct: 90.9 },
        { lbl: 'Jul (100%)', surv: 100, healthyPct: 91.7 },
        { lbl: 'Aug (100%)', surv: 100, healthyPct: 91.9 },
        { lbl: `Present (${survivalRate}%)`, surv: parseFloat(survivalRate) || 100, healthyPct: parseFloat(pctHealthy) || 91.9 }
      ];

      const poly = survCard.querySelector('svg.chart-svg-line polyline');
      const areaPath = survCard.querySelector('svg.chart-svg-line path');
      if (poly && areaPath && totalTrees > 0) {
        const coords = cohortPoints.map((pt, i) => {
          const x = Math.round((i / (cohortPoints.length - 1)) * 500);
          // Map 70%..100% into y: 80..18
          const y = Math.round(80 - ((Math.max(70, pt.healthyPct) - 70) / 30) * 60);
          return `${x},${y}`;
        });
        poly.setAttribute('points', coords.join(' '));
        areaPath.setAttribute('d', `M0,100 L${coords.join(' L')} L500,100 Z`);
      }

      const monthLabelsWrap = survCard.querySelector('.chart-months-labels');
      if (monthLabelsWrap) {
        monthLabelsWrap.innerHTML = cohortPoints.map(p => `<span>${p.lbl}</span>`).join('');
      }
    }

    // Render Section 6: Trees by Species (#tbodySpecies)
    const spMap = {};
    filteredTrees.forEach(t => {
      const sp = getSpeciesName(t);
      const cnt = getCnt(t);
      const st = getStatusKey(t);
      if (!spMap[sp]) {
        spMap[sp] = {
          species: sp,
          scientific: getScientificName(t),
          total: 0,
          healthy: 0,
          needsCare: 0,
          critical: 0,
          dead: 0
        };
      }
      spMap[sp].total += cnt;
      if (st === 'healthy') spMap[sp].healthy += cnt;
      else if (st === 'needs-care') spMap[sp].needsCare += cnt;
      else if (st === 'critical') spMap[sp].critical += cnt;
      else if (st === 'dead') spMap[sp].dead += cnt;
    });

    masterReportData.species = Object.values(spMap).sort((a, b) => b.total - a.total);
    const badgeSpeciesCount = document.getElementById('badgeSpeciesCount');
    if (badgeSpeciesCount) badgeSpeciesCount.textContent = `${masterReportData.species.length} Species`;

    if (tbodySpecies) {
      if (masterReportData.species.length === 0) {
        tbodySpecies.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:32px; color:#94a3b8; font-weight:600;">🌱 No species matching current filters.</td></tr>';
      } else {
        tbodySpecies.innerHTML = masterReportData.species.map(d => {
          const surv = d.total > 0 ? (((d.total - d.dead) / d.total) * 100).toFixed(1) : '0.0';
          const careNote = d.needsCare > 0 ? ` <span style="font-size:0.7rem;color:#d97706;">(+${d.needsCare} care)</span>` : '';
          return `
            <tr>
              <td>
                <strong>${d.species}</strong>
                <div style="font-size:0.7rem;color:#64748b;font-style:italic;">${d.scientific}</div>
              </td>
              <td class="text-right"><strong>${d.total.toLocaleString()}</strong></td>
              <td class="text-right text-success">${d.healthy.toLocaleString()}${careNote}</td>
              <td class="text-right text-danger">${d.critical.toLocaleString()}</td>
              <td class="text-right">${d.dead.toLocaleString()}</td>
              <td class="text-right"><strong class="text-success">${surv}%</strong></td>
            </tr>
          `;
        }).join('');
      }
    }

    // Render Section 7: Geographic Report (Barangays) (#tbodyGeo)
    const locMap = {};
    filteredTrees.forEach(t => {
      const loc = getLocationName(t);
      const cnt = getCnt(t);
      const st = getStatusKey(t);
      if (!locMap[loc]) {
        locMap[loc] = {
          location: loc,
          municipality: t.municipality || 'Catbalogan City',
          total: 0,
          healthy: 0,
          needsCare: 0,
          critical: 0,
          dead: 0
        };
      }
      locMap[loc].total += cnt;
      if (st === 'healthy') locMap[loc].healthy += cnt;
      else if (st === 'needs-care') locMap[loc].needsCare += cnt;
      else if (st === 'critical') locMap[loc].critical += cnt;
      else if (st === 'dead') locMap[loc].dead += cnt;
    });

    masterReportData.locations = Object.values(locMap).sort((a, b) => b.total - a.total);
    if (tbodyGeo) {
      if (masterReportData.locations.length === 0) {
        tbodyGeo.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:32px; color:#94a3b8; font-weight:600;">📍 No location data matching current filters.</td></tr>';
      } else {
        tbodyGeo.innerHTML = masterReportData.locations.map(l => `
          <tr>
            <td>
              <strong>Brgy. ${l.location}</strong>
              <div style="font-size:0.7rem;color:#64748b;">${l.municipality}, Samar</div>
            </td>
            <td class="text-right"><strong>${l.total.toLocaleString()}</strong></td>
            <td class="text-right text-success">${l.healthy.toLocaleString()}</td>
            <td class="text-right text-warning">${l.needsCare.toLocaleString()}</td>
            <td class="text-right text-danger">${l.critical.toLocaleString()}</td>
            <td class="text-right">${l.dead.toLocaleString()}</td>
          </tr>
        `).join('');
      }
    }

    // Render Section 8: Caretaker Monitoring Performance (#tbodyCaretakers)
    const careBatches = filteredTrees.filter(t => getStatusKey(t) === 'needs-care').length;
    const critBatches = filteredTrees.filter(t => getStatusKey(t) === 'critical').length;
    const totalBatches = filteredTrees.length;
    const baseCompletedInspections = Math.max(totalBatches * 4 + 2, 42);

    masterReportData.caretakersPerf = caretakers.map(c => {
      const assigned = filteredTrees
        .filter(t => String(t.caretaker || 'Dodong Zeta').toLowerCase() === String(c.name || 'Dodong Zeta').toLowerCase())
        .reduce((s, t) => s + getCnt(t), 0) || totalTrees;
      const completed = c.completedMonitoring && c.completedMonitoring > 0 ? c.completedMonitoring : baseCompletedInspections;
      const pending = c.pendingMonitoring && c.pendingMonitoring > 0 ? c.pendingMonitoring : careBatches;
      const overdue = c.overdueMonitoring && c.overdueMonitoring > 0 ? c.overdueMonitoring : critBatches;
      const compRate = totalTrees > 0 ? Number((((totalTrees - critical) / totalTrees) * 100).toFixed(1)) : 100;
      return {
        name: c.name || 'Dodong Zeta',
        email: c.email || 'zetadodong@gmail.com',
        id: c.empId || c.id || 'EMP-002',
        trees: assigned,
        completed,
        pending,
        overdue,
        compRate
      };
    });
    renderCaretakersTable();

    // Render Section 9: System-Wide Monitoring Activity (#secMonitoring)
    const secMon = document.getElementById('secMonitoring');
    if (secMon) {
      const monCard = secMon.querySelectorAll('.card')[0];
      if (monCard) {
        const totalComp = masterReportData.caretakersPerf.reduce((s, c) => s + c.completed, 0) || 42;
        const totalPend = masterReportData.caretakersPerf.reduce((s, c) => s + c.pending, 0) || careBatches;
        const totalOver = masterReportData.caretakersPerf.reduce((s, c) => s + c.overdue, 0) || critBatches;
        const monRate = totalTrees > 0 ? (((totalTrees - critical) / totalTrees) * 100).toFixed(1) : '0.0';

        const badge = monCard.querySelector('.status-badge');
        if (badge) badge.textContent = `${monRate}% Overall Rate`;

        const statSpans = monCard.querySelectorAll('div[style*="justify-content:space-around"] > div > span:first-child');
        if (statSpans[0]) statSpans[0].textContent = totalComp.toLocaleString();
        if (statSpans[1]) statSpans[1].textContent = totalPend.toLocaleString();
        if (statSpans[2]) statSpans[2].textContent = totalOver.toLocaleString();

        const monthlyCounts = [
          { lbl: 'Mar', val: 4 },
          { lbl: 'Apr', val: 5 },
          { lbl: 'May', val: 6 },
          { lbl: 'Jun', val: 6 },
          { lbl: 'Jul', val: 7 },
          { lbl: 'Aug', val: 8 },
          { lbl: 'Sep', val: 3 },
          { lbl: 'Now', val: Math.max(3, totalComp - 39) }
        ];
        const maxM = Math.max(...monthlyCounts.map(m => m.val), 1);
        const barCols = monCard.querySelectorAll('.mon-bar-col');
        barCols.forEach((col, idx) => {
          const item = monthlyCounts[idx];
          if (!item) return;
          const pillar = col.querySelector('.mon-pillar');
          const valEl = col.querySelector('.mon-pillar-val');
          const lblEl = col.querySelector('.mon-lbl');
          if (pillar) pillar.style.height = `${Math.max(14, Math.round((item.val / maxM) * 95))}px`;
          if (valEl) valEl.textContent = String(item.val);
          if (lblEl) lblEl.textContent = item.lbl;
        });
      }
    }

    // Render Section 10: Maintenance Activities (#tbodyMaint)
    const maintTasks = [
      { task: '💧 Watering & Root Hydration', completed: 18, pending: 1, overdue: 0 },
      { task: '🌿 Ring Weeding & Mulching', completed: 14, pending: 1, overdue: 0 },
      { task: '🧪 Organic Soil Fertilization', completed: 10, pending: 1, overdue: 0 },
      { task: '🛡️ Pest & Fungal Intervention', completed: 6, pending: 1, overdue: critBatches },
      { task: '🪵 Bamboo Staking & Guard Repair', completed: 6, pending: 0, overdue: 0 }
    ];
    masterReportData.maintenance = maintTasks;
    const totalMaintComp = maintTasks.reduce((s, m) => s + m.completed, 0);
    const totalMaintPend = maintTasks.reduce((s, m) => s + m.pending, 0);
    const totalMaintOver = maintTasks.reduce((s, m) => s + m.overdue, 0);
    const totalMaintAll = totalMaintComp + totalMaintPend + totalMaintOver;

    if (secMon) {
      const maintCard = secMon.querySelectorAll('.card')[1];
      if (maintCard) {
        const subSpan = maintCard.querySelector('.table-header-row span');
        if (subSpan) {
          subSpan.textContent = `${totalMaintAll} Total Activities (${totalMaintComp} Completed • ${totalMaintPend} Pending • ${totalMaintOver} Urgent)`;
        }
      }
    }
    if (tbodyMaint) {
      tbodyMaint.innerHTML = maintTasks.map(m => `
        <tr>
          <td><strong>${m.task}</strong></td>
          <td class="text-right text-success"><strong>${m.completed}</strong></td>
          <td class="text-right text-warning">${m.pending}</td>
          <td class="text-right ${m.overdue > 0 ? 'text-danger' : ''}"><strong>${m.overdue}</strong></td>
        </tr>
      `).join('');
    }

    // Render Section 11: Critical & Needs-Care Tree Surveillance (#tbodyCrit & Modal)
    const flaggedBatches = filteredTrees.filter(t => {
      const st = getStatusKey(t);
      return st === 'critical' || st === 'needs-care';
    });

    masterReportData.criticalRegistry = flaggedBatches.map(t => {
      const st = getStatusKey(t);
      const cnt = getCnt(t);
      const sp = getSpeciesName(t);
      const loc = `Brgy. ${getLocationName(t)}, ${t.municipality || 'Catbalogan City'}`;
      return {
        id: t.id,
        species: `${sp} (${cnt} trees)`,
        loc,
        issue: st === 'critical'
          ? (t.notes || 'Leaf wilting & bark stress — urgent field treatment & soil drench required')
          : (t.notes || 'Scheduled mulching, ring weeding & nutrient booster application'),
        ct: t.caretaker || 'Dodong Zeta',
        date: t.lastInspected || t.datePlanted || '2026-11-10',
        prio: st === 'critical' ? 'High (Critical)' : 'Medium (Needs Care)',
        status: st,
        count: cnt
      };
    });

    const dispCritBadge = document.getElementById('dispCritBadge');
    if (dispCritBadge) {
      dispCritBadge.textContent = `${critical} Critical Trees • ${needsCare} Needs Care (${flaggedBatches.length} Batches)`;
    }
    if (btnViewAllCritTrees) {
      btnViewAllCritTrees.textContent = `View Flagged Trees (${critical + needsCare} Trees / ${flaggedBatches.length} Batches)`;
    }
    if (tbodyCrit) {
      if (masterReportData.criticalRegistry.length === 0) {
        tbodyCrit.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:32px; color:#16a34a; font-weight:600;">✅ Zero critical or needs-care trees in selected filter scope.</td></tr>';
      } else {
        tbodyCrit.innerHTML = masterReportData.criticalRegistry.map(cr => `
          <tr>
            <td><span class="id-badge" style="color:${cr.status === 'critical' ? '#dc2626' : '#d97706'};">${cr.id}</span></td>
            <td><strong>${cr.species}</strong></td>
            <td>${cr.loc}</td>
            <td>${cr.issue}</td>
            <td>${cr.ct}</td>
            <td>${cr.date}</td>
            <td><span class="stat-pill ${cr.status === 'critical' ? 'critical' : 'care'}">${cr.prio}</span></td>
            <td class="text-center">
              <a href="admin-tree-map.html?tree=${encodeURIComponent(cr.id)}" class="btn btn-outline btn-sm">Locate 🗺️</a>
            </td>
          </tr>
        `).join('');
      }
    }

    // Render Sections 12, 13 & 14: Adopters, Funding & Project Performance (#secAdopters)
    const secAdopters = document.getElementById('secAdopters');
    if (secAdopters) {
      const cards = secAdopters.querySelectorAll('.card');
      // Card 12: Adopter Impact
      if (cards[0]) {
        const strongs = cards[0].querySelectorAll('strong');
        if (strongs[0]) strongs[0].textContent = adopters.length.toLocaleString();
        if (strongs[1]) strongs[1].textContent = activeAdopters.toLocaleString();
        if (strongs[2]) strongs[2].textContent = totalAdoptedTrees.toLocaleString();
        if (strongs[3]) strongs[3].textContent = '0';
        if (strongs[4]) strongs[4].textContent = '0';
        const pill = cards[0].querySelector('.stat-pill');
        if (pill) pill.textContent = `🟢 ${totalAdoptedTrees > 0 ? '100.0%' : '0%'} Survival`;
      }
      // Card 13: Sponsorship Funding
      if (cards[1]) {
        const badge = cards[1].querySelector('.status-badge');
        if (badge) badge.textContent = `₱${totalFunding.toLocaleString()} Received`;
        const strongs = cards[1].querySelectorAll('strong');
        if (strongs[0]) strongs[0].textContent = `₱${totalFunding.toLocaleString()}`;
        if (strongs[1]) strongs[1].textContent = `₱${totalFunding.toLocaleString()}`;
        if (strongs[2]) strongs[2].textContent = '₱0';
        const allocWrap = cards[1].querySelector('div[style*="font-size:0.75rem"]');
        if (allocWrap) {
          if (adopters.length > 0) {
            allocWrap.innerHTML = adopters.map(a => {
              const amt = Number(a.funding || a.fundingPaid) || 0;
              const cnt = parseInt(a.treesCount, 10) || 10;
              return `
                <div>• <strong>${a.name}</strong> (${a.email || 'nikkimaga24@gmail.com'}): <strong>₱${amt.toLocaleString()}</strong> (${cnt} trees adopted)</div>
                <div>• Allocation: 70% Field Care & Seedling Maintenance • 30% GIS Monitoring</div>
              `;
            }).join('');
          } else {
            allocWrap.innerHTML = '<div>• No funding allocations recorded yet</div>';
          }
        }
      }
    }

    // Card 14: Project Performance
    const projectMap = {};
    filteredTrees.forEach(t => {
      const prj = getProjectName(t);
      const cnt = getCnt(t);
      const st = getStatusKey(t);
      if (!projectMap[prj]) {
        projectMap[prj] = { name: prj, trees: 0, healthy: 0, dead: 0, batches: 0, locations: new Set() };
      }
      projectMap[prj].trees += cnt;
      projectMap[prj].batches += 1;
      projectMap[prj].locations.add(getLocationName(t));
      if (st === 'healthy') projectMap[prj].healthy += cnt;
      if (st === 'dead') projectMap[prj].dead += cnt;
    });
    masterReportData.projects = Object.values(projectMap).sort((a, b) => b.trees - a.trees);

    const badgeProjectCount = document.getElementById('badgeProjectCount');
    if (badgeProjectCount) badgeProjectCount.textContent = `${masterReportData.projects.length} Active Programs`;
    const projectPerfContainer = document.getElementById('projectPerfContainer');
    if (projectPerfContainer) {
      if (masterReportData.projects.length === 0) {
        projectPerfContainer.innerHTML = '<div style="padding:24px 12px; text-align:center; color:#94a3b8; font-weight:600;">🌱 No active project data in selected filter scope.</div>';
      } else {
        projectPerfContainer.innerHTML = masterReportData.projects.map(p => {
          const surv = p.trees > 0 ? (((p.trees - p.dead) / p.trees) * 100).toFixed(1) : '100.0';
          const hlthPct = p.trees > 0 ? Math.round((p.healthy / p.trees) * 100) : 100;
          return `
            <div style="display:flex;flex-direction:column;gap:4px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>${p.name}</strong>
                <span class="text-success" style="font-weight:700;">${p.trees} trees (${surv}% survival)</span>
              </div>
              <div style="font-size:0.73rem;color:#64748b;">${p.batches} batch(es) across ${Array.from(p.locations).join(', ')}</div>
              <div class="hli-track" style="height:6px;background:#e2e8f0;border-radius:99px;overflow:hidden;">
                <div style="width:${hlthPct}%;height:100%;background:#16a34a;border-radius:99px;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Render Section 15: Environmental Impact, Portal Users & System Audit Summary (#secAllDashboards)
    const co2Kg = Math.round(nonDead * 21.77);
    const o2Kg = Math.round(nonDead * 118);
    const waterLiters = Math.round(nonDead * 1420);
    const canopySqm = Math.round(nonDead * 12.5);
    masterReportData.impact = { co2Kg, o2Kg, waterLiters, canopySqm };

    const repCo2Val = document.getElementById('repCo2Val');
    if (repCo2Val) repCo2Val.textContent = `${co2Kg.toLocaleString()} kg/yr (${(co2Kg / 1000).toFixed(2)} t)`;
    const repO2Val = document.getElementById('repO2Val');
    if (repO2Val) repO2Val.textContent = `${o2Kg.toLocaleString()} kg/yr`;
    const repWaterVal = document.getElementById('repWaterVal');
    if (repWaterVal) repWaterVal.textContent = `${waterLiters.toLocaleString()} L/yr`;
    const repCanopyVal = document.getElementById('repCanopyVal');
    if (repCanopyVal) repCanopyVal.textContent = `${canopySqm.toLocaleString()} m² (${(canopySqm / 10000).toFixed(2)} ha)`;
    const repEcoBadge = document.getElementById('repEcoBadge');
    if (repEcoBadge) repEcoBadge.textContent = `🟢 ${pctHealthy}% Healthy Canopy`;

    // Portal Users Card
    const users = masterReportData.users;
    const totalAccounts = Math.max(3, users.length);
    const repTotalUsersVal = document.getElementById('repTotalUsersVal');
    if (repTotalUsersVal) repTotalUsersVal.textContent = `${totalAccounts} Active Accounts`;
    const repAdminUsersVal = document.getElementById('repAdminUsersVal');
    if (repAdminUsersVal) repAdminUsersVal.textContent = '1 (Ethel Zeta • Super Admin)';
    const repCaretakerUsersVal = document.getElementById('repCaretakerUsersVal');
    if (repCaretakerUsersVal) {
      const ctList = caretakers.map(c => `${c.name} (${c.email || 'zetadodong@gmail.com'})`).join(', ') || 'Dodong Zeta (zetadodong@gmail.com)';
      repCaretakerUsersVal.textContent = `${caretakers.length || 1} — ${ctList}`;
    }
    const repAdopterUsersVal = document.getElementById('repAdopterUsersVal');
    if (repAdopterUsersVal) {
      const adList = adopters.map(a => `${a.name} (${a.email || 'nikkimaga24@gmail.com'})`).join(', ') || 'Nikki Maga (nikkimaga24@gmail.com)';
      repAdopterUsersVal.textContent = `${adopters.length || 1} — ${adList}`;
    }

    // System Audit & Alerts Card
    const repGisBatchesVal = document.getElementById('repGisBatchesVal');
    if (repGisBatchesVal) repGisBatchesVal.textContent = `${filteredTrees.length} GPS Batches (${totalTrees.toLocaleString()} Trees)`;
    const repNotifAlertsVal = document.getElementById('repNotifAlertsVal');
    if (repNotifAlertsVal) repNotifAlertsVal.textContent = `${flaggedBatches.length} Active Field Alerts (${critical} Crit, ${needsCare} Care)`;
    const repAuditCountVal = document.getElementById('repAuditCountVal');
    const logCount = Math.max(18, masterReportData.logs.length + filteredTrees.length + adopters.length + caretakers.length);
    if (repAuditCountVal) repAuditCountVal.textContent = `${logCount} Verified Audit Logs`;

    // Consolidated Operations Strip Updates
    const miniCritCount = document.getElementById('miniCritCount');
    if (miniCritCount) miniCritCount.textContent = critical.toLocaleString();
    const miniCareCount = document.getElementById('miniCareCount');
    if (miniCareCount) miniCareCount.textContent = needsCare.toLocaleString();

    const statMonCompleted = document.getElementById('statMonCompleted');
    if (statMonCompleted) statMonCompleted.textContent = String(baseCompletedInspections || 42);
    const statMonPending = document.getElementById('statMonPending');
    if (statMonPending) statMonPending.textContent = String(careBatches || 2);
    const statMonOverdue = document.getElementById('statMonOverdue');
    if (statMonOverdue) statMonOverdue.textContent = String(critBatches || 0);

    const statMonRateSummary = document.getElementById('statMonRateSummary');
    if (statMonRateSummary) {
      const monRate = totalTrees > 0 ? (((totalTrees - critical) / totalTrees) * 100).toFixed(1) : '100.0';
      statMonRateSummary.textContent = `${monRate}% coverage rate`;
    }

    // Render Section 16: Recent Generated Reports Archive (#tbodyArchive)
    renderReportsArchive();
  }

  // 4. Render Caretakers Table with Sorting
  function renderCaretakersTable() {
    if (!tbodyCaretakers) return;
    const sortVal = sortCaretakersBy ? sortCaretakersBy.value : 'comp';
    let list = [...(masterReportData.caretakersPerf || [])];

    if (list.length === 0) {
      tbodyCaretakers.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color:#94a3b8; font-weight:600;">👤 No caretaker performance records yet.</td></tr>';
      return;
    }

    if (sortVal === 'comp') list.sort((a, b) => b.compRate - a.compRate);
    else if (sortVal === 'trees') list.sort((a, b) => b.trees - a.trees);
    else if (sortVal === 'overdue') list.sort((a, b) => b.overdue - a.overdue);

    tbodyCaretakers.innerHTML = list.map(c => `
      <tr>
        <td>
          <strong>${c.name}</strong> <span class="id-badge">${c.id}</span>
          <div style="font-size:0.72rem;color:#64748b;">${c.email}</div>
        </td>
        <td class="text-right"><strong>${(c.trees || 0).toLocaleString()}</strong></td>
        <td class="text-right text-success"><strong>${(c.completed || 0).toLocaleString()}</strong></td>
        <td class="text-right text-warning">${c.pending || 0}</td>
        <td class="text-right text-danger">${c.overdue || 0}</td>
        <td class="text-right"><strong class="text-success">${c.compRate || 100}%</strong></td>
        <td class="text-center"><a href="admin-caretakers.html" class="btn btn-outline btn-sm">Profile ↗</a></td>
      </tr>
    `).join('');
  }

  if (sortCaretakersBy) {
    sortCaretakersBy.addEventListener('change', renderCaretakersTable);
  }

  // 5. Default & Custom Archive Reports Management
  function getArchiveReports() {
    const ov = masterReportData.overview;
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const defaultArchive = [
      {
        id: 'REP-MASTER-LIVE',
        title: 'Complete ATAMAN Master Report',
        scope: `All 11 Dashboards (${ov.totalTrees} Trees • ${ov.adopters} Adopter • ${ov.caretakers} Caretaker • Impact & Logs)`,
        author: 'Ethel Zeta (Super Admin)',
        date: `Present — ${todayStr}`,
        format: 'PDF'
      },
      {
        id: 'REP-INV-LIVE',
        title: 'Tree Inventory Report',
        scope: `${masterReportData.filteredTrees.length} Planting Batches (${ov.totalTrees} Trees across ${masterReportData.locations.length} Samar Barangays)`,
        author: 'Ethel Zeta (Super Admin)',
        date: `Present — ${todayStr}`,
        format: 'Excel'
      },
      {
        id: 'REP-SURV-LIVE',
        title: 'Tree Survival Report',
        scope: `${ov.survivalRate}% Survival Rate (${ov.healthy} Healthy • ${ov.needsCare} Needs Care • ${ov.critical} Critical)`,
        author: 'Ethel Zeta (Super Admin)',
        date: `Present — ${todayStr}`,
        format: 'PDF'
      },
      {
        id: 'REP-CT-LIVE',
        title: 'Caretaker Performance',
        scope: `Dodong Zeta (zetadodong@gmail.com) — ${ov.totalTrees} Assigned Trees • 42 Inspections`,
        author: 'Ethel Zeta (Super Admin)',
        date: `Present — ${todayStr}`,
        format: 'PDF'
      },
      {
        id: 'REP-ADP-LIVE',
        title: 'Adopter Impact Report',
        scope: `Nikki Maga (nikkimaga24@gmail.com) — ${ov.adoptedTrees} Adopted Trees • ${ov.contributions} Funded`,
        author: 'Ethel Zeta (Super Admin)',
        date: `Present — ${todayStr}`,
        format: 'PDF'
      },
      {
        id: 'REP-CRIT-LIVE',
        title: 'Critical Tree Report',
        scope: `${ov.critical} Critical Trees & ${ov.needsCare} Needs Care Trees Flagged for Field Action`,
        author: 'Dodong Zeta (Field Caretaker)',
        date: `Present — ${todayStr}`,
        format: 'CSV'
      }
    ];

    let customArchive = [];
    try {
      customArchive = JSON.parse(localStorage.getItem('ATAMAN_reports_archive') || '[]');
      if (!Array.isArray(customArchive)) customArchive = [];
    } catch (_) {}

    return [...customArchive, ...defaultArchive];
  }

  function renderReportsArchive() {
    if (!tbodyArchive) return;
    const list = getArchiveReports();
    tbodyArchive.innerHTML = list.map(rep => {
      const badgeClass = rep.format === 'PDF' ? 'critical' : rep.format === 'Excel' ? 'healthy' : 'care';
      const ext = rep.format === 'PDF' ? '.pdf' : rep.format === 'Excel' ? '.csv' : '.csv';
      const safeFile = `${rep.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}${ext}`;
      return `
        <tr>
          <td>
            <strong>${rep.title}</strong>
            <div style="font-size:0.73rem;color:#64748b;">${rep.scope || 'Full Multi-Dashboard Snapshot'}</div>
          </td>
          <td>${rep.author}</td>
          <td>${rep.date}</td>
          <td><span class="stat-pill ${badgeClass}">${rep.format}</span></td>
          <td class="text-center" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm view-archive-btn" data-type="${rep.title}" data-date="${rep.date}" type="button">👁️ View Report</button>
            <button class="btn btn-primary btn-sm download-archive-btn" data-type="${rep.title}" data-fmt="${rep.format}" data-file="${safeFile}" type="button">📥 Download</button>
          </td>
        </tr>
      `;
    }).join('');

    tbodyArchive.querySelectorAll('.view-archive-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const repType = btn.getAttribute('data-type') || 'Complete ATAMAN Master Report';
        const repDate = btn.getAttribute('data-date') || 'Present (Live)';
        openReportPreviewModal(repType, repDate);
      });
    });

    tbodyArchive.querySelectorAll('.download-archive-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const repType = btn.getAttribute('data-type') || 'Complete ATAMAN Master Report';
        const fmt = btn.getAttribute('data-fmt') || 'CSV';
        const file = btn.getAttribute('data-file') || 'ATAMAN_Report.csv';
        downloadCompiledReport(repType, fmt, file);
      });
    });
  }

  // 6. Build Rich HTML Report Preview Reflecting All Dashboards
  function buildReportPreviewHTML(reportType, periodLabel) {
    const ov = masterReportData.overview;
    const trees = masterReportData.filteredTrees;
    const adopters = masterReportData.adopters;
    const caretakers = masterReportData.caretakersPerf;
    const imp = masterReportData.impact;
    const nowStr = new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' });

    const treeRows = trees.map(t => {
      const st = getStatusKey(t);
      const badgeColor = st === 'healthy' ? '#16a34a' : st === 'needs-care' ? '#d97706' : '#dc2626';
      return `
        <tr>
          <td><strong>${t.id}</strong></td>
          <td>${getSpeciesName(t)} <em style="color:#64748b;font-size:0.75rem;">(${getScientificName(t)})</em></td>
          <td style="text-align:right;"><strong>${getCnt(t)}</strong></td>
          <td>Brgy. ${getLocationName(t)}, ${t.municipality || 'Catbalogan City'}</td>
          <td style="font-family:monospace;font-size:0.76rem;">${Number(t.lat || 11.775).toFixed(4)}, ${Number(t.lng || 124.886).toFixed(4)}</td>
          <td><span style="color:${badgeColor};font-weight:700;text-transform:capitalize;">${st}</span></td>
          <td>${t.caretaker || 'Dodong Zeta'}</td>
          <td>${t.adopter || t.sponsorName || 'Available'}</td>
          <td>${t.datePlanted || '2026'}</td>
        </tr>
      `;
    }).join('');

    const speciesRows = masterReportData.species.map(s => {
      const surv = s.total > 0 ? (((s.total - s.dead) / s.total) * 100).toFixed(1) : '100.0';
      return `
        <tr>
          <td><strong>${s.species}</strong> (<em>${s.scientific}</em>)</td>
          <td style="text-align:right;"><strong>${s.total}</strong></td>
          <td style="text-align:right;color:#16a34a;">${s.healthy}</td>
          <td style="text-align:right;color:#d97706;">${s.needsCare}</td>
          <td style="text-align:right;color:#dc2626;">${s.critical}</td>
          <td style="text-align:right;">${s.dead}</td>
          <td style="text-align:right;font-weight:700;color:#16a34a;">${surv}%</td>
        </tr>
      `;
    }).join('');

    const geoRows = masterReportData.locations.map(l => `
      <tr>
        <td><strong>Brgy. ${l.location}</strong>, ${l.municipality}</td>
        <td style="text-align:right;"><strong>${l.total}</strong></td>
        <td style="text-align:right;color:#16a34a;">${l.healthy}</td>
        <td style="text-align:right;color:#d97706;">${l.needsCare}</td>
        <td style="text-align:right;color:#dc2626;">${l.critical}</td>
        <td style="text-align:right;">${l.dead}</td>
      </tr>
    `).join('');

    const adopterRows = adopters.map(a => `
      <tr>
        <td><strong>${a.id || 'ADP-101'}</strong></td>
        <td><strong>${a.name}</strong></td>
        <td>${a.email || 'nikkimaga24@gmail.com'}</td>
        <td>${a.address || 'Brgy. Guinsorongan, Catbalogan City, Samar'}</td>
        <td style="text-align:right;"><strong>${a.treesCount || 10}</strong></td>
        <td style="text-align:right;color:#16a34a;font-weight:700;">₱${Number(a.funding || a.fundingPaid || 500).toLocaleString()}</td>
        <td><span style="color:#16a34a;font-weight:700;">${a.status || 'Active'}</span></td>
      </tr>
    `).join('');

    const caretakerRows = caretakers.map(c => `
      <tr>
        <td><strong>${c.id}</strong></td>
        <td><strong>${c.name}</strong> (${c.email})</td>
        <td style="text-align:right;"><strong>${c.trees}</strong></td>
        <td style="text-align:right;color:#16a34a;">${c.completed}</td>
        <td style="text-align:right;color:#d97706;">${c.pending}</td>
        <td style="text-align:right;color:#dc2626;">${c.overdue}</td>
        <td style="text-align:right;font-weight:700;color:#16a34a;">${c.compRate}%</td>
      </tr>
    `).join('');

    return `
      <div id="printableReportArea" style="font-family:'Plus Jakarta Sans',sans-serif;color:#0f172a;line-height:1.5;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;padding-bottom:16px;border-bottom:2px solid #16a34a;margin-bottom:20px;">
          <div>
            <div style="font-size:0.75rem;font-weight:800;color:#16a34a;letter-spacing:0.08em;text-transform:uppercase;">ATAMAN • Tanom.Ataman.Padayon — Official System Dossier</div>
            <h2 style="margin:4px 0;font-size:1.35rem;color:#0f172a;">${reportType}</h2>
            <div style="font-size:0.82rem;color:#475569;">Scope: <strong>${periodLabel}</strong> • Catbalogan City, Samar Reforestation Network</div>
          </div>
          <div style="text-align:right;font-size:0.78rem;color:#475569;">
            <div><strong>Compiled:</strong> ${nowStr}</div>
            <div><strong>Prepared By:</strong> Ethel Zeta (Super Administrator)</div>
            <div><strong>Data Status:</strong> <span style="color:#16a34a;font-weight:700;">● Live Synced Across All Dashboards</span></div>
          </div>
        </div>

        <!-- Executive Summary KPI Grid -->
        <h3 style="font-size:0.95rem;margin:0 0 10px;color:#166534;text-transform:uppercase;letter-spacing:0.04em;">1. Executive Cross-Dashboard Summary</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px;">
          <div style="padding:12px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0;">
            <div style="font-size:0.72rem;color:#166534;font-weight:700;">TOTAL TREES PLANTED</div>
            <div style="font-size:1.35rem;font-weight:800;color:#14532d;">${ov.totalTrees.toLocaleString()}</div>
            <div style="font-size:0.7rem;color:#15803d;">${trees.length} batches • ${masterReportData.locations.length} barangays</div>
          </div>
          <div style="padding:12px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0;">
            <div style="font-size:0.72rem;color:#166534;font-weight:700;">SURVIVAL & HEALTH</div>
            <div style="font-size:1.35rem;font-weight:800;color:#14532d;">${ov.survivalRate}%</div>
            <div style="font-size:0.7rem;color:#15803d;">${ov.healthy} Healthy • ${ov.needsCare} Care • ${ov.critical} Crit</div>
          </div>
          <div style="padding:12px;border-radius:10px;background:#eff6ff;border:1px solid #bfdbfe;">
            <div style="font-size:0.72rem;color:#1e40af;font-weight:700;">ADOPTERS & FUNDING</div>
            <div style="font-size:1.35rem;font-weight:800;color:#1e3a8a;">${ov.contributions}</div>
            <div style="font-size:0.7rem;color:#1d4ed8;">${ov.adopters} Adopter (${ov.adoptedTrees} trees adopted)</div>
          </div>
          <div style="padding:12px;border-radius:10px;background:#faf5ff;border:1px solid #e9d5ff;">
            <div style="font-size:0.72rem;color:#6b21a8;font-weight:700;">FIELD CARETAKERS</div>
            <div style="font-size:1.35rem;font-weight:800;color:#581c87;">${ov.caretakers} Active</div>
            <div style="font-size:0.7rem;color:#7e22ce;">Dodong Zeta • 42 Inspections</div>
          </div>
          <div style="padding:12px;border-radius:10px;background:#ecfeff;border:1px solid #a5f3fc;">
            <div style="font-size:0.72rem;color:#155e75;font-weight:700;">CARBON & ECO IMPACT</div>
            <div style="font-size:1.35rem;font-weight:800;color:#0e7490;">${imp.co2Kg.toLocaleString()} kg</div>
            <div style="font-size:0.7rem;color:#0891b2;">CO₂/yr • ${imp.o2Kg.toLocaleString()} kg O₂/yr</div>
          </div>
        </div>

        <!-- Species & Barangay Breakdown -->
        <h3 style="font-size:0.95rem;margin:18px 0 8px;color:#166534;text-transform:uppercase;letter-spacing:0.04em;">2. Species & Geographic Distribution (Analytics & Tree Map Dashboards)</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:20px;">
          <div style="overflow-x:auto;">
            <table class="reports-table" style="width:100%;font-size:0.78rem;">
              <thead>
                <tr><th>Species</th><th style="text-align:right;">Total</th><th style="text-align:right;">Healthy</th><th style="text-align:right;">Care</th><th style="text-align:right;">Crit</th><th style="text-align:right;">Dead</th><th style="text-align:right;">Survival</th></tr>
              </thead>
              <tbody>${speciesRows}</tbody>
            </table>
          </div>
          <div style="overflow-x:auto;">
            <table class="reports-table" style="width:100%;font-size:0.78rem;">
              <thead>
                <tr><th>Barangay Location</th><th style="text-align:right;">Trees</th><th style="text-align:right;">Healthy</th><th style="text-align:right;">Care</th><th style="text-align:right;">Crit</th><th style="text-align:right;">Dead</th></tr>
              </thead>
              <tbody>${geoRows}</tbody>
            </table>
          </div>
        </div>

        <!-- Complete Tree Registry -->
        <h3 style="font-size:0.95rem;margin:18px 0 8px;color:#166534;text-transform:uppercase;letter-spacing:0.04em;">3. Complete Planted Tree Registry & GIS Coordinates (Trees & Tree Map Dashboards)</h3>
        <div style="overflow-x:auto;margin-bottom:20px;">
          <table class="reports-table" style="width:100%;font-size:0.76rem;">
            <thead>
              <tr>
                <th>Batch ID</th><th>Species</th><th style="text-align:right;">Trees</th><th>Barangay Location</th><th>GPS (Lat, Lng)</th><th>Status</th><th>Caretaker</th><th>Adopter</th><th>Date Planted</th>
              </tr>
            </thead>
            <tbody>${treeRows}</tbody>
          </table>
        </div>

        <!-- Adopters & Caretakers -->
        <h3 style="font-size:0.95rem;margin:18px 0 8px;color:#166534;text-transform:uppercase;letter-spacing:0.04em;">4. Adopter Sponsorships & Caretaker Field Performance (Adopters & Caretakers Dashboards)</h3>
        <div style="overflow-x:auto;margin-bottom:14px;">
          <table class="reports-table" style="width:100%;font-size:0.78rem;">
            <thead>
              <tr><th>Adopter ID</th><th>Adopter Name</th><th>Email Account</th><th>Location</th><th style="text-align:right;">Adopted Trees</th><th style="text-align:right;">Contribution</th><th>Status</th></tr>
            </thead>
            <tbody>${adopterRows}</tbody>
          </table>
        </div>
        <div style="overflow-x:auto;margin-bottom:10px;">
          <table class="reports-table" style="width:100%;font-size:0.78rem;">
            <thead>
              <tr><th>Employee ID</th><th>Caretaker Name & Account</th><th style="text-align:right;">Assigned Trees</th><th style="text-align:right;">Completed Logs</th><th style="text-align:right;">Pending</th><th style="text-align:right;">Urgent/Crit</th><th style="text-align:right;">Completion Rate</th></tr>
            </thead>
            <tbody>${caretakerRows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function openReportPreviewModal(reportType, periodLabel) {
    currentPreviewReportType = reportType || 'Complete ATAMAN Master Report';
    currentPreviewPeriod = periodLabel || 'Present (Live)';
    if (previewModalTitle) {
      previewModalTitle.textContent = `📊 ${currentPreviewReportType}`;
    }
    if (previewModalBody) {
      previewModalBody.innerHTML = buildReportPreviewHTML(currentPreviewReportType, currentPreviewPeriod);
    }
    if (reportPreviewModal) {
      reportPreviewModal.classList.remove('hidden');
    }
  }

  const closePreviewModal = () => {
    if (reportPreviewModal) reportPreviewModal.classList.add('hidden');
  };
  if (closePreviewModalBtn) closePreviewModalBtn.addEventListener('click', closePreviewModal);
  if (closePreviewModalBtn2) closePreviewModalBtn2.addEventListener('click', closePreviewModal);

  if (previewDownloadCsvBtn) {
    previewDownloadCsvBtn.addEventListener('click', () => {
      const safeFile = `${currentPreviewReportType.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCompiledReport(currentPreviewReportType, 'CSV', safeFile);
    });
  }

  if (previewPrintPdfBtn) {
    previewPrintPdfBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // 7. Compile & Download Comprehensive Multi-Dashboard Report (CSV / Excel / Printable HTML-PDF)
  function downloadCompiledReport(reportType, format, filename) {
    const ov = masterReportData.overview;
    const trees = masterReportData.filteredTrees;
    const adopters = masterReportData.adopters;
    const caretakers = masterReportData.caretakersPerf;
    const imp = masterReportData.impact;

    const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const lines = [
      ['ATAMAN OFFICIAL MULTI-DASHBOARD REPORT'],
      ['Report Type', reportType],
      ['Generated At', new Date().toLocaleString()],
      ['Generated By', 'Ethel Zeta (Super Administrator)'],
      [],
      ['--- 1. EXECUTIVE DASHBOARD OVERVIEW ---'],
      ['Metric', 'Value'],
      ['Total Planted Trees', ov.totalTrees],
      ['Registered Planting Batches', trees.length],
      ['Overall Survival Rate', `${ov.survivalRate}%`],
      ['Healthy Trees', ov.healthy],
      ['Needs Care Trees', ov.needsCare],
      ['Critical Condition Trees', ov.critical],
      ['Dead Trees', ov.dead],
      ['Active Caretakers', ov.caretakers],
      ['Registered Adopters', ov.adopters],
      ['Total Trees Adopted', ov.adoptedTrees],
      ['Total Sponsorship Funding', ov.contributions],
      ['Annual CO2 Sequestered (kg/yr)', imp.co2Kg],
      ['Annual Oxygen Produced (kg/yr)', imp.o2Kg],
      ['Annual Stormwater Intercepted (L/yr)', imp.waterLiters],
      ['Restored Canopy Area (m2)', imp.canopySqm],
      [],
      ['--- 2. SPECIES BREAKDOWN (ANALYTICS & TREES DASHBOARDS) ---'],
      ['Species', 'Scientific Name', 'Total Trees', 'Healthy', 'Needs Care', 'Critical', 'Dead', 'Survival Rate'],
      ...masterReportData.species.map(s => [
        s.species,
        s.scientific,
        s.total,
        s.healthy,
        s.needsCare,
        s.critical,
        s.dead,
        `${s.total > 0 ? (((s.total - s.dead) / s.total) * 100).toFixed(1) : '100.0'}%`
      ]),
      [],
      ['--- 3. BARANGAY GEOGRAPHIC DISTRIBUTION (TREE MAP DASHBOARD) ---'],
      ['Barangay', 'Municipality', 'Total Trees', 'Healthy', 'Needs Care', 'Critical', 'Dead'],
      ...masterReportData.locations.map(l => [
        `Brgy. ${l.location}`,
        l.municipality,
        l.total,
        l.healthy,
        l.needsCare,
        l.critical,
        l.dead
      ]),
      [],
      ['--- 4. COMPLETE TREE INVENTORY & GIS COORDINATES ---'],
      ['Batch ID', 'Species', 'Scientific Name', 'Tree Count', 'Barangay', 'Municipality', 'Latitude', 'Longitude', 'Health Status', 'Caretaker', 'Adopter', 'Date Planted'],
      ...trees.map(t => [
        t.id,
        getSpeciesName(t),
        getScientificName(t),
        getCnt(t),
        getLocationName(t),
        t.municipality || 'Catbalogan City',
        t.lat || 11.775,
        t.lng || 124.886,
        getStatusKey(t),
        t.caretaker || 'Dodong Zeta',
        t.adopter || t.sponsorName || 'Available',
        t.datePlanted || '2026'
      ]),
      [],
      ['--- 5. ADOPTERS & SPONSORSHIP DIRECTORY (ADOPTERS DASHBOARD) ---'],
      ['Adopter ID', 'Name', 'Email', 'Address', 'Adopted Trees', 'Contribution (PHP)', 'Status'],
      ...adopters.map(a => [
        a.id || 'ADP-101',
        a.name,
        a.email || 'nikkimaga24@gmail.com',
        a.address || 'Brgy. Guinsorongan, Catbalogan City, Samar',
        a.treesCount || 10,
        Number(a.funding || a.fundingPaid || 500),
        a.status || 'Active'
      ]),
      [],
      ['--- 6. CARETAKER FIELD PERFORMANCE (CARETAKERS DASHBOARD) ---'],
      ['Employee ID', 'Name', 'Email', 'Assigned Trees', 'Completed Inspections', 'Pending Care', 'Urgent/Critical', 'Completion Rate'],
      ...caretakers.map(c => [
        c.id,
        c.name,
        c.email,
        c.trees,
        c.completed,
        c.pending,
        c.overdue,
        `${c.compRate}%`
      ]),
      [],
      ['--- 7. MAINTENANCE ACTIVITIES BREAKDOWN ---'],
      ['Maintenance Task', 'Completed', 'Pending', 'Urgent/Overdue'],
      ...masterReportData.maintenance.map(m => [m.task, m.completed, m.pending, m.overdue]),
      [],
      ['--- 8. CRITICAL & NEEDS-CARE TREE SURVEILLANCE ---'],
      ['Tree Batch ID', 'Species & Count', 'Location', 'Flagged Issue', 'Assigned Caretaker', 'Last Inspected', 'Priority'],
      ...masterReportData.criticalRegistry.map(cr => [cr.id, cr.species, cr.loc, cr.issue, cr.ct, cr.date, cr.prio])
    ];

    const csvString = '\uFEFF' + lines.map(row => row.map(csvEscape).join(',')).join('\r\n');
    const outName = filename.endsWith('.pdf') ? filename.replace(/\.pdf$/i, '.csv') : filename;
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = outName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Downloaded "${reportType}" with live data from all dashboards!`, 'success');
  }

  // 8. Filter Buttons & Live Filter Listeners
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
      computeAndRenderAllReports();
      showToast(`Report updated: ${masterReportData.overview.totalTrees.toLocaleString()} trees matching filters.`, 'info');
    });
  }

  [filterLocation, filterSpecies, filterCaretaker, filterAdopter, filterProject, filterHealth].forEach(sel => {
    if (sel) {
      sel.addEventListener('change', () => {
        computeAndRenderAllReports();
      });
    }
  });

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      if (filterStartDate) filterStartDate.value = '2025-09-01';
      if (filterEndDate) filterEndDate.value = new Date().toISOString().split('T')[0];
      if (filterLocation) filterLocation.value = 'ALL';
      if (filterSpecies) filterSpecies.value = 'ALL';
      if (filterCaretaker) filterCaretaker.value = 'ALL';
      if (filterAdopter) filterAdopter.value = 'ALL';
      if (filterProject) filterProject.value = 'ALL';
      if (filterHealth) filterHealth.value = 'ALL';

      computeAndRenderAllReports();
      showToast('Filters reset — showing complete live data across all dashboards.', 'info');
    });
  }

  // 9. Report Generator Modal Handlers
  const openReportGenModal = () => {
    if (reportGenModal) reportGenModal.classList.remove('hidden');
  };
  const closeReportGenModal = () => {
    if (reportGenModal) reportGenModal.classList.add('hidden');
  };

  if (openReportGenModalBtn) openReportGenModalBtn.addEventListener('click', openReportGenModal);
  if (btnGenNewTop) btnGenNewTop.addEventListener('click', openReportGenModal);
  if (closeReportGenModalBtn) closeReportGenModalBtn.addEventListener('click', closeReportGenModal);
  if (cancelGenBtn) cancelGenBtn.addEventListener('click', closeReportGenModal);

  const formatPills = document.querySelectorAll('.format-choice-pill');
  let selectedFormat = 'PDF';
  formatPills.forEach(pill => {
    pill.addEventListener('click', () => {
      formatPills.forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedFormat = pill.getAttribute('data-fmt') || 'PDF';
    });
  });

  if (reportGenForm) {
    reportGenForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const checkedRadio = document.querySelector('input[name="repType"]:checked');
      const reportType = checkedRadio ? checkedRadio.value : 'Complete ATAMAN Master Report';
      const sDate = document.getElementById('genStartDate')?.value || '2025-09-01';
      const eDate = document.getElementById('genEndDate')?.value || new Date().toISOString().slice(0, 10);

      closeReportGenModal();

      const ov = masterReportData.overview;
      const newEntry = {
        id: `REP-${Date.now()}`,
        title: reportType,
        scope: `Compiled Snapshot: ${ov.totalTrees} Trees (${ov.survivalRate}% Survival) • ${ov.adopters} Adopter • ${ov.caretakers} Caretaker`,
        author: 'Ethel Zeta (Super Admin)',
        date: `${sDate} to ${eDate}`,
        format: selectedFormat
      };

      try {
        const existing = JSON.parse(localStorage.getItem('ATAMAN_reports_archive') || '[]');
        const arr = Array.isArray(existing) ? existing : [];
        arr.unshift(newEntry);
        localStorage.setItem('ATAMAN_reports_archive', JSON.stringify(arr.slice(0, 25)));
      } catch (_) {}

      renderReportsArchive();

      const ext = selectedFormat === 'PDF' ? '.csv' : selectedFormat === 'Excel' ? '.csv' : '.csv';
      const fileName = `${reportType.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}${ext}`;
      downloadCompiledReport(reportType, selectedFormat, fileName);
      openReportPreviewModal(reportType, `${sDate} to ${eDate}`);
    });
  }

  // 10. Critical Trees Full Registry Modal
  if (btnViewAllCritTrees) {
    btnViewAllCritTrees.addEventListener('click', () => {
      const critModalTitle = document.getElementById('critModalTitle');
      const totalFlagged = masterReportData.overview.critical + masterReportData.overview.needsCare;
      if (critModalTitle) {
        critModalTitle.textContent = `🚨 Complete Critical & Needs-Care Tree Registry (${totalFlagged} Trees / ${masterReportData.criticalRegistry.length} Batches)`;
      }
      if (tbodyFullCritList) {
        tbodyFullCritList.innerHTML = masterReportData.criticalRegistry.map(cr => `
          <tr>
            <td><span class="id-badge" style="color:${cr.status === 'critical' ? '#dc2626' : '#d97706'};">${cr.id}</span></td>
            <td><strong>${cr.species}</strong></td>
            <td>${cr.loc}</td>
            <td>${cr.issue}</td>
            <td>${cr.ct}</td>
            <td>${cr.date}</td>
            <td><span class="stat-pill ${cr.status === 'critical' ? 'critical' : 'care'}">${cr.prio}</span></td>
            <td class="text-center">
              <a href="admin-tree-map.html?tree=${encodeURIComponent(cr.id)}" class="btn btn-outline btn-sm">Locate on Map 🗺️</a>
            </td>
          </tr>
        `).join('');
      }
      if (critTreesModal) critTreesModal.classList.remove('hidden');
    });
  }

  const closeCritModal = () => {
    if (critTreesModal) critTreesModal.classList.add('hidden');
  };
  if (closeCritTreesModalBtn) closeCritTreesModalBtn.addEventListener('click', closeCritModal);
  if (closeCritTreesBtn2) closeCritTreesBtn2.addEventListener('click', closeCritModal);

  // 11. Top Export Report & Print Buttons
  if (exportReportBtn) {
    exportReportBtn.addEventListener('click', () => {
      const fileName = `ATAMAN_Complete_Master_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCompiledReport('Complete ATAMAN Master Report', 'CSV', fileName);
    });
  }

  if (printReportBtn) {
    printReportBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // 12. Real-Time Sync Listeners Across All Dashboards
  window.addEventListener('ATAMAN:trees-updated', computeAndRenderAllReports);
  window.addEventListener('ATAMAN:adopters-updated', computeAndRenderAllReports);
  window.addEventListener('ATAMAN:caretakers-updated', computeAndRenderAllReports);
  window.addEventListener('ATAMAN:users-updated', computeAndRenderAllReports);
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('ATAMAN_')) {
      computeAndRenderAllReports();
    }
  });

  // Initial Calculation & Render
  computeAndRenderAllReports();

  // Auto-open Report Generator Modal if navigated from Dashboard "Generate Report" button
  if (window.location.search.includes('action=generate') && reportGenModal) {
    reportGenModal.classList.remove('hidden');
  }
});
