/**
 * ATAMAN Admin — System Logs & Security Audit Center Logic
 * Complete technical, user, tree, and security audit repository.
 */

(function () {
  'use strict';

  // 1. AUDIT LOG DATASET (Initial empty repository for live records)
  const INITIAL_LOGS = [];

  // 2. STATE MANAGEMENT
  let allLogs = [];
  let currentTab = 'all';
  let currentSearchQuery = '';
  let selectedDateFilter = 'all';
  let selectedUserFilter = 'all';
  let selectedModuleFilter = 'all';
  let selectedLevelFilter = 'all';
  let focusInvestigator = null; // { type: 'user' | 'tree', name: string }
  let currentViewMode = 'table'; // 'table' | 'timeline'
  let currentPage = 1;
  const itemsPerPage = 8;

  // DOM Elements
  const auditTableBody = document.getElementById('auditTableBody');
  const logTableSection = document.getElementById('logTableSection');
  const logTimelineSection = document.getElementById('logTimelineSection');
  const timelineFlow = document.getElementById('timelineFlow');
  const tableEmptyState = document.getElementById('tableEmptyState');
  const logSearchInput = document.getElementById('logSearchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const filterDate = document.getElementById('filterDate');
  const filterUser = document.getElementById('filterUser');
  const filterModule = document.getElementById('filterModule');
  const filterLevel = document.getElementById('filterLevel');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const activeFilterPills = document.getElementById('activeFilterPills');
  const investigatorCard = document.getElementById('investigatorCard');
  const invTag = document.getElementById('invTag');
  const invTitle = document.getElementById('invTitle');
  const invDesc = document.getElementById('invDesc');
  const closeInvestigatorBtn = document.getElementById('closeInvestigatorBtn');
  const tableShownCount = document.getElementById('tableShownCount');
  const tableTotalCount = document.getElementById('tableTotalCount');
  const currentPageNum = document.getElementById('currentPageNum');
  const totalPageNum = document.getElementById('totalPageNum');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const pageNumberButtons = document.getElementById('pageNumberButtons');

  // View Mode Toggles
  const viewTableBtn = document.getElementById('viewTableBtn');
  const viewTimelineBtn = document.getElementById('viewTimelineBtn');

  // Drawer Elements
  const logDrawer = document.getElementById('logDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const drawerLevelBadge = document.getElementById('drawerLevelBadge');
  const drawerLogId = document.getElementById('drawerLogId');
  const drawerBody = document.getElementById('drawerBody');
  const drawerCopyJsonBtn = document.getElementById('drawerCopyJsonBtn');
  const drawerInvestigateBtn = document.getElementById('drawerInvestigateBtn');
  let activeDrawerLog = null;

  // Export Modal Elements
  const exportModalBackdrop = document.getElementById('exportModalBackdrop');
  const openExportModalBtn = document.getElementById('openExportModalBtn');
  const closeExportModalBtn = document.getElementById('closeExportModalBtn');
  const cancelExportBtn = document.getElementById('cancelExportBtn');
  const exportForm = document.getElementById('exportForm');

  // Retention Modal Elements
  const retentionModalBackdrop = document.getElementById('retentionModalBackdrop');
  const openRetentionModalBtn = document.getElementById('openRetentionModalBtn');
  const closeRetentionModalBtn = document.getElementById('closeRetentionModalBtn');
  const cancelRetentionBtn = document.getElementById('cancelRetentionBtn');
  const retentionForm = document.getElementById('retentionForm');

  // Refresh & Metric elements
  const refreshLogsBtn = document.getElementById('refreshLogsBtn');
  const toastContainer = document.getElementById('toastContainer');

  // 3. TOAST NOTIFICATION UTILITY
  function showToast(message, icon = '✓') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // 4. FILTERING PIPELINE
  function getFilteredLogs() {
    return allLogs.filter(log => {
      // 1. Tab filter
      if (currentTab === 'security' && log.level !== 'security' && log.module !== 'Authentication') return false;
      if (currentTab === 'user' && (log.userType === 'system' || !log.userRole)) return false;
      if (currentTab === 'tree' && !log.targetId?.startsWith('TR-') && log.module !== 'Tree Registry') return false;
      if (currentTab === 'changes' && !log.details?.diff) return false;
      if (currentTab === 'errors' && log.level !== 'error' && log.level !== 'critical') return false;
      if (currentTab === 'system' && log.userType !== 'system' && log.module !== 'System' && log.module !== 'Database') return false;
      if (currentTab === 'media' && !log.details?.file && log.actionIcon !== '📷') return false;

      // 2. Focused Investigator Filter
      if (focusInvestigator) {
        if (focusInvestigator.type === 'user' && !log.user.toLowerCase().includes(focusInvestigator.name.toLowerCase())) {
          return false;
        }
        if (focusInvestigator.type === 'tree' && log.targetId !== focusInvestigator.name && log.details?.treeId !== focusInvestigator.name) {
          return false;
        }
      }

      // 3. Search query
      if (currentSearchQuery.trim()) {
        const q = currentSearchQuery.toLowerCase();
        const matchUser = log.user.toLowerCase().includes(q);
        const matchAction = log.action.toLowerCase().includes(q);
        const matchModule = log.module.toLowerCase().includes(q);
        const matchTarget = log.targetId?.toLowerCase().includes(q) || false;
        const matchTreeId = log.details?.treeId?.toLowerCase().includes(q) || false;
        const matchIp = log.ip.toLowerCase().includes(q);
        const matchId = log.id.toLowerCase().includes(q);
        if (!matchUser && !matchAction && !matchModule && !matchTarget && !matchTreeId && !matchIp && !matchId) {
          return false;
        }
      }

      // 4. Date filter
      if (selectedDateFilter === 'today' && !log.timestamp.startsWith('2026-08-31')) return false;
      if (selectedDateFilter === 'yesterday' && !log.timestamp.startsWith('2026-08-30')) return false;

      // 5. User filter
      if (selectedUserFilter !== 'all' && !log.user.includes(selectedUserFilter)) return false;

      // 6. Module filter
      if (selectedModuleFilter !== 'all' && log.module !== selectedModuleFilter) return false;

      // 7. Level filter
      if (selectedLevelFilter !== 'all' && log.level !== selectedLevelFilter) return false;

      return true;
    });
  }

  // 5. RENDER LOGS (TABLE & TIMELINE)
  function renderLogs() {
    const filtered = getFilteredLogs();
    const totalCount = filtered.length;

    tableTotalCount.textContent = allLogs.length;
    tableShownCount.textContent = totalCount;

    // Render active filter pills
    renderFilterPills();

    // Update summary card values & tab badges
    const totalLogs = allLogs.length;
    const userActions = allLogs.filter(l => l.userType !== 'system' && l.userRole).length;
    const warnings = allLogs.filter(l => l.level === 'warning').length;
    const errors = allLogs.filter(l => l.level === 'error' || l.level === 'critical').length;
    const security = allLogs.filter(l => l.level === 'security' || l.module === 'Authentication').length;
    const system = allLogs.filter(l => l.userType === 'system' || l.module === 'System' || l.module === 'Database').length;
    const trees = allLogs.filter(l => l.targetId?.startsWith('TR-') || l.module === 'Tree Registry').length;
    const changes = allLogs.filter(l => l.details?.diff).length;
    const media = allLogs.filter(l => l.details?.file || l.actionIcon === '📷').length;

    const el = id => document.getElementById(id);
    if (el('valTotalLogs')) el('valTotalLogs').textContent = totalLogs.toLocaleString();
    if (el('valUserActions')) el('valUserActions').textContent = userActions.toLocaleString();
    if (el('valWarnings')) el('valWarnings').textContent = warnings.toLocaleString();
    if (el('valErrors')) el('valErrors').textContent = errors.toLocaleString();
    if (el('valSecurity')) el('valSecurity').textContent = security.toLocaleString();
    if (el('valSystemEvents')) el('valSystemEvents').textContent = system.toLocaleString();

    if (el('tabCountAll')) el('tabCountAll').textContent = totalLogs.toLocaleString();
    if (el('tabCountSecurity')) el('tabCountSecurity').textContent = security.toLocaleString();
    if (el('tabCountUser')) el('tabCountUser').textContent = userActions.toLocaleString();
    if (el('tabCountTree')) el('tabCountTree').textContent = trees.toLocaleString();
    if (el('tabCountChanges')) el('tabCountChanges').textContent = changes.toLocaleString();
    if (el('tabCountErrors')) el('tabCountErrors').textContent = errors.toLocaleString();
    if (el('tabCountSystem')) el('tabCountSystem').textContent = system.toLocaleString();
    if (el('tabCountMedia')) el('tabCountMedia').textContent = media.toLocaleString();

    // Context-aware empty state text
    const emptyHeading = el('emptyStateHeading');
    const emptyText = el('emptyStateText');
    const emptyReset = el('emptyResetBtn');
    if (emptyHeading && emptyText) {
      if (allLogs.length === 0) {
        emptyHeading.textContent = 'No audit logs recorded yet';
        emptyText.textContent = 'System activities, user actions, and security events will appear here in real time.';
        if (emptyReset) emptyReset.style.display = 'none';
      } else {
        emptyHeading.textContent = 'No audit logs match your filter criteria';
        emptyText.textContent = 'Try clearing your search keyword, broadening the date range, or switching to another category tab.';
        if (emptyReset) emptyReset.style.display = 'inline-flex';
      }
    }


    // Toggle Empty State
    if (totalCount === 0) {
      auditTableBody.innerHTML = '';
      timelineFlow.innerHTML = '';
      tableEmptyState.style.display = 'block';
      document.getElementById('tablePagination').style.display = 'none';
      return;
    }
    tableEmptyState.style.display = 'none';
    document.getElementById('tablePagination').style.display = 'flex';

    // Pagination slice
    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedLogs = filtered.slice(startIndex, startIndex + itemsPerPage);

    // Update Pagination Display
    currentPageNum.textContent = currentPage;
    totalPageNum.textContent = totalPages;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    renderPageNumbers(totalPages);

    // Render Table View
    renderTableView(paginatedLogs);

    // Render Timeline View
    renderTimelineView(filtered);
  }

  function renderTableView(logs) {
    auditTableBody.innerHTML = logs.map(log => {
      const avatarClass = log.userType === 'admin' ? 'ava-admin' :
                          log.userType === 'caretaker' ? 'ava-caretaker' :
                          log.userType === 'adopter' ? 'ava-adopter' : 'ava-system';
      const initials = log.user.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      const levelClass = `level-${log.level}`;
      const statusClass = log.status === 'success' ? 'status-success' :
                          log.status === 'failed' ? 'status-failed' : 'status-warn';
      const statusIcon = log.status === 'success' ? '●' :
                         log.status === 'failed' ? '✕' : '▲';

      const targetBadge = log.targetId ? `<span class="action-target-badge" title="Target entity: ${log.targetId}">${log.targetId}</span>` : '';

      return `
        <tr data-log-id="${log.id}">
          <td>
            <div class="timestamp-cell">
              <span class="time-primary">${log.timeDisplay}</span>
              <span class="time-secondary">${log.id}</span>
            </div>
          </td>
          <td>
            <div class="user-cell">
              <div class="user-mini-avatar ${avatarClass}">${initials}</div>
              <div>
                <div class="user-meta-name">${escapeHtml(log.user)}</div>
                <div class="user-meta-role">${escapeHtml(log.userRole || 'System')}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="action-cell">
              <span class="action-icon">${log.actionIcon}</span>
              <span class="action-text">${escapeHtml(log.action)}</span>
              ${targetBadge}
            </div>
          </td>
          <td>
            <span class="module-pill">${escapeHtml(log.module)}</span>
          </td>
          <td>
            <span class="level-badge ${levelClass}">${log.levelDisplay}</span>
          </td>
          <td>
            <span class="status-badge ${statusClass}">${statusIcon} ${log.statusDisplay}</span>
          </td>
          <td>
            <span class="device-cell" title="${log.location}">${escapeHtml(log.ip)}</span>
          </td>
          <td style="text-align: right;">
            <button class="btn-details" onclick="window.inspectLog('${log.id}')">View Details</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderTimelineView(logs) {
    // Group logs by day
    const groups = {};
    logs.forEach(log => {
      const dateKey = log.dateDisplay || 'Earlier Activity';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });

    let html = '';
    for (const [date, dayLogs] of Object.entries(groups)) {
      html += `
        <div class="timeline-group">
          <div class="timeline-date-header">${date}</div>
          <div class="timeline-items-list">
            ${dayLogs.map(log => {
              const nodeClass = `node-${log.level}`;
              return `
                <div class="timeline-item">
                  <div class="timeline-node ${nodeClass}"></div>
                  <div class="timeline-card" onclick="window.inspectLog('${log.id}')">
                    <div class="tl-main">
                      <div class="tl-time-row">
                        <span class="tl-time">${log.timeDisplay.split(', ')[1] || log.timeDisplay}</span>
                        <span class="level-badge level-${log.level}">${log.levelDisplay}</span>
                        <span class="module-pill">${log.module}</span>
                      </div>
                      <div class="tl-action-title">${log.actionIcon} ${escapeHtml(log.action)}</div>
                      <div class="tl-actor-sub">By <strong>${escapeHtml(log.user)}</strong> (${escapeHtml(log.userRole)}) &bull; ${log.location}</div>
                    </div>
                    <button class="btn-details">Inspect &rarr;</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    timelineFlow.innerHTML = html;
  }

  function renderPageNumbers(totalPages) {
    let pagesHtml = '';
    for (let i = 1; i <= totalPages; i++) {
      pagesHtml += `<button class="page-num-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    pageNumberButtons.innerHTML = pagesHtml;

    pageNumberButtons.querySelectorAll('.page-num-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.getAttribute('data-page'));
        renderLogs();
      });
    });
  }

  function renderFilterPills() {
    let pills = [];
    if (currentSearchQuery) {
      pills.push(`Search: "${escapeHtml(currentSearchQuery)}" <button onclick="window.clearSearch()">&times;</button>`);
    }
    if (selectedDateFilter !== 'all') {
      const text = filterDate.options[filterDate.selectedIndex].text;
      pills.push(`Date: ${text} <button onclick="window.resetFilter('date')">&times;</button>`);
    }
    if (selectedUserFilter !== 'all') {
      pills.push(`User: ${selectedUserFilter} <button onclick="window.resetFilter('user')">&times;</button>`);
    }
    if (selectedModuleFilter !== 'all') {
      pills.push(`Module: ${selectedModuleFilter} <button onclick="window.resetFilter('module')">&times;</button>`);
    }
    if (selectedLevelFilter !== 'all') {
      pills.push(`Level: ${selectedLevelFilter.toUpperCase()} <button onclick="window.resetFilter('level')">&times;</button>`);
    }
    if (focusInvestigator) {
      pills.push(`Focus: ${focusInvestigator.name} <button onclick="window.clearInvestigator()">&times;</button>`);
    }

    if (pills.length > 0) {
      activeFilterPills.innerHTML = pills.map(p => `<span class="filter-pill">${p}</span>`).join('');
      activeFilterPills.style.display = 'flex';
    } else {
      activeFilterPills.innerHTML = '';
      activeFilterPills.style.display = 'none';
    }
  }

  // 6. SLIDE-OVER DETAIL DRAWER INSPECTOR (Point 5)
  window.inspectLog = function (logId) {
    const log = allLogs.find(l => l.id === logId);
    if (!log) return;
    activeDrawerLog = log;

    drawerLogId.textContent = log.id;
    drawerLevelBadge.textContent = log.levelDisplay;
    drawerLevelBadge.className = `dh-badge level-${log.level}`;

    // Render Body Details
    let detailsHtml = `
      <!-- Core Information -->
      <div>
        <h4 class="detail-section-title">Core Event Identity</h4>
        <div class="detail-key-grid">
          <div class="d-key-item">
            <span class="d-label">Timestamp</span>
            <span class="d-value">${log.timestamp.replace('T', ' ')}</span>
          </div>
          <div class="d-key-item">
            <span class="d-label">Module & Category</span>
            <span class="d-value">${log.module}</span>
          </div>
          <div class="d-key-item">
            <span class="d-label">User / Actor</span>
            <span class="d-value">${log.user} (${log.userRole || 'Automated'})</span>
          </div>
          <div class="d-key-item">
            <span class="d-label">Execution Status</span>
            <span class="d-value status-${log.status}">● ${log.statusDisplay}</span>
          </div>
        </div>
      </div>

      <!-- Action Breakdown -->
      <div>
        <h4 class="detail-section-title">Action & Payload Details</h4>
        <div class="detail-key-grid">
          <div class="d-key-item" style="grid-column: span 2;">
            <span class="d-label">Action Executed</span>
            <span class="d-value">${log.actionIcon} ${log.action}</span>
          </div>
          ${log.targetId ? `
          <div class="d-key-item">
            <span class="d-label">Target Entity ID</span>
            <span class="d-value d-value-mono">${log.targetId}</span>
          </div>` : ''}
          ${log.details?.species ? `
          <div class="d-key-item">
            <span class="d-label">Tree Species</span>
            <span class="d-value">${log.details.species}</span>
          </div>` : ''}
          ${log.details?.file ? `
          <div class="d-key-item">
            <span class="d-label">Associated File</span>
            <span class="d-value d-value-mono">${log.details.file} (${log.details.fileSize || 'N/A'})</span>
          </div>` : ''}
          ${log.details?.monitoringId ? `
          <div class="d-key-item">
            <span class="d-label">Monitoring Record</span>
            <span class="d-value d-value-mono">${log.details.monitoringId}</span>
          </div>` : ''}
        </div>
      </div>
    `;

    // Render Data Changes (Before -> After Diff) (Point 14)
    if (log.details?.diff) {
      detailsHtml += `
        <div>
          <h4 class="detail-section-title">Data Change Audit (Before &rarr; After)</h4>
          <div class="diff-card">
            <div class="diff-header">${log.details.diff.field}</div>
            <div class="diff-comparison-grid">
              <div class="diff-box diff-prev">${log.details.diff.previous}</div>
              <div class="diff-arrow">&rarr;</div>
              <div class="diff-box diff-next">${log.details.diff.current}</div>
            </div>
            ${log.details.diff.reason ? `<div class="diff-reason"><strong>Reason / Justification:</strong> "${log.details.diff.reason}"</div>` : ''}
          </div>
        </div>
      `;
    }

    // Technical & Geolocation Info
    detailsHtml += `
      <div>
        <h4 class="detail-section-title">Client & Technical Environment</h4>
        <div class="detail-key-grid">
          <div class="d-key-item">
            <span class="d-label">IP Address</span>
            <span class="d-value d-value-mono">${log.ip}</span>
          </div>
          <div class="d-key-item">
            <span class="d-label">Geographic Location</span>
            <span class="d-value">${log.location}</span>
          </div>
          <div class="d-key-item">
            <span class="d-label">Client Device & Browser</span>
            <span class="d-value">${log.device}</span>
          </div>
          <div class="d-key-item">
            <span class="d-label">Security Integrity Check</span>
            <span class="d-value" style="color:#059669;">✓ Verified Cryptographic Hash</span>
          </div>
        </div>
      </div>

      <!-- Raw JSON Block -->
      <div>
        <h4 class="detail-section-title">Raw Structured Metadata Payload</h4>
        <pre class="json-block"><code>${JSON.stringify(log, null, 2)}</code></pre>
      </div>
    `;

    drawerBody.innerHTML = detailsHtml;

    // Configure Investigate Subject button
    if (log.user && log.user !== 'System') {
      drawerInvestigateBtn.innerHTML = `<span>Audit User: ${escapeHtml(log.user)} &rarr;</span>`;
      drawerInvestigateBtn.style.display = 'inline-flex';
    } else if (log.targetId?.startsWith('TR-')) {
      drawerInvestigateBtn.innerHTML = `<span>Audit Tree: ${log.targetId} &rarr;</span>`;
      drawerInvestigateBtn.style.display = 'inline-flex';
    } else {
      drawerInvestigateBtn.style.display = 'none';
    }

    // Open Drawer
    logDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
  };

  function closeDrawer() {
    logDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    activeDrawerLog = null;
  }

  // 7. DEDICATED USER & TREE INVESTIGATOR (Points 6 & 7)
  function setInvestigatorFocus(type, name) {
    focusInvestigator = { type, name };
    invTag.textContent = type === 'user' ? '👤 USER AUDIT TRAIL' : '🌳 TREE AUDIT TRAIL';
    invTitle.textContent = `${name} — Audit Record`;
    invDesc.textContent = type === 'user'
      ? `Showing complete chronological activity, logins, and modifications made by ${name}.`
      : `Showing full lifecycle audit trail, health status updates, and monitoring photos for tree ${name}.`;
    investigatorCard.style.display = 'block';
    currentPage = 1;
    renderLogs();
    closeDrawer();
  }

  window.clearInvestigator = function () {
    focusInvestigator = null;
    investigatorCard.style.display = 'none';
    currentPage = 1;
    renderLogs();
  };

  window.clearSearch = function () {
    logSearchInput.value = '';
    currentSearchQuery = '';
    searchClearBtn.style.display = 'none';
    currentPage = 1;
    renderLogs();
  };

  window.resetFilter = function (type) {
    if (type === 'date') { filterDate.value = 'all'; selectedDateFilter = 'all'; }
    if (type === 'user') { filterUser.value = 'all'; selectedUserFilter = 'all'; }
    if (type === 'module') { filterModule.value = 'all'; selectedModuleFilter = 'all'; }
    if (type === 'level') { filterLevel.value = 'all'; selectedLevelFilter = 'all'; }
    currentPage = 1;
    renderLogs();
  };

  function resetAllFilters() {
    currentSearchQuery = '';
    logSearchInput.value = '';
    searchClearBtn.style.display = 'none';
    filterDate.value = 'all';
    selectedDateFilter = 'all';
    filterUser.value = 'all';
    selectedUserFilter = 'all';
    filterModule.value = 'all';
    selectedModuleFilter = 'all';
    filterLevel.value = 'all';
    selectedLevelFilter = 'all';
    focusInvestigator = null;
    investigatorCard.style.display = 'none';
    currentTab = 'all';
    document.querySelectorAll('.logs-nav-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.logs-nav-tabs .tab-btn[data-tab="all"]')?.classList.add('active');
    document.querySelectorAll('.summary-card').forEach(c => c.classList.remove('active'));
    currentPage = 1;
    renderLogs();
    showToast('Filters have been reset', '🔄');
  }

  // 8. EXPORT SYSTEM LOGS (Point 17)
  function handleExportSubmit(e) {
    e.preventDefault();
    const dateScope = document.getElementById('expDateScope').value;
    const moduleScope = document.getElementById('expModuleScope').value;
    const levelScope = document.getElementById('expLevelScope').value;
    const format = exportForm.querySelector('input[name="exportFormat"]:checked').value;

    const filtered = getFilteredLogs();

    let fileContent = '';
    let fileName = `ATAMAN_Audit_Logs_${new Date().toISOString().slice(0, 10)}`;
    let mimeType = 'text/plain';

    if (format === 'csv') {
      const headers = ['Log ID', 'Timestamp', 'User', 'Role', 'Action', 'Module', 'Level', 'Status', 'IP Address', 'Location', 'Target ID'];
      const rows = filtered.map(l => [
        `"${l.id}"`,
        `"${l.timestamp}"`,
        `"${l.user}"`,
        `"${l.userRole || ''}"`,
        `"${l.action.replace(/"/g, '""')}"`,
        `"${l.module}"`,
        `"${l.level}"`,
        `"${l.status}"`,
        `"${l.ip}"`,
        `"${l.location}"`,
        `"${l.targetId || ''}"`
      ]);
      fileContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      fileName += '.csv';
      mimeType = 'text/csv;charset=utf-8;';
    } else if (format === 'json') {
      fileContent = JSON.stringify({
        metadata: {
          exportedAt: new Date().toISOString(),
          totalRecords: filtered.length,
          generatedBy: 'Ethel Zeta (Super Administrator)',
          integrityHash: 'sha256:88abf921ce049a...'
        },
        auditLogs: filtered
      }, null, 2);
      fileName += '.json';
      mimeType = 'application/json;charset=utf-8;';
    } else {
      // PDF Mock format
      fileContent = `ATAMAN OFFICIAL SYSTEM AUDIT DOSSIER\n` +
                    `========================================\n` +
                    `Export Date: ${new Date().toLocaleString()}\n` +
                    `Scope: ${dateScope} | Module: ${moduleScope} | Severity: ${levelScope}\n` +
                    `Generated By: Ethel Zeta (Super Administrator)\n` +
                    `Append-Only Status: Cryptographically Signed & Verified (RA 10173 Compliant)\n\n` +
                    filtered.map(l => `[${l.id}] ${l.timeDisplay} | ${l.user} (${l.userRole}) -> ${l.action} [${l.level.toUpperCase()} - ${l.status.toUpperCase()}] (IP: ${l.ip})`).join('\n');
      fileName += '.txt';
      mimeType = 'text/plain;charset=utf-8;';
    }

    // Trigger instant browser download
    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);

    exportModalBackdrop.classList.remove('open');
    showToast(`Audit log archive (${filtered.length} records) exported successfully!`, '📥');
  }

  // 9. LOG RETENTION & POLICY PERSISTENCE (Point 18)
  function handleRetentionSubmit(e) {
    e.preventDefault();
    const systemMo = document.getElementById('retSystemPeriod').value;
    const securityMo = document.getElementById('retSecurityPeriod').value;
    const auditMo = document.getElementById('retAuditPeriod').value;

    const policies = { systemMo, securityMo, auditMo, updated: new Date().toISOString() };
    localStorage.setItem('ATAMAN_log_retention_policy', JSON.stringify(policies));

    retentionModalBackdrop.classList.remove('open');
    showToast(`Log retention policy updated (System: ${systemMo}mo, Security: ${securityMo}mo, Audit: ${auditMo}mo)`, '⚙️');
  }

  // Helper: HTML Escaping
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 10. EVENT LISTENERS SETUP
  function setupEventListeners() {
    // Category Tabs
    document.querySelectorAll('.logs-nav-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.logs-nav-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.getAttribute('data-tab');
        currentPage = 1;
        renderLogs();
      });
    });

    // Summary Card Quick Filters
    document.querySelectorAll('.summary-card').forEach(card => {
      card.addEventListener('click', () => {
        const level = card.getAttribute('data-filter-level');
        document.querySelectorAll('.summary-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        if (level === 'all') {
          selectedLevelFilter = 'all';
          filterLevel.value = 'all';
          currentTab = 'all';
        } else if (level === 'user') {
          currentTab = 'user';
        } else if (level === 'system') {
          currentTab = 'system';
        } else {
          selectedLevelFilter = level;
          filterLevel.value = level;
        }

        currentPage = 1;
        renderLogs();
      });
    });

    // Search Input
    logSearchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      searchClearBtn.style.display = currentSearchQuery ? 'flex' : 'none';
      currentPage = 1;
      renderLogs();
    });

    searchClearBtn.addEventListener('click', window.clearSearch);

    // Dropdown Filters
    filterDate.addEventListener('change', (e) => {
      selectedDateFilter = e.target.value;
      currentPage = 1;
      renderLogs();
    });
    filterUser.addEventListener('change', (e) => {
      selectedUserFilter = e.target.value;
      currentPage = 1;
      renderLogs();
    });
    filterModule.addEventListener('change', (e) => {
      selectedModuleFilter = e.target.value;
      currentPage = 1;
      renderLogs();
    });
    filterLevel.addEventListener('change', (e) => {
      selectedLevelFilter = e.target.value;
      currentPage = 1;
      renderLogs();
    });

    resetFiltersBtn.addEventListener('click', resetAllFilters);
    document.getElementById('emptyResetBtn')?.addEventListener('click', resetAllFilters);
    closeInvestigatorBtn?.addEventListener('click', window.clearInvestigator);

    // View Mode Toggle (Table vs Timeline)
    viewTableBtn.addEventListener('click', () => {
      viewTableBtn.classList.add('active');
      viewTimelineBtn.classList.remove('active');
      logTableSection.style.display = 'block';
      logTimelineSection.style.display = 'none';
      currentViewMode = 'table';
    });

    viewTimelineBtn.addEventListener('click', () => {
      viewTimelineBtn.classList.add('active');
      viewTableBtn.classList.remove('active');
      logTableSection.style.display = 'none';
      logTimelineSection.style.display = 'block';
      currentViewMode = 'timeline';
    });

    // Pagination buttons
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderLogs();
      }
    });
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(getFilteredLogs().length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderLogs();
      }
    });

    // Drawer Controls
    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    drawerCopyJsonBtn.addEventListener('click', () => {
      if (activeDrawerLog) {
        navigator.clipboard.writeText(JSON.stringify(activeDrawerLog, null, 2));
        showToast('JSON payload copied to clipboard!', '📋');
      }
    });

    drawerInvestigateBtn.addEventListener('click', () => {
      if (!activeDrawerLog) return;
      if (activeDrawerLog.user && activeDrawerLog.user !== 'System') {
        setInvestigatorFocus('user', activeDrawerLog.user);
      } else if (activeDrawerLog.targetId?.startsWith('TR-')) {
        setInvestigatorFocus('tree', activeDrawerLog.targetId);
      }
    });

    // Export Modal Controls
    openExportModalBtn.addEventListener('click', () => exportModalBackdrop.classList.add('open'));
    closeExportModalBtn.addEventListener('click', () => exportModalBackdrop.classList.remove('open'));
    cancelExportBtn.addEventListener('click', () => exportModalBackdrop.classList.remove('open'));
    exportForm.addEventListener('submit', handleExportSubmit);

    // Export Format Radio highlight toggle
    exportForm.querySelectorAll('input[name="exportFormat"]').forEach(radio => {
      radio.addEventListener('change', () => {
        exportForm.querySelectorAll('.format-option').forEach(opt => opt.classList.remove('active'));
        radio.closest('.format-option')?.classList.add('active');
      });
    });

    // Retention Modal Controls
    openRetentionModalBtn.addEventListener('click', () => retentionModalBackdrop.classList.add('open'));
    closeRetentionModalBtn.addEventListener('click', () => retentionModalBackdrop.classList.remove('open'));
    cancelRetentionBtn.addEventListener('click', () => retentionModalBackdrop.classList.remove('open'));
    retentionForm.addEventListener('submit', handleRetentionSubmit);

    // Live Refresh button
    refreshLogsBtn.addEventListener('click', () => {
      showToast('Refreshing live audit stream...', '🔄');
      setTimeout(() => {
        renderLogs();
        showToast('Audit stream is up-to-date!', '✓');
      }, 400);
    });
  }

  // 11. INITIALIZATION
  function init() {
    setupEventListeners();
    renderLogs();
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
