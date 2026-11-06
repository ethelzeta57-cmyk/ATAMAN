/* ============================================================
   admin-analytics.js — ATAMAN Admin Analytics Interactivity
   ============================================================ */

'use strict';

/* ── DOM refs ── */
const sidebar        = document.getElementById('sidebar');
const sidebarToggle  = document.getElementById('sidebarToggle');
const refreshBtn     = document.getElementById('refreshBtn');
const exportDashBtn  = document.getElementById('exportDashBtn');
const filterLocation = document.getElementById('filterLocation');
const filterProject  = document.getElementById('filterProject');
const drillPanel     = document.getElementById('drillPanel');
const drillOverlay   = document.getElementById('drillOverlay');
const drillClose     = document.getElementById('drillClose');
const drillTitle     = document.getElementById('drillTitle');
const drillBody      = document.getElementById('drillBody');
const toastMsg       = document.getElementById('toastMsg');
const insightsGrid   = document.getElementById('insightsGrid');

/* ══════════════════════════════════
   SIDEBAR TOGGLE (mobile)
══════════════════════════════════ */
if (sidebarToggle) {
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

// Collapsible submenus
document.querySelectorAll('.nav-item.has-children .nav-toggle').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const item = btn.closest('.nav-item');
    if (item) item.classList.toggle('open');
  });
});

/* ══════════════════════════════════
   TOAST
══════════════════════════════════ */
function showToast(msg, duration = 2800) {
  toastMsg.textContent = msg;
  toastMsg.classList.remove('hidden');
  clearTimeout(toastMsg._timer);
  toastMsg._timer = setTimeout(() => toastMsg.classList.add('hidden'), duration);
}

/* ══════════════════════════════════
   SVG DONUT CHART & REAL-TIME KPIS
══════════════════════════════════ */
function drawDonut(h = 0, nc = 0, cr = 0, d = 0) {
  const svg = document.getElementById('healthDonut');
  if (!svg) return;

  const total = h + nc + cr + d;
  const centerEl = document.querySelector('.donut-main');
  if (centerEl) centerEl.textContent = total.toLocaleString();

  // Legend items
  const legend = document.querySelector('.donut-legend');
  if (legend) {
    const calcPct = (v) => total > 0 ? ((v / total) * 100).toFixed(1) : '0';
    legend.innerHTML = `
      <div class="legend-item"><span class="legend-dot" style="background:#22c55e"></span><span>Healthy</span><strong>${h.toLocaleString()}</strong><em>${calcPct(h)}%</em></div>
      <div class="legend-item"><span class="legend-dot" style="background:#f59e0b"></span><span>Needs Care</span><strong>${nc.toLocaleString()}</strong><em>${calcPct(nc)}%</em></div>
      <div class="legend-item"><span class="legend-dot" style="background:#ef4444"></span><span>Critical</span><strong>${cr.toLocaleString()}</strong><em>${calcPct(cr)}%</em></div>
      <div class="legend-item"><span class="legend-dot" style="background:#64748b"></span><span>Dead</span><strong>${d.toLocaleString()}</strong><em>${calcPct(d)}%</em></div>
    `;
  }

  const cx = 100, cy = 100, r = 80, strokeW = 26;
  const circumference = 2 * Math.PI * r;
  svg.innerHTML = '';

  // Background circle (empty state)
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('cx', cx); bg.setAttribute('cy', cy); bg.setAttribute('r', r);
  bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', '#e2e8f0');
  bg.setAttribute('stroke-width', strokeW);
  svg.appendChild(bg);

  if (total === 0) return;

  const segments = [
    { label: 'Healthy',    value: h, color: '#22c55e' },
    { label: 'Needs Care', value: nc, color: '#f59e0b' },
    { label: 'Critical',   value: cr, color: '#ef4444' },
    { label: 'Dead',       value: d, color: '#64748b' },
  ];

  let accumulated = 0;
  segments.forEach(seg => {
    if (seg.value <= 0) return;
    const ratio = seg.value / total;
    const dash = ratio * circumference;
    const offset = -accumulated * circumference;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', r);
    circle.setAttribute('fill', 'none'); circle.setAttribute('stroke', seg.color);
    circle.setAttribute('stroke-width', strokeW);
    circle.setAttribute('stroke-dasharray', `${dash} ${circumference - dash}`);
    circle.setAttribute('stroke-dashoffset', offset);
    circle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
    svg.appendChild(circle);

    accumulated += ratio;
  });
}

