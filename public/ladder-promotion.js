let promotionCandidates = [];
let promotionResults = {};

// Ladder configuration
const LADDER_CONFIG = {
    '499-under': { min: 0, max: 499, next: '500-549' },
    '500-549': { min: 500, max: 549, next: '550-plus' },
    '550-plus': { min: 550, max: 9999, next: null }
};

async function checkPromotions() {
    showLoading(true);
    showStatus('checkStatus', 'Checking for players ready for promotion...', 'info');

    try {
        const response = await fetch('/api/fargo/check-promotions');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.candidates) {
            promotionCandidates = data.candidates;
            showStatus('checkStatus', `Found ${promotionCandidates.length} players ready for promotion!`, 'success');
            showReviewStep();
        } else {
            showStatus('checkStatus', data.message || 'No players found ready for promotion', 'info');
        }
    } catch (error) {
        console.error('Error checking promotions:', error);
        showStatus('checkStatus', `❌ Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function fixLadderPositions() {
    showLoading(true);
    showStatus('checkStatus', 'Fixing ladder positions to close gaps...', 'info');

    try {
        // Since the API endpoint isn't working, let's use the existing promote-players endpoint
        // with an empty array to trigger a position fix
        const response = await fetch('/api/fargo/promote-players', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ candidates: [], fixPositions: true })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showStatus('checkStatus', `✅ Ladder positions fixed! Checked all ladders for gaps.`, 'success');
        } else {
            throw new Error(data.message || 'Failed to fix positions');
        }
    } catch (error) {
        console.error('Error fixing positions:', error);
        showStatus('checkStatus', `❌ Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function cleanTestMatches() {
    showLoading(true);
    showStatus('checkStatus', 'Cleaning test match data from ladder players...', 'info');

    try {
        const response = await fetch('/api/fargo/clean-test-matches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showStatus('checkStatus', `✅ Test matches cleaned! Removed ${data.cleanedCount} test matches from ${data.playersUpdated} players.`, 'success');
        } else {
            throw new Error(data.message || 'Failed to clean test matches');
        }
    } catch (error) {
        console.error('Error cleaning test matches:', error);
        showStatus('checkStatus', `❌ Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

function refreshLadderData() {
    showStatus('checkStatus', 'Refreshing ladder data...', 'info');
    
    // Close the promotion window and refresh the parent window
    if (window.opener && !window.opener.closed) {
        // Refresh the parent window (the main ladder app)
        window.opener.location.reload();
        showStatus('checkStatus', '✅ Ladder data refreshed! The main ladder page has been reloaded.', 'success');
        
        // Close this window after a short delay
        setTimeout(() => {
            window.close();
        }, 2000);
    } else {
        showStatus('checkStatus', '⚠️ Please manually refresh the main ladder page to see updated data.', 'warning');
    }
}

function showReviewStep() {
    document.getElementById('reviewStep').classList.remove('hidden');
    document.getElementById('reviewStep').scrollIntoView({ behavior: 'smooth' });
    
    const container = document.getElementById('promotionsContainer');
    container.innerHTML = `
        <div class="promotion-container">
            <div class="promotion-header">
                <div>#</div>
                <div>Player Name</div>
                <div>Current Rating</div>
                <div>Current Ladder</div>
                <div>Target Ladder</div>
                <div>Action</div>
            </div>
        </div>
    `;
    
    const promotionContainer = container.querySelector('.promotion-container');
    
    promotionCandidates.forEach((candidate, index) => {
        const promotionRow = document.createElement('div');
        promotionRow.className = 'promotion-row';
        promotionRow.id = `player-${candidate._id}`;
        promotionRow.innerHTML = `
            <div class="position">${candidate.position}</div>
            <div class="player-name">${candidate.firstName} ${candidate.lastName}</div>
            <div class="current-rating">${candidate.fargoRate}</div>
            <div class="current-ladder">${candidate.currentLadder}</div>
            <div class="target-ladder">${candidate.targetLadder}</div>
            <div>
                <button class="promote-btn" id="promote-btn-${candidate._id}">
                    Promote
                </button>
            </div>
        `;
        
        // Add event listener to the button
        const button = promotionRow.querySelector(`#promote-btn-${candidate._id}`);
        if (button) {
            button.addEventListener('click', () => {
                console.log('Button clicked for player:', candidate._id);
                promoteIndividualPlayer(candidate._id);
            });
        }
        promotionContainer.appendChild(promotionRow);
    });
}

async function promoteIndividualPlayer(playerId) {
    console.log('promoteIndividualPlayer called with ID:', playerId);
    console.log('Available candidates:', promotionCandidates);
    
    const candidate = promotionCandidates.find(c => c._id === playerId);
    if (!candidate) {
        console.log('Candidate not found for ID:', playerId);
        showStatus('promotionStatus', '❌ Player not found', 'error');
        return;
    }

    console.log('Found candidate:', candidate);
    const button = document.getElementById(`promote-btn-${playerId}`);
    if (!button) {
        console.log('Button not found for ID:', playerId);
        showStatus('promotionStatus', '❌ Button not found', 'error');
        return;
    }
    
    const originalText = button.textContent;
    console.log('Promoting player:', candidate.firstName, candidate.lastName);
    
    button.disabled = true;
    button.textContent = 'Promoting...';
    
    try {
        const response = await fetch('/api/fargo/promote-players', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ candidates: [candidate] })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.promotedCount > 0) {
            button.textContent = '✅ Promoted!';
            button.style.background = '#28a745';
            
            // Remove the player from the candidates list
            promotionCandidates = promotionCandidates.filter(c => c._id !== playerId);
            
            // Update the display
            setTimeout(() => {
                const playerRow = document.getElementById(`player-${playerId}`);
                if (playerRow) {
                    playerRow.style.opacity = '0.5';
                    playerRow.style.textDecoration = 'line-through';
                }
            }, 1000);
            
            const reindexedCount = result.promotions && result.promotions[0] ? result.promotions[0].reindexedCount || 0 : 0;
            const reindexMessage = reindexedCount > 0 ? ` and re-indexed ${reindexedCount} players in the original ladder` : '';
            showStatus('promotionStatus', `✅ Successfully promoted ${candidate.firstName} ${candidate.lastName}${reindexMessage}!`, 'success');
            
            // Check if all players have been promoted
            if (promotionCandidates.length === 0) {
                setTimeout(() => {
                    showStatus('promotionStatus', '🎉 All players have been promoted!', 'success');
                }, 2000);
            }
        } else {
            throw new Error(result.message || 'Promotion failed');
        }
    } catch (error) {
        console.error('Error promoting player:', error);
        button.textContent = '❌ Error';
        button.style.background = '#dc3545';
        showStatus('promotionStatus', `❌ Error promoting ${candidate.firstName} ${candidate.lastName}: ${error.message}`, 'error');
        
        setTimeout(() => {
            button.disabled = false;
            button.textContent = originalText;
            button.style.background = '';
        }, 3000);
    }
}

