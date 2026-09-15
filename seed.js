require("dotenv").config();
const { connectDB } = require("./config/db");

const OWNER_EMAIL = "PUT_A_LOGIN_EMAIL_HERE"; // any account you've registered with

const company = {
  name: "NovaTech Solutions",
  industry: "Software Development",
  website: "https://novatech.example.com",
  location: "Dhaka, Bangladesh",
  employeeCount: "50-200",
  logo: "",
  description: "NovaTech builds modern web and mobile products for clients across fintech, healthcare, and e-commerce.",
};

const jobs = [
  {
    title: "Senior Frontend Engineer",
    category: "Engineering", type: "Full-time", experienceLevel: "Senior",
    salary: 3500, currency: "USD", location: "Dhaka, Bangladesh", remote: "hybrid",
    description: "Build and maintain high-performance React interfaces for our flagship product.",
    responsibilities: "Lead frontend architecture decisions.\nMentor junior engineers.\nCollaborate closely with design.",
    requirements: "5+ years with React and TypeScript.\nStrong CSS/design system experience.",
    benefits: "Health insurance, flexible hours, annual bonus.",
  },
  {
    title: "Backend Developer (Node.js)",
    category: "Engineering", type: "Full-time", experienceLevel: "Mid",
    salary: 2200, currency: "USD", location: "Remote", remote: "remote",
    description: "Design and maintain scalable REST APIs powering our platform.",
    responsibilities: "Build new API endpoints.\nOptimize database queries.\nWrite tests.",
    requirements: "3+ years Node.js/Express.\nExperience with MongoDB or PostgreSQL.",
    benefits: "Fully remote, learning budget, laptop provided.",
  },
  {
    title: "Product Designer",
    category: "Design", type: "Full-time", experienceLevel: "Mid",
    salary: 2000, currency: "USD", location: "Dhaka, Bangladesh", remote: "on-site",
    description: "Own the end-to-end design process for new features, from research to high-fidelity mockups.",
    responsibilities: "Conduct user research.\nCreate wireframes and prototypes.\nMaintain the design system.",
    requirements: "Portfolio showing shipped product work.\nFigma expertise.",
    benefits: "Health insurance, creative freedom, team offsites.",
  },
  {
    title: "Digital Marketing Specialist",
    category: "Marketing", type: "Full-time", experienceLevel: "Entry",
    salary: 900, currency: "USD", location: "Dhaka, Bangladesh", remote: "on-site",
    description: "Plan and execute digital campaigns across social, email, and paid search.",
    responsibilities: "Manage social media calendar.\nRun A/B tests on campaigns.\nReport on KPIs.",
    requirements: "1+ years marketing experience.\nFamiliarity with Google Ads/Meta Ads.",
    benefits: "Performance bonus, flexible hours.",
  },
  {
    title: "Sales Development Representative",
    category: "Sales", type: "Full-time", experienceLevel: "Entry",
    salary: 1000, currency: "USD", location: "Remote", remote: "remote",
    description: "Generate and qualify leads for our enterprise sales team.",
    responsibilities: "Cold outreach via email and LinkedIn.\nQualify inbound leads.\nBook demos for account executives.",
    requirements: "Strong communication skills.\nComfortable with outbound prospecting.",
    benefits: "Uncapped commission, remote-first culture.",
  },
  {
    title: "QA Engineer (Contract)",
    category: "Engineering", type: "Contract", experienceLevel: "Mid",
    salary: 1800, currency: "USD", location: "Remote", remote: "remote",
    description: "Own manual and automated testing for our web application ahead of major releases.",
    responsibilities: "Write test plans.\nBuild automated test suites.\nTriage bugs with engineering.",
    requirements: "Experience with Cypress or Playwright.\nStrong attention to detail.",
    benefits: "Flexible contract terms, potential for extension.",
  },
  {
    title: "HR Coordinator",
    category: "HR", type: "Part-time", experienceLevel: "Entry",
    salary: 600, currency: "USD", location: "Dhaka, Bangladesh", remote: "on-site",
    description: "Support recruitment coordination and employee onboarding.",
    responsibilities: "Schedule interviews.\nMaintain employee records.\nAssist with onboarding.",
    requirements: "Organized, detail-oriented.\nComfortable with HR software.",
    benefits: "Flexible part-time schedule.",
  },
  {
    title: "Software Engineering Intern",
    category: "Engineering", type: "Internship", experienceLevel: "Entry",
    salary: 400, currency: "USD", location: "Dhaka, Bangladesh", remote: "hybrid",
    description: "Join our engineering team for a hands-on 3-month internship building real product features.",
    responsibilities: "Ship small features under mentorship.\nParticipate in code reviews.",
    requirements: "CS student or recent graduate.\nBasic JavaScript knowledge.",
    benefits: "Mentorship, potential full-time offer.",
  },
];

async function seed() {
  const db = await connectDB();

  const user = await db.collection("users").findOne({ email: OWNER_EMAIL });
  if (!user) {
    console.error(`No user found with email ${OWNER_EMAIL}. Register/log in with this email first, then rerun.`);
    process.exit(1);
  }

  let companyDoc = await db.collection("companies").findOne({ ownerId: user.authUserId });
  if (!companyDoc) {
    const result = await db.collection("companies").insertOne({
      ...company,
      ownerId: user.authUserId,
      status: "approved",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    companyDoc = { ...company, _id: result.insertedId };
    console.log("Created and approved company:", company.name);
  } else {
    await db.collection("companies").updateOne({ _id: companyDoc._id }, { $set: { status: "approved" } });
    console.log("Using existing company, marked approved:", companyDoc.name);
  }

  const jobDocs = jobs.map((j) => ({
    ...j,
    recruiterId: user.authUserId,
    companyId: companyDoc._id.toString(),
    companyName: companyDoc.name,
    companyLogo: companyDoc.logo || "",
    status: "active",
    views: Math.floor(Math.random() * 200),
    applicationsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const result = await db.collection("jobs").insertMany(jobDocs);
  console.log(`Inserted ${result.insertedCount} jobs.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});