# Dockerfile for Waypoint Management System

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies 
RUN npm ci --only=production

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p exports

# Expose port
ARG PORT=3000
EXPOSE ${PORT}

# Start the application
CMD ["node", "index.js"]