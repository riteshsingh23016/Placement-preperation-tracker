const axios = require('d:/placement-prep-tracker/backend/node_modules/axios');
const mongoose = require('d:/placement-prep-tracker/backend/node_modules/mongoose');
const dotenv = require('d:/placement-prep-tracker/backend/node_modules/dotenv');

dotenv.config({ path: 'd:/placement-prep-tracker/backend/.env' });

const BASE_URL = 'http://localhost:5000/api';

async function run() {
  console.log("=== STARTING COMPANY VALIDATION INTEGRATION TESTS ===");
  let token = "";

  try {
    // 1. LOGIN AS STUDENT
    console.log("Logging in as student: abcde@gmail.com...");
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'abcde@gmail.com',
      password: 'Student@123'
    });
    token = loginRes.data.data.token;
    console.log("Login successful! Token acquired.");
  } catch (err) {
    console.error("Failed to login as student. Make sure server is running and seeded.", err.message);
    process.exit(1);
  }

  const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'Authorization': `Bearer ${token}` }
  });

  let passCount = 0;
  let failCount = 0;

  async function testCase(name, payload, expectedStatus, expectedErrorField, verifyResponse) {
    try {
      const res = await client.post('/companies', payload);
      if (res.status === expectedStatus && expectedStatus === 201) {
        if (verifyResponse) {
          const verifyErr = verifyResponse(res.data);
          if (verifyErr) {
            console.log(`❌ TEST FAILED: ${name} (Response validation failed: ${verifyErr})`);
            failCount++;
            return;
          }
        }
        console.log(`✅ TEST PASSED: ${name} (Created successfully)`);
        passCount++;
        // Clean up
        if (res.data.data && res.data.data._id) {
          await client.delete(`/companies/${res.data.data._id}`);
        }
      } else {
        console.log(`❌ TEST FAILED: ${name} (Expected error, but got 201 Created)`);
        failCount++;
        // Clean up
        if (res.data.data && res.data.data._id) {
          await client.delete(`/companies/${res.data.data._id}`);
        }
      }
    } catch (err) {
      if (err.response) {
        if (err.response.status === expectedStatus) {
          if (expectedStatus === 400 && expectedErrorField) {
            const errors = err.response.data.errors || {};
            if (errors[expectedErrorField]) {
              console.log(`✅ TEST PASSED: ${name} (Failed with 400 and expected error on field '${expectedErrorField}': "${errors[expectedErrorField]}")`);
              passCount++;
            } else {
              console.log(`❌ TEST FAILED: ${name} (Failed with 400, but error field '${expectedErrorField}' not found. Errors:`, errors, ")");
              failCount++;
            }
          } else {
            console.log(`✅ TEST PASSED: ${name} (Failed with expected status ${expectedStatus})`);
            passCount++;
          }
        } else {
          console.log(`❌ TEST FAILED: ${name} (Expected status ${expectedStatus}, but got ${err.response.status}. Error:`, err.response.data, ")");
          failCount++;
        }
      } else {
        console.log(`❌ TEST FAILED: ${name} (Network / other error: ${err.message})`);
        failCount++;
      }
    }
  }

  // --- TEST SUITES ---

  // 1. Valid application creation
  await testCase("Valid Company creation", {
    companyName: "Google India",
    role: "Software Engineer 2025",
    package: "32.5",
    status: "Applied",
    priority: "High",
    notes: "No HTML tags here."
  }, 201);

  // 2. Company Name validations
  await testCase("Company Name required", {
    companyName: "",
    role: "SDE"
  }, 400, "companyName");

  await testCase("Company Name min length", {
    companyName: "A",
    role: "SDE"
  }, 400, "companyName");

  await testCase("Company Name max length", {
    companyName: "A".repeat(101),
    role: "SDE"
  }, 400, "companyName");

  await testCase("Company Name numeric only", {
    companyName: "123456",
    role: "SDE"
  }, 400, "companyName");

  await testCase("Company Name invalid special characters", {
    companyName: "Acme [Labs]",
    role: "SDE"
  }, 400, "companyName");

  await testCase("Company Name special character only", {
    companyName: "  &.-'  ",
    role: "SDE"
  }, 400, "companyName");

  // 3. Job Role validations
  await testCase("Job Role required", {
    companyName: "Google",
    role: ""
  }, 400, "role");

  await testCase("Job Role min length", {
    companyName: "Google",
    role: "I"
  }, 400, "role");

  await testCase("Job Role max length", {
    companyName: "Google",
    role: "S".repeat(81)
  }, 400, "role");

  await testCase("Job Role numeric only", {
    companyName: "Google",
    role: "8888"
  }, 400, "role");

  await testCase("Job Role special character only", {
    companyName: "Google",
    role: "!!!@@@"
  }, 400, "role");

  // 4. Package validations
  await testCase("Package optional check (valid if empty)", {
    companyName: "Google",
    role: "SDE",
    package: ""
  }, 201);

  await testCase("Package invalid text", {
    companyName: "Google",
    role: "SDE",
    package: "twenty"
  }, 400, "package");

  await testCase("Package negative number", {
    companyName: "Google",
    role: "SDE",
    package: "-5"
  }, 400, "package");

  // 5. Interview Date validations
  await testCase("Interview Date past date check", {
    companyName: "Google",
    role: "SDE",
    interviewDate: "2020-01-01"
  }, 400, "interviewDate");

  // 6. Notes validations
  await testCase("Notes length exceeding 1000", {
    companyName: "Google",
    role: "SDE",
    notes: "a".repeat(1001)
  }, 400, "notes");

  await testCase("Notes script injection - script tag", {
    companyName: "Google",
    role: "SDE",
    notes: "Hello <script>alert(1)</script>"
  }, 400, "notes");

  await testCase("Notes script injection - javascript protocol", {
    companyName: "Google",
    role: "SDE",
    notes: "javascript:alert(1)"
  }, 400, "notes");

  await testCase("Notes script injection - inline event", {
    companyName: "Google",
    role: "SDE",
    notes: "notes with onload=alert(1)"
  }, 400, "notes");

  await testCase("Notes HTML tag stripping (sanitization)", {
    companyName: "Google",
    role: "SDE",
    notes: "Hello <b>world</b>, this is <i>italic</i>"
  }, 201, null, (data) => {
    const savedNotes = data.data.notes;
    if (savedNotes !== "Hello world, this is italic") {
      return `Expected notes to be stripped of HTML tags, but got: "${savedNotes}"`;
    }
    return null;
  });

  // 7. Status & Priority enum validations
  await testCase("Status not in allowed list (Pending is forbidden)", {
    companyName: "Google",
    role: "SDE",
    status: "Pending"
  }, 400, "status");

  await testCase("Priority not in allowed list", {
    companyName: "Google",
    role: "SDE",
    priority: "Critical"
  }, 400, "priority");

  // --- SUMMARY ---
  console.log("\n=== VALIDATION TEST SUMMARY ===");
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
