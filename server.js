const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose'); // <-- ADD THIS LINE!
const { StreamChat } = require('stream-chat');

const app = express();

const allowedOrigins = [
  'https://frbcapl.github.io',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

// --- MONGODB SETUP ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB is connected!"))
  .catch(err => console.error("MongoDB connection error:", err));

const matchSchema = new mongoose.Schema({
  opponent: String,
  player: String,
  day: String,
  date: String,      // "YYYY-MM-DD"
  time: String,      // "HH:MM"
  location: String,
  gameType: String,
  raceLength: String,
  createdAt: { type: Date, default: Date.now }
});
const Match = mongoose.model('Match', matchSchema);

// --- STREAM CHAT SETUP (existing code) ---
const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;
const serverClient = StreamChat.getInstance(apiKey, apiSecret);

function cleanId(id) {
  return id.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}
const ADMIN_EMAILS = [
  "frbcaplgmailcom",
  "anotheradmin@example.com"
].map(email => cleanId(email));
function isAdminUser(userId) {
  return ADMIN_EMAILS.includes(cleanId(userId));
}
function getMatchChannelId(userId1, userId2) {
  return `match-${[cleanId(userId1), cleanId(userId2)].sort().join('-')}`;
}

// --- STREAM CHAT ROUTES (existing code) ---
app.post('/token', async (req, res) => {
  let { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  userId = cleanId(userId);
  try {
    const user = isAdminUser(userId)
      ? { id: userId, name: "Admin", role: "admin" }
      : { id: userId, name: userId };
    await serverClient.upsertUser(user);
    const token = serverClient.createToken(userId);
    res.json({ token });
  } catch (err) {
    console.error('Error generating token:', err);
    res.status(500).json({ error: err.message });
  }
});
app.post('/create-user', async (req, res) => {
  let { userId, name, email } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  userId = cleanId(userId);
  try {
    const user = { id: userId, name: name || userId };
    if (email) user.email = email;
    if (isAdminUser(userId)) user.role = "admin";
    await serverClient.upsertUser(user);
    const generalChannel = serverClient.channel('messaging', 'general');
    try {
      await generalChannel.addMembers([userId]);
      console.log(`Added ${userId} to "general" channel.`);
    } catch (err) {
      console.error('Error adding user to general channel:', err.message);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error creating/updating user:', err);
    res.status(500).json({ error: err.message });
  }
});
app.post('/propose-match', async (req, res) => {
  const { userId1, userId2, userName1, userName2, matchDate } = req.body;
  if (!userId1 || !userId2) return res.status(400).json({ error: 'Missing user IDs' });
  const cleanedUserId1 = cleanId(userId1);
  const cleanedUserId2 = cleanId(userId2);
  const channelId = getMatchChannelId(userId1, userId2);
  try {
    await serverClient.upsertUser({ id: cleanedUserId1, name: userName1 || userId1 });
    await serverClient.upsertUser({ id: cleanedUserId2, name: userName2 || userId2 });
    for (const adminId of ADMIN_EMAILS) {
      await serverClient.upsertUser({ id: adminId, name: "Admin", role: "admin" });
    }
  } catch (err) {
    console.error('Error upserting users:', err);
    return res.status(500).json({ error: 'Failed to upsert users for chat channel' });
  }
  const channelName = `${userName1 || userId1} & ${userName2 || userId2}`;
  const allMembers = Array.from(new Set([cleanedUserId1, cleanedUserId2, ...ADMIN_EMAILS]));
  const channelData = {
    name: channelName,
    members: allMembers,
    created_by_id: ADMIN_EMAILS[0],
    ...(matchDate && { matchDate }),
  };
  const channel = serverClient.channel('messaging', channelId, channelData);
  try {
    await channel.create();
  } catch (err) {
    if (err.code === 16 && err.message && err.message.includes('already exists')) {
      if (matchDate) {
        try { await channel.update({ matchDate }); } catch (updateErr) { }
      }
    } else if (err.code === 4 && err.message && err.message.includes('Duplicate members')) {
      return res.status(400).json({ error: 'Duplicate members in channel creation. Please contact support.' });
    } else {
      return res.status(500).json({ error: 'Failed to create match chat channel', details: err.message });
    }
  }
  try {
    await channel.addMembers(allMembers);
  } catch (err) {
    if (err.code !== 16) {
      return res.status(500).json({ error: 'Failed to add members to match chat channel', details: err.message });
    }
  }
  res.json({ success: true, channelId });
});
app.post('/make-admin', async (req, res) => {
  let { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  userId = cleanId(userId);
  try {
    await serverClient.partialUpdateUser({
      id: userId,
      set: { role: 'admin' }
    });
    res.json({ success: true, userId, role: 'admin' });
  } catch (err) {
    console.error('Error making user admin:', err);
    res.status(500).json({ error: err.message });
  }
});
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- MATCH STORAGE API ---
// Save a confirmed match
app.post('/api/matches', async (req, res) => {
  try {
    const match = new Match(req.body);
    await match.save();
    res.json({ success: true, match });
  } catch (err) {
    console.error('Error saving match:', err);
    res.status(500).json({ error: 'Failed to save match' });
  }
});

// Get upcoming matches for a player
app.get('/api/matches', async (req, res) => {
  const { player } = req.query;
  if (!player) return res.status(400).json({ error: 'Missing player' });

  try {
    const now = new Date();
    // Find matches where user is either player or opponent
    const matches = await Match.find({
      $or: [
        { player },
        { opponent: player }
      ],
      $expr: {
        $gt: [
          { $dateFromString: { dateString: { $concat: ["$date", "T", "$time"] } } },
          now
        ]
      }
    }).sort({ date: 1, time: 1 }).exec();

    res.json(matches);
  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Stream token server running on port ${PORT}`);
});
