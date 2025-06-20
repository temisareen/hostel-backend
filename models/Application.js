const mongoose = require("mongoose")

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      match: [/^\d{4}\/\d{4}$/, "Academic year format should be YYYY/YYYY (e.g., 2024/2025)"],
    },
    semester: {
      type: String,
      enum: ["first", "second"],
      required: [true, "Semester is required"],
    },
    personalInfo: {
      guardianName: {
        type: String,
        required: [true, "Guardian name is required"],
        trim: true,
      },
      guardianPhone: {
        type: String,
        required: [true, "Guardian phone is required"],
        match: [/^(\+234|0)[789]\d{9}$/, "Please enter a valid Nigerian phone number"],
      },
      guardianEmail: {
        type: String,
        required: [true, "Guardian email is required"],
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
      },
      homeAddress: {
        type: String,
        required: [true, "Home address is required"],
        trim: true,
        maxlength: [200, "Address cannot exceed 200 characters"],
      },
      stateOfOrigin: {
        type: String,
        required: [true, "State of origin is required"],
        trim: true,
      },
      emergencyContact: {
        name: {
          type: String,
          required: [true, "Emergency contact name is required"],
          trim: true,
        },
        phone: {
          type: String,
          required: [true, "Emergency contact phone is required"],
          match: [/^(\+234|0)[789]\d{9}$/, "Please enter a valid Nigerian phone number"],
        },
        relationship: {
          type: String,
          required: [true, "Relationship to emergency contact is required"],
          trim: true,
        },
      },
    },
    preferences: {
      hostelPreference: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hostel",
        required: [true, "Hostel preference is required"],
      },
      roomTypePreference: {
        type: String,
        enum: ["single", "double", "triple", "quad"],
        required: [true, "Room type preference is required"],
      },
      specialRequests: {
        type: String,
        trim: true,
        maxlength: [300, "Special requests cannot exceed 300 characters"],
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "assigned"],
      default: "pending",
    },
    assignedRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewComments: {
      type: String,
      trim: true,
      maxlength: [500, "Review comments cannot exceed 500 characters"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial", "overdue"],
      default: "pending",
    },
    documents: [
      {
        name: String,
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Compound index to ensure one application per student per academic year/semester
applicationSchema.index({ student: 1, academicYear: 1, semester: 1 }, { unique: true })

// Virtual for application age in days
applicationSchema.virtual("applicationAge").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24))
})

// Method to approve application
applicationSchema.methods.approve = async function (adminId, comments = "") {
  this.status = "approved"
  this.reviewedBy = adminId
  this.reviewedAt = new Date()
  this.reviewComments = comments

  return await this.save()
}

// Method to reject application
applicationSchema.methods.reject = async function (adminId, comments = "") {
  this.status = "rejected"
  this.reviewedBy = adminId
  this.reviewedAt = new Date()
  this.reviewComments = comments

  return await this.save()
}

// Method to assign room
applicationSchema.methods.assignRoom = async function (roomId) {
  this.status = "assigned"
  this.assignedRoom = roomId

  return await this.save()
}

applicationSchema.set("toJSON", { virtuals: true })
applicationSchema.set("toObject", { virtuals: true })

module.exports = mongoose.model("Application", applicationSchema)
