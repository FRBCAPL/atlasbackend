import express from 'express';
import LadderPlayer from '../models/LadderPlayer.js';
import Ladder from '../models/Ladder.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Simple test endpoint to check if the route is working
router.get('/test', (req, res) => {
    console.log('Fargo test endpoint hit');
    res.json({ success: true, message: 'Fargo updater routes are working!' });
});

// GET /api/fargo/fix-ladder-positions - Fix gaps in ladder positions
router.get('/fix-ladder-positions', async (req, res) => {
    try {
        console.log('Fixing ladder positions for all ladders');
        
        const ladders = ['499-under', '500-549', '550-plus'];
        const results = [];
        
        for (const ladderName of ladders) {
            console.log(`Fixing positions for ${ladderName}`);
            
            // Get all players in this ladder, sorted by current position
            const players = await LadderPlayer.find({ 
                ladderName: ladderName,
                isActive: true 
            }).sort({ position: 1 });
            
            let fixedCount = 0;
            
            // Re-index all players to have consecutive positions starting from 1
            for (let i = 0; i < players.length; i++) {
                const player = players[i];
                const expectedPosition = i + 1;
                
                if (player.position !== expectedPosition) {
                    console.log(`Fixing ${player.firstName} ${player.lastName}: position ${player.position} -> ${expectedPosition}`);
                    player.position = expectedPosition;
                    await player.save();
                    fixedCount++;
                }
            }
            
            results.push({
                ladder: ladderName,
                totalPlayers: players.length,
                fixedPositions: fixedCount
            });
            
            console.log(`Fixed ${fixedCount} positions in ${ladderName}`);
        }
        
        logUpdate(`Ladder position fix completed. Results: ${JSON.stringify(results)}`);
        res.json({ success: true, message: 'Ladder positions fixed', results });
        
    } catch (error) {
        console.error('Error fixing ladder positions:', error);
        logUpdate(`Error fixing ladder positions: ${error.message}`, 'ERROR');
        res.status(500).json({ success: false, message: 'Error fixing ladder positions', error: error.message });
    }
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupDir = path.join(__dirname, '../../backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// Helper for logging
const logUpdate = (message, level = 'INFO') => {
    const logPath = path.join(__dirname, '../../logs/fargo-updates.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    fs.appendFileSync(logPath, logEntry);
    console.log(logEntry.trim());
};

// GET /api/fargo/fargo-players - Get all ladder players with their Fargo ratings
router.get('/fargo-players', async (req, res) => {
    try {
        console.log('Fargo players request received');
        const players = await LadderPlayer.find({ ladderName: '499-under' }).sort({ position: 1 });
        console.log(`Found ${players.length} players`);
        res.json({ success: true, players });
    } catch (error) {
        console.error('Error fetching players:', error);
        logUpdate(`Error fetching players: ${error.message}`, 'ERROR');
        res.status(500).json({ success: false, message: 'Error fetching players', error: error.message });
    }
});

/**
 * Update Fargo ratings for multiple players
 */
router.post('/update-fargo-ratings', async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'Invalid updates data' });
    }

    const results = {
      updated: 0,
      unchanged: 0,
      errors: 0,
      changes: []
    };

    // Process each update
    for (const update of updates) {
      try {
        const { playerId, newRating } = update;

        if (!playerId || !newRating) {
          results.errors++;
          continue;
        }

        // Find the player
        const player = await LadderPlayer.findById(playerId);
        if (!player) {
          results.errors++;
          continue;
        }

        const oldRating = player.fargoRate;

        // Update the rating
        player.fargoRate = newRating;
        await player.save();

        if (oldRating !== newRating) {
          results.updated++;
          results.changes.push({
            player: `${player.firstName} ${player.lastName}`,
            position: player.position,
            oldRating,
            newRating
          });
        } else {
          results.unchanged++;
        }

      } catch (error) {
        console.error('Error updating player:', error);
        results.errors++;
      }
    }

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error updating Fargo ratings:', error);
    res.status(500).json({ error: 'Failed to update Fargo ratings' });
  }
});

