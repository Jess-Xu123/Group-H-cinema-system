const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  try {
    // Get JWT from HttpOnly Cookie
    const token = req.cookies.token;

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

module.exports = authMiddleware;