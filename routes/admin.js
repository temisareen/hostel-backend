const express = require("express")
const User = require("../models/User")
const Hostel = require("../models/Hostel")
const Room = require("../models/Room")
const Application = require("../models/Application")
const { authenticateToken, requireAdmin } = require("../middleware/auth")

const router = express.Router()

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get("/dashboard", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get current academic year (you might want to make this dynamic)
    const currentYear = new Date().getFullYear()
    const academicYear = `${currentYear}/${currentYear + 1}`

    // Application statistics
    const totalApplications = await Application.countDocuments({ academicYear })
    const pendingApplications = await Application.countDocuments({
      academicYear,
      status: "pending",
    })
    const approvedApplications = await Application.countDocuments({
      academicYear,
      status: "approved",
    })
    const rejectedApplications = await Application.countDocuments({
      academicYear,
      status: "rejected",
    })
    const assignedApplications = await Application.countDocuments({
      academicYear,
      status: "assigned",
    })

    // User statistics
    const totalStudents = await User.countDocuments({ role: "student", isActive: true })
    const totalAdmins = await User.countDocuments({ role: "admin", isActive: true })
    const studentsWithRooms = await User.countDocuments({
      role: "student",
      roomAssigned: { $ne: null },
    })

    // Hostel and room statistics
    const totalHostels = await Hostel.countDocuments({ isActive: true })
    const maleHostels = await Hostel.countDocuments({ gender: "male", isActive: true })
    const femaleHostels = await Hostel.countDocuments({ gender: "female", isActive: true })

    const totalRooms = await Room.countDocuments({ isActive: true })
    const occupiedRooms = await Room.countDocuments({
      occupiedBeds: { $gt: 0 },
      isActive: true,
    })
    const availableRooms = totalRooms - occupiedRooms

    // Calculate total beds and occupancy
    const roomsData = await Room.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalBeds: { $sum: "$capacity" },
          occupiedBeds: { $sum: "$occupiedBeds" },
        },
      },
    ])

    const { totalBeds = 0, occupiedBeds = 0 } = roomsData[0] || {}
    const availableBeds = totalBeds - occupiedBeds
    const overallOccupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0

    // Occupancy by hostel
    const hostelOccupancy = await Room.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$hostelName",
          totalBeds: { $sum: "$capacity" },
          occupiedBeds: { $sum: "$occupiedBeds" },
          totalRooms: { $sum: 1 },
          occupiedRooms: {
            $sum: {
              $cond: [{ $gt: ["$occupiedBeds", 0] }, 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          occupancyRate: {
            $cond: [{ $gt: ["$totalBeds", 0] }, { $multiply: [{ $divide: ["$occupiedBeds", "$totalBeds"] }, 100] }, 0],
          },
          availableBeds: { $subtract: ["$totalBeds", "$occupiedBeds"] },
        },
      },
      { $sort: { occupancyRate: -1 } },
    ])

    // Recent applications (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentApplications = await Application.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    })

    // Applications by status for chart data
    const applicationsByStatus = await Application.aggregate([
      { $match: { academicYear } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    // Monthly application trends (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyApplications = await Application.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ])

    res.json({
      success: true,
      data: {
        applications: {
          total: totalApplications,
          pending: pendingApplications,
          approved: approvedApplications,
          rejected: rejectedApplications,
          assigned: assignedApplications,
          recent: recentApplications,
          byStatus: applicationsByStatus,
          monthlyTrends: monthlyApplications,
        },
        users: {
          totalStudents,
          totalAdmins,
          studentsWithRooms,
          studentsWithoutRooms: totalStudents - studentsWithRooms,
        },
        hostels: {
          total: totalHostels,
          male: maleHostels,
          female: femaleHostels,
          occupancy: hostelOccupancy,
        },
        rooms: {
          total: totalRooms,
          occupied: occupiedRooms,
          available: availableRooms,
          occupancyRate: Math.round((occupiedRooms / totalRooms) * 100 * 100) / 100,
        },
        beds: {
          total: totalBeds,
          occupied: occupiedBeds,
          available: availableBeds,
          occupancyRate: Math.round(overallOccupancyRate * 100) / 100,
        },
        academicYear,
      },
    })
  } catch (error) {
    console.error("Dashboard statistics error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    })
  }
})

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
// @access  Private (Admin only)
router.get("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role, gender, level, department, hasRoom, search, page = 1, limit = 20 } = req.query

    const filter = {}

    if (role) filter.role = role
    if (gender) filter.gender = gender
    if (level) filter.level = level
    if (department) filter.department = new RegExp(department, "i")
    if (hasRoom === "true") filter.roomAssigned = { $ne: null }
    if (hasRoom === "false") filter.roomAssigned = null

    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { matricNumber: new RegExp(search, "i") },
      ]
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const users = await User.find(filter)
      .populate("roomAssigned", "number hostelName type")
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await User.countDocuments(filter)

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / Number.parseInt(limit)),
          total,
          limit: Number.parseInt(limit),
        },
      },
    })
  } catch (error) {
    console.error("Fetch users error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    })
  }
})

