import dotenv from 'dotenv';
import { StreamChat } from 'stream-chat';

dotenv.config();

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "admin";
const serverClient = StreamChat.getInstance(apiKey, apiSecret);

async function addAdminToAllChannels() {
  try {
    await serverClient.upsertUser({ id: ADMIN_USER_ID, name: "Admin" });

    let offset = 0;
    let batch;
    do {
      batch = await serverClient.queryChannels({}, { last_message_at: -1 }, { limit: 100, offset });
      for (const channel of batch) {
        const members = channel.state.members;
        if (!members[ADMIN_USER_ID]) {
          console.log(`Adding admin to channel: ${channel.id}`);
          await channel.addMembers([ADMIN_USER_ID]);
        } else {
          console.log(`Admin already a member of channel: ${channel.id}`);
        }
      }
      offset += batch.length;
    } while (batch.length === 100);

    console.log("Done!");
    process.exit(0);
  } catch (err) {
    console.error("Error adding admin to channels:", err);
    process.exit(1);
  }
}

addAdminToAllChannels();
