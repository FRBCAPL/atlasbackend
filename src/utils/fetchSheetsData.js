// my-app/src/utils/fetchSheetData.js
async function fetchSheetData(sheetID, sheetName) {
  try {
    const response = await fetch(`/api/sheet-data?sheetID=${sheetID}&sheetName=${sheetName}`); // Call your backend endpoint
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data; // Or data.rows, depending on what your backend sends
  } catch (error) {
    console.error("Could not fetch sheet data:", error);
    throw error; // Re-throw to allow the calling component to handle
  }
}

export default fetchSheetData;
