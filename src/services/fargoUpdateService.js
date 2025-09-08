import mongoose from 'mongoose';
import LadderPlayer from '../models/LadderPlayer.js';
import LadderProfile from '../models/LadderProfile.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FargoUpdateService {
  constructor() {
    this.updateLogPath = path.join(__dirname, '../../logs/fargo-updates.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.updateLogPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(logEntry.trim());
    fs.appendFileSync(this.updateLogPath, logEntry);
  }

  async updateFargoRatings(ratingData, ladderName = '499-under') {
    try {
      this.log(`Starting Fargo rating update for ${ladderName}`);
      
      if (!ratingData || !Array.isArray(ratingData)) {
        throw new Error('Invalid rating data format');
      }

      // Get all players for the specified ladder
      const players = await LadderPlayer.find({ ladderName }).sort({ position: 1 });
      this.log(`Found ${players.length} players in ${ladderName} ladder`);

      if (players.length !== ratingData.length) {
        this.log(`Warning: Expected ${ratingData.length} ratings, found ${players.length} players`, 'WARN');
      }

      const results = {
        updated: 0,
        unchanged: 0,
        errors: [],
        changes: []
      };

      // Update each player's Fargo rating
      for (let i = 0; i < Math.min(players.length, ratingData.length); i++) {
        const player = players[i];
        const newRating = ratingData[i];
        const oldRating = player.fargoRate;

        try {
          // Skip if rating is null or undefined
          if (newRating === null || newRating === undefined) {
            this.log(`Skipping ${player.firstName} ${player.lastName} - no rating provided`);
            continue;
          }

          // Update the rating
          player.fargoRate = newRating;
          await player.save();

          // Also update LadderProfile if it exists
          const profile = await LadderProfile.findOne({ 
            userId: player.userId || player._id 
          });
          if (profile) {
            profile.fargoRate = newRating;
            await profile.save();
          }

          if (oldRating !== newRating) {
            results.updated++;
            results.changes.push({
              player: `${player.firstName} ${player.lastName}`,
              position: player.position,
              oldRating,
              newRating
            });
            this.log(`Updated ${player.firstName} ${player.lastName}: ${oldRating} → ${newRating}`);
          } else {
            results.unchanged++;
          }

        } catch (error) {
          results.errors.push({
            player: `${player.firstName} ${player.lastName}`,
            error: error.message
          });
          this.log(`Error updating ${player.firstName} ${player.lastName}: ${error.message}`, 'ERROR');
        }
      }

      this.log(`Fargo rating update completed. Updated: ${results.updated}, Unchanged: ${results.unchanged}, Errors: ${results.errors.length}`);
      
      return results;

    } catch (error) {
      this.log(`Fargo rating update failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async getCurrentRatings(ladderName = '499-under') {
    try {
      const players = await LadderPlayer.find({ ladderName })
        .sort({ position: 1 })
        .select('firstName lastName position fargoRate');
      
      return players.map(player => ({
        position: player.position,
        name: `${player.firstName} ${player.lastName}`,
        fargoRate: player.fargoRate
      }));
    } catch (error) {
      this.log(`Error fetching current ratings: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async getUpdateHistory(limit = 50) {
    try {
      if (!fs.existsSync(this.updateLogPath)) {
        return [];
      }

      const logContent = fs.readFileSync(this.updateLogPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      return lines.slice(-limit).map(line => {
        const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+)$/);
        if (match) {
          return {
            timestamp: match[1],
            level: match[2],
            message: match[3]
          };
        }
        return null;
      }).filter(Boolean);
    } catch (error) {
      this.log(`Error reading update history: ${error.message}`, 'ERROR');
      return [];
    }
  }

  // Method to load ratings from a file (for manual updates)
  async loadRatingsFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      // Handle CSV format
      if (filePath.endsWith('.csv')) {
        return lines.map(line => {
          const parts = line.split(',');
          const rating = parts[2] ? parseInt(parts[2].trim()) : 0;
          return rating === 0 ? null : rating;
        });
      }
      
      // Handle simple text format (one rating per line)
      return lines.map(line => {
        const rating = parseInt(line.trim());
        return isNaN(rating) ? null : rating;
      });
    } catch (error) {
      this.log(`Error loading ratings from file: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  // Method to create a backup of current ratings
  async createBackup(ladderName = '499-under') {
    try {
      const players = await this.getCurrentRatings(ladderName);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(__dirname, `../../backups/fargo-backup-${ladderName}-${timestamp}.json`);
      
      // Ensure backup directory exists
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      fs.writeFileSync(backupPath, JSON.stringify(players, null, 2));
      this.log(`Backup created: ${backupPath}`);
      
      return backupPath;
    } catch (error) {
      this.log(`Error creating backup: ${error.message}`, 'ERROR');
      throw error;
    }
  }
}

export default new FargoUpdateService();


