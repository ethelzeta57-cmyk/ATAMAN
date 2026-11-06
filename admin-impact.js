/* ==========================================================================
   admin-impact.js — ATAMAN Admin Program Impact Dashboard Logic
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  /* ── DOM References ── */
  const sidebarToggle       = document.getElementById('sidebarToggle');
  const sidebar             = document.getElementById('sidebar');
  const toastMsg            = document.getElementById('toastMsg');
  const exportImpactCsvBtn  = document.getElementById('exportImpactCsvBtn');
  const openModalBtn        = document.getElementById('openImpactReportModalBtn');
  const closeModalBtn       = document.getElementById('closeImpactModalBtn');
  const cancelModalBtn      = document.getElementById('cancelImpactModalBtn');
  const modalOverlay        = document.getElementById('impactModalOverlay');
  const confirmGenerateBtn  = document.getElementById('confirmGenerateImpactBtn');
  const tabButtons          = document.querySelectorAll('.tab-btn');
  const focusAreaButtons    = document.querySelectorAll('.btn-focus-area');

  const locFilter           = document.getElementById('impactLocationFilter');
  const projFilter          = document.getElementById('impactProjectFilter');
  const adopterFilter       = document.getElementById('impactAdopterFilter');

  /* ── Toast Helper ── */
  function showToast(msg, duration = 3000) {
    toastMsg.textContent = msg;
    toastMsg.classList.remove('hidden');
    clearTimeout(toastMsg._timer);
    toastMsg._timer = setTimeout(() => {
      toastMsg.classList.add('hidden');
    }, duration);
  }

  /* ── Mobile Sidebar Toggle ── */
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
  document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !sidebarToggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });

  /* ── Sidebar Collapsible Submenus ── */
  document.querySelectorAll('.nav-item.has-children .nav-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const item = btn.closest('.nav-item');
      if (item) item.classList.toggle('open');
    });
  });

  /* ── In-Page Tab Navigation ── */
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;
      if (targetTab === 'tab-overview') {
        document.getElementById('secImpactSummary')?.scrollIntoView({ behavior: 'smooth' });
      } else if (targetTab === 'tab-trees') {
        document.getElementById('secSurvivalImpact')?.scrollIntoView({ behavior: 'smooth' });
      } else if (targetTab === 'tab-communities') {
        document.getElementById('secCommunityAdopter')?.scrollIntoView({ behavior: 'smooth' });
      } else if (targetTab === 'tab-adopters') {
        document.getElementById('secCommunityAdopter')?.scrollIntoView({ behavior: 'smooth' });
      } else if (targetTab === 'tab-projects') {
        document.getElementById('secProjectsProblems')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  /* ── Top Filters Feedback ── */
  [locFilter, projFilter, adopterFilter].forEach(sel => {
    if (sel) {
      sel.addEventListener('change', () => {
        const txt = sel.options[sel.selectedIndex].text;
        showToast(`🔍 Impact metrics filtered by: ${txt}`);
      });
    }
  });

  /* ── Focus / Action Area Plan Triggers ── */
  focusAreaButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const area = btn.dataset.area || 'Priority Site';
      showToast(`🚨 Loading Intervention & Action Plan for ${area}...`);
    });
  });

  /* ── Modal Controls ── */
  function openModal() {
    if (modalOverlay) modalOverlay.classList.remove('hidden');
  }
  function closeModal() {
    if (modalOverlay) modalOverlay.classList.add('hidden');
  }

  if (openModalBtn) openModalBtn.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Radio pill selection inside modal
  const radioPills = document.querySelectorAll('.radio-pill');
  radioPills.forEach(pill => {
    pill.addEventListener('click', () => {
      radioPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const radio = pill.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  /* ── Modal Generate Trigger ── */
  if (confirmGenerateBtn) {
    confirmGenerateBtn.addEventListener('click', () => {
      const format = document.querySelector('input[name="impactFormat"]:checked')?.value || 'pdf';
      const period = document.getElementById('modalPeriod')?.value || 'Year-to-Date';
      
      confirmGenerateBtn.disabled = true;
      confirmGenerateBtn.textContent = '⏳ Compiling Impact Report...';

      setTimeout(() => {
        confirmGenerateBtn.disabled = false;
        confirmGenerateBtn.textContent = '⚡ Compile & Download Impact Report';
        closeModal();

        if (format === 'csv') {
          downloadImpactCsv();
        } else {
          // Simulated PDF Download
          const sampleContent = `%PDF-1.4\n% ATAMAN Program Impact Report (${period})\n1 0 obj << /Title (ATAMAN Impact Report) /Author (Super Administrator) >> endobj\ntrailer << /Root 1 0 R >> %%EOF`;
          const blob = new Blob([sampleContent], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ATAMAN_Impact_Report_2026_${period.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('📄 Official ATAMAN Program Impact PDF generated and downloaded.');
        }
      }, 1100);
    });
  }

  /* ── CSV Export Functionality ── */
  function downloadImpactCsv() {
    const csvContent = [
      'ATAMAN PROGRAM IMPACT DASHBOARD EXPORT',
      `Exported Date,${new Date().toLocaleDateString()}`,
      '',
      '=== IMPACT SUMMARY ===',
      'Metric,Value,Notes',
      'Total Trees Planted,2485,Target: 3000 (82.8%)',
      'Total Trees Survived,2400,Survival Rate: 86.8%',
      'Adopters Active,128,1842 adopted trees',
      'Barangay Areas Covered,18,Coverage Target: 20 (90%)',
      'Participating Farmers/Landowners,320,Local Land Partners',
      'Field Caretakers,24,21 Active',
      '',
      '=== VERIFIED ENVIRONMENTAL IMPACT ===',
      'Carbon Sequestered (Est.),142.8 Metric Tons CO2e/yr,DENR Forestry standards',
      'Forest Canopy Restored,4.85 Hectares,Canopy radius model',
      'Water Catchment Protected,1.85 Million Liters/yr,Soil retention estimate',
      '',
      '=== GEOGRAPHIC IMPACT BY BARANGAY ===',
      'Location,Trees Planted,Survival Rate,Farmers,Adopters,Impact Status',
      'San Isidro,485,91.2%,72,24,High Impact',
      'Mabini,392,89.5%,55,18,High Impact',
      'San Juan,287,92.1%,42,16,High Impact',
      'San Miguel,410,87.3%,40,21,Moderate',
      'Mt. Banahaw Site,390,85.0%,30,18,Moderate',
      'Santiago,521,78.4%,81,31,Needs Attention',
      '',
      '=== SPECIES SURVIVAL IMPACT ===',
      'Species,Planted,Surviving,Survival Rate',
      'Narra,620,605,97.6%',
      'Mahogany,580,559,96.4%',
      'Ipil-ipil,350,338,96.6%',
      'Banaba,280,273,97.5%',
      'Acacia,420,395,94.0%',
      'Molave,235,210,89.4%',
      '',
      '=== MAINTENANCE INTERVENTION OUTCOMES ===',
      'Intervention,Treated Trees,Improved Trees,Efficacy Rate',
      'Watering,420,360,85.7%',
      'Fertilization,190,148,77.9%',
      'Pest Control,120,92,76.7%',
      'Weed Removal,280,210,75.0%',
      'Soil Improvement,72,64,88.9%',
      'TOTAL INTERVENTIONS,1126,874,77.6%'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ATAMAN_Program_Impact_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('📊 Impact CSV dataset exported successfully.');
  }

  if (exportImpactCsvBtn) {
    exportImpactCsvBtn.addEventListener('click', downloadImpactCsv);
  }

  /* ── Dynamic Real-Time Impact Metric Calculation ── */
  function updateLiveImpactMetrics() {
    let trees = [];
    let adopters = [];
    let caretakers = [];
    try { trees = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]'); } catch(e) {}
    try { adopters = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]'); } catch(e) {}
    try { caretakers = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]'); } catch(e) {}

    const getCnt = (t) => Math.max(1, parseInt(t.treeCount || t.count) || 1);
    const totalPlanted = trees.reduce((sum, t) => sum + getCnt(t), 0);
    const dead = trees.filter(t => t.status === 'dead').reduce((sum, t) => sum + getCnt(t), 0);
    const survived = Math.max(0, totalPlanted - dead);
    const survRate = totalPlanted > 0 ? ((survived / totalPlanted) * 100).toFixed(1) : '0';
    const totalAdoptedTrees = adopters.reduce((sum, a) => sum + (parseInt(a.treesCount, 10) || (Array.isArray(a.treesList) ? a.treesList.length : 0)), 0);

    const valPlanted = document.getElementById('valPlanted');
    if (valPlanted) valPlanted.textContent = totalPlanted.toLocaleString();

    const valSurvived = document.getElementById('valSurvived');
    if (valSurvived) valSurvived.textContent = survived.toLocaleString();

    const survSub = valSurvived?.closest('.imp-body')?.querySelector('.imp-sub');
    if (survSub) survSub.textContent = `${survRate}% survival rate`;

    const adopterVal = document.querySelector('.imp-teal .imp-val');
    if (adopterVal) adopterVal.textContent = adopters.length.toLocaleString();
    const adopterSub = document.querySelector('.imp-teal .imp-sub');
    if (adopterSub) adopterSub.textContent = `${totalAdoptedTrees.toLocaleString()} trees adopted`;

    const caretakerVal = document.querySelector('.imp-violet .imp-val');
    if (caretakerVal) caretakerVal.textContent = caretakers.length.toLocaleString();
    const caretakerSub = document.querySelector('.imp-violet .imp-sub');
    if (caretakerSub) caretakerSub.textContent = `${caretakers.filter(c => (c.status || 'Active') === 'Active').length} active on-ground`;

    // Update Survival Ring & Eco Metrics
    const survNum = document.querySelector('.surv-num');
    if (survNum) survNum.textContent = `${survRate}%`;
    const ecoVals = document.querySelectorAll('.eco-grid .eco-val');
    if (ecoVals.length >= 3) {
      ecoVals[0].textContent = `${(survived * 0.022).toFixed(2)} Metric Tons`;
      ecoVals[1].textContent = `${(survived * 0.0025).toFixed(2)} Hectares`;
      ecoVals[2].textContent = `${(survived * 450).toLocaleString()} Liters`;
    }
  }

  // Initial Boot & Real-Time Sync Event Listeners
  updateLiveImpactMetrics();
  window.addEventListener('ATAMAN:trees-updated', updateLiveImpactMetrics);
  window.addEventListener('ATAMAN:adopters-updated', updateLiveImpactMetrics);
  window.addEventListener('ATAMAN:caretakers-updated', updateLiveImpactMetrics);
});
