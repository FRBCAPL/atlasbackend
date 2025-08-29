import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/front-range-pool-hub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createGuestSeason() {
  try {
    console.log('🎯 Creating guest season data...');
    
    // Create the public directory if it doesn't exist
    const publicDir = path.join(__dirname, '..', 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Create guest season data
    const guestSeason = {
      id: "guest-season-2024",
      name: "Guest Season 2024",
      division: "Guest Division",
      startDate: "2024-12-01",
      endDate: "2025-03-31",
      phase1EndDate: "2024-12-31",
      phase2EndDate: "2025-02-28",
      phase3EndDate: "2025-03-31",
      currentPhase: 1,
      isActive: true,
      totalMatches: 6,
      completedMatches: 2,
      pendingMatches: 4
    };
    
    // Create guest standings data
    const guestStandings = [
      {
        rank: 1,
        playerName: "John Smith",
        wins: 8,
        losses: 2,
        points: 24,
        division: "Guest Division",
        isActive: true
      },
      {
        rank: 2,
        playerName: "Mike Johnson",
        wins: 7,
        losses: 3,
        points: 21,
        division: "Guest Division",
        isActive: true
      },
      {
        rank: 3,
        playerName: "Sarah Wilson",
        wins: 6,
        losses: 4,
        points: 18,
        division: "Guest Division",
        isActive: true
      },
      {
        rank: 4,
        playerName: "David Brown",
        wins: 5,
        losses: 5,
        points: 15,
        division: "Guest Division",
        isActive: true
      },
      {
        rank: 5,
        playerName: "Guest User",
        wins: 4,
        losses: 6,
        points: 12,
        division: "Guest Division",
        isActive: true
      }
    ];
    
    // Create guest schedule data
    const guestSchedule = [
      {
        id: "match-1",
        player1: "Guest User",
        player2: "John Smith",
        date: "2024-12-15",
        time: "19:00",
        location: "Pool Hall A",
        status: "confirmed",
        phase: 1,
        division: "Guest Division"
      },
      {
        id: "match-2",
        player1: "Guest User",
        player2: "Mike Johnson",
        date: "2024-12-18",
        time: "20:00",
        location: "Pool Hall B",
        status: "pending",
        phase: 1,
        division: "Guest Division"
      },
      {
        id: "match-3",
        player1: "Guest User",
        player2: "Sarah Wilson",
        date: "2024-12-22",
        time: "19:30",
        location: "Pool Hall C",
        status: "scheduled",
        phase: 1,
        division: "Guest Division"
      },
      {
        id: "match-4",
        player1: "Guest User",
        player2: "David Brown",
        date: "2024-12-25",
        time: "18:00",
        location: "Pool Hall A",
        status: "scheduled",
        phase: 1,
        division: "Guest Division"
      },
      {
        id: "match-5",
        player1: "John Smith",
        player2: "Mike Johnson",
        date: "2024-12-20",
        time: "19:00",
        location: "Pool Hall B",
        status: "confirmed",
        phase: 1,
        division: "Guest Division"
      },
      {
        id: "match-6",
        player1: "Sarah Wilson",
        player2: "David Brown",
        date: "2024-12-23",
        time: "20:00",
        location: "Pool Hall C",
        status: "completed",
        phase: 1,
        division: "Guest Division"
      }
    ];
    
    // Write season data
    const seasonPath = path.join(publicDir, 'season_Guest_Division.json');
    fs.writeFileSync(seasonPath, JSON.stringify(guestSeason, null, 2));
    console.log('✅ Created season_Guest_Division.json');
    
    // Write standings data
    const standingsPath = path.join(publicDir, 'standings_Guest_Division.json');
    fs.writeFileSync(standingsPath, JSON.stringify(guestStandings, null, 2));
    console.log('✅ Created standings_Guest_Division.json');
    
    // Write schedule data
    const schedulePath = path.join(publicDir, 'schedule_Guest_Division.json');
    fs.writeFileSync(schedulePath, JSON.stringify(guestSchedule, null, 2));
    console.log('✅ Created schedule_Guest_Division.json');
    
    console.log('🎯 Guest season data created successfully!');
    console.log('📁 Files created in:', publicDir);
    console.log('🏆 Division: Guest Division');
    console.log('👤 Guest User is included in standings and schedule');
    console.log('📅 Phase 1 deadline: December 31, 2024');
    
  } catch (error) {
    console.error('❌ Error creating guest season:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
createGuestSeason();
