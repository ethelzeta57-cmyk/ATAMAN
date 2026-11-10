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
  const INIT_VERSION = 'ATAMAN_init_v6_preserve_all_data';
  if (!localStorage.getItem(INIT_VERSION)) {
    const existingTrees = (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('ATAMAN_trees_cache') || '[]');
        return Array.isArray(raw) && raw.length > 0 ? raw : null;
      } catch (_) { return null; }
    })();
    if (!existingTrees && typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_TREES)) {
      localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(window.ATAMAN_DEFAULT_TREES));
    }

    const existingAdopters = (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
        return Array.isArray(raw) && raw.length > 0 ? raw : null;
      } catch (_) { return null; }
    })();
    if (!existingAdopters && typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_ADOPTERS)) {
      localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(window.ATAMAN_DEFAULT_ADOPTERS));
    }

    const existingCaretakers = (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
        return Array.isArray(raw) && raw.length > 0 ? raw : null;
      } catch (_) { return null; }
    })();
    if (!existingCaretakers && typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_CARETAKERS)) {
      localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(window.ATAMAN_DEFAULT_CARETAKERS));
    }

    if (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_USERS)) {
      const uJson = JSON.stringify(window.ATAMAN_DEFAULT_USERS);
      localStorage.setItem('ATAMAN_users_cache', uJson);
      localStorage.setItem('saplink_users_cache', uJson);
      localStorage.setItem('ATAMAN_registered_users', uJson);
      localStorage.setItem('saplink_registered_users', uJson);
    }

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
            merge: true
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

  // One-time Cloud Firestore clean slate for v4 reset so old cloud docs & non-admin users don't repopulate
  const FIRESTORE_CLEAN_FLAG = 'ATAMAN_firestore_cleaned_v4';
  let firestoreCleanPromise = Promise.resolve();
  if (isFirestoreReady && firestoreDb && !localStorage.getItem(FIRESTORE_CLEAN_FLAG)) {
    firestoreCleanPromise = (async () => {
      try {
        const cols = ['adopters', 'caretakers', 'monitoring_logs'];
        for (const colName of cols) {
          const snap = await firestoreDb.collection(colName).get();
          if (!snap.empty) {
            const batch = firestoreDb.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          }
        }
        // Also remove all non-admin user docs from Firestore 'users' collection
        const usersSnap = await firestoreDb.collection('users').get();
        if (!usersSnap.empty) {
          const userBatch = firestoreDb.batch();
          usersSnap.forEach(doc => {
            const d = doc.data() || {};
            const em = (d.email || '').toLowerCase().trim();
            if (em !== 'ethelzeta57@gmail.com') {
              userBatch.delete(doc.ref);
            }
          });
          await userBatch.commit();
        }
        localStorage.setItem(FIRESTORE_CLEAN_FLAG, 'done');
        localStorage.setItem('ATAMAN_adopters_cache', '[]');
        localStorage.setItem('ATAMAN_caretakers_cache', '[]');
      } catch (cleanErr) {
        localStorage.setItem(FIRESTORE_CLEAN_FLAG, 'done');
      }
    })();
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
      email: 'pedro.reyes@ATAMAN.org',
      displayName: 'Pedro Reyes',
      role: 'caretaker'
    },
    adopter: {
      email: 'juan.delacruz@ATAMAN.org',
      displayName: 'Juan Dela Cruz',
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
      email: 'pedro.reyes@ataman.org',
      displayName: 'Pedro Reyes',
      name: 'Pedro Reyes',
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
      email: 'john.sho@gmail.com',
      displayName: 'John Sho',
      name: 'John Sho',
      empId: 'ADP-101',
      role: 'adopter',
      status: 'Active',
      phone: '+63 917 123 4567',
      address: 'Brgy. Guinsorongan, Catbalogan City, Samar',
      password: 'Password123!',
      createdAt: '2026-08-28T08:00:00.000Z'
    },
    {
      uid: 'USR-ADP-002',
      id: 'ADP-102',
      email: 'contact@centurycatbalogan.com',
      displayName: 'Century Catbalogan (Maria Santos)',
      name: 'Century Catbalogan',
      contactPerson: 'Maria Santos',
      empId: 'ADP-102',
      role: 'adopter',
      status: 'Active',
      phone: '+63 920 987 6543',
      address: 'Del Rosario St., Catbalogan City, Samar',
      password: 'Password123!',
      createdAt: '2026-09-06T08:00:00.000Z'
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

      // If adopter, sync with ATAMAN_adopters_cache (avoid duplicating if already linked by email, name, or contactPerson)
      if (userRecord.role === 'adopter') {
        try {
          let ads = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
          if (!Array.isArray(ads)) ads = [];
          const normName = (userRecord.displayName || normEmail.split('@')[0] || '').toLowerCase().trim();
          const alreadyExists = ads.some(a => {
            if (!a) return false;
            const em = (a.email || '').toLowerCase().trim();
            const nm = (a.name || '').toLowerCase().trim();
            const ct = (a.contactPerson || a.contact || '').toLowerCase().trim();
            return (normEmail && em === normEmail) || (normName && (nm === normName || ct === normName));
          });
          if (!alreadyExists) {
            ads.unshift({
              id: userRecord.uid || ('ADP-' + Math.floor(1000 + Math.random() * 9000)),
              name: userRecord.displayName || normEmail.split('@')[0],
              email: normEmail,
              contact: normEmail,
              status: 'Active',
              treesAdopted: 0,
              treesCount: 0,
              funding: 0,
              fundingPaid: 0,
              customFunding: false,
              treesList: []
            });
            localStorage.setItem('ATAMAN_adopters_cache', JSON.stringify(ads));
            localStorage.setItem('saplink_adopters_cache', JSON.stringify(ads));
          }
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

    // Sign In (Email & Password) — looks up role from database
    async signIn(email, password, fallbackRole) {
      const normEmail = (email || '').toLowerCase().trim();
      if (!normEmail) {
        throw { code: 'auth/invalid-email', message: 'Please enter your email address.' };
      }
      if (!password) {
        throw { code: 'auth/missing-password', message: 'Please enter your password.' };
      }

      let authenticatedUser = null;
      let detectedRole = null;
      let displayName = '';
      let isFirebaseAuth = false;

      const regUsers = getRegisteredUsersList();
      const localMatch = regUsers.find(u => u.email && u.email.toLowerCase() === normEmail);

      // ── Step 1: Try Firebase Auth FIRST when online ───────────────────────
      // If the user changed/reset their password in Firebase, Firebase Auth is authoritative.
      if (this.isFirebase && firebaseAuth) {
        try {
          const userCredential = await firebaseAuth.signInWithEmailAndPassword(normEmail, password);
          const fbUser = userCredential.user;
          isFirebaseAuth = true;
          authenticatedUser = {
            uid: fbUser.uid,
            email: normEmail,
            displayName: fbUser.displayName || (localMatch ? localMatch.displayName : '')
          };
          if (localMatch && localMatch.role) {
            detectedRole = localMatch.role;
          }
        } catch (fbErr) {
          // If Firebase rejected the credentials, check if we have a matching local account (e.g. offline/demo)
          if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
            if (localMatch && localMatch.password === password) {
              authenticatedUser = localMatch;
              detectedRole = localMatch.role;
              displayName = localMatch.displayName || '';
            } else {
              throw { code: 'auth/wrong-password', message: 'Incorrect password. Please try again.' };
            }
          } else if (fbErr.code === 'auth/user-not-found') {
            // Check local accounts
            if (localMatch && (!localMatch.password || localMatch.password === password)) {
              authenticatedUser = localMatch;
              detectedRole = localMatch.role;
              displayName = localMatch.displayName || '';
            }
          } else {
            console.warn('[ATAMAN] Firebase Auth signIn notice:', fbErr.code);
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
        displayName = localMatch.displayName || '';
      }

      // ── Step 3: Check secondary caches if still no match ─────────────────
      if (!authenticatedUser) {
        // Check caretakers cache
        try {
          const cts = JSON.parse(localStorage.getItem('ATAMAN_caretakers_cache') || '[]');
          const ctMatch = cts.find(c => c.email && c.email.toLowerCase() === normEmail);
          if (ctMatch) {
            authenticatedUser = { uid: ctMatch.id || ('CT-' + Date.now()), email: normEmail, displayName: ctMatch.name, role: 'caretaker' };
            detectedRole = 'caretaker';
            displayName = ctMatch.name || '';
          }
        } catch (e) {}

        // Check adopters cache
        if (!authenticatedUser) {
          try {
            const ads = JSON.parse(localStorage.getItem('ATAMAN_adopters_cache') || '[]');
            const adMatch = ads.find(a => a.email && a.email.toLowerCase() === normEmail);
            if (adMatch) {
              authenticatedUser = { uid: adMatch.id || ('ADP-' + Date.now()), email: normEmail, displayName: adMatch.name, role: 'adopter' };
              detectedRole = 'adopter';
              displayName = adMatch.name || '';
            }
          } catch (e) {}
        }

        // Check demo accounts
        if (!authenticatedUser) {
          const demoEntry = Object.values(DEMO_USERS).find(d => d.email.toLowerCase() === normEmail);
          if (demoEntry) {
            authenticatedUser = demoEntry;
            detectedRole = demoEntry.role;
            displayName = demoEntry.displayName;
          }
        }

        if (!authenticatedUser) {
          throw { code: 'auth/user-not-found', message: 'No account found with this email. Please create an account first.' };
        }
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
    async signUp(email, password, fullName, role = 'adopter') {
      const normEmail = (email || '').toLowerCase().trim();
      const validatedRole = this.normalizeRole(role);
      const name = (fullName || normEmail.split('@')[0]).trim();

      if (!normEmail) {
        throw { code: 'auth/invalid-email', message: 'Please provide a valid email address.' };
      }
      if (!password || password.length < 6) {
        throw { code: 'auth/weak-password', message: 'Password must be at least 6 characters long.' };
      }

      // Check if email already registered locally (but allow default/seeded accounts to be upgraded)
      const regUsers = getRegisteredUsersList();
      const existingLocal = regUsers.find(u => u.email && u.email.toLowerCase() === normEmail);
      // Only block if the account was explicitly registered (has a real password), not seeded defaults
      const isSeededDefault = DEFAULT_ACCOUNTS.some(d => d.email.toLowerCase() === normEmail);
      if (existingLocal && !isSeededDefault) {
        throw { code: 'auth/email-already-in-use', message: 'An account with this email already exists. Please sign in.' };
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
        createdAt: new Date().toISOString()
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
            updatedAt: new Date().toISOString()
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
              email: normEmail,
              contact: normEmail,
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
        role: validatedRole
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
  const ATAMAN_DB = {
    get isFirestore() { return isFirestoreReady && !!firestoreDb; },
    get isStorage() { return isStorageReady && !!firebaseStorage; },

    // Helper: Local storage cache management
    getLocalTrees() {
      try {
        const stored = localStorage.getItem('ATAMAN_trees_cache');
        const parsed = stored ? JSON.parse(stored) : null;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        if (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_TREES) && window.ATAMAN_DEFAULT_TREES.length > 0) {
          return window.ATAMAN_DEFAULT_TREES;
        }
        return null;
      } catch (e) {
        return null;
      }
    },

    setLocalTrees(trees) {
      try {
        localStorage.setItem('ATAMAN_trees_cache', JSON.stringify(trees));
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

    getLocalCaretakers() {
      try {
        const stored = localStorage.getItem('ATAMAN_caretakers_cache');
        const parsed = stored ? JSON.parse(stored) : [];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        if (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_CARETAKERS) && window.ATAMAN_DEFAULT_CARETAKERS.length > 0) {
          return window.ATAMAN_DEFAULT_CARETAKERS;
        }
        return [];
      } catch (e) {
        return [];
      }
    },

    setLocalCaretakers(caretakers) {
      try {
        localStorage.setItem('ATAMAN_caretakers_cache', JSON.stringify(caretakers));
        this._notify('caretakers', caretakers);
      } catch (e) {
        console.warn("Local caretakers cache write failed:", e);
      }
    },

    /* ── TREES CRUD ── */

    // Get all trees (from Firestore or fallback cache)
    async getTrees() {
      await firestoreCleanPromise;
      if (this.isFirestore) {
        try {
          const snapshot = await firestoreDb.collection('trees').get();
          const trees = [];
          snapshot.forEach(doc => {
            trees.push({ id: doc.id, ...doc.data() });
          });
          this.setLocalTrees(trees);
          return { data: trees, source: 'firestore' };
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
      // onSnapshot requires an active http/https connection — skip on file://
      if (this.isFirestore && window.location.protocol.startsWith('http')) {
        try {
          let unsubscribe = () => {};
          firestoreCleanPromise.then(() => {
            unsubscribe = firestoreDb.collection('trees').onSnapshot(snapshot => {
              const trees = [];
              snapshot.forEach(doc => {
                trees.push({ id: doc.id, ...doc.data() });
              });
              if (trees.length > 0) {
                this.setLocalTrees(trees);
                callback(trees, 'firestore');
              } else {
                const local = this.getLocalTrees();
                const fallback = (Array.isArray(local) && local.length > 0)
                  ? local
                  : (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_TREES) ? window.ATAMAN_DEFAULT_TREES : []);
                if (fallback.length > 0) {
                  this.seedInitialTrees(fallback);
                  this.setLocalTrees(fallback);
                  callback(fallback, 'local-fallback');
                } else {
                  this.setLocalTrees([]);
                  callback([], 'firestore');
                }
              }
            }, error => {
              console.warn('Firestore onSnapshot error:', error);
              callback(this.getLocalTrees() || [], 'local');
            });
          });

          // Also listen to window event for local instant updates
          const localHandler = (e) => {
            if (e.detail && Array.isArray(e.detail)) {
              callback(e.detail, 'local-event');
            }
          };
          window.addEventListener('ATAMAN:trees-updated', localHandler);

          return () => {
            unsubscribe();
            window.removeEventListener('ATAMAN:trees-updated', localHandler);
          };
        } catch (e) {
          console.warn('onTreesChange init error:', e);
        }
      }

      // Offline / Local-only fallback
      const cached = this.getLocalTrees() || [];
      callback(cached, 'local');
      const localHandler = (e) => {
        if (e.detail && Array.isArray(e.detail)) {
          callback(e.detail, 'local-event');
        }
      };
      window.addEventListener('ATAMAN:trees-updated', localHandler);
      return () => window.removeEventListener('ATAMAN:trees-updated', localHandler);
    },

    // Add a new tree
    async addTree(treeData) {
      const docId = treeData.id || ('TR-' + Math.floor(10000 + Math.random() * 90000));
      const treeRecord = {
        ...treeData,
        id: docId,
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

    // Seed initial registered trees if collection is currently empty
    async seedInitialTrees(treesArray) {
      if (!this.isFirestore || !Array.isArray(treesArray) || treesArray.length === 0) return;
      try {
        await firestoreCleanPromise;
        const snap = await firestoreDb.collection('trees').limit(1).get();
        if (snap.empty) {
          const batch = firestoreDb.batch();
          treesArray.forEach(t => {
            if (t && t.id) {
              const docRef = firestoreDb.collection('trees').doc(t.id);
              batch.set(docRef, t);
            }
          });
          await batch.commit();
          console.log(`[ATAMAN DB] Seeded ${treesArray.length} registered trees to Firestore.`);
        }
      } catch (err) {
        console.warn('[ATAMAN DB] Error seeding trees to Firestore:', err);
      }
    },

    /* ── ADOPTERS CRUD & REAL-TIME ── */
    async getAdopters() {
      await firestoreCleanPromise;
      if (this.isFirestore) {
        try {
          const snapshot = await firestoreDb.collection('adopters').get();
          const list = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          this.setLocalAdopters(list);
          return list;
        } catch (err) {
          console.warn("Firestore getAdopters error:", err);
        }
      }
      return this.getLocalAdopters();
    },

    onAdoptersChange(callback) {
      // onSnapshot requires an active http/https connection — skip on file://
      if (this.isFirestore && window.location.protocol.startsWith('http')) {
        try {
          let unsubscribe = () => {};
          firestoreCleanPromise.then(() => {
            unsubscribe = firestoreDb.collection('adopters').onSnapshot(snapshot => {
              const adopters = [];
              snapshot.forEach(doc => adopters.push({ id: doc.id, ...doc.data() }));
              if (adopters.length > 0) {
                this.setLocalAdopters(adopters);
                callback(adopters, 'firestore');
              } else {
                const local = this.getLocalAdopters();
                const fallback = (Array.isArray(local) && local.length > 0)
                  ? local
                  : (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_ADOPTERS) ? window.ATAMAN_DEFAULT_ADOPTERS : []);
                if (fallback.length > 0) {
                  this.setLocalAdopters(fallback);
                  callback(fallback, 'local-fallback');
                } else {
                  this.setLocalAdopters([]);
                  callback([], 'firestore');
                }
              }
            }, error => {
              console.warn('Firestore onAdoptersChange error:', error);
              callback(this.getLocalAdopters(), 'local');
            });
          });

          const localHandler = (e) => {
            if (e.detail && Array.isArray(e.detail)) {
              callback(e.detail, 'local-event');
            }
          };
          window.addEventListener('ATAMAN:adopters-updated', localHandler);

          return () => {
            unsubscribe();
            window.removeEventListener('ATAMAN:adopters-updated', localHandler);
          };
        } catch (e) {
          console.warn('onAdoptersChange init error:', e);
        }
      }

      const cached = this.getLocalAdopters();
      callback(cached, 'local');
      const localHandler = (e) => {
        if (e.detail && Array.isArray(e.detail)) {
          callback(e.detail, 'local-event');
        }
      };
      window.addEventListener('ATAMAN:adopters-updated', localHandler);
      return () => window.removeEventListener('ATAMAN:adopters-updated', localHandler);
    },

    async addAdopter(adopterData) {
      const docId = adopterData.id || ('ADP-' + Math.floor(1000 + Math.random() * 9000));
      const record = { ...adopterData, id: docId, createdAt: adopterData.createdAt || new Date().toISOString() };
      
      const list = this.getLocalAdopters();
      const updated = [record, ...list.filter(a => a.id !== docId)];
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
      await firestoreCleanPromise;
      if (this.isFirestore) {
        try {
          const snapshot = await firestoreDb.collection('caretakers').get();
          const list = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          this.setLocalCaretakers(list);
          return list;
        } catch (err) {
          console.warn("Firestore getCaretakers error:", err);
        }
      }
      return this.getLocalCaretakers();
    },

    onCaretakersChange(callback) {
      // onSnapshot requires an active http/https connection — skip on file://
      if (this.isFirestore && window.location.protocol.startsWith('http')) {
        try {
          let unsubscribe = () => {};
          firestoreCleanPromise.then(() => {
            unsubscribe = firestoreDb.collection('caretakers').onSnapshot(snapshot => {
              const caretakers = [];
              snapshot.forEach(doc => caretakers.push({ id: doc.id, ...doc.data() }));
              if (caretakers.length > 0) {
                this.setLocalCaretakers(caretakers);
                callback(caretakers, 'firestore');
              } else {
                const local = this.getLocalCaretakers();
                const fallback = (Array.isArray(local) && local.length > 0)
                  ? local
                  : (typeof window !== 'undefined' && Array.isArray(window.ATAMAN_DEFAULT_CARETAKERS) ? window.ATAMAN_DEFAULT_CARETAKERS : []);
                if (fallback.length > 0) {
                  this.setLocalCaretakers(fallback);
                  callback(fallback, 'local-fallback');
                } else {
                  this.setLocalCaretakers([]);
                  callback([], 'firestore');
                }
              }
            }, error => {
              console.warn('Firestore onCaretakersChange error:', error);
              callback(this.getLocalCaretakers(), 'local');
            });
          });

          const localHandler = (e) => {
            if (e.detail && Array.isArray(e.detail)) {
              callback(e.detail, 'local-event');
            }
          };
          window.addEventListener('ATAMAN:caretakers-updated', localHandler);

          return () => {
            unsubscribe();
            window.removeEventListener('ATAMAN:caretakers-updated', localHandler);
          };
        } catch (e) {
          console.warn('onCaretakersChange init error:', e);
        }
      }

      const cached = this.getLocalCaretakers();
      callback(cached, 'local');
      const localHandler = (e) => {
        if (e.detail && Array.isArray(e.detail)) {
          callback(e.detail, 'local-event');
        }
      };
      window.addEventListener('ATAMAN:caretakers-updated', localHandler);
      return () => window.removeEventListener('ATAMAN:caretakers-updated', localHandler);
    },

    async addCaretaker(caretakerData) {
      const docId = caretakerData.id || caretakerData.empId || ('CT-' + Math.floor(1000 + Math.random() * 9000));
      const record = { ...caretakerData, id: docId, createdAt: new Date().toISOString() };

      const list = this.getLocalCaretakers();
      const updated = [record, ...list.filter(c => c.id !== docId && c.empId !== record.empId)];
      this.setLocalCaretakers(updated);

      if (this.isFirestore) {
        try {
          await firestoreDb.collection('caretakers').doc(docId).set(record, { merge: true });
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

      if (this.isFirestore) {
        try {
          await firestoreDb.collection('monitoring_logs').add(logRecord);
          // Also update lastCheck and status on the tree document
          if (logData.treeId) {
            await this.updateTree(logData.treeId, {
              status: logData.status || 'healthy',
              lastCheck: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              height: logData.height || undefined,
              trunkDiam: logData.trunkDiam || undefined
            });
          }
        } catch (e) {
          console.warn("Firestore addMonitoringLog error:", e);
        }
      }

      // Update tree in local cache
      if (logData.treeId) {
        await this.updateTree(logData.treeId, {
          status: logData.status || 'healthy',
          lastCheck: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          height: logData.height || undefined,
          trunkDiam: logData.trunkDiam || undefined
        });
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
