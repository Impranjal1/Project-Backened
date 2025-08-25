const express = require('express');
const Board = require('../models/Board');
const User = require('../models/User');
const { isAuthenticated, isBoardOwner, hasBoardAccess, canEditBoard } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/boards
// @desc    Get all boards for the authenticated user
// @access  Private
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get boards owned by user
    const ownedBoards = await Board.find({ owner: req.user._id })
      .populate('owner', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .populate('lastModifiedBy', 'name email')
      .sort({ lastModified: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get boards where user is a collaborator
    const collaborativeBoards = await Board.find({ 
      'collaborators.user': req.user._id 
    })
      .populate('owner', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .populate('lastModifiedBy', 'name email')
      .sort({ lastModified: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total counts
    const ownedCount = await Board.countDocuments({ owner: req.user._id });
    const collaborativeCount = await Board.countDocuments({ 'collaborators.user': req.user._id });
    
    res.json({
      success: true,
      data: {
        ownedBoards,
        collaborativeBoards,
        pagination: {
          page,
          limit,
          ownedTotal: ownedCount,
          collaborativeTotal: collaborativeCount,
          ownedPages: Math.ceil(ownedCount / limit),
          collaborativePages: Math.ceil(collaborativeCount / limit),
        }
      }
    });
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/boards
// @desc    Create a new board
// @access  Private
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { title, description, settings } = req.body;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Board title is required' });
    }
    
    const board = new Board({
      title: title.trim(),
      description: description?.trim() || '',
      owner: req.user._id,
      settings: {
        isPublic: settings?.isPublic || false,
        allowComments: settings?.allowComments !== false,
        theme: settings?.theme || 'light',
      },
      lastModifiedBy: req.user._id,
    });
    
    await board.save();
    
    // Add board to user's boards array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { boards: board._id }
    });
    
    // Populate the created board
    await board.populate('owner', 'name email avatar');
    
    res.status(201).json({
      success: true,
      message: 'Board created successfully',
      board
    });
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/boards/:boardId
// @desc    Get a specific board
// @access  Private (with board access)
router.get('/:boardId', isAuthenticated, hasBoardAccess, async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId)
      .populate('owner', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .populate('collaborators.addedBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('elements.createdBy', 'name email');
    
    res.json({
      success: true,
      board,
      userRole: req.userRole,
    });
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/boards/:boardId
// @desc    Update board details
// @access  Private (board owner only)
router.put('/:boardId', isAuthenticated, isBoardOwner, async (req, res) => {
  try {
    const { title, description, settings } = req.body;
    
    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ message: 'Board title cannot be empty' });
      }
      req.board.title = title.trim();
    }
    
    if (description !== undefined) {
      req.board.description = description.trim();
    }
    
    if (settings) {
      if (settings.isPublic !== undefined) req.board.settings.isPublic = settings.isPublic;
      if (settings.allowComments !== undefined) req.board.settings.allowComments = settings.allowComments;
      if (settings.theme !== undefined) req.board.settings.theme = settings.theme;
    }
    
    await req.board.updateLastModified(req.user._id);
    await req.board.populate('owner', 'name email avatar');
    
    res.json({
      success: true,
      message: 'Board updated successfully',
      board: req.board
    });
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/boards/:boardId
// @desc    Delete a board
// @access  Private (board owner only)
router.delete('/:boardId', isAuthenticated, isBoardOwner, async (req, res) => {
  try {
    await Board.findByIdAndDelete(req.params.boardId);
    
    // Remove board from all users' boards arrays
    await User.updateMany(
      { boards: req.params.boardId },
      { $pull: { boards: req.params.boardId } }
    );
    
    // Remove board from collaborations
    await User.updateMany(
      { 'collaborations.boardId': req.params.boardId },
      { $pull: { collaborations: { boardId: req.params.boardId } } }
    );
    
    res.json({
      success: true,
      message: 'Board deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting board:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/boards/:boardId/elements
// @desc    Get board elements (canvas data)
// @access  Private (board viewer, editor, or owner)
router.get('/:boardId/elements', isAuthenticated, hasBoardAccess, async (req, res) => {
  try {
    const { page = 1, limit = 100, type, lastModified } = req.query;
    
    // Get board with elements
    const board = await Board.findById(req.params.boardId)
      .populate('elements.createdBy', 'name email avatar');
    
    if (!board) {
      return res.status(404).json({ 
        success: false, 
        message: 'Board not found' 
      });
    }

    // Filter elements based on query parameters
    let elements = board.elements || [];

    // Filter by element type if specified
    if (type) {
      elements = elements.filter(element => element.type === type);
    }

    // Filter by last modified date if specified
    if (lastModified) {
      const filterDate = new Date(lastModified);
      elements = elements.filter(element => 
        new Date(element.updatedAt || element.createdAt) > filterDate
      );
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const paginatedElements = elements.slice(skip, skip + limitNum);

    // Prepare response
    res.json({
      success: true,
      data: {
        boardId: board._id,
        boardTitle: board.title,
        elements: paginatedElements,
        pagination: {
          current: pageNum,
          limit: limitNum,
          total: elements.length,
          pages: Math.ceil(elements.length / limitNum)
        },
        metadata: {
          lastModified: board.lastModified,
          userRole: req.userRole,
          elementTypes: [...new Set(elements.map(el => el.type))],
          totalElements: board.elements.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching board elements:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   PUT /api/boards/:boardId/elements
// @desc    Update board elements (canvas data)
// @access  Private (board editor or owner)
router.put('/:boardId/elements', isAuthenticated, canEditBoard, async (req, res) => {
  try {
    const { elements } = req.body;
    
    if (!Array.isArray(elements)) {
      return res.status(400).json({ message: 'Elements must be an array' });
    }
    
    req.board.elements = elements.map(element => ({
      ...element,
      createdBy: element.createdBy || req.user._id,
      updatedAt: new Date(),
    }));
    
    await req.board.updateLastModified(req.user._id);
    
    res.json({
      success: true,
      message: 'Board elements updated successfully',
      elements: req.board.elements
    });
  } catch (error) {
    console.error('Error updating board elements:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/boards/:boardId/collaborators
// @desc    Add collaborator to board
// @access  Private (board owner only)
router.post('/:boardId/collaborators', isAuthenticated, isBoardOwner, async (req, res) => {
  try {
    const { email, role = 'viewer' } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be editor or viewer' });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }
    
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot add yourself as collaborator' });
    }
    
    // Add collaborator to board
    await req.board.addCollaborator(user._id, role, req.user._id);
    
    // Add collaboration to user's profile
    await User.findByIdAndUpdate(user._id, {
      $push: {
        collaborations: {
          boardId: req.board._id,
          role: role,
          joinedAt: new Date(),
        }
      }
    });
    
    await req.board.populate('collaborators.user', 'name email avatar');
    
    res.json({
      success: true,
      message: 'Collaborator added successfully',
      collaborators: req.board.collaborators
    });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/boards/:boardId/collaborators/:userId
// @desc    Update collaborator role
// @access  Private (board owner only)
router.put('/:boardId/collaborators/:userId', isAuthenticated, isBoardOwner, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    // Validate role
    if (!['view', 'edit', 'admin'].includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role. Must be view, edit, or admin' 
      });
    }
    
    // Find and update collaborator
    const collaboratorIndex = req.board.collaborators.findIndex(
      collab => collab.user.toString() === userId
    );
    
    if (collaboratorIndex === -1) {
      return res.status(404).json({ 
        message: 'Collaborator not found' 
      });
    }
    
    // Update role
    req.board.collaborators[collaboratorIndex].role = role;
    req.board.collaborators[collaboratorIndex].updatedAt = new Date();
    
    await req.board.save();
    await req.board.populate('collaborators.user', 'name email avatar');
    
    res.json({
      success: true,
      message: 'Collaborator role updated successfully',
      collaborator: req.board.collaborators[collaboratorIndex]
    });
  } catch (error) {
    console.error('Error updating collaborator role:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/boards/:boardId/collaborators/:userId
// @desc    Remove collaborator from board
// @access  Private (board owner only)
router.delete('/:boardId/collaborators/:userId', isAuthenticated, isBoardOwner, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Remove collaborator from board
    await req.board.removeCollaborator(userId);
    
    // Remove collaboration from user's profile
    await User.findByIdAndUpdate(userId, {
      $pull: {
        collaborations: { boardId: req.board._id }
      }
    });
    
    res.json({
      success: true,
      message: 'Collaborator removed successfully'
    });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/boards/:id/share
// @desc    Generate a share link for a board
// @access  Private (Owner or Admin)
router.post('/:id/share', isAuthenticated, async (req, res) => {
  try {
    console.log('🔗 Creating share link for board:', req.params.id);
    console.log('📝 Request body:', req.body);
    console.log('👤 User:', req.user?._id);
    
    const { permissions = 'view', expiresIn = '7d', description = '' } = req.body;
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      console.log('❌ Board not found');
      return res.status(404).json({ message: 'Board not found' });
    }
    
    console.log('✅ Board found:', board.title);
    
    // Check if user has permission to create share links
    const isOwner = board.owner.toString() === req.user._id.toString();
    
    if (!isOwner) {
      const userCollaboration = board.collaborators.find(
        collab => collab.user.toString() === req.user._id.toString()
      );
      
      // Non-owners cannot create admin share links
      if (permissions === 'admin') {
        return res.status(403).json({ 
          message: 'Only board owners can create admin share links' 
        });
      }
      
      // Non-owners need at least editor role to create edit links
      if (!userCollaboration || (userCollaboration.role !== 'editor' && permissions !== 'view')) {
        return res.status(403).json({ message: 'Permission denied' });
      }
    }
    
    // Generate secure token
    const crypto = require('crypto');
    const shareToken = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration date
    let expiresAt = null;
    if (expiresIn !== 'never') {
      const ms = require('ms');
      expiresAt = new Date(Date.now() + ms(expiresIn));
    }
    
    // Add share link to board
    board.shareLinks.push({
      token: shareToken,
      permissions,
      createdBy: req.user._id,
      expiresAt,
      description,
      isActive: true
    });
    
    await board.save();
    
    const shareUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/share/${shareToken}`;
    
    res.json({
      shareUrl,
      token: shareToken,
      permissions,
      expiresAt,
      description,
      message: 'Share link created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating share link:', error);
    console.error('📄 Error details:', {
      message: error.message,
      stack: error.stack,
      boardId: req.params.id,
      userId: req.user?._id
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/boards/access/:token
// @desc    Access board via share link
// @access  Public
router.get('/access/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find board with this share token
    const board = await Board.findOne({
      'shareLinks.token': token,
      'shareLinks.isActive': true,
      $or: [
        { 'shareLinks.expiresAt': null },
        { 'shareLinks.expiresAt': { $gt: new Date() } }
      ]
    })
      .populate('owner', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .populate('shareLinks.createdBy', 'name email');
    
    if (!board) {
      return res.status(404).json({ message: 'Invalid or expired share link' });
    }
    
    // Find the specific share link
    const shareLink = board.shareLinks.find(link => 
      link.token === token && 
      link.isActive && 
      (!link.expiresAt || link.expiresAt > new Date())
    );
    
    if (!shareLink) {
      return res.status(404).json({ message: 'Invalid or expired share link' });
    }
    
    // Update access tracking
    shareLink.accessCount += 1;
    shareLink.lastAccessed = new Date();
    await board.save();
    
    // Return board data with permission level
    res.json({
      board: {
        _id: board._id,
        title: board.title,
        description: board.description,
        elements: board.elements,
        owner: board.owner,
        lastModified: board.lastModified,
        lastModifiedBy: board.lastModifiedBy
      },
      permissions: shareLink.permissions,
      accessType: 'share_link',
      message: 'Access granted via share link'
    });
  } catch (error) {
    console.error('Error accessing board via share link:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/boards/:id/share-links
// @desc    Get all share links for a board
// @access  Private (Owner or Admin)
router.get('/:id/share-links', isAuthenticated, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('shareLinks.createdBy', 'name email avatar');
    
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    
    // Check permissions
    if (board.owner.toString() !== req.user._id.toString()) {
      const userCollaboration = board.collaborators.find(
        collab => collab.user.toString() === req.user._id.toString()
      );
      if (!userCollaboration || userCollaboration.role !== 'editor') {
        return res.status(403).json({ message: 'Permission denied' });
      }
    }
    
    res.json({
      shareLinks: board.shareLinks.map(link => ({
        _id: link._id,
        token: link.token,
        permissions: link.permissions,
        createdBy: link.createdBy,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt,
        isActive: link.isActive,
        accessCount: link.accessCount,
        lastAccessed: link.lastAccessed,
        description: link.description,
        shareUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/share/${link.token}`
      }))
    });
  } catch (error) {
    console.error('Error fetching share links:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/boards/:id/share-links/:linkId
// @desc    Update a share link
// @access  Private (Owner or Creator of link)
router.put('/:id/share-links/:linkId', isAuthenticated, async (req, res) => {
  try {
    const { permissions, isActive, description, expiresIn } = req.body;
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    
    const shareLink = board.shareLinks.id(req.params.linkId);
    if (!shareLink) {
      return res.status(404).json({ message: 'Share link not found' });
    }
    
    // Check permissions
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isCreator = shareLink.createdBy.toString() === req.user._id.toString();
    
    if (!isOwner && !isCreator) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    // Update fields
    if (permissions !== undefined) shareLink.permissions = permissions;
    if (isActive !== undefined) shareLink.isActive = isActive;
    if (description !== undefined) shareLink.description = description;
    
    if (expiresIn !== undefined) {
      if (expiresIn === 'never') {
        shareLink.expiresAt = null;
      } else {
        const ms = require('ms');
        shareLink.expiresAt = new Date(Date.now() + ms(expiresIn));
      }
    }
    
    await board.save();
    
    res.json({
      shareLink: {
        _id: shareLink._id,
        token: shareLink.token,
        permissions: shareLink.permissions,
        isActive: shareLink.isActive,
        expiresAt: shareLink.expiresAt,
        description: shareLink.description
      },
      message: 'Share link updated successfully'
    });
  } catch (error) {
    console.error('Error updating share link:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/boards/:id/share-links/:linkId
// @desc    Delete/revoke a share link
// @access  Private (Owner or Creator of link)
router.delete('/:id/share-links/:linkId', isAuthenticated, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    
    const shareLink = board.shareLinks.id(req.params.linkId);
    if (!shareLink) {
      return res.status(404).json({ message: 'Share link not found' });
    }
    
    // Check permissions
    const isOwner = board.owner.toString() === req.user._id.toString();
    const isCreator = shareLink.createdBy.toString() === req.user._id.toString();
    
    if (!isOwner && !isCreator) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    // Remove the share link
    board.shareLinks.pull(req.params.linkId);
    await board.save();
    
    res.json({ message: 'Share link revoked successfully' });
  } catch (error) {
    console.error('Error revoking share link:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
