const axios = require('axios');

// Use your actual API key here or load from .env
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY || 'AIzaSyCr05_9Bg1oZE7uJcGg48mWzOo4rLjxTQ8';

/**
 * Fetches rows from a public Google Sheet using the Sheets API.
 * @param {string} sheetID - The Google Sheet ID.
 * @param {string} range - The A1 notation range (e.g., "Sheet1!A1:L1000").
 * @returns {Promise<Array>} - Array of rows (arrays of cell values).
 */
async function fetchSheetData(sheetID, range) {
  try {
    console.log('Fetching sheet data...');
    console.log('API Key available:', !!API_KEY);
    console.log('Sheet ID:', sheetID);
    console.log('Range:', range);
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
    console.log('Request URL:', url);
    
    const response = await axios.get(url);
    console.log('Response status:', response.status);
    console.log('Response data keys:', Object.keys(response.data));
    
    const values = response.data.values || [];
    console.log('Fetched values count:', values.length);
    
    return values;
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      throw new Error(`Google Sheets API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('No response received from Google Sheets API');
    } else {
      throw new Error(`Request setup error: ${error.message}`);
    }
  }
}

module.exports = fetchSheetData;
