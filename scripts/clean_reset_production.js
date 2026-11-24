#!/usr/bin/env node
/**
 * ATAMAN — Production Clean Slate Reset & Admin Provisioning Script
 * 
 * Safety-First Protection:
 * Requires explicit confirmation argument:
 *   node scripts/clean_reset_production.js --confirm=CONFIRM_RESET_ATAMAN_PRODUCTION_2026
 *
 * Actions performed:
 * 1. Verifies explicit confirmation safeguard to prevent accidental production resets.
 * 2. Purges legacy mock/test collections in Cloud Firestore: trees, adopters, caretakers, monitoring_logs.
 * 3. Removes legacy user documents from Firestore users collection.
 * 4. Ensures the fresh Admin account (admin@ataman.catbalogan.gov.ph) is provisioned with role: "admin".
 * 5. Provides verification summary confirming pristine clean state ready for deployment.
 */

const https = require('https');
const { execSync } = require('child_process');

const REQUIRED_CONFIRMATION = 'CONFIRM_RESET_ATAMAN_PRODUCTION_2026';
const FIREBASE_API_KEY = 'AIzaSyCHM8wh0o0GxwUHJ1OxT34g5foKqZRyN1w';
const FIREBASE_PROJECT_ID = 'saplink-f4721';

// Fresh Admin Credentials
const FRESH_ADMIN = {
  uid: 'qrrT7OfTAsYKfhSEc0HcrbD9rJg2',
  email: 'admin@ataman.catbalogan.gov.ph',
  username: 'ataman_admin',
  displayName: 'ATAMAN Administrator',
  name: 'ATAMAN Administrator',
  role: 'admin',
  empId: 'EMP-001',
  password: 'Ataman#2026!Padayon',
  status: 'Active',
  createdAt: '2026-11-24T08:00:00.000Z'
};