function updateAnalyticsCards() {
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
  const survivalRate = totalTrees > 0 ? ((nonDead / totalTrees) * 100).toFixed(1) : '0';

  // KPI cards
  const totalTreesEl = document.querySelector('.kpi-green .kpi-value');
  if (totalTreesEl) totalTreesEl.textContent = totalTrees.toLocaleString();

  const survivalEl = document.querySelector('.kpi-emerald .kpi-value');
  if (survivalEl) survivalEl.textContent = `${survivalRate}%`;

  const caretakersEl = document.querySelector('.kpi-violet .kpi-value');
  if (caretakersEl) caretakersEl.textContent = caretakers.length.toLocaleString();

  const adoptersEl = document.querySelector('.kpi-teal .kpi-value');
  if (adoptersEl) adoptersEl.textContent = adopters.length.toLocaleString();

  const criticalEl = document.querySelector('.kpi-red .kpi-value');
  if (criticalEl) criticalEl.textContent = critical.toLocaleString();

  // Donut SVG
  drawDonut(healthy, needsCare, critical, dead);
}

// Initial Boot & Real-Time Sync Event Listeners
updateAnalyticsCards();
window.addEventListener('ATAMAN:trees-updated', updateAnalyticsCards);
window.addEventListener('ATAMAN:adopters-updated', updateAnalyticsCards);
window.addEventListener('ATAMAN:caretakers-updated', updateAnalyticsCards);

/* ══════════════════════════════════
   REFRESH
══════════════════════════════════ */
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    const icon = refreshBtn.querySelector('svg');
    if (icon) { icon.style.animation = 'spin .8s linear'; }
    refreshBtn.disabled = true;

    setTimeout(() => {
      if (icon) icon.style.animation = '';
      refreshBtn.disabled = false;
      updateAnalyticsCards();
      showToast('✅ Dashboard refreshed successfully.');
    }, 900);
  });
}

// Add spin keyframe dynamically
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);

