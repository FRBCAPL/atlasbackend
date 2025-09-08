// Backup Manager - Control your ladder data backups
// Usage: node backup-manager.js [command]

import fs from 'fs';
import path from 'path';

const commands = {
  'create-original': 'Create original state backup',
  'create-hourly': 'Create single hourly backup', 
  'start-auto': 'Start automatic hourly backups',
  'list-backups': 'List all available backups',
  'restore-original': 'Restore to original state',
  'help': 'Show this help message'
};

function showHelp() {
  console.log('🔧 LADDER BACKUP MANAGER');
  console.log('========================\n');
  
  console.log('Available commands:');
  Object.entries(commands).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(20)} - ${desc}`);
  });
  
  console.log('\nExamples:');
  console.log('  node backup-manager.js create-original');
  console.log('  node backup-manager.js start-auto');
  console.log('  node backup-manager.js list-backups');
  console.log('  node backup-manager.js restore-original');
}

function listBackups() {
  console.log('📁 AVAILABLE BACKUPS');
  console.log('===================\n');
  
  const backupsDir = './ladder-backups';
  
  if (!fs.existsSync(backupsDir)) {
    console.log('❌ No backups directory found');
    return;
  }

  // Check for original state backup
  const originalDir = path.join(backupsDir, 'original-state');
  if (fs.existsSync(originalDir)) {
    const stats = fs.statSync(originalDir);
    console.log('🏆 ORIGINAL STATE BACKUP:');
    console.log(`   📅 Created: ${stats.birthtime.toISOString()}`);
    console.log(`   📁 Path: ${originalDir}\n`);
  } else {
    console.log('⚠️  No original state backup found\n');
  }

  // Check for hourly backups
  const hourlyDir = path.join(backupsDir, 'hourly-backups');
  if (fs.existsSync(hourlyDir)) {
    const hourlyBackups = fs.readdirSync(hourlyDir)
      .filter(dir => dir.startsWith('backup-'))
      .map(dir => {
        const fullPath = path.join(hourlyDir, dir);
        const stats = fs.statSync(fullPath);
        return {
          name: dir,
          path: fullPath,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.created - a.created);

    if (hourlyBackups.length > 0) {
      console.log(`🕐 HOURLY BACKUPS (${hourlyBackups.length} found):`);
      hourlyBackups.forEach((backup, index) => {
        console.log(`   ${index + 1}. ${backup.name}`);
        console.log(`      📅 Created: ${backup.created.toISOString()}`);
        console.log(`      📁 Path: ${backup.path}\n`);
      });
    } else {
      console.log('⚠️  No hourly backups found\n');
    }
  } else {
    console.log('⚠️  No hourly backups directory found\n');
  }

  // Check for manual backups
  const manualBackups = fs.readdirSync(backupsDir)
    .filter(dir => dir.startsWith('backup-') && !dir.includes('hourly'))
    .map(dir => {
      const fullPath = path.join(backupsDir, dir);
      const stats = fs.statSync(fullPath);
      return {
        name: dir,
        path: fullPath,
        created: stats.birthtime
      };
    })
    .sort((a, b) => b.created - a.created);

  if (manualBackups.length > 0) {
    console.log(`📋 MANUAL BACKUPS (${manualBackups.length} found):`);
    manualBackups.forEach((backup, index) => {
      console.log(`   ${index + 1}. ${backup.name}`);
      console.log(`      📅 Created: ${backup.created.toISOString()}`);
      console.log(`      📁 Path: ${backup.path}\n`);
    });
  }
}

async function executeCommand(command) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    let cmd;
    
    switch (command) {
      case 'create-original':
        console.log('🏆 Creating original state backup...\n');
        cmd = 'node backup-ladder-data.js original';
        break;
        
      case 'create-hourly':
        console.log('🕐 Creating hourly backup...\n');
        cmd = 'node backup-ladder-data.js hourly';
        break;
        
      case 'start-auto':
        console.log('🚀 Starting automatic backup scheduler...\n');
        cmd = 'node auto-backup-scheduler.js';
        break;
        
      case 'restore-original':
        console.log('🔄 Restoring to original state...\n');
        cmd = 'node restore-ladder-data.js ./ladder-backups/original-state';
        break;
        
      case 'list-backups':
        listBackups();
        return;
        
      case 'help':
        showHelp();
        return;
        
      default:
        console.log(`❌ Unknown command: ${command}\n`);
        showHelp();
        return;
    }
    
    const { stdout, stderr } = await execAsync(cmd);
    
    if (stderr) {
      console.error('❌ Error:', stderr);
    } else {
      console.log(stdout);
    }
    
  } catch (error) {
    console.error('❌ Command failed:', error.message);
  }
}

// Get command from command line arguments
const command = process.argv[2] || 'help';
executeCommand(command);