// POST /api/fargo/fargo-update - Update Fargo ratings for multiple players
router.post('/fargo-update', async (req, res) => {
    console.log('Fargo update request received');
    const { updates } = req.body; // updates is an array of { playerId, newFargoRate }
    
    console.log('Received update request:', JSON.stringify(req.body, null, 2));
    
    if (!updates || !Array.isArray(updates)) {
        console.log('Invalid update data provided');
        return res.status(400).json({ success: false, message: 'Invalid update data provided.' });
    }
    
    let updatedCount = 0;
    let unchangedCount = 0;
    const changes = [];
    
    try {
        // Create a backup before making changes
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `fargo-backup-499-under-${timestamp}.json`);
        const currentPlayers = await LadderPlayer.find({ ladderName: '499-under' });
        fs.writeFileSync(backupFile, JSON.stringify(currentPlayers, null, 2));
        logUpdate(`Backup created: ${backupFile}`);
        
        for (const update of updates) {
            const { playerId, newFargoRate } = update;
            console.log(`Processing update for player ${playerId} with new rating ${newFargoRate}`);
            
            if (!playerId || typeof newFargoRate === 'undefined' || newFargoRate === null) {
                logUpdate(`Skipping invalid update entry: ${JSON.stringify(update)}`, 'WARN');
                continue;
            }
            
            // Validate ObjectId format
            if (!mongoose.Types.ObjectId.isValid(playerId)) {
                logUpdate(`Invalid ObjectId format for playerId: ${playerId}`, 'WARN');
                console.log(`❌ Invalid ObjectId format: ${playerId}`);
                continue;
            }
            
            try {
                const player = await LadderPlayer.findById(playerId);
                if (player) {
                    const oldRating = player.fargoRate;
                    const parsedNewRating = parseInt(newFargoRate, 10);
                    
                    console.log(`Player ${player.firstName} ${player.lastName}: current=${oldRating}, new=${parsedNewRating}`);
                    
                    if (player.fargoRate !== parsedNewRating) {
                        player.fargoRate = parsedNewRating;
                        await player.save();
                        updatedCount++;
                        changes.push({ playerId, name: `${player.firstName} ${player.lastName}`, oldRating, newRating: parsedNewRating });
                        logUpdate(`Updated ${player.firstName} ${player.lastName}: ${oldRating} -> ${parsedNewRating}`);
                        console.log(`✅ Updated ${player.firstName} ${player.lastName}: ${oldRating} -> ${parsedNewRating}`);
                    } else {
                        unchangedCount++;
                        console.log(`➖ No change needed for ${player.firstName} ${player.lastName}`);
                    }
                } else {
                    logUpdate(`Player not found for ID: ${playerId}`, 'WARN');
                    console.log(`❌ Player not found for ID: ${playerId}`);
                }
            } catch (dbError) {
                logUpdate(`Database error for playerId ${playerId}: ${dbError.message}`, 'ERROR');
                console.error(`❌ Database error for playerId ${playerId}:`, dbError.message);
                // Continue processing other updates instead of failing completely
            }
        }
        
        logUpdate(`Fargo update completed. Updated: ${updatedCount}, Unchanged: ${unchangedCount}`);
        res.json({ success: true, updatedCount, unchangedCount, changes, backupFile });
        
    } catch (error) {
        logUpdate(`Error updating Fargo ratings: ${error.message}`, 'ERROR');
        res.status(500).json({ success: false, message: 'Error updating Fargo ratings', error: error.message });
    }
});

