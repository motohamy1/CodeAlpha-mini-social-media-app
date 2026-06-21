import bcrypt from 'bcryptjs';
import { initDb, dbRun, dbGet, dbAll } from './db.js';

export const runSeeder = async () => {
  console.log('Seeding database...');
  await initDb();

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // 1. Create Seed Users
  const users = [
    {
      username: 'elena_lens',
      email: 'elena@aperture.com',
      password_hash: passwordHash,
      display_name: 'Elena Rostova',
      bio: 'Visual artist & architectural photographer. Chasing light and geometry across Europe.',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    {
      username: 'lucas_pixels',
      email: 'lucas@aperture.com',
      password_hash: passwordHash,
      display_name: 'Lucas Vance',
      bio: 'Digital designer & minimalist. Framing the everyday details. Less is more.',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      username: 'sara_shapes',
      email: 'sara@aperture.com',
      password_hash: passwordHash,
      display_name: 'Sara Chen',
      bio: 'Illustrator & 3D render explorer. Playful compositions and bold color theories.',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  ];

  for (const u of users) {
    await dbRun(
      `INSERT OR IGNORE INTO users (username, email, password_hash, display_name, bio, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [u.username, u.email, u.password_hash, u.display_name, u.bio, u.avatar_url]
    );
  }

  // Get user IDs
  const elena = await dbGet('SELECT id FROM users WHERE username = "elena_lens"');
  const lucas = await dbGet('SELECT id FROM users WHERE username = "lucas_pixels"');
  const sara = await dbGet('SELECT id FROM users WHERE username = "sara_shapes"');

  if (!elena || !lucas || !sara) {
    console.error('Failed to retrieve seeded users.');
    return;
  }

  // 2. Create Seed Posts
  const posts = [
    {
      user_id: elena.id,
      image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80',
      caption: 'Concrete poetry. Exploring brutalist lines under the midday sun. 📐☀️',
    },
    {
      user_id: lucas.id,
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&auto=format&fit=crop&q=80',
      caption: 'Aperture at rest. Today’s workbench essentials. 🎧☕',
    },
    {
      user_id: sara.id,
      image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1000&auto=format&fit=crop&q=80',
      caption: 'Chroma study no. 42. Playing with saturated layers and balance. 🎨✨',
    },
    {
      user_id: elena.id,
      image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000&auto=format&fit=crop&q=80',
      caption: 'Reflections of glass and steel. City center, early morning. 🏙️👁️',
    },
  ];

  for (const p of posts) {
    // Check if post already exists to prevent duplicate seeding
    const exists = await dbGet('SELECT id FROM posts WHERE user_id = ? AND caption = ?', [p.user_id, p.caption]);
    if (!exists) {
      await dbRun(
        'INSERT INTO posts (user_id, image_url, caption) VALUES (?, ?, ?)',
        [p.user_id, p.image_url, p.caption]
      );
    }
  }

  // Get post IDs
  const dbPosts = await dbAll('SELECT id, user_id FROM posts');

  // 3. Create Seed Likes
  for (const post of dbPosts) {
    // Elena likes everyone else's posts
    if (post.user_id !== elena.id) {
      await dbRun('INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)', [post.id, elena.id]);
    }
    // Lucas likes Elena's posts
    if (post.user_id === elena.id) {
      await dbRun('INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)', [post.id, lucas.id]);
    }
  }

  // 4. Create Seed Followers
  // Elena follows Lucas & Sara
  await dbRun('INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)', [elena.id, lucas.id]);
  await dbRun('INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)', [elena.id, sara.id]);

  // Lucas follows Elena
  await dbRun('INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)', [lucas.id, elena.id]);

  // Sara follows Elena & Lucas
  await dbRun('INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)', [sara.id, elena.id]);
  await dbRun('INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)', [sara.id, lucas.id]);

  // 5. Create Seed Comments
  const elenaPost1 = dbPosts.find(p => p.user_id === elena.id);
  const lucasPost1 = dbPosts.find(p => p.user_id === lucas.id);

  if (elenaPost1) {
    await dbRun(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [elenaPost1.id, lucas.id, 'The lighting here is absolutely phenomenal, Elena! The contrast is perfect.']
    );
    await dbRun(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [elenaPost1.id, sara.id, 'Brutalism never looked so elegant. Love this! 😍']
    );
  }

  if (lucasPost1) {
    await dbRun(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [lucasPost1.id, elena.id, 'Clean layout, Lucas. What headphones are those?']
    );
  }

  console.log('Database seeded successfully.');
};

import { fileURLToPath } from 'url';
import path from 'path';

const isDirectRun = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) || 
  path.basename(process.argv[1]) === 'seed.js'
);

if (isDirectRun) {
  runSeeder().catch(err => {
    console.error('Seeding error:', err);
  });
}
