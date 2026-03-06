import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Game, UserGame, ChecklistItem } from '../types';
import { motion } from 'motion/react';
import { Clock, Trophy, ExternalLink, Play, CheckCircle2, Star, MessageSquare, Plus, Trash2, ArrowLeft, Youtube, ShoppingCart } from 'lucide-react';
import { useLanguage } from '../App';
import RatingModal, { RATING_TEXTS } from '../components/RatingModal';

export default function GameDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [game, setGame] = useState<Game | null>(null);
  const [userGame, setUserGame] = useState<UserGame | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [gamesRes, userGamesRes, checklistRes, recsRes] = await Promise.all([
        fetch('/api/games').then(res => res.json()),
        fetch('/api/user-games').then(res => res.json()),
        fetch(`/api/checklists/${id}`).then(res => res.json()),
        fetch(`/api/recommendations/${id}`).then(res => res.json())
      ]);

      const foundGame = gamesRes.find((g: Game) => g.id === Number(id));
      const foundUserGame = userGamesRes.find((ug: UserGame) => ug.game_id === Number(id));

      setGame(foundGame);
      setUserGame(foundUserGame);
      setChecklist(checklistRes);
      setRecommendations(recsRes);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!userGame) return;
    
    if (status === 'completed' || status === 'platinum') {
      setShowRatingModal(true);
      return;
    }

    await fetch(`/api/user-games/${userGame.ug_id || userGame.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userGame, status })
    });
    setUserGame({ ...userGame, status: status as any });
  };

  const handleSaveRating = async (ratings: any) => {
    if (!userGame) return;
    
    const avg = (ratings.sound + ratings.graphics + ratings.gameplay + ratings.story + ratings.general) / 5;
    const status = userGame.status === 'platinum' ? 'platinum' : 'completed';

    const res = await fetch(`/api/user-games/${userGame.ug_id || userGame.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...userGame, 
        status,
        user_rating: avg,
        rating_sound: ratings.sound,
        rating_graphics: ratings.graphics,
        rating_gameplay: ratings.gameplay,
        rating_story: ratings.story,
        rating_general: ratings.general
      })
    });

    if (res.ok) {
      setUserGame({ 
        ...userGame, 
        status: status as any,
        user_rating: avg,
        rating_sound: ratings.sound,
        rating_graphics: ratings.graphics,
        rating_gameplay: ratings.gameplay,
        rating_story: ratings.story,
        rating_general: ratings.general
      });
      setShowRatingModal(false);
    }
  };

  const updateHours = async (hours: number) => {
    if (!userGame) return;
    await fetch(`/api/user-games/${userGame.ug_id || userGame.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userGame, hours_played: hours })
    });
    setUserGame({ ...userGame, hours_played: hours });
  };

  const addChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const res = await fetch('/api/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: id, task: newTask })
    });
    if (res.ok) {
      setNewTask('');
      fetch(`/api/checklists/${id}`).then(res => res.json()).then(setChecklist);
    }
  };

  const toggleChecklist = async (itemId: number, completed: boolean) => {
    await fetch(`/api/checklists/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed })
    });
    setChecklist(checklist.map(item => item.id === itemId ? { ...item, completed: !completed } : item));
  };

  if (loading || !game) return null;

  const storeLinks = [
    { name: 'Steam', url: game.steam_link, color: 'bg-[#171a21] hover:bg-[#2a475e]' },
    { name: 'Epic', url: game.epic_link, color: 'bg-[#2a2a2a] hover:bg-[#3a3a3a]' },
    { name: 'GOG', url: game.gog_link, color: 'bg-[#4d2d5e] hover:bg-[#6d3d7e]' },
  ].filter(l => l.url);

  return (
    <div className="space-y-8 pb-20">
      <Link to="/catalog" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={18} />
        {t.backToCatalog}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Cover & Actions */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border border-white/5"
          >
            <img src={game.cover_url} alt={game.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </motion.div>

          {userGame && (
            <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl space-y-6">
              {userGame.user_rating && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Sua Nota</span>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setShowRatingModal(true)}
                        className="text-[10px] font-black text-emerald-500/50 hover:text-emerald-500 uppercase tracking-widest transition-colors"
                      >
                        Editar
                      </button>
                      <div className="flex items-center gap-1 text-emerald-500">
                        <Star size={14} fill="currentColor" />
                        <span className="text-lg font-black">{userGame.user_rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { key: 'sound', label: 'Som', val: userGame.rating_sound },
                      { key: 'graphics', label: 'Gráfico', val: userGame.rating_graphics },
                      { key: 'gameplay', label: 'Jogabilidade', val: userGame.rating_gameplay },
                      { key: 'story', label: 'História', val: userGame.rating_story },
                      { key: 'general', label: 'Geral', val: userGame.rating_general },
                    ].map(cat => cat.val && (
                      <div key={cat.key} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-zinc-500 uppercase">{cat.label}</span>
                          <span className="text-emerald-500">{cat.val}/10</span>
                        </div>
                        <p className="text-[9px] text-zinc-400 italic leading-tight">
                          "{RATING_TEXTS[cat.key as keyof typeof RATING_TEXTS][cat.val - 1]}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-3">{t.status}</label>
                <div className="grid grid-cols-2 gap-2">
                  {['backlog', 'playing', 'completed', 'dropped', 'platinum'].map(s => (
                    <button 
                      key={s}
                      onClick={() => updateStatus(s)}
                      className={`py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                        userGame.status === s 
                          ? 'bg-emerald-500 text-black' 
                          : 'bg-black/40 text-zinc-500 hover:bg-white/5'
                      }`}
                    >
                      {(t as any)[`status_${s}`] || s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-3">{t.hoursPlayed}</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number" 
                    value={userGame.hours_played}
                    onChange={(e) => updateHours(Number(e.target.value))}
                    className="flex-1 bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                  />
                  <span className="text-zinc-500 text-sm font-bold">/ {game.time_to_beat}h</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Info & Features */}
        <div className="lg:col-span-2 space-y-10">
          <section>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full">{game.genre}</span>
              <div className="flex items-center gap-1 text-yellow-500">
                <Star size={14} fill="currentColor" />
                <span className="text-sm font-bold">{game.public_rating || 0}</span>
              </div>
            </div>
            <h1 className="text-5xl font-black tracking-tighter mb-4">{game.title}</h1>
            <p className="text-zinc-400 leading-relaxed text-lg">{game.description}</p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                <Clock size={24} />
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t.mainStory}</div>
                <div className="text-2xl font-black">{game.time_to_beat}h</div>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-2xl">
                <Trophy size={24} />
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t.platinum}</div>
                <div className="text-2xl font-black">{game.time_to_platinum}h</div>
              </div>
            </div>
          </section>

          {storeLinks.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShoppingCart size={16} />
                {t.availableOn}
              </h2>
              <div className="flex flex-wrap gap-3">
                {storeLinks.map(link => (
                  <a 
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${link.color} text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg`}
                  >
                    <ExternalLink size={18} />
                    {link.name}
                  </a>
                ))}
              </div>
            </section>
          )}

          {game.review_video_url && (
            <section>
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Youtube size={16} />
                {t.reviewVideo}
              </h2>
              <div className="aspect-video rounded-3xl overflow-hidden border border-white/5 bg-black">
                <iframe 
                  src={game.review_video_url.replace('watch?v=', 'embed/')}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          {/* Checklist Section */}
          <section className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" size={24} />
              {t.personalChecklist}
            </h2>
            <form onSubmit={addChecklistItem} className="flex gap-3 mb-6">
              <input 
                type="text" 
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder={t.addTaskPlaceholder}
                className="flex-1 bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
              />
              <button className="bg-emerald-500 text-black p-3 rounded-xl hover:bg-emerald-400 transition-colors">
                <Plus size={24} />
              </button>
            </form>
            <div className="space-y-3">
              {checklist.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => toggleChecklist(item.id, item.completed)}
                  className="flex items-center gap-4 p-4 bg-black/20 border border-white/5 rounded-2xl cursor-pointer hover:border-emerald-500/30 transition-all group"
                >
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'}`}>
                    {item.completed && <CheckCircle2 size={14} className="text-black" />}
                  </div>
                  <span className={`flex-1 font-medium ${item.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                    {item.task}
                  </span>
                </div>
              ))}
              {checklist.length === 0 && (
                <p className="text-center text-zinc-600 py-4 italic">{t.noTasks}</p>
              )}
            </div>
          </section>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="text-blue-500" size={24} />
                {t.playersAlsoRecommend}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recommendations.map(rec => (
                  <Link key={rec.id} to={`/game/${rec.id}`} className="group block space-y-2">
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/5">
                      <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                    </div>
                    <h3 className="text-xs font-bold line-clamp-1 group-hover:text-blue-400 transition-colors">{rec.title}</h3>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <RatingModal 
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSave={handleSaveRating}
        gameTitle={game.title}
        initialRatings={userGame ? {
          sound: userGame.rating_sound || 5,
          graphics: userGame.rating_graphics || 5,
          gameplay: userGame.rating_gameplay || 5,
          story: userGame.rating_story || 5,
          general: userGame.rating_general || 5,
        } : undefined}
      />
    </div>
  );
}
