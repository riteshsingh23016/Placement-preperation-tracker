/**
 * Seed Ritesh Kumar Student Script
 * 
 * Purpose: Seeds the student account abcde@gmail.com with realistic presentation-ready data:
 * - 8 company applications (Google, Microsoft, TCS, Infosys, Wipro, Accenture, Deloitte, Amazon)
 * - 5 interview notes (DSA, DBMS, HR, MERN, Aptitude)
 * - 2 announcements (Placement season, TCS Campus Drive)
 * 
 * Safe to run multiple times without duplicating records.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load backend .env configuration
dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/user");
const Company = require("../models/company");
const Note = require("../models/notes");
const Collection = require("../models/collection");
const Announcement = require("../models/Announcement");

async function main() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in the backend .env configuration file.");
    }

    console.log("Connecting to:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully.");

    // 1. GET OR CREATE ADMIN USER (needed to author announcements)
    const adminEmail = process.env.ADMIN_EMAIL || "riteshthelegend10f@gmail.com";
    let admin = await User.findOne({ email: adminEmail.toLowerCase().trim() });
    if (!admin) {
      console.log(`Admin account not found. Seeding default admin...`);
      admin = await User.create({
        name: process.env.ADMIN_NAME || "System Admin",
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || "admin123", // Raw password, hashed by pre-save
        role: "admin",
        isBlocked: false,
        isVerified: true
      });
      console.log("Admin account created.");
    } else {
      console.log("Admin account found. Ensuring verified status and resetting password...");
      admin.isVerified = true;
      admin.password = process.env.ADMIN_PASSWORD || "admin123";
      await admin.save();
      console.log("[seedDemoStudent.js] Admin verified status and password updated.");
    }

    // 2. SEED/RESET STUDENT ACCOUNT
    const studentEmail = "abcde@gmail.com";
    const studentPassword = "Student@123";
    const studentName = "Ritesh Kumar";

    let student = await User.findOne({ email: studentEmail.toLowerCase().trim() });
    if (!student) {
      console.log(`Student ${studentEmail} not found. Creating...`);
      student = await User.create({
        name: studentName,
        email: studentEmail,
        password: studentPassword, // Raw password, hashed by pre-save
        role: "student",
        isBlocked: false,
        isVerified: true
      });
      console.log("Student account created.");
    } else {
      console.log(`Student ${studentEmail} found. Updating details and password...`);
      student.name = studentName;
      student.role = "student";
      student.isBlocked = false;
      student.isVerified = true;
      student.password = studentPassword; // Triggers pre-save password hashing
      await student.save();
      console.log("Student account updated.");
    }

    // 3. PREVENT DUPLICATES: WIPE EXISTING DATA FOR THIS STUDENT
    console.log("Cleaning up existing data for this student to prevent duplicates...");
    const delCompRes = await Company.deleteMany({ user: student._id });
    console.log(`Deleted ${delCompRes.deletedCount} old company applications.`);

    const delNoteRes = await Note.deleteMany({ user: student._id });
    console.log(`Deleted ${delNoteRes.deletedCount} old notes.`);

    const delColRes = await Collection.deleteMany({ user: student._id });
    console.log(`Deleted ${delColRes.deletedCount} old collections.`);

    // 4. SEED COLLECTIONS
    console.log("Seeding collections...");
    const collections = await Collection.insertMany([
      { name: "General", user: student._id, icon: "sparkles", color: "muted" },
      { name: "Company-wise", user: student._id, icon: "building-2", color: "blue" },
      { name: "DSA", user: student._id, icon: "code-2", color: "good" },
      { name: "DBMS", user: student._id, icon: "database", color: "purple" },
      { name: "OS + CN", user: student._id, icon: "globe", color: "amber" },
    ]);
    console.log(`Seeded ${collections.length} collections.`);

    const generalCol = collections.find(c => c.name === "General");
    const dsaCol = collections.find(c => c.name === "DSA");
    const dbmsCol = collections.find(c => c.name === "DBMS");

    // 5. SEED COMPANY APPLICATIONS (8 records)
    console.log("Seeding company applications...");
    const recentDate = (daysAgo) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d;
    };
    const futureDate = (daysAhead) => {
      const d = new Date();
      d.setDate(d.getDate() + daysAhead);
      return d;
    };

    const companiesToSeed = [
      {
        companyName: "Google",
        role: "Software Engineer Intern",
        package: "32 LPA",
        status: "Applied",
        priority: "High",
        appliedDate: recentDate(3),
        notes: "Resume submitted. Preparing DSA and system design basics.",
        user: student._id
      },
      {
        companyName: "Microsoft",
        role: "Backend Developer Intern",
        package: "24 LPA",
        status: "Interview Scheduled",
        priority: "High",
        appliedDate: recentDate(2),
        interviewDate: futureDate(5),
        notes: "Technical interview scheduled. Focus on Node.js, MongoDB, and DBMS.",
        user: student._id
      },
      {
        companyName: "TCS",
        role: "System Engineer",
        package: "7 LPA",
        status: "Selected",
        priority: "Medium",
        appliedDate: recentDate(10),
        notes: "Cleared aptitude and technical round.",
        user: student._id
      },
      {
        companyName: "Infosys",
        role: "Java Developer",
        package: "5 LPA",
        status: "Rejected",
        priority: "Low",
        appliedDate: recentDate(12),
        notes: "Rejected after technical screening. Need to revise OOP and SQL.",
        user: student._id
      },
      {
        companyName: "Wipro",
        role: "Full Stack Developer",
        package: "6.5 LPA",
        status: "Applied",
        priority: "Medium",
        appliedDate: recentDate(5),
        notes: "Application submitted through campus portal.",
        user: student._id
      },
      {
        companyName: "Accenture",
        role: "Associate Software Engineer",
        package: "8.5 LPA",
        status: "Interview Scheduled",
        priority: "High",
        appliedDate: recentDate(4),
        interviewDate: futureDate(3),
        notes: "HR and technical round pending.",
        user: student._id
      },
      {
        companyName: "Deloitte",
        role: "Analyst Trainee",
        package: "6.2 LPA",
        status: "Applied",
        priority: "Medium",
        appliedDate: recentDate(6),
        notes: "Waiting for shortlist.",
        user: student._id
      },
      {
        companyName: "Amazon",
        role: "SDE Intern",
        package: "28 LPA",
        status: "Interview Scheduled",
        priority: "High",
        appliedDate: recentDate(1),
        interviewDate: futureDate(6),
        notes: "Prepare arrays, hash maps, sliding window, recursion.",
        user: student._id
      }
    ];

    await Company.insertMany(companiesToSeed);
    console.log(`Seeded 8 company applications.`);

    // 6. SEED NOTES (5 records)
    console.log("Seeding notes...");
    const notesToSeed = [
      {
        title: "DSA Revision",
        content: "Practice arrays, strings, recursion, hash maps, and sliding window problems.",
        collectionId: dsaCol ? dsaCol._id : null,
        user: student._id
      },
      {
        title: "DBMS Notes",
        content: "Revise normalization, SQL joins, indexes, primary key, foreign key, and transactions.",
        collectionId: dbmsCol ? dbmsCol._id : null,
        user: student._id
      },
      {
        title: "HR Questions",
        content: "Prepare self-introduction, strengths, weakness, project explanation, and why should we hire you.",
        collectionId: generalCol ? generalCol._id : null,
        user: student._id
      },
      {
        title: "MERN Project Explanation",
        content: "Explain authentication, dashboard, admin panel, company tracker, notes, and MongoDB collections.",
        collectionId: generalCol ? generalCol._id : null,
        user: student._id
      },
      {
        title: "Aptitude Practice",
        content: "Revise percentages, profit and loss, time and work, number series, and logical reasoning.",
        collectionId: generalCol ? generalCol._id : null,
        user: student._id
      }
    ];

    await Note.insertMany(notesToSeed);
    console.log(`Seeded 5 notes.`);

    // 7. SEED ANNOUNCEMENTS (2 records - globally available)
    console.log("Seeding platform announcements...");
    const announcementsToSeed = [
      {
        title: "Placement season has started.",
        message: "Placement season has started. Keep your applications updated.",
        type: "info"
      },
      {
        title: "TCS Campus Drive registration is open.",
        message: "TCS Campus Drive registration is open. Apply before the deadline.",
        type: "warning"
      }
    ];

    for (const ann of announcementsToSeed) {
      // Avoid duplication by searching for existing announcement with same message
      let existingAnn = await Announcement.findOne({ message: ann.message });
      if (!existingAnn) {
        await Announcement.create({
          title: ann.title,
          message: ann.message,
          type: ann.type,
          createdBy: admin._id,
          isActive: true
        });
        console.log(`Created announcement: "${ann.title}"`);
      } else {
        console.log(`Announcement already exists, skipping: "${ann.title}"`);
      }
    }

    // 8. LOG AND VERIFY STATE
    const finalStudent = await User.findOne({ email: studentEmail }).select("+password");
    const correctPasswordMatch = await finalStudent.matchPassword(studentPassword);
    console.log("\n--- SEED VERIFICATION ---");
    console.log(`Student Account: ${finalStudent.email}`);
    console.log(`Password test: ${correctPasswordMatch ? "✅ Hashed and functional" : "❌ Password mismatch!"}`);

    const finalCompCount = await Company.countDocuments({ user: student._id });
    const finalNoteCount = await Note.countDocuments({ user: student._id });
    console.log(`Total Company applications seeded: ${finalCompCount}`);
    console.log(`Total Notes seeded: ${finalNoteCount}`);
    console.log("Ritesh Kumar student seeding successfully completed!");

  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
  }
}

main();
