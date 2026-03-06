export interface User {
  id: number;
  email: string;
  role: 'admin' | 'user';
  name?: string;
  player_type?: string;
  play_days?: string; // JSON string or comma separated
  platforms?: string; // JSON string or comma separated
  is_premium?: boolean;
  created_at?: string;
}

export interface Game {
  id: number;
  title: string;
  description: string;
  cover_url: string;
  steam_link?: string;
  epic_link?: string;
  gog_link?: string;
  time_to_beat: number;
  time_to_platinum: number;
  review_video_url?: string;
  genre: string;
  public_rating?: number;
}

export interface UserGame extends Game {
  ug_id: number;
  game_id: number;
  status: 'backlog' | 'playing' | 'completed' | 'dropped' | 'platinum';
  hours_played: number;
  user_rating?: number;
  rating_sound?: number;
  rating_graphics?: number;
  rating_gameplay?: number;
  rating_story?: number;
  rating_general?: number;
  user_comment?: string;
  recommend_next_game_id?: number;
  added_at: string;
  completed_at?: string;
}

export interface ChecklistItem {
  id: number;
  game_id: number;
  task: string;
  completed: boolean;
}

export interface GamingPlan {
  id: number;
  title: string;
  start_date: string;
  target_weeks: number;
  days_of_week: number[]; // [0, 5, 6]
  hours_per_day: number;
  status: 'active' | 'completed';
}
