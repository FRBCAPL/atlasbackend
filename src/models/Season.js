const mongoose = require('mongoose');

const seasonSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Summer 2025"
  division: { type: String, required: true }, // e.g., "FRBCAPL TEST"
  
  // Season dates
  seasonStart: { type: Date, required: true },
  seasonEnd: { type: Date, required: true },
  
  // Phase dates
  phase1Start: { type: Date, required: true }, // Scheduled matches
  phase1End: { type: Date, required: true },
  phase2Start: { type: Date, required: true }, // Challenge matches
  phase2End: { type: Date, required: true },
  
  // Week configuration
  totalWeeks: { type: Number, required: true }, // Total weeks in season
  phase1Weeks: { type: Number, required: true }, // Weeks 1-6
  phase2Weeks: { type: Number, required: true }, // Weeks 7-10
  
  // Status
  isActive: { type: Boolean, default: true },
  isCurrent: { type: Boolean, default: false }, // Only one season per division should be current
  
  // URLs for scraping
  scheduleUrl: { type: String, required: true },
  standingsUrl: { type: String, required: true },
  
  // Metadata
  description: { type: String },
  rules: { type: String }, // Link to bylaws or rules document
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for efficient queries
seasonSchema.index({ division: 1, isCurrent: 1 });
seasonSchema.index({ division: 1, seasonStart: 1, seasonEnd: 1 });

// Pre-save middleware to update timestamps
seasonSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to get current week number
seasonSchema.methods.getCurrentWeek = function() {
  const now = new Date();
  if (now < this.seasonStart || now > this.seasonEnd) {
    return null; // Outside season
  }
  
  const weekDiff = Math.floor((now - this.seasonStart) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(this.totalWeeks, weekDiff + 1));
};

// Method to get current phase
seasonSchema.methods.getCurrentPhase = function() {
  const now = new Date();
  
  if (now < this.seasonStart || now > this.seasonEnd) {
    return 'offseason';
  } else if (now >= this.phase2Start && now <= this.phase2End) {
    return 'challenge';
  } else if (now >= this.phase1Start && now <= this.phase1End) {
    return 'scheduled';
  } else {
    return 'transition'; // Between phases
  }
};

// Method to check if season is active
seasonSchema.methods.isSeasonActive = function() {
  const now = new Date();
  return now >= this.seasonStart && now <= this.seasonEnd;
};

// Static method to get current season for a division
seasonSchema.statics.getCurrentSeason = async function(division) {
  return await this.findOne({ 
    division, 
    isCurrent: true,
    isActive: true 
  });
};

// Static method to get current phase and week for a division
seasonSchema.statics.getCurrentPhaseAndWeek = async function(division) {
  const season = await this.getCurrentSeason(division);
  
  if (!season) {
    return {
      currentWeek: null,
      phase: 'offseason',
      isActive: false,
      season: null
    };
  }
  
  const currentWeek = season.getCurrentWeek();
  const phase = season.getCurrentPhase();
  
  return {
    currentWeek,
    phase,
    isActive: season.isSeasonActive(),
    season: {
      name: season.name,
      seasonStart: season.seasonStart,
      seasonEnd: season.seasonEnd,
      phase1Start: season.phase1Start,
      phase1End: season.phase1End,
      phase2Start: season.phase2Start,
      phase2End: season.phase2End,
      totalWeeks: season.totalWeeks,
      phase1Weeks: season.phase1Weeks,
      phase2Weeks: season.phase2Weeks
    }
  };
};

module.exports = mongoose.model('Season', seasonSchema); 