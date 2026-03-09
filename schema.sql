-- NextQuest Database Schema (Cloudflare D1 / SQLite)

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- 'admin' or 'user'
    name TEXT,
    player_type TEXT,
    play_days TEXT, -- JSON array of days
    platforms TEXT, -- JSON array of platforms
    hours_per_day REAL DEFAULT 2, -- Default hours per day for backlog reality
    is_premium INTEGER DEFAULT 0, -- 0 for false, 1 for true
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Games Table (Master Catalog - Aligned with RAWG)
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY, -- RAWG ID
    slug TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    steam_link TEXT,
    epic_link TEXT,
    gog_link TEXT,
    time_to_beat REAL, -- Main story hours
    time_to_platinum REAL, -- Completionist hours
    review_video_url TEXT,
    genre TEXT,
    public_rating REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);

-- User Games (Tracking/Backlog)
CREATE TABLE IF NOT EXISTS user_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_id INTEGER NOT NULL,
    status TEXT DEFAULT 'backlog', -- 'backlog', 'playing', 'completed', 'dropped', 'wishlist', 'paused'
    hours_played REAL DEFAULT 0,
    user_rating REAL, -- 1 to 10 (average of categories)
    rating_sound INTEGER,
    rating_graphics INTEGER,
    rating_gameplay INTEGER,
    rating_story INTEGER,
    rating_general INTEGER,
    user_comment TEXT,
    recommend_next_game_id INTEGER, -- "If you liked this, play that"
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    UNIQUE(user_id, game_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (recommend_next_game_id) REFERENCES games(id)
);

CREATE INDEX IF NOT EXISTS idx_user_games_user ON user_games(user_id);
CREATE INDEX IF NOT EXISTS idx_user_games_game ON user_games(game_id);

-- Game Checklists (Personal tasks per game)
CREATE TABLE IF NOT EXISTS checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_id INTEGER NOT NULL,
    task TEXT NOT NULL,
    completed INTEGER DEFAULT 0, -- 0 for false, 1 for true
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Gaming Plans (Scheduling)
CREATE TABLE IF NOT EXISTS gaming_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    target_weeks INTEGER,
    days_of_week TEXT, -- JSON array of days [0, 5, 6] (Sun, Fri, Sat)
    hours_per_day REAL,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Plan Games (Games associated with a specific plan)
CREATE TABLE IF NOT EXISTS plan_games (
    plan_id INTEGER NOT NULL,
    game_id INTEGER NOT NULL,
    PRIMARY KEY (plan_id, game_id),
    FOREIGN KEY (plan_id) REFERENCES gaming_plans(id),
    FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Initial Admin User (if not exists)
INSERT OR IGNORE INTO users (email, password, role, name) VALUES ('admin@nextquest.com', '79913061', 'admin', 'Administrador');
