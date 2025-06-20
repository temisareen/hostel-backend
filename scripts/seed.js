const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const dotenv = require("dotenv")

// Load environment variables
dotenv.config()

// Import models
const User = require("../models/User")
const Hostel = require("../models/Hostel")
const Room = require("../models/Room")
const Application = require("../models/Application")

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log("✅ Connected to MongoDB")
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    process.exit(1)
  }
}

// Sample data
const sampleHostels = [
  {
    name: "Caleb Hall (Male)",
    gender: "male",
    description: "Modern male hostel with excellent facilities",
    roomTypes: [
      { type: "single", count: 20, price: 150000 },
      { type: "double", count: 30, price: 120000 },
      { type: "triple", count: 25, price: 100000 },
      { type: "quad", count: 15, price: 80000 },
    ],
    totalRooms: 90,
    facilities: ["WiFi", "Laundry", "Common Room", "Study Hall", "Cafeteria"],
    rules: ["No visitors after 10 PM", "Keep rooms clean", "No loud music after 11 PM", "Respect other residents"],
    warden: {
      name: "Mr. Johnson Adebayo",
      phoneNumber: "08012345678",
      email: "johnson.adebayo@calebu.edu.ng",
    },
  },
  {
    name: "Grace Hall (Female)",
    gender: "female",
    description: "Comfortable female hostel with modern amenities",
    roomTypes: [
      { type: "single", count: 25, price: 150000 },
      { type: "double", count: 35, price: 120000 },
      { type: "triple", count: 20, price: 100000 },
      { type: "quad", count: 10, price: 80000 },
    ],
    totalRooms: 90,
    facilities: ["WiFi", "Laundry", "Common Room", "Beauty Salon", "Cafeteria"],
    rules: ["No male visitors in rooms", "Visitors allowed until 8 PM", "Keep rooms tidy", "No loud music after 10 PM"],
    warden: {
      name: "Mrs. Sarah Okafor",
      phoneNumber: "08087654321",
      email: "sarah.okafor@calebu.edu.ng",
    },
  },
  {
    name: "David Lodge (Male)",
    gender: "male",
    description: "Budget-friendly male accommodation",
    roomTypes: [
      { type: "double", count: 40, price: 100000 },
      { type: "triple", count: 30, price: 85000 },
      { type: "quad", count: 20, price: 70000 },
    ],
    totalRooms: 90,
    facilities: ["WiFi", "Laundry", "Common Room", "Sports Facility"],
    rules: ["No visitors after 9 PM", "Maintain cleanliness", "No gambling", "Respect quiet hours"],
    warden: {
      name: "Mr. Emmanuel Okon",
      phoneNumber: "08098765432",
      email: "emmanuel.okon@calebu.edu.ng",
    },
  },
  {
    name: "Ruth Hall (Female)",
    gender: "female",
    description: "Affordable female hostel with basic amenities",
    roomTypes: [
      { type: "double", count: 35, price: 100000 },
      { type: "triple", count: 35, price: 85000 },
      { type: "quad", count: 20, price: 70000 },
    ],
    totalRooms: 90,
    facilities: ["WiFi", "Laundry", "Common Room", "Kitchen"],
    rules: [
      "No male visitors in rooms",
      "Visitors until 7 PM only",
      "Keep common areas clean",
      "No loud activities after 10 PM",
    ],
    warden: {
      name: "Mrs. Grace Eze",
      phoneNumber: "08076543210",
      email: "grace.eze@calebu.edu.ng",
    },
  },
]

const sampleUsers = [
  // Admin users
  {
    name: "Admin User",
    email: "admin@calebu.edu.ng",
    password: "admin123",
    role: "admin",
    gender: "male",
    phoneNumber: "08012345678",
  },
  {
    name: "Sarah Admin",
    email: "sarah.admin@calebu.edu.ng",
    password: "admin123",
    role: "admin",
    gender: "female",
    phoneNumber: "08087654321",
  },
  // Student users
  {
    name: "John Doe",
    email: "john.doe@student.calebu.edu.ng",
    matricNumber: "CU/20/1001",
    password: "student123",
    role: "student",
    gender: "male",
    phoneNumber: "08011111111",
    level: "200",
    department: "Computer Science",
  },
  {
    name: "Jane Smith",
    email: "jane.smith@student.calebu.edu.ng",
    matricNumber: "CU/20/1002",
    password: "student123",
    role: "student",
    gender: "female",
    phoneNumber: "08022222222",
    level: "300",
    department: "Business Administration",
  },
  {
    name: "Michael Johnson",
    email: "michael.johnson@student.calebu.edu.ng",
    matricNumber: "CU/21/1003",
    password: "student123",
    role: "student",
    gender: "male",
    phoneNumber: "08033333333",
    level: "100",
    department: "Engineering",
  },
  {
    name: "Emily Brown",
    email: "emily.brown@student.calebu.edu.ng",
    matricNumber: "CU/21/1004",
    password: "student123",
    role: "student",
    gender: "female",
    phoneNumber: "08044444444",
    level: "200",
    department: "Mass Communication",
  },
]

// Generate rooms for a hostel
const generateRooms = (hostel, hostelId) => {
  const rooms = []
  let roomNumber = 1

  hostel.roomTypes.forEach((roomType) => {
    for (let i = 0; i < roomType.count; i++) {
      const room = {
        number: `${roomNumber.toString().padStart(3, "0")}`,
        hostel: hostelId,
        hostelName: hostel.name,
        capacity: getCapacityFromType(roomType.type),
        type: roomType.type,
        isEnsuite: Math.random() > 0.6, // 40% chance of ensuite
        gender: hostel.gender,
        occupiedBeds: 0,
        occupants: [],
        price: roomType.price,
        amenities: generateAmenities(),
        condition: getRandomCondition(),
      }

      rooms.push(room)
      roomNumber++
    }
  })

  return rooms
}

