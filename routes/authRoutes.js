const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../utils/helpers');
const User = require('../models/userlogin');

// Register a new user
router.post('/register', asyncHandler(async (req, res) => {
  const { name, username, password } = req.body;
  
  if (!name || !username || !password) {
    return res.status(400).json({ success: false, message: 'Name, username and password are required' });
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    name,
    username,
    password: hashedPassword
  });
  
  await user.save();
  
  // Set user in session
  req.session.user = { 
    id: user._id.toString(), 
    name: user.name, 
    username: user.username 
  };

  res.status(201).json({ 
    success: true, 
    message: 'Registration successful',
    user: { id: user._id, name: user.name, username: user.username }
  });
}));

// Login user
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Set user in session
  req.session.user = { 
    id: user._id.toString(), 
    name: user.name, 
    username: user.username 
  };

  res.json({ 
    success: true, 
    message: 'Login successful',
    user: { id: user._id, name: user.name, username: user.username }
  });
}));

// Logout user
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logout successful' });
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  res.json({ success: true, user: req.session.user });
});

module.exports = router;
