import mongoose from 'mongoose';
import Season from '../src/models/Season.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/front-range-pool-hub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createGuestSeasonDB() {
  try {
    console.log('🎯 Creating guest season in database...');
    
    // Check if guest season already exists
    const existingSeason = await Season.findOne({ division: 'Guest Division' });
    
    if (existingSeason) {
      console.log('⚠️  Season for Guest Division already exists, updating...');
      
      // Update existing season
      existingSeason.name = "Guest Season 2024";
      existingSeason.description = "Guest season for app preview";
      existingSeason.rules = "Standard 8-ball rules";
      existingSeason.scheduleUrl = "/static/schedule_Guest_Division.json";
      existingSeason.standingsUrl = "/static/standings_Guest_Division.json";
      existingSeason.seasonStart = new Date("2024-12-01");
      existingSeason.seasonEnd = new Date("2025-03-31");
      existingSeason.phase1Start = new Date("2024-12-01");
      existingSeason.phase1End = new Date("2024-12-31");
      existingSeason.phase2Start = new Date("2025-01-01");
      existingSeason.phase2End = new Date("2025-02-28");
      existingSeason.totalWeeks = 10;
      existingSeason.phase1Weeks = 6;
      existingSeason.phase2Weeks = 4;
      existingSeason.isActive = true;
      existingSeason.isCurrent = true;
      
      await existingSeason.save();
      console.log('✅ Guest season updated successfully!');
      
    } else {
      // Create new guest season
      const guestSeason = new Season({
        name: "Guest Season 2024",
        division: "Guest Division",
        description: "Guest season for app preview",
        rules: "Standard 8-ball rules",
        scheduleUrl: "/static/schedule_Guest_Division.json",
        standingsUrl: "/static/standings_Guest_Division.json",
        seasonStart: new Date("2024-12-01"),
        seasonEnd: new Date("2025-03-31"),
        phase1Start: new Date("2024-12-01"),
        phase1End: new Date("2024-12-31"),
        phase2Start: new Date("2025-01-01"),
        phase2End: new Date("2025-02-28"),
        totalWeeks: 10,
        phase1Weeks: 6,
        phase2Weeks: 4,
        isActive: true,
        isCurrent: true
      });
      
      await guestSeason.save();
      console.log('✅ Guest season created successfully!');
    }
    
    console.log('🎯 Guest season database setup complete!');
    console.log('🏆 Division: Guest Division');
    console.log('📅 Phase 1: Dec 1 - Dec 31, 2024');
    console.log('📅 Phase 2: Jan 1 - Feb 28, 2025');
    console.log('📅 Season End: March 31, 2025');
    
  } catch (error) {
    console.error('❌ Error creating guest season:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
createGuestSeasonDB();
