/**
 * ATAMAN — Internet Connectivity Guard & Mobile Browser Escape Engine
 * 1. Blocks login and page access when users are offline.
 * 2. Detects in-app browsers (Messenger, Instagram, etc.) and redirects directly to native mobile browsers.
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. IN-APP BROWSER (MESSENGER, INSTAGRAM, ETC.) ESCAPE ENGINE
  // ==========================================================================
  function handleInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const isAndroid = /android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    
    // In-app browser detection patterns (Facebook, Messenger, Instagram, TikTok, Line, WeChat, etc.)
    const isInApp = /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line|MicroMessenger|Snapchat|Twitter|ByteLocale|TikTok|musical_ly|Pinterest|WhatsApp/i.test(ua) || (isAndroid && /;\s*wv\)/.test(ua));

    if (!isInApp) return;

    console.warn('[ATAMAN Engine] In-app browser detected (e.g. Messenger/Instagram). Initializing native browser escape...');

    const currentUrl = window.location.href;
    const cleanUrl = currentUrl.replace(/^https?:\/\//, '');

    // Android: Use Chrome Intent with browser fallback to break out of in-app webview
    if (isAndroid) {
      const chromeIntentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(currentUrl)};end`;
      
      // Attempt auto-opening in native Chrome if first visit in session
      if (!sessionStorage.getItem('ATAMAN_iab_escaped')) {
        sessionStorage.setItem('ATAMAN_iab_escaped', 'true');
        setTimeout(() => {
          window.location.href = chromeIntentUrl;
        }, 150);
      }
    }

    // Display persistent, prominent "Open in Browser" action bar at the top of the screen
    function showBrowserEscapeBanner() {
      if (document.getElementById('atamanIabBanner')) return;

      const banner = document.createElement('div');
      banner.id = 'atamanIabBanner';
      banner.className = 'ataman-iab-banner';
      banner.innerHTML = `
        <div class="iab-banner-inner">
          <div class="iab-banner-left">
            <span class="iab-badge">⚠️ In-App Browser</span>
            <div class="iab-title">Open in Mobile Browser</div>
            <div class="iab-desc">
              ${isIOS ? 'For full features & app install, tap <strong>⋯</strong> or <strong>Share</strong> and select <strong>Open in Safari</strong>.' : 'For full features & app install, open directly in Google Chrome.'}
            </div>
          </div>
          <div class="iab-banner-right">
            ${isAndroid ? `
              <a href="${chromeIntentUrl}" class="iab-btn-open">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="4"/>
                  <line x1="21.17" y1="8" x2="12" y2="8"/>
                  <line x1="3.95" y1="6.06" x2="8.54" y2="14"/>
                  <line x1="10.88" y1="21.94" x2="15.46" y2="14"/>
                </svg>
                Open in Chrome
              </a>
            ` : `
              <div class="iab-ios-hint">
                <span>Tap <strong>⋯</strong> above</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="iab-arrow-up">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </div>
            `}
          </div>
        </div>
      `;
      document.body.prepend(banner);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBrowserEscapeBanner);
    } else {
      showBrowserEscapeBanner();
    }
  }

  // ==========================================================================
  // 2. INTERNET CONNECTIVITY CHECKER & OFFLINE ACCESS BLOCKER
  // ==========================================================================
  const isLocalDev = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  let isCurrentlyOnline = isLocalDev ? true : navigator.onLine;
  let isChecking = false;

  // Active ping verification to ensure real internet connection (avoids captive portals / dead Wi-Fi)
  async function verifyInternetConnection() {
    // In local filesystem dev or localhost, consider online
    if (isLocalDev) {
      isCurrentlyOnline = true;
      return true;
    }

    if (!navigator.onLine) {
      isCurrentlyOnline = false;
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);
      
      const response = await fetch(`favicon.svg?_ping=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      isCurrentlyOnline = response.ok || response.status === 304 || response.type === 'opaque';
      return isCurrentlyOnline;
    } catch (err) {
      // Fetch failed -> truly offline or packet blocked
      isCurrentlyOnline = false;
      return false;
    }
  }

  // Injects styles for the blocking offline screen and in-app browser banner
  function injectStyles() {
    if (document.getElementById('atamanConnectivityStyles')) return;
    const style = document.createElement('style');
    style.id = 'atamanConnectivityStyles';
    style.textContent = `
      /* In-App Browser Banner */
      .ataman-iab-banner {
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000000;
        background: #092e18;
        background: linear-gradient(135deg, #092e18 0%, #14532d 100%);
        border-bottom: 2px solid #22c55e;
        color: #ffffff;
        padding: 12px 16px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.35);
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      }
      .iab-banner-inner {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
      }
      .iab-banner-left {
        flex: 1;
        min-width: 220px;
      }
      .iab-badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: #fef08a;
        background: rgba(234, 179, 8, 0.2);
        border: 1px solid rgba(234, 179, 8, 0.4);
        padding: 2px 8px;
        border-radius: 4px;
        margin-bottom: 4px;
      }
      .iab-title {
        font-size: 14px;
        font-weight: 800;
        color: #ffffff;
      }
      .iab-desc {
        font-size: 11.5px;
        color: #bbf7d0;
        margin-top: 2px;
        line-height: 1.35;
      }
      .iab-btn-open {
        background: #22c55e;
        color: #092e18;
        font-weight: 700;
        font-size: 12.5px;
        padding: 8px 16px;
        border-radius: 8px;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4);
        transition: transform 0.15s ease, background 0.15s ease;
      }
      .iab-btn-open:hover {
        background: #4ade80;
        transform: translateY(-1px);
      }
      .iab-ios-hint {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #86efac;
        font-weight: 700;
      }
      .iab-arrow-up {
        animation: iabBounce 1s infinite alternate ease-in-out;
      }
      @keyframes iabBounce {
        from { transform: translateY(0); }
        to { transform: translateY(-4px); }
      }

      /* FULL-SCREEN BLOCKING OFFLINE SCREEN */
      .ataman-offline-guard {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        height: 100dvh;
        z-index: 99999999;
        background: rgba(5, 23, 12, 0.94);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 20px;
        box-sizing: border-box;
        color: #ffffff;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .ataman-offline-guard.active {
        opacity: 1;
        pointer-events: auto;
      }
      .ataman-offline-card {
        background: #092e18;
        background: linear-gradient(145deg, #0d3b1f 0%, #062211 100%);
        border: 1.5px solid rgba(239, 68, 68, 0.45);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(239, 68, 68, 0.2);
        border-radius: 24px;
        padding: 38px 28px;
        max-width: 440px;
        width: 100%;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: guardCardIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes guardCardIn {
        from { transform: scale(0.92) translateY(15px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }
      .guard-icon-wrap {
        width: 72px;
        height: 72px;
        border-radius: 20px;
        background: rgba(239, 68, 68, 0.14);
        border: 1.5px solid rgba(239, 68, 68, 0.4);
        color: #ef4444;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
      }
      .guard-icon-wrap svg {
        width: 38px;
        height: 38px;
      }
      .guard-status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #fca5a5;
        background: rgba(239, 68, 68, 0.16);
        border: 1px solid rgba(239, 68, 68, 0.3);
        padding: 4px 12px;
        border-radius: 50px;
        margin-bottom: 16px;
      }
      .guard-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #ef4444;
        animation: guardPulse 1.4s infinite;
      }
      @keyframes guardPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.3; transform: scale(0.75); }
      }
      .guard-title {
        font-size: 22px;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.3px;
        margin-bottom: 10px;
        line-height: 1.25;
      }
      .guard-desc {
        font-size: 13.5px;
        color: #bbf7d0;
        line-height: 1.5;
        margin-bottom: 26px;
      }
      .guard-btn-retry {
        width: 100%;
        padding: 13px 20px;
        border-radius: 12px;
        background: #22c55e;
        color: #092e18;
        font-size: 14px;
        font-weight: 800;
        border: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);
        transition: all 0.18s ease;
      }
      .guard-btn-retry:hover {
        background: #4ade80;
        transform: translateY(-1px);
      }
      .guard-btn-retry.checking {
        opacity: 0.75;
        pointer-events: none;
      }
      .guard-spinner {
        display: none;
        width: 16px;
        height: 16px;
        border: 2px solid #092e18;
        border-top-color: transparent;
        border-radius: 50%;
        animation: guardSpin 0.7s linear infinite;
      }
      @keyframes guardSpin {
        to { transform: rotate(360deg); }
      }
      .guard-btn-retry.checking .guard-spinner {
        display: inline-block;
      }
      .guard-btn-retry.checking svg {
        display: none;
      }
      .guard-footer {
        margin-top: 20px;
        font-size: 11px;
        color: rgba(187, 247, 208, 0.5);
        font-weight: 600;
      }

      /* Global Connectivity Toast Alert */
      .ataman-conn-toast {
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(-30px);
        padding: 12px 20px;
        border-radius: 50px;
        font-size: 13px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 100000000;
        box-shadow: 0 10px 25px rgba(0,0,0,0.4);
        opacity: 0;
        pointer-events: none;
        transition: transform 0.25s ease, opacity 0.25s ease;
      }
      .ataman-conn-toast.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
        pointer-events: auto;
      }
      .ataman-conn-toast.offline {
        background: #450a0a;
        border: 1px solid #ef4444;
        color: #fca5a5;
      }
      .ataman-conn-toast.online {
        background: #052e16;
        border: 1px solid #22c55e;
        color: #86efac;
      }
    `;
    document.head.appendChild(style);
  }

  // Creates the blocking offline guard overlay
  function createOfflineGuard() {
    if (document.getElementById('atamanOfflineGuard')) return;

    const guard = document.createElement('div');
    guard.id = 'atamanOfflineGuard';
    guard.className = 'ataman-offline-guard';
    guard.innerHTML = `
      <div class="ataman-offline-card">
        <div class="guard-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
        </div>

        <div class="guard-status-pill">
          <span class="guard-dot"></span>
          <span>Access Paused — Offline</span>
        </div>

        <h2 class="guard-title">Internet Connection Required</h2>
        <p class="guard-desc">
          ATAMAN requires an active internet connection to authenticate users, access tree maps, and update registry data. Access is temporarily blocked while you are offline.
        </p>

        <button type="button" class="guard-btn-retry" id="guardRetryBtn">
          <span class="guard-spinner"></span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span id="guardRetryText">Check Connection & Reconnect</span>
        </button>

        <div class="guard-footer">
          ATAMAN • Tanom. Ataman. Padayon.
        </div>
      </div>
    `;

    document.body.appendChild(guard);

    document.getElementById('guardRetryBtn').addEventListener('click', async () => {
      const btn = document.getElementById('guardRetryBtn');
      const txt = document.getElementById('guardRetryText');
      btn.classList.add('checking');
      txt.textContent = 'Verifying connection...';

      const isConnected = await verifyInternetConnection();

      setTimeout(() => {
        btn.classList.remove('checking');
        if (isConnected) {
          hideOfflineGuard();
          showToast('🟢 Internet restored! Synchronizing ATAMAN...', 'online');
        } else {
          txt.textContent = 'Still Offline — Tap to Try Again';
          setTimeout(() => {
            txt.textContent = 'Check Connection & Reconnect';
          }, 2000);
        }
      }, 500);
    });
  }

  function showOfflineGuard() {
    createOfflineGuard();
    const guard = document.getElementById('atamanOfflineGuard');
    if (guard) {
      guard.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function hideOfflineGuard() {
    const guard = document.getElementById('atamanOfflineGuard');
    if (guard) {
      guard.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function showToast(message, type = 'offline') {
    let toast = document.getElementById('atamanConnToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'atamanConnToast';
      toast.className = 'ataman-conn-toast';
      document.body.appendChild(toast);
    }
    toast.className = `ataman-conn-toast ${type} show`;
    toast.innerHTML = message;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  // ==========================================================================
  // 3. LISTEN TO REALTIME CONNECTIVITY EVENTS
  // ==========================================================================
  async function handleConnectivityChange(online) {
    if (isLocalDev) {
      isCurrentlyOnline = true;
      hideOfflineGuard();
      return;
    }
    if (!online) {
      isCurrentlyOnline = false;
      showOfflineGuard();
      showToast('⚠️ Internet connection lost. Access blocked.', 'offline');
    } else {
      const confirmed = await verifyInternetConnection();
      if (confirmed) {
        hideOfflineGuard();
        showToast('🟢 Connection restored. Access re-enabled.', 'online');
      }
    }
  }

  window.addEventListener('offline', () => handleConnectivityChange(false));
  window.addEventListener('online', () => handleConnectivityChange(true));

  // Global event blockers during offline state (capture phase)
  window.addEventListener('click', (e) => {
    if (!isCurrentlyOnline) {
      if (e.target.closest('#atamanOfflineGuard') || e.target.closest('.ataman-offline-card')) {
        return; // Allow retry button inside modal
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      showOfflineGuard();
      showToast('🚫 Action Blocked: Internet connection required.', 'offline');
    }
  }, true);

  window.addEventListener('submit', (e) => {
    if (!isCurrentlyOnline) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      showOfflineGuard();
      showToast('🚫 Form Blocked: You must be online to submit data.', 'offline');
    }
  }, true);

  // Periodic heartbeat every 10 seconds to detect silent dropouts
  setInterval(async () => {
    if (document.hidden) return;
    const connected = await verifyInternetConnection();
    const guard = document.getElementById('atamanOfflineGuard');
    const isShowing = guard && guard.classList.contains('active');

    if (!connected && !isShowing) {
      showOfflineGuard();
    } else if (connected && isShowing) {
      hideOfflineGuard();
    }
  }, 10000);

  // Initial check on page load
  async function init() {
    injectStyles();
    handleInAppBrowser();

    // Check if initial load is offline
    const isConnected = await verifyInternetConnection();
    if (!isConnected) {
      showOfflineGuard();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public Global API for other scripts (app.js, dashboard.js, etc.)
  window.ATAMAN_NETWORK = {
    isOnline: () => isCurrentlyOnline,
    verifyOnline: verifyInternetConnection,
    showOfflineBlocker: showOfflineGuard,
    hideOfflineBlocker: hideOfflineGuard
  };

})();