async function promoteAllPlayers() {
    showLoading(true);
    showStatus('promotionStatus', 'Promoting players to higher ladders...', 'info');
    
    try {
        const response = await fetch('/api/fargo/promote-players', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ candidates: promotionCandidates })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            promotionResults = result;
            showStatus('promotionStatus', `✅ Successfully promoted ${result.promotedCount} players!`, 'success');
            showResults();
        } else {
            throw new Error(result.message || 'Promotion failed');
        }
    } catch (error) {
        console.error('Error promoting players:', error);
        showStatus('promotionStatus', `❌ Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

function showResults() {
    document.getElementById('resultsStep').classList.remove('hidden');
    document.getElementById('resultsStep').scrollIntoView({ behavior: 'smooth' });
    
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="status success">
            <h4>Promotion Complete!</h4>
            <p><strong>Promoted:</strong> ${promotionResults.promotedCount} players</p>
            <p><strong>Errors:</strong> ${promotionResults.errorCount || 0} players</p>
            <p><strong>Ladder Positions Re-indexed:</strong> ${promotionResults.promotions ? promotionResults.promotions.reduce((total, promo) => total + (promo.reindexedCount || 0), 0) : 0} players</p>
        </div>
        
        ${promotionResults.promotions && promotionResults.promotions.length > 0 ? `
            <div style="margin-top: 20px;">
                <h4>Promotions Made:</h4>
                <div class="promotion-container" style="margin-top: 10px;">
                    <div class="promotion-header">
                        <div>#</div>
                        <div>Player Name</div>
                        <div>Rating</div>
                        <div>From</div>
                        <div>To</div>
                        <div>Status</div>
                    </div>
                    ${promotionResults.promotions.map(promo => `
                        <div class="promotion-row">
                            <div class="position">${promo.oldPosition}</div>
                            <div class="player-name">${promo.name}</div>
                            <div class="current-rating">${promo.fargoRate}</div>
                            <div class="current-ladder">${promo.fromLadder}</div>
                            <div class="target-ladder">${promo.toLadder}</div>
                            <div style="color: #28a745; font-weight: bold;">✅ Promoted</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

function cancelPromotion() {
    promotionCandidates = [];
    document.getElementById('reviewStep').classList.add('hidden');
    document.getElementById('resultsStep').classList.add('hidden');
    document.getElementById('checkStatus').innerHTML = '';
    document.getElementById('promotionStatus').innerHTML = '';
    document.getElementById('resultsContainer').innerHTML = '';
    window.scrollTo(0, 0);
}

function startOver() {
    promotionCandidates = [];
    promotionResults = {};
    
    document.getElementById('reviewStep').classList.add('hidden');
    document.getElementById('resultsStep').classList.add('hidden');
    
    document.getElementById('checkStatus').innerHTML = '';
    document.getElementById('promotionStatus').innerHTML = '';
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

// Make functions globally available
window.promoteIndividualPlayer = promoteIndividualPlayer;
window.checkPromotions = checkPromotions;
window.fixLadderPositions = fixLadderPositions;
window.cleanTestMatches = cleanTestMatches;
window.refreshLadderData = refreshLadderData;
window.promoteAllPlayers = promoteAllPlayers;
window.cancelPromotion = cancelPromotion;
window.startOver = startOver;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Ladder Promotion Tool loaded successfully');
    
    // Add event listeners
    const checkPromotionsBtn = document.getElementById('checkPromotionsBtn');
    const fixPositionsBtn = document.getElementById('fixPositionsBtn');
    const cleanTestMatchesBtn = document.getElementById('cleanTestMatchesBtn');
    const refreshLadderBtn = document.getElementById('refreshLadderBtn');
    const promoteAllBtn = document.getElementById('promoteAllBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const startOverBtn = document.getElementById('startOverBtn');
    
    if (checkPromotionsBtn) checkPromotionsBtn.addEventListener('click', checkPromotions);
    if (fixPositionsBtn) fixPositionsBtn.addEventListener('click', fixLadderPositions);
    if (cleanTestMatchesBtn) cleanTestMatchesBtn.addEventListener('click', cleanTestMatches);
    if (refreshLadderBtn) refreshLadderBtn.addEventListener('click', refreshLadderData);
    if (promoteAllBtn) promoteAllBtn.addEventListener('click', promoteAllPlayers);
    if (cancelBtn) cancelBtn.addEventListener('click', cancelPromotion);
    if (startOverBtn) startOverBtn.addEventListener('click', startOver);
});
