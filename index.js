// Main entry point for waypoint management system

// Load environment variables (if any)
require("dotenv").config();

// Initialize database connection
const db = require("./src/database/connection");

// Initialize database schema
db.initializeDatabase()
  .then(() => {
    console.log("Database initialized successfully");

    // Start the web server
    const app = require("./src/web/server");

    const PORT = process.env.PORT || 3000;

    // Start server
    app.listen(PORT, () => {
      console.log(`Waypoint management server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("Shutting down gracefully...");
      db.close();
      process.exit(0);
    });

    // Export app for use by other modules (like testing)
    module.exports = app;
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
