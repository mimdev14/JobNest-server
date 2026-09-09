function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }
    next();
  };
}

// Ownership check helper — pass a function that extracts the owner id from req
function requireOwnership(getOwnerId) {
  return (req, res, next) => {
    const ownerId = getOwnerId(req);
    if (req.user.role !== "ADMIN" && ownerId !== req.user.authUserId) {
      return res.status(403).json({ success: false, message: "You don't own this resource" });
    }
    next();
  };
}

module.exports = { requireRole, requireOwnership };