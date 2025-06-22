const axios = require('axios');

// Use your actual API key here or load from .env
const API_KEY = process.env.VITE_GOOGLE_SHEETS_API_KEY || 'AIzaSyCr05_9Bg1oZE7uJcGg48mWzOo4rLjxTQ8';

/**
 * Fetches rows from a public Google Sheet using the Sheets API.
 * @param {string} sheetID - The Google Sheet ID.
 * @param {string} range - The A1 notation range (e.g., "Sheet1!A1:L1000").
 * @returns {Promise<Array>} - Array of rows (arrays of cell values).
 */
async function fetchSheetData(sheetID, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
  const response = await axios.get(url);
  return response.data.values || [];
}

module.exports = fetchSheetData;
