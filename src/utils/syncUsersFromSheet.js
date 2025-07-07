const fetchSheetData = require('./fetchSheetData');
const User = require('../models/User');

const sheetID = "1tvMgMHsRwQxsR6lMNlSnztmwpK7fhZeNEyqjTqmRFRc";
const pinSheetName = "BCAPL SIGNUP";

async function syncSheetUsersToMongo() {
  try {
    console.log('Starting user sync from Google Sheets...');
    console.log('Sheet ID:', sheetID);
    console.log('Sheet Name:', pinSheetName);
    
    const rows = await fetchSheetData(sheetID, `${pinSheetName}!A1:L1000`);
    console.log('Fetched rows from sheet:', rows.length);
    
    const dataRows = rows.slice(1); // skip header
    console.log('Data rows (excluding header):', dataRows.length);

    const users = dataRows
      .filter(row => row[2]) // Only rows with an email
      .map(row => {
        const email = (row[2] || "").trim().toLowerCase();
        return {
          id: email, // Always set id to email
          email,
          pin: row[11] || "", // Keep PIN for reference if needed
          name: `${row[0] || ""} ${row[1] || ""}`.trim(),
          divisions: ["FRBCAPL TEST"] // Always use array for divisions
        };
      });

    console.log("Mapped users:", users.length);

    const ops = users.map(user => ({
      updateOne: {
        filter: { email: user.email },
        update: { $set: user },
        upsert: true
      }
    }));

    const result = await User.bulkWrite(ops);
    console.log(`Synced ${result.nUpserted + result.nModified} users from sheet.`);
    return result;
  } catch (error) {
    console.error('Error in syncSheetUsersToMongo:', error);
    throw new Error(`Failed to sync users: ${error.message}`);
  }
}

module.exports = syncSheetUsersToMongo;
