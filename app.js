/**
 * ATAMAN Authentication Logic (Sign In & Sign Up for all Roles)
 * Universal compatibility with direct file opening (file://) and web server (http://)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Auth API
  const authAPI = window.ATAMAN_AUTH;

  // Mode & State
  let currentMode = 'signin'; // 'signin' or 'signup'
  let currentRole = 'admin';  // 'admin', 'caretaker', 'adopter'

  // Role Metadata
  const roleData = {
    admin: {
      name: 'Administrator',
      desc: 'Full access',
      welcomeMsg: 'Welcome Administrator! Setting up your workspace...',
      toast: 'Role selected: Administrator (Full Access)'
    },
    caretaker: {
      name: 'Caretaker',
      desc: 'Field access',
      welcomeMsg: 'Welcome Caretaker! Preparing field tools...',
      toast: 'Role selected: Caretaker (Field Access)'
    },
    adopter: {
      name: 'Adopter',
      desc: 'View & track',
      welcomeMsg: 'Welcome Adopter! Opening your tree tracker...',
      toast: 'Role selected: Adopter (View & Track)'
    }
  };

  // DOM Elements
  const roleOptions = document.querySelectorAll('.role-option');
  const cardTitle = document.getElementById('cardTitle');
  const cardSubtitle = document.getElementById('cardSubtitle');
  const authForm = document.getElementById('authForm');
  
  // Fields & Groups
  const nameGroup = document.getElementById('nameGroup');
  const nameInput = document.getElementById('nameInput');
  const emailInput = document.getElementById('emailInput');
  const passGroup = document.getElementById('passGroup');
  const passwordInput = document.getElementById('passwordInput');
  const passwordToggle = document.getElementById('passwordToggle');
  const eyeOpen = document.querySelector('.eye-open');
  const eyeSlash = document.querySelector('.eye-slash');
  
  const confirmPassGroup = document.getElementById('confirmPassGroup');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  
  const signInActions = document.getElementById('signInActions');
  const rememberCheckbox = document.getElementById('rememberMe');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  
  const signUpTerms = document.getElementById('signUpTerms');
  const agreeTermsCheckbox = document.getElementById('agreeTerms');
  
  const submitBtn = document.getElementById('submitBtn');
  const btnSpinner = document.getElementById('btnSpinner');
  const btnText = document.getElementById('btnText');
  const btnIcon = submitBtn ? submitBtn.querySelector('.btn-icon') : null;
  
  const socialDividerText = document.getElementById('socialDividerText');
  const googleBtn = document.getElementById('googleLoginBtn');
  const googleBtnText = document.getElementById('googleBtnText');
  
  const footerPrompt = document.getElementById('footerPrompt');
  const toggleAuthModeBtn = document.getElementById('toggleAuthModeBtn');
  
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  // 1. Role Selection Switching
  roleOptions.forEach(option => {
    option.addEventListener('click', () => {
      roleOptions.forEach(opt => {
        opt.classList.remove('active');
        opt.setAttribute('aria-checked', 'false');
      });

      option.classList.add('active');
      option.setAttribute('aria-checked', 'true');
      currentRole = option.getAttribute('data-role');

      updateUIForModeAndRole();
      showToast(roleData[currentRole].toast, '🌱');
    });
  });

  // 2. Mode Switching (Sign In <-> Sign Up)
  if (toggleAuthModeBtn) {
    toggleAuthModeBtn.addEventListener('click', (e) => {
      // If the current page doesn't have signup input fields (e.g. splash/index), navigate to register page
      if (!nameGroup) {
        window.location.href = 'register-adopter.html';
        return;
      }
      e.preventDefault();
      currentMode = currentMode === 'signin' ? 'signup' : 'signin';
      updateUIForModeAndRole();
    });
  }

  function updateUIForModeAndRole() {
    const role = roleData[currentRole];

    if (currentMode === 'signup') {
      // Header
      if (cardTitle) cardTitle.innerHTML = `Create your <span class="brand-accent">ATAMAN</span> account`;
      if (cardSubtitle) cardSubtitle.textContent = `Register as ${role.name} (${role.desc}) to get started.`;

      // Inputs
      if (nameGroup) nameGroup.classList.remove('hide');
      if (confirmPassGroup) confirmPassGroup.classList.remove('hide');
      if (signInActions) signInActions.classList.add('hide');
      if (signUpTerms) signUpTerms.classList.remove('hide');

      // Buttons
      if (btnText) btnText.textContent = `Sign Up as ${role.name}`;
      if (googleBtnText) googleBtnText.textContent = `Sign up with Google`;
      if (socialDividerText) socialDividerText.textContent = `OR SIGN UP WITH`;

      // Footer
      if (footerPrompt) footerPrompt.innerHTML = `Already have an account? <a href="#" class="contact-link" id="toggleAuthModeBtn">Sign in</a>`;
    } else {
      // Header
      if (cardTitle) cardTitle.innerHTML = `Sign in to <span class="brand-accent">ATAMAN</span>`;
      if (cardSubtitle) cardSubtitle.textContent = `Choose your role to access your dashboard.`;

      // Inputs
      if (nameGroup) nameGroup.classList.add('hide');
      if (confirmPassGroup) confirmPassGroup.classList.add('hide');
      if (signInActions) signInActions.classList.remove('hide');
      if (signUpTerms) signUpTerms.classList.add('hide');

      // Buttons
      if (btnText) btnText.textContent = `Sign In as ${role.name}`;
      if (googleBtnText) googleBtnText.textContent = `Continue with Google`;
      if (socialDividerText) socialDividerText.textContent = `OR CONTINUE WITH`;

      // Footer
      if (footerPrompt) footerPrompt.innerHTML = `Don't have an account? <a href="#" class="contact-link" id="toggleAuthModeBtn">Sign up</a>`;
    }

    // Re-attach toggle click listener
    const newToggleBtn = document.getElementById('toggleAuthModeBtn');
    if (newToggleBtn) {
      newToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentMode = currentMode === 'signin' ? 'signup' : 'signin';
        updateUIForModeAndRole();
      });
    }
  }

  // 3. Password Visibility Toggle
  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';

      if (isPassword) {
        if (eyeSlash) eyeSlash.classList.add('hide');
        if (eyeOpen) eyeOpen.classList.remove('hide');
        passwordToggle.setAttribute('aria-label', 'Hide password');
      } else {
        if (eyeSlash) eyeSlash.classList.remove('hide');
        if (eyeOpen) eyeOpen.classList.add('hide');
        passwordToggle.setAttribute('aria-label', 'Show password');
      }
    });
  }

  // 4. Form Submission (Sign In or Sign Up)
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // 0. INTERNET CONNECTIVITY CHECK: Block login/registration if offline
      if (window.ATAMAN_NETWORK) {
        const isOnline = await window.ATAMAN_NETWORK.verifyOnline();
        if (!isOnline) {
          showToast('🚫 Connection Required: You cannot sign in or register while offline. Please connect to the internet.', '⚠️');
          window.ATAMAN_NETWORK.showOfflineBlocker();
          return;
        }
      } else if (!navigator.onLine) {
        showToast('🚫 Connection Required: You cannot sign in or register while offline. Please connect to the internet.', '⚠️');
        return;
      }

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      // Check if user clicked sign in with empty fields -> Offer quick login
      if (!email && !password && currentMode === 'signin') {
        setButtonLoading(true, `Signing in as ${roleData[currentRole].name}...`);
        const user = authAPI ? authAPI.loginAsRole(currentRole) : null;
        showToast(`Signed in as ${roleData[currentRole].name}! Redirecting...`, '🚀');
        setTimeout(() => {
          window.location.href = getDashboardUrl(currentRole);
        }, 700);
        return;
      }

      // Common Validation
      if (!email) {
        if (emailInput) emailInput.focus();
        showToast('Please enter your email address', '⚠️');
        return;
      }

      if (!password) {
        if (passwordInput) passwordInput.focus();
        showToast('Please enter your password', '⚠️');
        return;
      }

      if (currentMode === 'signup') {
        // If on a page without signup inputs (like index/splash), forward to full registration page
        if (!nameGroup) {
          window.location.href = 'register-adopter.html';
          return;
        }

        // Sign Up Validation
        const fullName = nameInput ? nameInput.value.trim() : '';
        const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

        if (!fullName) {
          if (nameInput) nameInput.focus();
          showToast('Please enter your full name', '⚠️');
          return;
        }

        if (password.length < 6) {
          if (passwordInput) passwordInput.focus();
          showToast('Password must be at least 6 characters long', '⚠️');
          return;
        }

        if (password !== confirmPassword) {
          if (confirmPasswordInput) confirmPasswordInput.focus();
          showToast('Passwords do not match. Please re-enter.', '⚠️');
          return;
        }

        if (agreeTermsCheckbox && !agreeTermsCheckbox.checked) {
          showToast('Please agree to ATAMAN Terms & Privacy Policy', '⚠️');
          return;
        }

        // Execute Sign Up
        setButtonLoading(true, 'Creating account...');

        try {
          let targetUrl = getDashboardUrl(currentRole);
          if (authAPI) {
            const result = await authAPI.signUp(email, password, fullName, currentRole);
            targetUrl = result.dashboardUrl || getDashboardUrl(result.role || currentRole);
          }
          showToast(`🎉 Account created successfully! Welcome, ${fullName}!`, '🌳');

          setTimeout(() => {
            window.location.href = targetUrl;
          }, 800);

        } catch (error) {
          console.error('Sign Up Error:', error);
          showToast(getFriendlyErrorMessage(error.code || error.message), '❌');
          setButtonLoading(false, `Sign Up as ${roleData[currentRole].name}`);
        }

      } else {
        // Execute Sign In
        setButtonLoading(true, 'Signing in...');

        try {
          let targetUrl = 'dashboard.html';
          let roleName = 'User';

          if (authAPI) {
            const result = await authAPI.signIn(email, password, currentRole);
            const userRole = result.role || (authAPI.getCurrentUser() && authAPI.getCurrentUser().role) || 'admin';
            targetUrl = result.dashboardUrl || getDashboardUrl(userRole);
            const normRole = (userRole || '').toLowerCase();
            roleName = (roleData[normRole] && roleData[normRole].name) || (normRole.charAt(0).toUpperCase() + normRole.slice(1));
          }

          showToast(`Welcome! Opening ${roleName} dashboard...`, '🌳');

          setTimeout(() => {
            window.location.href = targetUrl;
          }, 700);

        } catch (error) {
          console.error('Sign In Error:', error);
          showToast(getFriendlyErrorMessage(error.code || error.message), '❌');
          setButtonLoading(false, 'Sign In');
        }
      }
    });
  }

  // 5. Google SSO
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      // 0. INTERNET CONNECTIVITY CHECK: Block Google login if offline
      if (window.ATAMAN_NETWORK) {
        const isOnline = await window.ATAMAN_NETWORK.verifyOnline();
        if (!isOnline) {
          showToast('🚫 Connection Required: Google Authentication requires an active internet connection.', '⚠️');
          window.ATAMAN_NETWORK.showOfflineBlocker();
          return;
        }
      } else if (!navigator.onLine) {
        showToast('🚫 Connection Required: Google Authentication requires an active internet connection.', '⚠️');
        return;
      }

      try {
        showToast('Connecting with Google...', '🌐');
        let targetUrl = 'dashboard.html';
        let roleName = 'User';

        if (authAPI) {
          const result = await authAPI.signInWithGoogle(currentRole);
          const userRole = result.role || (authAPI.getCurrentUser() && authAPI.getCurrentUser().role) || currentRole;
          targetUrl = result.dashboardUrl || getDashboardUrl(userRole);
          const normRole = (userRole || '').toLowerCase();
          roleName = (roleData[normRole] && roleData[normRole].name) || userRole;
        }

        showToast(`Authenticated with Google! Opening ${roleName} dashboard...`, '✅');

        setTimeout(() => {
          window.location.href = targetUrl;
        }, 700);

      } catch (error) {
        console.error('Google Auth Error:', error);
        showToast('Unable to sign in with Google. Please check your internet connection.', '⚠️');
      }
    });
  }

  function getDashboardUrl(role) {
    const r = (role || '').toLowerCase();
    if (r.includes('care')) return 'caretaker-dashboard.html';
    if (r.includes('adopt')) return 'adopter-dashboard.html';
    return 'dashboard.html';
  }

  // 6. Forgot Password
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      // 0. INTERNET CONNECTIVITY CHECK: Block password reset if offline
      if (window.ATAMAN_NETWORK) {
        const isOnline = await window.ATAMAN_NETWORK.verifyOnline();
        if (!isOnline) {
          showToast('🚫 Connection Required: Cannot send password reset email while offline.', '⚠️');
          window.ATAMAN_NETWORK.showOfflineBlocker();
          return;
        }
      } else if (!navigator.onLine) {
        showToast('🚫 Connection Required: Cannot send password reset email while offline.', '⚠️');
        return;
      }

      const email = emailInput ? emailInput.value.trim() : '';

      if (!email) {
        if (emailInput) emailInput.focus();
        showToast('Enter your email address above first, then click Forgot Password', 'ℹ️');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        if (emailInput) emailInput.focus();
        showToast('Please enter a valid email address.', '⚠️');
        return;
      }

      showToast('Sending password reset email...', '⏳');

      try {
        if (authAPI) {
          await authAPI.sendPasswordReset(email);
        }
        showToast(`📬 Password reset link sent to ${email}! Please check your Inbox and Spam/Junk folder.`, '📬');
      } catch (error) {
        console.error('Password Reset Error:', error);
        showToast(getFriendlyErrorMessage(error.code || error.message), '❌');
      }
    });
  }

  // Helper: Button Loading State
  function setButtonLoading(loading, text) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    if (loading) {
      if (btnSpinner) btnSpinner.classList.remove('hide');
      if (btnIcon) btnIcon.classList.add('hide');
    } else {
      if (btnSpinner) btnSpinner.classList.add('hide');
      if (btnIcon) btnIcon.classList.remove('hide');
    }
    if (btnText) btnText.textContent = text;
  }

  // Helper: Friendly Error Messages
  function getFriendlyErrorMessage(code) {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters with numbers or symbols.';
      case 'auth/user-not-found':
        return 'No account found with this email. Please register first.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Contact administrator.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again in a few minutes.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by browser. Please allow popups.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/demo-account':
        return 'This is a demo/system account. Password reset is disabled. Default password: Password123!';
      default:
        return (typeof code === 'string' && code.length > 5) ? code : 'Authentication failed. Please verify your details.';
    }
  }

  // Toast Notification Helper
  let toastTimer = null;
  function showToast(message, icon = '🌱') {
    if (!toast || !toastMessage || !toastIcon) return;
    if (toastTimer) clearTimeout(toastTimer);

    toastMessage.textContent = message;
    toastIcon.textContent = icon;
    toast.classList.add('show');

    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }
});