// GET /api/fargo/check-promotions - Check for players ready for promotion
router.get('/check-promotions', async (req, res) => {
    try {
        console.log('Checking for players ready for promotion');
        
        // Ladder configuration
        const ladderConfig = {
            '499-under': { min: 0, max: 499, next: '500-549' },
            '500-549': { min: 500, max: 549, next: '550-plus' },
            '550-plus': { min: 550, max: 9999, next: null }
        };
        
        const candidates = [];
        
        // Check each ladder for players who have outgrown it
        for (const [ladderName, config] of Object.entries(ladderConfig)) {
            if (!config.next) continue; // No higher ladder available
            
            const players = await LadderPlayer.find({ 
                ladderName: ladderName,
                isActive: true 
            });
            
            for (const player of players) {
                if (player.fargoRate > config.max) {
                    candidates.push({
                        _id: player._id,
                        firstName: player.firstName,
                        lastName: player.lastName,
                        fargoRate: player.fargoRate,
                        position: player.position,
                        currentLadder: ladderName,
                        targetLadder: config.next
                    });
                }
            }
        }
        
        // Sort by current ladder, then by position
        candidates.sort((a, b) => {
            if (a.currentLadder !== b.currentLadder) {
                return a.currentLadder.localeCompare(b.currentLadder);
            }
            return a.position - b.position;
        });
        
        console.log(`Found ${candidates.length} players ready for promotion`);
        res.json({ success: true, candidates });
        
    } catch (error) {
        console.error('Error checking promotions:', error);
        logUpdate(`Error checking promotions: ${error.message}`, 'ERROR');
        res.status(500).json({ success: false, message: 'Error checking promotions', error: error.message });
    }
});

