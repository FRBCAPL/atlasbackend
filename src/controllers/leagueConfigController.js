import LeagueConfig from '../models/LeagueConfig.js';
import { backupUsersToGoogleSheets, testGoogleSheetsConnection, createGoogleSheet } from '../utils/backupToGoogleSheets.js';

// Get league configuration
export const getLeagueConfig = async (req, res) => {
  try {
    let config = await LeagueConfig.findOne({});
    
    if (!config) {
      // Create default config
      config = new LeagueConfig({
        leagueName: 'Front Range Pool League',
        leagueDescription: 'BCAPL Singles Division',
        googleSheetsBackup: {
          enabled: false,
          backupFrequency: 'weekly',
          autoBackup: true
        }
      });
      await config.save();
    }
    
    // Don't send API key in response for security
    const safeConfig = {
      ...config.toObject(),
      googleSheetsBackup: {
        ...config.googleSheetsBackup,
        apiKey: config.googleSheetsBackup.apiKey ? '***CONFIGURED***' : null
      }
    };
    
    res.json({ success: true, config: safeConfig });
  } catch (error) {
    console.error('Error getting league config:', error);
    res.status(500).json({ success: false, error: 'Failed to get league configuration' });
  }
};

// Update league configuration
export const updateLeagueConfig = async (req, res) => {
  try {
    const {
      leagueName,
      leagueDescription,
      adminEmail,
      adminPhone,
      requireApproval,
      allowSelfRegistration,
      registrationFee,
      defaultMatchDuration,
      allowChallenges,
      divisions,
      defaultDivision
    } = req.body;
    
    const config = await LeagueConfig.findOneAndUpdate(
      {},
      {
        leagueName,
        leagueDescription,
        adminEmail,
        adminPhone,
        requireApproval,
        allowSelfRegistration,
        registrationFee,
        defaultMatchDuration,
        allowChallenges,
        divisions,
        defaultDivision,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error updating league config:', error);
    res.status(500).json({ success: false, error: 'Failed to update league configuration' });
  }
};

// Configure Google Sheets backup
export const configureGoogleSheetsBackup = async (req, res) => {
  try {
    const {
      enabled,
      sheetId,
      sheetName,
      apiKey,
      backupFrequency,
      autoBackup
    } = req.body;
    
    // Test connection if sheetId and apiKey provided
    if (enabled && sheetId && apiKey) {
      const testResult = await testGoogleSheetsConnection(sheetId, apiKey);
      if (!testResult.success) {
        return res.status(400).json({ 
          success: false, 
          error: 'Google Sheets connection failed', 
          details: testResult.error 
        });
      }
    }
    
    const config = await LeagueConfig.findOneAndUpdate(
      {},
      {
        'googleSheetsBackup.enabled': enabled,
        'googleSheetsBackup.sheetId': sheetId,
        'googleSheetsBackup.sheetName': sheetName || 'Player Backup',
        'googleSheetsBackup.apiKey': apiKey,
        'googleSheetsBackup.backupFrequency': backupFrequency || 'weekly',
        'googleSheetsBackup.autoBackup': autoBackup !== undefined ? autoBackup : true,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json({ 
      success: true, 
      message: 'Google Sheets backup configured successfully',
      config: {
        ...config.toObject(),
        googleSheetsBackup: {
          ...config.googleSheetsBackup,
          apiKey: config.googleSheetsBackup.apiKey ? '***CONFIGURED***' : null
        }
      }
    });
  } catch (error) {
    console.error('Error configuring Google Sheets backup:', error);
    res.status(500).json({ success: false, error: 'Failed to configure Google Sheets backup' });
  }
};

// Test Google Sheets connection
export const testBackupConnection = async (req, res) => {
  try {
    const { sheetId, apiKey } = req.body;
    
    if (!sheetId || !apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Sheet ID and API key are required' 
      });
    }
    
    const result = await testGoogleSheetsConnection(sheetId, apiKey);
    res.json(result);
  } catch (error) {
    console.error('Error testing backup connection:', error);
    res.status(500).json({ success: false, error: 'Failed to test connection' });
  }
};

// Create new Google Sheet for backup
export const createBackupSheet = async (req, res) => {
  try {
    const { sheetTitle, apiKey } = req.body;
    
    if (!sheetTitle || !apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Sheet title and API key are required' 
      });
    }
    
    const result = await createGoogleSheet(sheetTitle, apiKey);
    res.json(result);
  } catch (error) {
    console.error('Error creating backup sheet:', error);
    res.status(500).json({ success: false, error: 'Failed to create backup sheet' });
  }
};

// Run manual backup
export const runManualBackup = async (req, res) => {
  try {
    const config = await LeagueConfig.findOne({});
    
    if (!config || !config.googleSheetsBackup.enabled) {
      return res.status(400).json({ 
        success: false, 
        error: 'Google Sheets backup is not configured' 
      });
    }
    
    const { sheetId, sheetName, apiKey } = config.googleSheetsBackup;
    
    if (!sheetId || !apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Google Sheets backup is not properly configured' 
      });
    }
    
    const result = await backupUsersToGoogleSheets(sheetId, sheetName, apiKey);
    res.json(result);
  } catch (error) {
    console.error('Error running manual backup:', error);
    res.status(500).json({ success: false, error: 'Failed to run backup' });
  }
};

// Get backup status
export const getBackupStatus = async (req, res) => {
  try {
    const config = await LeagueConfig.findOne({});
    
    if (!config) {
      return res.json({ 
        success: true, 
        backup: { enabled: false, lastBackup: null } 
      });
    }
    
    const backupInfo = {
      enabled: config.googleSheetsBackup.enabled,
      lastBackup: config.googleSheetsBackup.lastBackupDate,
      frequency: config.googleSheetsBackup.backupFrequency,
      autoBackup: config.googleSheetsBackup.autoBackup,
      sheetId: config.googleSheetsBackup.sheetId,
      sheetName: config.googleSheetsBackup.sheetName,
      configured: !!(config.googleSheetsBackup.sheetId && config.googleSheetsBackup.apiKey)
    };
    
    res.json({ success: true, backup: backupInfo });
  } catch (error) {
    console.error('Error getting backup status:', error);
    res.status(500).json({ success: false, error: 'Failed to get backup status' });
  }
};
