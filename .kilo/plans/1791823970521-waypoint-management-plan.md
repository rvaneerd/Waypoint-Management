# Waypoint Management System Plan

## Project Overview
Create a system to manage GPS waypoints with web interface and export functionality for Topo GPS.

## Requirements Analysis
Based on the user's requirements, we need to:

### Core Functionality:
1. Web interface to input GPS coordinates with metadata:
   - Name
   - Latitude
   - Longitude  
   - Short description
   - Information reference (URL or text)
   - Location structure (hierarchical folder system)

2. Database storage using SharedDB server
3. Export functionality to generate ZIP files compatible with Topo GPS
4. Maintain hierarchical location structure (folder organization)
5. Reuse last location structure value when creating new entries

### Technical Requirements:
1. Web pages should be in OrbStack Docker container
2. Use existing SharedDB server for database storage
3. Generate ZIP export with proper directory structure for Topo GPS

## System Architecture Plan

### 1. Database Design
We'll create a MySQL database schema to support waypoint management:

#### Tables:
- `waypoints`: Stores GPS coordinates and basic information
- `location_hierarchy`: Stores hierarchical location structure  
- `waypoint_metadata`: Stores additional information and references

### 2. Web Interface Components
- Admin dashboard for creating/editing waypoints
- Location hierarchy management interface 
- Export functionality to generate Topo GPS compatible ZIP

### 3. Data Flow
1. User enters waypoint data through web form
2. Data validated and stored in database
3. User can browse or export waypoints (ZIP generation)
4. Zip export with directory structure for Topo GPS import

## Implementation Steps

### Phase 1: Database Setup
- Create database schema in SharedDB
- Define tables for waypoints, location hierarchy, and metadata

### Phase 2: Web Interface 
- Set up admin interface for waypoint entry
- Implement form with location hierarchy selection
- Add functionality to reuse last location structure

### Phase 3: Export Functionality
- Create ZIP file generation function
- Implement Topo GPS compatible export format
- Add directory structure support

### Phase 4: Docker Integration
- Set up Docker container for the web application
- Configure connection to SharedDB server
- Test complete workflow

## Technical Considerations

### Database Schema Details:
1. `waypoints` table:
   - id (primary key)
   - name (text)
   - latitude (decimal)
   - longitude (decimal) 
   - description (text)
   - reference (text or URL)
   - location_hierarchy_id (foreign key to location_hierarchy)

2. `location_hierarchy` table:
   - id (primary key)
   - parent_id (foreign key to self, for tree structure)
   - name (text)
   - level (integer) 

### Export Format Requirements:
- Must create proper directory structure
- ZIP should contain files compatible with Topo GPS 
- Support hierarchical folder organization

## Docker Configuration Plan

1. Create Dockerfile for web application
2. Configure docker-compose.yml to link with SharedDB
3. Set up proper networking between containers

## Validation Plan

1. Unit tests for database operations
2. Integration tests for web interface
3. Export validation with Topo GPS simulation
4. End-to-end workflow testing

This plan outlines a comprehensive approach to building the waypoint management system as requested.