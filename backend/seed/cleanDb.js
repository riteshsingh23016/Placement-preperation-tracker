const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcryptjs");

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

async function main() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not defined in environment variables");
    }

    console.log("Connecting to:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully.");

    // 1. Clean Collections
    console.log("Cleaning collections...");
    await User.deleteMany({});
    await Company.deleteMany({});
    await Note.deleteMany({});
    await Collection.deleteMany({});
    await Notification.deleteMany({});
    await PlacementDrive.deleteMany({});
    console.log("All collections cleared.");

    // 2. Seed Admin User
    const adminEmail = process.env.ADMIN_EMAIL || "riteshthelegend10f@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const adminName = process.env.ADMIN_NAME || "System Admin";
    
    console.log(`Creating Admin user: ${adminEmail}`);
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword, // Raw password, hashed by pre-save hook
      role: "admin",
      isBlocked: false,
      isVerified: true
    });
    console.log("Admin user created.");

    // 3. Seed Clean Sample Student Account
    const studentEmail = "jane@example.com";
    const studentPassword = "password123";
    const studentName = "Jane Doe";

    console.log(`Creating Sample Student: ${studentEmail}`);
    const student = await User.create({
      name: studentName,
      email: studentEmail,
      password: studentPassword, // Raw password, hashed by pre-save hook
      role: "student",
      isBlocked: false,
      isVerified: true
    });
    console.log("Student user created.");

    // 4. Seed Default Collections for Student
    console.log("Seeding collections for Student...");
    const collections = await Collection.insertMany([
      { name: "General", user: student._id, icon: "sparkles", color: "muted" },
      { name: "Company-wise", user: student._id, icon: "building-2", color: "blue" },
      { name: "DSA", user: student._id, icon: "code-2", color: "good" },
      { name: "DBMS", user: student._id, icon: "database", color: "purple" },
      { name: "OS + CN", user: student._id, icon: "globe", color: "amber" },
    ]);
    console.log(`Seeded ${collections.length} collections.`);

    const generalCollection = collections.find(c => c.name === "General");

    // 5. Seed Sample Notes for Student
    console.log("Seeding notes for Student...");
    await Note.insertMany([
      {
        title: "System Design Cheat Sheet",
        content: "Core topics: Scalability, Load Balancers, Caching (Redis/Memcached), CDN, Database Sharding, Replication, CAP Theorem, and Microservices.",
        collectionId: generalCollection ? generalCollection._id : null,
        user: student._id
      },
      {
        title: "JavaScript Event Loop Notes",
        content: "Understanding Call Stack, Web APIs, Callback Queue, Microtask Queue (Promises), and Macrotask Queue (setTimeout). Execution contexts and closures.",
        collectionId: generalCollection ? generalCollection._id : null,
        user: student._id
      }
    ]);
    console.log("Sample notes seeded.");

    // 6. Seed Sample Applications (Company) for Student
    console.log("Seeding student applications...");
    await Company.insertMany([
      {
        companyName: "Google",
        role: "Software Engineer",
        package: "32 LPA",
        status: "Applied",
        priority: "High",
        notes: "Applied via referral. Focusing on DSA (Trees/Graphs) and System Design prep.",
        appliedDate: new Date(),
        user: student._id,
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
        user: student._id,
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
        user: student._id,
        isDemo: false
      },
      {
        companyName: "Meta",
        role: "Frontend Engineer",
        package: "40 LPA",
        status: "Rejected",
        priority: "Medium",
        notes: "Rejected after virtual onsite. Need to improve UX coding speed and CSS performance.",
        appliedDate: new Date(),
        user: student._id,
        isDemo: false
      }
    ]);
    console.log("Sample applications seeded.");

    // 7. Seed Sample Notifications for Student
    console.log("Seeding sample notifications...");
    await Notification.insertMany([
      {
        user: student._id,
        type: "interview",
        title: "Microsoft Interview Scheduled",
        message: "Your Technical Interview Round 1 with Microsoft is scheduled for next Monday.",
        priority: "high",
        read: false
      },
      {
        user: student._id,
        type: "system",
        title: "Welcome to Placement Tracker",
        message: "Your profile has been created. Start tracking your applications and notes now!",
        priority: "low",
        read: true
      }
    ]);
    console.log("Sample notifications seeded.");

    // 8. Seed Placement Drives managed by Admin
    console.log("Seeding placement drives...");
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
        companyName: "Netflix",
        role: "Senior Frontend Engineer",
        package: "60 LPA",
        location: "Remote",
        eligibility: "B.Tech/MCA with 2+ years of experience or strong portfolio",
        deadline: new Date(Date.now() + 9*24*60*60*1000),
        driveDate: new Date(Date.now() + 10*24*60*60*1000),
        mode: "Online",
        status: "Open",
        description: "Netflix product team frontend engineer hiring. Experience in React/JS required.",
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
        description: "Amazon Offcampus SDE-1 Drive at Hyderabad Hub.",
        createdBy: admin._id
      }
    ]);
    console.log("Placement drives seeded.");

    console.log("\nDatabase successfully reset and seeded with presentation-ready data!");
  } catch (error) {
    console.error("Database seed failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

main();
