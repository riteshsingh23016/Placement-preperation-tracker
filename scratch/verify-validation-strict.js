const { spawn } = require('child_process');
const axios = require('d:/placement-prep-tracker/backend/node_modules/axios');
const dotenv = require('d:/placement-prep-tracker/backend/node_modules/dotenv');

dotenv.config({ path: 'd:/placement-prep-tracker/backend/.env' });

const TEST_PORT = '5062';
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function runTests() {
  let serverProcess = null;
  try {
    console.log("Starting backend server for strict validation verification on port 5062...");
    serverProcess = spawn('node', ['server.js'], {
      cwd: 'd:/placement-prep-tracker/backend',
      env: { ...process.env, PORT: TEST_PORT }
    });

    serverProcess.stdout.on('data', (data) => {
      // Optional: uncomment for verbose server logs
      // console.log(`[Server] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data.toString().trim()}`);
    });

    // Wait for server to boot
    await new Promise(resolve => setTimeout(resolve, 4500));
    console.log("Server booted. Starting tests...");

    // Logins
    console.log("\nLogging in as Admin (riteshthelegend10f@gmail.com)...");
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'riteshthelegend10f@gmail.com',
      password: 'admin123',
      expectedRole: 'admin'
    });
    const adminToken = adminLogin.data.data.token;
    console.log("✅ Admin logged in.");

    console.log("\nLogging in as Student (abcde@gmail.com)...");
    const studentLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'abcde@gmail.com',
      password: 'Student@123',
      expectedRole: 'student'
    });
    const studentToken = studentLogin.data.data.token;
    console.log("✅ Student logged in.");

    const adminHeader = { headers: { Authorization: `Bearer ${adminToken}` } };
    const studentHeader = { headers: { Authorization: `Bearer ${studentToken}` } };

    // Helper for testing rejection
    const testRejection = async (method, path, data, headers, expectedSubstrings) => {
      try {
        if (method === 'POST') {
          await axios.post(`${BASE_URL}${path}`, data, headers);
        } else if (method === 'PUT') {
          await axios.put(`${BASE_URL}${path}`, data, headers);
        }
        throw new Error(`Request to ${path} should have failed but succeeded!`);
      } catch (err) {
        if (!err.response) {
          throw err;
        }
        if (err.response.status !== 400 && err.response.status !== 422) {
          throw new Error(`Expected HTTP 400/422, got HTTP ${err.response.status} for ${path}`);
        }
        const msg = (err.response.data.message || "") + " " + JSON.stringify(err.response.data.errors || {} || err.response.data);
        for (const sub of expectedSubstrings) {
          if (!msg.toLowerCase().includes(sub.toLowerCase())) {
            throw new Error(`Expected error message for ${path} containing "${sub}", got "${msg}"`);
          }
        }
      }
    };

    // =========================================================================
    // 1. SIGNUP & PROFILE EMAIL VALIDATIONS (Password Recovery & Verification)
    // =========================================================================
    console.log("\n--- Testing Password Recovery & Verification Email Sanitization ---");
    // Invalid email checks on password recovery & verification routes
    const badEmailPayloads = [
      { email: 'bademail', expected: ['valid email'] },
      { email: 'bad@', expected: ['valid email'] },
      { email: 'bad@com', expected: ['valid email'] },
      { email: 'bad @gmail.com', expected: ['space'] },
      { email: 'bad@gmail.', expected: ['valid email'] }
    ];
    for (const test of badEmailPayloads) {
      await testRejection('POST', '/auth/forgot-password', { email: test.email, role: 'student' }, {}, test.expected);
      await testRejection('POST', '/auth/verify-otp', { email: test.email, otp: '123456' }, {}, test.expected);
      await testRejection('POST', '/auth/reset-password', { email: test.email, otp: '123456', newPassword: 'Password@123' }, {}, test.expected);
      await testRejection('POST', '/auth/resend-verification', { email: test.email }, {}, test.expected);
      await testRejection('POST', '/auth/verify-email-otp', { email: test.email, otp: '123456' }, {}, test.expected);
    }
    console.log("✅ All email recovery/verification routes strictly reject malformed emails.");

    // =========================================================================
    // 2. NAME FIELDS (Full Name)
    // =========================================================================
    console.log("\n--- Testing Full Name Field Strictness ---");
    const badNames = [
      { name: '123456', expected: ['only numbers'] },
      { name: 'A', expected: ['between 2 and 100'] },
      { name: 'Ritesh123', expected: ['letters and spaces only'] },
      { name: 'Ritesh!!!', expected: ['letters and spaces only'] },
      { name: '!!!', expected: ['letters'] },
      { name: '   ', expected: ['required'] }
    ];
    for (const test of badNames) {
      await testRejection('POST', '/auth/signup', { name: test.name, email: 'valid@gmail.com', password: 'Password@123' }, {}, test.expected);
      await testRejection('PUT', '/auth/profile', { name: test.name }, studentHeader, test.expected);
    }
    console.log("✅ Full Name strictly rejects numbers, symbols, spaces-only, and short values.");

    // =========================================================================
    // 3. MOBILE NUMBER RULES
    // =========================================================================
    console.log("\n--- Testing Mobile Number Field Strictness ---");
    const badMobiles = [
      { num: '12345', expected: ['exactly 10 digits'] }, // Shorter than 10
      { num: '12345678901', expected: ['exactly 10 digits'] }, // Longer than 10
      { num: '98765 43210', expected: ['exactly 10 digits'] }, // Spaces
      { num: '98765abcde', expected: ['exactly 10 digits'] }, // Letters
      { num: '98765!!!00', expected: ['exactly 10 digits'] }, // Symbols
      { num: '+9198765432', expected: ['exactly 10 digits'] }, // Country code / symbol +
      { num: '5876543210', expected: ['exactly 10 digits'] } // Starts with 5 (invalid Indian prefix)
    ];
    for (const test of badMobiles) {
      await testRejection('PUT', '/auth/profile', { phoneNumber: test.num }, studentHeader, test.expected);
    }
    console.log("✅ Mobile numbers strictly enforce Indian mobile checks (exactly 10 digits, no spaces/letters/symbols/country codes).");

    // =========================================================================
    // 4. GENERAL TEXT FIELDS (College, Skills, Location, etc.)
    // =========================================================================
    console.log("\n--- Testing Profile Text Field Strictness (College, Skills, location) ---");
    const badProfileText = [
      { payload: { collegeName: '12345' }, expected: ['cannot contain only numbers'] },
      { payload: { collegeName: '!!!' }, expected: ['special characters'] },
      { payload: { collegeName: '<script>alert(1)</script>' }, expected: ['script'] },
      { payload: { skills: '12345' }, expected: ['cannot contain only numbers'] },
      { payload: { skills: '!!!' }, expected: ['special characters'] },
      { payload: { skills: '<script>alert(1)</script>' }, expected: ['script'] }
    ];
    for (const test of badProfileText) {
      await testRejection('PUT', '/auth/profile', test.payload, studentHeader, test.expected);
    }
    console.log("✅ Profile text fields reject numbers-only, symbol-only, and script injection.");

    // =========================================================================
    // 5. PACKAGE & SALARY FIELDS (Package limits & negatives)
    // =========================================================================
    console.log("\n--- Testing Package / Salary Field Strictness ---");
    const badPackages = [
      { pkg: '-15', expected: ['valid positive number'] },
      { pkg: '0', expected: ['greater than 0'] },
      { pkg: 'abc', expected: ['valid positive number'] },
      { pkg: '150', expected: ['must not exceed 100'] }
    ];
    for (const test of badPackages) {
      // 5a. Student Company Pipeline package
      await testRejection('POST', '/companies', { companyName: 'Acme Inc', role: 'SDE', package: test.pkg }, studentHeader, test.expected);
      // 5b. Admin Drive package
      await testRejection('POST', '/admin/drives', { companyName: 'Acme Inc', role: 'SDE', package: test.pkg }, adminHeader, test.expected);
    }
    console.log("✅ Package fields strictly reject negative numbers, letters, zero, and values over 100 LPA.");

    // =========================================================================
    // 6. FUTURE-ONLY DATE FIELDS
    // =========================================================================
    console.log("\n--- Testing Date Field Strictness (Future-only when Scheduled) ---");
    const pastDate = '2020-01-01';
    await testRejection('POST', '/companies', {
      companyName: 'Acme Inc',
      role: 'SDE',
      status: 'Interview Scheduled',
      interviewDate: pastDate
    }, studentHeader, ['cannot be in the past']);
    console.log("✅ Interview Date strictly rejects past dates when status is 'Interview Scheduled'.");

    // =========================================================================
    // 7. SYMBOL-ONLY & SCRIPT INJECTION IN TITLES (Announcements, Collections, Notifications)
    // =========================================================================
    console.log("\n--- Testing Announcement, Collection, Note, and Notification Title Strictness ---");
    
    // 7a. Collection Name (rejects numbers-only, symbol-only, script)
    await testRejection('POST', '/collections', { name: '12345', color: 'blue', icon: 'folder' }, studentHeader, ['cannot contain only numbers']);
    await testRejection('POST', '/collections', { name: '!!!', color: 'blue', icon: 'folder' }, studentHeader, ['cannot consist only of special characters']);
    await testRejection('POST', '/collections', { name: '<script>alert(1)</script>', color: 'blue', icon: 'folder' }, studentHeader, ['forbidden script content']);

    // 7b. Note Title (rejects numbers-only, symbol-only, script)
    await testRejection('POST', '/notes', { title: '12345', content: 'Note content' }, studentHeader, ['cannot contain only numbers']);
    await testRejection('POST', '/notes', { title: '!!!', content: 'Note content' }, studentHeader, ['cannot consist only of special characters']);
    await testRejection('POST', '/notes', { title: '<script>alert(1)</script>', content: 'Note content' }, studentHeader, ['forbidden script content']);

    // 7c. Announcement Title (rejects numbers-only, symbol-only, script)
    await testRejection('POST', '/announcements', { title: '12345', message: 'Ann message' }, adminHeader, ['cannot contain only numbers']);
    await testRejection('POST', '/announcements', { title: '!!!', message: 'Ann message' }, adminHeader, ['cannot consist only of special characters']);
    await testRejection('POST', '/announcements', { title: '<script>alert(1)</script>', message: 'Ann message' }, adminHeader, ['forbidden script content']);

    // 7d. Custom Notification Title (rejects numbers-only, symbol-only, script)
    const studentId = studentLogin.data.data._id;
    await testRejection('POST', `/admin/students/${studentId}/notifications`, { title: '12345', message: 'Notif message', priority: 'medium' }, adminHeader, ['cannot contain only numbers']);
    await testRejection('POST', `/admin/students/${studentId}/notifications`, { title: '!!!', message: 'Notif message', priority: 'medium' }, adminHeader, ['cannot consist only of special characters']);
    await testRejection('POST', `/admin/students/${studentId}/notifications`, { title: '<script>alert(1)</script>', message: 'Notif message', priority: 'medium' }, adminHeader, ['forbidden script content']);

    console.log("✅ Announcement, Collection, Note, and Notification Titles strictly reject numbers-only, symbol-only, and script injection.");

    // =========================================================================
    // 8. DROPDOWN VALUES
    // =========================================================================
    console.log("\n--- Testing Dropdown Whitelist Strictness ---");
    // 8a. Collection color and icon dropdown validation
    await testRejection('POST', '/collections', { name: 'OS Design', color: 'invalid-color' }, studentHeader, ['color']);
    await testRejection('POST', '/collections', { name: 'OS Design', icon: 'invalid-icon' }, studentHeader, ['icon']);

    // 8b. Announcement type validation
    await testRejection('POST', '/announcements', { title: 'New Event', message: 'Msg', type: 'invalid-type' }, adminHeader, ['type']);

    // 8c. Custom Notification priority validation
    await testRejection('POST', `/admin/students/${studentId}/notifications`, { title: 'New Alert', message: 'Msg', priority: 'invalid-priority' }, adminHeader, ['priority']);

    // 8d. Company status and priority validation
    await testRejection('POST', '/companies', { companyName: 'Acme Inc', role: 'SDE', status: 'invalid-status' }, studentHeader, ['status']);
    await testRejection('POST', '/companies', { companyName: 'Acme Inc', role: 'SDE', priority: 'invalid-priority' }, studentHeader, ['priority']);

    // 8e. Drive status and mode validation
    await testRejection('POST', '/admin/drives', { companyName: 'Acme Inc', role: 'SDE', status: 'invalid-status' }, adminHeader, ['status']);
    await testRejection('POST', '/admin/drives', { companyName: 'Acme Inc', role: 'SDE', mode: 'invalid-mode' }, adminHeader, ['mode']);

    console.log("✅ All dropdown inputs are strictly validated against their whitelists on the backend.");

    console.log("\n=================================================");
    console.log("🎉 ALL STRICT VALIDATION TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("=================================================");

  } catch (err) {
    console.error("❌ STRICT VALIDATION TEST SUITE FAILED:", err);
    if (err.response) {
      console.error("Server response details:", JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  } finally {
    if (serverProcess) {
      console.log("Shutting down backend server...");
      serverProcess.kill();
    }
  }
}

runTests();