/* ══════════════════════════════════
   EXPORT DASHBOARD
══════════════════════════════════ */
if (exportDashBtn) {
  exportDashBtn.addEventListener('click', () => {
    const now = new Date();
    const filename = `ATAMAN_Analytics_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.csv`;
    const csv = [
      'ATAMAN Analytics Dashboard Export',
      `Generated,${now.toLocaleString()}`,
      '',
      'KPI,Value',
      'Total Trees,2485',
      'Survival Rate,86.8%',
      'Monitoring Rate,94.2%',
      'Caretakers,24',
      'Adopters,128',
      'Maintenance Activities,1248',
      'Critical Trees,62',
      '',
      'Health Status,Count,Percentage',
      'Healthy,2051,82.5%',
      'Needs Care,287,11.5%',
      'Critical,62,2.5%',
      'Dead,85,3.5%',
      '',
      'Geographic Performance',
      'Barangay,Trees,Survival',
      'San Isidro,485,91.2%',
      'Mabini,392,89.5%',
      'San Miguel,410,87.3%',
      'Mt. Banahaw Site,355,84.8%',
      'Quezon Reserve,322,82.6%',
      'Santiago,521,78.4%',
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    showToast('📊 Analytics dashboard exported successfully.');
  });
}

/* ══════════════════════════════════
   FILTERS
══════════════════════════════════ */
[filterLocation, filterProject].forEach(sel => {
  if (!sel) return;
  sel.addEventListener('change', () => {
    const loc  = filterLocation ? filterLocation.value : '';
    const proj = filterProject  ? filterProject.value  : '';
    const labels = [];
    if (loc)  labels.push(filterLocation.options[filterLocation.selectedIndex].text);
    if (proj) labels.push(filterProject.options[filterProject.selectedIndex].text);
    if (labels.length) {
      showToast(`🔍 Filtered by: ${labels.join(', ')}`);
    } else {
      showToast('🔄 Showing all data.');
    }
  });
});

/* ══════════════════════════════════
   DRILL-DOWN PANEL
══════════════════════════════════ */
// Sample drill-down data
const drillData = {
  'Santiago': {
    title: 'Santiago — Detailed Analytics',
    html: `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:14px;text-align:center;">
            <span style="font-size:2rem;font-weight:900;color:#dc2626;">78.4%</span>
            <p style="font-size:.78rem;color:#b91c1c;font-weight:700;margin-top:4px;">Survival Rate</p>
            <p style="font-size:.72rem;color:#b91c1c;">System avg: 86.8%</p>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;">
            <span style="font-size:2rem;font-weight:900;color:#0f172a;">521</span>
            <p style="font-size:.78rem;color:#475569;font-weight:700;margin-top:4px;">Total Trees</p>
          </div>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
          <h4 style="font-size:.85rem;font-weight:700;margin-bottom:12px;">Health Distribution</h4>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;font-size:.8rem;">
              <span style="min-width:90px;color:#475569;">Healthy</span>
              <div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;"><div style="height:100%;width:71.8%;background:#22c55e;border-radius:4px;"></div></div>
              <b>374 (71.8%)</b>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:.8rem;">
              <span style="min-width:90px;color:#475569;">Needs Care</span>
              <div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;"><div style="height:100%;width:24.4%;background:#f59e0b;border-radius:4px;"></div></div>
              <b>127 (24.4%)</b>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:.8rem;">
              <span style="min-width:90px;color:#475569;">Critical</span>
              <div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;"><div style="height:100%;width:4%;background:#ef4444;border-radius:4px;"></div></div>
              <b>21 (4.0%)</b>
            </div>
          </div>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
          <h4 style="font-size:.85rem;font-weight:700;margin-bottom:10px;">Assigned Caretaker</h4>
          <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#f8fafc;border-radius:8px;">
            <div style="width:38px;height:38px;border-radius:50%;background:#166534;color:#4ade80;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.8rem;">JS</div>
            <div>
              <strong style="display:block;font-size:.85rem;">Juan Santos</strong>
              <span style="font-size:.75rem;color:#64748b;">Monitoring: 93% · On-time: 91%</span>
            </div>
          </div>
        </div>
        <div style="background:#fff3cd;border:1px solid #fde68a;border-radius:10px;padding:14px;">
          <p style="font-size:.82rem;font-weight:700;color:#92400e;">⚠️ Recommended Actions</p>
          <ul style="margin-top:8px;padding-left:16px;font-size:.78rem;color:#78350f;line-height:1.7;">
            <li>Conduct immediate inspection of all 21 critical trees</li>
            <li>Review watering schedule — drought stress detected</li>
            <li>Consider additional caretaker support for high tree count</li>
            <li>Schedule pest control treatment within 7 days</li>
          </ul>
        </div>
        <a href="admin-tree-map.html" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#166534;color:#fff;border-radius:8px;text-decoration:none;font-size:.8rem;font-weight:700;">
          🗺️ View Santiago on Tree Map
        </a>
      </div>
    `
  },
  'Acacia': {
    title: 'Acacia — Species Analytics',
    html: `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:14px;text-align:center;">
            <span style="font-size:2rem;font-weight:900;color:#c2410c;">94.0%</span>
            <p style="font-size:.78rem;color:#c2410c;font-weight:700;margin-top:4px;">Survival Rate</p>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;">
            <span style="font-size:2rem;font-weight:900;color:#ef4444;">18</span>
            <p style="font-size:.78rem;color:#dc2626;font-weight:700;margin-top:4px;">Critical Trees</p>
          </div>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
          <h4 style="font-size:.85rem;font-weight:700;margin-bottom:12px;">Health Breakdown — 420 Trees</h4>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;font-size:.8rem;">
              <span style="min-width:90px;color:#475569;">Healthy</span><div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;"><div style="height:100%;width:81%;background:#22c55e;border-radius:4px;"></div></div><b>340 (81%)</b>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:.8rem;">
              <span style="min-width:90px;color:#475569;">Needs Care</span><div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;"><div style="height:100%;width:8.8%;background:#f59e0b;border-radius:4px;"></div></div><b>37 (8.8%)</b>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:.8rem;">
              <span style="min-width:90px;color:#475569;">Critical</span><div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;"><div style="height:100%;width:4.3%;background:#ef4444;border-radius:4px;"></div></div><b>18 (4.3%)</b>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:.8rem;">
              <span style="min-width:90px;color:#475569;">Dead</span><div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;"><div style="height:100%;width:6%;background:#64748b;border-radius:4px;"></div></div><b>25 (6.0%)</b>
            </div>
          </div>
        </div>
        <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:14px;">
          <p style="font-size:.82rem;font-weight:700;color:#b91c1c;">🐛 Primary Issue: Pest Infestation</p>
          <p style="font-size:.78rem;color:#7f1d1d;margin-top:6px;line-height:1.6;">Pest-related damage accounts for 68% of critical tree cases in this species. Immediate pest control intervention required across all locations.</p>
        </div>
      </div>
    `
  }
};

// Generic drill-down panel content
function getDrillContent(filter) {
  if (drillData[filter]) return drillData[filter];
  return {
    title: `${filter} — Analytics`,
    html: `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;text-align:center;">
          <p style="font-size:2.5rem;margin-bottom:8px;">📊</p>
          <h4 style="font-size:.95rem;font-weight:700;color:#0f172a;margin-bottom:8px;">${filter}</h4>
          <p style="font-size:.82rem;color:#64748b;">Detailed analytics for <strong>${filter}</strong> will show trees, monitoring performance, survival trends, maintenance records, and caretaker assignments.</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:12px;text-align:center;">
            <strong style="font-size:1.4rem;color:#166534;">86.8%</strong>
            <p style="font-size:.74rem;color:#15803d;margin-top:4px;">Avg. Survival</p>
          </div>
          <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:8px;padding:12px;text-align:center;">
            <strong style="font-size:1.4rem;color:#1d4ed8;">94.2%</strong>
            <p style="font-size:.74rem;color:#1d4ed8;margin-top:4px;">Monitoring Rate</p>
          </div>
        </div>
        <a href="admin-trees.html" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#166534;color:#fff;border-radius:8px;text-decoration:none;font-size:.8rem;font-weight:700;">
          🌳 View Trees
        </a>
      </div>
    `
  };
}

function openDrillPanel(filter) {
  const data = getDrillContent(filter);
  drillTitle.textContent = data.title;
  drillBody.innerHTML = data.html;
  drillPanel.classList.remove('hidden');
  drillOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDrillPanel() {
  drillPanel.classList.add('hidden');
  drillOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

drillClose.addEventListener('click', closeDrillPanel);
drillOverlay.addEventListener('click', closeDrillPanel);

// Delegate drill-btn clicks
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.drill-btn');
  if (btn && btn.dataset.filter) {
    openDrillPanel(btn.dataset.filter);
  }
});

/* ══════════════════════════════════
   DISMISS INSIGHTS
══════════════════════════════════ */
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('insight-dismiss')) {
    const card = e.target.closest('.insight-card');
    if (!card) return;
    card.style.transition = 'opacity .3s ease, transform .3s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(.95)';
    setTimeout(() => {
      card.remove();
      updateInsightCount();
    }, 300);
  }
});

