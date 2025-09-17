#!/bin/bash

# Script to start the backend server
echo "🚀 Starting School Attendance Backend Server..."

# Navigate to backend directory
cd Backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cat > .env << EOF
# Database
MONGODB_URI=mongodb://localhost:27017/school-attendance

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:8081,http://localhost:5173,http://localhost:3000

# Optional: Quiet startup
QUIET_STARTUP=false
EOF
    echo "✅ Created .env file with default values"
fi

# Start the server
echo "🌟 Starting server on port 5000..."
npm run dev