const getCapacityFromType = (type) => {
  const capacities = { single: 1, double: 2, triple: 3, quad: 4 }
  return capacities[type]
}

const generateAmenities = () => {
  const allAmenities = ["Bed", "Mattress", "Wardrobe", "Study Table", "Chair", "Fan", "Reading Lamp"]
  const count = Math.floor(Math.random() * 3) + 4 // 4-6 amenities
  return allAmenities.slice(0, count)
}

const getRandomCondition = () => {
  const conditions = ["excellent", "good", "fair", "needs_repair"]
  const weights = [0.3, 0.5, 0.15, 0.05] // Weighted random
  const random = Math.random()
  let sum = 0

  for (let i = 0; i < conditions.length; i++) {
    sum += weights[i]
    if (random <= sum) return conditions[i]
  }

  return "good"
}

// Seed function
const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...")

    // Clear existing data
    console.log("🗑️  Clearing existing data...")
    await Promise.all([User.deleteMany({}), Hostel.deleteMany({}), Room.deleteMany({}), Application.deleteMany({})])

    // Create hostels
    console.log("🏠 Creating hostels...")
    const createdHostels = await Hostel.insertMany(sampleHostels)
    console.log(`✅ Created ${createdHostels.length} hostels`)

    // Create rooms for each hostel
    console.log("🚪 Creating rooms...")
    const allRooms = []

    createdHostels.forEach((hostel) => {
      const hostelRooms = generateRooms(hostel, hostel._id)
      allRooms.push(...hostelRooms)
    })

    const createdRooms = await Room.insertMany(allRooms)
    console.log(`✅ Created ${createdRooms.length} rooms`)

    // Create users
    console.log("👥 Creating users...")
    const createdUsers = await User.insertMany(sampleUsers)
    console.log(`✅ Created ${createdUsers.length} users`)

    // Assign some students to rooms (simulate occupancy)
    console.log("🏠 Assigning students to rooms...")
    const students = createdUsers.filter((user) => user.role === "student")
    const availableRooms = createdRooms.filter((room) => room.isAvailable())

    let assignedCount = 0
    for (let i = 0; i < Math.min(students.length, Math.floor(availableRooms.length * 0.3)); i++) {
      const student = students[i]
      const compatibleRooms = availableRooms.filter((room) => room.gender === student.gender && room.isAvailable())

      if (compatibleRooms.length > 0) {
        const randomRoom = compatibleRooms[Math.floor(Math.random() * compatibleRooms.length)]

        try {
          await randomRoom.assignStudent(student._id)
          student.roomAssigned = randomRoom._id
          await student.save()
          assignedCount++
        } catch (error) {
          console.log(`Failed to assign student ${student.name} to room: ${error.message}`)
        }
      }
    }

    console.log(`✅ Assigned ${assignedCount} students to rooms`)

    // Create sample applications
    console.log("📝 Creating sample applications...")
    const unassignedStudents = createdUsers.filter((user) => user.role === "student" && !user.roomAssigned)

    const sampleApplications = unassignedStudents.map((student) => {
      const compatibleHostels = createdHostels.filter((hostel) => hostel.gender === student.gender)
      const randomHostel = compatibleHostels[Math.floor(Math.random() * compatibleHostels.length)]

      return {
        student: student._id,
        academicYear: "2024/2025",
        semester: "first",
        personalInfo: {
          guardianName: `Guardian of ${student.name}`,
          guardianPhone: "08099999999",
          guardianEmail: `guardian.${student.email}`,
          homeAddress: "123 Sample Street, Lagos, Nigeria",
          stateOfOrigin: "Lagos",
          emergencyContact: {
            name: `Emergency Contact for ${student.name}`,
            phone: "08088888888",
            relationship: "Parent",
          },
        },
        preferences: {
          hostelPreference: randomHostel._id,
          roomTypePreference: ["double", "triple", "quad"][Math.floor(Math.random() * 3)],
          specialRequests: "No special requests",
        },
        status: ["pending", "approved", "rejected"][Math.floor(Math.random() * 3)],
      }
    })

    const createdApplications = await Application.insertMany(sampleApplications)
    console.log(`✅ Created ${createdApplications.length} applications`)

    console.log("🎉 Database seeding completed successfully!")
    console.log("\n📊 Summary:")
    console.log(`   Hostels: ${createdHostels.length}`)
    console.log(`   Rooms: ${createdRooms.length}`)
    console.log(`   Users: ${createdUsers.length}`)
    console.log(`   Applications: ${createdApplications.length}`)
    console.log(`   Room Assignments: ${assignedCount}`)

    console.log("\n🔑 Sample Login Credentials:")
    console.log("   Admin: admin@calebu.edu.ng / admin123")
    console.log("   Student: john.doe@student.calebu.edu.ng / student123")
  } catch (error) {
    console.error("❌ Seeding error:", error)
  } finally {
    await mongoose.connection.close()
    console.log("🔌 Database connection closed")
  }
}

// Run seeding
const runSeed = async () => {
  await connectDB()
  await seedDatabase()
}

// Check if script is run directly
if (require.main === module) {
  runSeed()
}

module.exports = { seedDatabase, connectDB }
