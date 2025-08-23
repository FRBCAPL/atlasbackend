import axios from 'axios';
import User from '../models/User.js';
import LeagueConfig from '../models/LeagueConfig.js';

/**
 * Backup all users to Google Sheets
 * @param {string} sheetId - Google Sheet ID
 * @param {string} sheetName - Sheet name/tab
 * @param {string} apiKey - Google Sheets API key
 * @returns {Promise<Object>} Backup result
 */
export async function backupUsersToGoogleSheets(sheetId, sheetName = 'Player Backup', apiKey) {
  try {
    console.log('Starting Google Sheets backup...');
    
    // Get all users from database
    const users = await User.find({}).lean();
    console.log(`Found ${users.length} users to backup`);
    
    if (users.length === 0) {
      return { success: true, message: 'No users to backup', count: 0 };
    }
    
    // Prepare data for Google Sheets
    const headers = [
      'First Name',
      'Last Name', 
      'Email',
      'Phone',
      'Text Number',
      'Emergency Contact Name',
      'Emergency Contact Phone',
      'Preferred Contacts',
      'Availability (Mon)',
      'Availability (Tue)',
      'Availability (Wed)',
      'Availability (Thu)',
      'Availability (Fri)',
      'Availability (Sat)',
      'Availability (Sun)',
      'Locations',
      'Divisions',
      'Registration Date',
      'Is Approved',
      'Is Active',
      'Total Matches',
      'Wins',
      'Losses',
      'Notes'
    ];
    
    const rows = [headers];
    
    // Convert users to rows
    users.forEach(user => {
      const row = [
        user.firstName || '',
        user.lastName || '',
        user.email || '',
        user.phone || '',
        user.textNumber || '',
        user.emergencyContactName || '',
        user.emergencyContactPhone || '',
        (user.preferredContacts || []).join(', '),
        (user.availability?.Mon || []).join('; '),
        (user.availability?.Tue || []).join('; '),
        (user.availability?.Wed || []).join('; '),
        (user.availability?.Thu || []).join('; '),
        (user.availability?.Fri || []).join('; '),
        (user.availability?.Sat || []).join('; '),
        (user.availability?.Sun || []).join('; '),
        user.locations || '',
        (user.divisions || []).join(', '),
        user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : '',
        user.isApproved ? 'Yes' : 'No',
        user.isActive ? 'Yes' : 'No',
        user.totalMatches || 0,
        user.wins || 0,
        user.losses || 0,
        user.notes || ''
      ];
      rows.push(row);
    });
    
    // Clear existing data and write new data
    const range = `${sheetName}!A1:Z${rows.length}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW&key=${apiKey}`;
    
    const response = await axios.put(url, {
      values: rows
    });
    
    console.log('Backup completed successfully');
    
    // Update league config with last backup date
    await LeagueConfig.findOneAndUpdate(
      {},
      { 
        'googleSheetsBackup.lastBackupDate': new Date(),
        'googleSheetsBackup.sheetId': sheetId,
        'googleSheetsBackup.sheetName': sheetName
      },
      { upsert: true }
    );
    
    return {
      success: true,
      message: `Successfully backed up ${users.length} users to Google Sheets`,
      count: users.length,
      sheetId,
      sheetName,
      backupDate: new Date()
    };
    
  } catch (error) {
    console.error('Google Sheets backup failed:', error);
    return {
      success: false,
      message: 'Backup failed',
      error: error.message
    };
  }
}

/**
 * Test Google Sheets connection
 * @param {string} sheetId - Google Sheet ID
 * @param {string} apiKey - Google Sheets API key
 * @returns {Promise<Object>} Test result
 */
export async function testGoogleSheetsConnection(sheetId, apiKey) {
  try {
    console.log('Testing Google Sheets connection...');
    
    // Try to read the sheet metadata
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
    const response = await axios.get(url);
    
    const sheetInfo = response.data;
    const sheetNames = sheetInfo.sheets.map(sheet => sheet.properties.title);
    
    return {
      success: true,
      message: 'Connection successful',
      sheetNames,
      sheetTitle: sheetInfo.properties.title
    };
    
  } catch (error) {
    console.error('Google Sheets connection test failed:', error);
    return {
      success: false,
      message: 'Connection failed',
      error: error.message
    };
  }
}

/**
 * Create a new Google Sheet for backup
 * @param {string} sheetTitle - Title for the new sheet
 * @param {string} apiKey - Google Sheets API key
 * @returns {Promise<Object>} Creation result
 */
export async function createGoogleSheet(sheetTitle, apiKey) {
  try {
    console.log('Creating new Google Sheet...');
    
    const url = 'https://sheets.googleapis.com/v4/spreadsheets';
    const response = await axios.post(url, {
      properties: {
        title: sheetTitle
      },
      sheets: [
        {
          properties: {
            title: 'Player Backup',
            gridProperties: {
              rowCount: 1000,
              columnCount: 24
            }
          }
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const sheetId = response.data.spreadsheetId;
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
    
    return {
      success: true,
      message: 'Google Sheet created successfully',
      sheetId,
      sheetUrl,
      sheetTitle
    };
    
  } catch (error) {
    console.error('Failed to create Google Sheet:', error);
    return {
      success: false,
      message: 'Failed to create Google Sheet',
      error: error.message
    };
  }
}
