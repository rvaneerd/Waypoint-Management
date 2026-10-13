#!/bin/bash

# Start the waypoint management system in Docker containers

echo "Starting Waypoint Management System..."
echo "Building Docker image..."

# Build the application image
docker-compose build

echo "Starting containers..."
# Start the services
docker-compose up -d

echo "Waypoint Management System started!"
echo "Access the web interface at http://localhost:3003"
echo "Database is connected to Shared-DB.orb.local"

# Show container status
echo ""
echo "Container Status:"
docker-compose ps