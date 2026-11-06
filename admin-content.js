/* ==========================================================================
   admin-content.js — ATAMAN Admin Content Management Logic & Interactions
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Master Content Dataset ── */
  const contentItems = [];
  /* ── DOM References ── */
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
  const edType     = document.getElementById('edType');
  const edCategory = document.getElementById('edCategory');
  const edTitle    = document.getElementById('edTitle');
  const edExcerpt  = document.getElementById('edExcerpt');
  const edBody     = document.getElementById('edBody');
  const edStatus   = document.getElementById('edStatus');
  const edDate     = document.getElementById('edDate');
  const editorModalTitle = document.getElementById('editorModalTitle');

  // Preview elements
  const prevBadge   = document.getElementById('prevBadge');
  const prevTitle   = document.getElementById('prevTitle');
  const prevExcerpt = document.getElementById('prevExcerpt');
  const prevBody    = document.getElementById('prevBody');
  const prevDate    = document.getElementById('prevDate');

  /* ── Toast Helper ── */
  function showToast(msg, duration = 3000) {
    toastMsg.textContent = msg;
    toastMsg.classList.remove('hidden');
    clearTimeout(toastMsg._timer);
    toastMsg._timer = setTimeout(() => {
      toastMsg.classList.add('hidden');
    }, duration);
  }

  /* ── Helpers for Badges ── */
  function getTypeBadge(type) {
    switch (type.toLowerCase()) {
      case 'announcement': return '<span class="type-badge announcement">📢 Announcement</span>';
      case 'news':         return '<span class="type-badge news">📰 News</span>';
      case 'education':    return '<span class="type-badge education">🌱 Education</span>';
      case 'faq':          return '<span class="type-badge faq">❓ FAQ</span>';
      case 'page':         return '<span class="type-badge page">📄 Page</span>';
      case 'banner':       return '<span class="type-badge banner">🖼️ Banner</span>';
      default:             return `<span class="type-badge news">${type}</span>`;
    }
  }

  function getStatusBadge(status) {
    switch (status.toLowerCase()) {
      case 'published': return '<span class="status-badge published">● Published</span>';
      case 'draft':     return '<span class="status-badge draft">● Draft</span>';
      case 'scheduled': return '<span class="status-badge scheduled">● Scheduled</span>';
      case 'archived':  return '<span class="status-badge archived">● Archived</span>';
      default:          return `<span class="status-badge">${status}</span>`;
    }
  }

  /* ── 2. Render Content Table ── */
  function renderContentTable(items = contentItems) {
    contentTableBody.innerHTML = '';

    if (items.length === 0) {
      const isEmptyDataset = contentItems.length === 0;
      contentTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:48px 20px; color:var(--text-s, #94a3b8);">
            <div style="font-size:2.2rem; margin-bottom:10px;">📝</div>
            <p style="font-weight:700; font-size:0.95rem; margin-bottom:6px;">
              ${isEmptyDataset ? 'No content articles published yet.' : 'No content articles match your search or filter criteria.'}
            </p>
            <p style="font-size:0.82rem;">
              ${isEmptyDataset ? 'Click <strong>+ Add Content</strong> above to create your first article or announcement.' : 'Try adjusting your search or resetting filters.'}
            </p>
          </td>
        </tr>
      `;
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="content-row-cb" data-id="${item.id}"></td>
        <td>
          <div class="title-cell">
            <span class="c-title" data-id="${item.id}">${item.title}</span>
            <span class="c-excerpt">${item.excerpt}</span>
          </div>
        </td>
        <td>${getTypeBadge(item.type)}</td>
        <td><span style="font-weight:600; color:var(--text-m); font-size:.78rem;">${item.category}</span></td>
        <td><span style="color:var(--text-m); font-size:.78rem;">${item.author}</span></td>
        <td><small style="color:var(--text-s); font-weight:600;">${item.lastUpdated}</small></td>
        <td>${getStatusBadge(item.status)}</td>
        <td style="text-align:right;">
          <div class="tbl-actions">
            <button class="btn-tbl-view btn-preview-row" data-id="${item.id}">Preview</button>
            <button class="btn-tbl-view btn-edit-row" data-id="${item.id}">Edit</button>
          </div>
        </td>
      `;

      tr.querySelector('.c-title').addEventListener('click', () => openPreviewModal(item));
      tr.querySelector('.btn-preview-row').addEventListener('click', () => openPreviewModal(item));
      tr.querySelector('.btn-edit-row').addEventListener('click', () => openEditModal(item));

      contentTableBody.appendChild(tr);
    });

    document.getElementById('contentPaginationInfo').textContent = `Showing 1 to ${items.length} of ${items.length} content items`;
  }

  /* ── 3. Filters & Search ── */
  function applyContentFilters() {
    const query  = contentSearchInput.value.toLowerCase().trim();
    const type   = contentTypeFilter.value;
    const status = contentStatusFilter.value;
    const author = contentAuthorFilter.value;

    const filtered = contentItems.filter(item => {
      const matchQuery = !query ||
        item.title.toLowerCase().includes(query) ||
        item.excerpt.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.body.toLowerCase().includes(query);

      const matchType   = !type   || item.type.toLowerCase() === type.toLowerCase();
      const matchStatus = !status || item.status.toLowerCase() === status.toLowerCase();
      const matchAuthor = !author || item.author.toLowerCase().includes(author.toLowerCase());

      return matchQuery && matchType && matchStatus && matchAuthor;
    });

    renderContentTable(filtered);
  }

  contentSearchInput.addEventListener('input', applyContentFilters);
  contentTypeFilter.addEventListener('change', applyContentFilters);
  contentStatusFilter.addEventListener('change', applyContentFilters);
  contentAuthorFilter.addEventListener('change', applyContentFilters);

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      contentSearchInput.value = '';
      contentTypeFilter.value = '';
      contentStatusFilter.value = '';
      contentAuthorFilter.value = '';
      applyContentFilters();
      showToast('🔄 Filters reset.');
    });
  }

  /* ── 4. In-Page Tab Navigation ── */
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;

      if (targetTab === 'homepage') {
        document.getElementById('filterToolbarSec').style.display = 'none';
        tabPanes.forEach(p => p.classList.remove('active'));
        document.getElementById('paneHomepage').classList.add('active');
      } else if (targetTab === 'banners' || targetTab === 'media') {
        document.getElementById('filterToolbarSec').style.display = 'none';
        tabPanes.forEach(p => p.classList.remove('active'));
        document.getElementById('paneMedia').classList.add('active');
      } else if (targetTab === 'history') {
        document.getElementById('filterToolbarSec').style.display = 'none';
        tabPanes.forEach(p => p.classList.remove('active'));
        document.getElementById('paneHistory').classList.add('active');
      } else {
        document.getElementById('filterToolbarSec').style.display = 'flex';
        tabPanes.forEach(p => p.classList.remove('active'));
        document.getElementById('paneTable').classList.add('active');

        if (targetTab === 'all') {
          contentTypeFilter.value = '';
        } else if (targetTab === 'announcements') {
          contentTypeFilter.value = 'Announcement';
        } else if (targetTab === 'news') {
          contentTypeFilter.value = 'News';
        } else if (targetTab === 'education') {
          contentTypeFilter.value = 'Education';
        } else if (targetTab === 'faqs') {
          contentTypeFilter.value = 'FAQ';
        } else if (targetTab === 'pages') {
          contentTypeFilter.value = 'Page';
        }
        applyContentFilters();
      }
    });
  });

  // Top header button to open media library
  document.getElementById('btnOpenMediaLibrary')?.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));
    document.getElementById('filterToolbarSec').style.display = 'none';
    document.getElementById('paneMedia').classList.add('active');
  });

  document.getElementById('btnQuickSearchFocus')?.addEventListener('click', () => {
    contentSearchInput.focus();
    contentSearchInput.scrollIntoView({ behavior: 'smooth' });
  });

  // Summary Card Clicks
  document.querySelectorAll('.summary-card').forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      if (filter === 'published' || filter === 'draft' || filter === 'scheduled') {
        contentStatusFilter.value = filter.charAt(0).toUpperCase() + filter.slice(1);
        contentTypeFilter.value = '';
        applyContentFilters();
      } else if (filter === 'announcement') {
        contentTypeFilter.value = 'Announcement';
        contentStatusFilter.value = '';
        applyContentFilters();
      } else if (filter === 'all') {
        contentStatusFilter.value = '';
        contentTypeFilter.value = '';
        applyContentFilters();
      }
    });
  });

  document.getElementById('cardMediaFiles')?.addEventListener('click', () => {
    tabPanes.forEach(p => p.classList.remove('active'));
    document.getElementById('filterToolbarSec').style.display = 'none';
    document.getElementById('paneMedia').classList.add('active');
  });

  /* ── 5. Content Editor Controls ── */
  function openAddModal() {
    editorModalTitle.textContent = '✏️ Create New Content Item';
    edType.value = 'Announcement';
    edCategory.value = '';
    edTitle.value = '';
    edExcerpt.value = '';
    edBody.value = '';
    edStatus.value = 'Draft';
    contentEditorModal.classList.remove('hidden');
  }

  function openEditModal(item) {
    editorModalTitle.textContent = `✏️ Edit Content: ${item.title}`;
    edType.value = item.type;
    edCategory.value = item.category;
    edTitle.value = item.title;
    edExcerpt.value = item.excerpt;
    edBody.value = item.body;
    edStatus.value = item.status;
    contentEditorModal.classList.remove('hidden');
  }

  function closeEditorModal() {
    contentEditorModal.classList.add('hidden');
  }

  if (openAddContentModalBtn) openAddContentModalBtn.addEventListener('click', openAddModal);
  if (closeEditorModalBtn) closeEditorModalBtn.addEventListener('click', closeEditorModal);

  /* ── 6. Preview Modal Controls ── */
  function openPreviewModal(item) {
    prevBadge.textContent = item.type.toUpperCase();
    prevTitle.textContent = item.title;
    prevExcerpt.textContent = item.excerpt;
    prevBody.textContent = item.body;
    prevDate.textContent = item.lastUpdated;
    previewModal.classList.remove('hidden');
  }

  function closePreviewModal() {
    previewModal.classList.add('hidden');
  }

  if (closePreviewModalBtn) closePreviewModalBtn.addEventListener('click', closePreviewModal);
  if (btnBackToEdit) btnBackToEdit.addEventListener('click', () => {
    closePreviewModal();
    contentEditorModal.classList.remove('hidden');
  });

  if (btnPreviewInModal) {
    btnPreviewInModal.addEventListener('click', () => {
      const item = {
        title: edTitle.value || 'Untitled Content',
        excerpt: edExcerpt.value || 'No summary provided.',
        body: edBody.value || 'Article content is empty.',
        type: edType.value,
        lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
      closeEditorModal();
      openPreviewModal(item);
    });
  }

  /* ── 7. Save & Publish Actions ── */
  function saveContent(publishStatus) {
    const title   = edTitle.value.trim() || 'New Article';
    const excerpt = edExcerpt.value.trim() || 'Summary overview...';
    const body    = edBody.value.trim() || 'Article details...';
    const type    = edType.value;
    const cat     = edCategory.value.trim() || 'General';

    const newItem = {
      id: `CNT-00${contentItems.length + 1}`,
      title: title,
      excerpt: excerpt,
      type: type,
      category: cat,
      author: 'Admin (Ethel Zeta)',
      lastUpdated: 'Aug 29, 2026',
      status: publishStatus,
      body: body
    };

    contentItems.unshift(newItem);
    closeEditorModal();
    closePreviewModal();
    applyContentFilters();

    if (publishStatus === 'Published') {
      showToast(`🎉 Published "${title}" live to ATAMAN portal.`);
    } else {
      showToast(`💾 Draft saved for "${title}".`);
    }
  }

  if (btnSaveDraft) btnSaveDraft.addEventListener('click', () => saveContent('Draft'));
  if (btnPublishContent) btnPublishContent.addEventListener('click', () => saveContent('Published'));
  if (btnPublishFromPreview) btnPublishFromPreview.addEventListener('click', () => saveContent('Published'));

  /* ── 8. Media Library Actions ── */
  document.getElementById('btnUploadMediaAsset')?.addEventListener('click', () => {
    showToast('📁 Media file selector opened.');
  });

  /* ── 9. Homepage Manager Actions ── */
  document.getElementById('btnEditHeroBanner')?.addEventListener('click', () => {
    showToast('✏️ Opening Hero Banner Visual Editor...');
  });

  document.getElementById('btnChangePinnedAnnouncement')?.addEventListener('click', () => {
    showToast('📢 Selected active announcement banner for portal top header.');
  });

  /* ── 10. Mobile Sidebar Toggle ── */
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

  /* ── Initial Table Render ── */
  renderContentTable();
});
