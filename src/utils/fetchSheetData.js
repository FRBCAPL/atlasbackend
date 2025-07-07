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
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
    
    const response = await axios.get(url);
    
    const values = response.data.values || [];
    
    return values;
  } catch (error) {
    if (error.response) {
      throw new Error(`Google Sheets API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('No response received from Google Sheets API');
    } else {
      throw new Error(`Request setup error: ${error.message}`);
    }
  }
}

module.exports = fetchSheetData;
