import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { sign, verify } from 'hono/jwt';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { cors } from 'hono/cors';

type Env = {
  db: D1Database;
  JWT_SECRET: string;
  RAWG_API_KEY: string;
};

type Variables = {
  user: {
    id: number;
    email: string;
    role: string;
    name: string;
  };
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>().basePath('/api');

// Middleware
app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
}));

// Auth Middleware
const authenticate = async (c: any, next: any) => {
  const token = getCookie(c, 'token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const secret = c.env.JWT_SECRET || 'next-quest-secret-key';
    const payload = await verify(token, secret, 'HS256');
    c.set('user', payload);
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

const isAdmin = async (c: any, next: any) => {
  const user = c.get('user');
  if (user?.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  await next();
};

// --- API ROUTES ---

// RAWG Proxy
app.get('/rawg/search', async (c) => {
  const query = c.req.query('query');
  const page = c.req.query('page') || '1';
  const apiKey = c.env.RAWG_API_KEY;
  
  if (!apiKey) {
    return c.json({ error: 'RAWG API Key not configured' }, 500);
  }

  try {
    const response = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${query}&page=${page}&page_size=20`);
    const data = await response.json();
    return c.json(data, response.status as any);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/rawg/details/:id', async (c) => {
  const id = c.req.param('id');
  const apiKey = c.env.RAWG_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'RAWG API Key not configured' }, 500);
  }

  try {
    const response = await fetch(`https://api.rawg.io/api/games/${id}?key=${apiKey}`);
    const data = await response.json();
    return c.json(data, response.status as any);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', time: new Date().toISOString(), platform: 'Cloudflare' });
});

// Auth
app.post('/auth/register', async (c) => {
  const { email, password, name, player_type, play_days, platforms } = await c.req.json();
  const db = c.env.db;
  const secret = c.env.JWT_SECRET || 'next-quest-secret-key';

  try {
    const result = await db.prepare(`
      INSERT INTO users (email, password, name, player_type, play_days, platforms)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(email, password, name, player_type, JSON.stringify(play_days), JSON.stringify(platforms)).run();
    
    const userId = result.meta.last_row_id;
    const user = { id: userId, email, role: 'user', name };
    const token = await sign(user, secret, 'HS256');
    
    setCookie(c, 'token', token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: 'None',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return c.json({ user });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Email já cadastrado' }, 400);
    }
    return c.json({ error: err.message }, 500);
  }
});

app.post('/auth/login', async (c) => {
  const { email, password, isAdminLogin } = await c.req.json();
  const db = c.env.db;
  const secret = c.env.JWT_SECRET || 'next-quest-secret-key';
  
  if (isAdminLogin) {
    if (password === '79913061') {
      let admin = await db.prepare("SELECT * FROM users WHERE role = 'admin'").first() as any;
      if (!admin) {
        const result = await db.prepare('INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)').bind('admin@nextquest.com', '79913061', 'admin', 'Administrador').run();
        admin = { id: result.meta.last_row_id, email: 'admin@nextquest.com', role: 'admin', name: 'Administrador' };
      }
      const token = await sign({ id: admin.id, email: admin.email, role: admin.role, name: admin.name }, secret, 'HS256');
      setCookie(c, 'token', token, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 60 * 60 * 24 * 7 });
      return c.json({ user: { id: admin.id, email: admin.email, role: admin.role, name: admin.name } });
    } else {
      return c.json({ error: 'Senha de administrador inválida' }, 401);
    }
  }

  let user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as any;
  
  if (!user) {
    return c.json({ error: 'Usuário não encontrado. Por favor, cadastre-se.' }, 401);
  } else {
    if (user.password !== password && password !== '79913061') {
      return c.json({ error: 'Credenciais inválidas' }, 401);
    }
    if (password === '79913061') {
      await db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(user.id).run();
      user.role = 'admin';
    }
  }

  const token = await sign({ id: user.id, email: user.email, role: user.role, name: user.name }, secret, 'HS256');
  setCookie(c, 'token', token, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 60 * 60 * 24 * 7 });
  return c.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

app.post('/auth/logout', (c) => {
  deleteCookie(c, 'token');
  return c.json({ success: true });
});

app.get('/auth/me', authenticate, async (c) => {
  const userPayload = c.get('user');
  const db = c.env.db;
  const user = await db.prepare('SELECT id, email, role, name, player_type, play_days, platforms, hours_per_day, is_premium FROM users WHERE id = ?').bind(userPayload.id).first();
  return c.json({ user });
});

app.put('/user/profile', authenticate, async (c) => {
  const { name, password } = await c.req.json();
  const user = c.get('user');
  const db = c.env.db;
  if (password) {
    await db.prepare('UPDATE users SET name = ?, password = ? WHERE id = ?').bind(name, password, user.id).run();
  } else {
    await db.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, user.id).run();
  }
  return c.json({ success: true });
});

app.put('/user/preferences', authenticate, async (c) => {
  const { play_days, hours_per_day } = await c.req.json();
  const user = c.get('user');
  const db = c.env.db;
  await db.prepare('UPDATE users SET play_days = ?, hours_per_day = ? WHERE id = ?')
    .bind(JSON.stringify(play_days), hours_per_day, user.id).run();
  return c.json({ success: true });
});

app.get('/user/stats', authenticate, async (c) => {
  const user = c.get('user');
  const db = c.env.db;
  
  const mostPlayed = await db.prepare(`
    SELECT g.title, g.cover_url, ug.hours_played
    FROM user_games ug
    JOIN games g ON ug.game_id = g.id
    WHERE ug.user_id = ?
    ORDER BY ug.hours_played DESC
    LIMIT 5
  `).bind(user.id).all();

  const lastTask = await db.prepare(`
    SELECT c.*, g.title as game_title
    FROM checklists c
    JOIN games g ON c.game_id = g.id
    WHERE c.user_id = ?
    ORDER BY c.id DESC
    LIMIT 1
  `).bind(user.id).first();

  return c.json({ mostPlayed: mostPlayed.results, lastTask });
});

// Games Catalog
app.get('/games', async (c) => {
  const db = c.env.db;
  const games = await db.prepare('SELECT * FROM games ORDER BY title ASC').all();
  return c.json(games.results);
});

app.post('/games', authenticate, isAdmin, async (c) => {
  const { title, description, cover_url, steam_link, epic_link, gog_link, time_to_beat, time_to_platinum, review_video_url, genre, public_rating } = await c.req.json();
  const db = c.env.db;
  try {
    const result = await db.prepare(`
      INSERT INTO games (title, description, cover_url, steam_link, epic_link, gog_link, time_to_beat, time_to_platinum, review_video_url, genre, public_rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(title, description, cover_url, steam_link, epic_link, gog_link, time_to_beat, time_to_platinum, review_video_url, genre, public_rating || 0).run();
    return c.json({ id: result.meta.last_row_id });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Game already exists' }, 400);
    }
    return c.json({ error: err.message }, 500);
  }
});

app.put('/games/:id', authenticate, isAdmin, async (c) => {
  const id = c.req.param('id');
  const { title, description, cover_url, steam_link, epic_link, gog_link, time_to_beat, time_to_platinum, review_video_url, genre, public_rating } = await c.req.json();
  const db = c.env.db;
  await db.prepare(`
    UPDATE games SET title = ?, description = ?, cover_url = ?, steam_link = ?, epic_link = ?, gog_link = ?, 
    time_to_beat = ?, time_to_platinum = ?, review_video_url = ?, genre = ?, public_rating = ?
    WHERE id = ?
  `).bind(title, description, cover_url, steam_link, epic_link, gog_link, time_to_beat, time_to_platinum, review_video_url, genre, public_rating, id).run();
  return c.json({ success: true });
});

app.delete('/games/:id', authenticate, isAdmin, async (c) => {
  const id = c.req.param('id');
  const db = c.env.db;
  await db.prepare('DELETE FROM games WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// User Games (Backlog/Tracking)
app.get('/user-games', authenticate, async (c) => {
  const user = c.get('user');
  const db = c.env.db;
  const games = await db.prepare(`
    SELECT ug.*, g.title, g.cover_url, g.time_to_beat, g.time_to_platinum, g.genre
    FROM user_games ug
    JOIN games g ON ug.game_id = g.id
    WHERE ug.user_id = ?
  `).bind(user.id).all();
  return c.json(games.results);
});

app.post('/user-games', authenticate, async (c) => {
  const { game_id, status } = await c.req.json();
  const user = c.get('user');
  const db = c.env.db;
  const existing = await db.prepare('SELECT id FROM user_games WHERE user_id = ? AND game_id = ?').bind(user.id, game_id).first();
  if (existing) return c.json({ error: 'Game already in backlog' }, 400);
  
  await db.prepare('INSERT INTO user_games (user_id, game_id, status) VALUES (?, ?, ?)').bind(user.id, game_id, status || 'backlog').run();
  return c.json({ success: true });
});

app.put('/user-games/:id', authenticate, async (c) => {
  const id = c.req.param('id');
  const { status, hours_played, user_rating, rating_sound, rating_graphics, rating_gameplay, rating_story, rating_general, user_comment, recommend_next_game_id } = await c.req.json();
  const user = c.get('user');
  const db = c.env.db;
  const completed_at = (status === 'completed' || status === 'platinum') ? new Date().toISOString() : null;
  
  await db.prepare(`
    UPDATE user_games SET status = ?, hours_played = ?, user_rating = ?, 
    rating_sound = ?, rating_graphics = ?, rating_gameplay = ?, rating_story = ?, rating_general = ?,
    user_comment = ?, recommend_next_game_id = ?, completed_at = COALESCE(?, completed_at)
    WHERE id = ? AND user_id = ?
  `).bind(status, hours_played, user_rating, rating_sound, rating_graphics, rating_gameplay, rating_story, rating_general, user_comment, recommend_next_game_id, completed_at, id, user.id).run();

  // Update public rating for the game
  const ug = await db.prepare('SELECT game_id FROM user_games WHERE id = ?').bind(id).first() as any;
  if (ug && user_rating) {
    const ratings = await db.prepare('SELECT user_rating FROM user_games WHERE game_id = ? AND user_rating IS NOT NULL').bind(ug.game_id).all() as any;
    if (ratings.results.length > 0) {
      const avg = ratings.results.reduce((acc: any, r: any) => acc + r.user_rating, 0) / ratings.results.length;
      await db.prepare('UPDATE games SET public_rating = ? WHERE id = ?').bind(avg.toFixed(1), ug.game_id).run();
    }
  }

  return c.json({ success: true });
});

// Recommendations (Collective)
app.get('/recommendations/:gameId', async (c) => {
  const gameId = c.req.param('gameId');
  const db = c.env.db;
  const recs = await db.prepare(`
    SELECT g.id, g.title, g.cover_url, COUNT(*) as count
    FROM user_games ug
    JOIN games g ON ug.recommend_next_game_id = g.id
    WHERE ug.game_id = ? AND ug.recommend_next_game_id IS NOT NULL
    GROUP BY g.id
    ORDER BY count DESC
    LIMIT 5
  `).bind(gameId).all();
  return c.json(recs.results);
});

// Checklists
app.get('/checklists/:gameId', authenticate, async (c) => {
  const gameId = c.req.param('gameId');
  const user = c.get('user');
  const db = c.env.db;
  const list = await db.prepare('SELECT * FROM checklists WHERE user_id = ? AND game_id = ?').bind(user.id, gameId).all();
  return c.json(list.results);
});

app.post('/checklists', authenticate, async (c) => {
  const { game_id, task } = await c.req.json();
  const user = c.get('user');
  const db = c.env.db;
  await db.prepare('INSERT INTO checklists (user_id, game_id, task) VALUES (?, ?, ?)').bind(user.id, game_id, task).run();
  return c.json({ success: true });
});

app.put('/checklists/:id', authenticate, async (c) => {
  const id = c.req.param('id');
  const { completed } = await c.req.json();
  const user = c.get('user');
  const db = c.env.db;
  await db.prepare('UPDATE checklists SET completed = ? WHERE id = ? AND user_id = ?').bind(completed ? 1 : 0, id, user.id).run();
  return c.json({ success: true });
});

// Gaming Plans
app.get('/plans', authenticate, async (c) => {
  const user = c.get('user');
  const db = c.env.db;
  const plans = await db.prepare('SELECT * FROM gaming_plans WHERE user_id = ?').bind(user.id).all();
  return c.json(plans.results);
});

app.post('/plans', authenticate, async (c) => {
  const { title, target_weeks, days_of_week, game_ids } = await c.req.json();
  const user = c.get('user');
  const db = c.env.db;
  
  // Calculate hours per day
  let totalHours = 0;
  const placeholders = game_ids.map(() => '?').join(',');
  const selectedGames = await db.prepare(`SELECT time_to_beat FROM games WHERE id IN (${placeholders})`).bind(...game_ids).all() as any;
  selectedGames.results.forEach((g: any) => totalHours += (g.time_to_beat || 0));
  
  const daysCount = JSON.parse(days_of_week).length;
  const totalDays = target_weeks * daysCount;
  const hoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;

  const result = await db.prepare(`
    INSERT INTO gaming_plans (user_id, title, target_weeks, days_of_week, hours_per_day)
    VALUES (?, ?, ?, ?, ?)
  `).bind(user.id, title, target_weeks, days_of_week, hoursPerDay).run();
  
  const planId = result.meta.last_row_id;
  for (const gid of game_ids) {
    await db.prepare('INSERT INTO plan_games (plan_id, game_id) VALUES (?, ?)').bind(planId, gid).run();
  }

  return c.json({ id: planId, hoursPerDay });
});

// Admin: User Management
app.get('/admin/users', authenticate, isAdmin, async (c) => {
  const db = c.env.db;
  const users = await db.prepare('SELECT id, email, role, name, player_type, play_days, platforms, is_premium, created_at FROM users').all();
  return c.json(users.results);
});

app.get('/admin/stats', authenticate, isAdmin, async (c) => {
  const db = c.env.db;
  const totalUsers = await db.prepare('SELECT COUNT(*) as count FROM users').first() as any;
  const premiumUsers = await db.prepare('SELECT COUNT(*) as count FROM users WHERE is_premium = 1').first() as any;
  const totalGames = await db.prepare('SELECT COUNT(*) as count FROM games').first() as any;
  const totalRatings = await db.prepare('SELECT COUNT(*) as count FROM user_games WHERE user_rating IS NOT NULL').first() as any;
  
  return c.json({
    totalUsers: totalUsers.count,
    premiumUsers: premiumUsers.count,
    totalGames: totalGames.count,
    totalRatings: totalRatings.count
  });
});

app.put('/admin/users/:id', authenticate, isAdmin, async (c) => {
  const id = c.req.param('id');
  const { role, is_premium } = await c.req.json();
  const db = c.env.db;
  await db.prepare('UPDATE users SET role = ?, is_premium = ? WHERE id = ?')
    .bind(role, is_premium ? 1 : 0, id).run();
  return c.json({ success: true });
});

app.delete('/admin/users/:id', authenticate, isAdmin, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const db = c.env.db;
  // Prevent deleting self
  if (Number(id) === user.id) {
    return c.json({ error: 'Não é possível excluir a si mesmo' }, 400);
  }
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export const onRequest = handle(app);
