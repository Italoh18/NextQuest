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
  try {
    const app = express();
    
    // Database setup
    const db = new Database('nextquest.db');
  
  // Check if we need to migrate
  const tableInfo = db.prepare("PRAGMA table_info(games)").all() as any[];
  const hasPublicRating = tableInfo.some(col => col.name === 'public_rating');
  
  const userGamesInfo = db.prepare("PRAGMA table_info(user_games)").all() as any[];
  const hasRatingSound = userGamesInfo.some(col => col.name === 'rating_sound');

  const usersInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
  const hasUserFields = usersInfo.some(col => col.name === 'name');
  const hasHoursPerDay = usersInfo.some(col => col.name === 'hours_per_day');

  if (!hasPublicRating || !hasRatingSound || !hasUserFields || !hasHoursPerDay) {
    console.log('Migrating database: adding new columns...');
    db.prepare('DROP TABLE IF EXISTS plan_games').run();
    db.prepare('DROP TABLE IF EXISTS checklists').run();
    db.prepare('DROP TABLE IF EXISTS user_games').run();
    db.prepare('DROP TABLE IF EXISTS gaming_plans').run();
    db.prepare('DROP TABLE IF EXISTS games').run();
    db.prepare('DROP TABLE IF EXISTS users').run();
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors());

  // Request logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

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
  
  // RAWG Proxy
  app.get('/api/rawg/search', async (req, res) => {
    const { query, page = 1 } = req.query;
    const apiKey = process.env.RAWG_API_KEY;
    
    console.log(`[RAWG Proxy] Searching for: "${query}", Page: ${page}`);
    console.log(`[RAWG Proxy] API Key configured: ${!!apiKey}`);

    if (!apiKey) {
      console.error('[RAWG Proxy] Error: RAWG_API_KEY is missing');
      return res.status(500).json({ error: 'RAWG API Key not configured' });
    }

    try {
      const response = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${query}&page=${page}&page_size=20`);
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/rawg/details/:id', async (req, res) => {
    const { id } = req.params;
    const apiKey = process.env.RAWG_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'RAWG API Key not configured' });
    }

    try {
      const response = await fetch(`https://api.rawg.io/api/games/${id}?key=${apiKey}`);
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auth
  app.post('/api/auth/register', (req, res) => {
    const { email, password, name, player_type, play_days, platforms } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO users (email, password, name, player_type, play_days, platforms)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        email ?? null, 
        password ?? null, 
        name || null, 
        player_type || null, 
        JSON.stringify(play_days || []), 
        JSON.stringify(platforms || [])
      );
      
      const user = { id: info.lastInsertRowid, email, role: 'user', name };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ user });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password, isAdminLogin } = req.body;
    
    if (isAdminLogin) {
      if (password === '79913061') {
        let admin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get() as any;
        if (!admin) {
          const info = db.prepare('INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)').run('admin@nextquest.com', '79913061', 'admin', 'Administrador');
          admin = { id: info.lastInsertRowid, email: 'admin@nextquest.com', role: 'admin', name: 'Administrador' };
        }
        const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role, name: admin.name }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
        return res.json({ user: { id: admin.id, email: admin.email, role: admin.role, name: admin.name } });
      } else {
        return res.status(401).json({ error: 'Senha de administrador inválida' });
      }
    }

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email ?? null) as any;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado. Por favor, cadastre-se.' });
    } else {
      if (user.password !== password && password !== '79913061') {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
      // If password is the admin password, we can force admin role if requested (backdoor for tests as user asked)
      if (password === '79913061') {
        db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id ?? null);
        user.role = 'admin';
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticate, (req: any, res) => {
    const user = db.prepare('SELECT id, email, role, name, player_type, play_days, platforms, hours_per_day, is_premium FROM users WHERE id = ?').get(req.user.id ?? null);
    res.json({ user });
  });

  app.put('/api/user/profile', authenticate, (req: any, res) => {
    const { name, password } = req.body;
    if (password) {
      db.prepare('UPDATE users SET name = ?, password = ? WHERE id = ?').run(name || 'Usuário', password, req.user.id ?? null);
    } else {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name || 'Usuário', req.user.id ?? null);
    }
    res.json({ success: true });
  });

  app.put('/api/user/preferences', authenticate, (req: any, res) => {
    const { play_days, hours_per_day } = req.body;
    db.prepare('UPDATE users SET play_days = ?, hours_per_day = ? WHERE id = ?')
      .run(JSON.stringify(play_days || []), hours_per_day || 0, req.user.id ?? null);
    res.json({ success: true });
  });

  app.get('/api/user/stats', authenticate, (req: any, res) => {
    const mostPlayed = db.prepare(`
      SELECT g.title, g.cover_url, ug.hours_played
      FROM user_games ug
      JOIN games g ON ug.game_id = g.id
      WHERE ug.user_id = ?
      ORDER BY ug.hours_played DESC
      LIMIT 5
    `).all(req.user.id ?? null);

    const lastTask = db.prepare(`
      SELECT c.*, g.title as game_title
      FROM checklists c
      JOIN games g ON c.game_id = g.id
      WHERE c.user_id = ?
      ORDER BY c.id DESC
      LIMIT 1
    `).get(req.user.id ?? null);

    res.json({ mostPlayed, lastTask });
  });

  // Games Catalog
  app.get('/api/games', (req, res) => {
    const games = db.prepare('SELECT * FROM games ORDER BY title ASC').all();
    res.json(games);
  });

  app.post('/api/games', authenticate, isAdmin, (req, res) => {
    const { 
      id, title, description, cover_url, steam_link, epic_link, gog_link, 
      time_to_beat, time_to_platinum, review_video_url, genre, public_rating, slug 
    } = req.body;
    
    try {
      const info = db.prepare(`
        INSERT INTO games (id, title, description, cover_url, steam_link, epic_link, gog_link, time_to_beat, time_to_platinum, review_video_url, genre, public_rating, slug)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id ?? null, 
        title ?? '...', 
        description ?? '...', 
        cover_url ?? '...', 
        steam_link ?? '...', 
        epic_link ?? '...', 
        gog_link ?? '...', 
        time_to_beat ?? 0, 
        time_to_platinum ?? 0, 
        review_video_url ?? '...', 
        genre ?? '...', 
        public_rating ?? 0,
        slug ?? '...'
      );
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Este jogo já existe no catálogo.' });
      }
      console.error('Error inserting game:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/games/:id', authenticate, isAdmin, (req, res) => {
    const { 
      title, description, cover_url, steam_link, epic_link, gog_link, 
      time_to_beat, time_to_platinum, review_video_url, genre, public_rating, slug 
    } = req.body;
    
    db.prepare(`
      UPDATE games SET title = ?, description = ?, cover_url = ?, steam_link = ?, epic_link = ?, gog_link = ?, 
      time_to_beat = ?, time_to_platinum = ?, review_video_url = ?, genre = ?, public_rating = ?, slug = ?
      WHERE id = ?
    `).run(
      title ?? '...', 
      description ?? '...', 
      cover_url ?? '...', 
      steam_link ?? '...', 
      epic_link ?? '...', 
      gog_link ?? '...', 
      time_to_beat ?? 0, 
      time_to_platinum ?? 0, 
      review_video_url ?? '...', 
      genre ?? '...', 
      public_rating ?? 0, 
      slug ?? '...',
      req.params.id ?? null
    );
    res.json({ success: true });
  });

  app.delete('/api/games/:id', authenticate, isAdmin, (req, res) => {
    db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id ?? null);
    res.json({ success: true });
  });

  // User Games (Backlog/Tracking)
  app.get('/api/user-games', authenticate, (req: any, res) => {
    const games = db.prepare(`
      SELECT ug.*, g.title, g.cover_url, g.time_to_beat, g.time_to_platinum, g.genre
      FROM user_games ug
      JOIN games g ON ug.game_id = g.id
      WHERE ug.user_id = ?
    `).all(req.user.id ?? null);
    res.json(games);
  });

  app.post('/api/user-games', authenticate, (req: any, res) => {
    const { game_id, status } = req.body;
    if (!game_id) return res.status(400).json({ error: 'ID do jogo é obrigatório' });

    const existing = db.prepare('SELECT id FROM user_games WHERE user_id = ? AND game_id = ?').get(req.user.id ?? null, game_id ?? null);
    if (existing) return res.status(400).json({ error: 'Este jogo já está na sua biblioteca' });
    
    db.prepare('INSERT INTO user_games (user_id, game_id, status) VALUES (?, ?, ?)').run(req.user.id ?? null, game_id ?? null, status ?? 'backlog');
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
    `).run(
      status || 'backlog', 
      hours_played || 0, 
      user_rating || null, 
      rating_sound || null, 
      rating_graphics || null, 
      rating_gameplay || null, 
      rating_story || null, 
      rating_general || null, 
      user_comment || null, 
      recommend_next_game_id || null, 
      completed_at, 
      req.params.id ?? null, 
      req.user.id ?? null
    );

    // Update public rating for the game
    const ug = db.prepare('SELECT game_id FROM user_games WHERE id = ?').get(req.params.id ?? null) as any;
    if (ug && user_rating) {
      const ratings = db.prepare('SELECT user_rating FROM user_games WHERE game_id = ? AND user_rating IS NOT NULL').all(ug.game_id ?? null) as any[];
      if (ratings.length > 0) {
        const avg = ratings.reduce((acc, r) => acc + r.user_rating, 0) / ratings.length;
        db.prepare('UPDATE games SET public_rating = ? WHERE id = ?').run(avg.toFixed(1), ug.game_id ?? null);
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
    `).all(req.params.gameId ?? null);
    res.json(recs);
  });

  // Checklists
  app.get('/api/checklists/:gameId', authenticate, (req: any, res) => {
    const list = db.prepare('SELECT * FROM checklists WHERE user_id = ? AND game_id = ?').all(req.user.id ?? null, req.params.gameId ?? null);
    res.json(list);
  });

  app.post('/api/checklists', authenticate, (req: any, res) => {
    const { game_id, task } = req.body;
    if (!game_id || !task) return res.status(400).json({ error: 'Dados incompletos' });
    db.prepare('INSERT INTO checklists (user_id, game_id, task) VALUES (?, ?, ?)').run(req.user.id ?? null, game_id ?? null, task ?? null);
    res.json({ success: true });
  });

  app.put('/api/checklists/:id', authenticate, (req: any, res) => {
    const { completed } = req.body;
    db.prepare('UPDATE checklists SET completed = ? WHERE id = ? AND user_id = ?').run(completed ? 1 : 0, req.params.id ?? null, req.user.id ?? null);
    res.json({ success: true });
  });

  // Gaming Plans
  app.get('/api/plans', authenticate, (req: any, res) => {
    const plans = db.prepare('SELECT * FROM gaming_plans WHERE user_id = ?').all(req.user.id ?? null);
    res.json(plans);
  });

  app.post('/api/plans', authenticate, (req: any, res) => {
    const { title, target_weeks, days_of_week, game_ids } = req.body;
    if (!title || !game_ids || game_ids.length === 0) return res.status(400).json({ error: 'Dados incompletos' });
    
    // Calculate hours per day
    let totalHours = 0;
    const selectedGames = db.prepare(`SELECT time_to_beat FROM games WHERE id IN (${game_ids.join(',')})`).all() as any[];
    selectedGames.forEach(g => totalHours += (g.time_to_beat || 0));
    
    const daysCount = JSON.parse(days_of_week || '[]').length;
    const totalDays = (target_weeks || 1) * daysCount;
    const hoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;

    const info = db.prepare(`
      INSERT INTO gaming_plans (user_id, title, target_weeks, days_of_week, hours_per_day)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id ?? null, title ?? '...', target_weeks || 1, days_of_week || '[]', hoursPerDay);
    
    const planId = info.lastInsertRowid;
    const insertPlanGame = db.prepare('INSERT INTO plan_games (plan_id, game_id) VALUES (?, ?)');
    game_ids.forEach((gid: number) => insertPlanGame.run(planId ?? null, gid ?? null));

    res.json({ id: planId, hoursPerDay });
  });

  // Admin: User Management
  app.get('/api/admin/users', authenticate, isAdmin, (req, res) => {
    const users = db.prepare('SELECT id, email, role, name, player_type, play_days, platforms, is_premium, created_at FROM users').all();
    res.json(users);
  });

  app.get('/api/admin/stats', authenticate, isAdmin, (req, res) => {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const premiumUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_premium = 1').get() as any;
    const totalGames = db.prepare('SELECT COUNT(*) as count FROM games').get() as any;
    const totalRatings = db.prepare('SELECT COUNT(*) as count FROM user_games WHERE user_rating IS NOT NULL').get() as any;
    
    res.json({
      totalUsers: totalUsers.count,
      premiumUsers: premiumUsers.count,
      totalGames: totalGames.count,
      totalRatings: totalRatings.count
    });
  });

  app.put('/api/admin/users/:id', authenticate, isAdmin, (req, res) => {
    const { role, is_premium } = req.body;
    db.prepare('UPDATE users SET role = ?, is_premium = ? WHERE id = ?')
      .run(role ?? 'user', is_premium ? 1 : 0, req.params.id ?? null);
    res.json({ success: true });
  });

  app.delete('/api/admin/users/:id', authenticate, isAdmin, (req: any, res) => {
    // Prevent deleting self
    if (Number(req.params.id) === (req.user as any).id) {
      return res.status(400).json({ error: 'Não é possível excluir a si mesmo' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id ?? null);
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
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
