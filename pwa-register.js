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

  // 3. LISTEN FOR NATIVE INSTALL PROMPT EVENT (Android & Desktop)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default browser mini-infobar
    e.preventDefault();
    deferredInstallPrompt = e;
    window.ATAMAN_PWA_PROMPT = e;

    // Show custom install prompt banner if not already running standalone
    if (!isRunningStandalone()) {
      showInstallBanner();
    }
  });

  // 4. LISTEN FOR SUCCESSFUL APP INSTALLATION
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hideInstallBanner();
    console.log('[ATAMAN PWA] Application installed to home screen successfully.');
    showPwaToast('🌱 ATAMAN installed successfully! You can now launch it from your home screen.');
  });

  // 5. INJECT PWA INSTALL BANNER
  function showInstallBanner() {
    if (document.getElementById('pwaInstallBanner')) return;

    // Check if user previously dismissed banner within 3 days
    const dismissedAt = localStorage.getItem('ATAMAN_pwa_banner_dismissed');
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 3 * 24 * 60 * 60 * 1000) return; // 3 days cool-off
    }

    const banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="pwa-banner-content">
        <img src="assets/icons/icon-192.png" alt="ATAMAN Logo" class="pwa-banner-icon" />
        <div class="pwa-banner-text">
          <div class="pwa-banner-title">Install ATAMAN App</div>
          <div class="pwa-banner-desc">Install on your phone or desktop for quick offline access and fullscreen mode.</div>
        </div>
      </div>
      <div class="pwa-banner-actions">
        <button type="button" class="pwa-btn-dismiss" id="pwaDismissBtn">Later</button>
        <button type="button" class="pwa-btn-install" id="pwaTriggerInstallBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Install
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    // Bind click events
    document.getElementById('pwaTriggerInstallBtn').addEventListener('click', triggerPwaInstall);
    document.getElementById('pwaDismissBtn').addEventListener('click', () => {
      hideInstallBanner();
      localStorage.setItem('ATAMAN_pwa_banner_dismissed', String(Date.now()));
    });
  }

  function hideInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
      banner.classList.add('hide');
      setTimeout(() => banner.remove(), 260);
    }
  }

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
      /* PWA Install Banner */
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
