/**
 * ATAMAN — Activities & Updates Feed Engine
 * Catbalogan City Reforestation & Tree Adoption Initiative
 * "Tanom. Ataman. Padayon."
 */

(function (window) {
  'use strict';

  // Seed / Curated News & Updates for Catbalogan City Reforestation (Empty - waiting for live admin posts)
  const DEFAULT_NEWS_UPDATES = [];

  const STORAGE_KEY = 'ATAMAN_news_updates';

  // Helper to validate video URL
  function isValidHttpUrl(string) {
    if (!string || typeof string !== 'string') return false;
    try {
      const url = new URL(string.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  // Extract YouTube ID from standard, short, embed, or Facebook-redirected URLs
  function extractYouTubeId(url) {
    if (!url || typeof url !== 'string') return null;
    try {
      const decoded = decodeURIComponent(url);
      const m = decoded.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|(?:embed|v)\/))([a-zA-Z0-9_-]{11})/i);
      return m ? m[1] : null;
    } catch (_) {
      return null;
    }
  }

  // Resolves thumbnail to valid Data URL, web URL, YouTube cover, or asset path
  function resolveThumbnail(item) {
    let thumb = String(item?.thumbnail || '').trim();
    if (thumb.startsWith('data:image/') || thumb.startsWith('http://') || thumb.startsWith('https://') || thumb.startsWith('assets/')) {
      return thumb;
    }
    // If a bare filename like "1.jpg" was saved, attempt YouTube video cover recovery
    const ytId = extractYouTubeId(item?.videoUrl);
    if (ytId) {
      return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
    if (thumb && thumb !== '1.jpg') {
      return 'assets/' + thumb;
    }
    return 'assets/tree1.jpg';
  }

  // Image load error fallback handler
  function handleImgError(imgEl, videoUrl) {
    if (!imgEl) return;
    if (imgEl._hasRetried) {
      imgEl.src = 'assets/tree1.jpg';
      return;
    }
    imgEl._hasRetried = true;
    const ytId = extractYouTubeId(videoUrl);
    if (ytId && !imgEl.src.includes('img.youtube.com')) {
      imgEl.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    } else {
      imgEl.src = 'assets/tree1.jpg';
    }
  }

  // Retrieve news & updates from storage or default
  function getNewsUpdates() {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If contains legacy mock update from prototype, auto-clear
          const isLegacyMock = parsed.some(i => i.id === 'UPD-2026-001' && (i.title || '').includes('Catbalogan Watershed Aerial'));
          if (isLegacyMock) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            return [];
          }
          parsed.forEach(item => { delete item.zone; });
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading ATAMAN_news_updates:', e);
    }
    return [];
  }

  // Save updates to storage
  function saveNewsUpdates(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      // Dispatch storage event for other windows/tabs
      window.dispatchEvent(new CustomEvent('ataman_news_updated', { detail: { items } }));
    } catch (e) {
      console.error('Error saving ATAMAN_news_updates:', e);
    }
  }

  // Category badge HTML helper
  function getCategoryBadgeHtml(cat) {
    const c = String(cat || 'NEWS').toUpperCase().trim();
    if (c === 'SHARED VIDEO') {
      return '<span class="up-cat-badge up-cat-video">▶ SHARED VIDEO</span>';
    } else if (c === 'PLAN') {
      return '<span class="up-cat-badge up-cat-plan">🗺️ PLAN</span>';
    } else if (c === 'PLANTING DRIVE') {
      return '<span class="up-cat-badge up-cat-drive">🌱 PLANTING DRIVE</span>';
    } else {
      return '<span class="up-cat-badge up-cat-news">📰 NEWS</span>';
    }
  }

  // Render Public Feed (for index.html)
  function renderPublicFeed(activeCategory = 'ALL') {
    const grid = document.getElementById('updatesFeedGrid');
    if (!grid) return;

    const allItems = getNewsUpdates();
    const published = allItems.filter(item => (item.status || 'Published').toLowerCase() === 'published');

    const filtered = activeCategory === 'ALL'
      ? published
      : published.filter(item => String(item.category || '').toUpperCase().trim() === activeCategory.toUpperCase().trim());

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="up-empty-state" style="text-align: center; padding: 48px 24px; background: #ffffff; border-radius: 18px; border: 1.5px dashed #cbd5e1; width: 100%; max-width: 720px; margin: 0 auto; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
          <div style="font-size: 2.8rem; margin-bottom: 12px;">🌱</div>
          <h4 style="font-size: 1.25rem; color: #1e3a29; margin-bottom: 8px; font-weight: 700;">No Activities or Updates Yet</h4>
          <p style="color: #64748b; font-size: 0.94rem; line-height: 1.6; max-width: 540px; margin: 0 auto;">The feed is clean and waiting for new field updates, planting drives, or video dispatches to be posted.</p>
        </div>
      `;
      const prevBtn = document.getElementById('upNavPrev');
      const nextBtn = document.getElementById('upNavNext');
      const hint = document.querySelector('.updates-scroll-hint');
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (hint) hint.style.display = 'none';
      return;
    } else {
      const prevBtn = document.getElementById('upNavPrev');
      const nextBtn = document.getElementById('upNavNext');
      const hint = document.querySelector('.updates-scroll-hint');
      if (prevBtn) prevBtn.style.display = 'flex';
      if (nextBtn) nextBtn.style.display = 'flex';
      if (hint) hint.style.display = 'flex';
    }

    grid.innerHTML = filtered.map(item => {
      const hasVideo = !!(item.videoUrl && isValidHttpUrl(item.videoUrl));
      const categoryBadge = getCategoryBadgeHtml(item.category);
      const thumb = escapeHtml(resolveThumbnail(item));
      const title = escapeHtml(item.title);
      const excerpt = escapeHtml(item.excerpt || '');
      const date = escapeHtml(item.date || 'Recent');

      if (hasVideo) {
        // Video Update Card: DIRECT LINK TO NEW TAB (target="_blank", rel="noopener noreferrer")
        // No separate "Open Original Video" button
        return `
          <a href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noopener noreferrer" class="up-card up-card-video" title="Click to watch: ${title}">
            <div class="up-thumb-wrap">
              <img src="${thumb}" alt="${title}" class="up-thumb-img" onerror="window.AtamanFeed.handleImgError(this, '${escapeHtml(item.videoUrl)}')" />
              <div class="up-thumb-overlay"></div>
              <div class="up-badges-row">
                ${categoryBadge}
              </div>
              <div class="up-play-indicator" aria-hidden="true">
                <div class="up-play-circle">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                    <polygon points="6 3 20 12 6 21 6 3"></polygon>
                  </svg>
                </div>
                <span class="up-play-label">▶ Watch Video (Opens in new tab ↗)</span>
              </div>
            </div>
            <div class="up-card-body">
              <div class="up-meta-row">
                <span class="up-date">📅 ${date}</span>
                <span class="up-video-tag">📹 Video Dispatch</span>
              </div>
              <h3 class="up-card-title">${title}</h3>
              <p class="up-card-excerpt">${excerpt}</p>
              <div class="up-card-footer">
                <span class="up-read-cue up-cue-video">Watch on External Source <span class="up-arrow">↗</span></span>
                <span class="up-initiative-tag">Tanom. Ataman. Padayon.</span>
              </div>
            </div>
          </a>
        `;
      } else {
        // Regular Article / News / Plan / Drive: Click opens modal preview
        return `
          <div class="up-card up-card-article" onclick="window.AtamanFeed.openArticleModal('${item.id}')" role="button" tabindex="0" title="Click to read update">
            <div class="up-thumb-wrap">
              <img src="${thumb}" alt="${title}" class="up-thumb-img" onerror="window.AtamanFeed.handleImgError(this, '')" />
              <div class="up-thumb-overlay"></div>
              <div class="up-badges-row">
                ${categoryBadge}
              </div>
            </div>
            <div class="up-card-body">
              <div class="up-meta-row">
                <span class="up-date">📅 ${date}</span>
                <span class="up-author">By ${escapeHtml(item.author || 'ATAMAN')}</span>
              </div>
              <h3 class="up-card-title">${title}</h3>
              <p class="up-card-excerpt">${excerpt}</p>
              <div class="up-card-footer">
                <span class="up-read-cue">Read Full Story <span class="up-arrow">→</span></span>
                <span class="up-initiative-tag">Tanom. Ataman. Padayon.</span>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');

    initCarouselScroll();
  }

  // Open Article Detail Modal for items without video
  function openArticleModal(id) {
    const items = getNewsUpdates();
    const item = items.find(i => String(i.id) === String(id));
    if (!item) return;

    let modal = document.getElementById('modalPublicUpdateView');
    if (!modal) {
      createPublicArticleModal();
      modal = document.getElementById('modalPublicUpdateView');
    }

    document.getElementById('artModalCategory').innerHTML = getCategoryBadgeHtml(item.category);
    document.getElementById('artModalDate').textContent = `📅 ${item.date || 'Recent'}`;
    document.getElementById('artModalTitle').textContent = item.title;
    document.getElementById('artModalExcerpt').textContent = item.excerpt || '';
    document.getElementById('artModalBody').innerHTML = (item.description || item.body || item.excerpt || '')
      .split('\n\n')
      .map(p => `<p style="margin-bottom:14px;line-height:1.7;">${escapeHtml(p)}</p>`)
      .join('');

    const imgEl = document.getElementById('artModalImage');
    if (imgEl) {
      imgEl.src = item.thumbnail || 'assets/tree1.jpg';
      imgEl.alt = item.title;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeArticleModal() {
    const modal = document.getElementById('modalPublicUpdateView');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Inject Public Article Modal container if missing
  function createPublicArticleModal() {
    const existing = document.getElementById('modalPublicUpdateView');
    if (existing) return;

    const div = document.createElement('div');
    div.id = 'modalPublicUpdateView';
    div.className = 'up-modal-overlay';
    div.innerHTML = `
      <div class="up-modal-card">
        <button class="up-modal-close" onclick="window.AtamanFeed.closeArticleModal()" aria-label="Close modal">&times;</button>
        <div class="up-modal-media">
          <img id="artModalImage" src="assets/tree1.jpg" alt="Update Cover" onerror="this.src='assets/tree1.jpg'" />
          <div class="up-modal-media-overlay">
            <span id="artModalCategory"></span>
          </div>
        </div>
        <div class="up-modal-content">
          <div style="font-size:0.85rem;color:#64748b;margin-bottom:8px;" id="artModalDate"></div>
          <h2 id="artModalTitle" style="font-size:1.45rem;color:#0f291e;font-weight:800;line-height:1.3;margin-bottom:12px;"></h2>
          <div id="artModalExcerpt" style="font-size:1rem;color:#166534;font-weight:600;line-height:1.5;margin-bottom:18px;padding-left:12px;border-left:3px solid #166534;"></div>
          <div id="artModalBody" style="font-size:0.95rem;color:#334155;"></div>
        </div>
        <div class="up-modal-footer">
          <span style="font-size:0.82rem;color:#166534;font-weight:700;">ATAMAN • Tanom. Ataman. Padayon.</span>
          <button type="button" class="up-modal-btn-close" onclick="window.AtamanFeed.closeArticleModal()">Close Article</button>
        </div>
      </div>
    `;

    div.addEventListener('click', (e) => {
      if (e.target === div) closeArticleModal();
    });

    document.body.appendChild(div);
  }

  // HTML escape helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize Feed Filter Buttons
  function initFeedFilters() {
    const buttons = document.querySelectorAll('.up-filter-btn');
    if (!buttons || buttons.length === 0) return;

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter') || 'ALL';
        renderPublicFeed(filter);
      });
    });
  }

  // Setup storage listener for live synchronization across browser tabs
  function initSyncListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        const activeBtn = document.querySelector('.up-filter-btn.active');
        const currentFilter = activeBtn ? activeBtn.getAttribute('data-filter') : 'ALL';
        renderPublicFeed(currentFilter);
      }
    });

    window.addEventListener('ataman_news_updated', (e) => {
      const activeBtn = document.querySelector('.up-filter-btn.active');
      const currentFilter = activeBtn ? activeBtn.getAttribute('data-filter') : 'ALL';
      renderPublicFeed(currentFilter);
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeArticleModal();
    });
  }

  // Initialize Horizontal Carousel Scroll Controls & Auto-Scroll
  let autoScrollTimer = null;
  let isCarouselInitialized = false;
  let isHovered = false;

  function initCarouselScroll() {
    const grid = document.getElementById('updatesFeedGrid');
    const prevBtn = document.getElementById('upNavPrev');
    const nextBtn = document.getElementById('upNavNext');
    if (!grid) return;

    function getScrollStep() {
      const firstCard = grid.querySelector('.up-card');
      return firstCard ? (firstCard.offsetWidth + 26) : 376;
    }

    if (!isCarouselInitialized) {
      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const step = getScrollStep();
          if (grid.scrollLeft <= 15) {
            grid.scrollTo({ left: grid.scrollWidth, behavior: 'smooth' });
          } else {
            grid.scrollBy({ left: -step, behavior: 'smooth' });
          }
          resetAutoScroll();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const step = getScrollStep();
          if (grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 30) {
            grid.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            grid.scrollBy({ left: step, behavior: 'smooth' });
          }
          resetAutoScroll();
        });
      }

      // Mouse drag-to-scroll support
      let isDown = false;
      let startX = 0;
      let scrollLeftPos = 0;
      let hasDragged = false;

      grid.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDown = true;
        hasDragged = false;
        grid.classList.add('is-dragging');
        startX = e.pageX - grid.offsetLeft;
        scrollLeftPos = grid.scrollLeft;
      });

      window.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        grid.classList.remove('is-dragging');
      });

      grid.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        hasDragged = true;
        const x = e.pageX - grid.offsetLeft;
        const walk = (x - startX) * 1.5;
        grid.scrollLeft = scrollLeftPos - walk;
        resetAutoScroll();
      });

      grid.addEventListener('click', (e) => {
        if (hasDragged) {
          e.preventDefault();
          e.stopPropagation();
          hasDragged = false;
        }
      }, true);

      // Horizontal Mouse Wheel Scroll
      grid.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        if (e.deltaY !== 0) {
          e.preventDefault();
          grid.scrollBy({ left: e.deltaY * 1.5, behavior: 'auto' });
          resetAutoScroll();
        }
      }, { passive: false });

      grid.addEventListener('mouseenter', () => { isHovered = true; });
      grid.addEventListener('mouseleave', () => { isHovered = false; });
      grid.addEventListener('touchstart', () => { isHovered = true; }, { passive: true });
      grid.addEventListener('touchend', () => { isHovered = false; resetAutoScroll(); }, { passive: true });

      isCarouselInitialized = true;
    }

    function startAutoScroll() {
      if (autoScrollTimer) clearInterval(autoScrollTimer);
      autoScrollTimer = setInterval(() => {
        if (isHovered || !grid) return;
        if (grid.scrollWidth <= grid.clientWidth) return;

        const step = getScrollStep();
        if (grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 30) {
          grid.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          grid.scrollBy({ left: step, behavior: 'smooth' });
        }
      }, 4200);
    }

    function resetAutoScroll() {
      startAutoScroll();
    }

    startAutoScroll();
  }

  // Export Global API
  window.AtamanFeed = {
    STORAGE_KEY,
    DEFAULT_NEWS_UPDATES,
    getNewsUpdates,
    saveNewsUpdates,
    isValidHttpUrl,
    extractYouTubeId,
    resolveThumbnail,
    handleImgError,
    renderPublicFeed,
    openArticleModal,
    closeArticleModal,
    initCarouselScroll,
    init: function () {
      initFeedFilters();
      renderPublicFeed('ALL');
      initSyncListener();
      initCarouselScroll();
    }
  };

  // Auto-init if on page with updatesFeedGrid
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('updatesFeedGrid')) {
        window.AtamanFeed.init();
      }
    });
  }

})(typeof window !== 'undefined' ? window : this);
