#!/bin/bash

# Ladder API Import Script using curl
# Make sure your backend server is running on port 3001

API_BASE="http://localhost:3001/api/ladder"

echo "🚀 Ladder API Import Script (curl)"
echo "=================================="

# Function to import ladder data
import_ladder_data() {
    local ladder_name=$1
    local json_data=$2
    
    echo "📥 Importing data to $ladder_name ladder..."
    
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$json_data" \
        "$API_BASE/import")
    
    echo "Response: $response"
    echo ""
}

# Function to get ladder data
get_ladder_data() {
    local ladder_name=$1
    
    echo "📋 Fetching $ladder_name ladder data..."
    
    response=$(curl -s -X GET \
        "$API_BASE/admin/$ladder_name")
    
    echo "Response: $response"
    echo ""
}

# Function to update positions
update_positions() {
    local ladder_name=$1
    local positions_json=$2
    
    echo "🔄 Updating positions for $ladder_name ladder..."
    
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$positions_json" \
        "$API_BASE/update-positions")
    
    echo "Response: $response"
    echo ""
}

# Example usage with sample data
echo "📊 Example: Importing sample data..."

# Sample JSON data (replace with your actual data)
sample_data='{
  "ladderData": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "fargoRate": 485,
      "position": 1
    },
    {
      "firstName": "Jane",
      "lastName": "Smith", 
      "email": "jane@example.com",
      "fargoRate": 520,
      "position": 2
    },
    {
      "firstName": "Bob",
      "lastName": "Johnson",
      "email": "bob@example.com", 
      "fargoRate": 580,
      "position": 3
    }
  ],
  "ladderName": "499-under"
}'

# Import the sample data
import_ladder_data "499-under" "$sample_data"

# Get data from all ladders
echo "📋 Checking all ladders..."
get_ladder_data "499-under"
get_ladder_data "500-549" 
get_ladder_data "550-plus"

echo "✅ Script completed!"
echo ""
echo "📝 USAGE EXAMPLES:"
echo ""
echo "1. Import data:"
echo "   curl -X POST -H 'Content-Type: application/json' \\"
echo "     -d '{\"ladderData\":[...],\"ladderName\":\"499-under\"}' \\"
echo "     http://localhost:3001/api/ladder/import"
echo ""
echo "2. Get ladder data:"
echo "   curl -X GET http://localhost:3001/api/ladder/admin/499-under"
echo ""
echo "3. Update positions:"
echo "   curl -X POST -H 'Content-Type: application/json' \\"
echo "     -d '{\"ladderName\":\"499-under\",\"positions\":[...]}' \\"
echo "     http://localhost:3001/api/ladder/update-positions"
