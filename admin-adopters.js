/* ==========================================================================
   ATAMAN Admin Adopters JavaScript
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const DEFAULT_ADOPTERS = (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_ADOPTERS) && window.ATAMAN_DEFAULT_ADOPTERS.length > 0)
    ? window.ATAMAN_DEFAULT_ADOPTERS
    : [
      {
        id: 'ADP-101',
        name: 'Nikki Maga',
        fullName: 'Nikki Maga',
        contactPerson: 'Nikki Maga',
        type: 'Individual',
        email: 'nikkimaga24@gmail.com',
        phone: '+63 917 123 4567',
        address: 'Brgy. Guinsorongan, Catbalogan City, Samar',
        status: 'Active',
        treesCount: 0,
        funding: 0,
        fundingPaid: 0,
        customFunding: false,
        joinedDate: '2026-08-28',
        startDate: '2026-08-28',
        expDate: 'Ongoing',
        treesList: []
      }
    ];
  window.ATAMAN_DEFAULT_ADOPTERS = DEFAULT_ADOPTERS;

  // Load persisted adopters cache
  let adoptersList = [];
  try {
    const cachedAdopters = localStorage.getItem('ATAMAN_adopters_cache');
    if (cachedAdopters) {
      const parsed = JSON.parse(cachedAdopters);
      if (Array.isArray(parsed) && parsed.length > 0) adoptersList = parsed;
    }
  } catch (e) {
    adoptersList = [];
  }
  if (!adoptersList || adoptersList.length === 0) {
    adoptersList = [...DEFAULT_ADOPTERS];
    try { localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adoptersList)); } catch (_) {}
  }

  function harmonizeAdopterRecords(adopters) {
    if (!Array.isArray(adopters)) return false;
    let changed = false;

    // 1. Normalize individual fields
    adopters.forEach(a => {
      if (!a) return;
      if (a.treesCount == null || isNaN(Number(a.treesCount))) {
        a.treesCount = Array.isArray(a.treesList) ? a.treesList.length : (parseInt(a.treesAdopted, 10) || 0);
        changed = true;
      } else {
        a.treesCount = Number(a.treesCount);
      }
      if (a.treesCount > 0 && Number(a.funding || a.fundingPaid) > 0 && a.customFunding === undefined) {
        a.customFunding = true;
      }
      if (!a.customFunding) {
        if (a.funding || a.fundingPaid) {
          a.funding = 0;
          a.fundingPaid = 0;
          changed = true;
        } else {
          a.funding = 0;
        }
      } else {
        a.funding = Number(a.funding || a.fundingPaid) || 0;
      }
      if (!a.name) a.name = a.fullName || a.adopterName || 'Adopter';
      if (!a.contactPerson) a.contactPerson = a.contact || a.email || '—';
      if (!a.type) a.type = 'Individual';
      if (!a.status) a.status = 'Active';
    });

    // 2. Deduplicate / merge split records that belong to the same user account
    for (let i = 0; i < adopters.length; i++) {
      const a = adopters[i];
      if (!a) continue;
      for (let j = i + 1; j < adopters.length; j++) {
        const b = adopters[j];
        if (!b) continue;

        const emailA = (a.email || '').toLowerCase().trim();
        const emailB = (b.email || '').toLowerCase().trim();
        const nameA = (a.name || '').toLowerCase().trim();
        const nameB = (b.name || '').toLowerCase().trim();
        const contactA = (a.contactPerson || a.contact || '').toLowerCase().trim();
        const contactB = (b.contactPerson || b.contact || '').toLowerCase().trim();

        const sameEmail = emailA && emailB && emailA === emailB;
        const nameMatchesContact = (nameA && contactB && nameA === contactB) || (nameB && contactA && nameB === contactA);
        const sameName = nameA && nameB && nameA === nameB;

        if (sameEmail || nameMatchesContact || sameName) {
          const scoreA = (Number(a.treesCount) || 0) * 100 + (Array.isArray(a.treesList) ? a.treesList.length * 10 : 0) + (a.expDate === 'Ongoing' ? 5 : 0);
          const scoreB = (Number(b.treesCount) || 0) * 100 + (Array.isArray(b.treesList) ? b.treesList.length * 10 : 0) + (b.expDate === 'Ongoing' ? 5 : 0);

          const primary = scoreB > scoreA ? b : a;
          const secondary = scoreB > scoreA ? a : b;

          if (!primary.email && secondary.email) primary.email = secondary.email;
          if ((!primary.contactPerson || primary.contactPerson === primary.email) && secondary.name) {
            primary.contactPerson = secondary.name;
          }
          if (!primary.startDate && (secondary.startDate || secondary.joinedDate || secondary.createdAt)) {
            primary.startDate = secondary.startDate || secondary.joinedDate || secondary.createdAt;
          }

          adopters[i] = primary;
          adopters.splice(j, 1);
          j--;
          changed = true;

          if (secondary.id && secondary.id !== primary.id && window.ATAMAN_DB && typeof window.ATAMAN_DB.deleteAdopter === 'function') {
            window.ATAMAN_DB.deleteAdopter(secondary.id).catch(() => {});
          }
        }
      }
    }

    return changed;
  }

  if (harmonizeAdopterRecords(adoptersList)) {
    try {
      localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adoptersList));
    } catch (e) {}
  }

  // Live trees synced from trees table and Firestore
  let allTreesList = [];
  let selectedTreeIds = [];

  function loadSyncedTrees() {
    try {
      const raw = localStorage.getItem('ATAMAN_trees_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) allTreesList = parsed;
      }
    } catch (e) {
      console.warn('Could not read ATAMAN_trees_cache:', e);
    }
    return Array.isArray(allTreesList) ? allTreesList : [];
  }

  loadSyncedTrees();

  // DOM Elements
  const adoptersTbody = document.getElementById('adoptersTbody');
  const searchInput = document.getElementById('searchInput');
  const filterType = document.getElementById('filterType');
  const filterStatus = document.getElementById('filterStatus');
  const filterPlan = document.getElementById('filterPlan');
  const filterLocation = document.getElementById('filterLocation');
  const filterStartDate = document.getElementById('filterStartDate');
  const filterExpDate = document.getElementById('filterExpDate');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const tableCountBadge = document.getElementById('tableCountBadge');

  // Adopter Profile Modal Elements
  const adopterProfileModal = document.getElementById('adopterProfileModal');
  const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
  const profMoreBtn = document.getElementById('profMoreBtn');
  const profMoreMenu = document.getElementById('profMoreMenu');

  // Multi-step Add Adopter Wizard Elements
  const addAdopterModal = document.getElementById('addAdopterModal');
  const openAddAdopterModalBtn = document.getElementById('openAddAdopterModalBtn');
  const closeAddModalBtn = document.getElementById('closeAddModalBtn');
  const cancelAddModalBtn = document.getElementById('cancelAddModalBtn');
  const wizardPrevBtn = document.getElementById('wizardPrevBtn');
  const wizardNextBtn = document.getElementById('wizardNextBtn');
  const submitAddAdopterBtn = document.getElementById('submitAddAdopterBtn');
  const treeCheckboxList = document.getElementById('treeCheckboxList');
  const step3SelectedBadge = document.getElementById('step3SelectedBadge');
  const treeSearchInput = document.getElementById('treeSearchInput');

  let currentWizardStep = 1;
  let currentProfileTrees = [];
  let currentSelectedAdopter = null;
  let currentAdopterPhotoData = '';

  function processAdopterPhotoFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      alert('⚠️ Please select a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('⚠️ The selected image exceeds 10MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        currentAdopterPhotoData = compressedDataUrl;

        const previewImg = document.getElementById('adopterPhotoPreviewImg');
        const previewWrap = document.getElementById('adopterPhotoPreviewWrap');
        const promptWrap = document.getElementById('adopterPhotoPrompt');
        const fileNameEl = document.getElementById('adopterPhotoFileName');
        const fileSizeEl = document.getElementById('adopterPhotoFileSize');

        if (previewImg) previewImg.src = compressedDataUrl;
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = (file.size / 1024 > 1024) ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : Math.round(file.size / 1024) + ' KB';
        if (previewWrap) previewWrap.style.display = 'flex';
        if (promptWrap) promptWrap.style.display = 'none';

        // Update Step 3 confirmation row if already generated
        const thumbEl = document.getElementById('confirmPhotoThumb');
        const textEl = document.getElementById('confirmPhotoText');
        if (thumbEl && textEl) {
          thumbEl.src = compressedDataUrl;
          thumbEl.style.display = 'block';
          textEl.textContent = file.name || 'Photo Attached';
          textEl.style.color = '#15803d';
          textEl.style.fontWeight = '600';
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function resetAdopterPhotoUpload() {
    currentAdopterPhotoData = '';
    const input = document.getElementById('newAdopterPhotoInput');
    if (input) input.value = '';
    const previewImg = document.getElementById('adopterPhotoPreviewImg');
    const previewWrap = document.getElementById('adopterPhotoPreviewWrap');
    const promptWrap = document.getElementById('adopterPhotoPrompt');
    if (previewImg) previewImg.src = '';
    if (previewWrap) previewWrap.style.display = 'none';
    if (promptWrap) promptWrap.style.display = 'flex';

    const thumbEl = document.getElementById('confirmPhotoThumb');
    const textEl = document.getElementById('confirmPhotoText');
    if (thumbEl && textEl) {
      thumbEl.style.display = 'none';
      textEl.textContent = 'None attached';
      textEl.style.color = '#64748b';
      textEl.style.fontWeight = 'normal';
    }
  }

  function safeEscape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderAdopterCommunications(adopter) {
    const container = document.getElementById('commList');
    if (!container) return;

    const comms = Array.isArray(adopter?.communications) ? adopter.communications : [];
    if (comms.length === 0) {
      container.innerHTML = `
        <div class="empty-comm-state" style="padding: 24px 16px; text-align: center; color: var(--text-muted); background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
          <div style="font-size: 1.5rem; margin-bottom: 4px;">💬</div>
          <div style="font-weight: 600; color: #475569; font-size: 0.85rem;">No communication history</div>
          <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">No messages sent yet. Use the "Send Message" button above to send an update.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = comms.map(c => `
      <div class="comm-item">
        <div class="comm-meta">
          <span class="comm-sender">${safeEscape(c.sender || 'Admin')}</span>
          <span class="comm-date">${safeEscape(c.date || '')}</span>
        </div>
        <p class="comm-text">"${safeEscape(c.text || '')}"</p>
      </div>
    `).join('');
  }

  function getAssignedCaretakerForAdopter(adopter, trees) {
    let caretakers = [];
    try {
      const raw = localStorage.getItem('ATAMAN_caretakers_cache');
      if (raw) caretakers = JSON.parse(raw);
    } catch(e) {}

    if (!Array.isArray(caretakers) || caretakers.length === 0) {
      try {
        const rawUsers = JSON.parse(localStorage.getItem('ATAMAN_registered_users') || '[]');
        caretakers = rawUsers.filter(u => String(u.role || '').toLowerCase().includes('caretaker')).map(u => ({
          id: u.uid || u.id || u.empId,
          empId: u.empId || 'CT-2026-001',
          name: u.displayName || u.name || 'Field Caretaker',
          primaryArea: u.location || 'Brgy. Guinsorongan',
          phone: u.phone || '+63 917 888 1234',
          email: u.email || 'caretaker@ataman.org',
          status: u.status || 'Active',
          schedule: []
        }));
      } catch(e) {}
    }

    if (!Array.isArray(caretakers)) caretakers = [];

    const adopterArea = (adopter?.location || adopter?.address || '').toLowerCase();
    const adopterName = (adopter?.name || '').toLowerCase();
    const isGuinsorongan = adopterArea.includes('guinsorongan') || adopterName.includes('john sho');

    // 1. Check if any assigned tree specifies caretaker explicitly
    if (Array.isArray(trees) && trees.length > 0) {
      for (const t of trees) {
        if (t.caretaker) {
          const ctMatch = caretakers.find(c => 
            (c.name && c.name.toLowerCase() === t.caretaker.toLowerCase()) ||
            (c.empId && c.empId.toLowerCase() === t.caretaker.toLowerCase())
          );
          if (ctMatch) return { caretaker: ctMatch, allCaretakers: caretakers };
          return {
            caretaker: {
              id: 'CT-' + t.caretaker.replace(/\s+/g, '-').toLowerCase(),
              name: t.caretaker,
              empId: 'CT-2026-001',
              role: 'Field Caretaker',
              primaryArea: isGuinsorongan ? 'Brgy. Guinsorongan' : 'Catbalogan City',
              phone: '+63 917 888 1234',
              email: `${t.caretaker.toLowerCase().replace(/\s+/g, '.')}@ataman.org`,
              status: 'Active',
              schedule: []
            },
            allCaretakers: caretakers
          };
        }
      }
    }

    // 2. Check if any caretaker in caretakers covers the adopter's area
    let matchedCt = caretakers.find(c => {
      const pArea = (c.primaryArea || '').toLowerCase();
      const assBarangays = Array.isArray(c.assignedBarangays) ? c.assignedBarangays.map(b => b.toLowerCase()) : [];
      if (isGuinsorongan) {
        return pArea.includes('guinsorongan') || assBarangays.includes('guinsorongan') || (c.name && c.name.toLowerCase().includes('amara'));
      }
      const cleanLoc = (adopter?.location || '').toLowerCase().replace('brgy.', '').trim();
      return (cleanLoc && (pArea.includes(cleanLoc) || assBarangays.includes(cleanLoc)));
    });

    if (matchedCt) {
      return { caretaker: matchedCt, allCaretakers: caretakers };
    }

    // 3. Fallback to first active caretaker in list if available
    if (caretakers.length > 0) {
      const activeCt = caretakers.find(c => c.status === 'Active') || caretakers[0];
      return { caretaker: activeCt, allCaretakers: caretakers };
    }

    // 4. Default Samar caretaker representation
    const defaultCt = {
      id: isGuinsorongan ? 'CT-2026-001' : 'CT-101',
      name: isGuinsorongan ? 'Amara Yes' : 'Dodong Zeta',
      empId: isGuinsorongan ? 'CT-2026-001' : 'EMP-101',
      role: 'Field Caretaker',
      primaryArea: isGuinsorongan ? 'Brgy. Guinsorongan' : 'Catbalogan City',
      phone: '+63 917 888 1234',
      email: isGuinsorongan ? 'amara.yes@ataman.org' : 'zetadodong@gmail.com',
      status: 'Active',
      schedule: []
    };

    return { caretaker: defaultCt, allCaretakers: [defaultCt] };
  }

  function getSchedulesForAdopter(caretaker, adopter) {
    if (!caretaker || !Array.isArray(caretaker.schedule)) return [];
    const adopterArea = (adopter?.location || adopter?.address || '').toLowerCase();
    const adopterName = (adopter?.name || '').toLowerCase();
    const isGuinsorongan = adopterArea.includes('guinsorongan') || adopterName.includes('john sho');

    return caretaker.schedule.filter(s => {
      // Direct adopter match
      if (s.adopterId && String(s.adopterId) === String(adopter.id)) return true;
      if (s.adopterName && s.adopterName.toLowerCase() === adopterName) return true;

      // Area match
      const sLoc = (s.loc || s.location || '').toLowerCase();
      const sPlot = (s.plot || '').toLowerCase();

      if (isGuinsorongan && (sLoc.includes('guinsorongan') || sPlot.includes('guinsorongan') || sLoc === '' || sPlot.includes('sector 1') || sPlot.includes('plot 4-a'))) {
        return true;
      }

      const cleanLoc = (adopter?.location || '').toLowerCase().replace('brgy.', '').trim();
      if (cleanLoc && (sLoc.includes(cleanLoc) || sPlot.includes(cleanLoc))) {
        return true;
      }

      return false;
    });
  }

  function renderCaretakerSchedule(adopter, trees) {
    const { caretaker, allCaretakers } = getAssignedCaretakerForAdopter(adopter, trees);
    const scheduleCard = document.getElementById('profCaretakerScheduleCard');
    if (!scheduleCard) return;

    // 1. Update Adoption Details assigned caretaker item
    const detailEl = document.getElementById('profCaretakerDetail');
    if (detailEl) {
      detailEl.textContent = `👤 ${caretaker.name} (${caretaker.primaryArea || 'Guinsorongan'})`;
    }

    // 2. Update Caretaker Banner in schedule card
    const bannerEl = document.getElementById('profSchedCaretakerBanner');
    const visits = getSchedulesForAdopter(caretaker, adopter);
    
    // Determine next visit date
    let nextDateText = 'No upcoming visit';
    const upcomingVisits = visits.filter(v => v.status !== 'Completed' && v.st !== 'Completed');
    if (upcomingVisits.length > 0) {
      nextDateText = upcomingVisits[0].date || upcomingVisits[0].rawDate || 'Scheduled Soon';
    }

    const initials = (caretaker.name || 'CT').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    if (bannerEl) {
      bannerEl.innerHTML = `
        <div class="sched-ct-left">
          <div class="sched-ct-avatar">${initials}</div>
          <div>
            <div class="sched-ct-name">
              <span>${safeEscape(caretaker.name)}</span>
              <span class="badge badge-active" style="font-size: 10px; padding: 1px 6px;">${safeEscape(caretaker.empId || 'CT-2026')}</span>
            </div>
            <div class="sched-ct-meta">
              Field Caretaker • 📍 ${safeEscape(caretaker.primaryArea || 'Brgy. Guinsorongan')} • 📞 ${safeEscape(caretaker.phone || '+63 917 888 1234')}
            </div>
          </div>
        </div>
        <div class="sched-ct-right">
          <div class="sched-next-label">Next Scheduled Inspection</div>
          <div class="sched-next-date" style="color: ${upcomingVisits.length > 0 ? '#15803d' : '#64748b'};">${safeEscape(nextDateText)}</div>
        </div>
      `;
    }

    // 3. Render Table or Empty State
    const tbody = document.getElementById('profSchedVisitsTbody');
    const tableWrapper = document.getElementById('profSchedTableWrapper');
    const emptyState = document.getElementById('profSchedEmptyState');

    if (!visits || visits.length === 0) {
      if (tableWrapper) tableWrapper.classList.add('hidden');
      if (emptyState) {
        emptyState.classList.remove('hidden');
        const emptyTitle = document.getElementById('profSchedEmptyTitle');
        const emptyMsg = document.getElementById('profSchedEmptyMsg');
        if (emptyTitle) emptyTitle.textContent = `No monitoring visits scheduled yet for ${adopter.name}`;
        if (emptyMsg) emptyMsg.textContent = `Field visits scheduled by ${caretaker.name} for this adopter's ${adopter.treesCount || 10} trees will be reflected here.`;
      }
      return;
    }

    if (tableWrapper) tableWrapper.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    if (tbody) {
      tbody.innerHTML = visits.map(v => {
        const isCompleted = v.status === 'Completed' || v.st === 'Completed';
        const isDue = v.status === 'Due Today' || v.st === 'Due Today';
        const statusClass = isCompleted ? 'sched-st-completed' : (isDue ? 'sched-st-due' : 'sched-st-scheduled');
        const statusIcon = isCompleted ? '🟢' : (isDue ? '🔴' : '🟡');
        const statusText = v.status || v.st || 'Scheduled';
        const count = v.target || v.count || adopter.treesCount || 10;
        const plotLabel = v.plot || 'Sector 1 (Plot 4-A)';
        const locLabel = v.loc || v.location || caretaker.primaryArea || 'Brgy. Guinsorongan';

        return `
          <tr>
            <td>
              <strong style="color: #0f172a; display: inline-flex; align-items: center; gap: 5px;">
                <span>📅</span> ${safeEscape(v.date || v.rawDate || 'Scheduled')}
              </strong>
            </td>
            <td>
              <div style="font-weight: 600; color: #166534;">${safeEscape(caretaker.name)}</div>
              <div style="font-size: 11px; color: #64748b;">${safeEscape(caretaker.empId || 'CT-2026')}</div>
            </td>
            <td>
              <div style="font-weight: 600; color: #334155;">${safeEscape(plotLabel)}</div>
              <div style="font-size: 11px; color: #64748b;">${safeEscape(locLabel)}</div>
            </td>
            <td>
              <span style="font-weight: 700; color: #15803d; font-size: 12px;">🌳 ${count} Trees</span>
            </td>
            <td>
              <span class="sched-st-badge ${statusClass}">${statusIcon} ${safeEscape(statusText)}</span>
            </td>
            <td class="text-right">
              <div style="display: inline-flex; align-items: center; gap: 4px; justify-content: flex-end;">
                <button class="btn btn-ghost btn-sm btn-toggle-sched-visit" data-visit-id="${v.id}" data-ct-id="${caretaker.id}" title="${isCompleted ? 'Mark as Scheduled' : 'Mark as Completed'}" style="padding: 2px 7px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px;">
                  ${isCompleted ? '↩️ Reopen' : '✅ Complete'}
                </button>
                <button class="sched-del-btn btn-delete-sched-visit" data-visit-id="${v.id}" data-ct-id="${caretaker.id}" title="Remove Visit" style="padding: 2px 6px;">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Attach visit action handlers
      tbody.querySelectorAll('.btn-toggle-sched-visit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const vId = btn.getAttribute('data-visit-id');
          const ctId = btn.getAttribute('data-ct-id');
          toggleCaretakerVisitStatus(ctId, vId);
        });
      });

      tbody.querySelectorAll('.btn-delete-sched-visit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const vId = btn.getAttribute('data-visit-id');
          const ctId = btn.getAttribute('data-ct-id');
          deleteCaretakerVisit(ctId, vId);
        });
      });
    }
  }

  function toggleCaretakerVisitStatus(ctId, vId) {
    let caretakers = [];
    try {
      caretakers = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
    } catch(e) {}

    const ct = caretakers.find(c => String(c.id) === String(ctId) || String(c.empId) === String(ctId));
    if (!ct || !Array.isArray(ct.schedule)) return;

    const visit = ct.schedule.find(v => String(v.id) === String(vId));
    if (!visit) return;

    const willBeCompleted = visit.status !== 'Completed' && visit.st !== 'Completed';
    visit.status = willBeCompleted ? 'Completed' : 'Scheduled';
    visit.st = visit.status;

    try {
      localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakers));
      if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyCaretakers === 'function') {
        window.ATAMAN_SYNC.notifyCaretakers(caretakers);
      }
    } catch(e) {}

    if (currentSelectedAdopter) {
      renderCaretakerSchedule(currentSelectedAdopter, currentProfileTrees);
      renderAdopterTimeline(currentSelectedAdopter);
    }
    alert(willBeCompleted ? `✅ Visit marked as completed by ${ct.name}!` : `↩️ Visit reverted to scheduled status.`);
  }

  function deleteCaretakerVisit(ctId, vId) {
    if (!confirm('Remove this scheduled monitoring visit?')) return;

    let caretakers = [];
    try {
      caretakers = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
    } catch(e) {}

    const ct = caretakers.find(c => String(c.id) === String(ctId) || String(c.empId) === String(ctId));
    if (!ct || !Array.isArray(ct.schedule)) return;

    ct.schedule = ct.schedule.filter(v => String(v.id) !== String(vId));

    try {
      localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakers));
      if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyCaretakers === 'function') {
        window.ATAMAN_SYNC.notifyCaretakers(caretakers);
      }
    } catch(e) {}

    if (currentSelectedAdopter) {
      renderCaretakerSchedule(currentSelectedAdopter, currentProfileTrees);
      renderAdopterTimeline(currentSelectedAdopter);
    }
    alert('🗑️ Scheduled visit removed.');
  }

  function renderAdopterTimeline(adopter) {
    const container = document.getElementById('timelineList');
    if (!container) return;

    // Timeline events array
    let events = Array.isArray(adopter?.timeline) ? [...adopter.timeline] : [];

    // Look up assigned caretaker & their monitoring visits for this adopter
    const { caretaker } = getAssignedCaretakerForAdopter(adopter, currentProfileTrees);
    const visits = getSchedulesForAdopter(caretaker, adopter);

    // Merge caretaker field monitoring visits into timeline events
    if (Array.isArray(visits)) {
      visits.forEach(v => {
        const isCompleted = v.status === 'Completed' || v.st === 'Completed';
        const vDate = v.rawDate || v.date || 'Upcoming';
        const targetTrees = v.target || v.count || adopter.treesCount || 10;
        const locationDesc = v.plot ? `${v.plot}, ${v.loc || v.location || adopter.location || 'Catbalogan'}` : (v.loc || v.location || adopter.location || 'Assigned Sector');
        
        events.push({
          date: vDate,
          title: isCompleted ? '🌿 Field Monitoring Completed' : '📅 Scheduled Caretaker Field Visit',
          desc: isCompleted
            ? `Caretaker ${caretaker.name} completed on-site health check for ${targetTrees} trees at ${locationDesc}.`
            : `Caretaker ${caretaker.name} scheduled on-site inspection for ${targetTrees} trees at ${locationDesc}.`
        });
      });
    }

    // If adopter has a registration/start date, record the initial tree adoption milestone
    if (adopter?.startDate) {
      events.push({
        date: adopter.startDate,
        title: '🤝 Tree Adoption Established',
        desc: `${adopter.name} officially adopted ${adopter.treesCount || 10} native trees under ${adopter.project || 'Community Reforestation'}. Field monitoring assigned to Caretaker ${caretaker.name}.`
      });
    }

    // If no timeline array yet, check if there's any update date recorded
    if (events.length === 0 && (adopter?.updateDate || adopter?.lastUpdated)) {
      const uDate = adopter.updateDate || adopter.lastUpdated;
      events.push({
        date: uDate,
        title: '🔄 Adoption Record Updated',
        desc: `Status and adoption records updated for ${adopter.name}.`
      });
    }

    if (events.length === 0) {
      container.classList.add('is-empty');
      container.innerHTML = `
        <div class="empty-timeline-state" style="padding: 24px 16px; text-align: center; color: var(--text-muted); background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
          <div style="font-size: 1.5rem; margin-bottom: 4px;">📅</div>
          <div style="font-weight: 600; color: #475569; font-size: 0.85rem;">No activity recorded yet</div>
          <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">Adoption activity and progress milestones will appear here when an update date is recorded.</div>
        </div>
      `;
      return;
    }

    // Sort events by date descending (newest first)
    events.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      if (isNaN(timeA) || isNaN(timeB)) return 0;
      return timeB - timeA;
    });

    container.classList.remove('is-empty');
    container.innerHTML = events.map(e => {
      let shortDate = 'RECENT';
      if (e.date) {
        try {
          const d = new Date(e.date);
          if (!isNaN(d.getTime())) {
            shortDate = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
          } else {
            shortDate = String(e.date).substring(0, 6).toUpperCase();
          }
        } catch(err) {
          shortDate = String(e.date).substring(0, 6).toUpperCase();
        }
      }

      return `
        <div class="tl-item">
          <div class="tl-date">${safeEscape(shortDate)}</div>
          <div class="tl-content">
            <div class="tl-title">${safeEscape(e.title || 'Activity Update')}</div>
            <div class="tl-desc">${safeEscape(e.desc || '')}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Helper date display
  function formatDateDisplay(isoStr) {
    if (!isoStr) return 'N/A';
    if (isoStr === 'Ongoing' || isNaN(Date.parse(isoStr))) return isoStr;
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Render Table Function
  function renderAdoptersTable() {
    if (!adoptersTbody) return;

    const query = (searchInput?.value || '').trim().toLowerCase();
    const typeVal = filterType?.value || 'ALL';
    const statusVal = filterStatus?.value || 'ALL';
    const planVal = filterPlan?.value || 'ALL';
    const locVal = filterLocation?.value || 'ALL';
    const startVal = filterStartDate?.value || '';
    const expVal = filterExpDate?.value || '';

    const filtered = adoptersList.filter(ad => {
      if (!ad) return false;
      const adName = (ad.name || ad.fullName || '').toLowerCase();
      const adType = (ad.type || '').toLowerCase();
      const adContact = (ad.contactPerson || ad.contact || '').toLowerCase();
      const adEmail = (ad.email || '').toLowerCase();

      const matchSearch = !query || 
        adName.includes(query) || 
        adType.includes(query) || 
        adContact.includes(query) ||
        adEmail.includes(query);

      const matchType = typeVal === 'ALL' || ad.type === typeVal;
      const matchStatus = statusVal === 'ALL' || ad.status === statusVal;
      const matchPlan = planVal === 'ALL' || ad.plan === planVal;
      const matchLoc = locVal === 'ALL' || ad.location === locVal;
      const matchStart = !startVal || !ad.startDate || ad.startDate >= startVal;
      const matchExp = !expVal || !ad.expDate || ad.expDate === 'Ongoing' || ad.expDate <= expVal;

      return matchSearch && matchType && matchStatus && matchPlan && matchLoc && matchStart && matchExp;
    });

    adoptersTbody.innerHTML = '';

    if (filtered.length === 0) {
      adoptersTbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center" style="padding: 30px; color: #64748b;">
            🔍 No adopters found matching the selected filters.
          </td>
        </tr>
      `;
      if (tableCountBadge) tableCountBadge.textContent = 'Showing 0 adopters';
      return;
    }

    if (tableCountBadge) tableCountBadge.textContent = 'Showing ' + filtered.length + ' of ' + adoptersList.length + ' adopters';

    filtered.forEach(ad => {
      const tr = document.createElement('tr');

      const status = ad.status || 'Active';
      let badgeClass = 'badge-active';
      let statusIcon = '🟢';
      if (status === 'Pending') { badgeClass = 'badge-pending'; statusIcon = '🟡'; }
      else if (status === 'Expiring Soon') { badgeClass = 'badge-expiring'; statusIcon = '🟠'; }
      else if (status === 'Expired') { badgeClass = 'badge-expired'; statusIcon = '🔴'; }
      else if (status === 'Suspended') { badgeClass = 'badge-suspended'; statusIcon = '⚫'; }

      const formattedStart = formatDateDisplay(ad.startDate || ad.joinedDate || ad.createdAt);
      const formattedExp = formatDateDisplay(ad.expDate);

      const treesCount = Number(ad.treesCount != null ? ad.treesCount : (Array.isArray(ad.treesList) ? ad.treesList.length : 0)) || 0;
      const funding = Number(ad.funding != null ? ad.funding : 0) || 0;
      const displayName = ad.name || ad.fullName || 'Unnamed Adopter';
      const displayContact = ad.contactPerson || ad.contact || ad.email || '—';
      const displayType = ad.type || 'Individual';

      const adopterThumb = ad.photo || ad.treePhoto || '';
      tr.innerHTML = `
        <td>
          <div class="adopter-name-cell" style="display: flex; align-items: center; gap: 10px;">
            ${adopterThumb ? `
              <img src="${adopterThumb}" alt="${displayName}" style="width: 36px; height: 36px; border-radius: 8px; object-fit: cover; border: 1.5px solid #86efac; flex-shrink: 0;" />
            ` : `
              <div style="width: 36px; height: 36px; border-radius: 8px; background: #dcfce7; color: #166534; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0;">
                ${displayName.slice(0, 2).toUpperCase()}
              </div>
            `}
            <div>
              <span class="adopter-title">${displayName}</span>
              <span class="adopter-contact">👤 ${displayContact}</span>
            </div>
          </div>
        </td>
        <td><span class="badge badge-subtle">${displayType}</span></td>
        <td class="text-right"><strong>${treesCount.toLocaleString()}</strong></td>
        <td class="text-right"><strong>₱${funding.toLocaleString()}</strong></td>
        <td>${formattedStart}</td>
        <td>${formattedExp}</td>
        <td><span class="badge ${badgeClass}">${statusIcon} ${status}</span></td>
        <td class="text-center">
          <div style="display:inline-flex; align-items:center; gap:6px; justify-content:center;">
            <button class="btn btn-outline btn-sm view-profile-btn" data-id="${ad.id}">View</button>
            <button class="btn btn-outline btn-sm delete-adopter-btn" data-id="${ad.id}" title="Delete Adopter" style="color:#dc2626; border-color:#fecaca; padding:4px 8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer;" onmouseover="this.style.backgroundColor='#fee2e2'" onmouseout="this.style.backgroundColor='transparent'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        </td>
      `;

      adoptersTbody.appendChild(tr);
    });

    // Attach click listeners to "View" buttons
    document.querySelectorAll('.view-profile-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openAdopterProfile(id);
      });
    });

    // Attach click listeners to "Delete" buttons
    document.querySelectorAll('.delete-adopter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        confirmDeleteAdopter(id);
      });
    });
  }

  // Delete Adopter Handlers
  let pendingDeleteAdopterId = null;
  const deleteAdopterModal = document.getElementById('deleteAdopterModal');
  const deleteAdopterNameLabel = document.getElementById('deleteAdopterNameLabel');
  const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  const cancelDeleteModalBtn = document.getElementById('cancelDeleteModalBtn');
  const confirmDeleteModalBtn = document.getElementById('confirmDeleteModalBtn');

  function confirmDeleteAdopter(id) {
    const adopter = adoptersList.find(a => a.id === id);
    if (!adopter) return;
    pendingDeleteAdopterId = id;
    if (deleteAdopterNameLabel) deleteAdopterNameLabel.textContent = `"${adopter.name}"`;
    if (deleteAdopterModal) deleteAdopterModal.classList.remove('hidden');
  }

  function hideDeleteModal() {
    if (deleteAdopterModal) deleteAdopterModal.classList.add('hidden');
    pendingDeleteAdopterId = null;
  }

  closeDeleteModalBtn?.addEventListener('click', hideDeleteModal);
  cancelDeleteModalBtn?.addEventListener('click', hideDeleteModal);
  deleteAdopterModal?.addEventListener('click', (e) => {
    if (e.target === deleteAdopterModal) hideDeleteModal();
  });

  confirmDeleteModalBtn?.addEventListener('click', async () => {
    if (!pendingDeleteAdopterId) return;
    const id = pendingDeleteAdopterId;
    const ad = adoptersList.find(a => a.id === id);
    const adName = ad ? ad.name : 'Adopter';

    if (window.ATAMAN_DB && window.ATAMAN_DB.deleteAdopter) {
      await window.ATAMAN_DB.deleteAdopter(id);
    }

    adoptersList = adoptersList.filter(a => a.id !== id);
    localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adoptersList));
    if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyAdopters === 'function') {
      window.ATAMAN_SYNC.notifyAdopters(adoptersList);
    }

    renderAdoptersTable();
    updateSummaryCards();
    hideDeleteModal();
    alert(`🗑️ Adopter "${adName}" deleted successfully.`);
  });

  // Open Adopter Detailed Profile Modal
  function openAdopterProfile(id) {
    const adopter = adoptersList.find(a => a.id === id) || adoptersList[0] || {};
    currentSelectedAdopter = adopter;

    const displayName = adopter.name || adopter.fullName || 'ADOPTER';
    document.getElementById('profName').textContent = displayName.toUpperCase();
    
    // Status Badge
    const status = adopter.status || 'Active';
    const statusBadge = document.getElementById('profStatusBadge');
    statusBadge.textContent = status.toUpperCase();
    statusBadge.className = 'badge ' + (
      status === 'Active' ? 'badge-active' :
      status === 'Pending' ? 'badge-pending' :
      status === 'Expiring Soon' ? 'badge-expiring' :
      status === 'Expired' ? 'badge-expired' : 'badge-suspended'
    );

    document.getElementById('profPlanBadge').textContent = adopter.plan || 'Standard';

    // Adopter Photo Header & Card
    const profEmojiIcon = document.getElementById('profEmojiIcon');
    const profPhotoImg = document.getElementById('profPhotoImg');
    const profPhotoCard = document.getElementById('profPhotoCard');
    const profCardPhotoImg = document.getElementById('profCardPhotoImg');
    const adopterPhoto = adopter.photo || adopter.treePhoto || '';

    if (adopterPhoto) {
      if (profPhotoImg) {
        profPhotoImg.src = adopterPhoto;
        profPhotoImg.style.display = 'block';
      }
      if (profEmojiIcon) profEmojiIcon.style.display = 'none';
      if (profPhotoCard && profCardPhotoImg) {
        profCardPhotoImg.src = adopterPhoto;
        profPhotoCard.style.display = 'block';
      }
    } else {
      if (profPhotoImg) profPhotoImg.style.display = 'none';
      if (profEmojiIcon) profEmojiIcon.style.display = 'inline-block';
      if (profPhotoCard) profPhotoCard.style.display = 'none';
    }

    // Renewal Warning Banner toggle
    const renewalBanner = document.getElementById('profRenewalBanner');
    if (status === 'Expiring Soon' || status === 'Pending') {
      renewalBanner.classList.remove('hidden');
      document.getElementById('profBannerMsg').textContent = displayName + "'s adoption agreement expires on " + formatDateDisplay(adopter.expDate) + ".";
    } else {
      renewalBanner.classList.add('hidden');
    }

    // Organization Info
    document.getElementById('profOrgName').textContent = displayName;
    document.getElementById('profType').textContent = adopter.type || 'Individual';
    document.getElementById('profContactPerson').textContent = adopter.contactPerson || adopter.contact || '—';
    document.getElementById('profEmail').textContent = adopter.email || '—';
    document.getElementById('profPhone').textContent = adopter.phone || '—';
    document.getElementById('profAddress').textContent = adopter.address || '—';
    document.getElementById('profRegId').textContent = adopter.regId || adopter.id || '—';
    document.getElementById('profDateReg').textContent = adopter.dateReg || formatDateDisplay(adopter.createdAt || adopter.joinedDate);

    // Adoption Details
    document.getElementById('profPlanDetail').textContent = adopter.plan || 'Standard';
    const profileTreesCount = Number(adopter.treesCount != null ? adopter.treesCount : (Array.isArray(adopter.treesList) ? adopter.treesList.length : 0)) || 0;
    document.getElementById('profTreesDetail').textContent = profileTreesCount + ' trees';
    document.getElementById('profStartDetail').textContent = formatDateDisplay(adopter.startDate || adopter.joinedDate || adopter.createdAt);
    document.getElementById('profExpDetail').textContent = formatDateDisplay(adopter.expDate);
    document.getElementById('profStatusDetail').textContent = status;

    const livesInGuinsorongan = (adopter.address || '').toLowerCase().includes('guinsorongan') || 
                                (displayName || '').toLowerCase().includes('john sho') || 
                                (adopter.location || '').toLowerCase().includes('guinsorongan');
    const displayArea = livesInGuinsorongan ? 'Brgy. Guinsorongan' : (adopter.location || 'Catbalogan City');
    document.getElementById('profAreaDetail').textContent = displayArea;
    document.getElementById('profProjectDetail').textContent = adopter.project || 'Catbalogan Reforestation';

    // Tree Condition Overview
    const cond = adopter.treesCondition || { healthy: 210, care: 22, critical: 10, dead: 8 };
    const totalCond = Math.max(1, (cond.healthy || 0) + (cond.care || 0) + (cond.critical || 0) + (cond.dead || 0));
    
    document.getElementById('condHealthyCount').textContent = cond.healthy || 0;
    document.getElementById('condCareCount').textContent = cond.care || 0;
    document.getElementById('condCriticalCount').textContent = cond.critical || 0;
    document.getElementById('condDeadCount').textContent = cond.dead || 0;

    document.getElementById('barHealthy').style.width = Math.round(((cond.healthy || 0) / totalCond) * 100) + '%';
    document.getElementById('barCare').style.width = Math.round(((cond.care || 0) / totalCond) * 100) + '%';
    document.getElementById('barCritical').style.width = Math.round(((cond.critical || 0) / totalCond) * 100) + '%';
    document.getElementById('barDead').style.width = Math.round(((cond.dead || 0) / totalCond) * 100) + '%';

    // Funding & Sponsorship
    const fundCommit = Number(adopter.funding != null ? adopter.funding : 0) || 0;
    const fundPaid = Number(adopter.fundingPaid != null ? adopter.fundingPaid : fundCommit) || 0;
    document.getElementById('profFundCommit').textContent = '₱' + fundCommit.toLocaleString();
    document.getElementById('profFundPaid').textContent = '₱' + fundPaid.toLocaleString();
    const remain = Math.max(0, fundCommit - fundPaid);
    document.getElementById('profFundRemain').textContent = '₱' + remain.toLocaleString();
    document.getElementById('profFundStatus').textContent = adopter.paymentStatus || 'Fully Paid';

    // Payment History Table
    const payTbody = document.getElementById('paymentHistoryTbody');
    if (payTbody && Array.isArray(adopter.payments)) {
      payTbody.innerHTML = adopter.payments.map(p => `
        <tr>
          <td>${p.date || '—'}</td>
          <td>${p.ref || '—'}</td>
          <td class="text-right">₱${(Number(p.amount) || 0).toLocaleString()}</td>
          <td><span class="badge ${p.status === 'Paid' ? 'badge-active' : 'badge-pending'}">${p.status || 'Paid'}</span></td>
        </tr>
      `).join('');
    }

    // Adopted Trees Table
    loadSyncedTrees();
    let treesForProfile = Array.isArray(adopter.treesList) ? [...adopter.treesList] : [];

    // Also match any trees from allTreesList by adopter name or sponsorName
    const adopterNameNorm = (adopter.name || '').trim().toLowerCase();
    const matchingFromDb = allTreesList.filter(t => 
      (t.sponsorName && t.sponsorName.trim().toLowerCase() === adopterNameNorm) ||
      (t.adopter && t.adopter.trim().toLowerCase() === adopterNameNorm)
    );

    matchingFromDb.forEach(mt => {
      if (!treesForProfile.some(t => t.id === mt.id)) {
        const common = mt.species?.common || (typeof mt.species === 'string' ? mt.species : 'Native Tree');
        const loc = mt.barangay ? `Brgy. ${mt.barangay}, ${mt.municipality || 'Catbalogan City'}` : (mt.location || 'Catbalogan City');
        let health = 'Healthy';
        if (mt.status === 'needs-care') health = 'Needs Care';
        else if (mt.status === 'critical') health = 'Critical';
        else if (mt.status === 'dead') health = 'Dead';

        treesForProfile.push({
          id: mt.id,
          species: common,
          scientific: mt.species?.scientific || '',
          location: loc,
          health: health,
          lastMon: mt.dateAdded || 'Aug 28, 2026',
          treeCount: parseInt(mt.treeCount) || 1,
          treeType: mt.treeType || mt.species?.type || 'Native'
        });
      }
    });

    // Synchronize locations of profile trees from live trees dataset
    treesForProfile = treesForProfile.map(item => {
      const liveTree = allTreesList.find(t => String(t.id) === String(item.id));
      if (liveTree) {
        const brgy = liveTree.barangay ? (liveTree.barangay.startsWith('Brgy.') ? liveTree.barangay : `Brgy. ${liveTree.barangay}`) : (livesInGuinsorongan ? 'Brgy. Guinsorongan' : 'Catbalogan City');
        const loc = `${brgy}, ${liveTree.municipality || 'Catbalogan City'}`;
        return { ...item, location: loc };
      } else if (livesInGuinsorongan) {
        return { ...item, location: 'Brgy. Guinsorongan, Catbalogan City' };
      }
      return item;
    });

    currentProfileTrees = treesForProfile;
    document.getElementById('profTreeTitleCount').textContent = currentProfileTrees.length;
    renderProfileTreesTable(currentProfileTrees);

    // Certificate Card
    document.getElementById('certRecipient').textContent = adopter.name;
    document.getElementById('certTreesCount').textContent = adopter.treesCount + ' Native Trees';
    document.getElementById('certProject').textContent = adopter.project;

    // Render Communication History (empty until messages exist)
    renderAdopterCommunications(adopter);

    // Render Caretaker Monitoring Schedule
    renderCaretakerSchedule(adopter, currentProfileTrees);

    // Render Adoption Activity & Timeline (empty until an update date exists)
    renderAdopterTimeline(adopter);

    // Show modal
    adopterProfileModal.classList.remove('hidden');
  }

  function renderProfileTreesTable(trees) {
    const tbody = document.getElementById('profTreesTbody');
    if (!tbody) return;

    if (!trees || trees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 24px; color: #64748b;">No trees linked yet.</td></tr>';
      return;
    }

    tbody.innerHTML = trees.map(t => {
      const badgeClass = t.health === 'Healthy' ? 'badge-active' : (t.health === 'Needs Care' ? 'badge-pending' : 'badge-expired');
      const countTag = t.treeCount ? `<span style="font-weight: 700; color: #166534; font-size: 11.5px; margin-left: 4px;">(🌳 ${t.treeCount})</span>` : '';
      return `
        <tr>
          <td><strong>${t.id}</strong></td>
          <td>
            <div style="font-weight: 600;">${t.species} ${countTag}</div>
            ${t.scientific ? `<div style="font-size: 11px; font-style: italic; color: #64748b;">${t.scientific}</div>` : ''}
          </td>
          <td>${t.location || 'Catbalogan City'}</td>
          <td><span class="badge ${badgeClass}">${t.health || 'Healthy'}</span></td>
          <td>${t.lastMon || 'N/A'}</td>
        </tr>
      `;
    }).join('');
  }

  // Tree Health Pill Filter inside Profile Modal
  document.querySelectorAll('.tree-filter-pills .pill-btn').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.tree-filter-pills .pill-btn').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filter = pill.getAttribute('data-tree-filter');
      if (filter === 'ALL') {
        renderProfileTreesTable(currentProfileTrees);
      } else {
        const filtered = currentProfileTrees.filter(t => t.health === filter);
        renderProfileTreesTable(filtered);
      }
    });
  });

  // Filter Event Listeners
  [searchInput, filterType, filterStatus, filterPlan, filterLocation, filterStartDate, filterExpDate].forEach(el => {
    if (el) el.addEventListener('input', renderAdoptersTable);
    if (el) el.addEventListener('change', renderAdoptersTable);
  });

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      searchInput.value = '';
      filterType.value = 'ALL';
      filterStatus.value = 'ALL';
      filterPlan.value = 'ALL';
      filterLocation.value = 'ALL';
      filterStartDate.value = '';
      filterExpDate.value = '';
      renderAdoptersTable();
  updateSummaryCards();
    });
  }

  // Profile Modal Close
  if (closeProfileModalBtn) {
    closeProfileModalBtn.addEventListener('click', () => {
      adopterProfileModal.classList.add('hidden');
    });
  }

  // Dropdown More Toggle
  if (profMoreBtn && profMoreMenu) {
    profMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profMoreMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      profMoreMenu.classList.add('hidden');
    });
  }

  // Communication and Timeline Action Handlers
  function handleSendMessage() {
    if (!currentSelectedAdopter) return;
    const msg = prompt(`💬 Send a communication message to ${currentSelectedAdopter.name}:`);
    if (!msg || !msg.trim()) return;

    if (!Array.isArray(currentSelectedAdopter.communications)) {
      currentSelectedAdopter.communications = [];
    }

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });

    currentSelectedAdopter.communications.unshift({
      sender: `Admin → ${currentSelectedAdopter.name}`,
      date: dateFormatted,
      text: msg.trim()
    });

    try {
      localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adoptersList));
      if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyAdopters === 'function') {
        window.ATAMAN_SYNC.notifyAdopters(adoptersList);
      }
      if (window.ATAMAN_DB && typeof window.ATAMAN_DB.updateAdopter === 'function') {
        window.ATAMAN_DB.updateAdopter(currentSelectedAdopter.id, currentSelectedAdopter).catch(() => {});
      }
    } catch(e) {}

    renderAdopterCommunications(currentSelectedAdopter);
    alert(`✅ Message sent to ${currentSelectedAdopter.name}!`);
  }

  function handleGenerateReport() {
    if (!currentSelectedAdopter) return;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    if (!Array.isArray(currentSelectedAdopter.timeline)) {
      currentSelectedAdopter.timeline = [];
    }
    currentSelectedAdopter.updateDate = dateFormatted;
    currentSelectedAdopter.timeline.unshift({
      date: dateFormatted,
      title: '📊 Quarterly Impact Report Generated',
      desc: `Progress and survival report compiled for ${currentSelectedAdopter.name} (${currentSelectedAdopter.treesCount} trees).`
    });

    try {
      localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adoptersList));
      if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyAdopters === 'function') {
        window.ATAMAN_SYNC.notifyAdopters(adoptersList);
      }
      if (window.ATAMAN_DB && typeof window.ATAMAN_DB.updateAdopter === 'function') {
        window.ATAMAN_DB.updateAdopter(currentSelectedAdopter.id, currentSelectedAdopter).catch(() => {});
      }
    } catch(e) {}

    renderAdopterTimeline(currentSelectedAdopter);
    alert(`📊 Progress Report generated for ${currentSelectedAdopter.name}! Update date recorded on timeline.`);
  }

  function handleRenewAdoption() {
    if (!currentSelectedAdopter) return;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    if (!Array.isArray(currentSelectedAdopter.timeline)) {
      currentSelectedAdopter.timeline = [];
    }
    currentSelectedAdopter.updateDate = dateFormatted;
    currentSelectedAdopter.timeline.unshift({
      date: dateFormatted,
      title: '🔄 Adoption Agreement Renewed',
      desc: `Sponsorship term extended for ${currentSelectedAdopter.name}.`
    });

    try {
      localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adoptersList));
      if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyAdopters === 'function') {
        window.ATAMAN_SYNC.notifyAdopters(adoptersList);
      }
      if (window.ATAMAN_DB && typeof window.ATAMAN_DB.updateAdopter === 'function') {
        window.ATAMAN_DB.updateAdopter(currentSelectedAdopter.id, currentSelectedAdopter).catch(() => {});
      }
    } catch(e) {}

    renderAdopterTimeline(currentSelectedAdopter);
    alert(`🔄 Adoption agreement renewed for ${currentSelectedAdopter.name}!`);
  }

  // Action Button Alerts for Profile Buttons
  document.getElementById('profEditBtn')?.addEventListener('click', () => alert('✏️ Edit Adopter Modal triggered.'));
  document.getElementById('profManageTreesBtn')?.addEventListener('click', () => alert('🌳 Manage Trees feature triggered.'));
  document.getElementById('profCertBtn')?.addEventListener('click', () => alert('📜 Adoption Certificate preview triggered.'));
  document.getElementById('profReportBtn')?.addEventListener('click', handleGenerateReport);
  document.getElementById('profMessageBtn')?.addEventListener('click', handleSendMessage);
  document.getElementById('profRenewBtn')?.addEventListener('click', handleRenewAdoption);
  document.getElementById('sendMessageTriggerBtn')?.addEventListener('click', handleSendMessage);
  document.getElementById('bannerRenewBtn')?.addEventListener('click', handleRenewAdoption);
  document.getElementById('bannerReminderBtn')?.addEventListener('click', () => alert('✉️ Renewal reminder email sent to adopter!'));
  document.getElementById('bannerAgreementBtn')?.addEventListener('click', () => alert('📄 Adoption agreement document opened.'));
  document.getElementById('viewCertBtn')?.addEventListener('click', () => alert('📜 Full resolution Certificate opened.'));
  document.getElementById('downloadPdfBtn')?.addEventListener('click', () => alert('📥 Certificate PDF download started.'));
  document.getElementById('printCertBtn')?.addEventListener('click', () => alert('🖨️ Print dialog opened.'));
  document.getElementById('viewTreeSingleBtn')?.addEventListener('click', () => alert('🌳 Opening tree detailed view...'));
  document.getElementById('viewAllTreesBtn')?.addEventListener('click', () => alert('🌳 Navigating to full tree list...'));

  // ----------------------------------------------------
  // CARETAKER SCHEDULE VISIT MODAL & ACTIONS
  // ----------------------------------------------------
  const addScheduleVisitModal = document.getElementById('addScheduleVisitModal');
  const closeAddSchedModalBtn = document.getElementById('closeAddSchedModalBtn');
  const cancelAddSchedModalBtn = document.getElementById('cancelAddSchedModalBtn');
  const addScheduleVisitForm = document.getElementById('addScheduleVisitForm');

  function openAddScheduleVisitModal() {
    if (!currentSelectedAdopter) return;
    const { caretaker, allCaretakers } = getAssignedCaretakerForAdopter(currentSelectedAdopter, currentProfileTrees);

    // Pre-fill Adopter
    const adNameInput = document.getElementById('schedInputAdopterName');
    if (adNameInput) adNameInput.value = currentSelectedAdopter.name;

    // Pre-populate Caretakers dropdown
    const selectCt = document.getElementById('schedInputCaretaker');
    if (selectCt) {
      selectCt.innerHTML = '';
      const listToDisplay = (allCaretakers && allCaretakers.length > 0) ? allCaretakers : [caretaker];
      listToDisplay.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id || c.empId;
        opt.textContent = `${c.name} (${c.empId || 'CT-2026'}) — ${c.primaryArea || 'Catbalogan City'}`;
        if (c.id === caretaker.id || c.empId === caretaker.empId) opt.selected = true;
        selectCt.appendChild(opt);
      });
    }

    // Default next visit date (e.g. 7 days from today)
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);
    const dateStr = nextDate.toISOString().split('T')[0];
    const dateInput = document.getElementById('schedInputDate');
    if (dateInput) dateInput.value = dateStr;

    // Location & Plot
    const isGuinsorongan = (currentSelectedAdopter.location || currentSelectedAdopter.address || '').toLowerCase().includes('guinsorongan') || (currentSelectedAdopter.name || '').toLowerCase().includes('john sho');
    const locInput = document.getElementById('schedInputLocation');
    if (locInput) locInput.value = isGuinsorongan ? 'Brgy. Guinsorongan' : (currentSelectedAdopter.location || 'Catbalogan City');
    
    const plotInput = document.getElementById('schedInputPlot');
    if (plotInput) plotInput.value = 'Sector 1 (Plot 4-A)';

    const targetInput = document.getElementById('schedInputTarget');
    if (targetInput) targetInput.value = currentSelectedAdopter.treesCount || 10;

    const statusInput = document.getElementById('schedInputStatus');
    if (statusInput) statusInput.value = 'Scheduled';

    if (addScheduleVisitModal) addScheduleVisitModal.classList.remove('hidden');
  }

  function closeAddScheduleVisitModal() {
    if (addScheduleVisitModal) addScheduleVisitModal.classList.add('hidden');
  }

  document.getElementById('btnSchedAddVisit')?.addEventListener('click', openAddScheduleVisitModal);
  document.getElementById('profSchedEmptyAddBtn')?.addEventListener('click', openAddScheduleVisitModal);
  closeAddSchedModalBtn?.addEventListener('click', closeAddScheduleVisitModal);
  cancelAddSchedModalBtn?.addEventListener('click', closeAddScheduleVisitModal);

  addScheduleVisitForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentSelectedAdopter) return;

    const dateVal = document.getElementById('schedInputDate')?.value;
    const ctVal = document.getElementById('schedInputCaretaker')?.value;
    const statusVal = document.getElementById('schedInputStatus')?.value || 'Scheduled';
    const locVal = document.getElementById('schedInputLocation')?.value.trim() || 'Brgy. Guinsorongan';
    const plotVal = document.getElementById('schedInputPlot')?.value.trim() || 'Sector 1 (Plot 4-A)';
    const targetVal = parseInt(document.getElementById('schedInputTarget')?.value, 10) || currentSelectedAdopter.treesCount || 10;

    let displayDate = dateVal;
    if (dateVal) {
      const parts = dateVal.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        displayDate = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      }
    }

    const newVisit = {
      id: 'SCH-' + Date.now().toString().slice(-6),
      date: displayDate,
      rawDate: dateVal,
      loc: locVal,
      location: locVal,
      plot: plotVal,
      target: targetVal,
      count: targetVal,
      st: statusVal,
      status: statusVal,
      adopterId: currentSelectedAdopter.id,
      adopterName: currentSelectedAdopter.name
    };

    // Save into ATAMAN_caretakers_cache
    let caretakers = [];
    try {
      caretakers = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
    } catch(err) {}

    let ct = caretakers.find(c => String(c.id) === String(ctVal) || String(c.empId) === String(ctVal));
    if (!ct) {
      const { caretaker } = getAssignedCaretakerForAdopter(currentSelectedAdopter, currentProfileTrees);
      ct = caretaker;
      caretakers.push(ct);
    }

    if (!Array.isArray(ct.schedule)) ct.schedule = [];
    ct.schedule.push(newVisit);

    try {
      localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakers));
      if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyCaretakers === 'function') {
        window.ATAMAN_SYNC.notifyCaretakers(caretakers);
      }
    } catch(err) {}

    // Add milestone to timeline
    if (!Array.isArray(currentSelectedAdopter.timeline)) currentSelectedAdopter.timeline = [];
    currentSelectedAdopter.timeline.unshift({
      date: dateVal,
      title: '📅 Caretaker Monitoring Scheduled',
      desc: `Field visit scheduled by Caretaker ${ct.name} for ${targetVal} trees at ${plotVal}, ${locVal}.`
    });

    try {
      localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adoptersList));
    } catch(err) {}

    closeAddScheduleVisitModal();
    renderCaretakerSchedule(currentSelectedAdopter, currentProfileTrees);
    renderAdopterTimeline(currentSelectedAdopter);
    alert(`📅 Field monitoring visit scheduled for ${currentSelectedAdopter.name} on ${displayDate}!`);
  });

  // ----------------------------------------------------
  // MULTI-STEP WIZARD MODAL (+ Add Adopter)
  // ----------------------------------------------------
  // Per-tree quantity overrides (treeId -> count entered by user)
  let treeQuantities = {};

  function renderWizardStep(step) {
    currentWizardStep = step;

    [1, 2, 3].forEach(s => {
      const ind = document.getElementById('stepInd' + s);
      if (ind) {
        if (s === step) ind.classList.add('active');
        else ind.classList.remove('active');
      }

      const pane = document.getElementById('wizardStep' + s);
      if (pane) {
        if (s === step) pane.classList.remove('hidden');
        else pane.classList.add('hidden');
      }
    });

    if (step === 1) {
      wizardPrevBtn.style.display = 'none';
      wizardNextBtn.style.display = 'inline-flex';
      submitAddAdopterBtn.classList.add('hidden');
    } else if (step === 2) {
      wizardPrevBtn.style.display = 'inline-flex';
      wizardNextBtn.style.display = 'inline-flex';
      submitAddAdopterBtn.classList.add('hidden');
      renderTreeCheckboxes();
    } else if (step === 3) {
      wizardPrevBtn.style.display = 'inline-flex';
      wizardNextBtn.style.display = 'none';
      submitAddAdopterBtn.classList.remove('hidden');
      updateWizardConfirmationSummary();
    }
  }

  function getContactPersonValue() {
    const sel = document.getElementById('newContact');
    if (!sel || !sel.value) return '';
    const chosen = sel.options[sel.selectedIndex];
    if (chosen && chosen.dataset && chosen.dataset.name) {
      return chosen.dataset.name.trim();
    }
    if (window._selectedAdopterUser && window._selectedAdopterUser.name) {
      return window._selectedAdopterUser.name.trim();
    }
    return sel.value.trim();
  }

  function calcTotalsFromSelection() {
    const selectedTrees = allTreesList.filter(t => selectedTreeIds.includes(t.id) || selectedTreeIds.includes(String(t.id)));
    // Sum using per-tree overrides if set, else use the tree's registered treeCount
    const totalCount = selectedTrees.reduce((sum, t) => {
      const override = treeQuantities[t.id];
      return sum + (override !== undefined ? override : (parseInt(t.treeCount) || 1));
    }, 0);
    const rawFundInput = document.getElementById('newFundingInput')?.value;
    const totalFunding = rawFundInput !== undefined && rawFundInput !== '' ? Math.max(0, parseFloat(rawFundInput) || 0) : 0;
    return { selectedTrees, totalCount, totalFunding };
  }

  function updateWizardConfirmationSummary() {
    const { totalCount, totalFunding } = calcTotalsFromSelection();

    const contactName = getContactPersonValue() || 'Contact Person';

    document.getElementById('confirmName').textContent = document.getElementById('newName')?.value.trim() || 'ABC Foundation';
    document.getElementById('confirmType').textContent = document.getElementById('newType')?.value || 'Organization';
    document.getElementById('confirmContact').textContent = contactName;
    document.getElementById('confirmEmail').textContent = document.getElementById('newEmail')?.value.trim() || 'm.santos@company.com';
    document.getElementById('confirmTreesCount').textContent = totalCount.toLocaleString() + ' Trees' + (selectedTreeIds.length > 0 ? ` (${selectedTreeIds.length} record${selectedTreeIds.length === 1 ? '' : 's'})` : '');
    document.getElementById('confirmProjectArea').textContent = document.getElementById('newProject')?.value.trim() || 'Community Reforestation 2026';
    document.getElementById('confirmPeriod').textContent = document.getElementById('newStartDate')?.value || 'Aug 28, 2026';
    document.getElementById('confirmFunding').textContent = '₱' + totalFunding.toLocaleString();

    const thumbEl = document.getElementById('confirmPhotoThumb');
    const textEl = document.getElementById('confirmPhotoText');
    if (thumbEl && textEl) {
      if (currentAdopterPhotoData) {
        thumbEl.src = currentAdopterPhotoData;
        thumbEl.style.display = 'block';
        textEl.textContent = 'Photo attached ✓';
        textEl.style.color = '#15803d';
        textEl.style.fontWeight = '600';
      } else {
        thumbEl.style.display = 'none';
        textEl.textContent = 'None attached';
        textEl.style.color = '#64748b';
        textEl.style.fontWeight = 'normal';
      }
    }
  }

  function renderTreeCheckboxes() {
    if (!treeCheckboxList) return;
    loadSyncedTrees();
    const filter = (treeSearchInput?.value || '').toLowerCase().trim();

    const filteredTrees = allTreesList.filter(t => {
      const id = (t.id || '').toLowerCase();
      const common = (t.species?.common || (typeof t.species === 'string' ? t.species : '')).toLowerCase();
      const scientific = (t.species?.scientific || '').toLowerCase();
      const treeType = (t.treeType || t.species?.type || '').toLowerCase();
      const loc = (t.barangay ? `${t.barangay} ${t.municipality || ''}` : (t.location || '')).toLowerCase();
      const adopter = (t.sponsorName || t.adopter || '').toLowerCase();

      return !filter || 
        id.includes(filter) || 
        common.includes(filter) || 
        scientific.includes(filter) || 
        treeType.includes(filter) || 
        loc.includes(filter) || 
        adopter.includes(filter);
    });

    if (allTreesList.length === 0) {
      treeCheckboxList.innerHTML = `
        <div style="text-align: center; padding: 28px 16px; color: #64748b;">
          <div style="font-size: 26px; margin-bottom: 6px;">🌱</div>
          <strong style="color: #334155; font-size: 13.5px;">No trees registered yet in Trees Table</strong><br>
          <span style="font-size: 12px; color: #94a3b8;">Go to the <a href="admin-trees.html" style="color: #16a34a; font-weight: 600; text-decoration: underline;">Trees Table</a> to register new trees first.</span>
        </div>
      `;
      if (step3SelectedBadge) step3SelectedBadge.textContent = 'Selected: 0 trees';
      return;
    }

    if (filteredTrees.length === 0) {
      treeCheckboxList.innerHTML = `
        <div style="text-align: center; padding: 24px 16px; color: #64748b; font-size: 13px;">
          🔍 No trees match "<strong>${treeSearchInput?.value || ''}</strong>"
        </div>
      `;
      return;
    }

    treeCheckboxList.innerHTML = filteredTrees.map(t => {
      const isChecked = selectedTreeIds.includes(t.id);
      const checked = isChecked ? 'checked' : '';
      const common = t.species?.common || (typeof t.species === 'string' ? t.species : 'Native Tree');
      const scientific = t.species?.scientific || '';
      const registeredCount = parseInt(t.treeCount) || 1;
      const takenCount = parseInt(t.takenCount) || 0;
      const availCount = Math.max(1, registeredCount - takenCount);
      const defaultQty = Math.min(availCount, 10);
      // Use stored override quantity, or default to 10 (or remaining available if less)
      const qty = treeQuantities[t.id] !== undefined ? Math.min(availCount, treeQuantities[t.id]) : defaultQty;
      const treeType = t.treeType || t.species?.type || 'Native';
      const loc = t.barangay ? `Brgy. ${t.barangay}` : (t.location || 'Central Hub');
      const adopterName = t.sponsorName || t.adopter;
      const isAdopted = !!adopterName;

      return `
        <div class="tree-cb-item" data-tree-id="${t.id}" style="display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 9px; border: 1.5px solid ${isChecked ? '#86efac' : '#f1f5f9'}; background: ${isChecked ? '#f0fdf4' : '#fff'}; margin-bottom: 5px; transition: all 0.15s ease;">
          <input type="checkbox" value="${t.id}" ${checked} class="tree-cb-input" style="width: 17px; height: 17px; accent-color: #16a34a; cursor: pointer; margin-top: 3px; flex-shrink: 0;" />
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 4px;">
              <strong style="color: #0f172a; font-size: 13.5px;">${t.id}</strong>
              <span style="color: #334155; font-weight: 600; font-size: 13px;">— ${common}</span>
              ${scientific ? `<span style="color: #64748b; font-style: italic; font-size: 11.5px;">(${scientific})</span>` : ''}
              <span style="font-size: 11px; color: #16a34a; font-weight: 700; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1px 6px; border-radius: 4px;">
                🟢 ${availCount} of ${registeredCount} avail
              </span>
              ${isAdopted
                ? `<span style="padding: 2px 7px; font-size: 10.5px; font-weight: 700; border-radius: 10px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">🤝 ${adopterName}</span>`
                : ''
              }
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11.5px; color: #64748b;">
              <span style="color: #065f46; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1px 6px; border-radius: 4px; font-weight: 600;">${treeType}</span>
              ${t.age ? `<span>• Age: ${t.age}</span>` : ''}
              <span>• ${loc}</span>
            </div>
          </div>
          <!-- Qty input: only active when checked -->
          <div style="flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 3px;">
            <label style="font-size: 10.5px; color: #64748b; font-weight: 600; white-space: nowrap;">No. of Trees <span style="font-size: 9.5px; color: #16a34a;">(max ${availCount})</span></label>
            <input
              type="number"
              class="tree-qty-input"
              data-tree-id="${t.id}"
              data-max-avail="${availCount}"
              value="${qty}"
              min="1"
              max="${availCount}"
              ${isChecked ? '' : 'disabled'}
              style="width: 70px; padding: 4px 6px; border-radius: 6px; border: 1.5px solid ${isChecked ? '#86efac' : '#e2e8f0'}; font-size: 13px; font-weight: 700; color: ${isChecked ? '#166534' : '#94a3b8'}; background: ${isChecked ? '#f0fdf4' : '#f8fafc'}; text-align: center; outline: none;"
            />
          </div>
        </div>
      `;
    }).join('');

    // Attach checkbox change listeners
    document.querySelectorAll('.tree-cb-input').forEach(cb => {
      cb.addEventListener('change', () => {
        const val = cb.value;
        const row = cb.closest('.tree-cb-item');
        const qtyInput = row?.querySelector('.tree-qty-input');
        if (cb.checked) {
          if (!selectedTreeIds.includes(val)) selectedTreeIds.push(val);
          // Initialize qty if not already set
          if (treeQuantities[val] === undefined) {
            const tree = allTreesList.find(t => String(t.id) === String(val));
            const regCount = parseInt(tree?.treeCount) || 1;
            const tkCount = parseInt(tree?.takenCount) || 0;
            const remaining = Math.max(1, regCount - tkCount);
            treeQuantities[val] = Math.min(remaining, 10);
          }
          if (qtyInput) {
            qtyInput.disabled = false;
            qtyInput.value = treeQuantities[val];
            qtyInput.style.borderColor = '#86efac';
            qtyInput.style.color = '#166534';
            qtyInput.style.background = '#f0fdf4';
          }
          if (row) { row.style.borderColor = '#86efac'; row.style.background = '#f0fdf4'; }
        } else {
          selectedTreeIds = selectedTreeIds.filter(id => id !== val);
          if (qtyInput) {
            qtyInput.disabled = true;
            qtyInput.style.borderColor = '#e2e8f0';
            qtyInput.style.color = '#94a3b8';
            qtyInput.style.background = '#f8fafc';
          }
          if (row) { row.style.borderColor = '#f1f5f9'; row.style.background = '#fff'; }
        }
        updateLiveSummary();
      });
    });

    // Attach qty input change listeners (both input and change events)
    document.querySelectorAll('.tree-qty-input').forEach(inp => {
      const updateQty = () => {
        const treeId = inp.getAttribute('data-tree-id');
        const maxAvail = parseInt(inp.getAttribute('data-max-avail')) || 9999;
        const val = Math.min(maxAvail, Math.max(1, parseInt(inp.value) || 1));
        treeQuantities[treeId] = val;
        inp.value = val;
        updateLiveSummary();
      };
      inp.addEventListener('input', updateQty);
      inp.addEventListener('change', updateQty);
    });

    updateLiveSummary();
  }

  function syncTreeQuantitiesFromDOM() {
    document.querySelectorAll('.tree-cb-input:checked').forEach(cb => {
      const row = cb.closest('.tree-cb-item');
      const inp = row?.querySelector('.tree-qty-input');
      if (inp) {
        const maxAvail = parseInt(inp.getAttribute('data-max-avail')) || 9999;
        const val = Math.min(maxAvail, Math.max(1, parseInt(inp.value) || 1));
        treeQuantities[cb.value] = val;
      }
    });
  }

  const newFundingInputEl = document.getElementById('newFundingInput');
  if (newFundingInputEl) {
    newFundingInputEl.addEventListener('input', updateLiveSummary);
    newFundingInputEl.addEventListener('change', updateLiveSummary);
  }

  function updateLiveSummary() {
    const { totalCount, totalFunding } = calcTotalsFromSelection();

    // Update hidden inputs for submission
    const countInput = document.getElementById('newTreesCount');
    const fundingInput = document.getElementById('newFunding');
    if (countInput) countInput.value = totalCount;
    if (fundingInput) fundingInput.value = totalFunding;

    // Update the visible summary card
    const recs = document.getElementById('summaryRecords');
    const treesEl = document.getElementById('summaryTotalTrees');
    const fundEl = document.getElementById('summaryFunding');
    if (recs) recs.textContent = selectedTreeIds.length;
    if (treesEl) treesEl.textContent = totalCount.toLocaleString();
    if (fundEl) fundEl.textContent = '₱' + totalFunding.toLocaleString();

    // Update the badge
    if (step3SelectedBadge) {
      if (selectedTreeIds.length === 0) {
        step3SelectedBadge.textContent = 'Selected: 0 trees';
      } else {
        step3SelectedBadge.textContent = `${selectedTreeIds.length} record${selectedTreeIds.length === 1 ? '' : 's'} · ${totalCount.toLocaleString()} trees · ₱${totalFunding.toLocaleString()}`;
      }
    }
  }

  // ── Populate Adopter Dropdown from Registered Adopter Accounts ──
  let registeredAdoptersMap = new Map();

  function populateContactPersonDropdown() {
    populateAdopterDropdown();
  }

  function populateAdopterDropdown() {
    const sel = document.getElementById('newContact');
    if (!sel) return;
    const searchInp = document.getElementById('adopterSearchInput');
    const feedback = document.getElementById('adopterSelectFeedback');
    const badge = document.getElementById('adopterLinkedBadge');
    if (feedback) feedback.style.display = 'none';
    if (badge) badge.style.display = 'none';

    registeredAdoptersMap = new Map();

    function addAdopterCandidate(c, sourceKey) {
      if (!c) return;
      const em = (c.email || '').toLowerCase().trim();
      if (!em) return;

      // Filter: only users registered as Adopters (exclude admin, caretaker, staff, farmer)
      const roleRaw = String(c.role || '').toLowerCase().trim();
      const isAdmin = roleRaw.includes('admin');
      const isCaretaker = roleRaw.includes('care') || roleRaw.includes('farm') || roleRaw.includes('staff');
      if (isAdmin || isCaretaker) return;

      const isAdopter = !roleRaw || roleRaw === 'adopter' || roleRaw.includes('adopter') || sourceKey.includes('adopter');
      if (!isAdopter) return;

      const name = c.displayName || c.fullName || c.name || c.contactPerson || em.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, function(ch) { return ch.toUpperCase(); });
      const phone = c.phone || c.contact || c.contactNumber || '';
      const address = c.address || c.location || c.completeAddress || '';
      const type = c.type || c.adopterType || (c.organization ? 'Organization' : 'Individual');
      const org = c.organization || c.company || c.orgName || '';
      const uid = c.uid || c.id || c.userId || '';

      if (!registeredAdoptersMap.has(em)) {
        registeredAdoptersMap.set(em, {
          id: uid,
          name: name,
          email: em,
          phone: phone !== '—' ? phone : '',
          address: address !== '—' ? address : '',
          type: type,
          organization: org,
          status: c.status || 'Active',
          source: sourceKey
        });
      } else {
        const ex = registeredAdoptersMap.get(em);
        if (!ex.phone && phone && phone !== '—') ex.phone = phone;
        if (!ex.address && address && address !== '—') ex.address = address;
        if ((!ex.name || ex.name === em) && name) ex.name = name;
        if (!ex.organization && org) ex.organization = org;
        if ((!ex.id || String(ex.id).startsWith('ad-')) && uid) ex.id = uid;
        if (ex.type === 'Individual' && type && type !== 'Individual') ex.type = type;
      }
    }

    // 1. Scan registered users caches
    const userKeys = [
      'ATAMAN_registered_users', 'saplink_registered_users',
      'ATAMAN_users_cache', 'saplink_users_cache'
    ];
    userKeys.forEach(function(k) {
      try {
        const raw = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(raw)) raw.forEach(function(u) { addAdopterCandidate(u, k); });
      } catch (_) {}
    });

    // 2. Scan adopters cache
    const adopterKeys = ['ATAMAN_adopters_cache', 'saplink_adopters_cache'];
    adopterKeys.forEach(function(k) {
      try {
        const raw = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(raw)) raw.forEach(function(a) { addAdopterCandidate(a, k); });
      } catch (_) {}
    });

    // 3. Scan window.ATAMAN_DB local users if available
    if (window.ATAMAN_DB && typeof window.ATAMAN_DB.getLocalUsers === 'function') {
      try {
        const d = window.ATAMAN_DB.getLocalUsers();
        if (Array.isArray(d)) d.forEach(function(u) { addAdopterCandidate(u, 'firestore'); });
      } catch (_) {}
    }

    const adopters = Array.from(registeredAdoptersMap.values()).sort(function(a, b) { return a.name.localeCompare(b.name); });

    // Clear and build the select options
    sel.innerHTML = '';
    if (adopters.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = '— No registered Adopters found (register an adopter account first) —';
      sel.appendChild(opt);
      if (searchInp) searchInp.style.display = 'none';
      return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = `— Select a registered Adopter (${adopters.length} available) —`;
    sel.appendChild(placeholder);

    adopters.forEach(function(u) {
      const opt = document.createElement('option');
      opt.value = u.email;
      opt.dataset.email = u.email;
      opt.dataset.name = u.name;
      opt.dataset.phone = u.phone;
      opt.dataset.address = u.address;
      opt.dataset.type = u.type;
      opt.dataset.org = u.organization;
      opt.dataset.userId = u.id;
      const typeTag = u.type && u.type !== 'Individual' ? ` [${u.type}]` : '';
      opt.textContent = `${u.name}${typeTag} · ${u.email}`;
      sel.appendChild(opt);
    });

    // Enable instant live search if 3 or more adopters exist
    if (searchInp) {
      searchInp.style.display = adopters.length >= 3 ? 'block' : 'none';
      searchInp.value = '';
      searchInp.oninput = function() {
        const query = (searchInp.value || '').toLowerCase().trim();
        for (let i = 1; i < sel.options.length; i++) {
          const opt = sel.options[i];
          const match = !query ||
            opt.textContent.toLowerCase().includes(query) ||
            (opt.dataset.email || '').toLowerCase().includes(query) ||
            (opt.dataset.name || '').toLowerCase().includes(query);
          opt.hidden = !match;
          opt.style.display = match ? '' : 'none';
        }
      };
    }

    // Auto-populate when an Adopter is selected
    sel.onchange = function() {
      const chosenEmail = sel.value;
      const chosen = registeredAdoptersMap.get(chosenEmail);
      if (!chosen) {
        window._selectedAdopterUser = null;
        if (feedback) feedback.style.display = 'none';
        if (badge) badge.style.display = 'none';
        return;
      }

      window._selectedAdopterUser = chosen;

      // 1. Full Name / Organization Name
      const nameInp = document.getElementById('newName');
      if (nameInp) {
        nameInp.value = chosen.organization || chosen.name || '';
        nameInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 2. Email Address
      const emailInp = document.getElementById('newEmail');
      if (emailInp) {
        emailInp.value = chosen.email || '';
        emailInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 3. Contact Number
      const phoneInp = document.getElementById('newPhone');
      if (phoneInp) {
        phoneInp.value = chosen.phone || '';
        phoneInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 4. Complete Address
      const addressInp = document.getElementById('newAddress');
      if (addressInp) {
        addressInp.value = chosen.address || '';
        addressInp.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // 5. Adopter Type
      const typeSel = document.getElementById('newType');
      if (typeSel && chosen.type) {
        const matchOpt = Array.from(typeSel.options).find(function(o) { return o.value.toLowerCase() === chosen.type.toLowerCase(); });
        if (matchOpt) {
          typeSel.value = matchOpt.value;
        } else if (chosen.organization) {
          typeSel.value = 'Organization';
        } else {
          typeSel.value = 'Individual';
        }
        typeSel.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 6. Visual Confirmation & Account Link Badge
      if (feedback) {
        feedback.style.display = 'flex';
        const feedbackText = document.getElementById('adopterSelectFeedbackText');
        if (feedbackText) {
          feedbackText.textContent = `✓ Auto-filled and linked to registered account: ${chosen.name} (${chosen.email})`;
        }
      }
      if (badge) {
        badge.style.display = 'inline-block';
      }

      // Subtle pulse highlight on auto-populated inputs
      [nameInp, emailInp, phoneInp, addressInp, typeSel].forEach(function(el) {
        if (!el) return;
        el.style.transition = 'background-color 0.4s ease, border-color 0.4s ease';
        el.style.backgroundColor = '#f0fdf4';
        el.style.borderColor = '#86efac';
        setTimeout(function() {
          el.style.backgroundColor = '';
          el.style.borderColor = '';
        }, 1200);
      });
    };
  }

  if (openAddAdopterModalBtn) {
    openAddAdopterModalBtn.addEventListener('click', () => {
      selectedTreeIds = [];
      treeQuantities = {};
      window._selectedAdopterUser = null;
      if (treeSearchInput) treeSearchInput.value = '';
      const feedback = document.getElementById('adopterSelectFeedback');
      if (feedback) feedback.style.display = 'none';
      const badge = document.getElementById('adopterLinkedBadge');
      if (badge) badge.style.display = 'none';
      const searchInp = document.getElementById('adopterSearchInput');
      if (searchInp) searchInp.value = '';

      loadSyncedTrees();
      resetAdopterPhotoUpload();
      populateAdopterDropdown();
      renderWizardStep(1);
      addAdopterModal.classList.remove('hidden');
      updateLiveSummary();
    });
  }

  [closeAddModalBtn, cancelAddModalBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', () => addAdopterModal.classList.add('hidden'));
  });

  if (treeSearchInput) {
    treeSearchInput.addEventListener('input', renderTreeCheckboxes);
  }

  if (wizardNextBtn) {
    wizardNextBtn.addEventListener('click', () => {
      if (currentWizardStep === 1) {
        const nameVal = document.getElementById('newName')?.value.trim();
        const contactVal = getContactPersonValue();
        const emailVal = document.getElementById('newEmail')?.value.trim();

        const selVal = document.getElementById('newContact')?.value;
        if (!contactVal || !selVal) {
          alert('⚠️ Please select a registered Adopter from the dropdown.');
          document.getElementById('newContact')?.focus();
          return;
        }
        if (!nameVal) {
          alert('⚠️ Please enter an Organization or Individual Name.');
          document.getElementById('newName')?.focus();
          return;
        }
        if (!emailVal) {
          alert('⚠️ Please enter a valid Email Address.');
          document.getElementById('newEmail')?.focus();
          return;
        }
      }
      if (currentWizardStep === 2) {
        syncTreeQuantitiesFromDOM();
      }
      if (currentWizardStep < 3) {
        renderWizardStep(currentWizardStep + 1);
      }
    });
  }

  if (wizardPrevBtn) {
    wizardPrevBtn.addEventListener('click', () => {
      if (currentWizardStep > 1) {
        renderWizardStep(currentWizardStep - 1);
      }
    });
  }

  // Handle Form Submission
  async function handleSaveNewAdopter() {
    syncTreeQuantitiesFromDOM();
    const nameVal = document.getElementById('newName')?.value.trim();
    const contactVal = getContactPersonValue();
    const emailVal = document.getElementById('newEmail')?.value.trim();

    const selVal = document.getElementById('newContact')?.value;
    if (!contactVal || !selVal) {
      alert('⚠️ Missing Adopter selection. Returning to Step 1.');
      renderWizardStep(1);
      document.getElementById('newContact')?.focus();
      return;
    }

    if (!nameVal) {
      alert('⚠️ Missing Adopter Name. Returning to Step 1.');
      renderWizardStep(1);
      document.getElementById('newName')?.focus();
      return;
    }

    if (!emailVal) {
      alert('⚠️ Missing Email Address. Returning to Step 1.');
      renderWizardStep(1);
      document.getElementById('newEmail')?.focus();
      return;
    }

    const { selectedTrees, totalCount, totalFunding } = calcTotalsFromSelection();

    const adopterName = nameVal;
    const projectVal = document.getElementById('newProject')?.value.trim() || 'Community Reforestation 2026';

    const adopterTreesList = selectedTrees.map(t => {
      const common = t.species?.common || (typeof t.species === 'string' ? t.species : 'Native Tree');
      const loc = t.barangay ? `Brgy. ${t.barangay}, ${t.municipality || 'Catbalogan City'}` : (t.location || 'Catbalogan City');
      let health = 'Healthy';
      if (t.status === 'needs-care') health = 'Needs Care';
      else if (t.status === 'critical') health = 'Critical';
      else if (t.status === 'dead') health = 'Dead';
      const qty = treeQuantities[t.id] !== undefined ? treeQuantities[t.id] : (parseInt(t.treeCount) || 1);

      return {
        id: t.id,
        species: common,
        scientific: t.species?.scientific || '',
        location: loc,
        health: health,
        lastMon: t.dateAdded || formatDateDisplay(new Date().toISOString()),
        treeCount: qty,
        treeType: t.treeType || t.species?.type || 'Native'
      };
    });

    const inputAddress = document.getElementById('newAddress')?.value.trim() || 'Manila, Philippines';
    const isGuinsoronganAdopter = inputAddress.toLowerCase().includes('guinsorongan') || adopterName.toLowerCase().includes('john sho');

    const adopterLocation = isGuinsoronganAdopter ? 'Brgy. Guinsorongan' : (selectedTrees[0]?.barangay ? `Brgy. ${selectedTrees[0].barangay}` : 'Catbalogan City');
    const selectedAdopter = window._selectedAdopterUser;

    const newObj = {
      id: (selectedAdopter && selectedAdopter.id && String(selectedAdopter.id).startsWith('ad-')) ? selectedAdopter.id : ('ad-' + Date.now()),
      userId: selectedAdopter?.id || '',
      userEmail: emailVal,
      accountLinked: true,
      registeredAdopter: true,
      name: adopterName,
      type: document.getElementById('newType')?.value || (selectedAdopter?.type || 'Individual'),
      contactPerson: contactVal,
      adopterUser: contactVal,
      email: emailVal,
      phone: document.getElementById('newPhone')?.value.trim() || (selectedAdopter?.phone || '+63 917 000 0000'),
      address: inputAddress,
      regId: 'REG-2026-' + Math.floor(1000 + Math.random() * 9000),
      dateReg: formatDateDisplay(new Date().toISOString()),
      treesCount: totalCount,
      funding: totalFunding,
      customFunding: totalFunding > 0,
      startDate: document.getElementById('newStartDate')?.value || new Date().toISOString().slice(0, 10),
      expDate: 'Ongoing',
      status: 'Active',
      plan: document.getElementById('newPlan')?.value || 'Corporate Tree Sponsorship',
      location: adopterLocation,
      project: projectVal,
      treesCondition: { healthy: totalCount, care: 0, critical: 0, dead: 0 },
      fundingPaid: totalFunding,
      paymentStatus: totalFunding > 0 ? 'Fully Paid' : 'No Funding Entered',
      photo: currentAdopterPhotoData || '',
      treePhoto: currentAdopterPhotoData || '',
      payments: totalFunding > 0 ? [
        { date: formatDateDisplay(new Date().toISOString()), ref: 'INV-' + Math.floor(10000 + Math.random() * 90000), amount: totalFunding, status: 'Paid' }
      ] : [],
      treesList: adopterTreesList
    };

    // 1. UPDATE SELECTED TREES IN LOCAL CACHE & SYNC
    const perTreeRate = totalCount > 0 && totalFunding > 0 ? (totalFunding / totalCount) : 0;
    for (const treeId of selectedTreeIds) {
      const idx = allTreesList.findIndex(t => String(t.id) === String(treeId));
      if (idx >= 0) {
        const tObj = allTreesList[idx];
        const totalRegistered = parseInt(tObj.treeCount) || 1;
        const requestedQty = treeQuantities[treeId] !== undefined ? parseInt(treeQuantities[treeId]) : 1;

        // Sum trees taken by other existing adopters in system
        let otherTaken = 0;
        adoptersList.forEach(a => {
          if (a.id !== newObj.id && Array.isArray(a.treesList)) {
            a.treesList.forEach(item => {
              if (String(item.id) === String(treeId)) {
                otherTaken += Math.max(1, parseInt(item.treeCount) || 1);
              }
            });
          }
        });

        const newTaken = Math.min(totalRegistered, otherTaken + requestedQty);

        allTreesList[idx] = {
          ...tObj,
          sponsorName: adopterName,
          adopter: adopterName,
          adopterPhoto: currentAdopterPhotoData || tObj.adopterPhoto || '',
          photo: tObj.photo || currentAdopterPhotoData || '',
          takenCount: newTaken,
          customFunding: totalFunding > 0,
          fundingAmount: perTreeRate,
          totalFunding: newTaken * perTreeRate,
          project: projectVal,
          adoptedAt: new Date().toISOString(),
          ...(isGuinsoronganAdopter ? {
            barangay: 'Guinsorongan',
            municipality: 'Catbalogan City',
            lat: 11.759800,
            lng: 124.886100,
            location: 'Brgy. Guinsorongan, Catbalogan City'
          } : {})
        };
      }
    }

    // Persist updated trees in local cache & broadcast to trees table immediately
    localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(allTreesList));
    if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyTrees === 'function') {
      window.ATAMAN_SYNC.notifyTrees(allTreesList);
    }

    // 2. SAVE OR MERGE NEW ADOPTER IN LOCAL CACHE & BROADCAST IMMEDIATELY
    const normNewEmail = (emailVal || '').toLowerCase().trim();
    const normNewContact = (contactVal || '').toLowerCase().trim();
    const normNewName = (adopterName || '').toLowerCase().trim();

    const existingAdIdx = adoptersList.findIndex(a => {
      if (!a) return false;
      const em = (a.email || '').toLowerCase().trim();
      const nm = (a.name || '').toLowerCase().trim();
      const ct = (a.contactPerson || a.contact || '').toLowerCase().trim();
      return (normNewEmail && em === normNewEmail) ||
             (normNewContact && (nm === normNewContact || ct === normNewContact)) ||
             (normNewName && nm === normNewName);
    });

    if (existingAdIdx >= 0) {
      const prevId = adoptersList[existingAdIdx].id;
      newObj.id = prevId || newObj.id;
      adoptersList[existingAdIdx] = { ...adoptersList[existingAdIdx], ...newObj };
    } else {
      adoptersList.unshift(newObj);
    }
    harmonizeAdopterRecords(adoptersList);
    localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adoptersList));
    if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.notifyAdopters === 'function') {
      window.ATAMAN_SYNC.notifyAdopters(adoptersList);
    }

    // 3. UPDATE UI IMMEDIATELY (Instant Feedback!)
    renderAdoptersTable();
    updateSummaryCards();
    addAdopterModal.classList.add('hidden');
    const form = document.getElementById('addAdopterForm');
    if (form) form.reset();
    window._selectedAdopterUser = null;
    const feedbackReset = document.getElementById('adopterSelectFeedback');
    if (feedbackReset) feedbackReset.style.display = 'none';
    const badgeReset = document.getElementById('adopterLinkedBadge');
    if (badgeReset) badgeReset.style.display = 'none';
    const searchInpReset = document.getElementById('adopterSearchInput');
    if (searchInpReset) searchInpReset.value = '';
    resetAdopterPhotoUpload();
    selectedTreeIds = [];
    treeQuantities = {};
    updateLiveSummary();

    alert(`🎉 New adopter "${newObj.name}" added successfully! ${selectedTrees.length} tree record(s) (${totalCount.toLocaleString()} trees · ₱${totalFunding.toLocaleString()}) marked as adopted.`);

    // Register login credentials in Firebase Auth & users collection if password was provided
    const newPass = document.getElementById('newPassword')?.value?.trim();
    if (newPass && newPass.length >= 6 && emailVal) {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        try {
          let secondaryApp;
          try {
            secondaryApp = firebase.app('AdminUserCreator');
          } catch (_) {
            secondaryApp = firebase.initializeApp(firebase.app().options, 'AdminUserCreator');
          }
          const secondaryAuth = secondaryApp.auth();
          secondaryAuth.createUserWithEmailAndPassword(emailVal.toLowerCase(), newPass).then((cred) => {
            if (cred && cred.user && cred.user.updateProfile) {
              cred.user.updateProfile({ displayName: adopterName }).catch(() => {});
            }
            secondaryAuth.signOut().catch(() => {});
          }).catch(err => console.warn('Adopter Firebase Auth creation:', err));
        } catch (e) {
          console.warn('Adopter Firebase auth setup info:', e);
        }
      }
      const db = window.ATAMAN_FIRESTORE || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
      if (db) {
        db.collection('users').doc(emailVal.toLowerCase()).set({
          id: newObj.id,
          uid: newObj.id,
          name: adopterName,
          displayName: adopterName,
          email: emailVal.toLowerCase(),
          role: 'adopter',
          status: 'Active',
          createdAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
      try {
        let regUsers = JSON.parse(localStorage.getItem('ATAMAN_registered_users') || '[]');
        regUsers = [{ uid: newObj.id, email: emailVal.toLowerCase(), displayName: adopterName, role: 'adopter', password: newPass }, ...regUsers.filter(u => u.email !== emailVal.toLowerCase())];
        localStorage.setItem('ATAMAN_registered_users', JSON.stringify(regUsers));
      } catch (e) {}
    }

    // 4. Background DB sync (non-blocking, seamlessly queues offline)
    if (window.ATAMAN_DB) {
      if (typeof window.ATAMAN_DB.addAdopter === 'function') {
        window.ATAMAN_DB.addAdopter(newObj).catch(() => {});
      }
      for (const treeId of selectedTreeIds) {
        const tObj = allTreesList.find(t => String(t.id) === String(treeId));
        if (tObj && typeof window.ATAMAN_DB.updateTree === 'function') {
          window.ATAMAN_DB.updateTree(treeId, {
            sponsorName: adopterName,
            adopter: adopterName,
            takenCount: tObj.takenCount,
            project: projectVal,
            adoptedAt: tObj.adoptedAt
          }).catch(() => {});
        }
      }
    }
  }

  // Hook both direct button click and form submit
  // Wire up Step 2 Tree / Adopter Photo Upload Listeners
  const newAdopterPhotoInput = document.getElementById('newAdopterPhotoInput');
  const adopterPhotoUploadZone = document.getElementById('adopterPhotoUploadZone');
  const btnRemoveAdopterPhoto = document.getElementById('btnRemoveAdopterPhoto');

  if (adopterPhotoUploadZone && newAdopterPhotoInput) {
    adopterPhotoUploadZone.addEventListener('click', (e) => {
      if (e.target.closest('#btnRemoveAdopterPhoto')) return;
      newAdopterPhotoInput.click();
    });

    newAdopterPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) processAdopterPhotoFile(file);
    });

    adopterPhotoUploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      adopterPhotoUploadZone.style.borderColor = '#166534';
      adopterPhotoUploadZone.style.background = '#dcfce7';
    });

    adopterPhotoUploadZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      adopterPhotoUploadZone.style.borderColor = '#86efac';
      adopterPhotoUploadZone.style.background = '#f0fdf4';
    });

    adopterPhotoUploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      adopterPhotoUploadZone.style.borderColor = '#86efac';
      adopterPhotoUploadZone.style.background = '#f0fdf4';
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) processAdopterPhotoFile(file);
    });
  }

  if (btnRemoveAdopterPhoto) {
    btnRemoveAdopterPhoto.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      resetAdopterPhotoUpload();
    });
  }

  if (submitAddAdopterBtn) {
    submitAddAdopterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleSaveNewAdopter();
    });
  }

  const addAdopterForm = document.getElementById('addAdopterForm');
  if (addAdopterForm) {
    addAdopterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveNewAdopter();
    });
  }

  function updateSummaryCards() {
    const cardTotal = document.getElementById('cardTotalAdopters');
    if (cardTotal) cardTotal.textContent = adoptersList.length;

    const active = adoptersList.filter(a => a && a.status === 'Active').length;
    const cardActive = document.getElementById('cardActiveAdopters');
    if (cardActive) {
      cardActive.textContent = active;
      const activeSub = cardActive.parentElement?.querySelector('.sc-subtext');
      const activePct = adoptersList.length > 0 ? Math.round((active / adoptersList.length) * 100) : 0;
      if (activeSub) activeSub.textContent = `🟢 ${activePct}% active rate`;
    }

    const totalTrees = adoptersList.reduce((acc, a) => acc + (Number(a?.treesCount != null ? a.treesCount : (Array.isArray(a?.treesList) ? a.treesList.length : 0)) || 0), 0);
    const cardTrees = document.getElementById('cardTreesAdopted');
    if (cardTrees) {
      cardTrees.textContent = totalTrees.toLocaleString();
      const treesSub = cardTrees.parentElement?.querySelector('.sc-subtext');
      const projectsCount = new Set(adoptersList.filter(a => a?.project && (Number(a.treesCount) > 0 || (Array.isArray(a.treesList) && a.treesList.length > 0))).map(a => a.project)).size;
      if (treesSub) treesSub.textContent = `Across ${projectsCount} project${projectsCount === 1 ? '' : 's'}`;
    }

    const totalFund = adoptersList.reduce((acc, a) => acc + (Number(a?.funding != null ? a.funding : 0) || 0), 0);
    const cardFunding = document.getElementById('cardTotalFunding');
    if (cardFunding) cardFunding.textContent = '₱' + totalFund.toLocaleString();
    const cardFundingSub = document.getElementById('cardTotalFundingSub');
    if (cardFundingSub) cardFundingSub.textContent = '₱' + totalFund.toLocaleString() + ' collected';

    const expiring = adoptersList.filter(a => a && a.status === 'Expiring Soon').length;
    const cardExp = document.getElementById('cardExpiringSoon');
    if (cardExp) cardExp.textContent = expiring;

    const pending = adoptersList.filter(a => a && a.status === 'Pending').length;
    const cardPending = document.getElementById('cardPendingRenewal');
    if (cardPending) cardPending.textContent = pending;
  }

  // Export Button Handler
  document.getElementById('exportBtn')?.addEventListener('click', () => {
    alert('📥 Exporting Adopter Directory to CSV format...');
  });

  // Import Button Handler
  document.getElementById('importBtn')?.addEventListener('click', () => {
    alert('📤 Import Adopters feature: Select CSV/Excel file to import.');
  });

  // ── Multi-Tab & Real-Time Sync Event Listeners ──
  window.addEventListener('ATAMAN:adopters-updated', (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      adoptersList = e.detail;
      harmonizeAdopterRecords(adoptersList);
      renderAdoptersTable();
      updateSummaryCards();
    }
  });

  window.addEventListener('ATAMAN:trees-updated', (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      allTreesList = e.detail;
      renderTreeCheckboxes();
    }
  });

  // Fetch / Listen from Firestore
  if (window.ATAMAN_DB) {
    if (typeof window.ATAMAN_DB.getTrees === 'function') {
      window.ATAMAN_DB.getTrees().then(res => {
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          allTreesList = res.data;
          renderTreeCheckboxes();
        }
      });
    }

    if (typeof window.ATAMAN_DB.onTreesChange === 'function') {
      window.ATAMAN_DB.onTreesChange(trees => {
        if (Array.isArray(trees)) {
          allTreesList = trees;
          renderTreeCheckboxes();
        }
      });
    }

    if (typeof window.ATAMAN_DB.onAdoptersChange === 'function') {
      window.ATAMAN_DB.onAdoptersChange(stored => {
        if (Array.isArray(stored)) {
          if (stored.length > 0) {
            adoptersList = stored;
          } else {
            const local = (() => {
              try {
                const r = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
                return Array.isArray(r) && r.length > 0 ? r : null;
              } catch (_) { return null; }
            })();
            adoptersList = local || [...DEFAULT_ADOPTERS];
          }
          harmonizeAdopterRecords(adoptersList);
          renderAdoptersTable();
          updateSummaryCards();
        }
      });
    } else if (typeof window.ATAMAN_DB.getAdopters === 'function') {
      window.ATAMAN_DB.getAdopters().then(stored => {
        if (Array.isArray(stored) && stored.length > 0) {
          adoptersList = stored;
          harmonizeAdopterRecords(adoptersList);
          renderAdoptersTable();
          updateSummaryCards();
        }
      });
    }
  }

  // Initial Render (ensure date filters start empty so all adopters show)
  if (filterStartDate) filterStartDate.value = '';
  if (filterExpDate) filterExpDate.value = '';
  renderAdoptersTable();
  updateSummaryCards();
});
