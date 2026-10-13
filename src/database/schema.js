// Database schema for waypoint management system

const schema = [
  `CREATE TABLE IF NOT EXISTS waypoints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    description TEXT,
    reference_url VARCHAR(500),
    location_hierarchy_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_location_hierarchy (location_hierarchy_id),
    INDEX idx_latitude_longitude (latitude, longitude),
    CONSTRAINT fk_waypoint_location 
        FOREIGN KEY (location_hierarchy_id) REFERENCES location_hierarchies(id) ON DELETE SET NULL
  )`,
  
  `CREATE TABLE IF NOT EXISTS location_hierarchies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    level INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id),
    INDEX idx_level (level)
  )`,
  
  `CREATE TABLE IF NOT EXISTS waypoint_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    waypoint_id INT NOT NULL,
    meta_key VARCHAR(100) NOT NULL,
    meta_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_waypoint_key (waypoint_id, meta_key),
    CONSTRAINT fk_metadata_waypoint 
        FOREIGN KEY (waypoint_id) REFERENCES waypoints(id) ON DELETE CASCADE
  )`
];

module.exports = schema;