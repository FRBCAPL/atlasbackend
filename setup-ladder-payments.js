// Direct database update for ladder payment configuration
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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

// PaymentConfig Schema (simplified)
const paymentConfigSchema = new mongoose.Schema({
  leagueId: { type: String, default: 'default' },
  paymentMethods: { type: Object, default: {} },
  contactInfo: { type: Object, default: {} }
});

const PaymentConfig = mongoose.models.PaymentConfig || mongoose.model('PaymentConfig', paymentConfigSchema);

async function setupLadderPayments() {
  try {
    await connectDB();
    
    console.log('🔧 Setting up ladder payment configuration...');
    
    // Find or create payment config
    let config = await PaymentConfig.findOne({ leagueId: 'default' });
    
    if (!config) {
      config = new PaymentConfig({ leagueId: 'default' });
    }
    
    // Update payment methods with ladder options
    config.paymentMethods = {
      venmo: {
        enabled: true,
        username: '@duesfrusapl',
        displayName: 'Venmo',
        instructions: 'Send payment to @duesfrusapl - Include player names, date, location.'
      },
      cashapp: {
        enabled: true,
        username: '$frusapl',
        displayName: 'Cash App',
        instructions: 'Send payment to $frusapl - Include player names, date, location.'
      },
      ladderMembership: {
        enabled: true,
        processor: 'square',
        displayName: 'Ladder Membership ($5/month)',
        instructions: 'Join the ladder system - $5 monthly membership',
        paymentLink: 'https://square.link/u/GRZx5ZVA',
        amount: 5.00
      },
      ladderMatchFee: {
        enabled: true,
        processor: 'square',
        displayName: 'Ladder Match Fee ($5)',
        instructions: 'Report a ladder match - $5 fee',
        paymentLink: 'https://square.link/u/i3Mpsxtf',
        amount: 5.00
      },
      creditCard: {
        enabled: true,
        processor: 'square',
        displayName: 'Credit/Debit Card',
        instructions: 'Pay online using the link below',
        paymentLink: 'https://square.link/u/GRZx5ZVA' // Using membership link as default
      },
      cash: {
        enabled: true,
        displayName: 'Cash',
        instructions: 'Pay in person. Put in the RED dropbox at Legends Brew & Cues. Must include players names, date, and location played.'
      }
    };
    
    config.contactInfo = {
      adminName: 'Front Range Pool League',
      adminEmail: 'frbcapl@gmail.com',
      adminPhone: ''
    };
    
    await config.save();
    
    console.log('✅ Ladder payment configuration saved successfully!');
    console.log('\n📋 Available Payment Methods:');
    
    Object.keys(config.paymentMethods).forEach(method => {
      const paymentMethod = config.paymentMethods[method];
      if (paymentMethod.enabled) {
        console.log(`💰 ${paymentMethod.displayName}:`);
        if (paymentMethod.username) console.log(`   Username: ${paymentMethod.username}`);
        if (paymentMethod.paymentLink) console.log(`   Payment Link: ${paymentMethod.paymentLink}`);
        if (paymentMethod.amount) console.log(`   Amount: $${paymentMethod.amount}`);
      }
    });
    
    console.log('\n🎉 Your ladder payment system is ready!');
    console.log('Players can now:');
    console.log('1. Join the ladder ($5/month) → https://square.link/u/GRZx5ZVA');
    console.log('2. Report matches ($5 fee) → https://square.link/u/i3Mpsxtf');
    console.log('3. Use Venmo → @duesfrusapl');
    console.log('4. Use Cash App → $frusapl');
    console.log('5. Pay cash → Dropbox at Legends');
    
  } catch (error) {
    console.error('❌ Error setting up ladder payments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

setupLadderPayments();
