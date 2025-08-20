import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: ['match', 'deadline', 'reminder'],
    default: 'match'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: ''
  },
  matchDetails: {
    opponent: String,
    gameType: String,
    raceLength: String,
    division: String,
    proposalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal'
    }
  },
  isAllDay: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
calendarEventSchema.index({ userId: 1, date: 1 });
calendarEventSchema.index({ date: 1, eventType: 1 });

// Update the updatedAt field before saving
calendarEventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Calendar = mongoose.model('Calendar', calendarEventSchema);

export default Calendar;
