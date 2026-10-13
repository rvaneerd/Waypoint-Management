// Initialization script for waypoint management system

const db = require('./connection');
const config = require('./config');

console.log('Initializing Waypoint Management System...');
console.log('Connecting to database at:', config.database.host);
console.log('Database name:', config.database.database);

// Test the database connection
db.connection.connect((err) => {
  if (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
  
  console.log('Successfully connected to SharedDB!');
  console.log('Waypoint Management System is ready to use.');
  
  // Close the connection
  db.close();
});