// POST /api/fargo/promote-players - Promote players to higher ladders
router.post('/promote-players', async (req, res) => {
    const { candidates, fixPositions } = req.body;
    
    console.log('Received promotion request:', JSON.stringify(req.body, null, 2));
    
    // Handle position fix request
    if (fixPositions && (!candidates || candidates.length === 0)) {
        try {
            console.log('Fixing ladder positions for all ladders');
            
            const ladders = ['499-under', '500-549', '550-plus'];
            const results = [];
            
            for (const ladderName of ladders) {
                console.log(`Fixing positions for ${ladderName}`);
                
                // Get all players in this ladder, sorted by current position
                const players = await LadderPlayer.find({ 
                    ladderName: ladderName,
                    isActive: true 
                }).sort({ position: 1 });
                
                let fixedCount = 0;
                
                // Re-index all players to have consecutive positions starting from 1
                for (let i = 0; i < players.length; i++) {
                    const player = players[i];
                    const expectedPosition = i + 1;
                    
                    if (player.position !== expectedPosition) {
                        console.log(`Fixing ${player.firstName} ${player.lastName}: position ${player.position} -> ${expectedPosition}`);
                        player.position = expectedPosition;
                        await player.save();
                        fixedCount++;
                    }
                }
                
                results.push({
                    ladder: ladderName,
                    totalPlayers: players.length,
                    fixedPositions: fixedCount
                });
                
                console.log(`Fixed ${fixedCount} positions in ${ladderName}`);
            }
            
            logUpdate(`Ladder position fix completed. Results: ${JSON.stringify(results)}`);
            return res.json({ success: true, message: 'Ladder positions fixed', results });
            
        } catch (error) {
            console.error('Error fixing ladder positions:', error);
            logUpdate(`Error fixing ladder positions: ${error.message}`, 'ERROR');
            return res.status(500).json({ success: false, message: 'Error fixing ladder positions', error: error.message });
        }
    }
    
    if (!candidates || !Array.isArray(candidates)) {
        console.log('Invalid promotion data provided');
        return res.status(400).json({ success: false, message: 'Invalid promotion data provided.' });
    }
    
    let promotedCount = 0;
    let errorCount = 0;
    const promotions = [];
    
    try {
        // Create a backup before making changes
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `ladder-promotion-backup-${timestamp}.json`);
        
        // Get all current players for backup
        const allPlayers = await LadderPlayer.find({});
        fs.writeFileSync(backupFile, JSON.stringify(allPlayers, null, 2));
        logUpdate(`Backup created: ${backupFile}`);
        
        for (const candidate of candidates) {
            try {
                const { _id, firstName, lastName, fargoRate, position, currentLadder, targetLadder } = candidate;
                
                console.log(`Promoting ${firstName} ${lastName} from ${currentLadder} to ${targetLadder}`);
                
                // Get the player
                const player = await LadderPlayer.findById(_id);
                if (!player) {
                    console.log(`Player not found for ID: ${_id}`);
                    errorCount++;
                    continue;
                }
                
                // Get the target ladder's ID
                const targetLadderDoc = await Ladder.findOne({ name: targetLadder });
                if (!targetLadderDoc) {
                    console.log(`Target ladder not found: ${targetLadder}`);
                    errorCount++;
                    continue;
                }
                
                // Get the next available position in the target ladder
                const maxPosition = await LadderPlayer.findOne({ ladderName: targetLadder })
                    .sort({ position: -1 })
                    .limit(1);
                const newPosition = maxPosition ? maxPosition.position + 1 : 1;
                
                // Update the player's ladder and position
                const oldPosition = player.position;
                player.ladderId = targetLadderDoc._id;
                player.ladderName = targetLadder;
                player.position = newPosition;
                await player.save();
                
                // Re-index remaining players in the original ladder
                console.log(`Re-indexing players in ${currentLadder} after removing position ${oldPosition}`);
                const remainingPlayers = await LadderPlayer.find({ 
                    ladderName: currentLadder,
                    position: { $gt: oldPosition }
                }).sort({ position: 1 });
                
                // Update positions to fill the gap
                for (let i = 0; i < remainingPlayers.length; i++) {
                    const remainingPlayer = remainingPlayers[i];
                    const newPos = oldPosition + i;
                    console.log(`Updating ${remainingPlayer.firstName} ${remainingPlayer.lastName} from position ${remainingPlayer.position} to ${newPos}`);
                    remainingPlayer.position = newPos;
                    await remainingPlayer.save();
                }
                
                promotedCount++;
                promotions.push({
                    playerId: _id,
                    name: `${firstName} ${lastName}`,
                    fargoRate: fargoRate,
                    oldPosition: oldPosition,
                    newPosition: newPosition,
                    fromLadder: currentLadder,
                    toLadder: targetLadder,
                    reindexedCount: remainingPlayers.length
                });
                
                logUpdate(`Promoted ${firstName} ${lastName}: ${currentLadder} (pos ${oldPosition}) -> ${targetLadder} (pos ${newPosition}). Re-indexed ${remainingPlayers.length} players.`);
                console.log(`✅ Promoted ${firstName} ${lastName}: ${currentLadder} -> ${targetLadder}. Re-indexed ${remainingPlayers.length} players.`);
                
            } catch (error) {
                console.error(`Error promoting player ${candidate.firstName} ${candidate.lastName}:`, error);
                errorCount++;
            }
        }
        
        logUpdate(`Ladder promotion completed. Promoted: ${promotedCount}, Errors: ${errorCount}`);
        res.json({ 
            success: true, 
            promotedCount, 
            errorCount, 
            promotions, 
            backupFile 
        });
        
    } catch (error) {
        logUpdate(`Error promoting players: ${error.message}`, 'ERROR');
        res.status(500).json({ success: false, message: 'Error promoting players', error: error.message });
    }
});