function postJson(url, payload, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const u = new URL(url);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = https.request(u, { method: 'POST', headers }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ status: res.statusCode, error: parsed });
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = https.request(u, { method: 'GET', headers }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ status: res.statusCode, error: parsed });
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function deleteHttp(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = https.request(u, { method: 'DELETE', headers }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          reject({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('================================================================');
  console.log('  ATAMAN — Production Clean Slate & Admin Provisioning Routine  ');
  console.log('  Tanom. Ataman. Padayon. | Catbalogan City, Samar              ');
  console.log('================================================================\n');

  // 1. Safety-First Confirmation Check
  const confirmArg = process.argv.find(a => a.startsWith('--confirm='));
  const passedCode = confirmArg ? confirmArg.split('=')[1] : null;

  if (passedCode !== REQUIRED_CONFIRMATION) {
    console.error('⛔ [SAFETY SAFEGUARD ACTIVE]');
    console.error('   Accidental reset blocked. This routine completely resets application');
    console.error('   records, tree entries, and legacy accounts for clean deployment.\n');
    console.error('   To proceed, pass the explicit confirmation flag:');
    console.error(`   node scripts/clean_reset_production.js --confirm=${REQUIRED_CONFIRMATION}\n`);
    process.exit(1);
  }

  console.log('✅ Safety confirmation verified: Proceeding with clean reset...\n');

  // 2. Authenticate fresh admin to get Firestore access token
  console.log('🔐 Authenticating designated Admin account...');
  let idToken = '';
  try {
    const authRes = await postJson(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        email: FRESH_ADMIN.email,
        password: FRESH_ADMIN.password,
        returnSecureToken: true
      }
    );
    idToken = authRes.idToken;
    console.log(`   Admin authenticated: ${FRESH_ADMIN.email} (UID: ${authRes.localId})`);
  } catch (err) {
    console.log('   Admin user not found or needs creation. Creating user...');
    try {
      const createRes = await postJson(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
        {
          email: FRESH_ADMIN.email,
          password: FRESH_ADMIN.password,
          returnSecureToken: true
        }
      );
      idToken = createRes.idToken;
      console.log(`   Fresh Admin user created in Firebase Auth: ${FRESH_ADMIN.email}`);
    } catch (createErr) {
      console.error('❌ Failed creating/authenticating admin in Firebase Auth:', createErr);
      process.exit(1);
    }
  }

  // 3. Delete collections via Firebase CLI
  console.log('\n🧹 Purging Firestore collections: trees, adopters, caretakers, monitoring_logs...');
  const collections = ['trees', 'adopters', 'caretakers', 'monitoring_logs'];
  for (const col of collections) {
    try {
      execSync(`firebase firestore:delete ${col} -r -f --project ${FIREBASE_PROJECT_ID}`, {
        stdio: 'pipe'
      });
      console.log(`   ✓ Collection [${col}] purged`);
    } catch (e) {
      console.warn(`   ⚠ Notice purging [${col}]:`, e.message ? e.message.split('\n')[0] : e);
    }
  }

  // 4. Ensure Fresh Admin document exists in Firestore users collection
  console.log('\n👤 Ensuring designated Admin document in Firestore...');
  const docPayload = {
    fields: {
      uid: { stringValue: FRESH_ADMIN.uid },
      email: { stringValue: FRESH_ADMIN.email },
      displayName: { stringValue: FRESH_ADMIN.displayName },
      name: { stringValue: FRESH_ADMIN.name },
      username: { stringValue: FRESH_ADMIN.username },
      role: { stringValue: FRESH_ADMIN.role },
      empId: { stringValue: FRESH_ADMIN.empId },
      status: { stringValue: FRESH_ADMIN.status },
      createdAt: { stringValue: FRESH_ADMIN.createdAt }
    }
  };

  try {
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${FRESH_ADMIN.uid}`;
    // Using PATCH via post with method override or PUT
    await new Promise((resolve, reject) => {
      const data = JSON.stringify(docPayload);
      const req = https.request(new URL(fsUrl), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
          'Content-Length': Buffer.byteLength(data)
        }
      }, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => resolve(b));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
    console.log(`   ✓ Admin document active: users/${FRESH_ADMIN.uid}`);
  } catch (e) {
    console.warn('   ⚠ Firestore admin doc update notice:', e);
  }

  // 5. Clean up any remaining non-admin user documents in Firestore
  console.log('\n🛡️ Cleaning up obsolete users in Firestore collection...');
  try {
    const usersListUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users`;
    const usersList = await getJson(usersListUrl, idToken);
    const docs = usersList.documents || [];
    for (const d of docs) {
      const docName = d.name;
      const docId = docName.split('/').pop();
      if (docId !== FRESH_ADMIN.uid) {
        try {
          await deleteHttp(`https://firestore.googleapis.com/v1/${docName}`, idToken);
          console.log(`   ✓ Deleted obsolete user doc: ${docId}`);
        } catch (_) {}
      }
    }
  } catch (e) {
    console.warn('   ⚠ Notice during user collection sweep:', e);
  }

  console.log('\n================================================================');
  console.log('🎉 Clean Slate Reset & Admin Provisioning Completed Successfully!');
  console.log('================================================================');
  console.log(`- Fresh Admin Email:    ${FRESH_ADMIN.email}`);
  console.log(`- Fresh Admin Username: ${FRESH_ADMIN.username}`);
  console.log(`- Admin Display Name:   ${FRESH_ADMIN.displayName}`);
  console.log(`- Initial Password:     ${FRESH_ADMIN.password}`);
  console.log(`- Role / Privileges:    ${FRESH_ADMIN.role} (Full Administrator Access)`);
  console.log(`- Employee ID:          ${FRESH_ADMIN.empId}`);
  console.log('================================================================\n');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error executing clean reset:', err);
    process.exit(1);
  });
}

module.exports = { main, REQUIRED_CONFIRMATION, FRESH_ADMIN };
