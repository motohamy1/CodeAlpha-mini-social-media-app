import express from 'express';
import bcrypt from 'bcryptjs';
import { dbRun, dbGet } from '../db.js';

const router = express.Router();

// Register a new user
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, display_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await dbGet(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [cleanUsername, cleanEmail]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const displayName = (display_name && display_name.trim()) || username;
    const defaultAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}`;

    // Insert user into DB
    const result = await dbRun(
      `INSERT INTO users (username, email, password_hash, display_name, avatar_url, bio)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanUsername, cleanEmail, passwordHash, displayName, defaultAvatar, '']
    );

    // Save user ID to session
    req.session.userId = result.id;

    res.status(201).json({
      id: result.id,
      username: cleanUsername,
      email: cleanEmail,
      display_name: displayName,
      avatar_url: defaultAvatar,
      bio: '',
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier can be username or email

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Find user
    const user = await dbGet(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [cleanIdentifier, cleanIdentifier]
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid username/email or password.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username/email or password.' });
    }

    // Save to session
    req.session.userId = user.id;

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
    });
  } catch (error) {
    next(error);
  }
});

// Get Current User Status
router.get('/status', async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.json({ user: null });
    }

    const user = await dbGet(
      'SELECT id, username, email, display_name, avatar_url, bio, created_at FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (!user) {
      req.session.destroy();
      return res.json({ user: null });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out.' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

export default router;
