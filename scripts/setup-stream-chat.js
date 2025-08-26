import dotenv from 'dotenv';
import { StreamChat } from 'stream-chat';

dotenv.config();

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error('❌ Stream Chat API keys are missing! Please set STREAM_API_KEY and STREAM_API_SECRET environment variables.');
  process.exit(1);
}

const serverClient = StreamChat.getInstance(apiKey, apiSecret);

// League operator configuration
const LEAGUE_OPERATORS = [
  {
    email: 'frbcapl@gmail.com',
    name: 'Mark Slam',
    role: 'admin'
  },
  {
    email: 'sslampro@gmail.com', 
    name: 'Mark Lanoue',
    role: 'admin'
  },
  // Add more league operators here as needed
  // {
  //   email: 'operator@example.com',
  //   name: 'League Operator Name',
  //   role: 'admin'
  // }
];

// Available divisions - can be expanded per league
const AVAILABLE_DIVISIONS = [
  "FRBCAPL TEST",
  "Singles Test"
];

// Channel configuration
const CHANNELS = [
  {
    id: 'general',
    name: 'General Chat',
    description: 'General discussion for all players',
    type: 'messaging'
  },
  {
    id: 'announcements', 
    name: '📢 Announcements',
    description: 'Important announcements and updates',
    type: 'messaging'
  },
  // Division channels will be created dynamically
  // Game room channels will be created dynamically
];

function cleanId(id) {
  return id.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

async function createChannels() {
  console.log('🔧 Creating Stream Chat channels...');
  
  // Create base channels
  for (const channelConfig of CHANNELS) {
    try {
      const channel = serverClient.channel(channelConfig.type, channelConfig.id, {
        name: channelConfig.name,
        description: channelConfig.description
      });
      await channel.create();
      console.log(`✅ Created channel: ${channelConfig.name} (${channelConfig.id})`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`ℹ️  Channel already exists: ${channelConfig.name} (${channelConfig.id})`);
      } else {
        console.error(`❌ Error creating channel ${channelConfig.name}:`, error.message);
      }
    }
  }
  
  // Create division channels
  for (const division of AVAILABLE_DIVISIONS) {
    const divisionId = `division-${cleanId(division)}`;
    try {
      const divisionChannel = serverClient.channel('messaging', divisionId, {
        name: `🏆 ${division}`,
        description: `Discussion for ${division} players`,
        category: 'divisions'
      });
      await divisionChannel.create();
      console.log(`✅ Created division channel: ${division} (${divisionId})`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`ℹ️  Division channel already exists: ${division} (${divisionId})`);
      } else {
        console.error(`❌ Error creating division channel ${division}:`, error.message);
      }
    }
  }
  
  // Create game room channels
  for (let i = 1; i <= 5; i++) {
    const gameRoomId = `game-room-${i}`;
    try {
      const gameRoomChannel = serverClient.channel('messaging', gameRoomId, {
        name: `🎮 Game Room ${i}`,
        description: `Multiplayer game room ${i} - for future online play`,
        category: 'game-rooms'
      });
      await gameRoomChannel.create();
      console.log(`✅ Created game room: Game Room ${i} (${gameRoomId})`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`ℹ️  Game room already exists: Game Room ${i} (${gameRoomId})`);
      } else {
        console.error(`❌ Error creating game room ${i}:`, error.message);
      }
    }
  }
}

async function setupLeagueOperators() {
  console.log('👥 Setting up league operators...');
  
  for (const operator of LEAGUE_OPERATORS) {
    const userId = cleanId(operator.email);
    try {
      // Create or update user
      await serverClient.upsertUser({
        id: userId,
        name: operator.name,
        email: operator.email,
        role: operator.role
      });
      console.log(`✅ Created/updated operator: ${operator.name} (${operator.email})`);
      
      // Add operator to all channels
      await addUserToAllChannels(userId);
      
    } catch (error) {
      console.error(`❌ Error setting up operator ${operator.name}:`, error.message);
    }
  }
}

async function addUserToAllChannels(userId) {
  console.log(`🔗 Adding user ${userId} to all channels...`);
  
  // Get all channels
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    try {
      const channels = await serverClient.queryChannels({}, { last_message_at: -1 }, { limit: 100, offset });
      
      for (const channel of channels) {
        try {
          const members = channel.state.members;
          if (!members[userId]) {
            await channel.addMembers([userId]);
            console.log(`✅ Added ${userId} to channel: ${channel.id}`);
          } else {
            console.log(`ℹ️  ${userId} already member of channel: ${channel.id}`);
          }
        } catch (error) {
          console.error(`❌ Error adding ${userId} to channel ${channel.id}:`, error.message);
        }
      }
      
      if (channels.length < 100) {
        hasMore = false;
      } else {
        offset += channels.length;
      }
    } catch (error) {
      console.error('❌ Error querying channels:', error.message);
      hasMore = false;
    }
  }
}

async function createAdminUser() {
  console.log('👑 Creating admin user...');
  
  const adminUserId = 'system_admin';
  try {
    await serverClient.upsertUser({
      id: adminUserId,
      name: 'System Admin',
      role: 'admin'
    });
    console.log(`✅ Created admin user: ${adminUserId}`);
    
    // Add admin to all channels
    await addUserToAllChannels(adminUserId);
    
  } catch (error) {
    console.error(`❌ Error creating admin user:`, error.message);
  }
}

async function setupStreamChat() {
  console.log('🚀 Setting up Stream Chat for multiple league operators...');
  console.log('📋 Configuration:');
  console.log(`   - API Key: ${apiKey ? '✅ Available' : '❌ Missing'}`);
  console.log(`   - API Secret: ${apiSecret ? '✅ Available' : '❌ Missing'}`);
  console.log(`   - League Operators: ${LEAGUE_OPERATORS.length}`);
  console.log(`   - Divisions: ${AVAILABLE_DIVISIONS.length}`);
  console.log('');
  
  try {
    // Step 1: Create all channels
    await createChannels();
    console.log('');
    
    // Step 2: Create admin user
    await createAdminUser();
    console.log('');
    
    // Step 3: Setup league operators
    await setupLeagueOperators();
    console.log('');
    
    console.log('🎉 Stream Chat setup completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. League operators can now access chat with their email addresses');
    console.log('   2. Each operator will be automatically added to all channels');
    console.log('   3. To add new operators, update the LEAGUE_OPERATORS array in this script');
    console.log('   4. To add new divisions, update the AVAILABLE_DIVISIONS array');
    console.log('');
    console.log('🔧 To add a new league operator:');
    console.log('   1. Add their details to the LEAGUE_OPERATORS array');
    console.log('   2. Run this script again: node scripts/setup-stream-chat.js');
    console.log('   3. The new operator will be automatically set up');
    
  } catch (error) {
    console.error('❌ Error during Stream Chat setup:', error);
    process.exit(1);
  }
}

// Run the setup
setupStreamChat().then(() => {
  console.log('✅ Setup script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Setup script failed:', error);
  process.exit(1);
});
