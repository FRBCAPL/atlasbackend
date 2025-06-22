const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const { StreamChat } = require('stream-chat');
const cron = require('node-cron');
const { exec } = require('child_process');
const { deleteExpiredMatchChannels } = require('./src/cleanupChannels');
const { createMatchEvent } = require('./src/googleCalendar');
const User = require('./models/User');
const syncSheetUsersToMongo = require('./syncUsersFromSheet');
const Division = require('./models/Division');
const app = express();
const path = require('path');


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

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000,
})
  .then(() => console.log("MongoDB is connected!"))
  .catch(err => console.error("MongoDB connection error:", err));

// --- MATCH SCHEMA & MODEL ---
const matchSchema = new mongoose.Schema({
  opponent: String,
  player: String,
  day: String,
  date: String,
  time: String,
  location: String,
  gameType: String,
  raceLength: String,
  division: String, // <-- Added division field
  createdAt: { type: Date, default: Date.now },
  completed: { type: Boolean, default: false }
});
matchSchema.index({ player: 1, opponent: 1, date: 1 });
const Match = mongoose.model('Match', matchSchema);

// --- PROPOSAL SCHEMA & MODEL ---
const proposalSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  senderName: String,
  receiverName: String,
  date: String,
  time: String,
  location: String,
  message: String,
  gameType: String,
  raceLength: Number,
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
  counterProposal: {
    date: String,
    time: String,
    location: String,
    note: String,
    from: String,
    createdAt: { type: Date, default: Date.now }
  },
  phase: { type: String, enum: ["scheduled", "ladder"], required: true },
  completed: { type: Boolean, default: false },
  division: String // <-- Added division field
});
proposalSchema.index({ receiverName: 1, status: 1 });
proposalSchema.index({ receiver: 1, status: 1 });
const Proposal = mongoose.model('Proposal', proposalSchema);

// --- NOTES SCHEMA & MODEL ---
const noteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Note = mongoose.model('Note', noteSchema);

// --- STREAM CHAT SETUP ---
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

// --- STREAM CHAT ROUTES ---
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

