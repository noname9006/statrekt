#!/bin/bash
# start-dashboard.sh - Start the StatRekt Dashboard

echo "Starting StatRekt Dashboard..."
echo ""

# Check if database exists
DB_COUNT=$(find . -maxdepth 1 -name "*.db" -type f | wc -l)

if [ "$DB_COUNT" -eq 0 ]; then
    echo "❌ No database files found!"
    echo "Please run the Discord bot first to create a database."
    echo ""
    echo "If you want to test the dashboard, run:"
    echo "  node create-test-db.js"
    echo ""
    exit 1
fi

echo "✅ Found $DB_COUNT database file(s)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
echo "Starting dashboard on http://localhost:${DASHBOARD_PORT:-3000}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

node dashboard/server.js
