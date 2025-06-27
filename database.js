const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL connection error:', error.message);
    return false;
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        locations TEXT,
        availability JSON,
        divisions JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create proposals table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS proposals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender VARCHAR(255) NOT NULL,
        receiver VARCHAR(255) NOT NULL,
        senderName VARCHAR(255) NOT NULL,
        receiverName VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        time VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        message TEXT,
        gameType VARCHAR(50) DEFAULT '8 Ball',
        raceLength INT DEFAULT 7,
        phase VARCHAR(50) DEFAULT 'scheduled',
        divisions JSON,
        status ENUM('pending', 'accepted', 'declined', 'completed') DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create matches table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS matches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player1 VARCHAR(255) NOT NULL,
        player2 VARCHAR(255) NOT NULL,
        player1Name VARCHAR(255) NOT NULL,
        player2Name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        time VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        gameType VARCHAR(50) DEFAULT '8 Ball',
        raceLength INT DEFAULT 7,
        phase VARCHAR(50) DEFAULT 'scheduled',
        division VARCHAR(100),
        status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
        winner VARCHAR(255),
        score VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create divisions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS divisions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create notes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        matchId INT,
        userId VARCHAR(255) NOT NULL,
        userName VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (matchId) REFERENCES matches(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database tables initialized successfully!');
    connection.release();
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase
}; 