// --- CREATE/UPDATE USER WITH DIVISION ---
app.post('/create-user', async (req, res) => {
  let { userId, name, email, division } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  userId = cleanId(userId);
  try {
    const user = { id: userId, name: name || userId };
    if (email) user.email = email;
    if (isAdminUser(userId)) user.role = "admin";
    await serverClient.upsertUser(user);

    // Save user info including division to MongoDB
    console.log(`API: Add user ${req.params.id} to division ${division}`);
    await User.findOneAndUpdate(
      { id: userId },
      { $set: { name: name || userId, email, division } },
      { upsert: true, new: true }
    );

    // Add user to general chat channel
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

// --- GET USER INFO (including division) ---
app.get('/api/user/:idOrEmail', async (req, res) => {
  try {
    const idOrEmail = decodeURIComponent(req.params.idOrEmail);
    // Try to find by id or email
    const user = await User.findOne({ $or: [ { id: idOrEmail }, { email: idOrEmail } ] });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});


// --- UPDATE USER DIVISION ---
app.patch('/api/user/:id/division', async (req, res) => {
  const { division } = req.body;
  if (!division) return res.status(400).json({ error: 'Division is required' });

  try {
    const user = await User.findOneAndUpdate(
      { id: req.params.id },
      { $set: { division } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error updating division:', err);
    res.status(500).json({ error: 'Failed to update division' });
  }
});

// --- DIVISION MANAGEMENT ENDPOINTS ---
app.post('/admin/divisions', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Division name required" });
    const division = await Division.create({ name, description });
    res.status(201).json({ success: true, division });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: "Division already exists" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});
app.post('/admin/update-standings', (req, res) => {
  exec('python scrape_standings.py', (error, stdout, stderr) => {
    if (error) {
      console.error('Error running scrape_standings.py:', error);
      return res.status(500).json({ error: stderr || error.message });
    }
    res.json({ message: stdout || "Standings updated." });
  });
});
app.get('/admin/divisions', async (req, res) => {
  try {
    const divisions = await Division.find().lean();
    res.json(divisions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SCHEDULE SCRAPE ENDPOINT ---
app.post('/admin/update-schedule', (req, res) => {
  exec('python scrape_schedule.py', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running scrape_schedule.py:`, error);
      return res.status(500).json({ error: stderr || error.message });
    }
    res.json({ message: stdout || "Schedule updated." });
  });
});

// --- MATCH/PROPOSAL/NOTES ENDPOINTS ---

app.post('/propose-match', async (req, res) => {
  const { userId1, userId2, userName1, userName2, matchDate, division } = req.body;
  if (!userId1 || !userId2) return res.status(400).json({ error: 'Missing user IDs' });
  const cleanedUserId1 = cleanId(userId1);
  const cleanedUserId2 = cleanId(userId2);
  const channelId = getMatchChannelId(userId1, userId2);

  try {
    await Promise.all([
      serverClient.upsertUser({ id: cleanedUserId1, name: userName1 || userId1 }),
      serverClient.upsertUser({ id: cleanedUserId2, name: userName2 || userId2 }),
      ...ADMIN_EMAILS.map(adminId =>
        serverClient.upsertUser({ id: adminId, name: "Admin", role: "admin" })
      ),
      new Proposal({
        sender: userId1,
        receiver: userId2,
        senderName: userName1 || userId1,
        receiverName: userName2 || userId2,
        date: matchDate,
        location: req.body.location || "",
        message: req.body.message || "",
        gameType: req.body.gameType || "8 Ball",
        raceLength: req.body.raceLength || 7,
        status: "pending",
        phase: req.body.phase || "scheduled",
        completed: false,
        division: division || "" // <-- Add division here!
      }).save()
    ]);
  } catch (err) {
    console.error('Error upserting users or saving proposal:', err);
    return res.status(500).json({ error: 'Failed to upsert users or save proposal' });
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

app.patch('/api/proposals/:id/completed', async (req, res) => {
  try {
    const proposal = await Proposal.findByIdAndUpdate(
      req.params.id,
      { completed: true },
      { new: true }
    );
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    res.json({ success: true, proposal });
  } catch (err) {
    console.error('Error marking proposal as completed:', err);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
});

// --- FILTERED MATCHES ENDPOINT ---
app.get('/api/all-matches', async (req, res) => {
  const { player, division } = req.query;
  if (!player) return res.status(400).json({ error: 'Missing player' });

  const trimmedPlayer = player.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const playerRegex = new RegExp(`^${trimmedPlayer}$`, 'i');

  const filter = {
    status: "confirmed",
    completed: { $ne: true },
    $or: [
      { senderName: playerRegex },
      { receiverName: playerRegex }
    ]
  };
  if (division) {
    filter.division = { $in: [division] };
  }

  try {
    const proposals = await Proposal.find(filter).lean();
    console.log("FILTER:", filter);
    console.log("FOUND MATCHES:", proposals.length, proposals.map(p => ({
      senderName: p.senderName,
      receiverName: p.receiverName,
      status: p.status,
      completed: p.completed,
      division: p.division
    })));
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});


// --- PROPOSALS API ---
app.post('/api/proposals', async (req, res) => {
  try {
    const {
      sender, receiver, senderName, receiverName,
      date, time, location, message, gameType, raceLength, phase, division
    } = req.body;

    if (!sender || !receiver || !senderName || !receiverName || !date || !location || !phase) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const proposal = new Proposal({
      sender,
      receiver,
      senderName,
      receiverName,
      date,
      time,
      location,
      message: message || "",
      gameType: gameType || "8 Ball",
      raceLength: raceLength || 7,
      status: "pending",
      phase,
      completed: false,
      division: division || ""
    });

    await proposal.save();
    res.status(201).json({ success: true, proposalId: proposal._id });
  } catch (err) {
    console.error("Error saving proposal:", err);
    res.status(500).json({ error: "Failed to create proposal" });
  }
});

// --- FILTERED PROPOSALS BY RECEIVER ---
app.get("/api/proposals/by-name", async (req, res) => {
  try {
    const { receiverName, division } = req.query;
    if (!receiverName) return res.status(400).json({ error: "Missing receiverName" });

    const filter = {
      receiverName,
      status: { $in: ["pending", "countered"] }
    };
   if (division) {
  filter.division = { $in: [division] };
}


    const proposals = await Proposal.find(filter).sort({ createdAt: -1 }).lean();
    res.json(proposals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch proposals" });
  }
});

// --- FILTERED PROPOSALS BY SENDER ---
app.get("/api/proposals/by-sender", async (req, res) => {
  try {
    const { senderName, division } = req.query;
    if (!senderName) return res.status(400).json({ error: "Missing senderName" });

    const filter = {
      senderName,
      status: { $in: ["pending", "countered"] }
    };
   if (division) {
  filter.division = { $in: [division] };
}


    const proposals = await Proposal.find(filter).sort({ createdAt: -1 }).lean();
    res.json(proposals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sent proposals" });
  }
});

app.patch('/api/proposals/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!["pending", "confirmed", "declined"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const proposal = await Proposal.findByIdAndUpdate(
      req.params.id,
      { status, ...(note ? { message: note } : {}) },
      { new: true }
    );
    if (!proposal) {
      return res.status(404).json({ error: "Proposal not found" });
    }

    // CREATE MATCH WHEN CONFIRMED
    if (status === "confirmed") {
      const existing = await Match.findOne({
        player: proposal.senderName,
        opponent: proposal.receiverName,
        date: proposal.date,
        time: proposal.time,
        location: proposal.location,
        division: proposal.division // <-- Match is created with division
      });
      if (!existing) {
        await Match.create({
          player: proposal.senderName,
          opponent: proposal.receiverName,
          date: proposal.date,
          time: proposal.time,
          location: proposal.location,
          gameType: proposal.gameType,
          raceLength: proposal.raceLength,
          division: proposal.division || ""
        });

        // --- GOOGLE CALENDAR EVENT CREATION ---
        try {
          function convertTo24(timeStr) {
            let [time, ampm] = timeStr.trim().toUpperCase().split(' ');
            let [hour, min] = time.split(':').map(Number);
            if (ampm === 'PM' && hour < 12) hour += 12;
            if (ampm === 'AM' && hour === 12) hour = 0;
            return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          }
          const startDateTime = new Date(`${proposal.date}T${convertTo24(proposal.time)}:00-06:00`);
          const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

          await createMatchEvent({
            summary: `${proposal.senderName} vs ${proposal.receiverName}`,
            description: `Game Type: ${proposal.gameType}, Race Length: ${proposal.raceLength}`,
            location: proposal.location,
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime.toISOString()
          });
          console.log("Google Calendar event created!");
        } catch (err) {
          console.error("Failed to create Google Calendar event:", err);
        }
      }
    }

    res.json({ success: true, proposal });
  } catch (err) {
    console.error("Error updating proposal status:", err);
    res.status(500).json({ error: "Failed to update proposal status" });
  }
});

app.patch('/api/proposals/:id/counter', async (req, res) => {
  try {
    const { date, time, location, note, from } = req.body;
    const proposal = await Proposal.findByIdAndUpdate(
      req.params.id,
      {
        status: "countered",
        counterProposal: { date, time, location, note, from, createdAt: new Date() }
      },
      { new: true }
    );
    if (!proposal) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    res.json({ success: true, proposal });
  } catch (err) {
    console.error("Error counter-proposing:", err);
    res.status(500).json({ error: "Failed to counter-propose" });
  }
});

// --- NOTES API ---
app.get('/api/notes', async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 }).lean();
    res.json(notes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});
app.post('/admin/sync-users', async (req, res) => {
  try {
    await syncSheetUsersToMongo();
    res.json({ success: true });
  } catch (err) {
    console.error('Sync failed:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    if (!req.body.text || !req.body.text.trim()) {
      return res.status(400).json({ error: 'Note text required' });
    }
    const note = new Note({ text: req.body.text.trim() });
    await note.save();
    res.status(201).json(note);
  } catch (err) {
    console.error('Error saving note:', err);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// --- BULK CONVERT division TO divisions ARRAY FOR ALL USERS ---
app.post('/admin/convert-divisions', async (req, res) => {
  try {
    const result = await User.collection.updateMany(
      { division: { $exists: true } },
      [
        { $set: { divisions: ["$division"] } },
        { $unset: "division" }
      ]
    );
    res.json({ success: true, matched: result.matchedCount, modified: result.modifiedCount });
  } catch (error) {
    console.error('Error converting divisions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a division to a user's divisions array (no duplicates)
app.patch('/admin/user/:id/add-division', async (req, res) => {
  const { division } = req.body;
  const trimmedId = req.params.id.trim();
  const user = await User.findOneAndUpdate(
    { id: trimmedId },
    { $addToSet: { divisions: division } },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ success: true, user });
});
app.patch('/admin/user/:id/remove-division', async (req, res) => {
  const { division } = req.body;
  const trimmedId = req.params.id.trim();
  const user = await User.findOneAndUpdate(
    { id: trimmedId },
    { $pull: { divisions: division } },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ success: true, user });
});

// Search users by name or email (partial match, case-insensitive)
app.get('/admin/search-users', async (req, res) => {
  const { query } = req.query;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Missing search query' });
  }
  const regex = new RegExp(query.trim(), 'i');
  try {
    const users = await User.find({
      $or: [
        { name: regex },
        { email: regex }
      ]
    }).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Stream token server running on port ${PORT}`);
});

cron.schedule('0 2 * * *', () => {
  deleteExpiredMatchChannels()
    .then(() => console.log('Expired channels cleaned up!'))
    .catch(err => console.error('Cleanup failed:', err));
});
