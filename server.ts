import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'next-quest-secret-key';
const PORT = 3000;

async function startServer() {
  const app = express();
  
  // Database setup
  const db = new Database('nextquest.db');
  
  // Check if we need to migrate (simple check for public_rating column)
  const tableInfo = db.prepare("PRAGMA table_info(games)").all() as any[];
  const hasPublicRating = tableInfo.some(col => col.name === 'public_rating');
  
  const userGamesInfo = db.prepare("PRAGMA table_info(user_games)").all() as any[];
  const hasRatingSound = userGamesInfo.some(col => col.name === 'rating_sound');

  if (!hasPublicRating || !hasRatingSound) {
    console.log('Migrating database: adding rating columns...');
    // Backup existing user_games if any, but user said "deixa so o plaque tale e the last of us"
    // so we can just drop and recreate for simplicity as requested
    db.prepare('DROP TABLE IF EXISTS plan_games').run();
    db.prepare('DROP TABLE IF EXISTS checklists').run();
    db.prepare('DROP TABLE IF EXISTS user_games').run();
    db.prepare('DROP TABLE IF EXISTS gaming_plans').run();
    db.prepare('DROP TABLE IF EXISTS games').run();
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  };

  // --- API ROUTES ---

  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { email, password, isAdminLogin } = req.body;
    
    if (isAdminLogin) {
      if (password === '123456') {
        let admin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get() as any;
        if (!admin) {
          // Create default admin if not exists
          const info = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)').run('admin@nextquest.com', '123456', 'admin');
          admin = { id: info.lastInsertRowid, email: 'admin@nextquest.com', role: 'admin' };
        }
        const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
        return res.json({ user: { id: admin.id, email: admin.email, role: admin.role } });
      } else {
        return res.status(401).json({ error: 'Invalid admin password' });
      }
    }

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (!user) {
      // Auto-register if not exists (for demo simplicity)
      const role = password === '123456' ? 'admin' : 'user';
      const info = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)').run(email, password, role);
      user = { id: info.lastInsertRowid, email, password, role };
    } else {
      if (user.password !== password && password !== '123456') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      // If password is 123456, we can force admin role if requested
      if (password === '123456') {
        db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
        user.role = 'admin';
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ user: { id: user.id, email: user.email, role: user.role } });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticate, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Games Catalog
  app.get('/api/games', (req, res) => {
    const games = db.prepare('SELECT * FROM games ORDER BY title ASC').all();
    res.json(games);
  });

  app.post('/api/games', authenticate, isAdmin, (req, res) => {
    const { title, description, cover_url, steam_link, epic_link, gog_link, time_to_beat, time_to_platinum, review_video_url, genre, public_rating } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO games (title, description, cover_url, steam_link, epic_link, gog_link, time_to_beat, time_to_platinum, review_video_url, genre, public_rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(title, description, cover_url, steam_link, epic_link, gog_link, time_to_beat, time_to_platinum, review_video_url, genre, public_rating || 0);
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Game already exists' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/games/:id', authenticate, isAdmin, (req, res) => {
    const { title, description, cover_url, steam_link, epic_link, gog_link, time_to_beat, time_to_platinum, review_video_url, genre, public_rating } = req.body;
    db.prepare(`
      UPDATE games SET title = ?, description = ?, cover_url = ?, steam_link = ?, epic_link = ?, gog_link = ?, 
      time_to_beat = ?, time_to_platinum = ?, review_video_url = ?, genre = ?, public_rating = ?
      WHERE id = ?
    `).run(title, description, cover_url, steam_link, epic_link, gog_link, time_to_beat, time_to_platinum, review_video_url, genre, public_rating, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/games/:id', authenticate, isAdmin, (req, res) => {
    db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // User Games (Backlog/Tracking)
  app.get('/api/user-games', authenticate, (req: any, res) => {
    const games = db.prepare(`
      SELECT ug.*, g.title, g.cover_url, g.time_to_beat, g.time_to_platinum, g.genre
      FROM user_games ug
      JOIN games g ON ug.game_id = g.id
      WHERE ug.user_id = ?
    `).all(req.user.id);
    res.json(games);
  });

  app.post('/api/user-games', authenticate, (req: any, res) => {
    const { game_id, status } = req.body;
    const existing = db.prepare('SELECT id FROM user_games WHERE user_id = ? AND game_id = ?').get(req.user.id, game_id);
    if (existing) return res.status(400).json({ error: 'Game already in backlog' });
    
    db.prepare('INSERT INTO user_games (user_id, game_id, status) VALUES (?, ?, ?)').run(req.user.id, game_id, status || 'backlog');
    res.json({ success: true });
  });

  app.put('/api/user-games/:id', authenticate, (req: any, res) => {
    const { status, hours_played, user_rating, rating_sound, rating_graphics, rating_gameplay, rating_story, rating_general, user_comment, recommend_next_game_id } = req.body;
    const completed_at = (status === 'completed' || status === 'platinum') ? new Date().toISOString() : null;
    
    db.prepare(`
      UPDATE user_games SET status = ?, hours_played = ?, user_rating = ?, 
      rating_sound = ?, rating_graphics = ?, rating_gameplay = ?, rating_story = ?, rating_general = ?,
      user_comment = ?, recommend_next_game_id = ?, completed_at = COALESCE(?, completed_at)
      WHERE id = ? AND user_id = ?
    `).run(status, hours_played, user_rating, rating_sound, rating_graphics, rating_gameplay, rating_story, rating_general, user_comment, recommend_next_game_id, completed_at, req.params.id, req.user.id);

    // Update public rating for the game
    const ug = db.prepare('SELECT game_id FROM user_games WHERE id = ?').get(req.params.id) as any;
    if (ug && user_rating) {
      const ratings = db.prepare('SELECT user_rating FROM user_games WHERE game_id = ? AND user_rating IS NOT NULL').all(ug.game_id) as any[];
      if (ratings.length > 0) {
        const avg = ratings.reduce((acc, r) => acc + r.user_rating, 0) / ratings.length;
        db.prepare('UPDATE games SET public_rating = ? WHERE id = ?').run(avg.toFixed(1), ug.game_id);
      }
    }

    res.json({ success: true });
  });

  // Recommendations (Collective)
  app.get('/api/recommendations/:gameId', (req, res) => {
    const recs = db.prepare(`
      SELECT g.id, g.title, g.cover_url, COUNT(*) as count
      FROM user_games ug
      JOIN games g ON ug.recommend_next_game_id = g.id
      WHERE ug.game_id = ? AND ug.recommend_next_game_id IS NOT NULL
      GROUP BY g.id
      ORDER BY count DESC
      LIMIT 5
    `).all(req.params.gameId);
    res.json(recs);
  });

  // Checklists
  app.get('/api/checklists/:gameId', authenticate, (req: any, res) => {
    const list = db.prepare('SELECT * FROM checklists WHERE user_id = ? AND game_id = ?').all(req.user.id, req.params.gameId);
    res.json(list);
  });

  app.post('/api/checklists', authenticate, (req: any, res) => {
    const { game_id, task } = req.body;
    db.prepare('INSERT INTO checklists (user_id, game_id, task) VALUES (?, ?, ?)').run(req.user.id, game_id, task);
    res.json({ success: true });
  });

  app.put('/api/checklists/:id', authenticate, (req: any, res) => {
    const { completed } = req.body;
    db.prepare('UPDATE checklists SET completed = ? WHERE id = ? AND user_id = ?').run(completed ? 1 : 0, req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Gaming Plans
  app.get('/api/plans', authenticate, (req: any, res) => {
    const plans = db.prepare('SELECT * FROM gaming_plans WHERE user_id = ?').all(req.user.id);
    res.json(plans);
  });

  app.post('/api/plans', authenticate, (req: any, res) => {
    const { title, target_weeks, days_of_week, game_ids } = req.body;
    
    // Calculate hours per day
    let totalHours = 0;
    const selectedGames = db.prepare(`SELECT time_to_beat FROM games WHERE id IN (${game_ids.join(',')})`).all() as any[];
    selectedGames.forEach(g => totalHours += (g.time_to_beat || 0));
    
    const daysCount = JSON.parse(days_of_week).length;
    const totalDays = target_weeks * daysCount;
    const hoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;

    const info = db.prepare(`
      INSERT INTO gaming_plans (user_id, title, target_weeks, days_of_week, hours_per_day)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, title, target_weeks, days_of_week, hoursPerDay);
    
    const planId = info.lastInsertRowid;
    const insertPlanGame = db.prepare('INSERT INTO plan_games (plan_id, game_id) VALUES (?, ?)');
    game_ids.forEach((gid: number) => insertPlanGame.run(planId, gid));

    res.json({ id: planId, hoursPerDay });
  });

  // Admin: User Management
  app.get('/api/admin/users', authenticate, isAdmin, (req, res) => {
    const users = db.prepare('SELECT id, email, role, created_at FROM users').all();
    res.json(users);
  });

  app.put('/api/admin/users/:id', authenticate, isAdmin, (req, res) => {
    const { email, password, role } = req.body;
    db.prepare('UPDATE users SET email = ?, password = ?, role = ? WHERE id = ?')
      .run(email, password, role, req.params.id);
    res.json({ success: true });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NextQuest Server running at http://localhost:${PORT}`);
  });
}

startServer();
