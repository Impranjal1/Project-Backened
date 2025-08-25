const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Check for JWT token in headers
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Middleware to check if user is board owner
const isBoardOwner = async (req, res, next) => {
  try {
    const Board = require('../models/Board');
    const board = await Board.findById(req.params.boardId);
    
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You are not the owner of this board.' });
    }
    
    req.board = board;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Middleware to check if user has board access (owner, editor, or viewer)
const hasBoardAccess = async (req, res, next) => {
  try {
    const Board = require('../models/Board');
    const board = await Board.findById(req.params.boardId);
    
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    
    const access = board.hasAccess(req.user._id);
    
    if (!access.hasAccess) {
      return res.status(403).json({ message: 'Access denied. You do not have permission to access this board.' });
    }
    
    req.board = board;
    req.userRole = access.role;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Middleware to check if user can edit board (owner or editor)
const canEditBoard = async (req, res, next) => {
  try {
    const Board = require('../models/Board');
    const board = await Board.findById(req.params.boardId);
    
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    
    const access = board.hasAccess(req.user._id);
    
    if (!access.hasAccess || (access.role !== 'owner' && access.role !== 'editor')) {
      return res.status(403).json({ message: 'Access denied. You do not have edit permissions for this board.' });
    }
    
    req.board = board;
    req.userRole = access.role;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  isAuthenticated,
  isBoardOwner,
  hasBoardAccess,
  canEditBoard,
};
