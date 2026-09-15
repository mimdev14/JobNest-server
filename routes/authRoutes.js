const express = require("express");
const { createOrUpdateUser } = require("../services/userService");
const { generateToken } = require("../utils/jwt");
const { authenticateUser } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/sync", async (req, res) => {
  try {
    const { authUserId, name, email, image } = req.body;
    if (!authUserId || !email) {
      return res.status(400).json({ success: false, message: "authUserId and email are required" });
    }

    const user = await createOrUpdateUser({ authUserId, name, email, image });
    const token = generateToken(user);

    res.cookie("jobnest_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ success: false, message: "Failed to sync user" });
  }
});

router.get("/me", authenticateUser, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Role selection during onboarding (seeker vs recruiter) — one-time, before any jobs/company exist
router.patch("/role", authenticateUser, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["SEEKER", "RECRUITER"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const { collections } = require("../config/db");
    await collections.users().updateOne(
      { authUserId: req.user.authUserId },
      { $set: { role, updatedAt: new Date() } }
    );

    res.json({ success: true, message: "Role updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update role" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("jobnest_token");
  res.json({ success: true });
});
router.patch("/profile", authenticateUser, async (req, res) => {
  try {
    const { headline, bio, location, phone, skills, portfolioUrl, github, linkedin, resumeUrl } = req.body;
    const { collections } = require("../config/db");

    await collections.users().updateOne(
      { authUserId: req.user.authUserId },
      {
        $set: {
          "profile.headline": headline, "profile.bio": bio, "profile.location": location,
          "profile.phone": phone, "profile.skills": skills, "profile.portfolioUrl": portfolioUrl,
          "profile.github": github, "profile.linkedin": linkedin, "profile.resumeUrl": resumeUrl,
          updatedAt: new Date(),
        },
      }
    );
    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
});
module.exports = router;