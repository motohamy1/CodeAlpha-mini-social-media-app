import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET comments for a specific post
router.get('/post/:postId', async (req, res, next) => {
  try {
    const postId = parseInt(req.params.postId, 10);

    const comments = await dbAll(`
      SELECT c.id, c.content, c.created_at, c.user_id,
             u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);

    res.json(comments);
  } catch (error) {
    next(error);
  }
});

// CREATE a comment on a specific post (Authenticated)
router.post('/post/:postId', requireAuth, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const { content } = req.body;
    const currentUserId = req.session.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }

    // Check if post exists
    const post = await dbGet('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const result = await dbRun(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, currentUserId, content.trim()]
    );

    // Retrieve the created comment details with user details
    const newComment = await dbGet(`
      SELECT c.id, c.content, c.created_at, c.user_id,
             u.username, u.display_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.id]);

    res.status(201).json(newComment);
  } catch (error) {
    next(error);
  }
});

export default router;
