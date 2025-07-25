import dotenv from 'dotenv';
import { StreamChat } from 'stream-chat';

dotenv.config();

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;
const serverClient = StreamChat.getInstance(apiKey, apiSecret);

async function deleteExpiredMatchChannels() {
  const now = new Date();

  // Query all messaging channels with a matchDate field
  const channels = await serverClient.queryChannels(
    { type: 'messaging', matchDate: { $exists: true } },
    {},
    { limit: 100 }
  );

  for (const channel of channels) {
    const matchDateStr = channel.data.matchDate;
    if (!matchDateStr) continue;
    const matchDate = new Date(matchDateStr);
    if (matchDate < now) {
      console.log(`Deleting expired channel: ${channel.id} (match date: ${matchDateStr})`);
      await serverClient.channel('messaging', channel.id).delete();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deleteExpiredMatchChannels()
    .then(() => {
      console.log("Expired channels cleanup complete.");
      process.exit(0);
    })
    .catch(err => {
      console.error("Cleanup error:", err);
      process.exit(1);
    });
}

export { deleteExpiredMatchChannels };
//comment to force a push