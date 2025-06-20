const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    matricNumber: {
      type: String,
      required: function () {
        return this.role === "student"
      },
      unique: true,
      sparse: true,
      uppercase: true,
      match: [/^CU\/\d{2}\/\d{4}$/, "Invalid matric number format (e.g., CU/20/1234)"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: [true, "Gender is required"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^(\+234|0)[789]\d{9}$/, "Please enter a valid Nigerian phone number"],
    },
    level: {
      type: String,
      enum: ["100", "200", "300", "400", "500"],
      required: function () {
        return this.role === "student"
      },
    },
    department: {
      type: String,
      required: function () {
        return this.role === "student"
      },
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    roomAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject()
  delete userObject.password
  return userObject
}

module.exports = mongoose.model("User", userSchema)
