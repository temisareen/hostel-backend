const mongoose = require("mongoose")

const hostelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Hostel name is required"],
      unique: true,
      trim: true,
      maxlength: [100, "Hostel name cannot exceed 100 characters"],
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: [true, "Gender specification is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    roomTypes: [
      {
        type: {
          type: String,
          enum: ["single", "double", "triple", "quad"],
          required: true,
        },
        count: {
          type: Number,
          required: true,
          min: [0, "Room count cannot be negative"],
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Price cannot be negative"],
        },
      },
    ],
    totalRooms: {
      type: Number,
      required: [true, "Total rooms is required"],
      min: [1, "Total rooms must be at least 1"],
    },
    facilities: [
      {
        type: String,
        trim: true,
      },
    ],
    rules: [
      {
        type: String,
        trim: true,
      },
    ],
    warden: {
      name: String,
      phoneNumber: String,
      email: String,
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

// Virtual for occupied rooms count
hostelSchema.virtual("occupiedRooms", {
  ref: "Room",
  localField: "_id",
  foreignField: "hostel",
  count: true,
  match: { occupiedBeds: { $gt: 0 } },
})

// Virtual for available rooms count
hostelSchema.virtual("availableRooms", {
  ref: "Room",
  localField: "_id",
  foreignField: "hostel",
  count: true,
  match: { $expr: { $lt: ["$occupiedBeds", "$capacity"] } },
})

hostelSchema.set("toJSON", { virtuals: true })
hostelSchema.set("toObject", { virtuals: true })

module.exports = mongoose.model("Hostel", hostelSchema)
