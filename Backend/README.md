# School Attendance Management System - Backend

A comprehensive backend API for managing school attendance using Express.js and MongoDB.

## Features

- **User Management**: Admin, Teacher, and Parent roles
- **Student Management**: Complete student profiles with RFID and face recognition support
- **Attendance Tracking**: Multiple marking methods (face, RFID, manual)
- **Class Management**: Class schedules and teacher assignments
- **Notifications**: Real-time notifications for parents and teachers
- **Offline Sync**: Support for offline attendance marking with sync queue
- **Security**: JWT authentication and role-based authorization

## Tech Stack

- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **express-validator** for input validation

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/school_attendance
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

4. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance
- `PUT /api/attendance/:id` - Update attendance record
- `GET /api/attendance/stats` - Get attendance statistics

### Health Check
- `GET /api/health` - Server health status

## Database Schema

### Users
- Authentication and profile information
- Role-based access (admin, teacher, parent)
- Linked to teachers and students

### Students
- Complete student profiles
- RFID and face embedding support
- Parent relationships

### Teachers
- Teacher profiles with qualifications
- Class assignments
- School associations

### Classes
- Class information and schedules
- Teacher and student assignments
- Academic year management

### Attendance Records
- Daily attendance tracking
- Multiple marking methods
- Offline sync support

### Schools
- School information and settings
- Admin management
- Configuration options

### Notifications
- Real-time notifications
- Multiple delivery channels
- Status tracking

### Sync Queue
- Offline data synchronization
- Device management
- Retry mechanisms

## Security Features

- JWT-based authentication
- Role-based authorization
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Helmet security headers

## Development

The server runs on port 5000 by default. Make sure MongoDB is running on your system.

### Environment Variables

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRE` - JWT token expiration time
- `PORT` - Server port
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Allowed CORS origin

## License

ISC
