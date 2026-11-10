const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  try {
    // Get JWT from HttpOnly Cookie
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: "Authentication required. Please log in.",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user information to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token. Please log in again.",
    });
  }
}

// Allow only admin and staff
function requireStaffOrAdmin(req, res, next) {
  if (!req.user || !["admin", "staff"].includes(req.user.role)) {
    return res.status(403).json({
      message: "Access denied. Staff or admin role required.",
    });
  }

  next();
}

// Allow only admin
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin role required.",
    });
  }

  next();
}

module.exports = {
  authMiddleware,
  requireStaffOrAdmin,
  requireAdmin,
};
