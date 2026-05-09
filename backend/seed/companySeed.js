const Company = require("../models/company");

const DEMO_COMPANIES = [
  {
    companyName: "Acme Labs",
    role: "SDE Intern",
    package: "18–22 LPA",
    appliedDate: new Date("2026-03-12"),
    interviewDate: new Date("2026-05-14"),
    status: "Interview Scheduled",
    priority: "High",
    notes: "Revise OS threads; prepare two system-design talking points.",
    archived: false,
  },
  {
    companyName: "Neon Analytics",
    role: "Backend Engineer",
    package: "24–28 LPA",
    appliedDate: new Date("2026-04-02"),
    interviewDate: new Date("2026-05-11"),
    status: "Applied",
    priority: "High",
    notes: "Referral from senior; emphasize API caching & DB indexing.",
    archived: false,
  },
  {
    companyName: "Vanta Cloud",
    role: "Full-stack Developer",
    package: "16–20 LPA",
    appliedDate: new Date("2026-04-28"),
    interviewDate: null,
    status: "Pending",
    priority: "Medium",
    notes: "Awaiting OA slot; brush up SQL joins and normalization.",
    archived: false,
  },
  {
    companyName: "Northwind AI",
    role: "ML Engineer Intern",
    package: "20–24 LPA",
    appliedDate: new Date("2026-02-20"),
    interviewDate: new Date("2026-04-30"),
    status: "Selected",
    priority: "High",
    notes: "Offer received; document learnings for next rounds.",
    archived: false,
  },
  {
    companyName: "PixelForge",
    role: "Frontend Engineer",
    package: "14–18 LPA",
    appliedDate: new Date("2026-05-01"),
    interviewDate: new Date("2026-05-03"),
    status: "Rejected",
    priority: "Medium",
    notes: "Strong on JS; improve async/await storytelling.",
    archived: false,
  },
  {
    companyName: "Atlas Security",
    role: "Security Analyst Intern",
    package: "12–16 LPA",
    appliedDate: new Date("2026-05-06"),
    interviewDate: new Date("2026-05-18"),
    status: "Interview Scheduled",
    priority: "Low",
    notes: "Prepare threat-modeling example from coursework.",
    archived: false,
  },
  {
    companyName: "RiverStack",
    role: "DevOps Intern",
    package: "15–19 LPA",
    appliedDate: new Date("2026-05-07"),
    interviewDate: null,
    status: "Applied",
    priority: "Medium",
    notes: "CI/CD project demo; revisit Docker networking.",
    archived: false,
  },
];

async function seedCompaniesIfEmpty() {
  const count = await Company.countDocuments();
  if (count > 0) {
    console.log("Company collection already has data, skipping seed.");
    return;
  }
  await Company.insertMany(DEMO_COMPANIES);
  console.log(`Seeded ${DEMO_COMPANIES.length} demo companies.`);
}

module.exports = { seedCompaniesIfEmpty };
