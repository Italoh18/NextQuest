import { useState, useEffect } from 'react';
import { UserGame, GamingPlan, ChecklistItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Play, CheckCircle2, Clock, ListTodo, Trophy, TrendingUp, Share2, AlertCircle, Library, Calendar, ChevronRight, Settings, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface UserStats {
  mostPlayed: { title: string; cover_url: string; hours_played: number }[];
  lastTask: (ChecklistItem & { game_title: string }) | null;
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { user, login } = useAuth();
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [plans, setPlans] = useState<GamingPlan[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllGames, setShowAllGames] = useState(false);
  
  // Backlog Reality Settings
  const [hoursPerDay, setHoursPerDay] = useState(user?.hours_per_day || 2);
  const [playDays, setPlayDays] = useState<number[]>(JSON.parse(user?.play_days || '[]'));
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/user-games').then(res => res.json()),
      fetch('/api/plans').then(res => res.json()),
      fetch('/api/user/stats').then(res => res.json())
    ]).then(([gamesData, plansData, statsData]) => {
      setUserGames(gamesData);
      setPlans(plansData);
      setStats(statsData);
      setLoading(false);
    });
  }, []);

  const dashboardStats = {
    total: userGames.length,
    completed: userGames.filter(g => g.status === 'completed' || g.status === 'platinum').length,
    platinum: userGames.filter(g => g.status === 'platinum').length,
    playing: userGames.filter(g => g.status === 'playing').length,
    backlog: userGames.filter(g => g.status === 'backlog').length,
    totalHours: userGames.reduce((acc, g) => acc + (g.hours_played || 0), 0),
    neededHours: userGames.filter(g => g.status !== 'completed' && g.status !== 'platinum').reduce((acc, g) => acc + (g.time_to_beat || 0), 0)
  };

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ play_days: playDays, hours_per_day: hoursPerDay }),
      });
      if (res.ok && user) {
        login({ ...user, play_days: JSON.stringify(playDays), hours_per_day: hoursPerDay });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const toggleDay = (day: number) => {
    setPlayDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  if (loading) return null;

  const currentlyPlaying = userGames.find(g => g.status === 'playing');

  return (
    <div className="space-y-12 pb-20">
      {/* 1. JOGANDO ATUALMENTE & LEADERBOARD */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Play size={14} className="text-emerald-500" />
            Jogando Atualmente
          </h2>
          {currentlyPlaying ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/5 aspect-[21/9]"
            >
              <img 
                src={currentlyPlaying.cover_url} 
                className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm group-hover:scale-110 transition-transform duration-700" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 p-8 flex items-end gap-8">
                <img 
                  src={currentlyPlaying.cover_url} 
                  className="w-32 aspect-[3/4] object-cover rounded-2xl shadow-2xl border border-white/10" 
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 pb-2">
                  <h3 className="text-3xl font-black tracking-tighter text-white mb-2">{currentlyPlaying.title}</h3>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tempo de Jogo</span>
                      <span className="text-xl font-black text-emerald-500">{currentlyPlaying.hours_played}h</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Progresso</span>
                      <span className="text-xl font-black text-white">{Math.round((currentlyPlaying.hours_played / currentlyPlaying.time_to_beat) * 100)}%</span>
                    </div>
                  </div>
                  <Link 
                    to={`/game/${currentlyPlaying.game_id}`}
                    className="mt-6 inline-flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full text-xs font-black hover:bg-emerald-400 transition-colors"
                  >
                    CONTINUAR JORNADA
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-64 rounded-[2.5rem] border-2 border-dashed border-white/5 flex items-center justify-center text-zinc-600 font-bold">
              Nenhum jogo em andamento. Comece um agora!
            </div>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-8">
          <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Trophy size={14} className="text-yellow-500" />
            Mais Jogados
          </h2>
          <div className="space-y-4">
            {stats?.mostPlayed.map((game, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <span className="text-2xl font-black text-zinc-800 group-hover:text-emerald-500/20 transition-colors">0{i+1}</span>
                <img src={game.cover_url} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{game.title}</div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{game.hours_played} HORAS</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. MEUS JOGOS (SMALL VIEW) */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Library size={14} className="text-blue-500" />
            Meus Jogos
          </h2>
          <button 
            onClick={() => setShowAllGames(!showAllGames)}
            className="text-xs font-black text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            {showAllGames ? 'RECOLHER' : 'VER TODOS'}
            <ChevronRight size={14} className={showAllGames ? 'rotate-90' : ''} />
          </button>
        </div>
        
        <div className={`grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 transition-all duration-500 ${showAllGames ? 'max-h-[2000px]' : 'max-h-32 overflow-hidden'}`}>
          {userGames.map(game => (
            <Link 
              key={game.id} 
              to={`/game/${game.game_id}`}
              className="aspect-[3/4] rounded-xl overflow-hidden border border-white/5 hover:border-emerald-500/50 transition-all group relative"
            >
              <img src={game.cover_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                <span className="text-[10px] font-black text-white leading-tight">{game.title}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. TAREFAS & BACKLOG REALITY */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <ListTodo size={14} className="text-emerald-500" />
              Tarefas
            </h2>
            <Link to="/catalog" className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <Settings size={14} className="text-zinc-400" />
            </Link>
          </div>
          
          {stats?.lastTask ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Última Tarefa Adicionada</div>
                <div className="text-sm font-bold text-white mb-2">{stats.lastTask.task}</div>
                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Library size={10} />
                  {stats.lastTask.game_title}
                </div>
              </div>
              <Link 
                to="/tasks" 
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-zinc-400 text-center block transition-colors"
              >
                ABRIR ABA DE TAREFAS
              </Link>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-600 text-xs font-bold">
              Nenhuma tarefa pendente.
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-black border border-white/5 rounded-[2.5rem] p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <AlertCircle size={14} className="text-orange-500" />
              Realidade do Backlog
            </h2>
            <button 
              onClick={handleSavePreferences}
              disabled={isSavingPrefs}
              className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-4 py-2 rounded-xl text-[10px] font-black transition-all disabled:opacity-50"
            >
              <Save size={14} />
              {isSavingPrefs ? 'SALVANDO...' : 'SALVAR PREFERÊNCIAS'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest flex justify-between">
                  Horas por dia
                  <span className="text-emerald-500">{hoursPerDay}h</span>
                </label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="12" 
                  step="0.5" 
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Dias da Semana</label>
                <div className="flex gap-2">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`flex-1 aspect-square rounded-xl text-[10px] font-black transition-all border ${
                        playDays.includes(i) 
                          ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                          : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/10'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-3xl p-6 flex flex-col justify-center text-center">
              <div className="text-4xl font-black text-white tracking-tighter mb-2">
                {Math.ceil(dashboardStats.neededHours / (hoursPerDay * (playDays.length || 1)) / 4)} Meses
              </div>
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                Para limpar seu backlog de {dashboardStats.neededHours}h
              </div>
              <div className="mt-6 pt-6 border-t border-white/5">
                <div className="text-xs font-bold text-zinc-400">
                  Data estimada: {new Date(Date.now() + (dashboardStats.neededHours / (hoursPerDay * (playDays.length || 1) / 7)) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
