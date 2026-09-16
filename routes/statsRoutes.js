const express = require("express");
const { collections } = require("../config/db");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/seeker", authenticateUser, requireRole("SEEKER"), async (req, res) => {
  try {
    const seekerId = req.user.authUserId;
    const [applications, savedCount] = await Promise.all([
      collections.applications().find({ seekerId }).toArray(),
      collections.savedJobs().countDocuments({ seekerId }),
    ]);

    const counts = { applied: 0, under_review: 0, shortlisted: 0, offered: 0, hired: 0, rejected: 0 };
    applications.forEach((a) => { if (counts[a.status] !== undefined) counts[a.status]++; });

    res.json({
      success: true,
      stats: {
        totalApplications: applications.length,
        savedJobs: savedCount,
        interviews: counts.shortlisted,
        offers: counts.offered,
        breakdown: counts,
        profileCompletion: computeProfileCompletion(req.user.profile),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

function computeProfileCompletion(profile = {}) {
  const fields = ["headline", "bio", "location", "phone", "portfolioUrl", "github", "linkedin", "resumeUrl"];
  const filled = fields.filter((f) => profile[f]).length;
  const skillsBonus = profile.skills?.length ? 1 : 0;
  return Math.round(((filled + skillsBonus) / (fields.length + 1)) * 100);
}

router.get("/recruiter", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const recruiterId = req.user.authUserId;
    const [jobs, applications] = await Promise.all([
      collections.jobs().find({ recruiterId }).toArray(),
      collections.applications().find({ recruiterId }).toArray(),
    ]);

    const counts = { applied: 0, under_review: 0, shortlisted: 0, offered: 0, hired: 0, rejected: 0 };
    applications.forEach((a) => { if (counts[a.status] !== undefined) counts[a.status]++; });

    res.json({
      success: true,
      stats: {
        totalJobs: jobs.length,
        activeJobs: jobs.filter((j) => j.status === "active").length,
        totalApplicants: applications.length,
        shortlisted: counts.shortlisted,
        interviews: counts.shortlisted,
        offers: counts.offered,
        hires: counts.hired,
        funnel: counts,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

router.get("/admin", authenticateUser, requireRole("ADMIN"), async (req, res) => {
  try {
    const [totalUsers, seekers, recruiters, companies, activeJobs, totalApplications] = await Promise.all([
      collections.users().countDocuments({}),
      collections.users().countDocuments({ role: "SEEKER" }),
      collections.users().countDocuments({ role: "RECRUITER" }),
      collections.companies().countDocuments({}),
      collections.jobs().countDocuments({ status: "active" }),
      collections.applications().countDocuments({}),
    ]);

    router.get("/admin", authenticateUser, requireRole("ADMIN"), async (req, res) => {
  // ... existing admin stats code ...
});

router.get("/public", async (req, res) => {
  try {
    const [activeJobs, companies, seekers, hires] = await Promise.all([
      collections.jobs().countDocuments({ status: "active" }),
      collections.companies().countDocuments({ status: "approved" }),
      collections.users().countDocuments({ role: "SEEKER" }),
      collections.applications().countDocuments({ status: "hired" }),
    ]);
    res.json({ success: true, stats: { activeJobs, companies, seekers, hires } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

module.exports = router;

    res.json({
      success: true,
      stats: { totalUsers, seekers, recruiters, companies, activeJobs, totalApplications, revenue: 0 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

module.exports = router;