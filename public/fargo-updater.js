let players = [];
let updateResults = {};

async function loadPlayers() {
    showLoading(true);
    showStatus('loadStatus', 'Loading players...', 'info');

    try {
        const response = await fetch('/api/fargo/fargo-players');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.players) {
            players = data.players;
            showStatus('loadStatus', `✅ Loaded ${players.length} players successfully!`, 'success');
            showUpdateStep();
        } else {
            throw new Error(data.message || 'Failed to load players');
        }
    } catch (error) {
        console.error('Error loading players:', error);
        showStatus('loadStatus', `❌ Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

function showUpdateStep() {
    document.getElementById('updateStep').classList.remove('hidden');
    document.getElementById('updateStep').scrollIntoView({ behavior: 'smooth' });
    
    const container = document.getElementById('playersContainer');
    container.innerHTML = `
        <div class="players-container">
            <div class="players-header">
                <div>#</div>
                <div>Player Name</div>
                <div>Current Rating</div>
                <div>New Rating</div>
            </div>
        </div>
    `;
    
    const playersContainer = container.querySelector('.players-container');
    
    players.forEach((player, index) => {
        const playerRow = document.createElement('div');
        playerRow.className = 'player-row';
        playerRow.innerHTML = `
            <div class="position">${player.position}</div>
            <div class="player-name">${player.firstName} ${player.lastName}</div>
            <div class="current-rating">${player.fargoRate}</div>
            <input 
                type="number" 
                class="new-rating" 
                id="rating-${player._id}" 
                value="${player.fargoRate}"
                min="0" 
                max="1000"
                placeholder="Enter new rating"
                data-original="${player.fargoRate}"
            />
        `;
        playersContainer.appendChild(playerRow);
        
        // Add change detection
        const input = playerRow.querySelector('.new-rating');
        input.addEventListener('input', function() {
            const originalValue = parseInt(this.dataset.original);
            const currentValue = parseInt(this.value) || 0;
            
            if (currentValue !== originalValue) {
                this.classList.add('changed');
                this.classList.remove('error');
            } else {
                this.classList.remove('changed');
                this.classList.remove('error');
            }
            
            // Validate rating range
            if (currentValue < 0 || currentValue > 1000) {
                this.classList.add('error');
            }
        });
    });
}

async function updateRatings() {
    showLoading(true);
    showStatus('updateStatus', 'Updating ratings...', 'info');
    
    const updates = [];
    
    players.forEach(player => {
        const input = document.getElementById(`rating-${player._id}`);
        const newRating = parseInt(input.value);
        
        if (!isNaN(newRating) && newRating !== player.fargoRate) {
            updates.push({
                playerId: player._id,
                newFargoRate: newRating
            });
        }
    });
    
    if (updates.length === 0) {
        showStatus('updateStatus', 'No changes to update!', 'warning');
        showLoading(false);
        return;
    }
    
    console.log('Updates to send:', updates);
    showStatus('updateStatus', `Updating ${updates.length} players with changes...`, 'info');
    
    try {
        const response = await fetch('/api/fargo/fargo-update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ updates })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            updateResults = result;
            showStatus('updateStatus', `✅ Successfully updated ${result.updatedCount} players!`, 'success');
            showResults();
        } else {
            throw new Error(result.message || 'Update failed');
        }
    } catch (error) {
        console.error('Error updating ratings:', error);
        showStatus('updateStatus', `❌ Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

function showResults() {
    document.getElementById('resultsStep').classList.remove('hidden');
    document.getElementById('resultsStep').scrollIntoView({ behavior: 'smooth' });
    
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="results-summary">
            <h4>Update Summary</h4>
            <p><strong>Updated:</strong> ${updateResults.updatedCount} players</p>
            <p><strong>Unchanged:</strong> ${updateResults.unchangedCount} players</p>
            <p><strong>Backup created:</strong> ${updateResults.backupFile ? 'Yes' : 'No'}</p>
        </div>
        
        ${updateResults.changes && updateResults.changes.length > 0 ? `
            <div class="changes-list">
                <h4>Changes Made:</h4>
                <ul>
                    ${updateResults.changes.map(change => 
                        `<li><strong>${change.name}</strong>: ${change.oldRating} → ${change.newRating}</li>`
                    ).join('')}
                </ul>
            </div>
        ` : ''}
    `;
}

function resetForm() {
    const inputs = document.querySelectorAll('.new-rating');
    inputs.forEach(input => {
        const originalValue = input.dataset.original;
        input.value = originalValue;
        input.classList.remove('changed', 'error');
    });
    showStatus('updateStatus', 'Form reset to original values', 'info');
}

function startOver() {
    players = [];
    updateResults = {};
    
    document.getElementById('updateStep').classList.add('hidden');
    document.getElementById('resultsStep').classList.add('hidden');
    
    document.getElementById('loadStatus').innerHTML = '';
    document.getElementById('updateStatus').innerHTML = '';
    document.getElementById('resultsContainer').innerHTML = '';
    
    window.scrollTo(0, 0);
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('show');
    } else {
        loading.classList.remove('show');
    }
}

function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="status ${type}">${message}</div>`;
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Fargo Updater loaded successfully');
    
    // Test the API endpoint
    testApiEndpoint();
    
    // Add event listeners
    const loadPlayersBtn = document.getElementById('loadPlayersBtn');
    const updateRatingsBtn = document.getElementById('updateRatingsBtn');
    const resetFormBtn = document.getElementById('resetFormBtn');
    const startOverBtn = document.getElementById('startOverBtn');
    
    if (loadPlayersBtn) loadPlayersBtn.addEventListener('click', loadPlayers);
    if (updateRatingsBtn) updateRatingsBtn.addEventListener('click', updateRatings);
    if (resetFormBtn) resetFormBtn.addEventListener('click', resetForm);
    if (startOverBtn) startOverBtn.addEventListener('click', startOver);
});

async function testApiEndpoint() {
    try {
        console.log('Testing API endpoint...');
        const response = await fetch('/api/fargo/test');
        const data = await response.json();
        console.log('API test result:', data);
    } catch (error) {
        console.error('API test failed:', error);
    }
}
