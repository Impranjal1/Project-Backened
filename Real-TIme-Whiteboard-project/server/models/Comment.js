const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  // Position on canvas where comment was made
  position: {
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
  },
  // Element this comment is attached to (optional)
  element: {
    id: String,
    type: String,
  },
  // Comment thread support
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  // Comment status
  status: {
    type: String,
    enum: ['active', 'resolved', 'archived'],
    default: 'active',
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: {
    type: Date,
  },
  // Reactions/acknowledgments
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['like', 'heart', 'thumbsup', 'thumbsdown', 'laugh', 'confused'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // Mentions in comment
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Comment metadata
  isEdited: {
    type: Boolean,
    default: false,
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // Visibility settings
  visibility: {
    type: String,
    enum: ['public', 'collaborators', 'private'],
    default: 'collaborators',
  },
}, {
  timestamps: true,
});

// Index for better query performance
commentSchema.index({ board: 1, status: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ 'position.x': 1, 'position.y': 1 });

// Virtual for reply count
commentSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// Virtual for reaction count
commentSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Method to add reply
commentSchema.methods.addReply = function(replyId) {
  if (!this.replies.includes(replyId)) {
    this.replies.push(replyId);
  }
  return this.save();
};

// Method to remove reply
commentSchema.methods.removeReply = function(replyId) {
  this.replies = this.replies.filter(id => id.toString() !== replyId.toString());
  return this.save();
};

// Method to add reaction
commentSchema.methods.addReaction = function(userId, reactionType) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    type: reactionType,
  });
  
  return this.save();
};

// Method to remove reaction
commentSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to edit comment
commentSchema.methods.editContent = function(newContent) {
  // Store old content in history
  this.editHistory.push({
    content: this.content,
    editedAt: new Date(),
  });
  
  this.content = newContent;
  this.isEdited = true;
  
  return this.save();
};

// Method to resolve comment
commentSchema.methods.resolve = function(userId) {
  this.status = 'resolved';
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  return this.save();
};

// Method to reopen comment
commentSchema.methods.reopen = function() {
  this.status = 'active';
  this.resolvedBy = null;
  this.resolvedAt = null;
  return this.save();
};

// Method to add mention
commentSchema.methods.addMention = function(userId) {
  if (!this.mentions.includes(userId)) {
    this.mentions.push(userId);
  }
  return this.save();
};

// Static method to find comments by board
commentSchema.statics.findByBoard = function(boardId, status = 'active') {
  return this.find({ 
    board: boardId, 
    status: status,
    parentComment: null // Only get top-level comments
  })
  .populate('author', 'name email avatar')
  .populate('resolvedBy', 'name email')
  .populate('mentions', 'name email')
  .populate({
    path: 'replies',
    populate: {
      path: 'author',
      select: 'name email avatar'
    }
  })
  .sort({ createdAt: -1 });
};

// Static method to find comments in area
commentSchema.statics.findInArea = function(boardId, x1, y1, x2, y2) {
  return this.find({
    board: boardId,
    status: 'active',
    'position.x': { $gte: Math.min(x1, x2), $lte: Math.max(x1, x2) },
    'position.y': { $gte: Math.min(y1, y2), $lte: Math.max(y1, y2) },
  })
  .populate('author', 'name email avatar')
  .sort({ createdAt: -1 });
};

// Static method to find comments by user
commentSchema.statics.findByUser = function(userId) {
  return this.find({ 
    $or: [
      { author: userId },
      { mentions: userId }
    ]
  })
  .populate('board', 'title')
  .populate('author', 'name email avatar')
  .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Comment', commentSchema);