// POST /api/fargo/clean-test-matches - Clean test match data from ladder players
router.post('/clean-test-matches', async (req, res) => {
    try {
        console.log('Cleaning test match data from ladder players');
        
        // Create a backup before making changes
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `test-match-cleanup-backup-${timestamp}.json`);
        
        // Get all current players for backup
        const allPlayers = await LadderPlayer.find({});
        fs.writeFileSync(backupFile, JSON.stringify(allPlayers, null, 2));
        logUpdate(`Backup created: ${backupFile}`);
        
        let cleanedCount = 0;
        let playersUpdated = 0;
        const results = [];
        
        // Get all ladder players
        const players = await LadderPlayer.find({ isActive: true });
        
        for (const player of players) {
            let playerUpdated = false;
            let matchesRemoved = 0;
            
            console.log(`Checking player: ${player.firstName} ${player.lastName}`);
            console.log(`Recent matches:`, player.recentMatches);
            console.log(`Total matches: ${player.totalMatches}, Wins: ${player.wins}, Losses: ${player.losses}`);
            
            // Check if player has test email (indicating they might be a test player)
            const isTestPlayer = player.email && /@(ladder\.local|ladder\.temp|test|temp|local|fake|example|dummy)/i.test(player.email);
            
            // Clean recentMatches array
            if (player.recentMatches && player.recentMatches.length > 0) {
                const originalLength = player.recentMatches.length;
                
                // Remove matches that are clearly test data
                player.recentMatches = player.recentMatches.filter(match => {
                    // Keep matches that seem legitimate
                    // Remove matches with test-like data
                    const now = new Date();
                    const isTestMatch = (
                        !match.opponent || 
                        !match.date ||
                        match.date < new Date('2024-01-01') || // Remove very old matches
                        match.date > now || // Remove future dates (test data)
                        (match.notes && /test|demo|fake|dummy/i.test(match.notes))
                    );
                    
                    if (isTestMatch) {
                        matchesRemoved++;
                        console.log(`Removing test match:`, match);
                        return false;
                    }
                    return true;
                });
                
                if (player.recentMatches.length !== originalLength) {
                    playerUpdated = true;
                    cleanedCount += matchesRemoved;
                }
            }
            
            // For Brett and Tito specifically, reset their stats since they have test matches
            const isBrettOrTito = (player.firstName === 'Brett' && player.lastName === 'Gonzalez') || 
                                 (player.firstName === 'Tito' && player.lastName === 'Rodriguez');
            
            if (isBrettOrTito) {
                console.log(`Resetting stats for ${player.firstName} ${player.lastName}`);
                player.totalMatches = 0;
                player.wins = 0;
                player.losses = 0;
                player.recentMatches = []; // Clear all matches
                playerUpdated = true;
                cleanedCount += 2; // Assume 2 matches for each
            }
            
            // Reset match statistics if this is a test player or if we removed matches
            if (isTestPlayer || playerUpdated) {
                if (!isBrettOrTito) { // Don't double-reset Brett and Tito
                    player.totalMatches = 0;
                    player.wins = 0;
                    player.losses = 0;
                    playerUpdated = true;
                }
                
                // Clear active challenges for test players
                if (isTestPlayer) {
                    player.activeChallenges = [];
                }
            }
            
            // Save player if updated
            if (playerUpdated) {
                await player.save();
                playersUpdated++;
                
                results.push({
                    playerId: player._id,
                    name: `${player.firstName} ${player.lastName}`,
                    email: player.email,
                    isTestPlayer: isTestPlayer,
                    matchesRemoved: matchesRemoved,
                    statsReset: isTestPlayer || playerUpdated,
                    isBrettOrTito: isBrettOrTito
                });
                
                console.log(`Cleaned ${player.firstName} ${player.lastName}: removed ${matchesRemoved} matches, stats reset: ${isTestPlayer || playerUpdated}`);
            }
        }
        
        logUpdate(`Test match cleanup completed. Cleaned ${cleanedCount} matches from ${playersUpdated} players.`);
        res.json({ 
            success: true, 
            cleanedCount, 
            playersUpdated, 
            results,
            backupFile 
        });
        
    } catch (error) {
        console.error('Error cleaning test matches:', error);
        logUpdate(`Error cleaning test matches: ${error.message}`, 'ERROR');
        res.status(500).json({ success: false, message: 'Error cleaning test matches', error: error.message });
    }
});

export default router;
