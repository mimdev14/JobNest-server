const { verifyToken } = require("../utils/jwt");
const { collections } = require("../config/db");

async function authenticateUser(req, res, next) {
  try {
    const token = req.cookies?.jobnest_token;
    if (!token) return res.status(401).json({ success: false, message: "Not authenticated" });

    const decoded = verifyToken(token);
    const user = await collections.users().findOne({ authUserId: decoded.id });

    if (!user) return res.status(401).json({ success: false, message: "User not found" });
    if (user.status === "suspended") return res.status(403).json({ success: false, message: "Account suspended" });

    req.user = { ...user, authUserId: user.authUserId };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

module.exports = { authenticateUser };