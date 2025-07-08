import mongoose from 'mongoose';
import Season from '../src/models/Season.js';
import challengeValidationService from '../src/services/challengeValidationService.js';
import dotenv from 'dotenv';

dotenv.config();

async function testPhaseWeek() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const challengeService = challengeValidationService;
    
    // Test divisions
    const divisions = ['FRBCAPL TEST', 'Singles Test'];
    
    console.log('Testing Phase and Week System:\n');
    
    for (const division of divisions) {
      console.log(`=== ${division} ===`);
      
      // Test Season model directly
      const season = await Season.getCurrentSeason(division);
      if (season) {
        console.log(`Season: ${season.name}`);
        console.log(`Current Week: ${season.getCurrentWeek()}`);
        console.log(`Current Phase: ${season.getCurrentPhase()}`);
        console.log(`Season Active: ${season.isSeasonActive()}`);
        console.log(`Phase 1: ${season.phase1Start.toDateString()} - ${season.phase1End.toDateString()}`);
        console.log(`Phase 2: ${season.phase2Start.toDateString()} - ${season.phase2End.toDateString()}`);
      } else {
        console.log('No current season found');
      }
      
      console.log('');
      
      // Test ChallengeValidationService
      const result = await challengeService.getCurrentPhaseAndWeek(division);
      console.log('ChallengeValidationService Result:');
      console.log(`  Week: ${result.currentWeek}`);
      console.log(`  Phase: ${result.phase}`);
      console.log(`  Active: ${result.isActive}`);
      if (result.season) {
        console.log(`  Season: ${result.season.name}`);
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
    // Test future dates
    console.log('Testing Future Scenarios:\n');
    
    // Test what happens when we're in challenge phase
    const futureDate = new Date('2025-07-20'); // Week 8, challenge phase
    console.log(`Simulating date: ${futureDate.toDateString()}`);
    
    // Temporarily override Date.now for testing
    const originalNow = Date.now;
    Date.now = () => futureDate.getTime();
    
    for (const division of divisions) {
      const result = await challengeService.getCurrentPhaseAndWeek(division);
      console.log(`${division}: Week ${result.currentWeek}, Phase: ${result.phase}`);
    }
    
    // Restore original Date.now
    Date.now = originalNow;
    
    console.log('\nPhase and Week System Test Completed!');
    
  } catch (error) {
    console.error('Error testing phase and week system:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testPhaseWeek(); 