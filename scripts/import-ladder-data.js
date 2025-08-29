import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = 'http://localhost:3001/api/ladder'; // Adjust port if needed

// Sample data - replace with your actual Google Sheets CSV data
const sampleCSVData = `Position,Name,Email,FargoRate
1,John Doe,john@example.com,485
2,Jane Smith,jane@example.com,472
3,Bob Johnson,bob@example.com,458
4,Alice Wilson,alice@example.com,520
5,Charlie Brown,charlie@example.com,580
6,David Lee,david@example.com,495
7,Eva Garcia,eva@example.com,535
8,Frank Miller,frank@example.com,610`;

// Convert CSV to JSON format
function csvToJson(csvData) {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const players = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const player = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      
      switch (header.toLowerCase()) {
        case 'position':
          player.position = parseInt(value) || 0;
          break;
        case 'name':
          const nameParts = value.split(' ');
          player.firstName = nameParts[0] || '';
          player.lastName = nameParts.slice(1).join(' ') || '';
          break;
        case 'email':
          player.email = value || '';
          break;
        case 'fargorate':
          player.fargoRate = parseInt(value) || 450;
          break;
        default:
          player[header] = value;
      }
    });
    
    if (player.email) {
      players.push(player);
    }
  }
  
  return players;
}

// API Functions
async function importLadderData(ladderData, ladderName) {
  try {
    console.log(`Importing data to ${ladderName} ladder...`);
    
    const response = await fetch(`${API_BASE_URL}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ladderData: ladderData,
        ladderName: ladderName
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Import successful!');
      console.log(`   Imported: ${result.results.imported} players`);
      console.log(`   Skipped: ${result.results.skipped} players`);
      console.log(`   Errors: ${result.results.errors.length}`);
      
      if (result.results.errors.length > 0) {
        console.log('\n   Errors:');
        result.results.errors.forEach(error => {
          console.log(`   - Row ${error.row}: ${error.error}`);
        });
      }
    } else {
      console.log('❌ Import failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    throw error;
  }
}

async function getLadderData(ladderName) {
  try {
    console.log(`\nFetching ${ladderName} ladder data...`);
    
    const response = await fetch(`${API_BASE_URL}/admin/${ladderName}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Found ${data.length} players in ${ladderName} ladder`);
      return data;
    } else {
      console.log('❌ Failed to fetch ladder data:', data.error);
      return [];
    }
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    return [];
  }
}

async function updatePositions(ladderName, positions) {
  try {
    console.log(`\nUpdating positions for ${ladderName} ladder...`);
    
    const response = await fetch(`${API_BASE_URL}/update-positions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ladderName: ladderName,
        positions: positions
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Positions updated successfully!');
      console.log(`   Updated: ${result.results.updated} players`);
    } else {
      console.log('❌ Position update failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  console.log('🚀 Ladder Data Import Script');
  console.log('============================\n');
  
  try {
    // Step 1: Convert CSV to JSON
    console.log('📊 Converting CSV data to JSON...');
    const ladderData = csvToJson(sampleCSVData);
    console.log(`✅ Converted ${ladderData.length} players from CSV`);
    
    // Step 2: Import to 499-under ladder (this will auto-assign based on FargoRate)
    console.log('\n📥 Importing data...');
    const importResult = await importLadderData(ladderData, '499-under');
    
    // Step 3: Check results for each ladder
    const ladders = ['499-under', '500-549', '550-plus'];
    
    for (const ladderName of ladders) {
      const ladderPlayers = await getLadderData(ladderName);
      
      if (ladderPlayers.length > 0) {
        console.log(`\n📋 ${ladderName.toUpperCase()} Ladder Players:`);
        ladderPlayers.forEach((player, index) => {
          console.log(`   ${index + 1}. ${player.firstName} ${player.lastName} (${player.fargoRate}) - Position ${player.position}`);
        });
      }
    }
    
    console.log('\n✅ Import process completed!');
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
  }
}

// Instructions for usage
console.log(`
📝 HOW TO USE THIS SCRIPT:

1. Replace the sampleCSVData with your actual Google Sheets CSV data
2. Make sure your backend server is running (node server.js)
3. Run this script: node scripts/import-ladder-data.js

📋 EXPECTED CSV FORMAT:
Position,Name,Email,FargoRate
1,John Doe,john@example.com,485
2,Jane Smith,jane@example.com,472

🔧 CUSTOMIZATION:
- Change API_BASE_URL if your server runs on a different port
- Modify csvToJson function if your CSV has different column names
- Add your actual Google Sheets data to sampleCSVData

🎯 AUTOMATIC LADDER ASSIGNMENT:
- FargoRate 0-499 → 499-under ladder
- FargoRate 500-549 → 500-549 ladder  
- FargoRate 550+ → 550-plus ladder
`);

// Run the script
main();
