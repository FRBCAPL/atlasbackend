const fetchSheetData = require('./fetchSheetData');
const User = require('./models/User');

const sheetID = "1tvMgMHsRwQxsR6lMNlSnztmwpK7fhZeNEyqjTqmRFRc";
const pinSheetName = "BCAPL SIGNUP";

async function syncSheetUsersToMongo() {
  const rows = await fetchSheetData(sheetID, `${pinSheetName}!A1:L1000`);
  const dataRows = rows.slice(1); // skip header

  const users = dataRows
    .filter(row => row[2]) // Only rows with an email
    .map(row => ({
      email: (row[2] || "").trim().toLowerCase(), // Unique by email
      pin: row[11] || "", // Keep PIN for reference if needed
      name: `${row[0] || ""} ${row[1] || ""}`.trim(),
      division: "FRBCAPL TEST"
    }));

  console.log("Mapped users:", users);

  const ops = users.map(user => ({
    updateOne: {
      filter: { email: user.email },
      update: { $set: user },
      upsert: true
    }
  }));

  const result = await User.bulkWrite(ops);
  console.log(`Synced ${result.nUpserted + result.nModified} users from sheet.`);
}

module.exports = syncSheetUsersToMongo;
