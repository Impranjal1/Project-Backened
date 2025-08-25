const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'board_invite',
      'board_shared',
      'comment_added',
      'comment_reply',
      'comment_mention',
      'comment_resolved',
      'element_added',
      'board_updated',
      'user_joined',
      'user_left',
      'role_changed'
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  // Related entities
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  },
  // Notification data
  data: {
    type: mongoose.Schema.Types.Mixed, // Flexible object for notification-specific data
  },
  // Status
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  // Action URLs
  actionUrl: {
    type: String,
  },
  actionText: {
    type: String,
  },
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  // Delivery settings
  deliveryMethods: [{
    type: String,
    enum: ['in_app', 'email', 'push'],
  }],
  deliveryStatus: {
    in_app: {
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
    },
    email: {
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      error: { type: String },
    },
    push: {
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      error: { type: String },
    },
  },
  // Expiration
  expiresAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for better query performance
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ sender: 1 });
notificationSchema.index({ board: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
  }
  return this.save();
};

// Method to mark delivery status
notificationSchema.methods.markDelivered = function(method, error = null) {
  if (this.deliveryStatus[method]) {
    this.deliveryStatus[method].delivered = !error;
    this.deliveryStatus[method].deliveredAt = new Date();
    if (error) {
      this.deliveryStatus[method].error = error;
    }
  }
  return this.save();
};

// Static method to create board invite notification
notificationSchema.statics.createBoardInvite = function(recipientId, senderId, boardId, role) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    board: boardId,
    type: 'board_invite',
    title: 'Board Invitation',
    message: `You've been invited to collaborate on a board as ${role}`,
    data: { role },
    actionUrl: `/boards/${boardId}`,
    actionText: 'View Board',
    priority: 'normal',
    deliveryMethods: ['in_app', 'email'],
  });
};

// Static method to create comment notification
notificationSchema.statics.createCommentNotification = function(recipientId, senderId, boardId, commentId, type = 'comment_added') {
  const messages = {
    comment_added: 'New comment added to your board',
    comment_reply: 'Someone replied to your comment',
    comment_mention: 'You were mentioned in a comment',
    comment_resolved: 'Your comment has been resolved',
  };
  
  return this.create({
    recipient: recipientId,
    sender: senderId,
    board: boardId,
    comment: commentId,
    type,
    title: 'Board Comment',
    message: messages[type],
    actionUrl: `/boards/${boardId}?comment=${commentId}`,
    actionText: 'View Comment',
    priority: type === 'comment_mention' ? 'high' : 'normal',
    deliveryMethods: ['in_app', 'email'],
  });
};

// Static method to create board activity notification
notificationSchema.statics.createBoardActivity = function(recipientId, senderId, boardId, activityType, details = {}) {
  const messages = {
    element_added: 'New elements added to the board',
    board_updated: 'Board has been updated',
    user_joined: 'New user joined the board',
    user_left: 'User left the board',
    role_changed: 'Your role has been changed',
  };
  
  return this.create({
    recipient: recipientId,
    sender: senderId,
    board: boardId,
    type: activityType,
    title: 'Board Activity',
    message: messages[activityType],
    data: details,
    actionUrl: `/boards/${boardId}`,
    actionText: 'View Board',
    priority: activityType === 'role_changed' ? 'high' : 'low',
    deliveryMethods: ['in_app'],
  });
};

// Static method to find unread notifications
notificationSchema.statics.findUnread = function(userId) {
  return this.find({ 
    recipient: userId, 
    isRead: false 
  })
  .populate('sender', 'name email avatar')
  .populate('board', 'title')
  .sort({ createdAt: -1 });
};

// Static method to find notifications by user
notificationSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ recipient: userId })
    .populate('sender', 'name email avatar')
    .populate('board', 'title')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to mark all as read for user
notificationSchema.statics.markAllRead = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static method to clean up old notifications
notificationSchema.statics.cleanupOld = function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.deleteMany({
    isRead: true,
    createdAt: { $lt: cutoffDate }
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
