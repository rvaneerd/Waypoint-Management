require("dotenv").config();

const requiredEnv = (name) => {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const requiredNumber = (name) => {
  const value = Number(requiredEnv(name));
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return value;
};

const requiredBoolean = (name) => {
  const value = requiredEnv(name).toLowerCase();
  if (value !== "true" && value !== "false") {
    throw new Error(`Environment variable ${name} must be true or false`);
  }
  return value === "true";
};

module.exports = {
  // Database connection settings for SharedDB
  database: {
    host: requiredEnv("DB_HOST"),
    port: requiredNumber("DB_PORT"),
    user: requiredEnv("DB_USER"),
    password: requiredEnv("DB_PASSWORD"),
    database: requiredEnv("DB_NAME"),
    connectionLimit: requiredNumber("DB_CONNECTION_LIMIT"),
    acquireTimeout: requiredNumber("DB_ACQUIRE_TIMEOUT"),
    timeout: requiredNumber("DB_TIMEOUT"),
  },

  // Waypoint management settings
  waypointSettings: {
    // Default location hierarchy path for new waypoints
    defaultHierarchyPath: requiredEnv("DEFAULT_HIERARCHY_PATH"),
    maxHierarchyDepth: requiredNumber("MAX_HIERARCHY_DEPTH"),
    export: {
      format: requiredEnv("EXPORT_FORMAT"),
      includeDescription: requiredBoolean("EXPORT_INCLUDE_DESCRIPTION"),
      includeReference: requiredBoolean("EXPORT_INCLUDE_REFERENCE"),
    },
  },
};
