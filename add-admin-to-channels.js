require('dotenv').config();
const { StreamChat } = require('stream-chat');

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;
const serverClient = StreamChat.getInstance(apiKey, apiSecret);

const ADMIN_USER_ID = "admin";

async function addAdminToAllChannels() {
  try {
    // Ensure admin user exists
    await serverClient.upsertUser({ id: ADMIN_USER_ID, name: "Admin" });

    // Query all channels (up to 100 at a time)
    const channels = await serverClient.queryChannels({}, { last_message_at: -1 }, { limit: 100 });

    for (const channel of channels) {
      const members = channel.state.members;
      if (!members[ADMIN_USER_ID]) {
        console.log(`Adding admin to channel: ${channel.id}`);
        await channel.addMembers([ADMIN_USER_ID]);
      } else {
        console.log(`Admin already a member of channel: ${channel.id}`);
      }
    }
    console.log("Done!");
    process.exit(0);
  } catch (err) {
    console.error("Error adding admin to channels:", err);
    process.exit(1);
  }
}

addAdminToAllChannels();
