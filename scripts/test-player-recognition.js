import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PlayerRecognitionService from '../src/services/PlayerRecognitionService.js';

dotenv.config();

const testPlayerRecognition = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    console.log('\n🔍 Testing Player Recognition Service...\n');
    
    // Test 1: Check if we can get all players
    console.log('📊 Getting all players across both systems...');
    const allPlayers = await PlayerRecognitionService.getAllPlayers();
    
    console.log(`✅ Total League Players: ${allPlayers.totalLeaguePlayers}`);
    console.log(`✅ Total Ladder Players: ${allPlayers.totalLadderPlayers}`);
    console.log(`✅ Players in Both: ${allPlayers.totalBothPlayers}`);
    console.log(`✅ Total Unique Players: ${allPlayers.totalUniquePlayers}`);
    
    // Test 2: Test recognition with a known league player (Mark Slam)
    console.log('\n🔍 Testing recognition with Mark Slam (league player)...');
    const markRecognition = await PlayerRecognitionService.recognizePlayer('frbcapl@gmail.com');
    
    console.log('Mark Slam Recognition:');
    console.log(`  - Is League Player: ${markRecognition.isLeaguePlayer}`);
    console.log(`  - Is Ladder Player: ${markRecognition.isLadderPlayer}`);
    console.log(`  - Is Both: ${markRecognition.isBothPlayer}`);
    
    if (markRecognition.leagueInfo) {
      console.log(`  - League Name: ${markRecognition.leagueInfo.firstName} ${markRecognition.leagueInfo.lastName}`);
      console.log(`  - League Admin: ${markRecognition.leagueInfo.isAdmin}`);
    }
    
    if (markRecognition.ladderInfo) {
      console.log(`  - Ladder Position: ${markRecognition.ladderInfo.position}`);
      console.log(`  - Ladder Name: ${markRecognition.ladderInfo.ladderName}`);
    }
    
    // Test 3: Test login validation
    console.log('\n🔍 Testing login validation...');
    const loginValidation = await PlayerRecognitionService.validateLogin('frbcapl@gmail.com', '777777');
    
    console.log('Login Validation:');
    console.log(`  - Success: ${loginValidation.success}`);
    if (loginValidation.success) {
      console.log(`  - Player Type: ${loginValidation.playerType}`);
      console.log(`  - Name: ${loginValidation.unifiedInfo.firstName} ${loginValidation.unifiedInfo.lastName}`);
    } else {
      console.log(`  - Error: ${loginValidation.error}`);
    }
    
    // Test 4: Test with non-existent player
    console.log('\n🔍 Testing with non-existent player...');
    const nonExistentRecognition = await PlayerRecognitionService.recognizePlayer('nonexistent@example.com');
    
    console.log('Non-existent Player Recognition:');
    console.log(`  - Is League Player: ${nonExistentRecognition.isLeaguePlayer}`);
    console.log(`  - Is Ladder Player: ${nonExistentRecognition.isLadderPlayer}`);
    console.log(`  - Is Both: ${nonExistentRecognition.isBothPlayer}`);
    
    console.log('\n🎉 Player Recognition Service Test Complete!');
    
  } catch (error) {
    console.error('❌ Error testing player recognition:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

testPlayerRecognition();
