#!/bin/bash

echo "🚀 Starting School Attendance Backend Server..."
echo ""

# Check if Backend directory exists
if [ ! -d "Backend" ]; then
    echo "❌ Error: Backend directory not found!"
    echo "Please make sure you're running this script from the project root directory."
    exit 1
fi

# Navigate to Backend directory
cd Backend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in Backend directory!"
    exit 1
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating a basic one..."
    cat > .env << EOL
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/school_attendance

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=7d

# Server Configuration
PORT=8000
NODE_ENV=development

# Optional: Quiet startup mode
QUIET_STARTUP=false
EOL
    echo "✅ Created .env file with default values"
    echo "⚠️  Please update the JWT_SECRET and MONGODB_URI in the .env file!"
fi

echo ""
echo "🔧 Starting server on http://localhost:8000"
echo "📱 Frontend should connect to: http://localhost:8000/api"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start