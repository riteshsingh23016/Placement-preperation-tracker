const { spawn } = require('child_process');
const axios = require('d:/placement-prep-tracker/backend/node_modules/axios');
const dotenv = require('d:/placement-prep-tracker/backend/node_modules/dotenv');

dotenv.config({ path: 'd:/placement-prep-tracker/backend/.env' });

const TEST_PORT = '5062';
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function runTests() {
  let serverProcess = null;
  try {
    console.log("Starting backend server for validation audit on port 5062...");
    serverProcess = spawn('node', ['server.js'], {
      cwd: 'd:/placement-prep-tracker/backend',
      env: { ...process.env, PORT: TEST_PORT }
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[Server] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data.toString().trim()}`);
    });

    // Wait for server to boot
    await new Promise(resolve => setTimeout(resolve, 4500));
    console.log("Server booted. Starting tests...");

    // 1. Logins
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

    // ==========================================
    // TEST 1: SIGNUP NAME VALIDATION
    // ==========================================
    console.log("\nTesting User Signup Validation...");
    const badSignups = [
      { name: '12345', email: 'test1@colleges.edu', password: 'Password@123', expectedMsg: 'cannot contain only numbers' },
      { name: 'A', email: 'test2@colleges.edu', password: 'Password@123', expectedMsg: 'between 2 and 100 characters' },
      { name: '<script>alert(1)</script>', email: 'test3@colleges.edu', password: 'Password@123', expectedMsg: 'letters and spaces only' },
      { name: '!!!', email: 'test4@colleges.edu', password: 'Password@123', expectedMsg: 'must contain letters' }
    ];

    for (const test of badSignups) {
      try {
        await axios.post(`${BASE_URL}/auth/signup`, {
          name: test.name,
          email: test.email,
          password: test.password,
          role: 'student'
        });
        throw new Error(`Signup should have failed for name: ${test.name}`);
      } catch (err) {
        if (!err.response || err.response.status !== 400) {
          throw new Error(`Expected HTTP 400 for signup with name "${test.name}", got: ${err.message}`);
        }
        const msg = err.response.data.message;
        if (!msg.toLowerCase().includes(test.expectedMsg.toLowerCase())) {
          throw new Error(`Expected error containing "${test.expectedMsg}", got "${msg}"`);
        }
        console.log(`✅ Signup rejected invalid name "${test.name}" with message: "${msg}"`);
      }
    }

    // ==========================================
    // TEST 2: PROFILE UPDATE VALIDATION (STUDENT)
    // ==========================================
    console.log("\nTesting Student Profile Update Validation...");
    const badProfileUpdates = [
      {
        field: 'phoneNumber',
        payload: { phoneNumber: '123' },
        expectedMsg: 'exactly 10 digits'
      },
      {
        field: 'phoneNumber',
        payload: { phoneNumber: '+91 9876543210' },
        expectedMsg: 'exactly 10 digits'
      },
      {
        field: 'phoneNumber',
        payload: { phoneNumber: '987654321a' },
        expectedMsg: 'exactly 10 digits'
      },
      {
        field: 'bio',
        payload: { bio: '<script>alert(1)</script>' },
        expectedMsg: 'forbidden script content'
      },
      {
        field: 'graduationYear',
        payload: { graduationYear: '202' },
        expectedMsg: '4-digit number'
      },
      {
        field: 'graduationYear',
        payload: { graduationYear: '2150' },
        expectedMsg: 'between 1900 and 2100'
      },
      {
        field: 'linkedinUrl',
        payload: { linkedinUrl: 'not-a-url' },
        expectedMsg: 'valid URL starting with http:// or https://'
      }
    ];

    for (const test of badProfileUpdates) {
      try {
        await axios.put(`${BASE_URL}/auth/profile`, test.payload, studentHeader);
        throw new Error(`Profile update should have failed for: ${JSON.stringify(test.payload)}`);
      } catch (err) {
        if (!err.response || err.response.status !== 400) {
          throw new Error(`Expected HTTP 400 for profile update: ${JSON.stringify(test.payload)}, got: ${err.message}`);
        }
        const msg = err.response.data.message;
        if (!msg.toLowerCase().includes(test.expectedMsg.toLowerCase())) {
          throw new Error(`Expected error containing "${test.expectedMsg}", got "${msg}"`);
        }
        console.log(`✅ Profile update rejected invalid ${test.field} with message: "${msg}"`);
      }
    }

    // Test a valid student profile update
    const validProfile = {
      name: 'Test Student',
      phoneNumber: '9876543210',
      bio: 'Just another passionate coder.',
      collegeName: 'IIT Madras',
      course: 'B.Tech',
      branch: 'CSE',
      graduationYear: '2027',
      linkedinUrl: 'https://linkedin.com/in/teststudent',
      githubUrl: 'https://github.com/teststudent'
    };
    const validProfileRes = await axios.put(`${BASE_URL}/auth/profile`, validProfile, studentHeader);
    if (validProfileRes.status !== 200 || !validProfileRes.data.success) {
      throw new Error(`Valid profile update failed! Response: ${JSON.stringify(validProfileRes.data)}`);
    }
    console.log("✅ Valid profile update successfully accepted by backend.");

    // ==========================================
    // TEST 3: NOTE & COLLECTION VALIDATIONS
    // ==========================================
    console.log("\nTesting Note Validation...");
    // 3a. Notes Title and Content limits and scripts
    const badNotes = [
      { title: '', content: 'Some content', expectedMsg: 'title is required' },
      { title: 'A'.repeat(101), content: 'Some content', expectedMsg: 'must not exceed 100 characters' },
      { title: '<script>alert(1)</script>', content: 'Some content', expectedMsg: 'forbidden script content' },
      { title: 'Valid Note', content: '', expectedMsg: 'content is required' },
      { title: 'Valid Note', content: 'A'.repeat(5001), expectedMsg: 'must not exceed 5000 characters' },
      { title: 'Valid Note', content: 'JavaScript:alert(1)', expectedMsg: 'forbidden script content' }
    ];

    for (const test of badNotes) {
      try {
        await axios.post(`${BASE_URL}/notes`, {
          title: test.title,
          content: test.content
        }, studentHeader);
        throw new Error(`Note creation should have failed for title: ${test.title}`);
      } catch (err) {
        if (!err.response || err.response.status !== 400) {
          throw new Error(`Expected HTTP 400 for note creation, got: ${err.message}`);
        }
        const msg = err.response.data.message;
        if (!msg.toLowerCase().includes(test.expectedMsg.toLowerCase())) {
          throw new Error(`Expected error containing "${test.expectedMsg}", got "${msg}"`);
        }
        console.log(`✅ Note creation rejected invalid input with message: "${msg}"`);
      }
    }

    // 3b. Collections name, color, and icon Whitelist
    console.log("\nTesting Collection Validation...");
    const badCollections = [
      { name: '', color: 'blue', icon: 'folder', expectedMsg: 'name is required' },
      { name: 'A', color: 'blue', icon: 'folder', expectedMsg: 'between 2 and 100 characters' },
      { name: '12345', color: 'blue', icon: 'folder', expectedMsg: 'cannot contain only numbers' },
      { name: 'System DSA', color: 'invalid-color', icon: 'folder', expectedMsg: 'Invalid selection for collection color' },
      { name: 'System DSA', color: 'blue', icon: 'invalid-icon', expectedMsg: 'Invalid selection for collection icon' }
    ];

    for (const test of badCollections) {
      try {
        await axios.post(`${BASE_URL}/collections`, {
          name: test.name,
          color: test.color,
          icon: test.icon
        }, studentHeader);
        throw new Error(`Collection creation should have failed for: ${test.name}`);
      } catch (err) {
        if (!err.response || err.response.status !== 400) {
          throw new Error(`Expected HTTP 400 for collection creation, got: ${err.message}`);
        }
        const msg = err.response.data.message;
        if (!msg.toLowerCase().includes(test.expectedMsg.toLowerCase())) {
          throw new Error(`Expected error containing "${test.expectedMsg}", got "${msg}"`);
        }
        console.log(`✅ Collection creation rejected invalid input with message: "${msg}"`);
      }
    }

    // Create a valid collection
    const validColRes = await axios.post(`${BASE_URL}/collections`, {
      name: 'System Design',
      color: 'purple',
      icon: 'database'
    }, studentHeader);
    const collectionId = validColRes.data.data._id;
    console.log("✅ Valid collection created successfully.");

    // Create a valid note inside this collection
    const validNoteRes = await axios.post(`${BASE_URL}/notes`, {
      title: 'Scalability Patterns',
      content: 'Horizontal vs Vertical scaling. Load balancers, caching and sharding.',
      collectionId
    }, studentHeader);
    console.log("✅ Valid note created successfully inside the collection.");

    // ==========================================
    // TEST 4: PLACEMENT DRIVES (ADMIN)
    // ==========================================
    console.log("\nTesting Placement Drive Validation (Admin)...");
    const badDrives = [
      { payload: { companyName: '', role: 'SDE' }, expectedMsg: 'company name is required' },
      { payload: { companyName: 'Acme', role: 'SDE', package: 'invalid-pkg' }, expectedMsg: 'package must be a valid positive number' },
      { payload: { companyName: 'Acme', role: 'SDE', package: '150' }, expectedMsg: 'must not exceed 100 lpa' },
      { payload: { companyName: 'Acme', role: 'SDE', description: 'JavaScript:alert(1)' }, expectedMsg: 'description contains forbidden script content' }
    ];

    for (const test of badDrives) {
      try {
        await axios.post(`${BASE_URL}/admin/drives`, test.payload, adminHeader);
        throw new Error(`Drive creation should have failed for: ${JSON.stringify(test.payload)}`);
      } catch (err) {
        if (!err.response || err.response.status !== 400) {
          throw new Error(`Expected HTTP 400 for drive creation, got: ${err.message}`);
        }
        const msg = err.response.data.message;
        if (!msg.toLowerCase().includes(test.expectedMsg.toLowerCase())) {
          throw new Error(`Expected error containing "${test.expectedMsg}", got "${msg}"`);
        }
        console.log(`✅ Drive creation rejected invalid input with message: "${msg}"`);
      }
    }

    // Create a valid drive
    const validDrive = {
      companyName: 'Acme Corp',
      role: 'Software Engineer',
      package: '24',
      driveDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days in the future
      description: 'Acme is looking for brilliant software engineers.'
    };
    const validDriveRes = await axios.post(`${BASE_URL}/admin/drives`, validDrive, adminHeader);
    console.log("✅ Valid placement drive created successfully.");

    // ==========================================
    // TEST 5: ANNOUNCEMENTS & STUDENT NOTIFICATIONS (ADMIN)
    // ==========================================
    console.log("\nTesting Announcement Validation (Admin)...");
    const badAnnouncements = [
      { payload: { title: '', message: 'Test message' }, expectedMsg: 'title is required' },
      { payload: { title: '12345', message: 'Test message' }, expectedMsg: 'cannot contain only numbers' },
      { payload: { title: 'Announcement', message: '<script>alert(1)</script>' }, expectedMsg: 'forbidden script content' },
      { payload: { title: 'Announcement', message: 'Test message', type: 'invalid-type' }, expectedMsg: 'Invalid selection for announcement type' }
    ];

    for (const test of badAnnouncements) {
      try {
        await axios.post(`${BASE_URL}/announcements`, test.payload, adminHeader);
        throw new Error(`Announcement creation should have failed for: ${JSON.stringify(test.payload)}`);
      } catch (err) {
        if (!err.response || err.response.status !== 400) {
          throw new Error(`Expected HTTP 400 for announcement creation, got: ${err.message}`);
        }
        const msg = err.response.data.message;
        if (!msg.toLowerCase().includes(test.expectedMsg.toLowerCase())) {
          throw new Error(`Expected error containing "${test.expectedMsg}", got "${msg}"`);
        }
        console.log(`✅ Announcement creation rejected invalid input with message: "${msg}"`);
      }
    }

    // Create a valid announcement
    const validAnnRes = await axios.post(`${BASE_URL}/announcements`, {
      title: 'Placement Orientation',
      message: 'All final year students must attend the placement orientation session on Microsoft Teams.',
      type: 'urgent'
    }, adminHeader);
    console.log("✅ Valid announcement created successfully.");

    console.log("\nTesting Student Custom Notification Send Validation (Admin)...");
    // Find student ID
    const studentId = studentLogin.data.data._id;
    const badNotifications = [
      { payload: { title: '', message: 'Hello' }, expectedMsg: 'title is required' },
      { payload: { title: 'Welcome', message: '' }, expectedMsg: 'message is required' },
      { payload: { title: 'Welcome', message: 'Hello', priority: 'invalid-priority' }, expectedMsg: 'Invalid selection for notification priority' }
    ];

    for (const test of badNotifications) {
      try {
        await axios.post(`${BASE_URL}/admin/students/${studentId}/notifications`, test.payload, adminHeader);
        throw new Error(`Notification send should have failed for: ${JSON.stringify(test.payload)}`);
      } catch (err) {
        if (!err.response || err.response.status !== 400) {
          throw new Error(`Expected HTTP 400 for notification send, got: ${err.message}`);
        }
        const msg = err.response.data.message;
        if (!msg.toLowerCase().includes(test.expectedMsg.toLowerCase())) {
          throw new Error(`Expected error containing "${test.expectedMsg}", got "${msg}"`);
        }
        console.log(`✅ Custom notification send rejected invalid input with message: "${msg}"`);
      }
    }

    // Send a valid custom notification
    await axios.post(`${BASE_URL}/admin/students/${studentId}/notifications`, {
      title: 'Resume Approved',
      message: 'Your resume format has been approved by the admin team. Good luck!',
      priority: 'medium'
    }, adminHeader);
    console.log("✅ Valid custom student notification sent successfully.");

    console.log("\n=================================================");
    console.log("🎉 ALL VALIDATION AUDIT TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("=================================================");

  } catch (err) {
    console.error("❌ VALIDATION TEST SUITE FAILED:", err);
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
