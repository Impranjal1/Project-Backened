const express = require('express');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/search
// @desc    Search users by email or name
// @access  Private
router.get('/search', isAuthenticated, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters long' });
    }
    
    const searchRegex = new RegExp(q.trim(), 'i');
    
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        {
          $or: [
            { name: searchRegex },
            { email: searchRegex }
          ]
        }
      ]
    })
    .select('name email avatar')
    .limit(parseInt(limit));
    
    const formattedUsers = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      initials: user.getInitials(),
    }));
    
    res.json({
      success: true,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users/profile/:userId
// @desc    Get user profile by ID
// @access  Private
router.get('/profile/:userId', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('name email avatar createdAt')
      .populate('boards', 'title description createdAt settings');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Only show public boards or boards where current user is collaborator
    const visibleBoards = user.boards.filter(board => 
      board.settings.isPublic || 
      board.owner.toString() === req.user._id.toString() ||
      board.collaborators.some(collab => collab.user.toString() === req.user._id.toString())
    );
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
        initials: user.getInitials(),
        boards: visibleBoards,
        boardCount: visibleBoards.length,
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('boards')
      .populate('collaborations.boardId');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const stats = {
      totalBoards: user.boards.length,
      totalCollaborations: user.collaborations.length,
      recentActivity: user.lastLogin,
      memberSince: user.createdAt,
    };
    
    // Get recent boards (last 5)
    const recentBoards = user.boards
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      .slice(0, 5)
      .map(board => ({
        _id: board._id,
        title: board.title,
        lastModified: board.lastModified,
        elementCount: board.elements.length,
      }));
    
    res.json({
      success: true,
      stats,
      recentBoards
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', isAuthenticated, async (req, res) => {
  try {
    const { theme, notifications, privacy } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Initialize preferences if they don't exist
    if (!user.preferences) {
      user.preferences = {};
    }
    
    if (theme) user.preferences.theme = theme;
    if (notifications !== undefined) user.preferences.notifications = notifications;
    if (privacy !== undefined) user.preferences.privacy = privacy;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users/activity
// @desc    Get user activity feed
// @access  Private
router.get('/activity', isAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // For now, we'll return recent board modifications
    // In a real app, you'd have an activity/audit log collection
    const user = await User.findById(req.user._id)
      .populate({
        path: 'boards',
        options: {
          sort: { lastModified: -1 },
          limit: parseInt(limit),
          skip: skip
        },
        populate: {
          path: 'lastModifiedBy',
          select: 'name email avatar'
        }
      })
      .populate({
        path: 'collaborations.boardId',
        options: {
          sort: { lastModified: -1 },
          limit: parseInt(limit),
          skip: skip
        },
        populate: {
          path: 'lastModifiedBy',
          select: 'name email avatar'
        }
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Combine and sort activities
    const activities = [];
    
    // Add board activities
    user.boards.forEach(board => {
      activities.push({
        type: 'board_modified',
        boardId: board._id,
        boardTitle: board.title,
        timestamp: board.lastModified,
        user: board.lastModifiedBy,
        isOwner: true,
      });
    });
    
    // Add collaboration activities
    user.collaborations.forEach(collab => {
      if (collab.boardId) {
        activities.push({
          type: 'collaboration_modified',
          boardId: collab.boardId._id,
          boardTitle: collab.boardId.title,
          timestamp: collab.boardId.lastModified,
          user: collab.boardId.lastModifiedBy,
          role: collab.role,
          isOwner: false,
        });
      }
    });
    
    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      success: true,
      activities: activities.slice(0, limit),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: activities.length > limit,
      }
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
