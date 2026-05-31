/**
 * Database Presentation/Demo Cleanup Script
 * 
 * Purpose: Wipes messy QA/Test student records and their orphaned applications from the database
 * to make the dashboard presentation-ready for a college/teacher review.
 * 
 * Preserves:
 * 1. All administrator accounts (role === "admin")
 * 2. Real students registered (not matching test/QA patterns)
 * 3. Optional clean Demo Student (student@test.com)
 * 
 * Usage:
 * Run `npm run clean:demo` from the backend directory.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcryptjs");

// Load backend .env configuration
dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/user");
const Company = require("../models/company");
const Note = require("../models/notes");
const Collection = require("../models/collection");
const Notification = require("../models/notification");
const PlacementDrive = require("../models/placementDrive");

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Check if a user matches test/QA/demo patterns
const isDemoOrTestUser = (user) => {
  if (user.role === "admin") return false;
  
  const email = (user.email || "").toLowerCase().trim();
  const name = (user.name || "").toLowerCase().trim();

  // Preserved Demo Students
  if (email === "student@test.com" || email === "you@college.edu") return false;

  // Pattern Match lists
  const badNames = ["qa student", "qa tester", "test student", "normal student", "jane doe"];
  const badEmailKeywords = ["qa_", "test_", "teststudent", "qa-student", "test-student"];
  
  // Check names
  if (badNames.some(bn => name.includes(bn))) return true;

  // Check email keywords
  if (badEmailKeywords.some(keyword => email.includes(keyword))) return true;

  // Check generated student email pattern (e.g., student_1778830375390@test.com)
  if (/^student_\d+/.test(email)) return true;

  // Check general demo domains (except preserved ones)
  if (email.endsWith("@example.com") || email.endsWith("@test.com")) return true;

  return false;
};

async function main() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in the backend .env configuration file.");
    }

    console.log("Connecting to:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully.");

    // --- 1. SEED DEFAULT ADMIN IF NOT EXISTS ---
    const adminEmail = process.env.ADMIN_EMAIL || "riteshthelegend10f@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const adminName = process.env.ADMIN_NAME || "System Admin";

    let admin = await User.findOne({ email: adminEmail.toLowerCase().trim() }).select("+password");
    if (!admin) {
      console.log(`Admin account not found. Seeding default admin: ${adminEmail}`);
      admin = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword, // Raw password, will be hashed once by pre-save hook
        role: "admin",
        isBlocked: false,
        isVerified: true
      });
      console.log("Admin account created.");
    } else {
      // Verify if password is correct (not double-hashed)
      const isMatch = await admin.matchPassword(adminPassword);
      if (!isMatch) {
        console.log(`Admin password mismatch (possibly double-hashed). Resetting password...`);
        admin.password = adminPassword; // Triggers pre-save hook on save
        admin.isVerified = true;
        await admin.save();
        console.log("Admin password updated successfully.");
      } else {
        console.log(`Preserving Admin account: ${admin.email}`);
      }
    }

    // --- 2. SEED CLEAN PRESENTATION STUDENT ---
    const demoStudentEmail = "student@test.com";
    const demoStudentPassword = "Student@123";
    const demoStudentName = "Demo Student";

    let demoStudent = await User.findOne({ email: demoStudentEmail }).select("+password");
    if (!demoStudent) {
      console.log(`Creating clean presentation student: ${demoStudentEmail}`);
      demoStudent = await User.create({
        name: demoStudentName,
        email: demoStudentEmail,
        password: demoStudentPassword, // Raw password, will be hashed once by pre-save hook
        role: "student",
        isBlocked: false,
        isVerified: true
      });
      console.log("Clean Demo Student created.");

      // Seed collections for the demo student
      const collections = await Collection.insertMany([
        { name: "General", user: demoStudent._id, icon: "sparkles", color: "muted" },
        { name: "Company-wise", user: demoStudent._id, icon: "building-2", color: "blue" },
        { name: "DSA", user: demoStudent._id, icon: "code-2", color: "good" },
        { name: "DBMS", user: demoStudent._id, icon: "database", color: "purple" },
        { name: "OS + CN", user: demoStudent._id, icon: "globe", color: "amber" },
      ]);
      console.log("Seeded 5 collections for Demo Student.");

      const generalCol = collections.find(c => c.name === "General");

      // Seed notes for the demo student
      await Note.insertMany([
        {
          title: "System Design Cheat Sheet",
          content: "Core topics: Scalability, Load Balancers, Caching (Redis/Memcached), CDN, Database Sharding, Replication, CAP Theorem, and Microservices.",
          collectionId: generalCol ? generalCol._id : null,
          user: demoStudent._id
        },
        {
          title: "JavaScript Event Loop Notes",
          content: "Understanding Call Stack, Web APIs, Callback Queue, Microtask Queue (Promises), and Macrotask Queue (setTimeout). Execution contexts and closures.",
          collectionId: generalCol ? generalCol._id : null,
          user: demoStudent._id
        }
      ]);
      console.log("Seeded sample notes for Demo Student.");

      // Seed sample applications for the demo student
      await Company.insertMany([
        {
          companyName: "Google",
          role: "Software Engineer",
          package: "32 LPA",
          status: "Applied",
          priority: "High",
          notes: "Applied via referral. Focusing on DSA (Trees/Graphs) and System Design prep.",
          appliedDate: new Date(),
          user: demoStudent._id,
          isDemo: false
        },
        {
          companyName: "Microsoft",
          role: "SDE Intern",
          package: "18 LPA",
          status: "Interview Scheduled",
          priority: "High",
          notes: "Round 1 technical interview scheduled next week. Practice DP, Arrays and LinkedLists.",
          appliedDate: new Date(),
          user: demoStudent._id,
          isDemo: false
        },
        {
          companyName: "Amazon",
          role: "Backend Engineer",
          package: "24 LPA",
          status: "Selected",
          priority: "High",
          notes: "Offer received! HR discussion completed. Preparing onboarding documentation.",
          appliedDate: new Date(),
          user: demoStudent._id,
          isDemo: false
        }
      ]);
      console.log("Seeded sample applications for Demo Student.");

      // Seed notification
      await Notification.insertMany([
        {
          user: demoStudent._id,
          type: "interview",
          title: "Microsoft Interview Scheduled",
          message: "Your Technical Interview Round 1 with Microsoft is scheduled for next Monday.",
          priority: "high",
          read: false
        }
      ]);
      console.log("Seeded sample notifications for Demo Student.");
    } else {
      // Verify if password is correct (not double-hashed)
      const isMatch = await demoStudent.matchPassword(demoStudentPassword);
      if (!isMatch) {
        console.log(`Demo student password mismatch (possibly double-hashed). Resetting password...`);
        demoStudent.password = demoStudentPassword; // Triggers pre-save hook on save
        demoStudent.isVerified = true;
        await demoStudent.save();
        console.log("Demo student password updated successfully.");
      } else {
        console.log(`Preserving Demo Student account: ${demoStudent.email}`);
      }
    }

    // Seed Placement Drives if empty
    const driveCount = await PlacementDrive.countDocuments();
    if (driveCount === 0) {
      await PlacementDrive.insertMany([
        {
          companyName: "Google",
          role: "Software Engineer",
          package: "35 LPA",
          location: "Bangalore",
          eligibility: "B.Tech/M.Tech (CS/IT) with CGPA >= 8.0",
          deadline: new Date(Date.now() + 4*24*60*60*1000),
          driveDate: new Date(Date.now() + 5*24*60*60*1000),
          mode: "Online",
          status: "Open",
          description: "Google University Graduate Hiring Drive for SDE-1 positions.",
          createdBy: admin._id
        },
        {
          companyName: "Amazon",
          role: "SDE-1",
          package: "24 LPA",
          location: "Hyderabad",
          eligibility: "All engineering graduates",
          deadline: new Date(Date.now() + 1*24*60*60*1000),
          driveDate: new Date(Date.now() + 2*24*60*60*1000),
          mode: "Offline",
          status: "Open",
          description: "Amazon Offcampus SDE-1 Drive.",
          createdBy: admin._id
        }
      ]);
      console.log("Seeded sample placement drives.");
    }

    // --- 3. SCRUB UNWANTED TEST/DEMO STUDENTS ---
    const allUsers = await User.find({});
    const usersToDelete = allUsers.filter(isDemoOrTestUser);
    const userIdsToDelete = usersToDelete.map(u => u._id);

    console.log(`Found ${usersToDelete.length} users to delete matching demo/test patterns.`);

    if (usersToDelete.length > 0) {
      console.log("Deleting users...");
      const userRes = await User.deleteMany({ _id: { $in: userIdsToDelete } });
      console.log(`Deleted ${userRes.deletedCount} users.`);

      // Clean up Notes, Collections, Notifications, PlacementDrives belonging to deleted users
      const noteRes = await Note.deleteMany({ user: { $in: userIdsToDelete } });
      console.log(`Deleted ${noteRes.deletedCount} notes linked to deleted users.`);

      const colRes = await Collection.deleteMany({ user: { $in: userIdsToDelete } });
      console.log(`Deleted ${colRes.deletedCount} collections linked to deleted users.`);

      const notifRes = await Notification.deleteMany({ user: { $in: userIdsToDelete } });
      console.log(`Deleted ${notifRes.deletedCount} notifications linked to deleted users.`);

      const driveRes = await PlacementDrive.deleteMany({ createdBy: { $in: userIdsToDelete } });
      console.log(`Deleted ${driveRes.deletedCount} placement drives linked to deleted users.`);

      const compRes = await Company.deleteMany({ user: { $in: userIdsToDelete } });
      console.log(`Deleted ${compRes.deletedCount} company applications linked to deleted users.`);
    }

    // --- 4. CLEAN ORPHANED AND LEGACY DEMO APPLICATION RECORDS ---
    // Any Company/Application record without a valid user ID, or referencing a non-existent user
    const allCompanies = await Company.find({});
    const validUserIds = (await User.find({})).map(u => u._id.toString());

    const companyIdsToDelete = [];
    allCompanies.forEach(c => {
      const uId = c.user ? c.user.toString() : null;
      if (!uId || !validUserIds.includes(uId)) {
        companyIdsToDelete.push(c._id);
      }
    });

    console.log(`Found ${companyIdsToDelete.length} orphaned/invalid application records to clean.`);
    if (companyIdsToDelete.length > 0) {
      const compCleanRes = await Company.deleteMany({ _id: { $in: companyIdsToDelete } });
      console.log(`Deleted ${compCleanRes.deletedCount} orphaned/invalid application records.`);
    }

    // --- 5. LOG CURRENT STATE ---
    const finalUsers = await User.find({});
    console.log("\n--- CURRENT USER DATABASE STATUS ---");
    finalUsers.forEach(u => {
      console.log(`- Keep User: ${u.name} | ${u.email} | Role: ${u.role}`);
    });

    console.log("\nCleanup successfully completed.");
  } catch (error) {
    console.error("Cleanup failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

main();
