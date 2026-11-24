/* ==========================================================================
   admin-content.js — ATAMAN Admin News & Updates Management Logic
   Catbalogan City Reforestation & Tree Adoption Initiative
   "Tanom. Ataman. Padayon."
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Admin Authentication & Role Guard ── */
  function isCurrentAdmin() {
    const role = (localStorage.getItem('ATAMAN_user_role') || '').toLowerCase().trim();
    const email = (localStorage.getItem('ATAMAN_user_email') || '').toLowerCase().trim();
    const loggedIn = localStorage.getItem('ATAMAN_logged_in') === 'true';
    return loggedIn && (role === 'admin' || email.includes('admin@ataman.catbalogan.gov.ph') || email.includes('admin'));
  }

  /* ── 2. Master Dataset ── */
  let updatesList = [];
  function loadUpdatesFromStorage() {
    if (window.AtamanFeed && typeof window.AtamanFeed.getNewsUpdates === 'function') {
      updatesList = window.AtamanFeed.getNewsUpdates();
    } else {
      try {
        const raw = localStorage.getItem('ATAMAN_news_updates');
        updatesList = raw ? JSON.parse(raw) : [];
      } catch (_) {
        updatesList = [];
      }
    }
  }
  loadUpdatesFromStorage();

  /* ── 3. DOM References ── */
  const contentTableBody     = document.getElementById('contentTableBody');
  const contentSearchInput   = document.getElementById('contentSearchInput');
  const contentTypeFilter    = document.getElementById('contentTypeFilter');
  const contentStatusFilter  = document.getElementById('contentStatusFilter');
  const contentAuthorFilter  = document.getElementById('contentAuthorFilter');
  const resetFiltersBtn      = document.getElementById('resetContentFiltersBtn');
  const tabButtons           = document.querySelectorAll('.tab-btn');
  const tabPanes             = document.querySelectorAll('.tab-pane');
  const toastMsg             = document.getElementById('toastMsg');
  const sidebarToggle        = document.getElementById('sidebarToggle');
  const sidebar              = document.getElementById('sidebar');

  // Summary Counters
  const cntTotal             = document.getElementById('cntTotal');
  const cntPublished         = document.getElementById('cntPublished');
  const cntDrafts            = document.getElementById('cntDrafts');
  const cntNews              = document.getElementById('cntNews');
  const cntPlans             = document.getElementById('cntPlans');
  const cntVideos            = document.getElementById('cntVideos');

  // Tab Badge Counters
  const badgeAllCount        = document.getElementById('badgeAllCount');
  const badgeNewsCount       = document.getElementById('badgeNewsCount');
  const badgePlansCount      = document.getElementById('badgePlansCount');
  const badgeDrivesCount     = document.getElementById('badgeDrivesCount');
  const badgeVideosCount     = document.getElementById('badgeVideosCount');
  const badgeAnnounceCount   = document.getElementById('badgeAnnounceCount');

  // Modals
  const contentEditorModal   = document.getElementById('contentEditorModal');
  const openAddContentModalBtn = document.getElementById('openAddContentModalBtn');
  const closeEditorModalBtn  = document.getElementById('closeEditorModalBtn');
  const btnSaveDraft         = document.getElementById('btnSaveDraft');
  const btnPublishContent    = document.getElementById('btnPublishContent');
  const btnPreviewInModal    = document.getElementById('btnPreviewInModal');

  const previewModal         = document.getElementById('previewModal');
  const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');
  const btnBackToEdit        = document.getElementById('btnBackToEdit');
  const btnPublishFromPreview= document.getElementById('btnPublishFromPreview');

  // Editor Inputs
  const edId              = document.getElementById('edId');
  const edCategory        = document.getElementById('edCategory');
  const edTitle           = document.getElementById('edTitle');
  const edVideoUrl        = document.getElementById('edVideoUrl');
  const edThumbnail       = document.getElementById('edThumbnail');
  const edThumbFileInput  = document.getElementById('edThumbFileInput');
  const btnChooseImageFile= document.getElementById('btnChooseImageFile');
  const btnGrabVideoThumb = document.getElementById('btnGrabVideoThumb');
  const btnResetThumb     = document.getElementById('btnResetThumb');
  const edLiveThumbImg    = document.getElementById('edLiveThumbImg');
  const edLiveThumbLabel  = document.getElementById('edLiveThumbLabel');
  const edLiveThumbSub    = document.getElementById('edLiveThumbSub');
  const edDate            = document.getElementById('edDate');
  const edExcerpt         = document.getElementById('edExcerpt');
  const edBody            = document.getElementById('edBody');
  const edStatus          = document.getElementById('edStatus');
  const edAuthor          = document.getElementById('edAuthor');
  const videoUrlError     = document.getElementById('videoUrlError');
  const editorModalTitle  = document.getElementById('editorModalTitle');

  // Preview elements
  const prevBadge   = document.getElementById('prevBadge');
  const prevTitle   = document.getElementById('prevTitle');
  const prevExcerpt = document.getElementById('prevExcerpt');
  const prevBody    = document.getElementById('prevBody');
  const prevDate    = document.getElementById('prevDate');

  /* ── 4. Toast Helper ── */
  function showToast(msg, duration = 3500) {
    if (!toastMsg) return;
    toastMsg.textContent = msg;
    toastMsg.classList.remove('hidden');
    clearTimeout(toastMsg._timer);
    toastMsg._timer = setTimeout(() => {
      toastMsg.classList.add('hidden');
    }, duration);
  }

  /* ── 5. Client-Side Image Compression for Local File Uploads ── */
  function compressImage(file, maxDimension = 1280, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ── 6. Image Upload & Thumbnail Handlers ── */
  if (btnChooseImageFile && edThumbFileInput) {
    btnChooseImageFile.addEventListener('click', () => {
      edThumbFileInput.click();
    });

    edThumbFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('⚠️ Please select a valid image file (JPG, PNG, WEBP).');
        return;
      }

      try {
        showToast('⏳ Compressing and loading image...');
        const compressedDataUrl = await compressImage(file, 1280, 0.85);

        if (edThumbnail) edThumbnail.value = compressedDataUrl;
        if (edLiveThumbImg) edLiveThumbImg.src = compressedDataUrl;
        if (edLiveThumbLabel) edLiveThumbLabel.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
        if (edLiveThumbSub) edLiveThumbSub.textContent = 'Uploaded from device • Ready to publish';

        showToast(`📷 Image "${file.name}" uploaded successfully!`);
      } catch (err) {
        console.error('Image compression error:', err);
        showToast('⚠️ Could not process image. Please try another image file.');
      }
    });
  }

  // Grab Video Cover Button
  if (btnGrabVideoThumb) {
    btnGrabVideoThumb.addEventListener('click', () => {
      const videoUrl = edVideoUrl ? edVideoUrl.value.trim() : '';
      if (!videoUrl) {
        showToast('⚠️ Please enter an Original Video URL first.');
        if (edVideoUrl) edVideoUrl.focus();
        return;
      }

      const ytId = window.AtamanFeed && window.AtamanFeed.extractYouTubeId ? window.AtamanFeed.extractYouTubeId(videoUrl) : null;
      if (ytId) {
        const ytThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        if (edThumbnail) edThumbnail.value = ytThumb;
        if (edLiveThumbImg) edLiveThumbImg.src = ytThumb;
        if (edLiveThumbLabel) edLiveThumbLabel.textContent = `YouTube Video Cover (${ytId})`;
        if (edLiveThumbSub) edLiveThumbSub.textContent = 'Auto-grabbed from video link';
        showToast('🎬 Video cover thumbnail grabbed successfully!');
      } else {
        showToast('⚠️ No YouTube video ID found in URL. You can upload an image from your device instead.');
      }
    });
  }

  // Reset Thumbnail Button
  if (btnResetThumb) {
    btnResetThumb.addEventListener('click', () => {
      if (edThumbnail) edThumbnail.value = '';
      if (edLiveThumbImg) edLiveThumbImg.src = 'assets/tree1.jpg';
      if (edLiveThumbLabel) edLiveThumbLabel.textContent = 'Default Placeholder';
      if (edLiveThumbSub) edLiveThumbSub.textContent = 'Click Upload Photo or Grab Video Cover';
      if (edThumbFileInput) edThumbFileInput.value = '';
      showToast('🔄 Thumbnail reset to default.');
    });
  }

  // Live input changes on edThumbnail
  if (edThumbnail) {
    edThumbnail.addEventListener('input', () => {
      const val = edThumbnail.value.trim();
      if (edLiveThumbImg) {
        edLiveThumbImg.src = val || 'assets/tree1.jpg';
      }
      if (edLiveThumbLabel) {
        if (val.startsWith('data:image/')) {
          edLiveThumbLabel.textContent = 'Device Uploaded Image';
        } else if (val.includes('img.youtube.com')) {
          edLiveThumbLabel.textContent = 'YouTube Video Cover';
        } else if (val) {
          edLiveThumbLabel.textContent = val.split('/').pop() || 'Custom Image URL';
        } else {
          edLiveThumbLabel.textContent = 'Default Placeholder';
        }
      }
    });
  }

  // Auto-grab video cover when user pastes a video URL and thumbnail is empty or default
  if (edVideoUrl) {
    edVideoUrl.addEventListener('change', () => {
      const vUrl = edVideoUrl.value.trim();
      const currentThumb = edThumbnail ? edThumbnail.value.trim() : '';
      if (vUrl && (!currentThumb || currentThumb === 'assets/tree1.jpg' || currentThumb === '1.jpg')) {
        const ytId = window.AtamanFeed && window.AtamanFeed.extractYouTubeId ? window.AtamanFeed.extractYouTubeId(vUrl) : null;
        if (ytId) {
          const ytThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
          if (edThumbnail) edThumbnail.value = ytThumb;
          if (edLiveThumbImg) edLiveThumbImg.src = ytThumb;
          if (edLiveThumbLabel) edLiveThumbLabel.textContent = `YouTube Video Cover (${ytId})`;
          if (edLiveThumbSub) edLiveThumbSub.textContent = 'Auto-grabbed from video link';
        }
      }
    });
  }

  // Global Preset Click Handler
  window.setThumbnailPreset = function(src) {
    if (edThumbnail) edThumbnail.value = src;
    if (edLiveThumbImg) edLiveThumbImg.src = src;
    if (edLiveThumbLabel) edLiveThumbLabel.textContent = 'Preset: ' + src.split('/').pop();
    if (edLiveThumbSub) edLiveThumbSub.textContent = 'Ready for display on public card';
  };

  /* ── 7. Category & Status Badges ── */
  function getCategoryBadge(cat) {
    const c = String(cat || 'NEWS').toUpperCase().trim();
    if (c === 'SHARED VIDEO') {
      return '<span class="type-badge shared-video" style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;font-weight:800;">▶️ SHARED VIDEO</span>';
    } else if (c === 'PLAN') {
      return '<span class="type-badge plan" style="background:#f3e8ff;color:#7e22ce;border:1px solid #e9d5ff;font-weight:800;">🗺️ PLAN</span>';
    } else if (c === 'PLANTING DRIVE') {
      return '<span class="type-badge planting-drive" style="background:#fef3c7;color:#b45309;border:1px solid #fde68a;font-weight:800;">🌱 PLANTING DRIVE</span>';
    } else {
      return '<span class="type-badge news" style="background:#dcfce7;color:#166534;border:1px solid #bbf7d0;font-weight:800;">📰 NEWS</span>';
    }
  }

  function getStatusBadge(status) {
    const s = String(status || 'Published').toLowerCase();
    if (s === 'published') {
      return '<span class="status-badge published">● Published</span>';
    } else if (s === 'draft') {
      return '<span class="status-badge draft">● Draft</span>';
    } else {
      return `<span class="status-badge">${status}</span>`;
    }
  }

  /* ── 8. Update Summary & Tab Badges ── */
  function updateCounters() {
    const total = updatesList.length;
    const pub = updatesList.filter(i => (i.status || 'Published').toLowerCase() === 'published').length;
    const dft = updatesList.filter(i => (i.status || '').toLowerCase() === 'draft').length;
    const nws = updatesList.filter(i => String(i.category || '').toUpperCase().trim() === 'NEWS').length;
    const pln = updatesList.filter(i => String(i.category || '').toUpperCase().trim() === 'PLAN').length;
    const drv = updatesList.filter(i => String(i.category || '').toUpperCase().trim() === 'PLANTING DRIVE').length;
    const vid = updatesList.filter(i => String(i.category || '').toUpperCase().trim() === 'SHARED VIDEO').length;

    if (cntTotal) cntTotal.textContent = total;
    if (cntPublished) cntPublished.textContent = pub;
    if (cntDrafts) cntDrafts.textContent = dft;
    if (cntNews) cntNews.textContent = nws;
    if (cntPlans) cntPlans.textContent = pln;
    if (cntVideos) cntVideos.textContent = vid;

    if (badgeAllCount) badgeAllCount.textContent = total;
    if (badgeNewsCount) badgeNewsCount.textContent = nws;
    if (badgePlansCount) badgePlansCount.textContent = pln;
    if (badgeDrivesCount) badgeDrivesCount.textContent = drv;
    if (badgeVideosCount) badgeVideosCount.textContent = vid;
    if (badgeAnnounceCount) badgeAnnounceCount.textContent = nws;
  }

  /* ── 9. Render Table ── */
  function renderContentTable(items = updatesList) {
    if (!contentTableBody) return;
    contentTableBody.innerHTML = '';

    if (items.length === 0) {
      const isEmpty = updatesList.length === 0;
      contentTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:48px 20px; color:var(--text-s, #94a3b8);">
            <div style="font-size:2.2rem; margin-bottom:10px;">📰</div>
            <p style="font-weight:700; font-size:0.95rem; margin-bottom:6px; color:#1e293b;">
              ${isEmpty ? 'No news, plans, planting drives, or video updates published yet.' : 'No items match your filter criteria.'}
            </p>
            <p style="font-size:0.82rem; color:#64748b;">
              ${isEmpty ? 'Click <strong>+ Post News &amp; Update</strong> above to create your first dispatch for Catbalogan City.' : 'Try adjusting search or clicking Reset Filters.'}
            </p>
          </td>
        </tr>
      `;
      updateCounters();
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      const hasVideo = !!(item.videoUrl && String(item.videoUrl).trim().length > 0);
      const thumb = window.AtamanFeed && window.AtamanFeed.resolveThumbnail ? window.AtamanFeed.resolveThumbnail(item) : (item.thumbnail || 'assets/tree1.jpg');
      const date = item.date || 'Recent';
      const author = item.author || 'ATAMAN Admin';

      // Video cell
      let videoCellHtml = '<span style="color:#94a3b8;font-size:0.8rem;">—</span>';
      if (hasVideo) {
        videoCellHtml = `
          <a href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;color:#dc2626;font-weight:700;font-size:0.78rem;text-decoration:none;" title="Open video in new tab">
            ▶ View Video ↗
          </a>
        `;
      }

      tr.innerHTML = `
        <td><input type="checkbox" class="content-row-cb" data-id="${item.id}"></td>
        <td>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="position:relative;width:54px;height:38px;border-radius:6px;overflow:hidden;background:#0f291e;flex-shrink:0;">
              <img src="${escapeHtml(thumb)}" alt="${escapeHtml(item.title)}" style="width:100%;height:100%;object-fit:cover;" onerror="if(window.AtamanFeed) window.AtamanFeed.handleImgError(this, '${escapeHtml(item.videoUrl)}');" />
              ${hasVideo ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;">▶</div>' : ''}
            </div>
            <div class="title-cell" style="min-width:0;">
              <span class="c-title" data-id="${item.id}" style="font-weight:700;color:#0f291e;cursor:pointer;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px;">
                ${escapeHtml(item.title)}
              </span>
              <span class="c-excerpt" style="font-size:0.78rem;color:#64748b;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px;">
                ${escapeHtml(item.excerpt || '')}
              </span>
            </div>
          </div>
        </td>
        <td>${getCategoryBadge(item.category)}</td>
        <td>${videoCellHtml}</td>
        <td><span style="color:#475569; font-size:.78rem;">${escapeHtml(author)}</span></td>
        <td><small style="color:#64748b; font-weight:600;">${escapeHtml(date)}</small></td>
        <td>${getStatusBadge(item.status)}</td>
        <td style="text-align:right;">
          <div class="tbl-actions" style="display:flex;justify-content:flex-end;gap:6px;">
            <button type="button" class="btn-tbl-view btn-preview-row" data-id="${item.id}" style="padding:4px 8px;font-size:11px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;">👁️ Preview</button>
            <button type="button" class="btn-tbl-view btn-edit-row" data-id="${item.id}" style="padding:4px 8px;font-size:11px;border-radius:6px;border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;font-weight:700;cursor:pointer;">✏️ Edit</button>
            <button type="button" class="btn-tbl-view btn-delete-row" data-id="${item.id}" style="padding:4px 8px;font-size:11px;border-radius:6px;border:1px solid #fecaca;background:#fff5f5;color:#dc2626;cursor:pointer;" title="Delete this update">🗑️</button>
          </div>
        </td>
      `;

      tr.querySelector('.c-title').addEventListener('click', () => openPreviewModal(item));
      tr.querySelector('.btn-preview-row').addEventListener('click', () => openPreviewModal(item));
      tr.querySelector('.btn-edit-row').addEventListener('click', () => openEditModal(item));
      tr.querySelector('.btn-delete-row').addEventListener('click', () => deleteUpdate(item.id));

      contentTableBody.appendChild(tr);
    });

    const info = document.getElementById('contentPaginationInfo');
    if (info) info.textContent = `Showing 1 to ${items.length} of ${items.length} news & update dispatches`;
    updateCounters();
  }

  /* ── 10. Filters & Search ── */
  function applyContentFilters() {
    const query  = (contentSearchInput ? contentSearchInput.value : '').toLowerCase().trim();
    const type   = contentTypeFilter ? contentTypeFilter.value.toUpperCase().trim() : '';
    const status = contentStatusFilter ? contentStatusFilter.value.toLowerCase().trim() : '';
    const author = contentAuthorFilter ? contentAuthorFilter.value.toLowerCase().trim() : '';

    const filtered = updatesList.filter(item => {
      const matchQuery = !query ||
        String(item.title || '').toLowerCase().includes(query) ||
        String(item.excerpt || '').toLowerCase().includes(query) ||        String(item.description || item.body || '').toLowerCase().includes(query) ||
        String(item.author || '').toLowerCase().includes(query);

      const itemCategory = String(item.category || '').toUpperCase().trim();
      const matchType = !type || itemCategory === type || (type === 'ANNOUNCEMENT' && itemCategory === 'NEWS');
      const matchStatus = !status || String(item.status || 'published').toLowerCase().trim() === status;
      const matchAuthor = !author || String(item.author || '').toLowerCase().includes(author);

      return matchQuery && matchType && matchStatus && matchAuthor;
    });

    renderContentTable(filtered);
  }

  if (contentSearchInput) contentSearchInput.addEventListener('input', applyContentFilters);
  if (contentTypeFilter) contentTypeFilter.addEventListener('change', applyContentFilters);
  if (contentStatusFilter) contentStatusFilter.addEventListener('change', applyContentFilters);
  if (contentAuthorFilter) contentAuthorFilter.addEventListener('change', applyContentFilters);

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      if (contentSearchInput) contentSearchInput.value = '';
      if (contentTypeFilter) contentTypeFilter.value = '';
      if (contentStatusFilter) contentStatusFilter.value = '';
      if (contentAuthorFilter) contentAuthorFilter.value = '';
      applyContentFilters();
      showToast('🔄 Filters reset to all updates.');
    });
  }

  /* ── 11. In-Page Tab Navigation ── */
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;

      if (targetTab === 'homepage') {
        window.open('index.html#updates', '_blank', 'noopener,noreferrer');
      } else {
        if (contentTypeFilter) {
          if (targetTab === 'all') contentTypeFilter.value = '';
          else if (targetTab === 'news') contentTypeFilter.value = 'NEWS';
          else if (targetTab === 'plans') contentTypeFilter.value = 'PLAN';
          else if (targetTab === 'planting-drives') contentTypeFilter.value = 'PLANTING DRIVE';
          else if (targetTab === 'videos') contentTypeFilter.value = 'SHARED VIDEO';
          else if (targetTab === 'announcements') contentTypeFilter.value = 'Announcement';
        }
        applyContentFilters();
      }
    });
  });

  // Summary Card Clicks for Quick Filtering
  document.querySelectorAll('.summary-card').forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      if (filter === 'published' || filter === 'draft') {
        if (contentStatusFilter) contentStatusFilter.value = filter === 'published' ? 'Published' : 'Draft';
        if (contentTypeFilter) contentTypeFilter.value = '';
      } else if (filter === 'all') {
        if (contentStatusFilter) contentStatusFilter.value = '';
        if (contentTypeFilter) contentTypeFilter.value = '';
      } else if (filter) {
        if (contentTypeFilter) contentTypeFilter.value = filter;
        if (contentStatusFilter) contentStatusFilter.value = '';
      }
      applyContentFilters();
    });
  });

  /* ── 12. Editor Modal Controls ── */
  function openAddModal() {
    if (!isCurrentAdmin()) {
      showToast('⚠️ Admin Access Required: Please sign in with an Administrator account.');
      return;
    }

    if (editorModalTitle) editorModalTitle.textContent = '✏️ Post News & Update (Admin)';
    if (edId) edId.value = '';
    if (edCategory) edCategory.value = 'NEWS';
    if (edTitle) edTitle.value = '';
    if (edVideoUrl) edVideoUrl.value = '';
    if (edThumbnail) edThumbnail.value = 'assets/tree1.jpg';
    if (edLiveThumbImg) edLiveThumbImg.src = 'assets/tree1.jpg';
    if (edLiveThumbLabel) edLiveThumbLabel.textContent = 'Default Placeholder';
    if (edLiveThumbSub) edLiveThumbSub.textContent = 'Click Upload Photo or Grab Video Cover';
    if (edThumbFileInput) edThumbFileInput.value = '';
    if (edExcerpt) edExcerpt.value = '';
    if (edBody) edBody.value = '';
    if (edStatus) edStatus.value = 'Published';
    if (edAuthor) edAuthor.value = 'ATAMAN Administrator';
    if (videoUrlError) videoUrlError.style.display = 'none';

    if (edDate) {
      const now = new Date();
      edDate.value = now.toISOString().split('T')[0];
    }

    if (contentEditorModal) contentEditorModal.classList.remove('hidden');
  }

  function openEditModal(item) {
    if (!isCurrentAdmin()) {
      showToast('⚠️ Admin Access Required: Please sign in with an Administrator account.');
      return;
    }

    if (editorModalTitle) editorModalTitle.textContent = `✏️ Edit Update: ${item.title}`;
    if (edId) edId.value = item.id;
    if (edCategory) edCategory.value = String(item.category || 'NEWS').toUpperCase().trim();
    if (edTitle) edTitle.value = item.title || '';
    if (edVideoUrl) edVideoUrl.value = item.videoUrl || '';

    // Resolve active cover photo thumbnail
    const thumb = window.AtamanFeed && window.AtamanFeed.resolveThumbnail ? window.AtamanFeed.resolveThumbnail(item) : (item.thumbnail || 'assets/tree1.jpg');
    if (edThumbnail) edThumbnail.value = thumb;
    if (edLiveThumbImg) edLiveThumbImg.src = thumb;
    if (edLiveThumbLabel) {
      if (thumb.startsWith('data:image/')) {
        edLiveThumbLabel.textContent = 'Device Uploaded Image';
      } else if (thumb.includes('img.youtube.com')) {
        edLiveThumbLabel.textContent = 'YouTube Video Cover';
      } else {
        edLiveThumbLabel.textContent = thumb.split('/').pop() || 'Current Active Cover';
      }
    }
    if (edLiveThumbSub) edLiveThumbSub.textContent = 'Active thumbnail for public card';
    if (edThumbFileInput) edThumbFileInput.value = '';

    if (edExcerpt) edExcerpt.value = item.excerpt || '';
    if (edBody) edBody.value = item.description || item.body || '';
    if (edStatus) edStatus.value = item.status || 'Published';
    if (edAuthor) edAuthor.value = item.author || 'ATAMAN Administrator';
    if (videoUrlError) videoUrlError.style.display = 'none';

    if (edDate) {
      if (item.createdAt) {
        edDate.value = new Date(item.createdAt).toISOString().split('T')[0];
      } else {
        edDate.value = new Date().toISOString().split('T')[0];
      }
    }

    if (contentEditorModal) contentEditorModal.classList.remove('hidden');
  }

  function closeEditorModal() {
    if (contentEditorModal) contentEditorModal.classList.add('hidden');
  }

  if (openAddContentModalBtn) openAddContentModalBtn.addEventListener('click', openAddModal);
  if (closeEditorModalBtn) closeEditorModalBtn.addEventListener('click', closeEditorModal);

  /* ── 13. Delete Update (Admin Only) ── */
  function deleteUpdate(id) {
    if (!isCurrentAdmin()) {
      showToast('⚠️ Admin Access Required: Only signed-in Admins can delete news & updates.');
      return;
    }

    const item = updatesList.find(i => String(i.id) === String(id));
    if (!item) return;

    if (!confirm(`Are you sure you want to permanently delete "${item.title}"?`)) {
      return;
    }

    updatesList = updatesList.filter(i => String(i.id) !== String(id));
    if (window.AtamanFeed && typeof window.AtamanFeed.saveNewsUpdates === 'function') {
      window.AtamanFeed.saveNewsUpdates(updatesList);
    } else {
      localStorage.setItem('ATAMAN_news_updates', JSON.stringify(updatesList));
    }

    applyContentFilters();
    showToast(`🗑️ Update "${item.title}" deleted successfully.`);
  }

  /* ── 14. Save & Publish Actions (Admin Only) ── */
  function saveContent(publishStatus) {
    // 1. Admin Verification
    if (!isCurrentAdmin()) {
      showToast('⚠️ Access Denied: You must be signed in as an Admin to publish or edit updates.');
      return;
    }

    // 2. Validate Headline
    const title = (edTitle ? edTitle.value : '').trim();
    if (!title) {
      showToast('⚠️ Please enter a headline / title.');
      if (edTitle) edTitle.focus();
      return;
    }

    // 3. Validate Original Video URL
    const videoUrl = (edVideoUrl ? edVideoUrl.value : '').trim();
    if (videoUrl) {
      const isValid = /^https?:\/\/.+/i.test(videoUrl);
      if (!isValid) {
        if (videoUrlError) videoUrlError.style.display = 'block';
        if (edVideoUrl) edVideoUrl.focus();
        showToast('⚠️ Video URL must be a valid link starting with http:// or https://');
        return;
      }
    }
    if (videoUrlError) videoUrlError.style.display = 'none';

    // 4. Validate Excerpt
    const excerpt = (edExcerpt ? edExcerpt.value : '').trim();
    if (!excerpt) {
      showToast('⚠️ Please enter a short description / excerpt.');
      if (edExcerpt) edExcerpt.focus();
      return;
    }

    const category = (edCategory ? edCategory.value : 'NEWS').toUpperCase().trim();
    const body = (edBody ? edBody.value : '').trim() || excerpt;
    let thumb = (edThumbnail ? edThumbnail.value : '').trim();
    const author = (edAuthor ? edAuthor.value : '').trim() || 'ATAMAN Administrator';

    // Auto-resolve thumbnail if user entered bare filename or empty
    if (window.AtamanFeed && window.AtamanFeed.resolveThumbnail) {
      thumb = window.AtamanFeed.resolveThumbnail({ thumbnail: thumb, videoUrl: videoUrl });
    } else if (!thumb) {
      thumb = 'assets/tree1.jpg';
    }

    // Format Date string: "Nov 24, 2026"
    let formattedDate = 'Recent';
    let dateIso = new Date().toISOString();
    if (edDate && edDate.value) {
      const d = new Date(edDate.value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        dateIso = d.toISOString();
      }
    }

    const existingId = edId ? edId.value : '';
    if (existingId) {
      // Edit existing
      const idx = updatesList.findIndex(i => String(i.id) === String(existingId));
      if (idx !== -1) {
        updatesList[idx] = {
          ...updatesList[idx],
          title,
          category,
          videoUrl,
          thumbnail: thumb,
          date: formattedDate,
          excerpt,
          description: body,
          status: publishStatus,
          author
        };
      }
    } else {
      // New post
      const newItem = {
        id: `UPD-2026-${String(updatesList.length + 1).padStart(3, '0')}`,
        title,
        category,
        videoUrl,
        thumbnail: thumb,
        date: formattedDate,
        excerpt,
        description: body,
        status: publishStatus,
        author,
        createdAt: dateIso
      };
      updatesList.unshift(newItem);
    }

    // Persist
    if (window.AtamanFeed && typeof window.AtamanFeed.saveNewsUpdates === 'function') {
      window.AtamanFeed.saveNewsUpdates(updatesList);
    } else {
      localStorage.setItem('ATAMAN_news_updates', JSON.stringify(updatesList));
    }

    closeEditorModal();
    closePreviewModal();
    applyContentFilters();

    if (publishStatus === 'Published') {
      showToast(`🎉 "${title}" published live to the ATAMAN portal feed!`);
    } else {
      showToast(`💾 Draft saved for "${title}".`);
    }
  }

  if (btnSaveDraft) btnSaveDraft.addEventListener('click', () => saveContent('Draft'));
  if (btnPublishContent) btnPublishContent.addEventListener('click', () => saveContent('Published'));
  if (btnPublishFromPreview) btnPublishFromPreview.addEventListener('click', () => saveContent('Published'));

  /* ── 15. Preview Modal Controls ── */
  function openPreviewModal(item) {
    if (!previewModal) return;
    if (prevBadge) prevBadge.textContent = item.category || 'NEWS';
    if (prevTitle) prevTitle.textContent = item.title;
    if (prevExcerpt) prevExcerpt.textContent = item.excerpt;
    if (prevBody) prevBody.textContent = item.description || item.body || item.excerpt;
    if (prevDate) prevDate.textContent = item.date || 'Recent';

    const featImg = previewModal.querySelector('.prev-featured-img');
    if (featImg) {
      const hasVideo = !!(item.videoUrl && String(item.videoUrl).trim().length > 0);
      const thumb = window.AtamanFeed && window.AtamanFeed.resolveThumbnail ? window.AtamanFeed.resolveThumbnail(item) : (item.thumbnail || 'assets/tree1.jpg');
      featImg.innerHTML = `
        <div style="position:relative;width:100%;height:220px;border-radius:10px;overflow:hidden;background:#0f291e;">
          <img src="${escapeHtml(thumb)}" alt="Preview" style="width:100%;height:100%;object-fit:cover;" onerror="if(window.AtamanFeed) window.AtamanFeed.handleImgError(this, '${escapeHtml(item.videoUrl)}');" />
          ${hasVideo ? `
            <div style="position:absolute;inset:0;background:rgba(0,0,0,0.45);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;">
              <div style="width:48px;height:48px;border-radius:50%;background:#166534;border:2px solid #fff;display:flex;align-items:center;justify-content:center;margin-bottom:6px;">▶</div>
              <span style="font-size:12px;font-weight:700;background:rgba(0,0,0,0.7);padding:4px 10px;border-radius:9999px;">Direct Video Link (Opens in new tab)</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    previewModal.classList.remove('hidden');
  }

  function closePreviewModal() {
    if (previewModal) previewModal.classList.add('hidden');
  }

  if (closePreviewModalBtn) closePreviewModalBtn.addEventListener('click', closePreviewModal);
  if (btnBackToEdit) btnBackToEdit.addEventListener('click', () => {
    closePreviewModal();
    if (contentEditorModal) contentEditorModal.classList.remove('hidden');
  });

  if (btnPreviewInModal) {
    btnPreviewInModal.addEventListener('click', () => {
      const rawThumb = edThumbnail ? edThumbnail.value.trim() : '';
      const vUrl = edVideoUrl ? edVideoUrl.value.trim() : '';
      const thumb = window.AtamanFeed && window.AtamanFeed.resolveThumbnail ? window.AtamanFeed.resolveThumbnail({ thumbnail: rawThumb, videoUrl: vUrl }) : (rawThumb || 'assets/tree1.jpg');

      const item = {
        title: edTitle ? edTitle.value || 'Untitled Update' : 'Untitled Update',
        excerpt: edExcerpt ? edExcerpt.value || 'No summary provided.' : '',
        description: edBody ? edBody.value || '' : '',
        category: edCategory ? edCategory.value : 'NEWS',
        videoUrl: vUrl,
        thumbnail: thumb,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      };
      closeEditorModal();
      openPreviewModal(item);
    });
  }

  /* ── 16. Quick Search & Mobile Navigation ── */
  const quickSearch = document.getElementById('btnQuickSearchFocus');
  if (quickSearch && contentSearchInput) {
    quickSearch.addEventListener('click', () => {
      contentSearchInput.focus();
      contentSearchInput.scrollIntoView({ behavior: 'smooth' });
    });
  }

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

  // Storage listener to update admin table if changed elsewhere
  window.addEventListener('storage', (e) => {
    if (e.key === 'ATAMAN_news_updates') {
      loadUpdatesFromStorage();
      applyContentFilters();
    }
  });

  /* ── 17. Initial Table Render ── */
  renderContentTable();
});

// Helper for escaping strings
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
