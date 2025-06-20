const express = require("express")
const Application = require("../models/Application")
const User = require("../models/User")
const Room = require("../models/Room")
const { authenticateToken, requireAdmin, requireStudent, requireOwnershipOrAdmin } = require("../middleware/auth")

const router = express.Router()

// @route   POST /api/applications/submit
// @desc    Submit hostel application
// @access  Private (Student only)
router.post("/submit", authenticateToken, requireStudent, async (req, res) => {
  try {
    const applicationData = {
      ...req.body,
      student: req.user._id,
    }

    // Check if student already has an application for this academic year/semester
    const existingApplication = await Application.findOne({
      student: req.user._id,
      academicYear: applicationData.academicYear,
      semester: applicationData.semester,
    })

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: "You already have an application for this academic year and semester",
      })
    }

    // Check if student is already assigned to a room
    if (req.user.roomAssigned) {
      return res.status(400).json({
        success: false,
        message: "You are already assigned to a room",
      })
    }

    const application = new Application(applicationData)
    await application.save()

    const populatedApplication = await Application.findById(application._id)
      .populate("student", "name matricNumber email gender level department")
      .populate("preferences.hostelPreference", "name gender")

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: { application: populatedApplication },
    })
  } catch (error) {
    console.error("Submit application error:", error)

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      })
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You already have an application for this academic year and semester",
      })
    }

    res.status(500).json({
      success: false,
      message: "Failed to submit application",
    })
  }
})

// @route   GET /api/applications
// @desc    Get all applications (Admin) or user's applications (Student)
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { status, academicYear, semester, page = 1, limit = 20 } = req.query

    const filter = {}

    // Students can only see their own applications
    if (req.user.role === "student") {
      filter.student = req.user._id
    }

    // Apply additional filters
    if (status) filter.status = status
    if (academicYear) filter.academicYear = academicYear
    if (semester) filter.semester = semester

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const applications = await Application.find(filter)
      .populate("student", "name matricNumber email gender level department phoneNumber")
      .populate("preferences.hostelPreference", "name gender")
      .populate("assignedRoom", "number hostelName type capacity")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await Application.countDocuments(filter)

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / Number.parseInt(limit)),
          total,
          limit: Number.parseInt(limit),
        },
      },
    })
  } catch (error) {
    console.error("Fetch applications error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
    })
  }
})

// @route   GET /api/applications/:studentId
// @desc    Get applications for specific student
// @access  Private (Student can only access own, Admin can access any)
router.get("/:studentId", authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const applications = await Application.find({ student: req.params.studentId })
      .populate("student", "name matricNumber email gender level department")
      .populate("preferences.hostelPreference", "name gender")
      .populate("assignedRoom", "number hostelName type capacity")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: {
        applications,
        count: applications.length,
      },
    })
  } catch (error) {
    console.error("Fetch student applications error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
    })
  }
})

// @route   GET /api/applications/details/:id
// @desc    Get single application details
// @access  Private
router.get("/details/:id", authenticateToken, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("student", "name matricNumber email gender level department phoneNumber")
      .populate("preferences.hostelPreference", "name gender facilities")
      .populate("assignedRoom", "number hostelName type capacity isEnsuite")
      .populate("reviewedBy", "name email")

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      })
    }

    // Students can only view their own applications
    if (req.user.role === "student" && application.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      })
    }

    res.json({
      success: true,
      data: { application },
    })
  } catch (error) {
    console.error("Fetch application details error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch application details",
    })
  }
})

// @route   POST /api/applications/:id/approve
// @desc    Approve application
// @access  Private (Admin only)
router.post("/:id/approve", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { comments } = req.body

    const application = await Application.findById(req.params.id)

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      })
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending applications can be approved",
      })
    }

    await application.approve(req.user._id, comments)

    const updatedApplication = await Application.findById(req.params.id)
      .populate("student", "name matricNumber email")
      .populate("reviewedBy", "name email")

    res.json({
      success: true,
      message: "Application approved successfully",
      data: { application: updatedApplication },
    })
  } catch (error) {
    console.error("Approve application error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to approve application",
    })
  }
})

// @route   POST /api/applications/:id/reject
// @desc    Reject application
// @access  Private (Admin only)
router.post("/:id/reject", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { comments } = req.body

    if (!comments || comments.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      })
    }

    const application = await Application.findById(req.params.id)

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      })
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending applications can be rejected",
      })
    }

    await application.reject(req.user._id, comments)

    const updatedApplication = await Application.findById(req.params.id)
      .populate("student", "name matricNumber email")
      .populate("reviewedBy", "name email")

    res.json({
      success: true,
      message: "Application rejected successfully",
      data: { application: updatedApplication },
    })
  } catch (error) {
    console.error("Reject application error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to reject application",
    })
  }
})

// @route   PUT /api/applications/:id
// @desc    Update application (Student can only update pending applications)
// @access  Private
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      })
    }

    // Students can only update their own pending applications
    if (req.user.role === "student") {
      if (application.student.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        })
      }

      if (application.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending applications can be updated",
        })
      }
    }

    // Don't allow updating certain fields
    const { student, status, reviewedBy, reviewedAt, assignedRoom, ...updateData } = req.body

    const updatedApplication = await Application.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("student", "name matricNumber email")
      .populate("preferences.hostelPreference", "name gender")

    res.json({
      success: true,
      message: "Application updated successfully",
      data: { application: updatedApplication },
    })
  } catch (error) {
    console.error("Update application error:", error)

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
      message: "Failed to update application",
    })
  }
})

// @route   DELETE /api/applications/:id
// @desc    Delete application
// @access  Private (Student can only delete own pending applications, Admin can delete any)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      })
    }

    // Students can only delete their own pending applications
    if (req.user.role === "student") {
      if (application.student.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        })
      }

      if (application.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending applications can be deleted",
        })
      }
    }

    await Application.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Application deleted successfully",
    })
  } catch (error) {
    console.error("Delete application error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete application",
    })
  }
})

module.exports = router
