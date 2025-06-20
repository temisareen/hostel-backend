const { body, validationResult } = require("express-validator")

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array(),
    })
  }
  next()
}

// User registration validation
const validateUserRegistration = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),

  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),

  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),

  body("gender").isIn(["male", "female"]).withMessage("Gender must be either male or female"),

  body("phoneNumber")
    .matches(/^(\+234|0)[789]\d{9}$/)
    .withMessage("Please provide a valid Nigerian phone number"),

  body("matricNumber")
    .optional()
    .matches(/^CU\/\d{2}\/\d{4}$/)
    .withMessage("Invalid matric number format (e.g., CU/20/1234)"),

  body("level")
    .optional()
    .isIn(["100", "200", "300", "400", "500"])
    .withMessage("Level must be one of: 100, 200, 300, 400, 500"),

  body("department")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Department must be between 2 and 100 characters"),

  handleValidationErrors,
]

// User login validation
const validateUserLogin = [
  body("password").notEmpty().withMessage("Password is required"),

  body("email").optional().isEmail().normalizeEmail().withMessage("Please provide a valid email"),

  body("matricNumber")
    .optional()
    .matches(/^CU\/\d{2}\/\d{4}$/)
    .withMessage("Invalid matric number format"),

  handleValidationErrors,
]

// Application submission validation
const validateApplicationSubmission = [
  body("academicYear")
    .matches(/^\d{4}\/\d{4}$/)
    .withMessage("Academic year format should be YYYY/YYYY (e.g., 2024/2025)"),

  body("semester").isIn(["first", "second"]).withMessage("Semester must be either first or second"),

  body("personalInfo.guardianName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Guardian name must be between 2 and 100 characters"),

  body("personalInfo.guardianPhone")
    .matches(/^(\+234|0)[789]\d{9}$/)
    .withMessage("Please provide a valid Nigerian phone number for guardian"),

  body("personalInfo.guardianEmail").isEmail().normalizeEmail().withMessage("Please provide a valid guardian email"),

  body("personalInfo.homeAddress")
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage("Home address must be between 10 and 200 characters"),

  body("personalInfo.stateOfOrigin")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("State of origin must be between 2 and 50 characters"),

  body("personalInfo.emergencyContact.name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Emergency contact name must be between 2 and 100 characters"),

  body("personalInfo.emergencyContact.phone")
    .matches(/^(\+234|0)[789]\d{9}$/)
    .withMessage("Please provide a valid Nigerian phone number for emergency contact"),

  body("personalInfo.emergencyContact.relationship")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Relationship must be between 2 and 50 characters"),

  body("preferences.hostelPreference").isMongoId().withMessage("Please provide a valid hostel preference"),

  body("preferences.roomTypePreference")
    .isIn(["single", "double", "triple", "quad"])
    .withMessage("Room type must be one of: single, double, triple, quad"),

  body("preferences.specialRequests")
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Special requests cannot exceed 300 characters"),

  handleValidationErrors,
]

// Hostel creation validation
const validateHostelCreation = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Hostel name must be between 2 and 100 characters"),

  body("gender").isIn(["male", "female"]).withMessage("Gender must be either male or female"),

  body("description").optional().trim().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),

  body("totalRooms").isInt({ min: 1 }).withMessage("Total rooms must be at least 1"),

  body("roomTypes").isArray({ min: 1 }).withMessage("At least one room type is required"),

  body("roomTypes.*.type")
    .isIn(["single", "double", "triple", "quad"])
    .withMessage("Room type must be one of: single, double, triple, quad"),

  body("roomTypes.*.count").isInt({ min: 0 }).withMessage("Room count cannot be negative"),

  body("roomTypes.*.price").isFloat({ min: 0 }).withMessage("Price cannot be negative"),

  handleValidationErrors,
]

// Room creation validation
const validateRoomCreation = [
  body("number").trim().isLength({ min: 1, max: 10 }).withMessage("Room number must be between 1 and 10 characters"),

  body("hostel").isMongoId().withMessage("Please provide a valid hostel ID"),

  body("hostelName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Hostel name must be between 2 and 100 characters"),

  body("capacity").isInt({ min: 1, max: 4 }).withMessage("Capacity must be between 1 and 4"),

  body("type")
    .isIn(["single", "double", "triple", "quad"])
    .withMessage("Room type must be one of: single, double, triple, quad"),

  body("gender").isIn(["male", "female"]).withMessage("Gender must be either male or female"),

  body("price").isFloat({ min: 0 }).withMessage("Price cannot be negative"),

  body("condition")
    .optional()
    .isIn(["excellent", "good", "fair", "needs_repair"])
    .withMessage("Condition must be one of: excellent, good, fair, needs_repair"),

  handleValidationErrors,
]

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateApplicationSubmission,
  validateHostelCreation,
  validateRoomCreation,
  handleValidationErrors,
}
