import express from 'express';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb, dbGet } from './db.js';
import { runSeeder } from './seed.js';

// Routers
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import postsRouter from './routes/posts.js';
import commentsRouter from './routes/comments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const DATA_DIR = process.env.DATA_DIR || __dirname;
const uploadsDir = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure database is initialized
await initDb();

// Auto-seed if database has no users
const userCount = await dbGet('SELECT COUNT(*) AS count FROM users');
if (userCount && userCount.count === 0) {
  console.log('No users found in database. Auto-seeding default visual creators...');
  await runSeeder().catch(err => console.error('Auto-seeding failed:', err));
}

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'aperture-social-secret-key-129837192',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      secure: false, // Set to true if running over HTTPS
      sameSite: 'lax',
    },
  })
);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/comments', commentsRouter);

// Serve static uploaded media
app.use('/uploads', express.static(uploadsDir));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'frontend')));

// Fallback to index.html for SPA router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
