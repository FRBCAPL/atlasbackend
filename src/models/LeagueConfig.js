import mongoose from 'mongoose';

const leagueConfigSchema = new mongoose.Schema({
  // League Information
  leagueName: { type: String, required: true },
  leagueDescription: { type: String },
  
  // Google Sheets Backup Configuration
  googleSheetsBackup: {
    enabled: { type: Boolean, default: false },
    sheetId: { type: String },
    sheetName: { type: String, default: 'Player Backup' },
    apiKey: { type: String }, // Stored encrypted
    lastBackupDate: { type: Date },
    backupFrequency: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly', 'manual'], 
      default: 'weekly' 
    },
    autoBackup: { type: Boolean, default: true }
  },
  
  // League Settings
  divisions: [{ type: String }],
  defaultDivision: { type: String },
  
  // Contact Information
  adminEmail: { type: String },
  adminPhone: { type: String },
  
  // Registration Settings
  requireApproval: { type: Boolean, default: true },
  allowSelfRegistration: { type: Boolean, default: true },
  registrationFee: { type: Number, default: 0 },
  
  // Match Settings
  defaultMatchDuration: { type: Number, default: 60 }, // minutes
  allowChallenges: { type: Boolean, default: true },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Ensure only one config per league
leagueConfigSchema.index({ leagueName: 1 }, { unique: true });

export default mongoose.models.LeagueConfig || mongoose.model('LeagueConfig', leagueConfigSchema);
