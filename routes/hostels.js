const express = require("express")
const Hostel = require("../models/Hostel")
const Room = require("../models/Room")
const { authenticateToken, requireAdmin } = require("../middleware/auth")

const router = express.Router()

// @route   GET /api/hostels
// @desc    Get all hostels
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { gender, active } = req.query

    const filter = {}
    if (gender) filter.gender = gender
    if (active !== undefined) filter.isActive = active === "true"

    const hostels = await Hostel.find(filter).populate("occupiedRooms").populate("availableRooms").sort({ name: 1 })

    // Get room statistics for each hostel
    const hostelsWithStats = await Promise.all(
      hostels.map(async (hostel) => {
        const rooms = await Room.find({ hostel: hostel._id })
        const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0)
        const occupiedBeds = rooms.reduce((sum, room) => sum + room.occupiedBeds, 0)
        const availableBeds = totalBeds - occupiedBeds
        const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0

        return {
          ...hostel.toObject(),
          stats: {
            totalBeds,
            occupiedBeds,
            availableBeds,
            occupancyRate: Math.round(occupancyRate * 100) / 100,
            totalRooms: rooms.length,
            availableRooms: rooms.filter((room) => room.isAvailable()).length,
          },
        }
      }),
    )

    res.json({
      success: true,
      data: {
        hostels: hostelsWithStats,
        count: hostelsWithStats.length,
      },
    })
  } catch (error) {
    console.error("Fetch hostels error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch hostels",
    })
  }
})

// @route   GET /api/hostels/:id
// @desc    Get single hostel
// @access  Private
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id)

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found",
      })
    }

    // Get rooms for this hostel
    const rooms = await Room.find({ hostel: hostel._id })
      .populate("occupants.student", "name matricNumber email")
      .sort({ number: 1 })

    // Calculate statistics
    const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0)
    const occupiedBeds = rooms.reduce((sum, room) => sum + room.occupiedBeds, 0)
    const availableBeds = totalBeds - occupiedBeds
    const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0

    res.json({
      success: true,
      data: {
        hostel,
        rooms,
        stats: {
          totalBeds,
          occupiedBeds,
          availableBeds,
          occupancyRate: Math.round(occupancyRate * 100) / 100,
          totalRooms: rooms.length,
          availableRooms: rooms.filter((room) => room.isAvailable()).length,
        },
      },
    })
  } catch (error) {
    console.error("Fetch hostel error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch hostel",
    })
  }
})

// @route   POST /api/hostels
// @desc    Create new hostel
// @access  Private (Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const hostel = new Hostel(req.body)
    await hostel.save()

    res.status(201).json({
      success: true,
      message: "Hostel created successfully",
      data: { hostel },
    })
  } catch (error) {
    console.error("Create hostel error:", error)

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
        message: "Hostel with this name already exists",
      })
    }

    res.status(500).json({
      success: false,
      message: "Failed to create hostel",
    })
  }
})

// @route   PUT /api/hostels/:id
// @desc    Update hostel
// @access  Private (Admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const hostel = await Hostel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found",
      })
    }

    res.json({
      success: true,
      message: "Hostel updated successfully",
      data: { hostel },
    })
  } catch (error) {
    console.error("Update hostel error:", error)

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
      message: "Failed to update hostel",
    })
  }
})

// @route   DELETE /api/hostels/:id
// @desc    Delete hostel
// @access  Private (Admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const hostel = await Hostel.findById(req.params.id)

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: "Hostel not found",
      })
    }

    // Check if hostel has occupied rooms
    const occupiedRooms = await Room.countDocuments({
      hostel: hostel._id,
      occupiedBeds: { $gt: 0 },
    })

    if (occupiedRooms > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete hostel with occupied rooms",
      })
    }

    // Delete all rooms in this hostel first
    await Room.deleteMany({ hostel: hostel._id })

    // Delete the hostel
    await Hostel.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Hostel deleted successfully",
    })
  } catch (error) {
    console.error("Delete hostel error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete hostel",
    })
  }
})

module.exports = router
