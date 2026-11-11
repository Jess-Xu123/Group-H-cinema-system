const jwt = require("jsonwebtoken");

// Guest requests continue with req.user = null.
// A valid cookie attaches the same user shape as authMiddleware.
function optionalAuthMiddleware(req, res, next) {
  req.user = null;

  try {
    const token = req.cookies?.token;

    if (!token || !process.env.JWT_SECRET) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.userId) {
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
      };
    }
  } catch (error) {
    // Invalid/expired cookies are treated as unauthenticated for optional routes.
    req.user = null;
  }

  return next();
}

module.exports = { optionalAuthMiddleware };
