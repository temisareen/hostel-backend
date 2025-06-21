const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const dotenv = require("dotenv")

// Load environment variables
dotenv.config()

// Import routes
const authRoutes = require("./routes/auth")
const hostelRoutes = require("./routes/hostels")
const roomRoutes = require("./routes/rooms")
const applicationRoutes = require("./routes/applications")
const adminRoutes = require("./routes/admin")

const app = express()

// Middleware
const allowedOrigins = [
  "http://localhost:3000", // for local testing
  "https://hostel-frontend-eight.vercel.app/", // replace with actual Vercel URL
]

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // if using cookies or auth headers
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Database connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((error) => console.error("❌ MongoDB connection error:", error))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/hostels", hostelRoutes)
app.use("/api/rooms", roomRoutes)
app.use("/api/applications", applicationRoutes)
app.use("/api/admin", adminRoutes)

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Caleb University Hostel Allocation System API",
    timestamp: new Date().toISOString(),
  })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error)
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  })
})

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📍 API Base URL: http://localhost:${PORT}/api`)
})

module.exports = app
