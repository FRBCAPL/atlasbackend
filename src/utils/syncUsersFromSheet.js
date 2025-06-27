const fetchSheetData = require('./fetchSheetData');
const { pool } = require('../../database');

const sheetID = "1tvMgMHsRwQxsR6lMNlSnztmwpK7fhZeNEyqjTqmRFRc";
const pinSheetName = "BCAPL SIGNUP";

async function syncSheetUsersToMySQL() {
  const rows = await fetchSheetData(sheetID, `${pinSheetName}!A1:L1000`);
  const dataRows = rows.slice(1); // skip header

  const users = dataRows
    .filter(row => row[2]) // Only rows with an email
    .map(row => ({
      email: (row[2] || "").trim().toLowerCase(), // Unique by email
      pin: row[11] || "", // Keep PIN for reference if needed
      firstName: (row[0] || "").trim(),
      lastName: (row[1] || "").trim(),
      divisions: JSON.stringify(["FRBCAPL TEST"])
    }));

  console.log("Mapped users:", users);

  const connection = await pool.getConnection();
  
  try {
    for (const user of users) {
      // Check if user exists
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [user.email]
      );
      
      if (existing.length > 0) {
        // Update existing user
        await connection.execute(
          'UPDATE users SET firstName = ?, lastName = ?, divisions = ? WHERE email = ?',
          [user.firstName, user.lastName, user.divisions, user.email]
        );
      } else {
        // Insert new user
        await connection.execute(
          'INSERT INTO users (email, firstName, lastName, divisions) VALUES (?, ?, ?, ?)',
          [user.email, user.firstName, user.lastName, user.divisions]
        );
      }
    }
    
    console.log(`Synced ${users.length} users from sheet.`);
  } finally {
    connection.release();
  }
}

module.exports = syncSheetUsersToMySQL;
