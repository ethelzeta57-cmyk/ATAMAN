/* ==========================================================================
   admin-users.js — ATAMAN Admin User Management Logic & Interactions
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Load & Normalise Registered Users from Auth Registry ── */

  /** Standardize emails and convert legacy @saplink.org domain to @ataman.org */
  function cleanEmail(em) {
    if (!em) return '';
    const cleaned = em.toLowerCase().trim().replace(/@saplink\.org$/i, '@ataman.org');
    if (cleaned === 'admin@ataman.org') return 'ethelzeta57@gmail.com';
    return cleaned;
  }

  /** Convert a raw registered-user record into the shape admin-users.js expects */
  function normaliseRecord(raw, defaultRole = 'Adopter') {
    const roleRaw = (raw.role || defaultRole || 'adopter').toLowerCase().trim();
    let roleDisplay;
    if (roleRaw === 'admin' || roleRaw.includes('admin'))       roleDisplay = 'Administrator';
    else if (roleRaw === 'caretaker' || roleRaw.includes('caretaker') || roleRaw.includes('care')) roleDisplay = 'Caretaker';
    else if (roleRaw === 'staff')                                      roleDisplay = 'Staff';
    else if (roleRaw === 'farmer' || roleRaw.includes('farm'))         roleDisplay = 'Farmer';
    else                                                               roleDisplay = 'Adopter';

    const rawEmail = (raw.email || '').toLowerCase().trim();
    const email    = cleanEmail(rawEmail);
    const name     = raw.displayName || raw.name || (email ? email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'ATAMAN User');
    const username = raw.username || (email ? email.split('@')[0].toLowerCase() : ('user' + Math.floor(100 + Math.random() * 900)));
    const empId    = raw.empId || raw.id || ('EMP-' + Math.floor(1000 + Math.random() * 9000));

    // Registration forms do not ask for location; if unassigned, do not default to dummy 'Brgy. San Isidro'
    let userLocation = (raw.location || '').trim();
    if (userLocation === 'Brgy. San Isidro' && email !== 'zetadodong@gmail.com') {
      userLocation = '';
    }

    return {
      id:           raw.uid || raw.id || ('USR-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
      name:         name,
      username:     username,
      email:        email,
      phone:        raw.phone || raw.contact || '—',
      empId:        empId,
      role:         roleDisplay,
      location:     userLocation,
      lastLogin:    raw.lastLogin || (raw.createdAt ? 'Active this week' : 'Never logged in'),
      createdDate:  raw.createdAt ? new Date(raw.createdAt).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'2-digit' }) : 'Jan 15, 2026',
      status:       raw.status || 'Active',
      tfa:          raw.tfa || false,
      treesAssigned:raw.treesAssigned || 0,
      treesAdopted: raw.treesAdopted || 0,
      areas:        raw.areas || (userLocation ? [userLocation] : []),
      completionRate: raw.completionRate || '0%'
    };
  }

  /** Merge all auth registries, user caches, adopter stores, and caretaker stores into one deduplicated list */
  function loadAllUsers() {
    const seen = new Map();   // normalized email → record

    // Default system registered accounts
    const defaultSeeds = [
      { uid: '152HcDnFRaTZtHcTN5uxUMfBY7R2', id: '152HcDnFRaTZtHcTN5uxUMfBY7R2', email: 'ethelzeta57@gmail.com', displayName: 'Ethel Zeta (Admin)', role: 'Administrator', empId: 'EMP-001', location: 'Catbalogan City, Samar', status: 'Active' },
      { uid: 'USR-CT-001', id: 'CT-101', email: 'zetadodong@gmail.com', displayName: 'Dodong Zeta', role: 'Caretaker', empId: 'EMP-002', location: 'Brgy. Canlapwas, Catbalogan City', status: 'Active', phone: '+63 918 333 4455' },
      { uid: 'USR-ADP-001', id: 'ADP-101', email: 'nikkimaga24@gmail.com', displayName: 'Nikki Maga', role: 'Adopter', empId: 'ADP-101', location: 'Brgy. Guinsorongan, Catbalogan City', status: 'Active', phone: '+63 917 123 4567' }
    ];

    defaultSeeds.forEach(seed => {
      seen.set(cleanEmail(seed.email), normaliseRecord(seed, seed.role));
    });

    // 1. Auth Registries (users registered via registration forms & authAPI.signUp)
    ['ATAMAN_registered_users', 'saplink_registered_users'].forEach(key => {
      try {
        const reg = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(reg)) {
          reg.forEach(r => {
            if (!r.email) return;
            const em = cleanEmail(r.email);
            const rec = normaliseRecord({ ...r, email: em }, r.role);
            if (seen.has(em)) {
              seen.set(em, { ...seen.get(em), ...rec, role: rec.role || seen.get(em).role });
            } else {
              seen.set(em, rec);
            }
          });
        }
      } catch (e) {}
    });

    // 2. User Caches (users added or synced previously)
    ['ATAMAN_users_cache', 'saplink_users_cache'].forEach(key => {
      try {
        const cache = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(cache)) {
          cache.forEach(r => {
            const em = cleanEmail(r.email);
            if (!em) return;
            const rec = normaliseRecord({ ...r, email: em }, r.role);
            if (seen.has(em)) {
              const existing = seen.get(em);
              const cleanLoc = (r.location && r.location !== 'Brgy. San Isidro') ? r.location : (existing.location || '');
              seen.set(em, {
                ...existing,
                phone: (existing.phone === '—' && r.phone) ? r.phone : (r.phone || r.contact || existing.phone),
                empId: (existing.empId && existing.empId.startsWith('EMP-') && r.empId && !r.empId.startsWith('EMP-')) ? r.empId : (existing.empId || r.empId),
                location: cleanLoc,
                role: r.role ? normaliseRecord(r).role : existing.role
              });
            } else {
              seen.set(em, rec);
            }
          });
        }
      } catch (e) {}
    });

    // 3. Caretakers Cache (ensures all caretakers in the field registry are listed)
    ['ATAMAN_caretakers_cache', 'saplink_caretakers_cache'].forEach(key => {
      try {
        const cts = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(cts)) {
          cts.forEach(c => {
            const em = cleanEmail(c.email);
            if (!em) return;
            if (seen.has(em)) {
              const ex = seen.get(em);
              seen.set(em, {
                ...ex,
                role: 'Caretaker',
                treesAssigned: c.treesAssigned !== undefined ? c.treesAssigned : ex.treesAssigned,
                phone: c.contact || c.phone || ex.phone
              });
            } else {
              seen.set(em, normaliseRecord({ ...c, email: em, role: 'Caretaker' }, 'Caretaker'));
            }
          });
        }
      } catch (e) {}
    });

    // 4. Adopters Cache (ensures all tree adopters are listed)
    ['ATAMAN_adopters_cache', 'saplink_adopters_cache'].forEach(key => {
      try {
        const ads = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(ads)) {
          ads.forEach(a => {
            const em = cleanEmail(a.email);
            if (!em) return;
            if (seen.has(em)) {
              const ex = seen.get(em);
              seen.set(em, {
                ...ex,
                role: 'Adopter',
                treesAdopted: a.treesAdopted !== undefined ? a.treesAdopted : ex.treesAdopted,
                phone: a.contact || a.phone || ex.phone
              });
            } else {
              seen.set(em, normaliseRecord({ ...a, email: em, role: 'Adopter' }, 'Adopter'));
            }
          });
        }
      } catch (e) {}
    });

    const merged = Array.from(seen.values());
    try {
      localStorage.setItem('ATAMAN_users_cache', JSON.stringify(merged));
      localStorage.setItem('saplink_users_cache', JSON.stringify(merged));
    } catch (e) {}
    return merged;
  }

  let usersData = loadAllUsers();
  let selectedUserIds = new Set();
  let currentActiveUser = usersData[0];

  /* ── DOM Elements ── */
  const usersTableBody     = document.getElementById('usersTableBody');
  const selectAllCheckbox  = document.getElementById('selectAllCheckbox');
  const bulkActionBar      = document.getElementById('bulkActionBar');
  const bulkCountText      = document.getElementById('bulkCountText');
  const userSearchInput    = document.getElementById('userSearchInput');
  const roleFilter         = document.getElementById('roleFilter');
  const statusFilter       = document.getElementById('statusFilter');
  const locationFilter     = document.getElementById('locationFilter');
  const resetFiltersBtn    = document.getElementById('resetFiltersBtn');
  const toastMsg           = document.getElementById('toastMsg');
  const sidebarToggle      = document.getElementById('sidebarToggle');
  const sidebar            = document.getElementById('sidebar');

  // Drawer Elements
  const userDrawer         = document.getElementById('userDrawer');
  const drawerOverlay      = document.getElementById('userDrawerOverlay');
  const closeDrawerBtn     = document.getElementById('closeDrawerBtn');
  const drawerAvatar       = document.getElementById('drawerAvatar');
  const drawerFullName     = document.getElementById('drawerFullName');
  const drawerUsername     = document.getElementById('drawerUsername');
  const drawerStatusBadge  = document.getElementById('drawerStatusBadge');
  const dEmail             = document.getElementById('dEmail');
  const dPhone             = document.getElementById('dPhone');
  const dEmpId             = document.getElementById('dEmpId');
  const dLocation          = document.getElementById('dLocation');
  const dRole              = document.getElementById('dRole');
  const dCreated           = document.getElementById('dCreated');
  const dLastLogin         = document.getElementById('dLastLogin');
  const dtabCaretakerBtn   = document.getElementById('dtabCaretakerBtn');

  // Add User Wizard Elements
  const openAddUserModalBtn = document.getElementById('openAddUserModalBtn');
  const closeAddUserModalBtn= document.getElementById('closeAddUserModalBtn');
  const addUserModalOverlay = document.getElementById('addUserModalOverlay');
  const prevWizardBtn       = document.getElementById('prevWizardBtn');
  const nextWizardBtn       = document.getElementById('nextWizardBtn');
  const submitCreateUserBtn = document.getElementById('submitCreateUserBtn');
  const wizardSteps         = document.querySelectorAll('.wizard-step');
  const stepperItems        = document.querySelectorAll('.step-item');
  let currentWizardStep     = 1;

  // Warning Modal Elements
  const deactivateWarnModal = document.getElementById('deactivateWarningModal');
  const closeDeactivateWarnBtn = document.getElementById('closeDeactivateWarnBtn');
  const warnCaretakerName   = document.getElementById('warnCaretakerName');
  const warnTreeCount       = document.getElementById('warnTreeCount');
  const confirmDeactivateBtn= document.getElementById('confirmDeactivateBtn');

  /* ── Toast Notification ── */
  function showToast(msg, duration = 3000) {
    toastMsg.textContent = msg;
    toastMsg.classList.remove('hidden');
    clearTimeout(toastMsg._timer);
    toastMsg._timer = setTimeout(() => {
      toastMsg.classList.add('hidden');
    }, duration);
  }

  /* ── Helpers for Avatar Colors & Role Badges ── */
  function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  function getRoleClass(role) {
    switch (role.toLowerCase()) {
      case 'administrator': return 'admin';
      case 'caretaker': return 'caretaker';
      case 'staff': return 'staff';
      case 'farmer': return 'farmer';
      case 'adopter': return 'adopter';
      default: return 'staff';
    }
  }

  function getStatusClass(status) {
    switch (status.toLowerCase()) {
      case 'active': return 'active';
      case 'pending': return 'pending';
      case 'inactive': return 'inactive';
      case 'suspended': return 'suspended';
      default: return 'inactive';
    }
  }

  /* ── 2. Render Users Table ── */
  function renderUsersTable(filterData = usersData) {
    usersTableBody.innerHTML = '';

    if (filterData.length === 0) {
      const isEmptyDataset = usersData.length === 0;
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:48px 20px; color:var(--text-s, #94a3b8);">
            <div style="font-size:2.2rem; margin-bottom:10px;">👥</div>
            <p style="font-weight:700; font-size:0.95rem; margin-bottom:6px;">
              ${isEmptyDataset ? 'No users registered yet.' : 'No user accounts match your search or filter criteria.'}
            </p>
            <p style="font-size:0.82rem;">
              ${isEmptyDataset ? 'Click <strong>+ Add User</strong> above to create the first account.' : 'Try adjusting your search or resetting filters.'}
            </p>
          </td>
        </tr>
      `;
      return;
    }

    filterData.forEach(user => {
      const isChecked = selectedUserIds.has(user.id);
      const roleCls   = getRoleClass(user.role);
      const statusCls = getStatusClass(user.status);
      const initials  = getInitials(user.name);

      let roleIconText;
      if (roleCls === 'adopter')       roleIconText = '🤝 Adopter';
      else if (roleCls === 'caretaker')roleIconText = '👨‍🌾 Caretaker';
      else if (roleCls === 'admin')    roleIconText = '🔐 Administrator';
      else if (roleCls === 'farmer')   roleIconText = '🌱 Farmer';
      else                             roleIconText = '👤 Staff';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="user-row-cb" data-id="${user.id}" ${isChecked ? 'checked' : ''}></td>
        <td>
          <div class="user-cell">
            <div class="u-avatar ${roleCls}">${initials}</div>
            <div class="u-names">
              <span class="u-name" data-id="${user.id}">${user.name}</span>
              <span class="u-handle">@${user.username}</span>
            </div>
          </div>
        </td>
        <td>
          <div class="contact-cell">
            <span class="contact-email">${user.email}</span>
            <span class="contact-empid">${user.empId}</span>
          </div>
        </td>
        <td><span class="role-badge ${roleCls}">${roleIconText}</span></td>
        <td>${user.location ? user.location : '<span style="color:var(--text-s); font-size:.78rem; font-style:italic;">Not specified</span>'}</td>
        <td><small style="color:var(--text-s); font-weight:600;">${user.lastLogin}</small></td>
        <td>${user.tfa ? '<span class="status-pill green">2FA On</span>' : '<span style="color:var(--text-s); font-size:.72rem;">Off</span>'}</td>
        <td><span class="status-badge ${statusCls}">● ${user.status}</span></td>
        <td style="text-align:right;">
          <div class="tbl-actions">
            <button class="btn-tbl-view" data-id="${user.id}">View</button>
            <button class="btn-tbl-more" data-id="${user.id}" title="More Actions">⋮</button>
          </div>
        </td>
      `;

      // Event listener for opening drawer on row or button click
      tr.querySelector('.u-name').addEventListener('click', () => openUserDrawer(user));
      tr.querySelector('.btn-tbl-view').addEventListener('click', () => openUserDrawer(user));
      tr.querySelector('.btn-tbl-more').addEventListener('click', (e) => {
        e.stopPropagation();
        openUserDrawer(user);
      });

      // Checkbox click
      const cb = tr.querySelector('.user-row-cb');
      cb.addEventListener('change', () => {
        if (cb.checked) {
          selectedUserIds.add(user.id);
        } else {
          selectedUserIds.delete(user.id);
        }
        updateBulkBar();
      });

      usersTableBody.appendChild(tr);
    });

    document.getElementById('tablePaginationInfo').textContent = `Showing 1 to ${filterData.length} of ${filterData.length} users`;
  }

  /* ── 3. Search and Filter Handler ── */
  function applyFilters() {
    const query = userSearchInput.value.toLowerCase().trim();
    const role  = roleFilter.value;
    const status= statusFilter.value;
    const loc   = locationFilter.value;

    const filtered = usersData.filter(u => {
      const matchQuery = !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        u.empId.toLowerCase().includes(query);
      
      const matchRole   = !role   || u.role.toLowerCase() === role.toLowerCase();
      const matchStatus = !status || u.status.toLowerCase() === status.toLowerCase();
      const matchLoc    = !loc    || u.location.toLowerCase().includes(loc.toLowerCase());

      return matchQuery && matchRole && matchStatus && matchLoc;
    });

    renderUsersTable(filtered);
  }

  userSearchInput.addEventListener('input', applyFilters);
  roleFilter.addEventListener('change', applyFilters);
  statusFilter.addEventListener('change', applyFilters);
  locationFilter.addEventListener('change', applyFilters);

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      userSearchInput.value = '';
      roleFilter.value = '';
      statusFilter.value = '';
      locationFilter.value = '';
      applyFilters();
      showToast('🔄 Filters reset to default.');
    });
  }

  // Quick summary card filter clicks
  document.querySelectorAll('.summary-card').forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      if (filter === 'all') {
        statusFilter.value = '';
        roleFilter.value = '';
      } else if (filter === 'adopter') {
        roleFilter.value = 'Adopter';
        statusFilter.value = '';
      } else if (filter === 'caretaker') {
        roleFilter.value = 'Caretaker';
        statusFilter.value = '';
      } else if (filter === 'admin') {
        roleFilter.value = 'Administrator';
        statusFilter.value = '';
      } else if (filter === 'active' || filter === 'pending' || filter === 'inactive') {
        statusFilter.value = filter.charAt(0).toUpperCase() + filter.slice(1);
        roleFilter.value = '';
      }
      applyFilters();
    });
  });

  /* ── 4. Bulk Action Management ── */
  function updateBulkBar() {
    const count = selectedUserIds.size;
    if (count > 0) {
      bulkActionBar.classList.remove('hidden');
      bulkCountText.textContent = `${count} user${count > 1 ? 's' : ''} selected`;
    } else {
      bulkActionBar.classList.add('hidden');
    }
  }

  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', () => {
      const allCbs = document.querySelectorAll('.user-row-cb');
      if (selectAllCheckbox.checked) {
        usersData.forEach(u => selectedUserIds.add(u.id));
        allCbs.forEach(cb => cb.checked = true);
      } else {
        selectedUserIds.clear();
        allCbs.forEach(cb => cb.checked = false);
      }
      updateBulkBar();
    });
  }

  document.getElementById('bulkActivateBtn')?.addEventListener('click', () => {
    selectedUserIds.forEach(id => {
      const u = usersData.find(x => x.id === id);
      if (u) u.status = 'Active';
    });
    showToast(`🟢 Activated ${selectedUserIds.size} accounts.`);
    selectedUserIds.clear();
    updateBulkBar();
    applyFilters();
  });

  document.getElementById('bulkDeactivateBtn')?.addEventListener('click', () => {
    selectedUserIds.forEach(id => {
      const u = usersData.find(x => x.id === id);
      if (u) u.status = 'Inactive';
    });
    showToast(`⚪ Deactivated ${selectedUserIds.size} accounts.`);
    selectedUserIds.clear();
    updateBulkBar();
    applyFilters();
  });

  document.getElementById('bulkExportBtn')?.addEventListener('click', () => {
    showToast(`📤 Exporting ${selectedUserIds.size} selected accounts to CSV...`);
  });

  /* ── 5. User Profile Drawer Slide-Over ── */
  function openUserDrawer(user) {
    currentActiveUser = user;
    drawerAvatar.textContent = getInitials(user.name);
    drawerAvatar.className = `dh-avatar u-avatar ${getRoleClass(user.role)}`;
    drawerFullName.textContent = user.name;
    drawerUsername.textContent = `@${user.username} · ${user.empId}`;

    drawerStatusBadge.className = `status-badge ${getStatusClass(user.status)}`;
    drawerStatusBadge.textContent = `● ${user.status}`;

    dEmail.textContent = user.email;
    dPhone.textContent = user.phone;
    dEmpId.textContent = user.empId;
    dLocation.textContent = user.location || 'Not specified';
    dRole.textContent = user.role;
    dRole.className = `role-badge ${getRoleClass(user.role)}`;
    dCreated.textContent = user.createdDate;
    dLastLogin.textContent = user.lastLogin;

    // Show or hide Caretaker connection tab
    if (user.role.toLowerCase() === 'caretaker') {
      dtabCaretakerBtn.style.display = 'block';
    } else {
      dtabCaretakerBtn.style.display = 'none';
    }

    userDrawer.classList.remove('hidden');
    drawerOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeUserDrawer() {
    userDrawer.classList.add('hidden');
    drawerOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeUserDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeUserDrawer);

  // Drawer Tabs switching
  document.querySelectorAll('.d-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.d-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.dtab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.dtab);
      if (target) target.classList.add('active');
    });
  });

  // Drawer Action Buttons
  document.getElementById('savePermsBtn')?.addEventListener('click', () => {
    showToast(`💾 Permissions updated successfully for ${currentActiveUser.name}.`);
  });

  document.getElementById('btnDrawerResetPass')?.addEventListener('click', () => {
    showToast(`🔑 Temporary password generated & emailed to ${currentActiveUser.email}.`);
  });

  document.getElementById('btnSendResetLink')?.addEventListener('click', () => {
    showToast(`📧 Password reset email sent to ${currentActiveUser.email}.`);
  });

  document.getElementById('btnSignOutSessions')?.addEventListener('click', () => {
    showToast(`⚠️ Force signed out all active sessions for ${currentActiveUser.name}.`);
  });

  // Caretaker Deactivation Business Rule Warning
  document.getElementById('btnDrawerDeactivate')?.addEventListener('click', () => {
    if (currentActiveUser.role.toLowerCase() === 'caretaker' && currentActiveUser.treesAssigned > 0) {
      warnCaretakerName.textContent = currentActiveUser.name;
      warnTreeCount.textContent = `${currentActiveUser.treesAssigned} assigned trees`;
      deactivateWarnModal.classList.remove('hidden');
    } else {
      currentActiveUser.status = 'Inactive';
      showToast(`⚪ Account deactivated for ${currentActiveUser.name}.`);
      closeUserDrawer();
      applyFilters();
    }
  });

  if (closeDeactivateWarnBtn) {
    closeDeactivateWarnBtn.addEventListener('click', () => deactivateWarnModal.classList.add('hidden'));
  }

  if (confirmDeactivateBtn) {
    confirmDeactivateBtn.addEventListener('click', () => {
      currentActiveUser.status = 'Inactive';
      deactivateWarnModal.classList.add('hidden');
      closeUserDrawer();
      applyFilters();
      showToast(`⚠️ Caretaker ${currentActiveUser.name} deactivated. Ensure tree reassignments are executed!`);
    });
  }

  /* ── 6. Add User Multi-Step Wizard Modal ── */
  function openAddUserModal() {
    currentWizardStep = 1;
    updateWizardUI();
    if (addUserModalOverlay) addUserModalOverlay.classList.remove('hidden');
  }

  function closeAddUserModal() {
    if (addUserModalOverlay) addUserModalOverlay.classList.add('hidden');
  }

  function updateWizardUI() {
    wizardSteps.forEach((step, idx) => {
      step.classList.toggle('active', idx + 1 === currentWizardStep);
    });
    stepperItems.forEach((item, idx) => {
      item.classList.toggle('active', idx + 1 === currentWizardStep);
    });

    if (prevWizardBtn) prevWizardBtn.disabled = currentWizardStep === 1;

    if (currentWizardStep === 5) {
      nextWizardBtn.classList.add('hidden');
    } else {
      nextWizardBtn.classList.remove('hidden');
    }
  }

  if (openAddUserModalBtn) openAddUserModalBtn.addEventListener('click', openAddUserModal);
  if (closeAddUserModalBtn) closeAddUserModalBtn.addEventListener('click', closeAddUserModal);

  if (nextWizardBtn) {
    nextWizardBtn.addEventListener('click', () => {
      if (currentWizardStep < 5) {
        currentWizardStep++;
        updateWizardUI();
      }
    });
  }

  if (prevWizardBtn) {
    prevWizardBtn.addEventListener('click', () => {
      if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardUI();
      }
    });
  }

  // Interactive Role Cards in Step 2
  document.querySelectorAll('.role-select-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.role-select-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // Password visibility toggle helpers
  const toggleAddPasswordBtn = document.getElementById('toggleAddPassword');
  const addPasswordInput = document.getElementById('addPassword');
  if (toggleAddPasswordBtn && addPasswordInput) {
    toggleAddPasswordBtn.addEventListener('click', () => {
      const isPass = addPasswordInput.type === 'password';
      addPasswordInput.type = isPass ? 'text' : 'password';
      toggleAddPasswordBtn.textContent = isPass ? '🙈' : '👁️';
    });
  }

  const toggleAddConfirmPasswordBtn = document.getElementById('toggleAddConfirmPassword');
  const addConfirmPasswordInput = document.getElementById('addConfirmPassword');
  if (toggleAddConfirmPasswordBtn && addConfirmPasswordInput) {
    toggleAddConfirmPasswordBtn.addEventListener('click', () => {
      const isPass = addConfirmPasswordInput.type === 'password';
      addConfirmPasswordInput.type = isPass ? 'text' : 'password';
      toggleAddConfirmPasswordBtn.textContent = isPass ? '🙈' : '👁️';
    });
  }

  // Allow clicking stepper steps directly
  stepperItems.forEach((item, idx) => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      currentWizardStep = idx + 1;
      updateWizardUI();
    });
  });

  // Submit Wizard and create user with credentials
  if (submitCreateUserBtn) {
    submitCreateUserBtn.addEventListener('click', async () => {
      const fullName = document.getElementById('addFullName').value.trim();
      const username = document.getElementById('addUsername').value.trim() || (fullName ? fullName.toLowerCase().replace(/\s+/g, '.') : '');
      const email    = document.getElementById('addEmail').value.trim();
      const phone    = document.getElementById('addPhone').value.trim();
      const empId    = document.getElementById('addEmpId').value.trim() || `EMP-2026-${Math.floor(100 + Math.random() * 900)}`;
      const role     = document.querySelector('input[name="addRole"]:checked')?.value || 'Caretaker';
      const location = document.getElementById('addLocation').value || '';
      const password = document.getElementById('addPassword')?.value || '';
      const confirmPass = document.getElementById('addConfirmPassword')?.value || '';

      if (!fullName) {
        showToast('⚠️ Please enter the user\'s Full Name.');
        currentWizardStep = 1; updateWizardUI();
        document.getElementById('addFullName')?.focus();
        return;
      }
      if (!email) {
        showToast('⚠️ Please enter a valid Email Address.');
        currentWizardStep = 1; updateWizardUI();
        document.getElementById('addEmail')?.focus();
        return;
      }
      if (!password) {
        showToast('⚠️ Please create a password for this user (minimum 6 characters).');
        currentWizardStep = 1; updateWizardUI();
        document.getElementById('addPassword')?.focus();
        return;
      }
      if (password.length < 6) {
        showToast('⚠️ Password must be at least 6 characters.');
        currentWizardStep = 1; updateWizardUI();
        document.getElementById('addPassword')?.focus();
        return;
      }
      if (confirmPass && password !== confirmPass) {
        showToast('⚠️ Passwords do not match. Please re-enter.');
        currentWizardStep = 1; updateWizardUI();
        document.getElementById('addConfirmPassword')?.focus();
        return;
      }

      submitCreateUserBtn.disabled = true;
      submitCreateUserBtn.textContent = '⏳ Creating account...';

      let createdFirebaseUser = null;

      // 1. Create in Firebase Authentication without logging out the current Admin
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        try {
          let secondaryApp;
          try {
            secondaryApp = firebase.app('AdminUserCreator');
          } catch (_) {
            secondaryApp = firebase.initializeApp(firebase.app().options, 'AdminUserCreator');
          }
          const secondaryAuth = secondaryApp.auth();
          const cred = await secondaryAuth.createUserWithEmailAndPassword(email.toLowerCase(), password);
          createdFirebaseUser = cred.user;
          if (createdFirebaseUser && createdFirebaseUser.updateProfile) {
            await createdFirebaseUser.updateProfile({ displayName: fullName });
          }
          await secondaryAuth.signOut();
        } catch (err) {
          console.warn('Firebase Auth user creation info:', err);
          if (err.code === 'auth/weak-password') {
            showToast('⚠️ Password is too weak (minimum 6 characters required).');
            submitCreateUserBtn.disabled = false;
            submitCreateUserBtn.textContent = '⚡ Create User Account';
            return;
          }
        }
      }

      const uid = createdFirebaseUser?.uid || (`USR-${Date.now().toString().slice(-6)}`);
      const normRole = role.toLowerCase().includes('adopter') ? 'adopter' : (role.toLowerCase().includes('caretaker') ? 'caretaker' : (role.toLowerCase().includes('admin') ? 'admin' : role.toLowerCase()));

      const newUser = {
        id: uid,
        uid: uid,
        name: fullName,
        username: username,
        email: email.toLowerCase(),
        phone: phone,
        empId: empId,
        role: role,
        location: location,
        lastLogin: 'Never logged in',
        createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Active',
        tfa: false,
        treesAssigned: 0,
        areas: [location].filter(Boolean),
        completionRate: '0%'
      };

      // 2. Persist to Cloud Firestore database
      const db = window.ATAMAN_FIRESTORE || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
      if (db) {
        try {
          const userDoc = {
            id: uid,
            uid: uid,
            name: fullName,
            displayName: fullName,
            email: email.toLowerCase(),
            phone: phone,
            empId: empId,
            role: normRole,
            location: location,
            address: location,
            status: 'Active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await db.collection('users').doc(uid).set(userDoc, { merge: true });
          await db.collection('users').doc(email.toLowerCase()).set(userDoc, { merge: true });

          // Role-specific Cloud Firestore collections
          if (normRole === 'adopter') {
            const adopterDoc = {
              id: uid,
              name: fullName,
              fullName: fullName,
              contactPerson: fullName,
              email: email.toLowerCase(),
              phone: phone,
              address: location || 'Samar',
              type: 'Individual',
              status: 'Active',
              treesCount: 0,
              treesAdopted: 0,
              funding: 0,
              fundingPaid: 0,
              customFunding: false,
              treesList: [],
              joinedDate: new Date().toISOString().slice(0, 10),
              startDate: new Date().toISOString().slice(0, 10),
              expDate: 'Ongoing'
            };
            await db.collection('adopters').doc(uid).set(adopterDoc, { merge: true });
            let adList = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
            adList = [adopterDoc, ...adList.filter(a => a.id !== uid && a.email !== email.toLowerCase())];
            localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adList));
            localStorage.setItem('saplink_adopters_cache', JSON.stringify(adList));
            window.dispatchEvent(new CustomEvent('ATAMAN:adopters-updated', { detail: adList }));
          } else if (normRole === 'caretaker') {
            const caretakerDoc = {
              id: uid,
              empId: empId,
              name: fullName,
              fullName: fullName,
              email: email.toLowerCase(),
              phone: phone,
              address: location || 'Catbalogan City, Samar',
              location: location || 'Catbalogan City & Jiabong, Samar',
              municipality: location.includes('Catbalogan') ? 'Catbalogan City' : (location || 'Catbalogan City'),
              barangay: location || 'Canlapwas',
              role: 'Field Caretaker',
              status: 'Active',
              treesAssigned: 0,
              assignedTreeCount: 0,
              inspectionsLogged: 0,
              assignedTrees: [],
              treesList: [],
              assignedAdopterName: '',
              performanceRating: '100%',
              survivalRate: '100%',
              joinedDate: new Date().toISOString().slice(0, 10),
              createdAt: new Date().toISOString()
            };
            await db.collection('caretakers').doc(uid).set(caretakerDoc, { merge: true });
            let ctList = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
            ctList = [caretakerDoc, ...ctList.filter(c => c.id !== uid && c.email !== email.toLowerCase())];
            localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(ctList));
            localStorage.setItem('saplink_caretakers_cache', JSON.stringify(ctList));
            window.dispatchEvent(new CustomEvent('ATAMAN:caretakers-updated', { detail: ctList }));
          }
        } catch (dbErr) {
          console.warn('Firestore user save warning:', dbErr);
        }
      }

      // 3. Save into local persistent caches
      usersData.unshift(newUser);
      try {
        localStorage.setItem('ATAMAN_users_cache', JSON.stringify(usersData));
        if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyUsers === 'function') {
          window.ATAMAN_SYNC.notifyUsers(usersData);
        }
        let regUsers = JSON.parse(localStorage.getItem('ATAMAN_registered_users') || '[]');
        regUsers = [{ uid, email: email.toLowerCase(), displayName: fullName, role: normRole, password }, ...regUsers.filter(u => u.email !== email.toLowerCase())];
        localStorage.setItem('ATAMAN_registered_users', JSON.stringify(regUsers));
      } catch (e) {}

      submitCreateUserBtn.disabled = false;
      submitCreateUserBtn.textContent = '⚡ Create User Account';
      closeAddUserModal();
      applyFilters();
      showToast(`🎉 User account created for ${fullName} (${role})! They can now log in with their email and password.`);
    });
  }

  /* ── 7. Export and Import Buttons ── */
  function exportUsersToCsv() {
    const csvRows = [
      'User ID,Full Name,Username,Email,Phone,Employee ID,Role,Location,Status,Last Login,2FA Enabled',
      ...usersData.map(u => `"${u.id}","${u.name}","${u.username}","${u.email}","${u.phone}","${u.empId}","${u.role}","${u.location}","${u.status}","${u.lastLogin}","${u.tfa}"`)
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ATAMAN_Users_Directory_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📊 Full user directory exported as CSV.');
  }

  document.getElementById('exportUsersBtn')?.addEventListener('click', exportUsersToCsv);
  document.getElementById('importUsersBtn')?.addEventListener('click', () => {
    showToast('📥 Opening User Account CSV/Excel Importer...');
  });

  /* ── 8. Mobile Sidebar Toggle & Submenu ── */
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

  document.querySelectorAll('.nav-item.has-children .nav-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const item = btn.closest('.nav-item');
      if (item) item.classList.toggle('open');
    });
  });

  /* ── Sidebar Submenu Filter Hooks ── */
  document.getElementById('sbFilterActive')?.addEventListener('click', (e) => {
    e.preventDefault();
    statusFilter.value = 'Active';
    applyFilters();
  });
  document.getElementById('sbFilterPending')?.addEventListener('click', (e) => {
    e.preventDefault();
    statusFilter.value = 'Pending';
    applyFilters();
  });
  document.getElementById('sbFilterInactive')?.addEventListener('click', (e) => {
    e.preventDefault();
    statusFilter.value = 'Inactive';
    applyFilters();
  });

  /* ── Summary Stats Cards ── */
  function updateSummaryCards() {
    const total      = usersData.length;
    const adopters   = usersData.filter(u => (u.role || '').toLowerCase().includes('adopter')).length;
    const caretakers = usersData.filter(u => (u.role || '').toLowerCase().includes('care')).length;
    const admins     = usersData.filter(u => (u.role || '').toLowerCase().includes('admin')).length;
    const active     = usersData.filter(u => (u.status || '').toLowerCase() === 'active').length;
    const pending    = usersData.filter(u => ['pending','inactive','suspended'].includes((u.status || '').toLowerCase())).length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('cntTotalUsers',     total);
    set('cntAdopterUsers',   adopters);
    set('cntCaretakerUsers', caretakers);
    set('cntAdminUsers',     admins);
    set('cntActiveUsers',    active);
    set('cntPendingUsers',   pending);

    // Active % shown under the Active card
    const pctEl = document.querySelector('#cntActiveUsers')?.closest('.summary-card')?.querySelector('.sc-sub');
    if (pctEl) pctEl.textContent = total > 0 ? Math.round((active / total) * 100) + '% operational' : '0% operational';
  }

  /* ── Live Sync: refresh table when a new user registers in another tab ── */
  window.addEventListener('storage', (e) => {
    if (
      e.key === 'ATAMAN_registered_users' ||
      e.key === 'saplink_registered_users' ||
      e.key === 'ATAMAN_users_cache' ||
      e.key === 'saplink_users_cache' ||
      e.key === 'ATAMAN_caretakers_cache' ||
      e.key === 'ATAMAN_adopters_cache'
    ) {
      usersData = loadAllUsers();
      applyFilters();
      updateSummaryCards();
    }
  });

  /* ── Also listen for in-page custom events from firebase-config.js ── */
  window.addEventListener('ataman:users-updated', (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      usersData = loadAllUsers();
      applyFilters();
      updateSummaryCards();
    }
  });
  window.addEventListener('ATAMAN:users-updated', (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      usersData = loadAllUsers();
      applyFilters();
      updateSummaryCards();
    }
  });

  /* ── Background Cloud Firestore Users Sync ── */
  async function syncFromFirestore() {
    if (typeof firebase === 'undefined' || !firebase.firestore) return;
    try {
      if (window.ATAMAN_FIRESTORE_CLEAN_PROMISE) {
        await window.ATAMAN_FIRESTORE_CLEAN_PROMISE;
      }
      const db = firebase.firestore();
      const snap = await db.collection('users').get();
      if (!snap.empty) {
        let changed = false;
        snap.forEach(doc => {
          const d = doc.data();
          if (!d) return;
          const em = cleanEmail(d.email);
          if (!em) return;
          const existing = usersData.find(u => cleanEmail(u.email) === em);
          if (!existing) {
            usersData.push(normaliseRecord({ ...d, uid: doc.id, email: em }));
            changed = true;
          } else if (d.role) {
            const roleNorm = normaliseRecord(d).role;
            if (existing.role !== roleNorm) {
              existing.role = roleNorm;
              changed = true;
            }
          }
        });
        if (changed) {
          try { localStorage.setItem('ATAMAN_users_cache', JSON.stringify(usersData)); } catch (e) {}
          applyFilters();
          updateSummaryCards();
        }
      }
    } catch (fsErr) {
      // Offline or restricted network - quiet fallback
    }
  }

  /* ── Initial Render ── */
  renderUsersTable();
  updateSummaryCards();
  syncFromFirestore();
});
