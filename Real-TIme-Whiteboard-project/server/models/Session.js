const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // in minutes
    default: 0,
  },
  activities: [{
    action: {
      type: String,
      enum: [
        'element_created',
        'element_updated', 
        'element_deleted',
        'board_viewed',
        'cursor_moved',
        'tool_changed',
        'zoom_changed',
        'export_triggered'
      ],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // Flexible object for activity details
    },
  }],
  metadata: {
    userAgent: String,
    ipAddress: String,
    screenResolution: {
      width: Number,
      height: Number,
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'tablet', 'mobile'],
      default: 'desktop',
    },
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    overlappedTime: {
      type: Number, // in minutes
      default: 0,
    },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for better query performance
sessionSchema.index({ user: 1, board: 1 });
sessionSchema.index({ startTime: -1 });
sessionSchema.index({ isActive: 1 });

// Method to end session
sessionSchema.methods.endSession = function() {
  if (this.isActive) {
    this.endTime = new Date();
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60)); // in minutes
    this.isActive = false;
  }
  return this.save();
};

// Method to add activity
sessionSchema.methods.addActivity = function(action, details = {}) {
  this.activities.push({
    action,
    details,
    timestamp: new Date(),
  });
  
  // Limit activities to last 1000 to prevent document from growing too large
  if (this.activities.length > 1000) {
    this.activities = this.activities.slice(-1000);
  }
  
  return this.save();
};

// Method to update metadata
sessionSchema.methods.updateMetadata = function(metadata) {
  this.metadata = { ...this.metadata, ...metadata };
  return this.save();
};

// Static method to find active sessions for a board
sessionSchema.statics.findActiveSessions = function(boardId) {
  return this.find({ 
    board: boardId, 
    isActive: true 
  })
  .populate('user', 'name email avatar')
  .sort({ startTime: -1 });
};

// Static method to get user statistics
sessionSchema.statics.getUserStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        startTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        totalActivities: { $sum: { $size: '$activities' } },
        averageSessionDuration: { $avg: '$duration' },
        boardsWorkedOn: { $addToSet: '$board' },
      }
    },
    {
      $addFields: {
        uniqueBoardsCount: { $size: '$boardsWorkedOn' }
      }
    }
  ]);
};

// Static method to get board statistics
sessionSchema.statics.getBoardStats = function(boardId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        board: new mongoose.Types.ObjectId(boardId),
        startTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        totalActivities: { $sum: { $size: '$activities' } },
        averageSessionDuration: { $avg: '$duration' },
        uniqueUsers: { $addToSet: '$user' },
      }
    },
    {
      $addFields: {
        uniqueUsersCount: { $size: '$uniqueUsers' }
      }
    }
  ]);
};

module.exports = mongoose.model('Session', sessionSchema);