// @route   PUT /api/admin/users/:id/toggle-status
// @desc    Toggle user active status
// @access  Private (Admin only)
router.put("/users/:id/toggle-status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    user.isActive = !user.isActive
    await user.save()

    res.json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: { user },
    })
  } catch (error) {
    console.error("Toggle user status error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to toggle user status",
    })
  }
})

// @route   GET /api/admin/reports/occupancy
// @desc    Get detailed occupancy report
// @access  Private (Admin only)
router.get("/reports/occupancy", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { hostel, gender } = req.query

    const matchFilter = { isActive: true }
    if (hostel) matchFilter.hostel = hostel
    if (gender) matchFilter.gender = gender

    const occupancyReport = await Room.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: "hostels",
          localField: "hostel",
          foreignField: "_id",
          as: "hostelInfo",
        },
      },
      { $unwind: "$hostelInfo" },
      {
        $group: {
          _id: {
            hostelId: "$hostel",
            hostelName: "$hostelName",
            gender: "$gender",
          },
          totalRooms: { $sum: 1 },
          totalBeds: { $sum: "$capacity" },
          occupiedBeds: { $sum: "$occupiedBeds" },
          occupiedRooms: {
            $sum: { $cond: [{ $gt: ["$occupiedBeds", 0] }, 1, 0] },
          },
          rooms: {
            $push: {
              _id: "$_id",
              number: "$number",
              type: "$type",
              capacity: "$capacity",
              occupiedBeds: "$occupiedBeds",
              isEnsuite: "$isEnsuite",
              occupancyRate: {
                $multiply: [{ $divide: ["$occupiedBeds", "$capacity"] }, 100],
              },
            },
          },
        },
      },
      {
        $addFields: {
          availableBeds: { $subtract: ["$totalBeds", "$occupiedBeds"] },
          availableRooms: { $subtract: ["$totalRooms", "$occupiedRooms"] },
          occupancyRate: {
            $multiply: [{ $divide: ["$occupiedBeds", "$totalBeds"] }, 100],
          },
        },
      },
      { $sort: { "_id.hostelName": 1 } },
    ])

    // Calculate overall statistics
    const overallStats = occupancyReport.reduce(
      (acc, hostel) => {
        acc.totalRooms += hostel.totalRooms
        acc.totalBeds += hostel.totalBeds
        acc.occupiedBeds += hostel.occupiedBeds
        acc.occupiedRooms += hostel.occupiedRooms
        return acc
      },
      { totalRooms: 0, totalBeds: 0, occupiedBeds: 0, occupiedRooms: 0 },
    )

    overallStats.availableBeds = overallStats.totalBeds - overallStats.occupiedBeds
    overallStats.availableRooms = overallStats.totalRooms - overallStats.occupiedRooms
    overallStats.occupancyRate =
      overallStats.totalBeds > 0 ? (overallStats.occupiedBeds / overallStats.totalBeds) * 100 : 0

    res.json({
      success: true,
      data: {
        hostels: occupancyReport,
        overall: overallStats,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Occupancy report error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to generate occupancy report",
    })
  }
})

// @route   GET /api/admin/reports/applications
// @desc    Get applications report
// @access  Private (Admin only)
router.get("/reports/applications", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { academicYear, semester, status, startDate, endDate } = req.query

    const matchFilter = {}
    if (academicYear) matchFilter.academicYear = academicYear
    if (semester) matchFilter.semester = semester
    if (status) matchFilter.status = status

    if (startDate || endDate) {
      matchFilter.createdAt = {}
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate)
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate)
    }

    const applicationsReport = await Application.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: "users",
          localField: "student",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      { $unwind: "$studentInfo" },
      {
        $lookup: {
          from: "hostels",
          localField: "preferences.hostelPreference",
          foreignField: "_id",
          as: "preferredHostel",
        },
      },
      { $unwind: { path: "$preferredHostel", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          applications: {
            $push: {
              _id: "$_id",
              student: {
                name: "$studentInfo.name",
                matricNumber: "$studentInfo.matricNumber",
                email: "$studentInfo.email",
                gender: "$studentInfo.gender",
                level: "$studentInfo.level",
                department: "$studentInfo.department",
              },
              academicYear: "$academicYear",
              semester: "$semester",
              preferredHostel: "$preferredHostel.name",
              roomTypePreference: "$preferences.roomTypePreference",
              createdAt: "$createdAt",
              reviewedAt: "$reviewedAt",
              applicationAge: "$applicationAge",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Summary statistics
    const summary = applicationsReport.reduce(
      (acc, group) => {
        acc.total += group.count
        acc.byStatus[group._id] = group.count
        return acc
      },
      { total: 0, byStatus: {} },
    )

    res.json({
      success: true,
      data: {
        summary,
        byStatus: applicationsReport,
        filters: { academicYear, semester, status, startDate, endDate },
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Applications report error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to generate applications report",
    })
  }
})

module.exports = router
