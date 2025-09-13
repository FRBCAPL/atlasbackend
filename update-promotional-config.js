import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PromotionalConfig from './src/models/PromotionalConfig.js';

dotenv.config();

async function updatePromotionalConfig() {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Get current config
    const config = await PromotionalConfig.getCurrentConfig();
    console.log('Current config:', {
      promotionalEndDate: config.promotionalEndDate,
      prizePoolStartDate: config.prizePoolStartDate,
      promotionalMessage: config.promotionalMessage
    });

    // Update the promotional end date to October 31st, 2025 (end of October)
    config.promotionalEndDate = new Date('2025-10-31T23:59:59.999Z');
    
    // Update the prize pool start date to November 1st, 2025
    config.prizePoolStartDate = new Date('2025-11-01T00:00:00.000Z');
    
    // Update the promotional message
    config.promotionalMessage = '🎉 FREE Monthly Membership until October 31st, 2025! 🎉';

    // Save the updated config
    await config.save();
    
    console.log('✅ Promotional config updated successfully!');
    console.log('New config:', {
      promotionalEndDate: config.promotionalEndDate,
      prizePoolStartDate: config.prizePoolStartDate,
      promotionalMessage: config.promotionalMessage,
      daysUntilPromotionEnds: config.getDaysUntilPromotionEnds(),
      daysUntilPrizePoolStarts: config.getDaysUntilPrizePoolStarts()
    });

  } catch (error) {
    console.error('❌ Error updating promotional config:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update
updatePromotionalConfig();
