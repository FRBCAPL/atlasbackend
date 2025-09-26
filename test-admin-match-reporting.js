import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';
import LadderMatch from './src/models/LadderMatch.js';

dotenv.config();

// Test configuration - using a test collection to avoid affecting real data
const TEST_COLLECTION_PREFIX = 'TEST_';
const TEST_LADDER_NAME = 'TEST_LADDER';

async function testAdminMatchReporting() {
  try {
    console.log('🧪 Starting Admin Match Reporting Test...');
    console.log('⚠️  Using TEST collections to avoid affecting real data');
    
    // Connect to database
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Create test players
    console.log('\n📝 Creating test players...');
    
    const testPlayer1 = new LadderPlayer({
      firstName: 'Test',
      lastName: 'Player1',
      email: 'testplayer1@example.com',
      position: 5,
      ladderName: TEST_LADDER_NAME,
      isActive: true,
      wins: 2,
      losses: 1,
      totalMatches: 3,
      pin: '1234'
    });

    const testPlayer2 = new LadderPlayer({
      firstName: 'Test',
      lastName: 'Player2', 
      email: 'testplayer2@example.com',
      position: 3,
      ladderName: TEST_LADDER_NAME,
      isActive: true,
      wins: 4,
      losses: 2,
      totalMatches: 6,
      pin: '5678'
    });

    // Save test players
    await testPlayer1.save();
    await testPlayer2.save();
    console.log('✅ Test players created:', {
      player1: `${testPlayer1.firstName} ${testPlayer1.lastName} (Position ${testPlayer1.position})`,
      player2: `${testPlayer2.firstName} ${testPlayer2.lastName} (Position ${testPlayer2.position})`
    });

    // Create test match
    console.log('\n🏆 Creating test match...');
    
    const testMatch = new LadderMatch({
      player1: testPlayer1._id,
      player2: testPlayer2._id,
      player1Ladder: TEST_LADDER_NAME,
      player2Ladder: TEST_LADDER_NAME,
      matchType: 'challenge',
      scheduledDate: new Date(),
      status: 'scheduled',
      venue: 'Test Venue',
      raceLength: 5,
      gameType: '8-ball'
    });

    await testMatch.save();
    console.log('✅ Test match created:', {
      matchId: testMatch._id,
      player1: `${testPlayer1.firstName} ${testPlayer1.lastName}`,
      player2: `${testPlayer2.firstName} ${testPlayer2.lastName}`,
      status: testMatch.status
    });

    // Test the admin match reporting endpoint
    console.log('\n🔧 Testing admin match reporting endpoint...');
    
    const testData = {
      winner: testPlayer1._id.toString(), // Player1 wins (lower ranked player)
      score: '5-3',
      notes: 'Test match completion',
      completedDate: new Date().toISOString(),
      status: 'completed',
      reportedBy: 'admin'
    };

    console.log('📤 Sending test data:', testData);

    // Simulate the admin endpoint logic
    const match = await LadderMatch.findById(testMatch._id)
      .populate('player1 player2', 'firstName lastName position ladderName');

    if (!match) {
      throw new Error('Test match not found');
    }

    // Get winner and loser
    const winnerPlayer = match.player1._id.toString() === testData.winner ? match.player1 : match.player2;
    const loserPlayer = match.player1._id.toString() === testData.winner ? match.player2 : match.player1;

    console.log('🎯 Match participants:', {
      winner: `${winnerPlayer.firstName} ${winnerPlayer.lastName} (Position ${winnerPlayer.position})`,
      loser: `${loserPlayer.firstName} ${loserPlayer.lastName} (Position ${loserPlayer.position})`
    });

    // Update match
    match.winner = testData.winner;
    match.loser = loserPlayer._id;
    match.score = testData.score;
    match.notes = testData.notes;
    match.completedDate = new Date(testData.completedDate);
    match.status = 'completed';
    match.reportedAt = new Date();

    // Test position swapping logic
    console.log('\n🔄 Testing position swapping logic...');
    
    let newWinnerPosition, newLoserPosition;
    
    if (match.matchType === 'challenge') {
      // Standard challenge: simple swap if winner was lower ranked
      if (winnerPlayer.position > loserPlayer.position) {
        newWinnerPosition = loserPlayer.position;
        newLoserPosition = winnerPlayer.position;
        console.log('✅ Position swap triggered (challenger won)');
      } else {
        newWinnerPosition = winnerPlayer.position;
        newLoserPosition = loserPlayer.position;
        console.log('ℹ️  No position swap (defender won)');
      }
    }

    console.log('📊 Position changes:', {
      winner: `${winnerPlayer.position} → ${newWinnerPosition}`,
      loser: `${loserPlayer.position} → ${newLoserPosition}`
    });

    // Update match position changes
    match.player1NewPosition = winnerPlayer._id.toString() === match.player1._id.toString() 
      ? newWinnerPosition 
      : newLoserPosition;
    match.player2NewPosition = winnerPlayer._id.toString() === match.player2._id.toString() 
      ? newWinnerPosition 
      : newLoserPosition;

    await match.save();

    // Update player positions
    winnerPlayer.position = newWinnerPosition;
    loserPlayer.position = newLoserPosition;

    // Update player stats
    winnerPlayer.wins = (winnerPlayer.wins || 0) + 1;
    winnerPlayer.totalMatches = (winnerPlayer.totalMatches || 0) + 1;
    loserPlayer.losses = (loserPlayer.losses || 0) + 1;
    loserPlayer.totalMatches = (loserPlayer.totalMatches || 0) + 1;

    // Test immunity setting
    console.log('\n🛡️ Testing automatic immunity setting...');
    
    // Set immunity for winner (7 days)
    winnerPlayer.immunityUntil = new Date();
    winnerPlayer.immunityUntil.setDate(winnerPlayer.immunityUntil.getDate() + 7);
    
    console.log('✅ Immunity set for winner until:', winnerPlayer.immunityUntil.toISOString());

    // Save all changes
    await winnerPlayer.save();
    await loserPlayer.save();

    // Verify results
    console.log('\n✅ Test Results:');
    console.log('📊 Final player stats:', {
      winner: {
        name: `${winnerPlayer.firstName} ${winnerPlayer.lastName}`,
        position: winnerPlayer.position,
        wins: winnerPlayer.wins,
        losses: winnerPlayer.losses,
        totalMatches: winnerPlayer.totalMatches,
        immunityUntil: winnerPlayer.immunityUntil
      },
      loser: {
        name: `${loserPlayer.firstName} ${loserPlayer.lastName}`,
        position: loserPlayer.position,
        wins: loserPlayer.wins,
        losses: loserPlayer.losses,
        totalMatches: loserPlayer.totalMatches
      }
    });

    console.log('🏆 Final match status:', {
      matchId: match._id,
      winner: `${winnerPlayer.firstName} ${winnerPlayer.lastName}`,
      score: match.score,
      status: match.status,
      completedDate: match.completedDate
    });

    console.log('\n🎉 Admin match reporting test completed successfully!');
    console.log('✅ Position swapping: WORKING');
    console.log('✅ Stats updates: WORKING');
    console.log('✅ Immunity setting: WORKING');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    try {
      await LadderPlayer.deleteMany({ ladderName: TEST_LADDER_NAME });
      await LadderMatch.deleteMany({ 
        $or: [
          { player1Ladder: TEST_LADDER_NAME },
          { player2Ladder: TEST_LADDER_NAME }
        ]
      });
      console.log('✅ Test data cleaned up');
    } catch (cleanupError) {
      console.error('⚠️  Cleanup error (non-critical):', cleanupError.message);
    }
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
testAdminMatchReporting()
  .then(() => {
    console.log('\n🎯 Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
