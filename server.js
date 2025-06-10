const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
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

// --- MONGODB SETUP (Optimized) ---
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000,
})
  .then(() => console.log("MongoDB is connected!"))
  .catch(err => console.error("MongoDB connection error:", err));

// --- MATCH SCHEMA & INDEXES ---
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
matchSchema.index({ player: 1, opponent: 1, date: 1 });
const Match = mongoose.model('Match', matchSchema);

// --- PROPOSAL SCHEMA & INDEXES (with counterProposal) ---
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
  status: { type: String, default: "pending" }, // "pending", "confirmed", "declined", "countered"
  createdAt: { type: Date, default: Date.now },
  counterProposal: {
    date: String,
    time: String,
    location: String,
    note: String,
    from: String,
    createdAt: { type: Date, default: Date.now }
  }
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

// --- OPTIMIZED /propose-match ROUTE ---
app.post('/propose-match', async (req, res) => {
  const { userId1, userId2, userName1, userName2, matchDate } = req.body;
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
        status: "pending"
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

// --- MATCH STORAGE API ---
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

// --- CASE-INSENSITIVE, TRIMMED MATCHES API ---
app.get('/api/upcoming-matches', async (req, res) => {
  const { player } = req.query;
  if (!player) return res.status(400).json({ error: 'Missing player' });

  const trimmedPlayer = player.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const playerRegex = new RegExp(`^${trimmedPlayer}$`, 'i');
  const now = new Date();
  console.log("NOW:", now);

  try {
    const proposals = await Proposal.find({
      status: "confirmed",
      $or: [
        { senderName: playerRegex },
        { receiverName: playerRegex }
      ]
    }).lean();

    // Debug: print all proposals found
    console.log("Found proposals:", proposals.map(p => ({date: p.date, time: p.time})));

    // Filter for only future matches
    const upcoming = proposals.filter(p => {
      if (!p.date || !p.time) return false;

      let [year, month, day] = p.date.split("-");
      if (!year || !month || !day) {
        console.log("Bad date format:", p.date);
        return false;
      }
      const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      let timeStr = p.time.trim().toUpperCase();
      let [timePart, ampm] = timeStr.split(' ');
      if (!timePart || !ampm) {
        console.log("Bad time format:", p.time);
        return false;
      }
      let [hour, minute] = timePart.split(':').map(Number);
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = (minute || 0).toString().padStart(2, '0');
      const time24 = `${hourStr}:${minuteStr}`;

      const matchDate = new Date(`${isoDate}T${time24}:00`);
      console.log(`Checking match: ${p.date} ${p.time} => ${matchDate} (now: ${now})`);
      return matchDate > now;
    });

    console.log("Upcoming matches:", upcoming.map(p => ({date: p.date, time: p.time})));

    // Sort by soonest
    upcoming.sort((a, b) => {
      function parseDateTime(p) {
        let [year, month, day] = p.date.split("-");
        if (!year || !month || !day) return new Date(0);
        const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        let timeStr = p.time.trim().toUpperCase();
        let [timePart, ampm] = timeStr.split(' ');
        if (!timePart || !ampm) return new Date(0);
        let [hour, minute] = timePart.split(':').map(Number);
        if (ampm === "PM" && hour < 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;
        const hourStr = hour.toString().padStart(2, '0');
        const minuteStr = (minute || 0).toString().padStart(2, '0');
        const time24 = `${hourStr}:${minuteStr}`;
        return new Date(`${isoDate}T${time24}:00`);
      }
      return parseDateTime(a) - parseDateTime(b);
    });

    res.json(upcoming);
  } catch (err) {
    console.error('Error fetching upcoming matches:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming matches' });
  }
});



// --- PROPOSALS API ---
// Create a match proposal
app.post('/api/proposals', async (req, res) => {
  console.log("Received /api/proposals POST:", req.body);
  try {
    const {
      sender, receiver, senderName, receiverName,
      date, time, location, message, gameType, raceLength
    } = req.body;

    if (!sender || !receiver || !senderName || !receiverName || !date || !location) {
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
      status: "pending"
    });

    await proposal.save();
    res.status(201).json({ success: true, proposalId: proposal._id });
  } catch (err) {
    console.error("Error saving proposal:", err);
    res.status(500).json({ error: "Failed to create proposal" });
  }
});

// Fetch all pending/countered proposals for a player (by receiver email)
app.get("/api/proposals", async (req, res) => {
  try {
    const { receiver } = req.query;
    if (!receiver) return res.status(400).json({ error: "Missing receiver" });
    const proposals = await Proposal.find({
      receiver,
      status: { $in: ["pending", "countered"] }
    }).sort({ createdAt: -1 }).lean();
    res.json(proposals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch proposals" });
  }
});

// Fetch all pending/countered proposals for a player (by receiver name)
app.get("/api/proposals/by-name", async (req, res) => {
  try {
    const { receiverName } = req.query;
    if (!receiverName) return res.status(400).json({ error: "Missing receiverName" });
    const proposals = await Proposal.find({
      receiverName,
      status: { $in: ["pending", "countered"] }
    }).sort({ createdAt: -1 }).lean();
    res.json(proposals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch proposals" });
  }
});

// --- NEW: Fetch all pending/countered proposals SENT by a player (by sender name)
app.get("/api/proposals/by-sender", async (req, res) => {
  try {
    const { senderName } = req.query;
    if (!senderName) return res.status(400).json({ error: "Missing senderName" });
    const proposals = await Proposal.find({
      senderName,
      status: { $in: ["pending", "countered"] }
    }).sort({ createdAt: -1 }).lean();
    res.json(proposals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sent proposals" });
  }
});

// PATCH proposal status (CONFIRM CREATES MATCH)
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

    // CREATE MATCH WHEN CONFIRMED (optional, doesn't affect new endpoint)
    if (status === "confirmed") {
      const existing = await Match.findOne({
        player: proposal.senderName,
        opponent: proposal.receiverName,
        date: proposal.date,
        time: proposal.time,
        location: proposal.location
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
        });
      }
    }

    res.json({ success: true, proposal });
  } catch (err) {
    console.error("Error updating proposal status:", err);
    res.status(500).json({ error: "Failed to update proposal status" });
  }
});

// PATCH counter-propose (NO MATCH CREATED HERE)
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Stream token server running on port ${PORT}`);
});
