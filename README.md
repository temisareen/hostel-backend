# Caleb University Hostel Allocation System - Backend

A comprehensive Node.js backend API for managing hostel allocation at Caleb University. Built with Express.js, MongoDB, and JWT authentication.

## 🚀 Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Student/Admin)
- Secure password hashing with bcrypt
- Session management

### 🏠 Hostel & Room Management
- Complete hostel CRUD operations
- Room allocation and management
- Real-time occupancy tracking
- Gender-based room assignment

### 📝 Application System
- Student application submission
- Admin approval/rejection workflow
- Application status tracking
- Document management support

### 📊 Admin Dashboard
- Comprehensive statistics and analytics
- Occupancy reports
- Application management
- User management

### 🛡️ Security Features
- Input validation and sanitization
- Rate limiting
- CORS protection
- Environment-based configuration

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Environment**: dotenv

## 📦 Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd caleb-university-hostel-backend
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Environment Setup**
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   
   Update the `.env` file with your configuration:
   \`\`\`env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   \`\`\`

4. **Seed the database** (Optional)
   \`\`\`bash
   npm run seed
   \`\`\`

5. **Start the server**
   \`\`\`bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   \`\`\`

## 🔗 API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /change-password` - Change password

### Hostel Routes (`/api/hostels`)
- `GET /` - Get all hostels
- `GET /:id` - Get single hostel
- `POST /` - Create hostel (Admin)
- `PUT /:id` - Update hostel (Admin)
- `DELETE /:id` - Delete hostel (Admin)

### Room Routes (`/api/rooms`)
- `GET /` - Get all rooms
- `GET /available` - Get available rooms by gender
- `GET /:id` - Get single room
- `POST /assign` - Assign student to room (Admin)
- `POST /:id/remove-student` - Remove student from room (Admin)
- `POST /` - Create room (Admin)
- `PUT /:id` - Update room (Admin)
- `DELETE /:id` - Delete room (Admin)

### Application Routes (`/api/applications`)
- `POST /submit` - Submit application (Student)
- `GET /` - Get applications
- `GET /:studentId` - Get student applications
- `GET /details/:id` - Get application details
- `POST /:id/approve` - Approve application (Admin)
- `POST /:id/reject` - Reject application (Admin)
- `PUT /:id` - Update application
- `DELETE /:id` - Delete application

### Admin Routes (`/api/admin`)
- `GET /dashboard` - Get dashboard statistics
- `GET /users` - Get all users with filters
- `PUT /users/:id/toggle-status` - Toggle user status
- `GET /reports/occupancy` - Get occupancy report
- `GET /reports/applications` - Get applications report

## 📊 Database Models

### User Model
\`\`\`javascript
{
  name: String,
  email: String,
  matricNumber: String, // For students
  password: String,
  role: ['student', 'admin'],
  gender: ['male', 'female'],
  phoneNumber: String,
  level: ['100', '200', '300', '400', '500'], // For students
  department: String, // For students
  isActive: Boolean,
  roomAssigned: ObjectId
}
\`\`\`

### Hostel Model
\`\`\`javascript
{
  name: String,
  gender: ['male', 'female'],
  description: String,
  roomTypes: [{
    type: ['single', 'double', 'triple', 'quad'],
    count: Number,
    price: Number
  }],
  totalRooms: Number,
  facilities: [String],
  rules: [String],
  warden: {
    name: String,
    phoneNumber: String,
    email: String
  },
  isActive: Boolean
}
\`\`\`

### Room Model
\`\`\`javascript
{
  number: String,
  hostel: ObjectId,
  hostelName: String,
  capacity: Number,
  type: ['single', 'double', 'triple', 'quad'],
  isEnsuite: Boolean,
  gender: ['male', 'female'],
  occupiedBeds: Number,
  occupants: [{
    student: ObjectId,
    assignedDate: Date,
    bedNumber: Number
  }],
  price: Number,
  amenities: [String],
  condition: ['excellent', 'good', 'fair', 'needs_repair'],
  isActive: Boolean
}
\`\`\`

### Application Model
\`\`\`javascript
{
  student: ObjectId,
  academicYear: String,
  semester: ['first', 'second'],
  personalInfo: {
    guardianName: String,
    guardianPhone: String,
    guardianEmail: String,
    homeAddress: String,
    stateOfOrigin: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  preferences: {
    hostelPreference: ObjectId,
    roomTypePreference: String,
    specialRequests: String
  },
  status: ['pending', 'approved', 'rejected', 'assigned'],
  assignedRoom: ObjectId,
  reviewedBy: ObjectId,
  reviewedAt: Date,
  reviewComments: String,
  paymentStatus: ['pending', 'paid', 'partial', 'overdue']
}
\`\`\`

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## 🧪 Sample Data

The seed script creates sample data including:
- 4 hostels (2 male, 2 female)
- 360 rooms across all hostels
- Admin and student users
- Sample applications

### Sample Login Credentials
- **Admin**: `admin@calebu.edu.ng` / `admin123`
- **Student**: `john.doe@student.calebu.edu.ng` / `student123`

## 🚀 Deployment

### Environment Variables for Production
\`\`\`env
NODE_ENV=production
PORT=5000
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
CORS_ORIGIN=your-frontend-domain
\`\`\`

### Docker Deployment (Optional)
\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
\`\`\`

## 🧪 Testing

\`\`\`bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
\`\`\`

## 📝 API Documentation

### Response Format
All API responses follow this format:
\`\`\`json
{
  "success": true|false,
  "message": "Response message",
  "data": {}, // Response data
  "errors": [] // Validation errors (if any)
}
\`\`\`

### Error Handling
- `400` - Bad Request (Validation errors)
- `401` - Unauthorized (Authentication required)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@calebu.edu.ng or create an issue in the repository.

---

**Caleb University IT Department**  
Building the future of education technology.
