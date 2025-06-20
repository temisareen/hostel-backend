const express = require("express")
const Room = require("../models/Room")
const User = require("../models/User")
const Application = require("../models/Application")
const { authenticateToken, requireAdmin } = require("../middleware/auth")

const router = express.Router()

// @route   GET /api/rooms
// @desc    Get all rooms
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { hostel, gender, type, available, page = 1, limit = 20 } = req.query

    const filter = {}
    if (hostel) filter.hostel = hostel
    if (gender) filter.gender = gender
    if (type) filter.type = type
    if (available === "true") {
      filter.$expr = { $lt: ["$occupiedBeds", "$capacity"] }
      filter.isActive = true
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const rooms = await Room.find(filter)
      .populate("hostel", "name gender")
      .populate("occupants.student", "name matricNumber email phoneNumber")
      .sort({ hostelName: 1, number: 1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await Room.countDocuments(filter)

    res.json({
      success: true,
      data: {
        rooms,
        pagination: {
          current: Number.parseInt(page),
          pages: Math.ceil(total / Number.parseInt(limit)),
          total,
          limit: Number.parseInt(limit),
        },
      },
    })
  } catch (error) {
    console.error("Fetch rooms error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch rooms",
    })
  }
})

// @route   GET /api/rooms/available
// @desc    Get available rooms by gender
// @access  Private
router.get("/available", authenticateToken, async (req, res) => {
  try {
    const { gender, type, hostel } = req.query

    if (!gender) {
      return res.status(400).json({
        success: false,
        message: "Gender parameter is required",
      })
    }

    const filter = {
      gender,
      isActive: true,
      $expr: { $lt: ["$occupiedBeds", "$capacity"] },
    }

    if (type) filter.type = type
    if (hostel) filter.hostel = hostel

    const availableRooms = await Room.find(filter)
      .populate("hostel", "name gender facilities")
      .sort({ hostelName: 1, type: 1, number: 1 })

    // Group by hostel for better organization
    const roomsByHostel = availableRooms.reduce((acc, room) => {
      const hostelName = room.hostelName
      if (!acc[hostelName]) {
        acc[hostelName] = {
          hostel: room.hostel,
          rooms: [],
        }
      }
      acc[hostelName].rooms.push(room)
      return acc
    }, {})

    res.json({
      success: true,
      data: {
        availableRooms,
        roomsByHostel,
        count: availableRooms.length,
      },
    })
  } catch (error) {
    console.error("Fetch available rooms error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch available rooms",
    })
  }
})

// @route   GET /api/rooms/:id
// @desc    Get single room
// @access  Private
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("hostel", "name gender facilities rules warden")
      .populate("occupants.student", "name matricNumber email phoneNumber level department")

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      })
    }

    res.json({
      success: true,
      data: { room },
    })
  } catch (error) {
    console.error("Fetch room error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch room",
    })
  }
})

// @route   POST /api/rooms/assign
// @desc    Assign student to room
// @access  Private (Admin only)
router.post("/assign", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { studentId, roomId, applicationId } = req.body

    if (!studentId || !roomId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Room ID are required",
      })
    }

    // Check if student exists and is not already assigned
    const student = await User.findById(studentId)
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      })
    }

    if (student.roomAssigned) {
      return res.status(400).json({
        success: false,
        message: "Student is already assigned to a room",
      })
    }

    // Check if room exists and is available
    const room = await Room.findById(roomId)
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      })
    }

    if (!room.isAvailable()) {
      return res.status(400).json({
        success: false,
        message: "Room is not available",
      })
    }

    // Check gender compatibility
    if (student.gender !== room.gender) {
      return res.status(400).json({
        success: false,
        message: "Student gender does not match room gender",
      })
    }

    // Assign student to room
    await room.assignStudent(studentId)

    // Update student record
    student.roomAssigned = roomId
    await student.save()

    // Update application if provided
    if (applicationId) {
      const application = await Application.findById(applicationId)
      if (application) {
        await application.assignRoom(roomId)
      }
    }

    // Populate the updated room
    const updatedRoom = await Room.findById(roomId)
      .populate("occupants.student", "name matricNumber email")
      .populate("hostel", "name")

    res.json({
      success: true,
      message: "Student assigned to room successfully",
      data: {
        room: updatedRoom,
        student,
      },
    })
  } catch (error) {
    console.error("Room assignment error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to assign student to room",
    })
  }
})

// @route   POST /api/rooms/:id/remove-student
// @desc    Remove student from room
// @access  Private (Admin only)
router.post("/:id/remove-student", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { studentId } = req.body

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      })
    }

    const room = await Room.findById(req.params.id)
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      })
    }

    // Remove student from room
    await room.removeStudent(studentId)

    // Update student record
    const student = await User.findById(studentId)
    if (student) {
      student.roomAssigned = null
      await student.save()
    }

    // Update any related applications
    await Application.updateMany(
      { student: studentId, assignedRoom: room._id },
      { $unset: { assignedRoom: 1 }, status: "approved" },
    )

    const updatedRoom = await Room.findById(req.params.id)
      .populate("occupants.student", "name matricNumber email")
      .populate("hostel", "name")

    res.json({
      success: true,
      message: "Student removed from room successfully",
      data: { room: updatedRoom },
    })
  } catch (error) {
    console.error("Remove student error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to remove student from room",
    })
  }
})

// @route   POST /api/rooms
// @desc    Create new room
// @access  Private (Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const room = new Room(req.body)
    await room.save()

    const populatedRoom = await Room.findById(room._id).populate("hostel", "name gender")

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: { room: populatedRoom },
    })
  } catch (error) {
    console.error("Create room error:", error)

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
        message: "Room number already exists in this hostel",
      })
    }

    res.status(500).json({
      success: false,
      message: "Failed to create room",
    })
  }
})

// @route   PUT /api/rooms/:id
// @desc    Update room
// @access  Private (Admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Don't allow updating occupants directly through this endpoint
    const { occupants, occupiedBeds, ...updateData } = req.body

    const room = await Room.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate(
      "hostel",
      "name gender",
    )

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      })
    }

    res.json({
      success: true,
      message: "Room updated successfully",
      data: { room },
    })
  } catch (error) {
    console.error("Update room error:", error)

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
      message: "Failed to update room",
    })
  }
})

// @route   DELETE /api/rooms/:id
// @desc    Delete room
// @access  Private (Admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      })
    }

    if (room.occupiedBeds > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete room with occupants",
      })
    }

    await Room.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Room deleted successfully",
    })
  } catch (error) {
    console.error("Delete room error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete room",
    })
  }
})

module.exports = router
