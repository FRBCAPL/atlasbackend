import mongoose from 'mongoose';
import LadderMatch from './src/models/LadderMatch.js';
import LadderPlayer from './src/models/LadderPlayer.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const removeGeorgeChristopherMatches = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Finding matches between George and Christopher...');
    
    // Find George and Christopher players
    const george = await LadderPlayer.findOne({
      $or: [
        { firstName: { $regex: /^george$/i }, lastName: { $regex: /gutierrez/i } },
        { firstName: { $regex: /^george$/i }, lastName: { $regex: /s\./i } }
      ]
    });
    
    const christopher = await LadderPlayer.findOne({
      firstName: { $regex: /^christopher$/i },
      lastName: { $regex: /^anderson$/i }
    });
    
    if (!george) {
      console.log('❌ George Gutierrez not found');
      return;
    }
    
    if (!christopher) {
      console.log('❌ Christopher Anderson not found');
      return;
    }
    
    console.log(`✅ Found George: ${george.firstName} ${george.lastName} (ID: ${george._id})`);
    console.log(`✅ Found Christopher: ${christopher.firstName} ${christopher.lastName} (ID: ${christopher._id})`);
    
    // Find all matches between George and Christopher
    const matches = await LadderMatch.find({
      $or: [
        { player1: george._id, player2: christopher._id },
        { player1: christopher._id, player2: george._id }
      ]
    }).sort({ completedDate: -1 });
    
    console.log(`\n📊 Found ${matches.length} matches between George and Christopher:`);
    
    matches.forEach((match, index) => {
      const matchDate = match.completedDate ? new Date(match.completedDate).toLocaleDateString() : 'No date';
      const dayOfWeek = match.completedDate ? new Date(match.completedDate).toLocaleDateString('en-US', { weekday: 'long' }) : 'Unknown';
      const winner = match.winner ? (match.winner.toString() === george._id.toString() ? 'George' : 'Christopher') : 'No winner';
      
      console.log(`\n${index + 1}. Match ID: ${match._id}`);
      console.log(`   Date: ${matchDate} (${dayOfWeek})`);
      console.log(`   Winner: ${winner}`);
      console.log(`   Status: ${match.status}`);
      console.log(`   Score: ${match.score || 'N/A'}`);
    });
    
    // Find the specific matches to remove
    const tuesdayMatch = matches.find(match => {
      if (!match.completedDate) return false;
      const date = new Date(match.completedDate);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dayOfMonth = date.getDate();
      return dayOfWeek === 'Tuesday' && dayOfMonth === 23;
    });
    
    const sundayMatch = matches.find(match => {
      if (!match.completedDate) return false;
      const date = new Date(match.completedDate);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      return dayOfWeek === 'Sunday';
    });
    
    console.log('\n🎯 Matches to remove:');
    
    if (tuesdayMatch) {
      console.log(`✅ Tuesday 23rd match found: ${tuesdayMatch._id}`);
    } else {
      console.log('❌ Tuesday 23rd match not found');
    }
    
    if (sundayMatch) {
      console.log(`✅ Sunday match found: ${sundayMatch._id}`);
    } else {
      console.log('❌ Sunday match not found');
    }
    
    // Remove the matches
    const matchesToRemove = [tuesdayMatch, sundayMatch].filter(Boolean);
    
    if (matchesToRemove.length === 0) {
      console.log('\n❌ No matches found to remove');
      await mongoose.disconnect();
      return;
    }
    
    console.log(`\n🗑️  Removing ${matchesToRemove.length} matches...`);
    
    for (const match of matchesToRemove) {
      try {
        // If the match is completed, we need to reverse the stats
        if (match.status === 'completed' && match.winner && match.loser) {
          const winnerPlayer = await LadderPlayer.findById(match.winner);
          const loserPlayer = await LadderPlayer.findById(match.loser);
          
          if (winnerPlayer && loserPlayer) {
            // Reverse the stats
            winnerPlayer.wins = Math.max((winnerPlayer.wins || 0) - 1, 0);
            winnerPlayer.totalMatches = Math.max((winnerPlayer.totalMatches || 0) - 1, 0);
            loserPlayer.losses = Math.max((loserPlayer.losses || 0) - 1, 0);
            loserPlayer.totalMatches = Math.max((loserPlayer.totalMatches || 0) - 1, 0);
            
            await winnerPlayer.save();
            await loserPlayer.save();
            
            console.log(`   📊 Reversed stats for ${winnerPlayer.firstName} ${winnerPlayer.lastName} and ${loserPlayer.firstName} ${loserPlayer.lastName}`);
          }
        }
        
        // Delete the match
        await LadderMatch.findByIdAndDelete(match._id);
        console.log(`   ✅ Deleted match: ${match._id}`);
        
      } catch (error) {
        console.error(`   ❌ Error removing match ${match._id}:`, error.message);
      }
    }
    
    console.log('\n🎉 Match removal complete!');
    
    // Show final stats
    console.log('\n📊 Final stats for George and Christopher:');
    const updatedGeorge = await LadderPlayer.findById(george._id);
    const updatedChristopher = await LadderPlayer.findById(christopher._id);
    
    console.log(`George: ${updatedGeorge.wins || 0}W-${updatedGeorge.losses || 0}L`);
    console.log(`Christopher: ${updatedChristopher.wins || 0}W-${updatedChristopher.losses || 0}L`);
    
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the script
removeGeorgeChristopherMatches();
