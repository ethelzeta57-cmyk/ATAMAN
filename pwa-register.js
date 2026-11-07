/**
 * ATAMAN — PWA Registration & Install Experience
 * Registers the Service Worker, manages updates, and provides native install prompts.
 */

(function () {
  'use strict';

  let deferredInstallPrompt = null;

  // 1. PROTOCOL CHECK: Service Workers are strictly supported on web origins (http://localhost or https://)
  const isWebOrigin = window.location.protocol === 'http:' || window.location.protocol === 'https:';

  if (!isWebOrigin) {
    // When opened directly via filesystem (file:///...), service workers are disallowed by browser security specifications.
    // Gracefully provide fallback API and exit without error.
    window.ATAMAN_PWA = {
      triggerInstall: () => {
        console.info('[ATAMAN PWA] PWA installation is active when running on a web server (https:// or localhost).');
      },
      isStandalone: () => false
    };
    return;
  }

  // 2. REGISTER SERVICE WORKER & MANAGE UPDATES
  if ('serviceWorker' in navigator) {
    let isRefreshing = false;

    // When the new service worker activates and claims clients, refresh to load all latest project features
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isRefreshing) return;
      isRefreshing = true;
      console.log('[ATAMAN PWA] Service Worker controller changed -> Auto-updating app to latest version!');
      window.location.reload();
    });

    window.addEventListener('load', () => {
      // Determine service worker path relative to current document
      const swPath = './sw.js';

      navigator.serviceWorker
        .register(swPath)
        .then((registration) => {
          console.log('[ATAMAN PWA] Service Worker active with scope:', registration.scope);

          // If a new worker is already installed and waiting, notify user immediately
          if (registration.waiting) {
            showUpdateNotification(registration);
          }

          // Detect new version updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showUpdateNotification(registration);
                }
              });
            }
          });

          // Proactively check server for new sw.js on every app launch
          registration.update().catch(() => {});

          // Check for updates when user switches back to the app from background
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              registration.update().catch(() => {});
            }
          });

          window.addEventListener('focus', () => {
            registration.update().catch(() => {});
          });

          // Periodic check every 15 minutes
          setInterval(() => {
            registration.update().catch(() => {});
          }, 15 * 60 * 1000);
        })
        .catch((error) => {
          console.warn('[ATAMAN PWA] Service Worker registration error:', error);
        });
    });
  }

  // 2. DETECT STANDALONE / INSTALLED MODE
  function isRunningStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  // Check if current view is a splash screen
  function isSplashActive() {
    try {
      const path = (window.location.pathname || '').toLowerCase();
      if (path.endsWith('splash.html') || path.includes('/splash')) {
        return true;
      }
      const splashEl = document.getElementById('splashView');
      if (splashEl) {
        const style = window.getComputedStyle(splashEl);
        if (style.display !== 'none' && !splashEl.classList.contains('exiting')) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  // 3. LISTEN FOR NATIVE INSTALL PROMPT EVENT (Android & Desktop)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default browser mini-infobar
    e.preventDefault();
    deferredInstallPrompt = e;
    window.ATAMAN_PWA_PROMPT = e;

    // Show popup modal only if not standalone and NEVER on the splash screen
    if (!isRunningStandalone()) {
      scheduleInstallPopup();
    }
  });

  // Watch for splash screen exit in single-page apps like index.html
  function scheduleInstallPopup(delayMs = 3000) {
    if (isRunningStandalone()) return;

    // If currently on splash, wait until splash is dismissed
    if (isSplashActive()) {
      const checkInterval = setInterval(() => {
        if (!isSplashActive()) {
          clearInterval(checkInterval);
          setTimeout(() => {
            if (!isRunningStandalone() && !isSplashActive()) {
              showInstallPopup();
            }
          }, delayMs);
        }
      }, 600);
      return;
    }

    setTimeout(() => {
      if (!isRunningStandalone() && !isSplashActive()) {
        showInstallPopup();
      }
    }, delayMs);
  }

  // 4. LISTEN FOR SUCCESSFUL APP INSTALLATION
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hideInstallPopup();
    console.log('[ATAMAN PWA] Application installed to home screen successfully.');
    showPwaToast('🌱 ATAMAN installed successfully! You can now launch it from your home screen.');
  });

  // 5. INJECT PWA INSTALL POPUP MODAL (Clean, centered dialog with backdrop — NEVER on splash)
  function showInstallPopup() {
    // Absolute rule: Never display on splash view
    if (isSplashActive()) return;
    if (isRunningStandalone()) return;
    if (document.getElementById('pwaInstallModalOverlay')) return;

    // Check if user previously dismissed popup within 7 days
    const dismissedAt = localStorage.getItem('ATAMAN_pwa_popup_dismissed') || localStorage.getItem('ATAMAN_pwa_banner_dismissed');
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 7 * 24 * 60 * 60 * 1000) return; // 7 days cool-off
    }

    const overlay = document.createElement('div');
    overlay.id = 'pwaInstallModalOverlay';
    overlay.className = 'pwa-install-overlay';
    overlay.innerHTML = `
      <div class="pwa-install-card" role="dialog" aria-modal="true" aria-labelledby="pwaModalTitle">
        <button type="button" class="pwa-modal-close" id="pwaModalCloseBtn" aria-label="Close dialog">✕</button>
        <div class="pwa-modal-header">
          <img src="assets/icons/icon-192.png" alt="ATAMAN Logo" class="pwa-modal-app-icon" onerror="this.src='assets/tree1.jpg'" />
          <div class="pwa-modal-title-group">
            <h3 class="pwa-modal-title" id="pwaModalTitle">Install ATAMAN App</h3>
            <p class="pwa-modal-subtitle">Catbalogan City Tree Management &amp; Monitoring</p>
          </div>
        </div>
        <div class="pwa-modal-features">
          <div class="pwa-modal-feat-item">
            <span class="pwa-feat-icon">⚡</span>
            <div>
              <strong>Instant Offline Access</strong>
              <span>Load fast even with weak cellular coverage in the field.</span>
            </div>
          </div>
          <div class="pwa-modal-feat-item">
            <span class="pwa-feat-icon">📲</span>
            <div>
              <strong>Native Fullscreen Experience</strong>
              <span>Use ATAMAN without browser address bars or navigation clutter.</span>
            </div>
          </div>
          <div class="pwa-modal-feat-item">
            <span class="pwa-feat-icon">🌳</span>
            <div>
              <strong>Real-Time Monitoring &amp; GPS</strong>
              <span>One-tap access from your desktop or phone home screen.</span>
            </div>
          </div>
        </div>
        <div class="pwa-modal-actions">
          <button type="button" class="pwa-modal-btn-later" id="pwaModalLaterBtn">Maybe Later</button>
          <button type="button" class="pwa-modal-btn-install" id="pwaModalInstallBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Install App
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Fade-in animation
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        dismissInstallPopup();
      }
    });

    // Bind action buttons
    document.getElementById('pwaModalInstallBtn')?.addEventListener('click', triggerPwaInstall);
    document.getElementById('pwaModalLaterBtn')?.addEventListener('click', dismissInstallPopup);
    document.getElementById('pwaModalCloseBtn')?.addEventListener('click', dismissInstallPopup);
  }

  function dismissInstallPopup() {
    hideInstallPopup();
    localStorage.setItem('ATAMAN_pwa_popup_dismissed', String(Date.now()));
  }

  function hideInstallPopup() {
    const overlay = document.getElementById('pwaInstallModalOverlay');
    if (overlay) {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 260);
    }
  }

  // Alias for backward compatibility
  const showInstallBanner = showInstallPopup;
  const hideInstallBanner = hideInstallPopup;

  // 6. TRIGGER INSTALL PROMPT ACTION
  async function triggerPwaInstall() {
    if (!deferredInstallPrompt) {
      // Check if iOS Safari
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        showPwaToast('📲 On iOS Safari: Tap the Share button (bottom) and select "Add to Home Screen".');
        return;
      }
      showPwaToast('Tap your browser menu (⋮) and select "Install app" or "Add to Home Screen".');
      return;
    }

    try {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      console.log('[ATAMAN PWA] User install choice:', outcome);
      if (outcome === 'accepted') {
        hideInstallBanner();
      }
      deferredInstallPrompt = null;
    } catch (err) {
      console.warn('[ATAMAN PWA] Install prompt failed:', err);
    }
  }

  // 7. SHOW UPDATE NOTIFICATION
  function showUpdateNotification(registration) {
    if (document.getElementById('pwaUpdateToast')) return;

    const toast = document.createElement('div');
    toast.id = 'pwaUpdateToast';
    toast.className = 'pwa-update-toast';
    toast.innerHTML = `
      <div class="pwa-update-info">
        <span class="pwa-update-icon">🔄</span>
        <div>
          <div class="pwa-update-title">Update Available</div>
          <div class="pwa-update-desc">A fresh version of ATAMAN with the latest features is ready.</div>
        </div>
      </div>
      <div class="pwa-update-btns">
        <button type="button" class="pwa-update-dismiss" id="pwaUpdateDismissBtn">Later</button>
        <button type="button" class="pwa-update-reload" id="pwaReloadBtn">Update Now</button>
      </div>
    `;

    document.body.appendChild(toast);

    document.getElementById('pwaUpdateDismissBtn').addEventListener('click', () => {
      toast.remove();
    });

    document.getElementById('pwaReloadBtn').addEventListener('click', () => {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      setTimeout(() => {
        window.location.reload();
      }, 250);
    });
  }

  // 8. TOAST NOTIFICATION UTILITY
  function showPwaToast(message) {
    let toast = document.getElementById('pwaToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pwaToast';
      toast.className = 'pwa-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

  // 9. INJECT STYLES FOR BANNER & TOAST
  function injectPwaStyles() {
    if (document.getElementById('pwaStyles')) return;
    const style = document.createElement('style');
    style.id = 'pwaStyles';
    style.textContent = `
      /* PWA Install Modal Dialog (Centered, non-intrusive popup) */
      .pwa-install-overlay {
        position: fixed;
        inset: 0;
        background: rgba(10, 20, 15, 0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
        box-sizing: border-box;
      }
      .pwa-install-overlay.visible {
        opacity: 1;
        pointer-events: auto;
      }
      .pwa-install-card {
        width: 100%;
        max-width: 440px;
        background: linear-gradient(145deg, #092e18 0%, #064e3b 100%);
        border: 1px solid rgba(74, 222, 128, 0.35);
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08);
        padding: 24px;
        position: relative;
        color: #ffffff;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        transform: scale(0.92) translateY(12px);
        transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        box-sizing: border-box;
      }
      .pwa-install-overlay.visible .pwa-install-card {
        transform: scale(1) translateY(0);
      }
      .pwa-modal-close {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #bbf7d0;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .pwa-modal-close:hover {
        background: rgba(239, 68, 68, 0.25);
        color: #fca5a5;
      }
      .pwa-modal-header {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 18px;
        padding-right: 28px;
      }
      .pwa-modal-app-icon {
        width: 54px;
        height: 54px;
        border-radius: 14px;
        object-fit: cover;
        box-shadow: 0 6px 16px rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.15);
        flex-shrink: 0;
      }
      .pwa-modal-title-group {
        min-width: 0;
      }
      .pwa-modal-title {
        font-size: 18px;
        font-weight: 800;
        color: #ffffff;
        margin: 0;
        line-height: 1.25;
      }
      .pwa-modal-subtitle {
        font-size: 12px;
        color: #86efac;
        margin: 4px 0 0;
        font-weight: 500;
      }
      .pwa-modal-features {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 22px;
        background: rgba(0, 0, 0, 0.22);
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .pwa-modal-feat-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      .pwa-feat-icon {
        font-size: 18px;
        flex-shrink: 0;
        line-height: 1.2;
      }
      .pwa-modal-feat-item strong {
        font-size: 13px;
        font-weight: 700;
        color: #f0fdf4;
        display: block;
      }
      .pwa-modal-feat-item span {
        font-size: 11.5px;
        color: #bbf7d0;
        display: block;
        line-height: 1.35;
        margin-top: 2px;
      }
      .pwa-modal-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
      }
      .pwa-modal-btn-later {
        background: transparent;
        color: #86efac;
        border: 1px solid rgba(134, 239, 172, 0.35);
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pwa-modal-btn-later:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      }
      .pwa-modal-btn-install {
        background: #22c55e;
        color: #092e18;
        border: none;
        padding: 10px 22px;
        font-size: 13.5px;
        font-weight: 800;
        border-radius: 10px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 14px rgba(34, 197, 94, 0.45);
        transition: all 0.15s ease;
      }
      .pwa-modal-btn-install:hover {
        background: #4ade80;
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(34, 197, 94, 0.55);
      }
      .pwa-modal-btn-install svg {
        width: 16px;
        height: 16px;
      }

      /* PWA Legacy Banner (Retained as fallback) */
      .pwa-install-banner {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 32px);
        max-width: 520px;
        background: #092e18;
        background: linear-gradient(135deg, #092e18 0%, #14532d 100%);
        border: 1px solid rgba(74, 222, 128, 0.35);
        box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        z-index: 99999;
        color: #ffffff;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        animation: pwaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        transition: transform 0.25s ease, opacity 0.25s ease;
      }
      @keyframes pwaSlideUp {
        from { transform: translate(-50%, 40px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      .pwa-install-banner.hide {
        transform: translate(-50%, 40px);
        opacity: 0;
      }
      .pwa-banner-content {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        flex: 1;
      }
      .pwa-banner-icon {
        width: 44px;
        height: 44px;
        border-radius: 11px;
        object-fit: cover;
        flex-shrink: 0;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      }
      .pwa-banner-text {
        min-width: 0;
      }
      .pwa-banner-title {
        font-size: 14px;
        font-weight: 800;
        color: #ffffff;
        line-height: 1.25;
      }
      .pwa-banner-desc {
        font-size: 11.5px;
        color: #bbf7d0;
        line-height: 1.35;
        margin-top: 2px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .pwa-banner-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .pwa-btn-dismiss {
        background: transparent;
        color: #86efac;
        border: none;
        font-size: 12.5px;
        font-weight: 600;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 8px;
        transition: background 0.15s ease;
      }
      .pwa-btn-dismiss:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .pwa-btn-install {
        background: #22c55e;
        color: #092e18;
        border: none;
        font-size: 13px;
        font-weight: 700;
        padding: 8px 16px;
        border-radius: 10px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.35);
        transition: transform 0.15s ease, background 0.15s ease;
      }
      .pwa-btn-install:hover {
        background: #4ade80;
        transform: translateY(-1px);
      }
      .pwa-btn-install svg {
        width: 15px;
        height: 15px;
      }
      /* PWA Update Toast */
      .pwa-update-toast {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 32px);
        max-width: 460px;
        background: #092e18;
        background: linear-gradient(135deg, #092e18 0%, #14532d 100%);
        border: 1px solid #4ade80;
        border-radius: 16px;
        padding: 12px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        box-shadow: 0 16px 36px rgba(0,0,0,0.55);
        z-index: 999999;
        font-family: inherit;
        animation: pwaSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes pwaSlideDown {
        from { transform: translate(-50%, -35px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      .pwa-update-info {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .pwa-update-icon {
        font-size: 22px;
        animation: pwaSpin 3s linear infinite;
        display: inline-block;
      }
      @keyframes pwaSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .pwa-update-title {
        font-size: 13.5px;
        font-weight: 800;
        color: #ffffff;
      }
      .pwa-update-desc {
        font-size: 11.5px;
        color: #bbf7d0;
        margin-top: 2px;
      }
      .pwa-update-btns {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .pwa-update-dismiss {
        background: transparent;
        color: #86efac;
        border: none;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        border-radius: 6px;
        transition: background 0.15s ease;
      }
      .pwa-update-dismiss:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .pwa-update-reload {
        background: #22c55e;
        color: #092e18;
        border: none;
        padding: 7px 15px;
        border-radius: 9px;
        font-weight: 800;
        font-size: 12px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(34,197,94,0.4);
        transition: transform 0.15s ease, background 0.15s ease;
      }
      .pwa-update-reload:hover {
        background: #4ade80;
        transform: translateY(-1px);
      }
      /* PWA Toast Message */
      .pwa-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(9, 46, 24, 0.95);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(74, 222, 128, 0.4);
        color: #ffffff;
        padding: 12px 22px;
        border-radius: 50px;
        font-size: 13.5px;
        font-weight: 600;
        box-shadow: 0 12px 24px rgba(0,0,0,0.3);
        z-index: 999999;
        opacity: 0;
        pointer-events: none;
        transition: transform 0.25s ease, opacity 0.25s ease;
        text-align: center;
        max-width: 90vw;
      }
      .pwa-toast.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
        pointer-events: auto;
      }
      @media (max-width: 480px) {
        .pwa-install-banner {
          flex-direction: column;
          align-items: stretch;
          padding: 14px;
          gap: 12px;
          bottom: 12px;
        }
        .pwa-banner-actions {
          justify-content: flex-end;
        }
        .pwa-update-toast {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }
        .pwa-update-btns {
          justify-content: flex-end;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Expose global PWA helper
  window.ATAMAN_PWA = {
    triggerInstall: triggerPwaInstall,
    showInstallPopup: showInstallPopup,
    hideInstallPopup: hideInstallPopup,
    showInstallBanner: showInstallPopup,
    hideInstallBanner: hideInstallPopup,
    isSplashActive: isSplashActive,
    isStandalone: isRunningStandalone,
    checkForUpdates: async () => {
      if (!('serviceWorker' in navigator)) {
        showPwaToast('Offline service worker not supported in this browser.');
        return false;
      }
      showPwaToast('🔍 Checking for project updates...');
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) {
            showUpdateNotification(reg);
            return true;
          }
          setTimeout(() => {
            showPwaToast('✅ ATAMAN is up to date (v1.2.0).');
          }, 800);
          return false;
        } else {
          showPwaToast('✅ App is up to date.');
          return false;
        }
      } catch (err) {
        showPwaToast('Unable to check for updates. Check internet connection.');
        return false;
      }
    },
    version: '1.2.0'
  };

  // Initialize styles on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPwaStyles);
  } else {
    injectPwaStyles();
  }
})();
