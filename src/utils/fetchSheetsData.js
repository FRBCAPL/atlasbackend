import axios from "axios";

const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;

/**
 * Fetches data from a Google Sheet using the Google Sheets API.
 * @param {string} sheetID - The spreadsheet ID.
 * @param {string} range - The range to fetch, e.g. "Sheet1!A1:D10"
 * @returns {Promise<Array>} - Array of rows (arrays of cell values)
 */
export async function fetchSheetsData(sheetID, range) {
  if (!API_KEY) throw new Error("Google Sheets API key is missing.");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${encodeURIComponent(
    range
  )}?key=${API_KEY}`;
  const response = await axios.get(url);
  return response.data.values; // Array of rows
}