require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Proposal = require('./models/Proposal');
const Match = require('./models/Match');


async function migrateDivisions() {
  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find({ divisions: { $exists: true, $ne: [] } }).lean();

  for (const user of users) {
    const userName = `${user.name || user.id}`; // Adjust if you store full name differently
    for (const division of user.divisions) {
      // Removed all console.log statements for production
      await Proposal.updateMany(
        {
          division: { $exists: false },
          $or: [{ senderName: userName }, { receiverName: userName }]
        },
        { $set: { division } }
      );

      // Removed all console.log statements for production
      await Match.updateMany(
        {
          division: { $exists: false },
          $or: [{ player: userName }, { opponent: userName }]
        },
        { $set: { division } }
      );
    }
  }

  // Removed all console.log statements for production
  mongoose.disconnect();
}

migrateDivisions().catch(err => {
  console.error('Migration error:', err);
  mongoose.disconnect();
});
