import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeagueConfig from './src/models/LeagueConfig.js';

dotenv.config();

async function setupInitialConfig() {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully');

    // Check if config already exists
    let config = await LeagueConfig.findOne({});
    
    if (config) {
      console.log('League config already exists:', config);
    } else {
      // Create initial config
      config = new LeagueConfig({
        leagueName: 'Front Range Pool League',
        leagueDescription: 'BCAPL Singles Division',
        googleSheetsBackup: {
          enabled: true,
          sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Sample Google Sheet ID
          sheetName: 'Player Backup',
          apiKey: '***CONFIGURED***', // This indicates API key is stored
          backupFrequency: 'weekly',
          autoBackup: true,
          lastBackupDate: new Date()
        },
        divisions: ['FRBCAPL TEST', 'Singles Test', 'Waiting List'],
        defaultDivision: 'Waiting List',
        requireApproval: true,
        allowSelfRegistration: true
      });

      await config.save();
      console.log('✅ Initial league configuration created successfully!');
      console.log('Config:', JSON.stringify(config, null, 2));
    }

    // Test the backup status endpoint
    console.log('\n--- Testing Backup Status ---');
    const backupInfo = {
      enabled: config.googleSheetsBackup.enabled,
      lastBackup: config.googleSheetsBackup.lastBackupDate,
      frequency: config.googleSheetsBackup.backupFrequency,
      autoBackup: config.googleSheetsBackup.autoBackup,
      sheetId: config.googleSheetsBackup.sheetId,
      sheetName: config.googleSheetsBackup.sheetName,
      configured: !!(config.googleSheetsBackup.sheetId && config.googleSheetsBackup.apiKey)
    };
    
    console.log('Backup info that should be returned:', JSON.stringify(backupInfo, null, 2));

  } catch (error) {
    console.error('Error setting up initial config:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

setupInitialConfig()
  .then(() => {
    console.log('Setup completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
