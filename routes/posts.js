import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { dbAll, dbGet, dbRun, DATA_DIR } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(DATA_DIR, 'uploads'));
  },
  filename: (req, file, cb) => {
    const randomHex = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${randomHex}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

// GET feed posts
router.get('/feed', async (req, res, next) => {
  try {
    const userId = req.session ? req.session.userId : null;

    // Fetch all posts with user display name, avatar, like count, comment count
    // and if the current logged-in user liked it
    const posts = await dbAll(`
      SELECT p.id, p.image_url, p.caption, p.created_at, p.user_id,
             u.username, u.display_name, u.avatar_url,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
             CASE WHEN ? IS NOT NULL AND EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) THEN 1 ELSE 0 END AS has_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `, [userId, userId]);

    res.json(posts);
  } catch (error) {
    next(error);
  }
});

// CREATE a post (Authenticated)
router.post('/create', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    const { caption } = req.body;
    const currentUserId = req.session.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required.' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const result = await dbRun(
      'INSERT INTO posts (user_id, image_url, caption) VALUES (?, ?, ?)',
      [currentUserId, imageUrl, (caption || '').trim()]
    );

    // Retrieve the created post details with user details
    const newPost = await dbGet(`
      SELECT p.id, p.image_url, p.caption, p.created_at, p.user_id,
             u.username, u.display_name, u.avatar_url,
             0 AS likes_count, 0 AS comments_count, 0 AS has_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [result.id]);

    res.status(201).json(newPost);
  } catch (error) {
    next(error);
  }
});

// LIKE a post (Authenticated)
router.post('/:id/like', requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.session.userId;

    // Check if post exists
    const post = await dbGet('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // Insert like (OR IGNORE to prevent unique constraint failures)
    await dbRun(
      'INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)',
      [postId, currentUserId]
    );

    const likesResult = await dbGet('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?', [postId]);
    const likesCount = likesResult ? likesResult.count : 0;

    res.json({ success: true, likes_count: likesCount });
  } catch (error) {
    next(error);
  }
});

// UNLIKE a post (Authenticated)
router.post('/:id/unlike', requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.session.userId;

    // Delete like
    await dbRun(
      'DELETE FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, currentUserId]
    );

    const likesResult = await dbGet('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?', [postId]);
    const likesCount = likesResult ? likesResult.count : 0;

    res.json({ success: true, likes_count: likesCount });
  } catch (error) {
    next(error);
  }
});

// DELETE a post (Authenticated)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const currentUserId = req.session.userId;

    // Check if post exists and is owned by current user
    const post = await dbGet('SELECT user_id, image_url FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.user_id !== currentUserId) {
      return res.status(403).json({ error: 'You are not authorized to delete this post.' });
    }

    // Delete file from disk
    const relativeImagePath = post.image_url.startsWith('/') ? post.image_url.slice(1) : post.image_url;
    const absoluteImagePath = path.join(DATA_DIR, relativeImagePath);
    fs.unlink(absoluteImagePath, (err) => {
      if (err) console.error('Failed to delete image file:', err.message);
    });

    // Delete post from DB
    await dbRun('DELETE FROM posts WHERE id = ?', [postId]);

    res.json({ success: true, message: 'Post deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
