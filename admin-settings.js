/**
 * admin-settings.js — ATAMAN Admin Account & System Settings Engine
 */

document.addEventListener('DOMContentLoaded', () => {

  // 1. DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  const formAdminProfile = document.getElementById('formAdminProfile');
  const formChangePassword = document.getElementById('formChangePassword');
  const formDisplayPrefs = document.getElementById('formDisplayPrefs');
  
  const btnSaveAllSettings = document.getElementById('btnSaveAllSettings');
  const btnDiscardChanges = document.getElementById('btnDiscardChanges');
  const btnChangeAvatar = document.getElementById('btnChangeAvatar');
  const btnRevokeAllOthers = document.getElementById('btnRevokeAllOthers');

  const heroAdminName = document.getElementById('heroAdminName');
  const heroAdminEmail = document.getElementById('heroAdminEmail');
  const avatarDisplay = document.getElementById('avatarDisplay');

  const profFirstName = document.getElementById('profFirstName');
  const profLastName = document.getElementById('profLastName');
  const profEmail = document.getElementById('profEmail');
  const profPhone = document.getElementById('profPhone');
  const profRoleTitle = document.getElementById('profRoleTitle');

  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const toastStack = document.getElementById('toastStack');

  // 2. Toast Dispatcher
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type === 'warning' ? 'toast-warning' : ''}`;
    toast.innerHTML = `<span>${type === 'warning' ? '⚠️' : '✓'}</span> <span>${message}</span>`;
    toastStack.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // 3. Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add('active');
    });
  });

  // 4. Load Saved Profile from localStorage
  try {
    const savedProfile = localStorage.getItem('ATAMAN_admin_profile');
    if (savedProfile) {
      const data = JSON.parse(savedProfile);
      if (data.firstName && profFirstName) profFirstName.value = data.firstName;
      if (data.lastName && profLastName) profLastName.value = data.lastName;
      if (data.email && profEmail) profEmail.value = data.email;
      if (data.phone && profPhone) profPhone.value = data.phone;
      if (data.roleTitle && profRoleTitle) profRoleTitle.value = data.roleTitle;

      const fullName = `${data.firstName || 'Ethel'} ${data.lastName || 'Zeta'}`;
      if (heroAdminName) heroAdminName.textContent = fullName;
      if (heroAdminEmail) heroAdminEmail.textContent = data.email || 'ethel.zeta@ATAMAN.org';
      
      const initials = `${(data.firstName||'E')[0]}${(data.lastName||'Z')[0]}`.toUpperCase();
      if (avatarDisplay) avatarDisplay.textContent = initials;
    }
  } catch (e) {}

  // 5. Save Profile Form
  function saveProfile() {
    const firstName = profFirstName ? profFirstName.value.trim() : 'Ethel';
    const lastName = profLastName ? profLastName.value.trim() : 'Zeta';
    const email = profEmail ? profEmail.value.trim() : 'ethel.zeta@ATAMAN.org';
    const phone = profPhone ? profPhone.value.trim() : '+63 917 555 0192';
    const roleTitle = profRoleTitle ? profRoleTitle.value.trim() : 'Super Administrator';

    const profileData = { firstName, lastName, email, phone, roleTitle };
    localStorage.setItem('ATAMAN_admin_profile', JSON.stringify(profileData));

    const fullName = `${firstName} ${lastName}`;
    if (heroAdminName) heroAdminName.textContent = fullName;
    if (heroAdminEmail) heroAdminEmail.textContent = email;
    
    const initials = `${firstName[0] || 'E'}${lastName[0] || 'Z'}`.toUpperCase();
    if (avatarDisplay) avatarDisplay.textContent = initials;

    // Update sidebar user name
    const sbUserName = document.querySelector('.sb-user-name');
    if (sbUserName) sbUserName.textContent = `${fullName} (Admin)`;

    showToast('Admin profile information updated successfully.');
  }

  if (formAdminProfile) {
    formAdminProfile.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProfile();
    });
  }

  // 6. Change Password Form
  if (formChangePassword) {
    formChangePassword.addEventListener('submit', (e) => {
      e.preventDefault();
      const curr = document.getElementById('currPassword')?.value;
      const newP = document.getElementById('newPassword')?.value;
      const conf = document.getElementById('confirmPassword')?.value;

      if (newP !== conf) {
        showToast('New passwords do not match. Please re-enter.', 'warning');
        return;
      }
      if (newP.length < 8) {
        showToast('Password should be at least 8 characters long.', 'warning');
        return;
      }

      formChangePassword.reset();
      showToast('Admin account password changed successfully.');
    });
  }

  // 7. UI Display Preferences Form
  if (formDisplayPrefs) {
    formDisplayPrefs.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Dashboard display and regional preferences applied.');
    });
  }

  // 8. Global Save & Discard Buttons
  if (btnSaveAllSettings) {
    btnSaveAllSettings.addEventListener('click', () => {
      saveProfile();
      showToast('All administrator account and system settings saved.');
    });
  }

  if (btnDiscardChanges) {
    btnDiscardChanges.addEventListener('click', () => {
      location.reload();
    });
  }

  if (btnChangeAvatar) {
    btnChangeAvatar.addEventListener('click', () => {
      const newInitials = prompt('Enter 2-letter initials for your Admin avatar:', avatarDisplay.textContent);
      if (newInitials && newInitials.trim().length > 0) {
        const clean = newInitials.trim().slice(0, 2).toUpperCase();
        avatarDisplay.textContent = clean;
        const sbAvatar = document.querySelector('.sb-user-avatar');
        if (sbAvatar) sbAvatar.textContent = clean;
        showToast(`Avatar updated to "${clean}".`);
      }
    });
  }

  // 9. Session Management
  window.adminSettings = {
    revokeSession: (deviceName) => {
      showToast(`Session for "${deviceName}" has been revoked.`, 'warning');
    }
  };

  if (btnRevokeAllOthers) {
    btnRevokeAllOthers.addEventListener('click', () => {
      if (confirm('Are you sure you want to sign out all other devices?')) {
        document.querySelectorAll('.session-item:not(.current-session)').forEach(el => {
          el.style.opacity = '0.4';
          el.style.pointerEvents = 'none';
        });
        showToast('All other active admin sessions have been terminated.');
      }
    });
  }

  // 10. Sidebar Mobile Toggle
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

});
