/**
 * admin-notifications.js — ATAMAN Admin Notifications & Action Center
 * Central Alert, Triage, and Dispatch Engine
 */

document.addEventListener('DOMContentLoaded', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DATA REPOSITORY & NOTIFICATION STORE
  // ═══════════════════════════════════════════════════════════════════════════
  const INITIAL_NOTIFICATIONS = [];
  // Notifications master store (starts clean for live data)
  let notifications = [];
  try {
    const saved = localStorage.getItem('ATAMAN_notifications');
    if (saved && saved !== '[]') {
      notifications = JSON.parse(saved);
    } else {
      notifications = [];
      localStorage.setItem('ATAMAN_notifications', '[]');
    }
  } catch (e) {
    notifications = [];
  }

  // Active Filter State
  const state = {
    searchQuery: '',
    status: 'all',       // all, unread, read
    priority: 'all',     // all, critical, high, normal, info
    category: 'all',     // all, critical-tree, monitoring, maintenance, trees, caretakers, adopters, users, schedule, system
    dateRange: 'all',    // all, today, yesterday, last7days, last30days
    location: 'all',     // all, or specific location string
    groupBy: 'priority', // priority vs chronological
    selectedId: null
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DOM ELEMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarUrgentBadge = document.getElementById('sidebarUrgentBadge');

  const cntUrgent = document.getElementById('cntUrgent');
  const cntUnread = document.getElementById('cntUnread');
  const cntToday = document.getElementById('cntToday');
  const cntTotal = document.getElementById('cntTotal');

  const cardUrgent = document.getElementById('cardUrgent');
  const cardUnread = document.getElementById('cardUnread');
  const cardToday = document.getElementById('cardToday');
  const cardTotal = document.getElementById('cardTotal');

  const notifSearchInput = document.getElementById('notifSearchInput');
  const topSearchInput = document.getElementById('topSearchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');

  const filterStatus = document.getElementById('filterStatus');
  const filterPriority = document.getElementById('filterPriority');
  const filterCategory = document.getElementById('filterCategory');
  const filterDate = document.getElementById('filterDate');
  const filterLocation = document.getElementById('filterLocation');
  const btnResetFilters = document.getElementById('btnResetFilters');

  const quickPillsRow = document.getElementById('quickPillsRow');
  const notifFeedList = document.getElementById('notifFeedList');
  const notifEmptyState = document.getElementById('notifEmptyState');
  const feedShowingCount = document.getElementById('feedShowingCount');
  const feedTitle = document.getElementById('feedTitle');

  const btnGroupPriority = document.getElementById('btnGroupPriority');
  const btnGroupChronological = document.getElementById('btnGroupChronological');

  const btnMarkAllRead = document.getElementById('btnMarkAllRead');
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const btnRefreshFeed = document.getElementById('btnRefreshFeed');

  const btnBulkActions = document.getElementById('btnBulkActions');
  const bulkMenu = document.getElementById('bulkMenu');
  const bulkMarkRead = document.getElementById('bulkMarkRead');
  const bulkMarkUnread = document.getElementById('bulkMarkUnread');
  const bulkDismiss = document.getElementById('bulkDismiss');
  const bulkExport = document.getElementById('bulkExport');

  // History Elements
  const historyTableBody = document.getElementById('historyTableBody');
  const btnExportHistoryCsv = document.getElementById('btnExportHistoryCsv');
  const btnToggleHistoryCollapse = document.getElementById('btnToggleHistoryCollapse');
  const historyTableContainer = document.getElementById('historyTableContainer');
  const txtHistoryCollapse = document.getElementById('txtHistoryCollapse');
  const icoHistoryChevron = document.getElementById('icoHistoryChevron');

  // Detail Drawer
  const notifDetailBackdrop = document.getElementById('notifDetailBackdrop');
  const notifDetailDrawer = document.getElementById('notifDetailDrawer');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');
  const drawerPriorityBadge = document.getElementById('drawerPriorityBadge');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerBody = document.getElementById('drawerBody');
  const drawerFooter = document.getElementById('drawerFooter');

  // Maintenance Modal
  const modalMaintBackdrop = document.getElementById('modalMaintBackdrop');
  const modalMaintDialog = document.getElementById('modalMaintDialog');
  const btnCloseMaintModal = document.getElementById('btnCloseMaintModal');
  const btnCancelMaint = document.getElementById('btnCancelMaint');
  const formCreateMaintTask = document.getElementById('formCreateMaintTask');
  const maintTreeId = document.getElementById('maintTreeId');
  const maintDueDate = document.getElementById('maintDueDate');
  const maintInstructions = document.getElementById('maintInstructions');
  const maintCaretaker = document.getElementById('maintCaretaker');

  // Notify Modal
  const modalNotifyBackdrop = document.getElementById('modalNotifyBackdrop');
  const modalNotifyDialog = document.getElementById('modalNotifyDialog');
  const btnCloseNotifyModal = document.getElementById('btnCloseNotifyModal');
  const btnCancelNotify = document.getElementById('btnCancelNotify');
  const formNotifyCaretaker = document.getElementById('formNotifyCaretaker');
  const notifyStaffName = document.getElementById('notifyStaffName');
  const notifyPresetTemplate = document.getElementById('notifyPresetTemplate');
  const notifyMessageText = document.getElementById('notifyMessageText');

  // Settings Modal
  const modalSettingsBackdrop = document.getElementById('modalSettingsBackdrop');
  const modalSettingsDialog = document.getElementById('modalSettingsDialog');
  const btnCloseSettingsModal = document.getElementById('btnCloseSettingsModal');
  const btnCancelSettings = document.getElementById('btnCancelSettings');
  const formNotificationSettings = document.getElementById('formNotificationSettings');

  // Toast Container
  const toastStack = document.getElementById('toastStack');

  // Set default due date for maintenance
  if (maintDueDate) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    maintDueDate.value = d.toISOString().split('T')[0];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. TOAST MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type === 'error' ? 'toast-error' : type === 'warning' ? 'toast-warning' : ''}`;
    
    let icon = '🔔';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastStack.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. METRIC & COUNTER UPDATES
  // ═══════════════════════════════════════════════════════════════════════════
  function updateCounters() {
    const urgentCount = notifications.filter(n => n.priority === 'critical' && !n.read).length;
    const unreadCount = notifications.filter(n => !n.read).length;
    const todayCount = notifications.filter(n => {
      if (!n.timestamp) return false;
      return n.timestamp.startsWith('2026-08-31');
    }).length;
    const totalCount = notifications.length;

    if (cntUrgent) cntUrgent.textContent = urgentCount;
    if (cntUnread) cntUnread.textContent = unreadCount;
    if (cntToday) cntToday.textContent = todayCount;
    if (cntTotal) cntTotal.textContent = totalCount;

    if (sidebarUrgentBadge) {
      sidebarUrgentBadge.textContent = urgentCount;
      sidebarUrgentBadge.style.display = urgentCount > 0 ? 'inline-block' : 'none';
    }

    if (window.ATAMAN_REALTIME) {
      window.ATAMAN_REALTIME.updateNotifCount(unreadCount);
    } else {
      localStorage.setItem('ATAMAN_unread_notif_count', String(unreadCount));
    }

    const pillCntAll = document.getElementById('pillCntAll');
    if (pillCntAll) pillCntAll.textContent = totalCount;

    const categories = ['critical-tree', 'monitoring', 'maintenance', 'caretakers', 'adopters', 'users', 'schedule', 'system'];
    categories.forEach(cat => {
      const count = notifications.filter(n => n.category === cat).length;
      const btn = document.querySelector(`[data-pill-cat="${cat}"] .pill-count`);
      if (btn) btn.textContent = count;
    });


    // Save to localStorage
    try {
      localStorage.setItem('ATAMAN_notifications', JSON.stringify(notifications));
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. FILTERING & RENDERING LOGIC
  // ═══════════════════════════════════════════════════════════════════════════
  function getFilteredNotifications() {
    return notifications.filter(item => {
      // 1. Search Query
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const matchTitle = item.title && item.title.toLowerCase().includes(q);
        const matchDesc = item.description && item.description.toLowerCase().includes(q);
        const matchTree = item.treeId && item.treeId.toLowerCase().includes(q);
        const matchCt = item.caretaker && item.caretaker.toLowerCase().includes(q);
        const matchLoc = item.location && item.location.toLowerCase().includes(q);
        const matchCat = item.category && item.category.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTree && !matchCt && !matchLoc && !matchCat) {
          return false;
        }
      }

      // 2. Status
      if (state.status === 'unread' && item.read) return false;
      if (state.status === 'read' && !item.read) return false;

      // 3. Priority
      if (state.priority !== 'all' && item.priority !== state.priority) return false;

      // 4. Category
      if (state.category !== 'all' && item.category !== state.category) return false;

      // 5. Date
      if (state.dateRange === 'today') {
        if (!item.timestamp || !item.timestamp.startsWith('2026-08-31')) return false;
      } else if (state.dateRange === 'yesterday') {
        if (!item.timestamp || !item.timestamp.startsWith('2026-08-30')) return false;
      }

      // 6. Location
      if (state.location !== 'all') {
        if (!item.location || !item.location.includes(state.location)) return false;
      }

      return true;
    });
  }

  function getCategoryLabel(cat) {
    switch (cat) {
      case 'critical-tree': return '🚨 Critical Tree';
      case 'monitoring': return '📷 Monitoring';
      case 'maintenance': return '🔧 Maintenance';
      case 'trees': return '🌳 Trees';
      case 'caretakers': return '👤 Caretakers';
      case 'adopters': return '🤝 Adopters';
      case 'users': return '👥 Users';
      case 'schedule': return '📅 Schedule';
      case 'system': return '⚙️ System';
      default: return '📢 Notification';
    }
  }

  function getPriorityBadge(priority) {
    switch (priority) {
      case 'critical':
        return `<span class="badge-priority bp-critical">🔴 Critical</span>`;
      case 'high':
        return `<span class="badge-priority bp-high">🟠 High</span>`;
      case 'normal':
        return `<span class="badge-priority bp-normal">🟡 Normal</span>`;
      case 'info':
      default:
        return `<span class="badge-priority bp-info">🔵 Info</span>`;
    }
  }

  function getIconForCategory(cat, priority) {
    if (priority === 'critical') return '🚨';
    switch (cat) {
      case 'monitoring': return '📷';
      case 'maintenance': return '🔧';
      case 'trees': return '🌳';
      case 'caretakers': return '👤';
      case 'adopters': return '🤝';
      case 'users': return '👥';
      case 'schedule': return '📅';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  }

  function renderCard(item) {
    const unreadClass = item.read ? 'read' : 'unread';
    const cardPriorityClass = 
      item.priority === 'critical' ? 'crit-card' :
      item.priority === 'high' ? 'high-card' :
      item.priority === 'normal' ? 'norm-card' : 'info-card';

    const iconPriorityClass =
      item.priority === 'critical' ? 'crit-icon' :
      item.priority === 'high' ? 'high-icon' :
      item.priority === 'normal' ? 'norm-icon' : 'info-icon';

    // Primary action button depending on type
    let actionBtnHtml = '';
    if (item.priority === 'critical' || item.actionType === 'tree_maint') {
      actionBtnHtml = `
        <button class="btn-action-critical" onclick="window.notifApp.openMaintenanceModal('${item.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          Create Maintenance Task
        </button>
        <button class="btn-action-outline" onclick="window.notifApp.openNotifyModal('${item.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          Notify Caretaker
        </button>
      `;
    } else if (item.category === 'monitoring') {
      actionBtnHtml = `
        <a href="admin-trees.html" class="btn-action-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          View Monitoring
        </a>
        <button class="btn-action-outline" onclick="window.notifApp.openNotifyModal('${item.id}')">
          Remind Caretaker
        </button>
      `;
    } else if (item.category === 'maintenance') {
      actionBtnHtml = `
        <button class="btn-action-primary" onclick="window.notifApp.openDetail('${item.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          View Maintenance
        </button>
      `;
    } else if (item.category === 'adopters') {
      actionBtnHtml = `
        <a href="admin-adopters.html" class="btn-action-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>
          View Adopter
        </a>
      `;
    } else if (item.category === 'caretakers') {
      actionBtnHtml = `
        <a href="admin-caretakers.html" class="btn-action-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          View Caretaker
        </a>
      `;
    } else if (item.category === 'users') {
      actionBtnHtml = `
        <a href="admin-users.html" class="btn-action-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          View User Account
        </a>
      `;
    } else {
      actionBtnHtml = `
        <button class="btn-action-primary" onclick="window.notifApp.openDetail('${item.id}')">
          View Details
        </button>
      `;
    }

    return `
      <article class="notif-card ${unreadClass} ${cardPriorityClass}" id="card-${item.id}" data-id="${item.id}">
        ${!item.read ? `<div class="nc-unread-dot" title="Unread notification"></div>` : ''}

        <div class="nc-icon-wrapper ${iconPriorityClass}">
          ${getIconForCategory(item.category, item.priority)}
        </div>

        <div class="nc-content">
          <div class="nc-header-row">
            <div class="nc-tags-left">
              ${getPriorityBadge(item.priority)}
              <span class="badge-category">${getCategoryLabel(item.category)}</span>
            </div>
            <span class="nc-time">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${item.timeAgo || 'Just now'}
            </span>
          </div>

          <h3 class="nc-title" onclick="window.notifApp.openDetail('${item.id}')">${item.title}</h3>
          <p class="nc-desc">${item.description}</p>

          <div class="nc-metadata-bar">
            ${item.location && item.location !== 'N/A' ? `
              <span class="meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                📍 <strong>${item.location}</strong>
              </span>
            ` : ''}

            ${item.caretaker && item.caretaker !== 'N/A' ? `
              <span class="meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                👤 Caretaker: <strong>${item.caretaker}</strong>
              </span>
            ` : ''}

            ${item.treeId && item.treeId !== 'N/A' ? `
              <span class="meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/></svg>
                🏷️ Ref: <strong>${item.treeId}</strong>
              </span>
            ` : ''}
          </div>

          <div class="nc-actions-row">
            <div class="nc-left-actions">
              ${actionBtnHtml}
              <button class="btn-action-outline" onclick="window.notifApp.openDetail('${item.id}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                View
              </button>
            </div>

            <div class="nc-right-actions">
              <button class="btn-icon-action" title="${item.read ? 'Mark as Unread' : 'Mark as Read'}" onclick="window.notifApp.toggleRead('${item.id}')">
                ${item.read ? 
                  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>` : 
                  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
                }
              </button>
              <button class="btn-icon-action danger" title="Dismiss Notification" onclick="window.notifApp.dismiss('${item.id}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderFeed() {
    const list = getFilteredNotifications();

    if (feedShowingCount) {
      feedShowingCount.textContent = `Showing ${list.length} notification${list.length === 1 ? '' : 's'}`;
    }

    if (list.length === 0) {
      notifFeedList.innerHTML = '';
      notifEmptyState.style.display = 'block';
      return;
    }
    notifEmptyState.style.display = 'none';

    if (state.groupBy === 'chronological') {
      // Sort purely by newest first
      const sorted = [...list].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      notifFeedList.innerHTML = sorted.map(item => renderCard(item)).join('');
      return;
    }

    // Group By Priority Mode (Critical -> High -> Normal -> Info)
    const criticalList = list.filter(n => n.priority === 'critical');
    const highList = list.filter(n => n.priority === 'high');
    const normalList = list.filter(n => n.priority === 'normal');
    const infoList = list.filter(n => n.priority === 'info');

    let html = '';

    if (criticalList.length > 0) {
      html += `
        <div class="feed-priority-group">
          <div class="group-header">
            <span class="group-title group-title-critical">🔴 Urgent / Critical Action Required</span>
            <span class="group-count cnt-critical">${criticalList.length}</span>
          </div>
          ${criticalList.map(item => renderCard(item)).join('')}
        </div>
      `;
    }

    if (highList.length > 0) {
      html += `
        <div class="feed-priority-group">
          <div class="group-header">
            <span class="group-title group-title-high">🟠 High Priority</span>
            <span class="group-count cnt-high">${highList.length}</span>
          </div>
          ${highList.map(item => renderCard(item)).join('')}
        </div>
      `;
    }

    if (normalList.length > 0) {
      html += `
        <div class="feed-priority-group">
          <div class="group-header">
            <span class="group-title group-title-normal">🟡 Normal Routine Alerts</span>
            <span class="group-count cnt-normal">${normalList.length}</span>
          </div>
          ${normalList.map(item => renderCard(item)).join('')}
        </div>
      `;
    }

    if (infoList.length > 0) {
      html += `
        <div class="feed-priority-group">
          <div class="group-header">
            <span class="group-title group-title-info">🔵 General Information & System Logs</span>
            <span class="group-count cnt-info">${infoList.length}</span>
          </div>
          ${infoList.map(item => renderCard(item)).join('')}
        </div>
      `;
    }

    notifFeedList.innerHTML = html;
  }

  function renderHistoryTable() {
    if (!historyTableBody) return;
    const sorted = [...notifications].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    historyTableBody.innerHTML = sorted.map(item => {
      const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Aug 31';
      return `
        <tr>
          <td><strong>${dateStr}</strong></td>
          <td>
            <div style="font-weight:700; color:var(--text);">${item.title}</div>
            <div style="font-size:0.75rem; color:var(--text-s); max-width:320px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.description}</div>
          </td>
          <td><span class="badge-category">${getCategoryLabel(item.category)}</span></td>
          <td>${item.location || item.treeId || 'System'}</td>
          <td>${getPriorityBadge(item.priority)}</td>
          <td>
            <span class="status-pill ${item.read ? 'sp-read' : 'sp-unread'}">
              ${item.read ? '✓ Read' : '● Unread'}
            </span>
          </td>
          <td>
            <button class="btn-outline-sm" onclick="window.notifApp.openDetail('${item.id}')" style="padding:4px 8px; font-size:0.75rem;">
              Details
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DETAIL DRAWER CONTROLLER
  // ═══════════════════════════════════════════════════════════════════════════
  function openDetailDrawer(id) {
    const item = notifications.find(n => n.id === id);
    if (!item) return;

    state.selectedId = id;

    // Mark as read automatically when viewed
    if (!item.read) {
      item.read = true;
      updateCounters();
      renderFeed();
      renderHistoryTable();
    }

    if (drawerPriorityBadge) {
      drawerPriorityBadge.className = `dh-priority-badge bp-${item.priority}`;
      drawerPriorityBadge.textContent = `${item.priority.toUpperCase()} PRIORITY`;
    }
    if (drawerTitle) drawerTitle.textContent = item.title;

    drawerBody.innerHTML = `
      <!-- Target Entity Box -->
      <div class="drawer-box">
        <h4 class="drawer-box-title">Incident &amp; Subject Details</h4>
        <div class="drawer-meta-grid">
          <div class="dmg-item">
            <span class="dmg-lbl">Target Reference</span>
            <span class="dmg-val">${item.treeId || 'N/A'}</span>
          </div>
          <div class="dmg-item">
            <span class="dmg-lbl">Category</span>
            <span class="dmg-val">${getCategoryLabel(item.category)}</span>
          </div>
          <div class="dmg-item">
            <span class="dmg-lbl">Species / Area</span>
            <span class="dmg-val">${item.species || 'N/A'}</span>
          </div>
          <div class="dmg-item">
            <span class="dmg-lbl">Location / Zone</span>
            <span class="dmg-val">📍 ${item.location || 'N/A'}</span>
          </div>
          <div class="dmg-item">
            <span class="dmg-lbl">Assigned Caretaker</span>
            <span class="dmg-val">👤 ${item.caretaker || 'Unassigned'}</span>
          </div>
          <div class="dmg-item">
            <span class="dmg-lbl">Last Monitoring Date</span>
            <span class="dmg-val">${item.lastMonitoring || 'None'}</span>
          </div>
          <div class="dmg-item" style="grid-column: 1 / -1;">
            <span class="dmg-lbl">Reported / Detected At</span>
            <span class="dmg-val">${item.detectedDate || item.timeAgo}</span>
          </div>
        </div>
      </div>

      <!-- Full Problem Description -->
      <div class="drawer-box">
        <h4 class="drawer-box-title">Event Summary</h4>
        <p style="font-size:0.86rem; line-height:1.5; color:var(--text-m);">${item.description}</p>
        ${item.issue ? `
          <div style="margin-top:10px; padding:8px 12px; background:var(--surface); border-radius:6px; border:1px dashed var(--border);">
            <span style="font-size:0.75rem; font-weight:700; color:var(--text-s);">DIAGNOSTIC FLAG:</span>
            <span style="font-size:0.82rem; font-weight:800; color:var(--red); display:block; margin-top:2px;">${item.issue}</span>
          </div>
        ` : ''}
      </div>

      <!-- Recommended Action Box -->
      <div class="recommend-action-box ${item.priority === 'critical' ? 'rec-critical' : ''}">
        <h4 class="rab-title">
          <span>💡</span> Recommended Admin Action
        </h4>
        <p class="rab-text">${item.recommendedAction || 'Review situation and verify on next field patrol cycle.'}</p>
      </div>
    `;

    // Dynamic Action Buttons in Drawer
    let drawerActionsHtml = '';
    if (item.priority === 'critical' || item.category === 'critical-tree' || item.treeId?.startsWith('TR-')) {
      drawerActionsHtml = `
        <button class="btn-primary df-btn-full" onclick="window.notifApp.openMaintenanceModal('${item.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          Schedule Maintenance Task
        </button>
        <div class="df-btn-grid">
          <button class="btn-outline-sm" onclick="window.notifApp.openNotifyModal('${item.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            Notify Caretaker
          </button>
          <a href="admin-trees.html" class="btn-outline-sm" style="text-align:center; justify-content:center;">
            View Tree Profile →
          </a>
        </div>
      `;
    } else if (item.category === 'adopters') {
      drawerActionsHtml = `
        <a href="admin-adopters.html" class="btn-primary df-btn-full" style="justify-content:center;">
          Open Adopter Management →
        </a>
      `;
    } else if (item.category === 'caretakers') {
      drawerActionsHtml = `
        <a href="admin-caretakers.html" class="btn-primary df-btn-full" style="justify-content:center;">
          Open Caretaker Roster →
        </a>
      `;
    } else {
      drawerActionsHtml = `
        <button class="btn-primary df-btn-full" onclick="window.notifApp.closeDrawer()">
          Acknowledge &amp; Close
        </button>
      `;
    }

    drawerFooter.innerHTML = drawerActionsHtml;

    notifDetailBackdrop.classList.add('active');
    notifDetailDrawer.classList.add('active');
    notifDetailDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeDetailDrawer() {
    notifDetailBackdrop.classList.remove('active');
    notifDetailDrawer.classList.remove('active');
    notifDetailDrawer.setAttribute('aria-hidden', 'true');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. MAINTENANCE MODAL CONTROLLER
  // ═══════════════════════════════════════════════════════════════════════════
  function openMaintenanceModal(id) {
    const item = notifications.find(n => n.id === id);
    if (!item) return;

    if (maintTreeId) maintTreeId.value = item.treeId || 'TR-10047 (Acacia)';
    if (maintCaretaker && item.caretaker && item.caretaker !== 'Unassigned') {
      maintCaretaker.value = item.caretaker;
    }
    if (maintInstructions) {
      maintInstructions.value = `Flagged from notification: ${item.title}. Issue: ${item.issue || item.description}`;
    }

    modalMaintBackdrop.classList.add('active');
    modalMaintDialog.classList.add('active');
  }

  function closeMaintenanceModal() {
    modalMaintBackdrop.classList.remove('active');
    modalMaintDialog.classList.remove('active');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. NOTIFY CARETAKER MODAL CONTROLLER
  // ═══════════════════════════════════════════════════════════════════════════
  function openNotifyModal(id) {
    const item = notifications.find(n => n.id === id);
    if (!item) return;

    if (notifyStaffName) notifyStaffName.value = item.caretaker && item.caretaker !== 'Unassigned' ? item.caretaker : 'Dodong Zeta (Zone Lead)';
    if (notifyMessageText) {
      notifyMessageText.value = `[ATAMAN DISPATCH] Attention ${notifyStaffName.value}: Tree ${item.treeId || 'in your zone'} in ${item.location || 'Santiago'} requires inspection. Reason: ${item.issue || item.description}. Please confirm once checked.`;
    }

    modalNotifyBackdrop.classList.add('active');
    modalNotifyDialog.classList.add('active');
  }

  function closeNotifyModal() {
    modalNotifyBackdrop.classList.remove('active');
    modalNotifyDialog.classList.remove('active');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. SETTINGS MODAL CONTROLLER
  // ═══════════════════════════════════════════════════════════════════════════
  function openSettingsModal() {
    modalSettingsBackdrop.classList.add('active');
    modalSettingsDialog.classList.add('active');
  }

  function closeSettingsModal() {
    modalSettingsBackdrop.classList.remove('active');
    modalSettingsDialog.classList.remove('active');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. GLOBAL ACTIONS & EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  window.notifApp = {
    openDetail: openDetailDrawer,
    closeDrawer: closeDetailDrawer,
    openMaintenanceModal,
    openNotifyModal,
    toggleRead: (id) => {
      const item = notifications.find(n => n.id === id);
      if (item) {
        item.read = !item.read;
        updateCounters();
        renderFeed();
        renderHistoryTable();
        showToast(item.read ? 'Notification marked as read.' : 'Notification marked as unread.');
      }
    },
    dismiss: (id) => {
      const idx = notifications.findIndex(n => n.id === id);
      if (idx !== -1) {
        const removed = notifications.splice(idx, 1)[0];
        updateCounters();
        renderFeed();
        renderHistoryTable();
        showToast(`Dismissed: "${removed.title}"`, 'warning');
      }
    }
  };

  // Mark all as read
  if (btnMarkAllRead) {
    btnMarkAllRead.addEventListener('click', () => {
      notifications.forEach(n => n.read = true);
      updateCounters();
      renderFeed();
      renderHistoryTable();
      showToast('All notifications marked as read.');
    });
  }

  // Summary Card interactive filtering
  [cardUrgent, cardUnread, cardToday, cardTotal].forEach(card => {
    if (!card) return;
    card.addEventListener('click', () => {
      document.querySelectorAll('.summary-card').forEach(c => c.classList.remove('active-filter-card'));
      card.classList.add('active-filter-card');

      const filterType = card.getAttribute('data-filter-type');
      const filterVal = card.getAttribute('data-filter-val');

      if (filterType === 'priority') {
        state.priority = filterVal;
        state.status = 'all';
        state.dateRange = 'all';
        if (filterPriority) filterPriority.value = filterVal;
        if (filterStatus) filterStatus.value = 'all';
      } else if (filterType === 'status') {
        state.status = filterVal;
        state.priority = 'all';
        state.dateRange = 'all';
        if (filterStatus) filterStatus.value = filterVal;
        if (filterPriority) filterPriority.value = 'all';
      } else if (filterType === 'date') {
        state.dateRange = filterVal;
        state.status = 'all';
        state.priority = 'all';
        if (filterDate) filterDate.value = filterVal;
      }
      renderFeed();
    });
  });

  // Search Inputs
  function handleSearch(val) {
    state.searchQuery = val.trim();
    if (btnClearSearch) {
      btnClearSearch.style.display = state.searchQuery ? 'block' : 'none';
    }
    renderFeed();
  }

  if (notifSearchInput) {
    notifSearchInput.addEventListener('input', (e) => {
      if (topSearchInput) topSearchInput.value = e.target.value;
      handleSearch(e.target.value);
    });
  }
  if (topSearchInput) {
    topSearchInput.addEventListener('input', (e) => {
      if (notifSearchInput) notifSearchInput.value = e.target.value;
      handleSearch(e.target.value);
    });
  }
  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      if (notifSearchInput) notifSearchInput.value = '';
      if (topSearchInput) topSearchInput.value = '';
      handleSearch('');
    });
  }

  // Filter Dropdowns
  if (filterStatus) {
    filterStatus.addEventListener('change', (e) => {
      state.status = e.target.value;
      renderFeed();
    });
  }
  if (filterPriority) {
    filterPriority.addEventListener('change', (e) => {
      state.priority = e.target.value;
      renderFeed();
    });
  }
  if (filterCategory) {
    filterCategory.addEventListener('change', (e) => {
      state.category = e.target.value;
      // Sync pills
      document.querySelectorAll('.pill-chip').forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-pill-cat') === state.category);
      });
      renderFeed();
    });
  }
  if (filterDate) {
    filterDate.addEventListener('change', (e) => {
      state.dateRange = e.target.value;
      renderFeed();
    });
  }
  if (filterLocation) {
    filterLocation.addEventListener('change', (e) => {
      state.location = e.target.value;
      renderFeed();
    });
  }

  // Reset Filters
  function resetAllFilters() {
    state.searchQuery = '';
    state.status = 'all';
    state.priority = 'all';
    state.category = 'all';
    state.dateRange = 'all';
    state.location = 'all';

    if (notifSearchInput) notifSearchInput.value = '';
    if (topSearchInput) topSearchInput.value = '';
    if (filterStatus) filterStatus.value = 'all';
    if (filterPriority) filterPriority.value = 'all';
    if (filterCategory) filterCategory.value = 'all';
    if (filterDate) filterDate.value = 'all';
    if (filterLocation) filterLocation.value = 'all';
    if (btnClearSearch) btnClearSearch.style.display = 'none';

    document.querySelectorAll('.pill-chip').forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-pill-cat') === 'all');
    });
    document.querySelectorAll('.summary-card').forEach(c => c.classList.remove('active-filter-card'));
    if (cardTotal) cardTotal.classList.add('active-filter-card');

    renderFeed();
    showToast('Filters reset to show all notifications.');
  }

  if (btnResetFilters) btnResetFilters.addEventListener('click', resetAllFilters);
  const btnResetEmptyFilters = document.getElementById('btnResetEmptyFilters');
  if (btnResetEmptyFilters) btnResetEmptyFilters.addEventListener('click', resetAllFilters);

  // Quick Category Pills
  if (quickPillsRow) {
    quickPillsRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-chip');
      if (!btn) return;

      document.querySelectorAll('.pill-chip').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.getAttribute('data-pill-cat');
      state.category = cat;
      if (filterCategory) filterCategory.value = cat;
      renderFeed();
    });
  }

  // View Mode Toggle (Priority vs Chronological)
  if (btnGroupPriority) {
    btnGroupPriority.addEventListener('click', () => {
      btnGroupPriority.classList.add('active');
      if (btnGroupChronological) btnGroupChronological.classList.remove('active');
      state.groupBy = 'priority';
      renderFeed();
    });
  }
  if (btnGroupChronological) {
    btnGroupChronological.addEventListener('click', () => {
      btnGroupChronological.classList.add('active');
      if (btnGroupPriority) btnGroupPriority.classList.remove('active');
      state.groupBy = 'chronological';
      renderFeed();
    });
  }

  // Refresh Feed
  if (btnRefreshFeed) {
    btnRefreshFeed.addEventListener('click', () => {
      btnRefreshFeed.querySelector('svg')?.animate([
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(360deg)' }
      ], { duration: 600 });
      updateCounters();
      renderFeed();
      renderHistoryTable();
      showToast('Notification feed refreshed.');
    });
  }

  // Bulk Actions
  if (btnBulkActions && bulkMenu) {
    btnBulkActions.addEventListener('click', (e) => {
      e.stopPropagation();
      bulkMenu.classList.toggle('show');
    });
    document.addEventListener('click', () => bulkMenu.classList.remove('show'));
  }

  if (bulkMarkRead) {
    bulkMarkRead.addEventListener('click', () => {
      const filtered = getFilteredNotifications();
      filtered.forEach(n => n.read = true);
      updateCounters();
      renderFeed();
      renderHistoryTable();
      showToast(`Marked ${filtered.length} notifications as read.`);
    });
  }
  if (bulkMarkUnread) {
    bulkMarkUnread.addEventListener('click', () => {
      const filtered = getFilteredNotifications();
      filtered.forEach(n => n.read = false);
      updateCounters();
      renderFeed();
      renderHistoryTable();
      showToast(`Marked ${filtered.length} notifications as unread.`);
    });
  }
  if (bulkDismiss) {
    bulkDismiss.addEventListener('click', () => {
      const filtered = getFilteredNotifications();
      const ids = new Set(filtered.map(f => f.id));
      notifications = notifications.filter(n => !ids.has(n.id));
      updateCounters();
      renderFeed();
      renderHistoryTable();
      showToast(`Dismissed ${filtered.length} notifications.`, 'warning');
    });
  }
  if (bulkExport) {
    bulkExport.addEventListener('click', exportCsv);
  }

  // History Table Collapse Toggle
  if (btnToggleHistoryCollapse && historyTableContainer) {
    btnToggleHistoryCollapse.addEventListener('click', () => {
      const isCollapsed = historyTableContainer.classList.toggle('collapsed');
      if (txtHistoryCollapse) txtHistoryCollapse.textContent = isCollapsed ? 'Expand' : 'Collapse';
      if (icoHistoryChevron) {
        icoHistoryChevron.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    });
  }

  // Export CSV
  function exportCsv() {
    const list = getFilteredNotifications();
    let csv = 'ID,Date,Title,Description,Category,Priority,Status,Location,Caretaker,TreeRef\n';
    list.forEach(item => {
      csv += `"${item.id}","${item.timestamp}","${(item.title||'').replace(/"/g, '""')}","${(item.description||'').replace(/"/g, '""')}","${item.category}","${item.priority}","${item.read ? 'Read' : 'Unread'}","${item.location||''}","${item.caretaker||''}","${item.treeId||''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ATAMAN_notifications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Notifications exported to CSV successfully.');
  }

  if (btnExportHistoryCsv) btnExportHistoryCsv.addEventListener('click', exportCsv);

  // Close Drawers & Modals on Backdrop or Close Button
  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDetailDrawer);
  if (notifDetailBackdrop) notifDetailBackdrop.addEventListener('click', closeDetailDrawer);

  if (btnCloseMaintModal) btnCloseMaintModal.addEventListener('click', closeMaintenanceModal);
  if (btnCancelMaint) btnCancelMaint.addEventListener('click', closeMaintenanceModal);
  if (modalMaintBackdrop) modalMaintBackdrop.addEventListener('click', closeMaintenanceModal);

  if (btnCloseNotifyModal) btnCloseNotifyModal.addEventListener('click', closeNotifyModal);
  if (btnCancelNotify) btnCancelNotify.addEventListener('click', closeNotifyModal);
  if (modalNotifyBackdrop) modalNotifyBackdrop.addEventListener('click', closeNotifyModal);

  if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettingsModal);
  if (btnCloseSettingsModal) btnCloseSettingsModal.addEventListener('click', closeSettingsModal);
  if (btnCancelSettings) btnCancelSettings.addEventListener('click', closeSettingsModal);
  if (modalSettingsBackdrop) modalSettingsBackdrop.addEventListener('click', closeSettingsModal);

  // Form Submissions
  if (formCreateMaintTask) {
    formCreateMaintTask.addEventListener('submit', (e) => {
      e.preventDefault();
      const taskType = document.getElementById('maintTaskType')?.value;
      const targetTree = maintTreeId?.value;
      const ct = maintCaretaker?.value;
      closeMaintenanceModal();
      closeDetailDrawer();
      showToast(`✓ Scheduled "${taskType}" for ${targetTree} assigned to ${ct}!`);
    });
  }

  if (formNotifyCaretaker) {
    formNotifyCaretaker.addEventListener('submit', (e) => {
      e.preventDefault();
      const recipient = notifyStaffName?.value;
      closeNotifyModal();
      showToast(`📱 Urgent field alert dispatched to ${recipient} via SMS & In-App!`);
    });
  }

  if (formNotificationSettings) {
    formNotificationSettings.addEventListener('submit', (e) => {
      e.preventDefault();
      closeSettingsModal();
      showToast('✓ Notification preferences & alert channels saved successfully.');
    });
  }

  // Sidebar mobile toggle
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Keyboard accessibility
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetailDrawer();
      closeMaintenanceModal();
      closeNotifyModal();
      closeSettingsModal();
    }
  });

  // Initial Run
  updateCounters();
  renderFeed();
  renderHistoryTable();

});
