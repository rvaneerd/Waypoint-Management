// Waypoint model for managing GPS coordinates and related data

const db = require("../connection");

class Waypoint {
  constructor() {
    this.table = "waypoints";
    this.hierarchyTable = "location_hierarchies";
  }

  // Create a new waypoint
  async create(waypointData) {
    const { name, latitude, longitude, description, reference_url, location_hierarchy_id } = waypointData;

    if (!name || !latitude || !longitude) {
      throw new Error("Name, latitude, and longitude are required");
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      throw new Error("Invalid latitude value");
    }

    if (longitude < -180 || longitude > 180) {
      throw new Error("Invalid longitude value");
    }

    const sql = `
      INSERT INTO ${this.table} 
      (name, latitude, longitude, description, reference_url, location_hierarchy_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      const result = await db.query(sql, [name, latitude, longitude, description, reference_url, location_hierarchy_id]);
      return { id: result.insertId, ...waypointData };
    } catch (error) {
      throw new Error(`Failed to create waypoint: ${error.message}`);
    }
  }

  // Get all waypoints
  async getAll(limit = 100, offset = 0) {
    const sql = `
      SELECT w.*, h.name as location_name 
      FROM ${this.table} w
      LEFT JOIN ${this.hierarchyTable} h ON w.location_hierarchy_id = h.id
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const results = await db.query(sql, [limit, offset]);
      return results;
    } catch (error) {
      throw new Error(`Failed to fetch waypoints: ${error.message}`);
    }
  }

  // Get waypoint by ID
  async getById(id) {
    const sql = `
      SELECT w.*, h.name as location_name 
      FROM ${this.table} w
      LEFT JOIN ${this.hierarchyTable} h ON w.location_hierarchy_id = h.id
      WHERE w.id = ?
    `;

    try {
      const results = await db.query(sql, [id]);
      return results[0];
    } catch (error) {
      throw new Error(`Failed to fetch waypoint: ${error.message}`);
    }
  }

  // Update waypoint
  async update(id, waypointData) {
    const { name, latitude, longitude, description, reference_url, location_hierarchy_id } = waypointData;

    const sql = `
      UPDATE ${this.table} 
      SET name = ?, latitude = ?, longitude = ?, description = ?, reference_url = ?, location_hierarchy_id = ?
      WHERE id = ?
    `;

    try {
      await db.query(sql, [name, latitude, longitude, description, reference_url, location_hierarchy_id, id]);
      return this.getById(id);
    } catch (error) {
      throw new Error(`Failed to update waypoint: ${error.message}`);
    }
  }

  // Delete waypoint
  async delete(id) {
    const sql = `DELETE FROM ${this.table} WHERE id = ?`;

    try {
      await db.query(sql, [id]);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete waypoint: ${error.message}`);
    }
  }

  // Get hierarchy path for a waypoint
  async getHierarchyPath(location_hierarchy_id) {
    if (!location_hierarchy_id) return [];

    const path = [];
    let currentId = location_hierarchy_id;

    try {
      // Traverse up the hierarchy to build path
      while (currentId) {
        const sql = `SELECT id, parent_id, name FROM ${this.hierarchyTable} WHERE id = ?`;
        const results = await db.query(sql, [currentId]);

        if (results.length > 0) {
          path.unshift(results[0].name);
          currentId = results[0].parent_id;
        } else {
          break;
        }
      }

      return path;
    } catch (error) {
      throw new Error(`Failed to get hierarchy path: ${error.message}`);
    }
  }

  // Get or create location hierarchy
  async getLocationHierarchy(path, parent_id = null) {
    let currentLevel = 0;
    let current_parent_id = parent_id;

    try {
      // Process each level of the path from top to bottom
      for (const name of path) {
        // Check if this level exists
        const sql = `SELECT id FROM ${this.hierarchyTable} WHERE name = ? AND parent_id ${current_parent_id ? "= ?" : "IS NULL"}`;
        const params = current_parent_id ? [name, current_parent_id] : [name];

        const results = await db.query(sql, params);

        if (results.length > 0) {
          // Level exists
          current_parent_id = results[0].id;
        } else {
          // Create new level
          const insertSql = `INSERT INTO ${this.hierarchyTable} (parent_id, name, level) VALUES (?, ?, ?)`;
          const insertParams = [current_parent_id, name, currentLevel];

          const result = await db.query(insertSql, insertParams);
          current_parent_id = result.insertId;
        }

        currentLevel++;
      }

      return current_parent_id;
    } catch (error) {
      throw new Error(`Failed to manage hierarchy: ${error.message}`);
    }
  }

  // Get all location hierarchies
  async getAllHierarchies() {
    const sql = `
      SELECT id, parent_id, name, level 
      FROM ${this.hierarchyTable} 
      ORDER BY level, name
    `;

    try {
      const results = await db.query(sql);
      return results;
    } catch (error) {
      throw new Error(`Failed to fetch hierarchies: ${error.message}`);
    }
  }

  async createHierarchy(name, parentId = null) {
    const locationName = typeof name === "string" ? name.trim() : "";
    if (!locationName) {
      throw new Error("Location name is required");
    }

    let level = 0;
    if (parentId !== null && parentId !== undefined && parentId !== "") {
      const parents = await db.query(`SELECT id, level FROM ${this.hierarchyTable} WHERE id = ?`, [parentId]);
      if (parents.length === 0) {
        throw new Error("Parent location not found");
      }
      parentId = parents[0].id;
      level = parents[0].level + 1;
    } else {
      parentId = null;
    }

    const duplicateSql =
      parentId === null
        ? `SELECT id FROM ${this.hierarchyTable} WHERE name = ? AND parent_id IS NULL`
        : `SELECT id FROM ${this.hierarchyTable} WHERE name = ? AND parent_id = ?`;
    const duplicateParams = parentId === null ? [locationName] : [locationName, parentId];
    const duplicates = await db.query(duplicateSql, duplicateParams);
    if (duplicates.length > 0) {
      throw new Error("A location with this name already exists under the selected parent");
    }

    const result = await db.query(`INSERT INTO ${this.hierarchyTable} (parent_id, name, level) VALUES (?, ?, ?)`, [parentId, locationName, level]);

    return { id: result.insertId, parent_id: parentId, name: locationName, level };
  }

  // Get last used hierarchy for a given path prefix
  async getLastUsedHierarchy(pathPrefix) {
    const sql = `
      SELECT w.location_hierarchy_id 
      FROM ${this.table} w
      WHERE w.location_hierarchy_id IS NOT NULL
      AND w.created_at = (
        SELECT MAX(created_at) 
        FROM ${this.table} 
        WHERE location_hierarchy_id IS NOT NULL
      )
      ORDER BY w.created_at DESC
      LIMIT 1
    `;

    try {
      const results = await db.query(sql);
      return results[0] ? results[0].location_hierarchy_id : null;
    } catch (error) {
      return null; // Return null if no previous hierarchy found
    }
  }
}

module.exports = new Waypoint();
