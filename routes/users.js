import express from 'express';
import { dbGet, dbRun, dbAll } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get User Profile details by username
router.get('/:username', async (req, res, next) => {
  try {
    const { username } = req.params;
    const cleanUsername = username.trim().toLowerCase();

    // Fetch user
    const profileUser = await dbGet(
      'SELECT id, username, display_name, avatar_url, bio, created_at FROM users WHERE username = ?',
      [cleanUsername]
    );

    if (!profileUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userId = profileUser.id;

    // Get follower count
    const followersResult = await dbGet(
      'SELECT COUNT(*) AS count FROM followers WHERE following_id = ?',
      [userId]
    );
    const followersCount = followersResult ? followersResult.count : 0;

    // Get following count
    const followingResult = await dbGet(
      'SELECT COUNT(*) AS count FROM followers WHERE follower_id = ?',
      [userId]
    );
    const followingCount = followingResult ? followingResult.count : 0;

    // Check if the current user is following this profile
    let isFollowing = false;
    if (req.session && req.session.userId) {
      const followCheck = await dbGet(
        'SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?',
        [req.session.userId, userId]
      );
      isFollowing = !!followCheck;
    }

    // Get all user's posts
    const posts = await dbAll(
      `SELECT p.id, p.image_url, p.caption, p.created_at,
              (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
       FROM posts p
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json({
      user: {
        ...profileUser,
        followers_count: followersCount,
        following_count: followingCount,
        is_following: isFollowing,
      },
      posts,
    });
  } catch (error) {
    next(error);
  }
});

// Update Profile info (Authenticated)
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const { display_name, bio } = req.body;
    const currentUserId = req.session.userId;

    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: 'Display name cannot be empty.' });
    }

    await dbRun(
      'UPDATE users SET display_name = ?, bio = ? WHERE id = ?',
      [display_name.trim(), (bio || '').trim(), currentUserId]
    );

    const updatedUser = await dbGet(
      'SELECT id, username, display_name, avatar_url, bio FROM users WHERE id = ?',
      [currentUserId]
    );

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

// Follow a user (Authenticated)
router.post('/:id/follow', requireAuth, async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const currentUserId = req.session.userId;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    // Check target exists
    const targetUser = await dbGet('SELECT id FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User to follow not found.' });
    }

    // Insert follow relation (ignore duplicate errors gracefully via OR IGNORE or manual check)
    await dbRun(
      'INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)',
      [currentUserId, targetUserId]
    );

    res.json({ success: true, message: 'Followed successfully.' });
  } catch (error) {
    next(error);
  }
});

// Unfollow a user (Authenticated)
router.post('/:id/unfollow', requireAuth, async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const currentUserId = req.session.userId;

    // Delete follow relation
    await dbRun(
      'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
      [currentUserId, targetUserId]
    );

    res.json({ success: true, message: 'Unfollowed successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
