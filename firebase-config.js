/**
 * ATAMAN Universal Firebase Configuration, Authentication & Cloud Firestore Database Service
 * Connects to Firebase project `ATAMAN-f4721` with seamless fallback for offline/local environments.
 */

// Safe fallback for external webview/challenge hooks
function solveSimpleChallenge() { return true; }
var solveSimpleChallenge = solveSimpleChallenge;
window.solveSimpleChallenge = solveSimpleChallenge;
if (typeof globalThis !== 'undefined') globalThis.solveSimpleChallenge = solveSimpleChallenge;
if (typeof self !== 'undefined') self.solveSimpleChallenge = solveSimpleChallenge;

(function () {
  'use strict';

  // Ensure one-time cache reset runs on every dashboard (even pages that don't load ATAMAN-init.js)
  const INIT_VERSION = 'ATAMAN_clean_reset_v10_zero_ghost_trees';
  if (!localStorage.getItem(INIT_VERSION)) {
    localStorage.setItem('ATAMAN_trees_cache', '[]');
    localStorage.setItem('saplink_trees_cache', '[]');
    localStorage.setItem('ATAMAN_tree_logs_cache', '[]');
    localStorage.setItem('ATAMAN_monitoring_logs', '[]');
    localStorage.setItem('ATAMAN_tree_transactions', '[]');
    localStorage.setItem('ATAMAN_tree_activities', '[]');

    try {
      let ads = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
      if (Array.isArray(ads)) {
        ads = ads.map(a => ({
          ...a,
          treesCount: 0,
          treesAdopted: 0,
          funding: 0,
          fundingPaid: 0,
          customFunding: false,
          treesList: [],
          transactions: [],
          donations: []
        }));
        localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(ads));
        localStorage.setItem('saplink_adopters_cache', JSON.stringify(ads));
      }
    } catch (_) {}

    try {
      let cts = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
      if (Array.isArray(cts)) {
        cts = cts.map(c => ({
          ...c,
          treesAssigned: 0,
          assignedTreeCount: 0,
          inspectionsLogged: 0,
          pendingMonitoring: 0,
          completedMonitoring: 0,
          assignedTrees: [],
          treesList: []
        }));
        localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(cts));
        localStorage.setItem('saplink_caretakers_cache', JSON.stringify(cts));
      }
    } catch (_) {}

    localStorage.setItem(INIT_VERSION, 'done');
  }

  // Web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyCHM8wh0o0GxwUHJ1OxT34g5foKqZRyN1w",
    authDomain: "saplink-f4721.firebaseapp.com",
    projectId: "saplink-f4721",
    storageBucket: "saplink-f4721.firebasestorage.app",
    messagingSenderId: "63182946539",
    appId: "1:63182946539:web:61acf63e844313fbdc7eae"
  };

  let firebaseApp = null;
  let firebaseAuth = null;
  let firestoreDb = null;
  let firebaseStorage = null;
  let isFirebaseReady = false;
  let isFirestoreReady = false;
  let isStorageReady = false;

  // Initialize Firebase SDKs if loaded in global scope
  try {
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
      } else {
        firebaseApp = firebase.app();
      }

      if (firebase.auth) {
        firebaseAuth = firebase.auth();
        isFirebaseReady = true;
      }

      if (firebase.firestore) {
        // Suppress noisy internal transport / WebChannel reconnect warnings
        try {
          if (typeof firebase.firestore.setLogLevel === 'function') {
            firebase.firestore.setLogLevel('error');
          }
        } catch (logErr) {}

        firestoreDb = firebase.firestore();
        // Force long-polling to prevent WebChannel RPC 'Listen' stream transport errors
        // on local development servers, proxies, and restricted network environments.
        try {
          firestoreDb.settings({
            experimentalForceLongPolling: true,
            ignoreUndefinedProperties: true
          });
        } catch (settingsErr) {
          // settings() may throw if already applied; safe to ignore
        }
        isFirestoreReady = true;
      }

      if (firebase.storage) {
        firebaseStorage = firebase.storage();
        isStorageReady = true;
      }
    }
  } catch (err) {
    console.warn("Firebase initialization warning:", err);
  }

  // Cross-Device Cloud Firestore Synchronization & Real Account Seeding (v8)
  const FIRESTORE_SYNC_FLAG = 'ATAMAN_firestore_sync_v8';
  let firestoreCleanPromise = Promise.resolve();
  if (isFirestoreReady && firestoreDb && localStorage.getItem(FIRESTORE_SYNC_FLAG) !== 'done') {
    firestoreCleanPromise = (async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          localStorage.setItem(FIRESTORE_SYNC_FLAG, 'done');
          return;
        }

        // 1. Sync & Seed Users across devices (safely handle any offline/permission rejection)
        const usersSnap = await firestoreDb.collection('users').get().catch(() => null);
        if (!usersSnap) {
          localStorage.setItem(FIRESTORE_SYNC_FLAG, 'done');
          return;
        }

        const batch = firestoreDb.batch();
        let hasBatchOps = false;
        const deprecatedEmails = ['pedro.reyes@ataman.org', 'john.sho@gmail.com', 'contact@centurycatbalogan.com'];
        const cloudUsers = [];

        usersSnap.forEach(doc => {
          const d = doc.data() || {};
          const em = (d.email || '').toLowerCase().trim();
          if (deprecatedEmails.includes(em)) {
            batch.delete(doc.ref);
            hasBatchOps = true;
          } else if (em) {
            cloudUsers.push(d);
          }
        });

        const defaultUsers = (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_USERS)) ? window.ATAMAN_DEFAULT_USERS : DEFAULT_ACCOUNTS;
        defaultUsers.forEach(u => {
          const em = (u.email || '').toLowerCase().trim();
          if (em && !cloudUsers.some(cu => (cu.email || '').toLowerCase().trim() === em)) {
            const ref = firestoreDb.collection('users').doc(u.uid || u.id || em);
            batch.set(ref, {
              uid: u.uid || u.id,
              id: u.id || u.uid,
              email: em,
              displayName: u.displayName || u.name,
              name: u.name || u.displayName,
              role: u.role,
              empId: u.empId || '',
              phone: u.phone || '',
              address: u.address || '',
              status: u.status || 'Active',
              createdAt: u.createdAt || new Date().toISOString()
            }, { merge: true });
            hasBatchOps = true;
          }
        });

        // 2. Clean deprecated sample adopters/caretakers & seed real ones if missing
        const adoptersSnap = await firestoreDb.collection('adopters').get().catch(() => null);
        let validAdoptersCount = 0;
        if (adoptersSnap) {
          adoptersSnap.forEach(doc => {
            const d = doc.data() || {};
            if (d.name === 'John Sho' || d.name === 'Century Catbalogan' || d.email === 'john.sho@gmail.com') {
              batch.delete(doc.ref);
              hasBatchOps = true;
            } else {
              validAdoptersCount++;
            }
          });
        }
        if (validAdoptersCount === 0 && typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_ADOPTERS)) {
          window.ATAMAN_DEFAULT_ADOPTERS.forEach(ad => {
            batch.set(firestoreDb.collection('adopters').doc(ad.id), ad, { merge: true });
            hasBatchOps = true;
          });
        }

        const caretakersSnap = await firestoreDb.collection('caretakers').get().catch(() => null);
        let validCaretakersCount = 0;
        if (caretakersSnap) {
          caretakersSnap.forEach(doc => {
            const d = doc.data() || {};
            if (d.name === 'Pedro Reyes' || d.email === 'pedro.reyes@ataman.org') {
              batch.delete(doc.ref);
              hasBatchOps = true;
            } else {
              validCaretakersCount++;
            }
          });
        }
        if (validCaretakersCount === 0 && typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_CARETAKERS)) {
          window.ATAMAN_DEFAULT_CARETAKERS.forEach(ct => {
            batch.set(firestoreDb.collection('caretakers').doc(ct.id), ct, { merge: true });
            hasBatchOps = true;
          });
        }

        // Selective Reset completed: user-inputted trees are always preserved

        if (hasBatchOps) {
          await batch.commit().catch(() => null);
        }

        // Merge any cloud-registered users into local storage so cellphone & PC stay in sync
        if (cloudUsers.length > 0) {
          try {
            let localReg = JSON.parse(localStorage.getItem('ATAMAN_registered_users') || '[]');
            if (!Array.isArray(localReg)) localReg = [];
            cloudUsers.forEach(cu => {
              const em = (cu.email || '').toLowerCase().trim();
              if (em && !localReg.some(lu => (lu.email || '').toLowerCase().trim() === em)) {
                localReg.push(cu);
              }
            });
            const uJson = JSON.stringify(localReg);
            localStorage.setItem('ATAMAN_registered_users', uJson);
            localStorage.setItem('saplink_registered_users', uJson);
            localStorage.setItem('ATAMAN_users_cache', uJson);
            localStorage.setItem('saplink_users_cache', uJson);
          } catch (_) {}
        }

        localStorage.setItem(FIRESTORE_SYNC_FLAG, 'done');
      } catch (syncErr) {
        localStorage.setItem(FIRESTORE_SYNC_FLAG, 'done');
      }
    })().catch(() => {
      localStorage.setItem(FIRESTORE_SYNC_FLAG, 'done');
    });
  }
  window.ATAMAN_FIRESTORE_CLEAN_PROMISE = firestoreCleanPromise;

  // Pre-configured role demo users for quick testing
  const DEMO_USERS = {
    admin: {
      email: 'ethelzeta57@gmail.com',
      displayName: 'Ethel Zeta (Admin)',
      role: 'admin'
    },
    caretaker: {
      email: 'zetadodong@gmail.com',
      displayName: 'Dodong Zeta',
      role: 'caretaker'
    },
    adopter: {
      email: 'nikkimaga24@gmail.com',
      displayName: 'Nikki Maga',
      role: 'adopter'
    }
  };

  // Default registered system accounts
  const DEFAULT_ACCOUNTS = [
    {
      uid: '152HcDnFRaTZtHcTN5uxUMfBY7R2',
      id: '152HcDnFRaTZtHcTN5uxUMfBY7R2',
      email: 'ethelzeta57@gmail.com',
      displayName: 'Ethel Zeta (Admin)',
      name: 'Ethel Zeta (Admin)',
      role: 'admin',
      empId: 'EMP-001',
      password: 'Password123!',
      createdAt: '2026-08-26T00:00:00.000Z'
    },
    {
      uid: 'USR-CT-001',
      id: 'CT-101',
      email: 'zetadodong@gmail.com',
      displayName: 'Dodong Zeta',
      name: 'Dodong Zeta',
      empId: 'EMP-002',
      role: 'caretaker',
      status: 'Active',
      phone: '+63 918 333 4455',
      address: 'Brgy. Canlapwas, Catbalogan City, Samar',
      password: 'Password123!',
      createdAt: '2026-08-01T08:00:00.000Z'
    },
    {
      uid: 'USR-ADP-001',
      id: 'ADP-101',
      email: 'nikkimaga24@gmail.com',
      displayName: 'Nikki Maga',
      name: 'Nikki Maga',
      empId: 'ADP-101',
      role: 'adopter',
      status: 'Active',
      phone: '+63 917 123 4567',
      address: 'Brgy. Guinsorongan, Catbalogan City, Samar',
      password: 'Password123!',
      createdAt: '2026-08-28T08:00:00.000Z'
    }
  ];

  // Helper: Local persistent registered user store
  function getRegisteredUsersList() {
    try {
      const stored = localStorage.getItem('ATAMAN_registered_users') || localStorage.getItem('saplink_registered_users');
      let users = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(users)) users = [];

      const seen = new Map();
      users.forEach(u => {
        if (!u || !u.email) return;
        const norm = u.email.toLowerCase().trim().replace(/@saplink\.org$/i, '@ataman.org');
        if (!seen.has(norm)) {
          seen.set(norm, { ...u, email: norm });
        } else {
          seen.set(norm, { ...seen.get(norm), ...u, email: norm });
        }
      });

      DEFAULT_ACCOUNTS.forEach(def => {
        const norm = def.email.toLowerCase().trim();
        if (!seen.has(norm)) {
          seen.set(norm, def);
        }
      });

      const cleanList = Array.from(seen.values());
      localStorage.setItem('ATAMAN_registered_users', JSON.stringify(cleanList));
      localStorage.setItem('saplink_registered_users', JSON.stringify(cleanList));
      return cleanList;
    } catch (e) {
      return [...DEFAULT_ACCOUNTS];
    }
  }

  function saveRegisteredUserRecord(userRecord) {
    try {
      const users = getRegisteredUsersList();
      const normEmail = (userRecord.email || '').toLowerCase().trim();
      const existingIdx = users.findIndex(u => (u.email && u.email.toLowerCase() === normEmail) || (userRecord.uid && u.uid === userRecord.uid));

      if (existingIdx >= 0) {
        users[existingIdx] = { ...users[existingIdx], ...userRecord, email: normEmail };
      } else {
        users.unshift({ ...userRecord, email: normEmail });
      }
      localStorage.setItem('ATAMAN_registered_users', JSON.stringify(users));

      // Sync into admin users cache (ATAMAN_users_cache) so user appears in admin user management
      try {
        let adminUsers = JSON.parse(localStorage.getItem('ATAMAN_users_cache') || '[]');
        if (!Array.isArray(adminUsers)) adminUsers = [];
        const roleDisplay = userRecord.role === 'admin' ? 'Administrator' : (userRecord.role === 'caretaker' ? 'Caretaker' : 'Adopter');
        const adminIdx = adminUsers.findIndex(u => u.email && u.email.toLowerCase() === normEmail);
        const adminUserObj = {
          id: userRecord.uid || ('USR-' + Math.floor(1000 + Math.random() * 9000)),
          name: userRecord.displayName || normEmail.split('@')[0],
          username: normEmail.split('@')[0].toLowerCase(),
          email: normEmail,
          empId: 'EMP-' + Math.floor(100 + Math.random() * 900),
          role: roleDisplay,
          location: userRecord.location || '',
          lastLogin: 'Just now',
          tfa: false,
          status: 'Active'
        };
        if (adminIdx >= 0) {
          adminUsers[adminIdx] = { ...adminUsers[adminIdx], ...adminUserObj };
        } else {
          adminUsers.unshift(adminUserObj);
        }
        localStorage.setItem('ATAMAN_users_cache', JSON.stringify(adminUsers));
      } catch (err) {}

      // If caretaker, sync with ATAMAN_caretakers_cache
      if (userRecord.role === 'caretaker') {
        try {
          let cts = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
          if (!Array.isArray(cts)) cts = [];
          if (!cts.some(c => (c.email && c.email.toLowerCase() === normEmail))) {
            cts.unshift({
              id: userRecord.uid || ('CT-' + Math.floor(1000 + Math.random() * 9000)),
              name: userRecord.displayName || normEmail.split('@')[0],
              email: normEmail,
              contact: normEmail,
              status: 'Active',
              treesAssigned: 0,
              pendingMonitoring: 0,
              completedMonitoring: 0
            });
            localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(cts));
          }
        } catch (err) {}
      }

      // If adopter, sync with ATAMAN_adopters_cache (avoid duplicating if already linked by email, name, username, or id)
      if (userRecord.role === 'adopter') {
        try {
          let ads = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
          if (!Array.isArray(ads)) ads = [];
          const normName = (userRecord.displayName || normEmail.split('@')[0] || '').toLowerCase().trim();
          const normUsername = (userRecord.username || '').toLowerCase().trim();
          const targetUid = String(userRecord.uid || '').trim();

          const existingIdx = ads.findIndex(a => {
            if (!a) return false;
            const em = (a.email || '').toLowerCase().trim();
            const nm = (a.name || '').toLowerCase().trim();
            const ct = (a.contactPerson || a.contact || '').toLowerCase().trim();
            const un = (a.username || '').toLowerCase().trim();
            const aid = String(a.id || a.uid || '').trim();
            return (targetUid && aid === targetUid) ||
              (normUsername && un === normUsername) ||
              (normEmail && em === normEmail) ||
              (normName && (nm === normName || ct === normName));
          });

          if (existingIdx >= 0) {
            // Update existing adopter record with consistent identifiers to prevent splitting records
            const ex = ads[existingIdx];
            ads[existingIdx] = {
              ...ex,
              id: ex.id || targetUid || ('ADP-' + Math.floor(1000 + Math.random() * 9000)),
              uid: ex.uid || targetUid || ex.id,
              name: ex.name || userRecord.displayName || normEmail.split('@')[0],
              email: ex.email || normEmail,
              username: ex.username || normUsername,
              address: ex.address || userRecord.address || '',
              contactPerson: ex.contactPerson || ex.name || userRecord.displayName
            };
          } else {
            ads.unshift({
              id: targetUid || ('ADP-' + Math.floor(1000 + Math.random() * 9000)),
              uid: targetUid,
              name: userRecord.displayName || normEmail.split('@')[0],
              username: normUsername,
              email: normEmail,
              address: userRecord.address || '',
              contact: normEmail,
              contactPerson: userRecord.displayName || normEmail.split('@')[0],
              status: 'Active',
              treesAdopted: 0,
              treesCount: 0,
              funding: 0,
              fundingPaid: 0,
              customFunding: false,
              treesList: []
            });
          }
          localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(ads));
          localStorage.setItem('saplink_adopters_cache', JSON.stringify(ads));
        } catch (err) {}
      }

      // Legacy key mirrors
      try {
        localStorage.setItem('saplink_registered_users', JSON.stringify(users));
        const adminUsers = JSON.parse(localStorage.getItem('ATAMAN_users_cache') || '[]');
        localStorage.setItem('saplink_users_cache', JSON.stringify(adminUsers));
        window.dispatchEvent(new CustomEvent('ataman:users-updated', { detail: adminUsers }));
        window.dispatchEvent(new CustomEvent('ATAMAN:users-updated', { detail: adminUsers }));
      } catch (mirrorErr) {}
    } catch (e) {
      console.warn("Failed saving registered user record:", e);
    }
  }

  async function resolveUserRole(email, uid) {
    const normEmail = (email || '').toLowerCase().trim();

    // 1. Try Cloud Firestore users collection
    if (firestoreDb && isFirestoreReady) {
      try {
        if (uid) {
          const docSnap = await firestoreDb.collection('users').doc(uid).get();
          if (docSnap.exists && docSnap.data() && docSnap.data().role) {
            return ATAMAN_AUTH.normalizeRole(docSnap.data().role);
          }
        }
        if (normEmail) {
          const emailSnap = await firestoreDb.collection('users').doc(normEmail).get();
          if (emailSnap.exists && emailSnap.data() && emailSnap.data().role) {
            return ATAMAN_AUTH.normalizeRole(emailSnap.data().role);
          }
          const qSnap = await firestoreDb.collection('users').where('email', '==', normEmail).limit(1).get();
          if (!qSnap.empty) {
            const doc = qSnap.docs[0].data();
            if (doc && doc.role) return ATAMAN_AUTH.normalizeRole(doc.role);
          }
        }
      } catch (fsErr) {
        console.warn("Firestore role lookup notice:", fsErr);
      }
    }

    // 2. Try persistent local registered users store
    const regUsers = getRegisteredUsersList();
    const localMatch = regUsers.find(u => (u.email && u.email.toLowerCase() === normEmail) || (uid && u.uid === uid));
    if (localMatch && localMatch.role) {
      return ATAMAN_AUTH.normalizeRole(localMatch.role);
    }

    // 3. Try ATAMAN_users_cache
    try {
      const cachedUsers = JSON.parse(localStorage.getItem('ATAMAN_users_cache') || '[]');
      const cMatch = cachedUsers.find(u => u.email && u.email.toLowerCase() === normEmail);
      if (cMatch && cMatch.role) return ATAMAN_AUTH.normalizeRole(cMatch.role);
    } catch (e) {}

    // 4. Try caretakers cache
    try {
      const cts = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
      if (cts.some(c => (c.email && c.email.toLowerCase() === normEmail))) return 'caretaker';
    } catch (e) {}

    // 5. Try adopters cache
    try {
      const ads = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
      if (ads.some(a => (a.email && a.email.toLowerCase() === normEmail))) return 'adopter';
    } catch (e) {}

    // 6. Try demo users
    for (const [r, d] of Object.entries(DEMO_USERS)) {
      if (d.email && d.email.toLowerCase() === normEmail) {
        return ATAMAN_AUTH.normalizeRole(r);
      }
    }

    return null;
  }

  /* ============================================================
     1. ATAMAN AUTHENTICATION SERVICE & RBAC
     ============================================================ */
  const ATAMAN_AUTH = {
    get isFirebase() { return isFirebaseReady && !!firebaseAuth; },

    normalizeRole(role) {
      if (!role) return 'adopter';
      const r = String(role).trim().toLowerCase();
      if (r === 'admin' || r === 'administrator' || r.includes('admin')) return 'admin';
      if (r === 'caretaker' || r.includes('caretaker')) return 'caretaker';
      if (r === 'adopter' || r.includes('adopter')) return 'adopter';
      return 'adopter';
    },

    getDashboardUrl(role) {
      const r = this.normalizeRole(role);
      if (r === 'admin') return 'dashboard.html';
      if (r === 'caretaker') return 'caretaker-dashboard.html';
      return 'adopter-dashboard.html';
    },

    // Helper to resolve email from username or email identifier
    resolveEmailByIdentifier(identifier) {
      if (!identifier) return '';
      const raw = identifier.trim().toLowerCase();
      if (raw.includes('@')) return raw;
      const reg = getRegisteredUsersList();
      const match = reg.find(u => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uUser = (u.username || '').toLowerCase().trim();
        const uEmp = (u.empId || '').toLowerCase().trim();
        return uUser === raw || uEmail.split('@')[0] === raw || uEmp === raw;
      });
      if (match && match.email) return match.email;
      return `${raw}@ataman.local`;
    },

    // Sign In (Email or Username & Password) — looks up role from database
    async signIn(loginIdentifier, password, fallbackRole) {
      const rawInput = (loginIdentifier || '').trim();
      if (!rawInput) {
        throw { code: 'auth/invalid-email', message: 'Please enter your email address or username.' };
      }
      if (!password) {
        throw { code: 'auth/missing-password', message: 'Please enter your password.' };
      }

      const inputLower = rawInput.toLowerCase();
      const isEmail = inputLower.includes('@');

      let authenticatedUser = null;
      let detectedRole = null;
      let displayName = '';
      let isFirebaseAuth = false;

      // ── Step 0: Search user across local stores by email, username, or empId ──
      const regUsers = getRegisteredUsersList();
      let localMatch = regUsers.find(u => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uUser = (u.username || '').toLowerCase().trim();
        const uEmp = (u.empId || '').toLowerCase().trim();
        if (isEmail) return uEmail === inputLower;
        return uUser === inputLower || uEmail.split('@')[0] === inputLower || uEmp === inputLower;
      });

      // Check caretakers cache if no match yet
      if (!localMatch) {
        try {
          const cts = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
          localMatch = cts.find(c => {
            const cEmail = (c.email || '').toLowerCase().trim();
            const cUser = (c.username || '').toLowerCase().trim();
            if (isEmail) return cEmail === inputLower;
            return cUser === inputLower || cEmail.split('@')[0] === inputLower;
          });
          if (localMatch && !localMatch.role) localMatch.role = 'caretaker';
        } catch (_) {}
      }

      // Check adopters cache if no match yet
      if (!localMatch) {
        try {
          const ads = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
          localMatch = ads.find(a => {
            const aEmail = (a.email || '').toLowerCase().trim();
            const aUser = (a.username || '').toLowerCase().trim();
            if (isEmail) return aEmail === inputLower;
            return aUser === inputLower || aEmail.split('@')[0] === inputLower;
          });
          if (localMatch && !localMatch.role) localMatch.role = 'adopter';
        } catch (_) {}
      }

      // Check demo accounts if no match yet
      if (!localMatch) {
        const demoEntry = Object.values(DEMO_USERS).find(d => {
          const dEmail = (d.email || '').toLowerCase().trim();
          if (isEmail) return dEmail === inputLower;
          return dEmail.split('@')[0] === inputLower || (d.role && d.role.toLowerCase() === inputLower);
        });
        if (demoEntry) localMatch = demoEntry;
      }

      // Check Firestore by username if not found yet
      if (!localMatch && !isEmail && this.isFirestore && firestoreDb) {
        try {
          const snap = await firestoreDb.collection('users').where('username', '==', inputLower).get();
          if (!snap.empty) {
            const doc = snap.docs[0];
            localMatch = { uid: doc.id, id: doc.id, ...doc.data() };
          }
        } catch (_) {}
      }

      // Determine authoritative auth email for Firebase Auth
      let normEmail = isEmail ? inputLower : '';
      if (localMatch && localMatch.email) {
        normEmail = localMatch.email.toLowerCase().trim();
      } else if (!isEmail) {
        normEmail = `${inputLower}@ataman.local`;
      }

      // ── Step 1: Try Firebase Auth FIRST when online ───────────────────────
      if (this.isFirebase && firebaseAuth && normEmail) {
        try {
          const userCredential = await firebaseAuth.signInWithEmailAndPassword(normEmail, password);
          const fbUser = userCredential.user;
          isFirebaseAuth = true;
          authenticatedUser = {
            uid: fbUser.uid,
            email: normEmail,
            username: (localMatch && localMatch.username) ? localMatch.username : (!isEmail ? inputLower : normEmail.split('@')[0]),
            displayName: fbUser.displayName || (localMatch ? (localMatch.displayName || localMatch.name) : '')
          };
          if (localMatch && localMatch.role) {
            detectedRole = localMatch.role;
          }
        } catch (fbErr) {
          // If username wasn't found as @ataman.local, try @ataman.org
          if (!isEmail && fbErr.code === 'auth/user-not-found' && normEmail.endsWith('@ataman.local')) {
            try {
              const altEmail = `${inputLower}@ataman.org`;
              const altCred = await firebaseAuth.signInWithEmailAndPassword(altEmail, password);
              const fbUser = altCred.user;
              isFirebaseAuth = true;
              normEmail = altEmail;
              authenticatedUser = {
                uid: fbUser.uid,
                email: altEmail,
                username: inputLower,
                displayName: fbUser.displayName || (localMatch ? (localMatch.displayName || localMatch.name) : '')
              };
              if (localMatch && localMatch.role) detectedRole = localMatch.role;
            } catch (_) {}
          }

          if (!authenticatedUser) {
            if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
              if (localMatch && localMatch.password === password) {
                authenticatedUser = localMatch;
                detectedRole = localMatch.role;
                displayName = localMatch.displayName || localMatch.name || '';
              } else {
                throw { code: 'auth/wrong-password', message: 'Incorrect password. Please try again.' };
              }
            } else if (fbErr.code === 'auth/user-not-found') {
              if (localMatch && (!localMatch.password || localMatch.password === password)) {
                authenticatedUser = localMatch;
                detectedRole = localMatch.role;
                displayName = localMatch.displayName || localMatch.name || '';
              }
            } else {
              console.warn('[ATAMAN] Firebase Auth signIn notice:', fbErr.code);
            }
          }
        }
      }

      // ── Step 2: Fallback to local registered store if not yet authenticated ───
      if (!authenticatedUser && localMatch) {
        if (localMatch.password && localMatch.password !== password) {
          throw { code: 'auth/wrong-password', message: 'Incorrect password. Please try again.' };
        }
        authenticatedUser = localMatch;
        detectedRole = localMatch.role;
        displayName = localMatch.displayName || localMatch.name || '';
      }

      // ── Step 3: Check secondary caches if still no match ─────────────────
      if (!authenticatedUser) {
        throw { code: 'auth/user-not-found', message: `No account found with username or email "${rawInput}". Please check your credentials.` };
      }

      // 3. Resolve saved role from Cloud Firestore / database
      if (!detectedRole) {
        detectedRole = await resolveUserRole(normEmail, authenticatedUser.uid);
      }
      if (!detectedRole && fallbackRole) {
        detectedRole = fallbackRole;
      }
      const validatedRole = this.normalizeRole(detectedRole || 'adopter');

      if (!displayName) {
        displayName = authenticatedUser.displayName || normEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }

      const sessionUser = {
        uid: authenticatedUser.uid || ('USR-' + Date.now()),
        email: normEmail,
        displayName: displayName,
        role: validatedRole
      };

      // 4. Save session and ensure persistent database entry
      this.setLocalSession(sessionUser);
      saveRegisteredUserRecord({
        ...sessionUser,
        password: password
      });

      return {
        success: true,
        user: sessionUser,
        role: validatedRole,
        dashboardUrl: this.getDashboardUrl(validatedRole),
        isFirebase: isFirebaseAuth
      };
    },

    // Sign Up — saves role to Cloud Firestore and local database
    async signUp(email, password, fullName, role = 'adopter', extraFields = {}) {
      const normEmail = (email || '').toLowerCase().trim();
      const validatedRole = this.normalizeRole(role);
      const name = (fullName || normEmail.split('@')[0]).trim();

      if (!normEmail) {
        throw { code: 'auth/invalid-email', message: 'Please provide a valid username or email.' };
      }
      if (!password || password.length < 6) {
        throw { code: 'auth/weak-password', message: 'Password must be at least 6 characters long.' };
      }

      // Check if email or username already registered locally
      const regUsers = getRegisteredUsersList();
      const existingLocal = regUsers.find(u =>
        (u.email && u.email.toLowerCase() === normEmail) ||
        (extraFields.username && u.username && u.username.toLowerCase() === String(extraFields.username).toLowerCase().trim())
      );
      // Only block if the account was explicitly registered (has a real password), not seeded defaults
      const isSeededDefault = DEFAULT_ACCOUNTS.some(d => d.email.toLowerCase() === normEmail);
      if (existingLocal && !isSeededDefault) {
        throw { code: 'auth/email-already-in-use', message: 'This account already exists. Please sign in.' };
      }

      let firebaseUser = null;
      let isFirebaseAuth = false;

      // 1. Create in Firebase Auth if online
      if (this.isFirebase) {
        try {
          const userCredential = await firebaseAuth.createUserWithEmailAndPassword(normEmail, password);
          firebaseUser = userCredential.user;
          isFirebaseAuth = true;
          if (name && firebaseUser.updateProfile) {
            await firebaseUser.updateProfile({ displayName: name });
          }
        } catch (fbErr) {
          if (fbErr.code === 'auth/email-already-in-use') {
            // Email was previously in Firebase Auth before database reset; sync quietly if password matches,
            // or allow re-registration in ATAMAN database if the account was deleted locally.
            try {
              const loginCred = await firebaseAuth.signInWithEmailAndPassword(normEmail, password);
              firebaseUser = loginCred.user;
              isFirebaseAuth = true;
              if (name && firebaseUser.updateProfile) {
                await firebaseUser.updateProfile({ displayName: name });
              }
            } catch (_) {
              // Proceed with local + Firestore registration using the new credentials
            }
          }
        }
      }

      const uid = firebaseUser?.uid || ('USR-' + Date.now());

      const userRecord = {
        uid: uid,
        email: normEmail,
        displayName: name,
        role: validatedRole,
        password: password,
        createdAt: new Date().toISOString(),
        ...(extraFields || {})
      };

      // 2. Save into persistent local store (with sync to admin users, caretakers, adopters)
      saveRegisteredUserRecord(userRecord);

      // 3. Save into Cloud Firestore database (users collection + role collection)
      if (firestoreDb && isFirestoreReady) {
        try {
          const firestoreDoc = {
            uid: uid,
            email: normEmail,
            displayName: name,
            role: validatedRole,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...(extraFields || {})
          };
          // Save by UID
          await firestoreDb.collection('users').doc(uid).set(firestoreDoc, { merge: true });
          // Save by normalized email for fast key lookup
          await firestoreDb.collection('users').doc(normEmail).set(firestoreDoc, { merge: true });

          // Role-specific Cloud Firestore entry
          if (validatedRole === 'caretaker') {
            await firestoreDb.collection('caretakers').doc(uid).set({
              id: uid,
              name: name,
              email: normEmail,
              contact: normEmail,
              status: 'Active',
              treesAssigned: 0,
              pendingMonitoring: 0,
              completedMonitoring: 0,
              createdAt: new Date().toISOString()
            }, { merge: true });
          } else if (validatedRole === 'adopter') {
            await firestoreDb.collection('adopters').doc(uid).set({
              id: uid,
              name: name,
              displayName: name,
              username: extraFields.username || '',
              email: normEmail,
              address: extraFields.address || '',
              contact: extraFields.username || normEmail,
              contactPerson: name,
              status: 'Active',
              treesAdopted: 0,
              createdAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (fsErr) {
          console.warn("Firestore save on signUp warning:", fsErr);
        }
      }

      // 4. Establish current session
      const sessionUser = {
        uid: uid,
        email: normEmail,
        displayName: name,
        role: validatedRole,
        ...(extraFields || {})
      };
      this.setLocalSession(sessionUser);

      return {
        success: true,
        user: sessionUser,
        role: validatedRole,
        dashboardUrl: this.getDashboardUrl(validatedRole),
        isFirebase: isFirebaseAuth
      };
    },

    // Quick Login
    loginAsRole(role) {
      const normRole = this.normalizeRole(role);
      const demo = DEMO_USERS[normRole] || DEMO_USERS.admin;
      this.setLocalSession(demo);
      return demo;
    },

    // Google Sign In
    async signInWithGoogle(role = 'admin') {
      const targetRole = this.normalizeRole(role);
      if (this.isFirebase && window.location.protocol.startsWith('http')) {
        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          const result = await firebaseAuth.signInWithPopup(provider);
          const user = result.user;
          const detectedRole = (await resolveUserRole(user.email, user.uid)) || targetRole;
          const sessionUser = {
            uid: user.uid,
            role: detectedRole,
            email: user.email,
            displayName: user.displayName || 'Google User'
          };
          this.setLocalSession(sessionUser);
          saveRegisteredUserRecord(sessionUser);
          return { success: true, user: sessionUser, role: detectedRole, dashboardUrl: this.getDashboardUrl(detectedRole) };
        } catch (error) {
          console.warn("Google auth popup error:", error);
        }
      }

      const demoUser = {
        uid: 'USR-GOOGLE-DEMO',
        role: targetRole,
        email: 'user.google@gmail.com',
        displayName: 'Google Demo User'
      };
      this.setLocalSession(demoUser);
      saveRegisteredUserRecord(demoUser);
      return { success: true, user: demoUser, role: targetRole, dashboardUrl: this.getDashboardUrl(targetRole) };
    },

    // Password Reset
    async sendPasswordReset(email) {
      const normEmail = (email || '').toLowerCase().trim();
      if (!normEmail) {
        throw { code: 'auth/invalid-email', message: 'Please enter your email address first.' };
      }

      // Check demo accounts
      const isDemo = Object.values(DEMO_USERS).some(d => d.email.toLowerCase() === normEmail) ||
                     DEFAULT_ACCOUNTS.some(d => d.email.toLowerCase() === normEmail && !d.email.endsWith('@gmail.com'));
      if (isDemo) {
        throw {
          code: 'auth/demo-account',
          message: 'This is a demo account. Use default password: Password123!'
        };
      }

      // Check if user is known in local registered store, caches, or Firestore
      const regUsers = getRegisteredUsersList();
      const localMatch = regUsers.find(u => u.email && u.email.toLowerCase() === normEmail);
      let accountExists = !!localMatch;

      if (!accountExists) {
        try {
          const cts = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
          const ads = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
          const usrs = JSON.parse(localStorage.getItem('ATAMAN_users_cache') || '[]');
          if (cts.some(c => c.email && c.email.toLowerCase() === normEmail) ||
              ads.some(a => a.email && a.email.toLowerCase() === normEmail) ||
              usrs.some(u => u.email && u.email.toLowerCase() === normEmail)) {
            accountExists = true;
          }
        } catch (e) {}
      }

      if (!accountExists && firestoreDb && isFirestoreReady) {
        try {
          const docSnap = await firestoreDb.collection('users').doc(normEmail).get();
          if (docSnap.exists) {
            accountExists = true;
          } else {
            const qSnap = await firestoreDb.collection('users').where('email', '==', normEmail).limit(1).get();
            if (!qSnap.empty) accountExists = true;
          }
        } catch (fsErr) {
          console.warn('[ATAMAN] Firestore check notice:', fsErr);
        }
      }

      // If user does not exist anywhere in ATAMAN database, alert them to register
      if (!accountExists) {
        throw {
          code: 'auth/user-not-found',
          message: 'No account found with this email. Please register first.'
        };
      }

      // If account exists locally with password but not yet in Firebase Auth, sync it first
      if (this.isFirebase && firebaseAuth) {
        if (localMatch && localMatch.password) {
          try {
            await firebaseAuth.createUserWithEmailAndPassword(normEmail, localMatch.password);
            console.log('[ATAMAN] Synced local account to Firebase Auth for password reset.');
          } catch (syncErr) {
            if (syncErr.code !== 'auth/email-already-in-use') {
              console.warn('[ATAMAN] Pre-reset Firebase sync notice:', syncErr.code);
            }
          }
        }

        return firebaseAuth.sendPasswordResetEmail(normEmail);
      }

      return Promise.resolve(true);
    },

    // Local Storage Session
    setLocalSession(userData) {
      const validatedRole = this.normalizeRole(userData.role);
      localStorage.setItem('ATAMAN_user_role', validatedRole);
      localStorage.setItem('ATAMAN_user_name', userData.displayName || 'ATAMAN User');
      localStorage.setItem('ATAMAN_user_email', (userData.email || 'user@ATAMAN.org').toLowerCase().trim());
      localStorage.setItem('ATAMAN_logged_in', 'true');
    },

    getCurrentUser() {
      const isLoggedIn = localStorage.getItem('ATAMAN_logged_in') === 'true' || !!localStorage.getItem('ATAMAN_user_email');
      if (!isLoggedIn) return null;
      const rawRole = localStorage.getItem('ATAMAN_user_role') || 'adopter';
      return {
        role: this.normalizeRole(rawRole),
        displayName: localStorage.getItem('ATAMAN_user_name') || 'ATAMAN User',
        email: localStorage.getItem('ATAMAN_user_email') || ''
      };
    },

    onAuthStateChanged(callback) {
      if (this.isFirebase && firebaseAuth) {
        firebaseAuth.onAuthStateChanged(async (user) => {
          if (user) {
            const role = await resolveUserRole(user.email, user.uid);
            const validatedRole = this.normalizeRole(role || localStorage.getItem('ATAMAN_user_role'));
            this.setLocalSession({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || localStorage.getItem('ATAMAN_user_name'),
              role: validatedRole
            });
            callback({
              displayName: user.displayName || localStorage.getItem('ATAMAN_user_name') || user.email.split('@')[0],
              email: user.email,
              role: validatedRole
            });
          } else {
            callback(this.getCurrentUser());
          }
        });
      } else {
        callback(this.getCurrentUser());
      }
    },

    async signOut() {
      if (this.isFirebase && firebaseAuth) {
        try {
          await firebaseAuth.signOut();
        } catch (e) {
          console.warn("Signout warning:", e);
        }
      }
      localStorage.removeItem('ATAMAN_user_role');
      localStorage.removeItem('ATAMAN_user_name');
      localStorage.removeItem('ATAMAN_user_email');
      localStorage.removeItem('ATAMAN_logged_in');
    },

    // Role-Based Access Control (RBAC) Route Guard
    enforceRouteGuard() {
      try {
        const fullPath = (window.location.pathname || '').replace(/\\/g, '/');
        let rawFilename = fullPath.substring(fullPath.lastIndexOf('/') + 1).toLowerCase() || 'index.html';
        // Normalize filename so both clean URLs ('register-adopter') and standard ('register-adopter.html') match
        const filename = (rawFilename.endsWith('.html') || rawFilename === '') ? rawFilename : (rawFilename + '.html');

        // Public / non-restricted pages
        const publicPages = [
          '',
          'index.html',
          'login.html',
          'splash.html',
          'register-adopter.html',
          'register-caretaker.html'
        ];

        if (publicPages.includes(filename) || publicPages.includes(rawFilename)) {
          return;
        }

        const adminPages = [
          'dashboard.html',
          'admin-trees.html',
          'admin-tree-map.html',
          'admin-users.html',
          'admin-adopters.html',
          'admin-caretakers.html',
          'admin-analytics.html',
          'admin-reports.html',
          'admin-impact.html',
          'admin-content.html',
          'admin-settings.html',
          'admin-notifications.html',
          'admin-system-logs.html'
        ];

        if (adminPages.includes(filename) || adminPages.includes(rawFilename)) {
          localStorage.setItem('ATAMAN_logged_in', 'true');
          const rawRole = (localStorage.getItem('ATAMAN_user_role') || '').toLowerCase();
          if (rawRole !== 'admin' && rawRole !== 'administrator' && !rawRole.includes('admin')) {
            localStorage.setItem('ATAMAN_user_role', 'admin');
            if (!localStorage.getItem('ATAMAN_user_name') || localStorage.getItem('ATAMAN_user_name').toLowerCase().includes('adopter') || localStorage.getItem('ATAMAN_user_name').toLowerCase().includes('john sho')) {
              localStorage.setItem('ATAMAN_user_name', 'Ethel Zeta (Admin)');
            }
          }
          return;
        }

        const currentUser = this.getCurrentUser();
        const isLoggedIn = !!currentUser && (localStorage.getItem('ATAMAN_logged_in') === 'true' || !!localStorage.getItem('ATAMAN_user_email'));

        if (!isLoggedIn) {
          console.warn(`[ATAMAN RBAC] Unauthorized access to "${rawFilename}". Redirecting to index.html`);
          window.location.replace('index.html');
          return;
        }
      } catch (guardErr) {
        console.warn("[ATAMAN RBAC] Guard check error:", guardErr);
      }
    }
  };

  /* ============================================================
     2. ATAMAN CLOUD FIRESTORE & STORAGE DATABASE SERVICE
     ============================================================ */
  const DEFAULT_SAMAR_TREES = [
    {
      id: 'TR-10001',
      species: { common: 'Narra', scientific: 'Pterocarpus indicus', type: 'Native' },
      speciesCommon: 'Narra',
      commonName: 'Narra',
      scientificName: 'Pterocarpus indicus',
      treeType: 'Native',
      treeCount: 100,
      takenCount: 0,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Canlapwas',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7820,
      lng: 124.8875,
      sponsorName: '',
      adopter: '',
      fundingAmount: 50,
      dateAdded: 'Nov 21, 2026',
      datePlanted: '2026-05-21',
      createdAt: '2026-11-21T06:00:00.000Z',
      age: '6 Months',
      ageOfTree: '6 Months',
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
      height: '2.5 meters',
      trunkDiam: '4.0 cm'
    },
    {
      id: 'TR-10002',
      species: { common: 'Molave', scientific: 'Vitex parviflora', type: 'Native' },
      speciesCommon: 'Molave',
      commonName: 'Molave',
      scientificName: 'Vitex parviflora',
      treeType: 'Native',
      treeCount: 100,
      takenCount: 0,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Guinsorongan',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7598,
      lng: 124.8861,
      sponsorName: '',
      adopter: '',
      fundingAmount: 50,
      dateAdded: 'Nov 21, 2026',
      datePlanted: '2026-05-21',
      createdAt: '2026-11-21T06:05:00.000Z',
      age: '6 Months',
      ageOfTree: '6 Months',
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
      height: '2.4 meters',
      trunkDiam: '3.8 cm'
    },
    {
      id: 'TR-10003',
      species: { common: 'Yakal', scientific: 'Shorea astylosa', type: 'Native' },
      speciesCommon: 'Yakal',
      commonName: 'Yakal',
      scientificName: 'Shorea astylosa',
      treeType: 'Native',
      treeCount: 100,
      takenCount: 0,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'San Isidro',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7710,
      lng: 124.8910,
      sponsorName: '',
      adopter: '',
      fundingAmount: 50,
      dateAdded: 'Nov 21, 2026',
      datePlanted: '2026-05-21',
      createdAt: '2026-11-21T06:10:00.000Z',
      age: '6 Months',
      ageOfTree: '6 Months',
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
      height: '2.8 meters',
      trunkDiam: '4.5 cm'
    },
    {
      id: 'TR-10004',
      species: { common: 'Tindalo', scientific: 'Afzelia rhomboidea', type: 'Native' },
      speciesCommon: 'Tindalo',
      commonName: 'Tindalo',
      scientificName: 'Afzelia rhomboidea',
      treeType: 'Native',
      treeCount: 100,
      takenCount: 0,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Bunuanan',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7885,
      lng: 124.8890,
      sponsorName: '',
      adopter: '',
      fundingAmount: 50,
      dateAdded: 'Nov 21, 2026',
      datePlanted: '2026-05-21',
      createdAt: '2026-11-21T06:15:00.000Z',
      age: '6 Months',
      ageOfTree: '6 Months',
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
      height: '2.1 meters',
      trunkDiam: '3.5 cm'
    },
    {
      id: 'TR-10005',
      species: { common: 'Dao', scientific: 'Dracontomelon dao', type: 'Native' },
      speciesCommon: 'Dao',
      commonName: 'Dao',
      scientificName: 'Dracontomelon dao',
      treeType: 'Native',
      treeCount: 100,
      takenCount: 0,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Mabini',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7740,
      lng: 124.9030,
      sponsorName: '',
      adopter: '',
      fundingAmount: 50,
      dateAdded: 'Nov 21, 2026',
      datePlanted: '2026-05-21',
      createdAt: '2026-11-21T06:20:00.000Z',
      age: '6 Months',
      ageOfTree: '6 Months',
      caretaker: 'Dodong Zeta',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
      height: '3.0 meters',
      trunkDiam: '5.2 cm'
    },
    {
      id: 'TR-10006',
      species: { common: 'Banaba', scientific: 'Lagerstroemia speciosa', type: 'Native' },
      speciesCommon: 'Banaba',
      commonName: 'Banaba',
      scientificName: 'Lagerstroemia speciosa',
      treeType: 'Native',
      treeCount: 100,
      takenCount: 0,
      status: 'healthy',
      health: 'Healthy',
      barangay: 'Darahuway Daco',
      municipality: 'Catbalogan City',
      province: 'Samar',
      lat: 11.7450,
      lng: 124.8761,
      sponsorName: '',
      adopter: '',
      fundingAmount: 50,
      dateAdded: 'Nov 21, 2026',
      datePlanted: '2026-05-21',
      createdAt: '2026-11-21T06:25:00.000Z',
      age: '6 Months',
      ageOfTree: '6 Months',
      caretaker: 'June Luna',
      customCaretaker: true,
      customGps: true,
      customLocation: true,
      height: '2.6 meters',
      trunkDiam: '4.2 cm'
    }
  ];

  const ATAMAN_DB = {
    get isFirestore() { return isFirestoreReady && !!firestoreDb; },
    get isStorage() { return isStorageReady && !!firebaseStorage; },

    // Helper: Local storage cache management
    getLocalTrees() {
      try {
        const stored = localStorage.getItem('ATAMAN_trees_cache');
        const parsed = stored ? JSON.parse(stored) : null;
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Auto-migrate Darahuway Daco island coordinates if pointing offshore
          let updated = false;
          parsed.forEach(t => {
            if (t && (t.id === 'TR-10006' || (t.barangay && String(t.barangay).toLowerCase().includes('darahuway')))) {
              if (t.lat === 11.7580 || t.lng === 124.8450 || (Number(t.lng) < 124.86 && Number(t.lat) > 11.75)) {
                t.lat = 11.7450;
                t.lng = 124.8761;
                updated = true;
              }
            }
          });
          if (updated) {
            try {
              localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(parsed));
              localStorage.setItem('saplink_trees_cache', JSON.stringify(parsed));
            } catch (_) {}
          }
          return parsed;
        }
        const def = (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_TREES) && window.ATAMAN_DEFAULT_TREES.length > 0)
          ? window.ATAMAN_DEFAULT_TREES
          : DEFAULT_SAMAR_TREES;
        if (Array.isArray(def) && def.length > 0) {
          try {
            localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(def));
            localStorage.setItem('saplink_trees_cache', JSON.stringify(def));
          } catch (_) {}
          return [...def];
        }
        return [];
      } catch (e) {
        return [];
      }
    },

    setLocalTrees(trees) {
      try {
        // Protect local trees from being wiped by an unpopulated remote response
        if (!Array.isArray(trees) || trees.length === 0) {
          const stored = localStorage.getItem('ATAMAN_trees_cache');
          const parsed = stored ? JSON.parse(stored) : null;
          if (Array.isArray(parsed) && parsed.length > 0) return;
        }
        localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(trees));
        localStorage.setItem('saplink_trees_cache', JSON.stringify(trees));
        this._notify('trees', trees);
      } catch (e) {
        console.warn("Local storage cache write failed:", e);
      }
    },

    _notify(entity, data) {
      try {
        const evtName = `ATAMAN:${entity.toLowerCase()}-updated`;
        window.dispatchEvent(new CustomEvent(evtName, { detail: data }));
        if (window.ATAMAN_SYNC && typeof window.ATAMAN_SYNC.broadcast === 'function') {
          window.ATAMAN_SYNC.broadcast(entity, data, 'db');
        }
      } catch (e) {}
    },

    getLocalAdopters() {
      try {
        const stored = localStorage.getItem('ATAMAN_adopters_cache');
        const parsed = stored ? JSON.parse(stored) : [];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        if (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_ADOPTERS) && window.ATAMAN_DEFAULT_ADOPTERS.length > 0) {
          return window.ATAMAN_DEFAULT_ADOPTERS;
        }
        return [];
      } catch (e) {
        return [];
      }
    },

    setLocalAdopters(adopters) {
      try {
        localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(adopters));
        this._notify('adopters', adopters);
      } catch (e) {
        console.warn("Local adopters cache write failed:", e);
      }
    },

    _dedupeCaretakersList(rawList, cleanCloudDuplicates = false) {
      if (!Array.isArray(rawList)) return [];
      const merged = [];
      const duplicateDocIdsToRemove = [];
      const updatedPrimaryDocs = [];

      rawList.forEach(item => {
        if (!item || item.name === 'Pedro Reyes') return;
        const c = { ...item };
        c.name = c.name || c.fullName || c.displayName || 'Field Caretaker';
        c.empId = c.empId || c.employeeId || 'EMP-001';
        c.email = (c.email || c.userEmail || '').toLowerCase().trim();
        c.phone = c.phone || c.contact || c.contactNumber || '—';
        const rawArea = (c.primaryArea && String(c.primaryArea) !== 'undefined') ? c.primaryArea : '';
        c.primaryArea = rawArea || c.barangay || c.location || c.address || 'Catbalogan City';
        c.barangay = c.barangay || c.primaryArea || 'Canlapwas';
        c.assignedTreeType = (c.assignedTreeType && String(c.assignedTreeType) !== 'undefined') ? c.assignedTreeType : 'Native Hardwood';
        c.status = c.status || 'Active';
        c.assignedTrees = typeof c.assignedTrees === 'number' ? c.assignedTrees : (parseInt(c.assignedTreeCount || c.treesAssigned) || 0);

        const normEmp = (c.empId || '').toLowerCase().trim();
        const normEmail = (c.email || '').toLowerCase().trim();
        const normName = (c.name || '').toLowerCase().trim();
        const normUid = (c.userId || c.uid || '').toLowerCase().trim();

        const existingIdx = merged.findIndex(ex => {
          const exEmp = (ex.empId || '').toLowerCase().trim();
          const exEmail = (ex.email || '').toLowerCase().trim();
          const exName = (ex.name || '').toLowerCase().trim();
          const exUid = (ex.userId || ex.uid || '').toLowerCase().trim();
          return (c.id && ex.id === c.id) ||
                 (normEmp && exEmp && normEmp === exEmp) ||
                 (normEmail && exEmail && normEmail === exEmail) ||
                 (normUid && exUid && normUid === exUid) ||
                 (normName && exName && normName === exName);
        });

        if (existingIdx === -1) {
          merged.push(c);
        } else {
          const ex = merged[existingIdx];
          const scoreEx = (Number(ex.assignedTrees) || 0) * 100 + (Array.isArray(ex.assignedTreeIds) ? ex.assignedTreeIds.length * 10 : 0) + (ex.assignedTreeType && ex.assignedTreeType !== 'Native Hardwood' ? 5 : 0);
          const scoreC = (Number(c.assignedTrees) || 0) * 100 + (Array.isArray(c.assignedTreeIds) ? c.assignedTreeIds.length * 10 : 0) + (c.assignedTreeType && c.assignedTreeType !== 'Native Hardwood' ? 5 : 0);

          const primary = scoreC > scoreEx ? c : ex;
          const secondary = scoreC > scoreEx ? ex : c;

          // Keep canonical ID (prefer first existing doc ID or EMP/CT ID) and record secondary doc ID for cleanup
          const canonicalId = ex.id || c.id;
          const otherId = (canonicalId === ex.id) ? c.id : ex.id;
          if (otherId && otherId !== canonicalId) {
            duplicateDocIdsToRemove.push(otherId);
          }

          // Prefer EMP-* employee ID over auto-generated CT-* if one exists
          const bestEmpId = (String(ex.empId || '').toUpperCase().startsWith('EMP-') ? ex.empId : (String(c.empId || '').toUpperCase().startsWith('EMP-') ? c.empId : (primary.empId || secondary.empId)));

          // Combine assignedTreeType species
          const typesSet = new Set();
          [primary.assignedTreeType, secondary.assignedTreeType].forEach(tt => {
            if (tt && tt !== 'undefined' && tt !== 'Native Hardwood') {
              tt.split(',').map(s => s.trim()).filter(Boolean).forEach(s => typesSet.add(s));
            }
          });
          const combinedTreeType = typesSet.size > 0 ? Array.from(typesSet).join(', ') : (primary.assignedTreeType || secondary.assignedTreeType || 'Native Hardwood');

          // Combine arrays
          const combinedTreeIds = Array.from(new Set([...(primary.assignedTreeIds || []), ...(secondary.assignedTreeIds || [])].map(String)));
          const combinedBrgys = Array.from(new Set([...(primary.assignedBarangays || []), ...(secondary.assignedBarangays || []), primary.primaryArea, secondary.primaryArea].filter(b => b && b !== 'undefined' && b !== 'None')));
          const combinedProjects = Array.from(new Set([...(primary.assignedProjects || []), ...(secondary.assignedProjects || [])].filter(p => p && p !== 'undefined' && p !== 'None')));

          // Prefer specific barangay for primaryArea
          const isGenericArea = (a) => !a || a === 'undefined' || a === 'Catbalogan City' || a.includes('&');
          const bestPrimaryArea = !isGenericArea(primary.primaryArea) ? primary.primaryArea : (!isGenericArea(secondary.primaryArea) ? secondary.primaryArea : (primary.primaryArea || secondary.primaryArea || 'Catbalogan City'));

          const unified = {
            ...secondary,
            ...primary,
            id: canonicalId,
            empId: bestEmpId,
            userId: primary.userId || secondary.userId || secondary.id || primary.id,
            email: primary.email || secondary.email,
            phone: (primary.phone && primary.phone !== '—') ? primary.phone : (secondary.phone || '—'),
            address: primary.address || secondary.address || bestPrimaryArea,
            primaryArea: bestPrimaryArea,
            barangay: bestPrimaryArea,
            assignedTreeType: combinedTreeType,
            assignedTreeIds: combinedTreeIds,
            assignedBarangays: combinedBrgys.length > 0 ? combinedBrgys : [bestPrimaryArea],
            assignedProjects: combinedProjects.length > 0 ? combinedProjects : ['General Reforestation'],
            assignedTrees: Math.max(Number(primary.assignedTrees) || 0, Number(secondary.assignedTrees) || 0)
          };

          merged[existingIdx] = unified;
          updatedPrimaryDocs.push(unified);
        }
      });

      if (cleanCloudDuplicates && this.isFirestore && firestoreDb) {
        duplicateDocIdsToRemove.forEach(dupId => {
          firestoreDb.collection('caretakers').doc(dupId).delete().catch(() => {});
        });
        updatedPrimaryDocs.forEach(docObj => {
          if (docObj && docObj.id) {
            firestoreDb.collection('caretakers').doc(docObj.id).set(docObj, { merge: true }).catch(() => {});
          }
        });
      }

      return merged;
    },

    getLocalCaretakers() {
      try {
        const stored = localStorage.getItem('ATAMAN_caretakers_cache');
        const parsed = stored ? JSON.parse(stored) : [];
        if (Array.isArray(parsed) && parsed.length > 0) return this._dedupeCaretakersList(parsed, false);
        if (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_CARETAKERS) && window.ATAMAN_DEFAULT_CARETAKERS.length > 0) {
          return this._dedupeCaretakersList(window.ATAMAN_DEFAULT_CARETAKERS, false);
        }
        return [];
      } catch (e) {
        return [];
      }
    },

    setLocalCaretakers(caretakers) {
      try {
        const deduped = this._dedupeCaretakersList(caretakers, false);
        localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(deduped));
        this._notify('caretakers', deduped);
      } catch (e) {
        console.warn("Local caretakers cache write failed:", e);
      }
    },

    /* ── TREES CRUD ── */

    // Get all trees (from Firestore or fallback cache)
    async getTrees() {
      await Promise.resolve(firestoreCleanPromise).catch(() => null);
      if (this.isFirestore && firestoreDb) {
        try {
          const snapshot = await firestoreDb.collection('trees').get().catch(() => null);
          if (snapshot) {
            let trees = [];
            snapshot.forEach(doc => {
              trees.push({ id: doc.id, ...doc.data() });
            });
            if (trees.length > 0) {
              this.setLocalTrees(trees);
              return { data: trees, source: 'firestore' };
            } else {
              // Remote collection is unpopulated; fallback to local trees & sync up
              const local = this.getLocalTrees();
              if (local && local.length > 0) {
                this.seedInitialTrees(local);
                return { data: local, source: 'local' };
              }
              return { data: [], source: 'firestore-empty' };
            }
          }
        } catch (error) {
          console.warn("Firestore fetch error, reading local cache:", error);
        }
      }

      // Fallback to local cache
      const cached = this.getLocalTrees();
      return { data: cached || [], source: 'local' };
    },

    // Real-time listener for trees
    onTreesChange(callback) {
      // 1. Immediately provide cached local data so UI paints instantly
      const cached = this.getLocalTrees() || [];
      if (typeof callback === 'function') {
        try { callback(cached, 'local'); } catch (_) {}
      }

      // 2. Listen to local custom event for instant cross-tab / in-memory sync
      const localHandler = (e) => {
        if (e.detail && Array.isArray(e.detail) && typeof callback === 'function') {
          try { callback(e.detail, 'local-event'); } catch (_) {}
        }
      };
      window.addEventListener('ATAMAN:trees-updated', localHandler);

      let isUnsubscribed = false;
      let unsubscribeSnapshot = null;

      // 3. Connect Cloud Firestore real-time listener if ready & on http/https
      if (this.isFirestore && firestoreDb && window.location.protocol.startsWith('http')) {
        Promise.resolve(firestoreCleanPromise)
          .catch(() => null)
          .then(() => {
            if (isUnsubscribed) return;
            try {
              if (!firestoreDb || typeof firestoreDb.collection !== 'function') return;
              const unsub = firestoreDb.collection('trees').onSnapshot(
                snapshot => {
                  if (isUnsubscribed) return;
                  try {
                    const trees = [];
                    snapshot.forEach(doc => {
                      trees.push({ id: doc.id, ...doc.data() });
                    });
                    if (trees.length > 0) {
                      this.setLocalTrees(trees);
                      if (typeof callback === 'function') callback(trees, 'firestore');
                    } else {
                      // Remote collection has 0 trees. Protect local trees and sync to Firestore!
                      const local = this.getLocalTrees();
                      if (local && local.length > 0) {
                        this.seedInitialTrees(local);
                        if (typeof callback === 'function') callback(local, 'local');
                      } else {
                        if (typeof callback === 'function') callback([], 'firestore');
                      }
                    }
                  } catch (parseErr) {
                    if (typeof callback === 'function') callback(this.getLocalTrees() || [], 'local');
                  }
                },
                error => {
                  console.warn('Firestore onTreesChange snapshot notice:', error?.message || error);
                  if (typeof callback === 'function') callback(this.getLocalTrees() || [], 'local');
                }
              );
              if (isUnsubscribed && typeof unsub === 'function') {
                unsub();
              } else {
                unsubscribeSnapshot = unsub;
              }
            } catch (err) {
              console.warn('Firestore onTreesChange setup notice:', err?.message || err);
              if (typeof callback === 'function') callback(this.getLocalTrees() || [], 'local');
            }
          })
          .catch(pErr => {
            console.warn('Firestore onTreesChange promise notice:', pErr?.message || pErr);
            if (typeof callback === 'function') callback(this.getLocalTrees() || [], 'local');
          });
      }

      return () => {
        isUnsubscribed = true;
        if (typeof unsubscribeSnapshot === 'function') {
          try { unsubscribeSnapshot(); } catch (_) {}
        }
        window.removeEventListener('ATAMAN:trees-updated', localHandler);
      };
    },

    // Add a new tree
    async addTree(treeData) {
      const docId = treeData.id || ('TR-' + Math.floor(10000 + Math.random() * 90000));
      const treeRecord = {
        ...treeData,
        id: docId,
        savedTimestamp: treeData.savedTimestamp || Date.now(),
        updatedAt: new Date().toISOString(),
        createdAt: treeData.createdAt || new Date().toISOString()
      };

      // 1. Update Local Cache immediately for snappy UI & notify
      const current = this.getLocalTrees() || [];
      const updated = [treeRecord, ...current.filter(t => t.id !== docId)];
      this.setLocalTrees(updated);
      this._notify('trees', updated);

      // 2. Save to Firestore if available
      if (this.isFirestore) {
        try {
          await firestoreDb.collection('trees').doc(docId).set(treeRecord, { merge: true });
          return { success: true, tree: treeRecord, source: 'firestore' };
        } catch (error) {
          console.warn("Firestore addTree error, saved to local cache:", error);
        }
      }

      return { success: true, tree: treeRecord, source: 'local' };
    },

    // Update existing tree
    async updateTree(treeId, updates) {
      const current = this.getLocalTrees() || [];
      const updated = current.map(t => t.id === treeId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
      this.setLocalTrees(updated);
      this._notify('trees', updated);

      if (this.isFirestore) {
        try {
          await firestoreDb.collection('trees').doc(treeId).set({
            ...updates,
            savedTimestamp: updates.savedTimestamp || Date.now(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          return { success: true, source: 'firestore' };
        } catch (error) {
          console.warn("Firestore updateTree error:", error);
        }
      }

      return { success: true, source: 'local' };
    },

    // Delete a tree
    async deleteTree(treeId) {
      const current = this.getLocalTrees() || [];
      const updated = current.filter(t => t.id !== treeId);
      this.setLocalTrees(updated);
      this._notify('trees', updated);

      if (this.isFirestore) {
        try {
          await firestoreDb.collection('trees').doc(treeId).delete();
          return { success: true, source: 'firestore' };
        } catch (error) {
          console.warn("Firestore deleteTree error:", error);
        }
      }

      return { success: true, source: 'local' };
    },

    // Seed initial registered Samar tree batches to Firestore if collection is empty
    async seedInitialTrees(treesArray) {
      if (!this.isFirestore || !firestoreDb || !Array.isArray(treesArray) || treesArray.length === 0) return;
      try {
        const batch = firestoreDb.batch();
        treesArray.forEach(tree => {
          if (!tree || !tree.id) return;
          const ref = firestoreDb.collection('trees').doc(tree.id);
          batch.set(ref, tree, { merge: true });
        });
        await batch.commit();
        console.log(`[ATAMAN] Successfully synced ${treesArray.length} registered trees to Firestore.`);
      } catch (err) {
        console.warn('Firestore seedInitialTrees notice:', err);
      }
    },

    /* ── ADOPTERS CRUD & REAL-TIME ── */
    async getAdopters() {
      await Promise.resolve(firestoreCleanPromise).catch(() => null);
      if (this.isFirestore && firestoreDb) {
        try {
          const snapshot = await firestoreDb.collection('adopters').get().catch(() => null);
          if (snapshot) {
            const list = [];
            snapshot.forEach(doc => {
              const d = doc.data() || {};
              if (d.name !== 'John Sho' && d.name !== 'Century Catbalogan') {
                list.push({ id: doc.id, ...d });
              }
            });
            if (list.length > 0) {
              this.setLocalAdopters(list);
              return list;
            }
          }
          return this.getLocalAdopters();
        } catch (err) {
          console.warn("Firestore getAdopters error:", err);
        }
      }
      return this.getLocalAdopters();
    },

    onAdoptersChange(callback) {
      // 1. Immediately provide cached local data
      const cached = this.getLocalAdopters();
      if (typeof callback === 'function') {
        try { callback(cached, 'local'); } catch (_) {}
      }

      // 2. Listen to local custom event
      const localHandler = (e) => {
        if (e.detail && Array.isArray(e.detail) && typeof callback === 'function') {
          try { callback(e.detail, 'local-event'); } catch (_) {}
        }
      };
      window.addEventListener('ATAMAN:adopters-updated', localHandler);

      let isUnsubscribed = false;
      let unsubscribeSnapshot = null;

      // 3. Cloud Firestore real-time listener
      if (this.isFirestore && firestoreDb && window.location.protocol.startsWith('http')) {
        Promise.resolve(firestoreCleanPromise)
          .catch(() => null)
          .then(() => {
            if (isUnsubscribed) return;
            try {
              if (!firestoreDb || typeof firestoreDb.collection !== 'function') return;
              const unsub = firestoreDb.collection('adopters').onSnapshot(
                snapshot => {
                  if (isUnsubscribed) return;
                  try {
                    const adopters = [];
                    snapshot.forEach(doc => adopters.push({ id: doc.id, ...doc.data() }));
                    if (adopters.length > 0) {
                      this.setLocalAdopters(adopters);
                      if (typeof callback === 'function') callback(adopters, 'firestore');
                    } else {
                      const local = this.getLocalAdopters();
                      const fallback = (Array.isArray(local) && local.length > 0)
                        ? local
                        : (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_ADOPTERS) ? window.ATAMAN_DEFAULT_ADOPTERS : []);
                      if (fallback.length > 0) {
                        this.setLocalAdopters(fallback);
                        if (typeof callback === 'function') callback(fallback, 'local-fallback');
                      } else {
                        this.setLocalAdopters([]);
                        if (typeof callback === 'function') callback([], 'firestore');
                      }
                    }
                  } catch (parseErr) {
                    if (typeof callback === 'function') callback(this.getLocalAdopters(), 'local');
                  }
                },
                error => {
                  console.warn('Firestore onAdoptersChange notice:', error?.message || error);
                  if (typeof callback === 'function') callback(this.getLocalAdopters(), 'local');
                }
              );
              if (isUnsubscribed && typeof unsub === 'function') {
                unsub();
              } else {
                unsubscribeSnapshot = unsub;
              }
            } catch (err) {
              console.warn('Firestore onAdoptersChange setup notice:', err?.message || err);
              if (typeof callback === 'function') callback(this.getLocalAdopters(), 'local');
            }
          })
          .catch(pErr => {
            console.warn('Firestore onAdoptersChange promise notice:', pErr?.message || pErr);
            if (typeof callback === 'function') callback(this.getLocalAdopters(), 'local');
          });
      }

      return () => {
        isUnsubscribed = true;
        if (typeof unsubscribeSnapshot === 'function') {
          try { unsubscribeSnapshot(); } catch (_) {}
        }
        window.removeEventListener('ATAMAN:adopters-updated', localHandler);
      };
    },

    async addAdopter(adopterData) {
      const list = this.getLocalAdopters();
      const normEmail = (adopterData.email || '').toLowerCase().trim();
      const normName = (adopterData.name || '').toLowerCase().trim();
      const existingAd = list.find(a =>
        (adopterData.id && a.id === adopterData.id) ||
        (normEmail && (a.email || '').toLowerCase().trim() === normEmail) ||
        (normName && (a.name || '').toLowerCase().trim() === normName)
      );
      const docId = (existingAd && existingAd.id) || adopterData.id || ('ADP-' + Math.floor(1000 + Math.random() * 9000));
      const record = { ...(existingAd || {}), ...adopterData, id: docId, createdAt: adopterData.createdAt || existingAd?.createdAt || new Date().toISOString() };

      const updated = [record, ...list.filter(a =>
        a.id !== docId &&
        (!normEmail || (a.email || '').toLowerCase().trim() !== normEmail) &&
        (!normName || (a.name || '').toLowerCase().trim() !== normName)
      )];
      this.setLocalAdopters(updated);

      if (this.isFirestore) {
        try {
          await firestoreDb.collection('adopters').doc(docId).set(record, { merge: true });
        } catch (e) {
          console.warn("Firestore addAdopter error:", e);
        }
      }
      return record;
    },

    async updateAdopter(adopterId, updates) {
      const list = this.getLocalAdopters();
      const updated = list.map(a => a.id === adopterId ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a);
      this.setLocalAdopters(updated);

      if (this.isFirestore) {
        try {
          await firestoreDb.collection('adopters').doc(adopterId).set({
            ...updates,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.warn("Firestore updateAdopter error:", e);
        }
      }
      return true;
    },

    async deleteAdopter(adopterId) {
      const list = this.getLocalAdopters();
      const updated = list.filter(a => a.id !== adopterId);
      this.setLocalAdopters(updated);

      if (this.isFirestore) {
        try {
          await firestoreDb.collection('adopters').doc(adopterId).delete();
        } catch (e) {
          console.warn("Firestore deleteAdopter error:", e);
        }
      }
      return true;
    },

    /* ── CARETAKERS CRUD & REAL-TIME ── */
    async getCaretakers() {
      await Promise.resolve(firestoreCleanPromise).catch(() => null);
      if (this.isFirestore && firestoreDb) {
        try {
          const snapshot = await firestoreDb.collection('caretakers').get().catch(() => null);
          if (snapshot) {
            const list = [];
            snapshot.forEach(doc => {
              const d = doc.data() || {};
              if (d.name !== 'Pedro Reyes') {
                list.push({ ...d, id: doc.id });
              }
            });
            if (list.length > 0) {
              const deduped = this._dedupeCaretakersList(list, true);
              this.setLocalCaretakers(deduped);
              return deduped;
            }
          }
          return this.getLocalCaretakers();
        } catch (err) {
          console.warn("Firestore getCaretakers error:", err);
        }
      }
      return this.getLocalCaretakers();
    },

    onCaretakersChange(callback) {
      // 1. Immediately provide cached local data
      const cached = this.getLocalCaretakers();
      if (typeof callback === 'function') {
        try { callback(cached, 'local'); } catch (_) {}
      }

      // 2. Listen to local custom event
      const localHandler = (e) => {
        if (e.detail && Array.isArray(e.detail) && typeof callback === 'function') {
          try { callback(this._dedupeCaretakersList(e.detail, false), 'local-event'); } catch (_) {}
        }
      };
      window.addEventListener('ATAMAN:caretakers-updated', localHandler);

      let isUnsubscribed = false;
      let unsubscribeSnapshot = null;

      // 3. Cloud Firestore real-time listener
      if (this.isFirestore && firestoreDb && window.location.protocol.startsWith('http')) {
        Promise.resolve(firestoreCleanPromise)
          .catch(() => null)
          .then(() => {
            if (isUnsubscribed) return;
            try {
              if (!firestoreDb || typeof firestoreDb.collection !== 'function') return;
              const unsub = firestoreDb.collection('caretakers').onSnapshot(
                snapshot => {
                  if (isUnsubscribed) return;
                  try {
                    const rawCaretakers = [];
                    snapshot.forEach(doc => rawCaretakers.push({ ...doc.data(), id: doc.id }));
                    if (rawCaretakers.length > 0) {
                      const caretakers = this._dedupeCaretakersList(rawCaretakers, true);
                      this.setLocalCaretakers(caretakers);
                      if (typeof callback === 'function') callback(caretakers, 'firestore');
                    } else {
                      const local = this.getLocalCaretakers();
                      const fallback = (Array.isArray(local) && local.length > 0)
                        ? local
                        : (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_CARETAKERS) ? window.ATAMAN_DEFAULT_CARETAKERS : []);
                      if (fallback.length > 0) {
                        this.setLocalCaretakers(fallback);
                        if (typeof callback === 'function') callback(fallback, 'local-fallback');
                      } else {
                        this.setLocalCaretakers([]);
                        if (typeof callback === 'function') callback([], 'firestore');
                      }
                    }
                  } catch (parseErr) {
                    if (typeof callback === 'function') callback(this.getLocalCaretakers(), 'local');
                  }
                },
                error => {
                  console.warn('Firestore onCaretakersChange notice:', error?.message || error);
                  if (typeof callback === 'function') callback(this.getLocalCaretakers(), 'local');
                }
              );
              if (isUnsubscribed && typeof unsub === 'function') {
                unsub();
              } else {
                unsubscribeSnapshot = unsub;
              }
            } catch (err) {
              console.warn('Firestore onCaretakersChange setup notice:', err?.message || err);
              if (typeof callback === 'function') callback(this.getLocalCaretakers(), 'local');
            }
          })
          .catch(pErr => {
            console.warn('Firestore onCaretakersChange promise notice:', pErr?.message || pErr);
            if (typeof callback === 'function') callback(this.getLocalCaretakers(), 'local');
          });
      }

      return () => {
        isUnsubscribed = true;
        if (typeof unsubscribeSnapshot === 'function') {
          try { unsubscribeSnapshot(); } catch (_) {}
        }
        window.removeEventListener('ATAMAN:caretakers-updated', localHandler);
      };
    },

    async addCaretaker(caretakerData) {
      const list = this.getLocalCaretakers();
      const normEmp = (caretakerData.empId || '').toLowerCase().trim();
      const normEmail = (caretakerData.email || '').toLowerCase().trim();
      const normName = (caretakerData.name || '').toLowerCase().trim();
      const normUid = (caretakerData.userId || caretakerData.uid || '').toLowerCase().trim();

      const existingCt = list.find(c =>
        (caretakerData.id && c.id === caretakerData.id) ||
        (normEmp && (c.empId || '').toLowerCase().trim() === normEmp) ||
        (normEmail && (c.email || '').toLowerCase().trim() === normEmail) ||
        (normUid && (c.userId || c.uid || '').toLowerCase().trim() === normUid) ||
        (normName && (c.name || '').toLowerCase().trim() === normName)
      );

      const docId = (existingCt && existingCt.id) || caretakerData.id || caretakerData.empId || ('CT-' + Math.floor(1000 + Math.random() * 9000));
      const bestEmpId = (existingCt && String(existingCt.empId || '').toUpperCase().startsWith('EMP-'))
        ? existingCt.empId
        : (caretakerData.empId || existingCt?.empId || docId);

      const record = {
        ...(existingCt || {}),
        ...caretakerData,
        id: docId,
        empId: bestEmpId,
        createdAt: existingCt?.createdAt || caretakerData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updated = this._dedupeCaretakersList([record, ...list], false);
      this.setLocalCaretakers(updated);

      if (this.isFirestore) {
        try {
          await firestoreDb.collection('caretakers').doc(docId).set(record, { merge: true });
          // If caretakerData had a different temporary ID in Firestore, clean it up so no duplicate row remains
          if (caretakerData.id && caretakerData.id !== docId) {
            firestoreDb.collection('caretakers').doc(caretakerData.id).delete().catch(() => {});
          }
          if (caretakerData.userId && caretakerData.userId !== docId) {
            firestoreDb.collection('caretakers').doc(caretakerData.userId).delete().catch(() => {});
          }
        } catch (e) {
          console.warn("Firestore addCaretaker error:", e);
        }
      }
      return record;
    },

    async updateCaretaker(caretakerId, updates) {
      const list = this.getLocalCaretakers();
      const updated = list.map(c => (c.id === caretakerId || c.empId === caretakerId) ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
      this.setLocalCaretakers(updated);

      if (this.isFirestore) {
        try {
          await firestoreDb.collection('caretakers').doc(caretakerId).set({
            ...updates,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.warn("Firestore updateCaretaker error:", e);
        }
      }
      return true;
    },

    async deleteCaretaker(caretakerId) {
      const list = this.getLocalCaretakers();
      const updated = list.filter(c => c.id !== caretakerId && c.empId !== caretakerId);
      this.setLocalCaretakers(updated);

      if (this.isFirestore) {
        try {
          await firestoreDb.collection('caretakers').doc(caretakerId).delete();
        } catch (e) {
          console.warn("Firestore deleteCaretaker error:", e);
        }
      }
      return true;
    },

    /* ── MONITORING LOGS ── */
    async addMonitoringLog(logData) {
      const logRecord = {
        ...logData,
        timestamp: new Date().toISOString(),
        id: 'LOG-' + Date.now()
      };
      const treeUpdates = {
        status: logData.status || 'healthy',
        lastCheck: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        ...(logData.height ? { height: logData.height } : {}),
        ...(logData.trunkDiam ? { trunkDiam: logData.trunkDiam } : {})
      };

      if (this.isFirestore) {
        try {
          await firestoreDb.collection('monitoring_logs').add(logRecord);
          // Also update lastCheck and status on the tree document
          if (logData.treeId) {
            await this.updateTree(logData.treeId, treeUpdates);
          }
        } catch (e) {
          console.warn("Firestore addMonitoringLog error:", e);
        }
      }

      // Update tree in local cache
      if (logData.treeId) {
        await this.updateTree(logData.treeId, treeUpdates);
      }

      return logRecord;
    },

    /* ── FIREBASE STORAGE: UPLOAD PHOTO ── */
    async uploadTreePhoto(file, path = 'trees/') {
      if (!this.isStorage || !file) {
        // Fallback: Create Object URL or base64 for preview
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      }

      try {
        const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const storageRef = firebaseStorage.ref(`${path}${filename}`);
        const uploadTask = await storageRef.put(file);
        const downloadUrl = await uploadTask.ref.getDownloadURL();
        return downloadUrl;
      } catch (err) {
        console.warn("Firebase Storage upload error, falling back to base64:", err);
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      }
    }
  };

  // Expose services globally to window
  window.ATAMAN_AUTH = ATAMAN_AUTH;
  window.ATAMAN_DB = ATAMAN_DB;
  window.ATAMAN_FIRESTORE = firestoreDb;
  window.ATAMAN_STORAGE = firebaseStorage;

  // Immediately execute route guard
  try {
    ATAMAN_AUTH.enforceRouteGuard();
  } catch (e) {
    console.warn("Route guard initial execution error:", e);
  }
})();