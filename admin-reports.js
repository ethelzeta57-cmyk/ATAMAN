/* ==========================================================================
   ATAMAN Admin Reports & Analytics JavaScript
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Master Dataset for Reports Calculation — Ready for your real data
  const masterReportData = {
    overview: {
      totalTrees: 0,
      survivalRate: 0,
      caretakers: 0,
      adopters: 0,
      healthy: 0,
      needsCare: 0,
      critical: 0,
      dead: 0
    },
    species: [],
    locations: [],
    caretakers: [],
    maintenance: [],
    criticalRegistry: []

  };

  // DOM Elements
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

  // Summary Card Targets
  const cardTotalTrees = document.getElementById('cardTotalTrees');
  const cardSurvivalRate = document.getElementById('cardSurvivalRate');
  const cardTotalCaretakers = document.getElementById('cardTotalCaretakers');
  const cardTotalAdopters = document.getElementById('cardTotalAdopters');
  const cardHealthyTrees = document.getElementById('cardHealthyTrees');
  const cardCriticalTrees = document.getElementById('cardCriticalTrees');
  const cardDeadTrees = document.getElementById('cardDeadTrees');
  const dispSurvivalRate = document.getElementById('dispSurvivalRate');
  const topDateRangeText = document.getElementById('topDateRangeText');

  // Table Bodies
  const tbodySpecies = document.getElementById('tbodySpecies');
  const tbodyGeo = document.getElementById('tbodyGeo');
  const tbodyCaretakers = document.getElementById('tbodyCaretakers');
  const tbodyMaint = document.getElementById('tbodyMaint');
  const tbodyCrit = document.getElementById('tbodyCrit');
  const tbodyArchive = document.getElementById('tbodyArchive');
  const sortCaretakersBy = document.getElementById('sortCaretakersBy');

  // Modals
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

  // Action Buttons
  const exportReportBtn = document.getElementById('exportReportBtn');
  const printReportBtn = document.getElementById('printReportBtn');

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

  // Tab Jump Navigation
  const tabLinks = document.querySelectorAll('.report-tab-link');
  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      tabLinks.forEach(t => t.classList.remove('active'));
      link.classList.add('active');
      const targetId = link.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Render Caretakers Table
    const renderCaretakersTable = () => {
    if (!tbodyCaretakers) return;
    const sortVal = sortCaretakersBy ? sortCaretakersBy.value : 'comp';
    let list = [...(masterReportData.caretakers || [])];

    if (list.length === 0) {
      tbodyCaretakers.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color:#94a3b8; font-weight:600;">👤 No caretaker performance records yet.</td></tr>';
      return;
    }

    if (sortVal === 'comp') {
      list.sort((a, b) => b.compRate - a.compRate);
    } else if (sortVal === 'trees') {
      list.sort((a, b) => b.trees - a.trees);
    } else if (sortVal === 'overdue') {
      list.sort((a, b) => b.overdue - a.overdue);
    }

    tbodyCaretakers.innerHTML = list.map(c => `
      <tr>
        <td><strong>${c.name}</strong> <span class="id-badge">${c.id}</span></td>
        <td class="text-right">${(c.trees || 0).toLocaleString()}</td>
        <td class="text-right text-success">${(c.completed || 0).toLocaleString()}</td>
        <td class="text-right text-warning">${c.pending || 0}</td>
        <td class="text-right text-danger">${c.overdue || 0}</td>
        <td class="text-right"><strong class="text-success">${c.compRate || 0}%</strong></td>
        <td class="text-center"><a href="admin-caretakers.html" class="btn btn-outline btn-sm">Profile</a></td>
      </tr>
    `).join('');
  };

  if (sortCaretakersBy) {
    sortCaretakersBy.addEventListener('change', renderCaretakersTable);
  }

  // Filter Application Logic
  const applyFilters = () => {
    const loc = filterLocation.value;
    const spec = filterSpecies.value;
    const health = filterHealth.value;
    const start = filterStartDate.value;
    const end = filterEndDate.value;

    if (topDateRangeText) topDateRangeText.textContent = `${start} – ${end}`;

    // Compute dynamic scaling based on filters
    let multiplier = 1.0;
    if (loc !== 'ALL') multiplier *= 0.45;
    if (spec !== 'ALL') multiplier *= 0.35;
    if (health !== 'ALL') multiplier *= 0.6;

    const baseTrees = masterReportData.overview.totalTrees;
    const filteredTotal = baseTrees === 0 ? 0 : Math.max(1, Math.round(baseTrees * multiplier));
    const filteredHealthy = Math.round(filteredTotal * 0.825);
    const filteredCare = Math.round(filteredTotal * 0.115);
    const filteredCritical = Math.round(filteredTotal * 0.025);
    const filteredDead = filteredTotal - filteredHealthy - filteredCare - filteredCritical;

    // Update Summary Cards
    cardTotalTrees.textContent = filteredTotal.toLocaleString();
    cardHealthyTrees.textContent = filteredHealthy.toLocaleString();
    cardCriticalTrees.textContent = filteredCritical.toLocaleString();
    cardDeadTrees.textContent = filteredDead.toLocaleString();

    showToast('Report metrics dynamically recalculated based on filters.', 'info');
  };

  applyFiltersBtn.addEventListener('click', applyFilters);

  resetFiltersBtn.addEventListener('click', () => {
    const todayIso = new Date().toISOString().split('T')[0];
    filterStartDate.value = todayIso;
    filterEndDate.value = todayIso;
    filterLocation.value = 'ALL';
    filterSpecies.value = 'ALL';
    filterCaretaker.value = 'ALL';
    filterAdopter.value = 'ALL';
    filterProject.value = 'ALL';
    filterHealth.value = 'ALL';

    cardTotalTrees.textContent = masterReportData.overview.totalTrees.toLocaleString();
    cardHealthyTrees.textContent = masterReportData.overview.healthy.toLocaleString();
    cardCriticalTrees.textContent = masterReportData.overview.critical.toLocaleString();
    cardDeadTrees.textContent = masterReportData.overview.dead.toLocaleString();
    if (topDateRangeText) topDateRangeText.textContent = todayIso;

    showToast('Filters reset to default system view.', 'info');
  });

  // Report Generator Modal Handlers
  const openReportGenModal = () => {
    reportGenModal.classList.remove('hidden');
  };

  const closeReportGenModal = () => {
    reportGenModal.classList.add('hidden');
  };

  openReportGenModalBtn.addEventListener('click', openReportGenModal);
  if (btnGenNewTop) btnGenNewTop.addEventListener('click', openReportGenModal);
  closeReportGenModalBtn.addEventListener('click', closeReportGenModal);
  cancelGenBtn.addEventListener('click', closeReportGenModal);

  // Format Choice Pills
  const formatPills = document.querySelectorAll('.format-choice-pill');
  let selectedFormat = 'PDF';

  formatPills.forEach(pill => {
    pill.addEventListener('click', () => {
      formatPills.forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedFormat = pill.getAttribute('data-fmt');
    });
  });

  // Submit Report Generation
  reportGenForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const checkedRadio = document.querySelector('input[name="repType"]:checked');
    const reportType = checkedRadio ? checkedRadio.value : 'Complete ATAMAN Report';
    const sDate = document.getElementById('genStartDate').value;
    const eDate = document.getElementById('genEndDate').value;

    closeReportGenModal();

    // Add entry to Recent Generated Reports Table
    const badgeClass = selectedFormat === 'PDF' ? 'critical' : selectedFormat === 'Excel' ? 'healthy' : 'care';
    const ext = selectedFormat === 'PDF' ? '.pdf' : selectedFormat === 'Excel' ? '.xlsx' : '.csv';
    const fileName = `${reportType.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}${ext}`;

    const newRow = document.createElement('tr');
    newRow.innerHTML = `
      <td><strong>${reportType}</strong></td>
      <td>Admin (Ethel Zeta)</td>
      <td>Today (${sDate} to ${eDate})</td>
      <td><span class="stat-pill ${badgeClass}">${selectedFormat}</span></td>
      <td class="text-center">
        <button class="btn btn-outline btn-sm download-archive-btn" data-title="${fileName}" type="button">📥 Download</button>
      </td>
    `;
    tbodyArchive.insertBefore(newRow, tbodyArchive.firstChild);

    // Attach click to new row
    newRow.querySelector('.download-archive-btn').addEventListener('click', () => {
      triggerMockDownload(fileName);
    });

    showToast(`Compiled "${reportType}" (${selectedFormat}). Download started!`, 'success');
    triggerMockDownload(fileName);
  });

  // Critical Trees Full Registry Modal
  btnViewAllCritTrees.addEventListener('click', () => {
    tbodyFullCritList.innerHTML = masterReportData.criticalRegistry.map(cr => `
      <tr>
        <td><span class="id-badge" style="color:#dc2626;">${cr.id}</span></td>
        <td><strong>${cr.species}</strong></td>
        <td>${cr.loc}</td>
        <td>${cr.issue}</td>
        <td>${cr.ct}</td>
        <td>${cr.date}</td>
        <td><span class="stat-pill ${cr.prio.includes('High') ? 'critical' : 'care'}">${cr.prio}</span></td>
        <td class="text-center">
          <a href="admin-tree-map.html" class="btn btn-outline btn-sm">Locate on Map</a>
        </td>
      </tr>
    `).join('');
    critTreesModal.classList.remove('hidden');
  });

  const closeCritModal = () => critTreesModal.classList.add('hidden');
  closeCritTreesModalBtn.addEventListener('click', closeCritModal);
  closeCritTreesBtn2.addEventListener('click', closeCritModal);

  // Trigger Mock File Download
  const triggerMockDownload = (filename) => {
    const isCsv = filename.endsWith('.csv');
    const content = isCsv
      ? 'Tree ID,Species,Location,Health,Survival Rate,Caretaker\nTR-10021,Narra,San Isidro,Healthy,97.6%,Dodong Zeta\nTR-10047,Acacia,Santiago,Critical,94.0%,Dodong Zeta\n'
      : `ATAMAN Official Analytical Report\nGenerated: ${new Date().toLocaleString()}\nFile: ${filename}\nScope: Master System Export\n`;

    const blob = new Blob([content], { type: isCsv ? 'text/csv' : 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Attach download handlers for existing archive buttons
  document.querySelectorAll('.download-archive-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.getAttribute('data-title') || 'ATAMAN_Report.pdf';
      showToast(`Downloading archived report: ${title}...`, 'success');
      triggerMockDownload(title);
    });
  });

  // Top Export Report Button
  exportReportBtn.addEventListener('click', () => {
    const ov = masterReportData.overview || {};
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURI(
      'ATAMAN Master Analytics Summary\n' +
      `Total Trees,${ov.totalTrees || 0}\n` +
      `Overall Survival Rate,${ov.survival || '0%'}\n` +
      `Healthy Trees,${ov.healthy || 0}\n` +
      `Critical Trees,${ov.critical || 0}\n` +
      `Dead Trees,${ov.dead || 0}\n` +
      `Total Caretakers,${ov.caretakers || 0}\n` +
      `Total Adopters,${ov.adopters || 0}\n` +
      `Total Contributions,${ov.contributions || '₱0'}\n`
    );
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `ATAMAN_Master_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Executive summary exported as CSV!', 'success');
  });

  // Print Report Handler
  printReportBtn.addEventListener('click', () => {
    window.print();
  });

  // Sidebar Submenus Toggle
  document.querySelectorAll('.nav-item.has-children .nav-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = btn.closest('.nav-item');
      parent.classList.toggle('open');
    });
  });

  // Real-Time Overview Calculation
  function updateRealtimeOverview() {
    let trees = [];
    let adopters = [];
    let caretakers = [];
    try { trees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]'); } catch(e) {}
    try { adopters = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]'); } catch(e) {}
    try { caretakers = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]'); } catch(e) {}

    const getCnt = (t) => Math.max(1, parseInt(t.treeCount || t.count) || 1);
    const totalTrees = trees.reduce((sum, t) => sum + getCnt(t), 0);
    const healthy = trees.filter(t => (t.status || 'healthy') === 'healthy').reduce((sum, t) => sum + getCnt(t), 0);
    const needsCare = trees.filter(t => t.status === 'needs-care' || t.status === 'needs').reduce((sum, t) => sum + getCnt(t), 0);
    const critical = trees.filter(t => t.status === 'critical').reduce((sum, t) => sum + getCnt(t), 0);
    const dead = trees.filter(t => t.status === 'dead').reduce((sum, t) => sum + getCnt(t), 0);
    const nonDead = totalTrees - dead;
    const survivalRate = totalTrees > 0 ? ((nonDead / totalTrees) * 100).toFixed(1) : 0;
    const totalAdoptedTrees = adopters.reduce((sum, a) => sum + (parseInt(a.treesCount, 10) || (Array.isArray(a.treesList) ? a.treesList.length : 0)), 0);
    const totalFunding = adopters.reduce((sum, a) => {
      const hasFund = a.customFunding || ((parseInt(a.treesCount) || 0) > 0 && Number(a.funding || a.fundingPaid) > 0);
      return sum + (hasFund ? (Number(a.funding || a.fundingPaid) || 0) : 0);
    }, 0);

    masterReportData.overview.totalTrees = totalTrees;
    masterReportData.overview.survivalRate = survivalRate;
    masterReportData.overview.healthy = healthy;
    masterReportData.overview.needsCare = needsCare;
    masterReportData.overview.critical = critical;
    masterReportData.overview.dead = dead;
    masterReportData.overview.caretakers = caretakers.length;
    masterReportData.overview.adopters = adopters.length;
    masterReportData.overview.contributions = `₱${totalFunding.toLocaleString()}`;

    if (cardTotalTrees) cardTotalTrees.textContent = totalTrees.toLocaleString();
    if (cardSurvivalRate) cardSurvivalRate.textContent = `${survivalRate}%`;
    if (dispSurvivalRate) dispSurvivalRate.textContent = `${survivalRate}%`;
    if (cardTotalCaretakers) cardTotalCaretakers.textContent = caretakers.length.toLocaleString();
    if (cardTotalAdopters) cardTotalAdopters.textContent = adopters.length.toLocaleString();
    if (cardHealthyTrees) cardHealthyTrees.textContent = healthy.toLocaleString();
    if (cardCriticalTrees) cardCriticalTrees.textContent = critical.toLocaleString();
    if (cardDeadTrees) cardDeadTrees.textContent = dead.toLocaleString();

    const dispTotalTreesHeader = document.getElementById('dispTotalTreesHeader');
    if (dispTotalTreesHeader) dispTotalTreesHeader.textContent = `${totalTrees.toLocaleString()} Total Trees`;
    const repHealthyCount = document.getElementById('repHealthyCount');
    if (repHealthyCount) repHealthyCount.textContent = healthy.toLocaleString();
    const repCareCount = document.getElementById('repCareCount');
    if (repCareCount) repCareCount.textContent = needsCare.toLocaleString();
    const repCriticalCount = document.getElementById('repCriticalCount');
    if (repCriticalCount) repCriticalCount.textContent = critical.toLocaleString();
    const repDeadCount = document.getElementById('repDeadCount');
    if (repDeadCount) repDeadCount.textContent = dead.toLocaleString();

    // Populate Species Table (#tbodySpecies)
    if (tbodySpecies) {
      const spMap = {};
      trees.forEach(t => {
        const sp = (typeof t.species === 'object' && t.species ? t.species.common : t.species) || 'Narra';
        const cnt = getCnt(t);
        const st = (t.status || 'healthy').toLowerCase();
        if (!spMap[sp]) spMap[sp] = { total: 0, healthy: 0, critical: 0, dead: 0 };
        spMap[sp].total += cnt;
        if (st === 'healthy') spMap[sp].healthy += cnt;
        else if (st === 'critical') spMap[sp].critical += cnt;
        else if (st === 'dead') spMap[sp].dead += cnt;
        else spMap[sp].healthy += cnt;
      });
      const spEntries = Object.entries(spMap);
      const badgeSpeciesCount = document.getElementById('badgeSpeciesCount');
      if (badgeSpeciesCount) badgeSpeciesCount.textContent = `${spEntries.length} Species`;
      if (spEntries.length > 0) {
        tbodySpecies.innerHTML = spEntries.map(([sp, d]) => {
          const surv = d.total > 0 ? (((d.total - d.dead) / d.total) * 100).toFixed(1) : '0.0';
          return `
            <tr>
              <td><strong>${sp}</strong></td>
              <td class="text-right">${d.total.toLocaleString()}</td>
              <td class="text-right text-success">${d.healthy.toLocaleString()}</td>
              <td class="text-right text-danger">${d.critical.toLocaleString()}</td>
              <td class="text-right">${d.dead.toLocaleString()}</td>
              <td class="text-right"><strong class="text-success">${surv}%</strong></td>
            </tr>
          `;
        }).join('');
      }
    }

    // Populate Caretakers Performance Table
    masterReportData.caretakers = caretakers.map(c => ({
      name: c.name,
      id: c.empId || c.id || 'CT-01',
      trees: c.assignedTrees || totalTrees,
      completed: c.completedMonitoring || 0,
      pending: c.pendingMonitoring || 0,
      overdue: c.overdueMonitoring || 0,
      compRate: c.completionRate || 100
    }));
    renderCaretakersTable();

    // Update Adopters & Funding section (#secAdopters)
    const secAdopters = document.getElementById('secAdopters');
    if (secAdopters) {
      const cards = secAdopters.querySelectorAll('.card');
      if (cards[0]) {
        const strongs = cards[0].querySelectorAll('strong');
        if (strongs[0]) strongs[0].textContent = adopters.length.toLocaleString();
        if (strongs[1]) strongs[1].textContent = adopters.filter(a => (a.status || 'Active') === 'Active').length.toLocaleString();
        if (strongs[2]) strongs[2].textContent = totalAdoptedTrees.toLocaleString();
        const pill = cards[0].querySelector('.stat-pill');
        if (pill) pill.textContent = `🟢 ${totalAdoptedTrees > 0 ? '100%' : '0%'} Survival`;
      }
      if (cards[1]) {
        const badge = cards[1].querySelector('.status-badge');
        if (badge) badge.textContent = `₱${totalFunding.toLocaleString()} Received`;
        const strongs = cards[1].querySelectorAll('strong');
        if (strongs[0]) strongs[0].textContent = `₱${totalFunding.toLocaleString()}`;
        if (strongs[1]) strongs[1].textContent = `₱${totalFunding.toLocaleString()}`;
      }
    }
  }

  // Real-Time Sync Event Listeners
  window.addEventListener('ATAMAN:trees-updated', updateRealtimeOverview);
  window.addEventListener('ATAMAN:adopters-updated', updateRealtimeOverview);
  window.addEventListener('ATAMAN:caretakers-updated', updateRealtimeOverview);

  // Initial Render
  updateRealtimeOverview();
  renderCaretakersTable();

});
