#!/bin/bash

# Teacher Password Migration Script Runner
# This script helps you run the teacher password migration tools

echo "🔐 Teacher Password Migration Tools"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the Backend directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "Choose an option:"
echo "1. Quick migration (add passwords to teachers without them)"
echo "2. Interactive password manager"
echo "3. Exit"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "🚀 Running quick migration..."
        node scripts/add-teacher-passwords.js
        ;;
    2)
        echo "🚀 Starting interactive password manager..."
        node scripts/teacher-password-manager.js
        ;;
    3)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

