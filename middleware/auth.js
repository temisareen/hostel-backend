const jwt = require("jsonwebtoken")
const User = require("../models/User")

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select("-password")

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or user not found",
      })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      })
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      })
    }

    return res.status(500).json({
      success: false,
      message: "Authentication error",
    })
  }
}

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    })
  }
  next()
}

// Check if user is student
const requireStudent = (req, res, next) => {
  if (req.user.role !== "student") {
    return res.status(403).json({
      success: false,
      message: "Student access required",
    })
  }
  next()
}

// Check if user owns resource or is admin
const requireOwnershipOrAdmin = (req, res, next) => {
  const resourceUserId = req.params.studentId || req.body.studentId

  if (req.user.role === "admin" || req.user._id.toString() === resourceUserId) {
    return next()
  }

  return res.status(403).json({
    success: false,
    message: "Access denied. You can only access your own resources.",
  })
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireStudent,
  requireOwnershipOrAdmin,
}
