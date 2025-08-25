const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Test accounts for demo purposes
const TEST_ACCOUNTS = [
  {
    email: 'test@example.com',
    password: 'test123',
    name: 'Test User',
    avatar: 'https://via.placeholder.com/150/4285F4/white?text=T'
  },
  {
    email: 'demo@example.com',
    password: 'demo123',
    name: 'Demo User',
    avatar: 'https://via.placeholder.com/150/34A853/white?text=D'
  },
  {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    avatar: 'https://via.placeholder.com/150/EA4335/white?text=A'
  }
];

// @route   POST /api/auth/register
// @desc    Register new user with email/password
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      provider: 'local',
      isVerified: true, // Auto-verify for now, can add email verification later
      isTestAccount: false
    });
    
    await newUser.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        avatar: newUser.avatar,
        isTestAccount: false,
        initials: newUser.getInitials()
      }
    });
  } catch (error) {
    console.error('Error in user registration:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user with email/password
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      provider: 'local' // Only local users have passwords
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Update last login
    await user.updateLastLogin();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        _id: user._id,
        email: user.email,
        name: user.name 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isTestAccount: user.isTestAccount,
        initials: user.getInitials()
      }
    });
  } catch (error) {
    console.error('Error in user login:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/google
// @desc    Start Google OAuth flow
// @access  Public
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login?error=auth_failed` }),
  async (req, res) => {
    try {
      // Update last login
      await req.user.updateLastLogin();
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          _id: req.user._id,
          email: req.user.email,
          name: req.user.name 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );
      
      // Redirect to frontend with token
      res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
    } catch (error) {
      console.error('Error in Google callback:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
  }
);

// @route   POST /api/auth/test-login
// @desc    Test login with predefined accounts
// @access  Public
router.post('/test-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Check if it's a test account
    const testAccount = TEST_ACCOUNTS.find(account => account.email === email);
    
    if (!testAccount || testAccount.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid test credentials'
      });
    }
    
    // Find or create user in database
    let user = await User.findOne({ email: testAccount.email });
    
    if (!user) {
      // Create test user
      user = new User({
        googleId: `test_${Date.now()}`,
        email: testAccount.email,
        name: testAccount.name,
        avatar: testAccount.avatar,
        provider: 'google', // Set provider to google to avoid password requirement
        isTestAccount: true
      });
      await user.save();
    }
    
    // Update last login
    await user.updateLastLogin();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        _id: user._id,
        email: user.email,
        name: user.name 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isTestAccount: true
      }
    });
  } catch (error) {
    console.error('Error in test login:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during test login'
    });
  }
});

// @route   GET /api/auth/test-accounts
// @desc    Get available test accounts (emails only for security)
// @access  Public
router.get('/test-accounts', (req, res) => {
  const publicTestAccounts = TEST_ACCOUNTS.map(account => ({
    email: account.email,
    name: account.name,
    // Don't send passwords in response
  }));
  
  res.json({
    success: true,
    accounts: publicTestAccounts,
    note: 'Use password "test123", "demo123", or "admin123" respectively'
  });
});

// @route   POST /api/auth/register
// @desc    Register new user with email/password
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      provider: 'local',
      isVerified: true, // Auto-verify for now, can add email verification later
      isTestAccount: false
    });
    
    await newUser.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        avatar: newUser.avatar,
        isTestAccount: false,
        initials: newUser.getInitials()
      }
    });
  } catch (error) {
    console.error('Error in user registration:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user with email/password
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      provider: 'local' // Only local users have passwords
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Update last login
    await user.updateLastLogin();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        _id: user._id,
        email: user.email,
        name: user.name 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isTestAccount: user.isTestAccount,
        initials: user.getInitials()
      }
    });
  } catch (error) {
    console.error('Error in user login:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('boards', 'title description createdAt')
      .populate('collaborations.boardId', 'title description owner');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        boards: user.boards,
        collaborations: user.collaborations,
        initials: user.getInitials(),
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', isAuthenticated, (req, res) => {
  try {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out', error: err.message });
      }
      
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: 'Error destroying session', error: err.message });
        }
        
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out successfully' });
      });
    });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/auth/status
// @desc    Check authentication status
// @access  Public
router.get('/status', (req, res) => {
  try {
    if (req.isAuthenticated()) {
      return res.json({ 
        isAuthenticated: true, 
        user: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar,
          initials: req.user.getInitials(),
        }
      });
    }
    
    // Check JWT token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({ isAuthenticated: false, user: null });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ 
      isAuthenticated: true, 
      user: decoded 
    });
  } catch (error) {
    res.json({ isAuthenticated: false, user: null });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', isAuthenticated, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        initials: user.getInitials(),
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
