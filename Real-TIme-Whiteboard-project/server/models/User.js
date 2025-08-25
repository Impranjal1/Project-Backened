const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  provider: {
    type: String,
    enum: ['google', 'local'],
    default: 'local',
  },
  password: {
    type: String,
    // Required only for local authentication
    required: function() {
      return this.provider === 'local';
    },
  },
  isVerified: {
    type: Boolean,
    default: function() {
      // Google users and test accounts are automatically verified
      return this.provider === 'google' || this.isTestAccount;
    },
  },
  // Test account flag
  isTestAccount: {
    type: Boolean,
    default: false,
  },
  // User preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light',
    },
    language: {
      type: String,
      default: 'en',
    },
    defaultTool: {
      type: String,
      enum: ['select', 'pen', 'text', 'sticky', 'shape', 'line', 'arrow'],
      default: 'select',
    },
    cursorColor: {
      type: String,
      default: '#3B82F6',
    },
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: true,
      },
      boardInvites: {
        type: Boolean,
        default: true,
      },
      boardUpdates: {
        type: Boolean,
        default: true,
      },
    },
  },
  // Activity tracking
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  currentBoard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  // User's owned boards
  boards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
  }],
  // Boards where user is a collaborator
  collaborations: [{
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'viewer',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // User statistics
  stats: {
    boardsCreated: {
      type: Number,
      default: 0,
    },
    boardsCollaborated: {
      type: Number,
      default: 0,
    },
    totalElements: {
      type: Number,
      default: 0,
    },
    hoursActive: {
      type: Number,
      default: 0,
    },
  },
}, {
  timestamps: true,
});

// Virtual for user's full name
userSchema.virtual('displayName').get(function() {
  return this.name;
});

// Method to get user's initials for avatar
userSchema.methods.getInitials = function() {
  return this.name
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Method to update last active timestamp
userSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Method to set user as online/offline
userSchema.methods.setOnlineStatus = function(isOnline, boardId = null) {
  this.isOnline = isOnline;
  this.currentBoard = isOnline ? boardId : null;
  this.lastActiveAt = new Date();
  return this.save();
};

// Method to check if user has access to a board
userSchema.methods.hasAccessToBoard = function(boardId) {
  // Check if user owns the board
  if (this.boards.includes(boardId)) {
    return { hasAccess: true, role: 'owner' };
  }
  
  // Check if user is a collaborator
  const collaboration = this.collaborations.find(
    collab => collab.boardId.toString() === boardId.toString()
  );
  
  if (collaboration) {
    return { hasAccess: true, role: collaboration.role };
  }
  
  return { hasAccess: false, role: null };
};

// Method to add board collaboration
userSchema.methods.addCollaboration = function(boardId, role = 'viewer') {
  // Check if collaboration already exists
  const existingIndex = this.collaborations.findIndex(
    collab => collab.boardId.toString() === boardId.toString()
  );
  
  if (existingIndex >= 0) {
    // Update existing collaboration
    this.collaborations[existingIndex].role = role;
    this.collaborations[existingIndex].joinedAt = new Date();
  } else {
    // Add new collaboration
    this.collaborations.push({
      boardId,
      role,
      joinedAt: new Date(),
    });
    this.stats.boardsCollaborated += 1;
  }
  
  return this.save();
};

// Method to remove board collaboration
userSchema.methods.removeCollaboration = function(boardId) {
  this.collaborations = this.collaborations.filter(
    collab => collab.boardId.toString() !== boardId.toString()
  );
  this.stats.boardsCollaborated = Math.max(0, this.stats.boardsCollaborated - 1);
  return this.save();
};

// Static method to find active users
userSchema.statics.findActiveUsers = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.find({
    $or: [
      { isOnline: true },
      { lastActiveAt: { $gte: fiveMinutesAgo } }
    ]
  }).select('name email avatar isOnline lastActiveAt currentBoard');
};

// Index for better query performance
userSchema.index({ isOnline: 1 });
userSchema.index({ lastActiveAt: -1 });

module.exports = mongoose.model('User', userSchema);
