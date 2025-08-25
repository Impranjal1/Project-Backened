// Export all models for easy importing
const User = require('./User');
const Board = require('./Board');
const Session = require('./Session');
const Comment = require('./Comment');
const Notification = require('./Notification');
const BoardTemplate = require('./BoardTemplate');

module.exports = {
  User,
  Board,
  Session,
  Comment,
  Notification,
  BoardTemplate,
};