function updateInsightCount() {
  const badge = document.querySelector('.insight-count-badge');
  const count = document.querySelectorAll('.insight-card').length;
  if (badge) {
    badge.textContent = count === 0
      ? '✅ All Clear'
      : `${count} Active Alert${count !== 1 ? 's' : ''}`;
    if (count === 0) {
      badge.style.background = '#dcfce7';
      badge.style.color = '#166534';
    }
  }
}

/* ══════════════════════════════════
   CARETAKER SORT
══════════════════════════════════ */
const caretakerSort = document.getElementById('caretakerSort');
if (caretakerSort) {
  caretakerSort.addEventListener('change', () => {
    showToast(`🔄 Sorted by: ${caretakerSort.value}`);
  });
}

/* ══════════════════════════════════
   PILLAR CHART TOOLTIPS
══════════════════════════════════ */
document.querySelectorAll('.pillar').forEach(p => {
  p.addEventListener('mouseenter', () => {
    const val = p.querySelector('.pillar-val');
    if (val) val.style.color = '#166534';
  });
  p.addEventListener('mouseleave', () => {
    const val = p.querySelector('.pillar-val');
    if (val) val.style.color = '';
  });
});

/* ══════════════════════════════════
   ANIMATE ELEMENTS ON SCROLL
══════════════════════════════════ */
const observerOpts = { threshold: 0.1, rootMargin: '0px 0px -40px 0px' };
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.style.opacity = '1';
      en.target.style.transform = 'translateY(0)';
      fadeObserver.unobserve(en.target);
    }
  });
}, observerOpts);

document.querySelectorAll('.section').forEach(sec => {
  sec.style.opacity = '0';
  sec.style.transform = 'translateY(20px)';
  sec.style.transition = 'opacity .4s ease, transform .4s ease';
  fadeObserver.observe(sec);
});

/* ══════════════════════════════════
   SIDEBAR USER PROFILE INIT
══════════════════════════════════ */
// Show sidebar user block if available
const sbUser = document.querySelector('.sidebar-user');
if (sbUser) sbUser.style.display = 'flex';

/* ══════════════════════════════════
   INIT
══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  drawDonut();
});
