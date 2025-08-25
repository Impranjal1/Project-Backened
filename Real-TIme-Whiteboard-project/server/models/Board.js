const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'viewer',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  elements: [{
    id: String,
    type: {
      type: String,
      enum: ['text', 'sticky', 'shape', 'line', 'arrow', 'pen', 'freehand'],
      required: true,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      default: 100,
    },
    height: {
      type: Number,
      default: 100,
    },
    // Drawing properties
    strokeColor: {
      type: String,
      default: '#111827',
    },
    strokeWidth: {
      type: Number,
      default: 3,
    },
    backgroundColor: {
      type: String,
      default: 'transparent',
    },
    borderColor: {
      type: String,
      default: '#94A3B8',
    },
    textColor: {
      type: String,
      default: '#111827',
    },
    // Text properties
    text: {
      type: String,
      default: '',
    },
    fontSize: {
      type: Number,
      default: 16,
    },
    fontFamily: {
      type: String,
      default: 'Arial',
    },
    textAlign: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'left',
    },
    // Shape and line properties
    x2: Number, // For lines and arrows
    y2: Number, // For lines and arrows
    points: [{
      x: Number,
      y: Number,
    }], // For freehand drawing and pen tool
    // Element state
    isEditing: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    zIndex: {
      type: Number,
      default: 0,
    },
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Made optional to handle legacy elements
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  settings: {
    isPublic: {
      type: Boolean,
      default: false,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    allowAnonymous: {
      type: Boolean,
      default: false,
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    gridSize: {
      type: Number,
      default: 20,
    },
    showGrid: {
      type: Boolean,
      default: false,
    },
    snapToGrid: {
      type: Boolean,
      default: false,
    },
    backgroundColor: {
      type: String,
      default: '#ffffff',
    },
    canvasSize: {
      width: {
        type: Number,
        default: 5000,
      },
      height: {
        type: Number,
        default: 5000,
      },
    },
    permissions: {
      canEdit: {
        type: [String],
        enum: ['owner', 'editor', 'viewer'],
        default: ['owner', 'editor'],
      },
      canComment: {
        type: [String],
        enum: ['owner', 'editor', 'viewer'],
        default: ['owner', 'editor', 'viewer'],
      },
      canInvite: {
        type: [String],
        enum: ['owner', 'editor'],
        default: ['owner'],
      },
    },
  },
  // Real-time collaboration tracking
  activeUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    cursor: {
      x: Number,
      y: Number,
    },
    currentTool: {
      type: String,
      enum: ['select', 'pen', 'text', 'sticky', 'shape', 'line', 'arrow', 'eraser'],
      default: 'select',
    },
    color: {
      type: String,
      default: '#3B82F6',
    },
  }],
  // Board statistics
  stats: {
    totalElements: {
      type: Number,
      default: 0,
    },
    totalViews: {
      type: Number,
      default: 0,
    },
    totalEdits: {
      type: Number,
      default: 0,
    },
    collaborationSessions: {
      type: Number,
      default: 0,
    },
    averageSessionTime: {
      type: Number,
      default: 0, // in minutes
    },
  },
  version: {
    type: Number,
    default: 1,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  shareLinks: [{
    token: {
      type: String,
      required: true,
      index: true,
    },
    permissions: {
      type: String,
      enum: ['view', 'edit', 'admin'],
      default: 'view',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessed: {
      type: Date,
    },
    description: {
      type: String,
      maxlength: 200,
    },
  }],
}, {
  timestamps: true,
});

// Index for better query performance
boardSchema.index({ owner: 1 });
boardSchema.index({ 'collaborators.user': 1 });
boardSchema.index({ createdAt: -1 });

// Virtual for total collaborators count
boardSchema.virtual('collaboratorCount').get(function() {
  return this.collaborators.length;
});

// Method to check if user has access to board
boardSchema.methods.hasAccess = function(userId) {
  const userIdString = userId.toString();
  
  // Check if user is owner
  if (this.owner.toString() === userIdString) {
    return { hasAccess: true, role: 'owner' };
  }
  
  // Check if user is collaborator
  const collaborator = this.collaborators.find(
    collab => collab.user.toString() === userIdString
  );
  
  if (collaborator) {
    return { hasAccess: true, role: collaborator.role };
  }
  
  // Check if board is public
  if (this.settings.isPublic) {
    return { hasAccess: true, role: 'viewer' };
  }
  
  return { hasAccess: false, role: null };
};

// Method to add collaborator
boardSchema.methods.addCollaborator = function(userId, role = 'viewer', addedBy) {
  const existingCollaborator = this.collaborators.find(
    collab => collab.user.toString() === userId.toString()
  );
  
  if (existingCollaborator) {
    // Update existing collaborator role
    existingCollaborator.role = role;
    existingCollaborator.addedAt = new Date();
    existingCollaborator.addedBy = addedBy;
  } else {
    // Add new collaborator
    this.collaborators.push({
      user: userId,
      role: role,
      addedBy: addedBy,
    });
  }
  
  return this.save();
};

// Method to remove collaborator
boardSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(
    collab => collab.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to update last modified
boardSchema.methods.updateLastModified = function(userId) {
  this.lastModified = new Date();
  this.lastModifiedBy = userId;
  this.version += 1;
  this.stats.totalEdits += 1;
  return this.save();
};

// Method to add active user
boardSchema.methods.addActiveUser = function(userId, userInfo = {}) {
  const existingUserIndex = this.activeUsers.findIndex(
    activeUser => activeUser.user.toString() === userId.toString()
  );
  
  if (existingUserIndex >= 0) {
    // Update existing active user
    this.activeUsers[existingUserIndex].lastActivity = new Date();
    if (userInfo.cursor) this.activeUsers[existingUserIndex].cursor = userInfo.cursor;
    if (userInfo.currentTool) this.activeUsers[existingUserIndex].currentTool = userInfo.currentTool;
    if (userInfo.color) this.activeUsers[existingUserIndex].color = userInfo.color;
  } else {
    // Add new active user
    this.activeUsers.push({
      user: userId,
      joinedAt: new Date(),
      lastActivity: new Date(),
      cursor: userInfo.cursor || { x: 0, y: 0 },
      currentTool: userInfo.currentTool || 'select',
      color: userInfo.color || '#3B82F6',
    });
    this.stats.collaborationSessions += 1;
  }
  
  return this.save();
};

// Method to remove active user
boardSchema.methods.removeActiveUser = function(userId) {
  const userIndex = this.activeUsers.findIndex(
    activeUser => activeUser.user.toString() === userId.toString()
  );
  
  if (userIndex >= 0) {
    // Calculate session time
    const joinedAt = this.activeUsers[userIndex].joinedAt;
    const sessionTime = (new Date() - joinedAt) / (1000 * 60); // in minutes
    
    // Update average session time
    const totalSessions = this.stats.collaborationSessions;
    if (totalSessions > 0) {
      this.stats.averageSessionTime = 
        ((this.stats.averageSessionTime * (totalSessions - 1)) + sessionTime) / totalSessions;
    }
    
    this.activeUsers.splice(userIndex, 1);
  }
  
  return this.save();
};

// Method to update user cursor position
boardSchema.methods.updateUserCursor = function(userId, cursor) {
  const userIndex = this.activeUsers.findIndex(
    activeUser => activeUser.user.toString() === userId.toString()
  );
  
  if (userIndex >= 0) {
    this.activeUsers[userIndex].cursor = cursor;
    this.activeUsers[userIndex].lastActivity = new Date();
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to update user tool
boardSchema.methods.updateUserTool = function(userId, tool) {
  const userIndex = this.activeUsers.findIndex(
    activeUser => activeUser.user.toString() === userId.toString()
  );
  
  if (userIndex >= 0) {
    this.activeUsers[userIndex].currentTool = tool;
    this.activeUsers[userIndex].lastActivity = new Date();
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to add element
boardSchema.methods.addElement = function(element, userId) {
  element.createdBy = userId;
  element.lastModifiedBy = userId;
  element.createdAt = new Date();
  element.updatedAt = new Date();
  
  this.elements.push(element);
  this.stats.totalElements = this.elements.length;
  return this.updateLastModified(userId);
};

// Method to update element
boardSchema.methods.updateElement = function(elementId, updates, userId) {
  const elementIndex = this.elements.findIndex(el => el.id === elementId);
  
  if (elementIndex >= 0) {
    Object.assign(this.elements[elementIndex], updates);
    this.elements[elementIndex].lastModifiedBy = userId;
    this.elements[elementIndex].updatedAt = new Date();
    return this.updateLastModified(userId);
  }
  
  return Promise.resolve(this);
};

// Method to remove element
boardSchema.methods.removeElement = function(elementId, userId) {
  this.elements = this.elements.filter(el => el.id !== elementId);
  this.stats.totalElements = this.elements.length;
  return this.updateLastModified(userId);
};

// Method to increment view count
boardSchema.methods.incrementViewCount = function() {
  this.stats.totalViews += 1;
  return this.save();
};

// Static method to find public boards
boardSchema.statics.findPublicBoards = function(limit = 10) {
  return this.find({ 'settings.isPublic': true })
    .populate('owner', 'name email avatar')
    .populate('collaborators.user', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find boards by user
boardSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'collaborators.user': userId }
    ]
  })
  .populate('owner', 'name email avatar')
  .populate('collaborators.user', 'name email avatar')
  .sort({ lastModified: -1 });
};

module.exports = mongoose.model('Board', boardSchema);
