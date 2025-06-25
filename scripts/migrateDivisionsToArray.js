// migrateDivisionsToArray.js
// Usage: node backend/scripts/migrateDivisionsToArray.js
// Make sure to set MONGO_URI and DB_NAME in your environment or .env file.

const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

if (!uri || !dbName) {
  console.error('ERROR: Please set MONGO_URI and DB_NAME environment variables.');
  process.exit(1);
}

const client = new MongoClient(uri);

async function migrateDivisions() {
  try {
    await client.connect();
    const db = client.db(dbName);

    // USERS
    const users = db.collection('users');
    const userResult = await users.updateMany(
      { division: { $exists: true }, divisions: { $exists: false } },
      [
        { $set: { divisions: ["$division"] } },
        { $unset: "division" }
      ]
    );
    console.log(`Users updated: ${userResult.modifiedCount}`);

    // PROPOSALS
    const proposals = db.collection('proposals');
    const proposalResult = await proposals.updateMany(
      { division: { $exists: true }, divisions: { $exists: false } },
      [
        { $set: { divisions: ["$division"] } },
        { $unset: "division" }
      ]
    );
    console.log(`Proposals updated: ${proposalResult.modifiedCount}`);

    // MATCHES
    const matches = db.collection('matches');
    const matchResult = await matches.updateMany(
      { division: { $exists: true }, divisions: { $exists: false } },
      [
        { $set: { divisions: ["$division"] } },
        { $unset: "division" }
      ]
    );
    console.log(`Matches updated: ${matchResult.modifiedCount}`);

    console.log('Migration complete!');
  } finally {
    await client.close();
  }
}

migrateDivisions().catch(console.error); 