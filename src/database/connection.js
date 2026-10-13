// Database connection manager for waypoint management system

const mysql = require("mysql2");
const config = require("./config");
const schema = require("./schema");

class DatabaseConnection {
  constructor() {
    this.connection = null;
    this.connect();
  }

  connect() {
    try {
      this.connection = mysql.createConnection({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        connectionLimit: config.database.connectionLimit,
      });

      // Test the connection
      this.connection.connect((err) => {
        if (err) {
          console.error("Database connection failed:", err);
          throw err;
        }
        console.log("Connected to SharedDB at " + config.database.host);
      });
    } catch (error) {
      console.error("Failed to initialize database connection:", error);
      throw error;
    }
  }

  // Generic query function
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.connection.execute(sql, params, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
  }

  // Close connection
  close() {
    if (this.connection) {
      this.connection.end();
    }
  }

  // Initialize database with required tables
  async initializeDatabase() {
    try {
      // Execute schema as multiple separate statements
      for (const statement of schema) {
        await this.query(statement);
      }

      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }
}

module.exports = new DatabaseConnection();
