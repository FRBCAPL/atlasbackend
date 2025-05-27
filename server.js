require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { StreamChat } = require('stream-chat');

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

const serverClient = StreamChat.getInstance(apiKey, apiSecret);

// Utility: Remove invalid chars for Stream channel IDs
function cleanId(id) {
  return id.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

// List of admin emails (add as many as you want)
const ADMIN_EMAILS = [
  "frbcaplgmailcom",
  "anotheradmin@example.com"
].map(email => cleanId(email));

// Helper to check if user is admin
function isAdminUser(userId) {
  return ADMIN_EMAILS.includes(cleanId(userId));
}

// Utility: Consistent channel ID for two users (alphabetical order)
function getMatchChannelId(userId1, userId2) {
  return `match-${[cleanId(userId1), cleanId(userId2)].sort().join('-')}`;
}

/**
 * Generate a Stream Chat token for a given userId
 */
app.post('/token', async (req, res) => {
  let { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
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

/**
 * Create or update a Stream Chat user and ensure they're in the general channel.
 */
app.post('/create-user', async (req, res) => {
  let { userId, name, email } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  userId = cleanId(userId);
  try {
    const user = { id: userId, name: name || userId };
    if (email) user.email = email;
    if (isAdminUser(userId)) user.role = "admin";

    await serverClient.upsertUser(user);

    // Add the user as a member to the existing "general" channel
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

/**
 * Propose a match and create/get a 1:1 match chat channel.
 */
/**
 * Propose a match and create/get a 1:1 match chat channel.
 */
/**
 * Propose a match and create/get a 1:1 match chat channel.
 */
app.post('/propose-match', async (req, res) => {
  const { userId1, userId2, userName1, userName2, matchDate } = req.body;
  console.log('Received /propose-match:', { userId1, userId2, userName1, userName2, matchDate });

  if (!userId1 || !userId2) {
    return res.status(400).json({ error: 'Missing user IDs' });
  }

  const cleanedUserId1 = cleanId(userId1);
  const cleanedUserId2 = cleanId(userId2);
  const channelId = getMatchChannelId(userId1, userId2);

  // --- MAKE SURE USERS EXIST ---
  try {
    console.log('Upserting users...');
    await serverClient.upsertUser({ id: cleanedUserId1, name: userName1 || userId1 });
    await serverClient.upsertUser({ id: cleanedUserId2, name: userName2 || userId2 });

    // Upsert all admins as admin role
    for (const adminId of ADMIN_EMAILS) {
      await serverClient.upsertUser({ id: adminId, name: "Admin", role: "admin" });
    }
  } catch (err) {
    console.error('Error upserting users:', err);
    return res.status(500).json({ error: 'Failed to upsert users for chat channel' });
  }

  // Use player names for the channel name
  const channelName = `${userName1 || userId1} & ${userName2 || userId2}`;

  // --- DE-DUPLICATE MEMBERS ---
  const allMembers = Array.from(
    new Set([cleanedUserId1, cleanedUserId2, ...ADMIN_EMAILS])
  );

  // --- CREATE CHANNEL DATA ---
  const channelData = {
    name: channelName,
    members: allMembers,
    created_by_id: ADMIN_EMAILS[0], // first admin as creator
    ...(matchDate && { matchDate }),
  };

  const channel = serverClient.channel('messaging', channelId, channelData);

  try {
    console.log('Attempting channel creation...');
    await channel.create();
    console.log('Channel created successfully:', channelId);
  } catch (err) {
    if (err.code === 16 && err.message && err.message.includes('already exists')) {
      console.log(`Channel already exists: ${channelId}`);
      if (matchDate) {
        try {
          await channel.update({ matchDate });
          console.log(`Updated matchDate for existing channel: ${matchDate}`);
        } catch (updateErr) {
          console.error('Error updating matchDate:', updateErr);
        }
      }
    } else if (err.code === 4 && err.message && err.message.includes('Duplicate members')) {
      // This should not happen now, but log and return a specific error if it does
      console.error('Duplicate members error:', err.message);
      return res.status(400).json({ error: 'Duplicate members in channel creation. Please contact support.' });
    } else {
      console.error('Error creating match channel:', err);
      return res.status(500).json({
        error: 'Failed to create match chat channel',
        details: err.message,
      });
    }
  }

  try {
    console.log('Adding members to channel...');
    await channel.addMembers(allMembers);
    console.log(`Added members to channel: ${channelId}`);
  } catch (err) {
    if (err.code !== 16) { // Ignore "already member" errors
      console.error('Error adding members to match channel:', err);
      return res.status(500).json({
        error: 'Failed to add members to match chat channel',
        details: err.message,
      });
    }
  }

  res.json({ success: true, channelId });
});



/**
 * Promote a user to admin role.
 */
app.post('/make-admin', async (req, res) => {
  let { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
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
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Stream token server running on port ${PORT}`);
});
