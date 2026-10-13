#!/bin/bash

# Validation script for Waypoint Management System
echo "Validating Waypoint Management System..."

# Check if all required files exist
echo "Checking required files:"
if [ -f "index.js" ]; then
    echo "✓ index.js exists"
else
    echo "✗ index.js missing"
fi

if [ -f "package.json" ]; then
    echo "✓ package.json exists"
else
    echo "✗ package.json missing"
fi

if [ -f "package-lock.json" ]; then
    echo "✓ package-lock.json exists"
else
    echo "✗ package-lock.json missing"
fi

# Check directory structure
echo -e "\nChecking directory structure:"
find src -type f | head -10

# Check that database config is valid
echo -e "\nChecking database configuration:"
if [ -f "src/database/config.js" ]; then
    echo "✓ Database config exists"
    grep -q "host.*Shared-DB" src/database/config.js && echo "✓ Database host correctly configured"
fi

# Check if node_modules directory exists (which indicates successful install)
echo -e "\nNode modules check:"
if [ -d "node_modules" ]; then
    echo "✓ node_modules directory found"
    echo "Number of packages installed: $(ls node_modules | wc -l)"
else
    echo "✗ node_modules directory missing"
fi

echo -e "\nValidation complete!"