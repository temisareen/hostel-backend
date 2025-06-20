const express = require("express")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  })
}

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", async (req, res) => {
  try {
    const { name, email, matricNumber, password, role = "student", gender, phoneNumber, level, department } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, ...(matricNumber ? [{ matricNumber: matricNumber.toUpperCase() }] : [])],
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or matric number already exists",
      })
    }

    // Create new user
    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      role,
      gender,
      phoneNumber,
    }

    // Add student-specific fields
    if (role === "student") {
      if (!matricNumber || !level || !department) {
        return res.status(400).json({
          success: false,
          message: "Matric number, level, and department are required for students",
        })
      }
      userData.matricNumber = matricNumber.toUpperCase()
      userData.level = level
      userData.department = department
    }

    const user = new User(userData)
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user,
        token,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      })
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      })
    }

    res.status(500).json({
      success: false,
      message: "Registration failed",
    })
  }
})

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, matricNumber, password } = req.body

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      })
    }

    if (!email && !matricNumber) {
      return res.status(400).json({
        success: false,
        message: "Email or matric number is required",
      })
    }

    // Find user by email or matric number
    const query = {}
    if (email) {
      query.email = email.toLowerCase()
    } else if (matricNumber) {
      query.matricNumber = matricNumber.toUpperCase()
    }

    const user = await User.findOne(query)

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Generate token
    const token = generateToken(user._id)

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user,
        token,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      message: "Login failed",
    })
  }
})

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("roomAssigned", "number hostelName type capacity")
      .select("-password")

    res.json({
      success: true,
      data: { user },
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    })
  }
})

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const allowedUpdates = ["name", "phoneNumber", "department"]
    const updates = {}

    // Only allow certain fields to be updated
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key]
      }
    })

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select(
      "-password",
    )

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    })
  } catch (error) {
    console.error("Profile update error:", error)

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      })
    }

    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    })
  }
})

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      })
    }

    const user = await User.findById(req.user._id)

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword)

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({
      success: true,
      message: "Password changed successfully",
    })
  } catch (error) {
    console.error("Password change error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to change password",
    })
  }
})

module.exports = router
