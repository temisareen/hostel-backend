const mongoose = require("mongoose")

const roomSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: [true, "Room number is required"],
      trim: true,
    },
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: [true, "Hostel reference is required"],
    },
    hostelName: {
      type: String,
      required: [true, "Hostel name is required"],
    },
    capacity: {
      type: Number,
      required: [true, "Room capacity is required"],
      min: [1, "Capacity must be at least 1"],
      max: [4, "Capacity cannot exceed 4"],
    },
    type: {
      type: String,
      enum: ["single", "double", "triple", "quad"],
      required: [true, "Room type is required"],
    },
    isEnsuite: {
      type: Boolean,
      default: false,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: [true, "Gender specification is required"],
    },
    occupiedBeds: {
      type: Number,
      default: 0,
      min: [0, "Occupied beds cannot be negative"],
    },
    occupants: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        assignedDate: {
          type: Date,
          default: Date.now,
        },
        bedNumber: {
          type: Number,
          required: true,
        },
      },
    ],
    price: {
      type: Number,
      required: [true, "Room price is required"],
      min: [0, "Price cannot be negative"],
    },
    amenities: [
      {
        type: String,
        trim: true,
      },
    ],
    condition: {
      type: String,
      enum: ["excellent", "good", "fair", "needs_repair"],
      default: "good",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Compound index for unique room numbers within hostels
roomSchema.index({ number: 1, hostel: 1 }, { unique: true })

// Virtual for available beds
roomSchema.virtual("availableBeds").get(function () {
  return this.capacity - this.occupiedBeds
})

// Virtual for occupancy rate
roomSchema.virtual("occupancyRate").get(function () {
  return (this.occupiedBeds / this.capacity) * 100
})

// Method to check if room is available
roomSchema.methods.isAvailable = function () {
  return this.occupiedBeds < this.capacity && this.isActive
}

// Method to assign student to room
roomSchema.methods.assignStudent = async function (studentId) {
  if (!this.isAvailable()) {
    throw new Error("Room is not available")
  }

  const bedNumber = this.occupiedBeds + 1

  this.occupants.push({
    student: studentId,
    bedNumber: bedNumber,
    assignedDate: new Date(),
  })

  this.occupiedBeds += 1

  return await this.save()
}

// Method to remove student from room
roomSchema.methods.removeStudent = async function (studentId) {
  const occupantIndex = this.occupants.findIndex((occupant) => occupant.student.toString() === studentId.toString())

  if (occupantIndex === -1) {
    throw new Error("Student not found in this room")
  }

  this.occupants.splice(occupantIndex, 1)
  this.occupiedBeds -= 1

  // Reassign bed numbers
  this.occupants.forEach((occupant, index) => {
    occupant.bedNumber = index + 1
  })

  return await this.save()
}

roomSchema.set("toJSON", { virtuals: true })
roomSchema.set("toObject", { virtuals: true })

module.exports = mongoose.model("Room", roomSchema)
