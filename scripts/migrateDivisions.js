import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Proposal from '../src/models/Proposal.js';
import Match from '../src/models/Match.js';

dotenv.config();

console.log('Loaded MONGO_URI:', process.env.MONGO_URI); // <--- Debug print

async function migrateDivisions() {
  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find({ divisions: { $exists: true, $ne: [] } }).lean();

  for (const user of users) {
    const userName = `${user.name || user.id}`; // Adjust if you store full name differently
    for (const division of user.divisions) {
      console.log(`Updating proposals for user ${userName} division ${division}`);
      await Proposal.updateMany(
        {
          division: { $exists: false },
          $or: [{ senderName: userName }, { receiverName: userName }]
        },
        { $set: { division } }
      );

      console.log(`Updating matches for user ${userName} division ${division}`);
      await Match.updateMany(
        {
          division: { $exists: false },
          $or: [{ player: userName }, { opponent: userName }]
        },
        { $set: { division } }
      );
    }
  }

  console.log('Migration completed');
  mongoose.disconnect();
}

migrateDivisions().catch(err => {
  console.error('Migration error:', err);
  mongoose.disconnect();
});
