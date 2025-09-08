// Automatic hourly backup scheduler for ladder data
// This runs continuously and creates backups every hour

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

class AutoBackupScheduler {
  constructor() {
    this.isRunning = false;
    this.backupInterval = null;
    this.maxHourlyBackups = 24; // Keep 24 hourly backups (1 day)
  }

  async createHourlyBackup() {
    try {
      console.log(`\n🕐 [${new Date().toISOString()}] Creating hourly backup...`);
      
      // Run the backup script
      const { stdout, stderr } = await execAsync('node backup-ladder-data.js hourly');
      
      if (stderr) {
        console.error('❌ Backup error:', stderr);
        return;
      }
      
      console.log('✅ Hourly backup completed successfully');
      
      // Clean up old hourly backups (keep only last 24)
      await this.cleanupOldBackups();
      
    } catch (error) {
      console.error('❌ Failed to create hourly backup:', error.message);
    }
  }

  async cleanupOldBackups() {
    try {
      const hourlyBackupsDir = './ladder-backups/hourly-backups';
      
      if (!fs.existsSync(hourlyBackupsDir)) {
        return;
      }

      const backups = fs.readdirSync(hourlyBackupsDir)
        .filter(dir => dir.startsWith('backup-'))
        .map(dir => ({
          name: dir,
          path: path.join(hourlyBackupsDir, dir),
          created: fs.statSync(path.join(hourlyBackupsDir, dir)).birthtime
        }))
        .sort((a, b) => b.created - a.created); // Sort by newest first

      // Remove backups beyond the limit
      if (backups.length > this.maxHourlyBackups) {
        const toDelete = backups.slice(this.maxHourlyBackups);
        
        for (const backup of toDelete) {
          console.log(`   🗑️  Removing old backup: ${backup.name}`);
          fs.rmSync(backup.path, { recursive: true, force: true });
        }
        
        console.log(`   ✅ Cleaned up ${toDelete.length} old hourly backups`);
      }
      
    } catch (error) {
      console.error('❌ Error cleaning up old backups:', error.message);
    }
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  Auto-backup scheduler is already running!');
      return;
    }

    console.log('🚀 Starting automatic hourly backup scheduler...');
    console.log('📅 Backups will be created every hour');
    console.log('🗑️  Old backups will be automatically cleaned up (keeping last 24)');
    console.log('⏹️  Press Ctrl+C to stop\n');

    this.isRunning = true;

    // Create initial backup
    this.createHourlyBackup();

    // Schedule hourly backups
    this.backupInterval = setInterval(() => {
      this.createHourlyBackup();
    }, 60 * 60 * 1000); // 1 hour in milliseconds

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n⏹️  Stopping auto-backup scheduler...');
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n⏹️  Stopping auto-backup scheduler...');
      this.stop();
      process.exit(0);
    });
  }

  stop() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    this.isRunning = false;
    console.log('✅ Auto-backup scheduler stopped');
  }
}

// Start the scheduler
const scheduler = new AutoBackupScheduler();
scheduler.start();
