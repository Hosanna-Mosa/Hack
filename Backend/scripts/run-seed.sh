#!/bin/bash

# Teacher Seeding Script Runner
# This script helps you manage test teacher data

echo "🌱 Teacher Seeding Script"
echo "========================"
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
echo "1. Create test teachers"
echo "2. Show existing teachers"
echo "3. Cleanup test data"
echo "4. Exit"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🚀 Creating test teachers..."
        node scripts/seed-teachers.js create
        ;;
    2)
        echo "📋 Showing existing teachers..."
        node scripts/seed-teachers.js show
        ;;
    3)
        echo "🧹 Cleaning up test data..."
        read -p "Are you sure you want to delete all test data? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            node scripts/seed-teachers.js cleanup
        else
            echo "❌ Operation cancelled."
        fi
        ;;
    4)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

