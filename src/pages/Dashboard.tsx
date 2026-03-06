import { useState, useEffect } from 'react';
import { UserGame, GamingPlan } from '../types';
import { motion } from 'motion/react';
import { Play, CheckCircle2, Clock, ListTodo, Trophy, TrendingUp, Share2, AlertCircle, Library, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard() {
  const { t } = useLanguage();
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [plans, setPlans] = useState<GamingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/user-games').then(res => res.json()),
      fetch('/api/plans').then(res => res.json())
    ]).then(([gamesData, plansData]) => {
      setUserGames(gamesData);
      setPlans(plansData);
      setLoading(false);
    });
  }, []);

  const stats = {
    total: userGames.length,
    completed: userGames.filter(g => g.status === 'completed' || g.status === 'platinum').length,
    platinum: userGames.filter(g => g.status === 'platinum').length,
    playing: userGames.filter(g => g.status === 'playing').length,
    backlog: userGames.filter(g => g.status === 'backlog').length,
    totalHours: userGames.reduce((acc, g) => acc + (g.hours_played || 0), 0),
    neededHours: userGames.filter(g => g.status !== 'completed' && g.status !== 'platinum').reduce((acc, g) => acc + (g.time_to_beat || 0), 0)
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading) return null;

  return (
    <div className="space-y-10">
      {/* Header Stats */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Library} label={t.totalGames} value={stats.total} color="emerald" />
        <StatCard icon={CheckCircle2} label={t.completed} value={stats.completed} color="blue" />
        <StatCard icon={Trophy} label={t.platinum} value={stats.platinum} color="yellow" />
        <StatCard icon={Clock} label={t.hoursPlayed} value={stats.totalHours.toFixed(1)} color="purple" />
        <StatCard icon={TrendingUp} label={t.completion} value={`${completionRate}%`} color="orange" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Currently Playing */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Play className="text-emerald-500" size={20} />
                {t.currentlyPlaying}
              </h2>
              <Link to="/catalog" className="text-xs font-semibold text-emerald-500 hover:underline">{t.browseMore}</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userGames.filter(g => g.status === 'playing').map(game => (
                <GameCard key={game.id} game={game} />
              ))}
              {userGames.filter(g => g.status === 'playing').length === 0 && (
                <div className="col-span-2 p-8 border border-dashed border-white/10 rounded-3xl text-center text-zinc-500">
                  {t.noPlaying}
                </div>
              )}
            </div>
          </section>

          {/* Active Plans */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="text-blue-500" size={20} />
                {t.activePlans}
              </h2>
              <Link to="/planning" className="text-xs font-semibold text-blue-500 hover:underline">{t.newPlan}</Link>
            </div>
            <div className="space-y-4">
              {plans.filter(p => p.status === 'active').map(plan => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
              {plans.filter(p => p.status === 'active').length === 0 && (
                <div className="p-8 border border-dashed border-white/10 rounded-3xl text-center text-zinc-500">
                  {t.noPlans}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Steam Shame / Backlog Reality */}
          <section className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 p-6 rounded-3xl">
            <div className="flex items-center gap-2 mb-4 text-red-400">
              <AlertCircle size={20} />
              <h2 className="font-bold uppercase tracking-wider text-sm">{t.backlogReality}</h2>
            </div>
            <div className="space-y-4">
              <div className="text-3xl font-black tracking-tighter">
                {stats.neededHours}h <span className="text-sm font-normal text-zinc-500">{t.needed}</span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {t.play2hPerDay}
              </p>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <div className="text-xl font-bold text-orange-400">
                  {Math.ceil(stats.neededHours / 2 / 30)} {t.months}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{t.estimatedCompletion} {new Date(Date.now() + (stats.neededHours / 2) * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
              </div>
              <button className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                <Share2 size={14} />
                {t.shareMyShame}
              </button>
            </div>
          </section>

          {/* Quick Checklist */}
          <section className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <ListTodo size={18} className="text-emerald-500" />
              {t.quickTasks}
            </h2>
            <div className="space-y-3">
              {userGames.filter(g => g.status === 'playing').slice(0, 3).map(g => (
                <div key={g.id} className="flex items-center gap-3 text-sm text-zinc-400">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  <span>{t.completed} {g.title}</span>
                </div>
              ))}
              <Link to="/catalog" className="block text-center text-xs text-zinc-500 hover:text-white mt-4">{t.viewAllTasks}</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: any = {
    emerald: 'text-emerald-500 bg-emerald-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    yellow: 'text-yellow-500 bg-yellow-500/10',
  };

  return (
    <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function GameCard({ game }: { game: UserGame }) {
  const progress = Math.min(100, Math.round((game.hours_played / game.time_to_beat) * 100));

  return (
    <Link to={`/game/${game.game_id}`} className="group block bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden hover:border-emerald-500/30 transition-all">
      <div className="flex h-32">
        <img src={game.cover_url} alt={game.title} className="w-24 object-cover" referrerPolicy="no-referrer" />
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm line-clamp-1 group-hover:text-emerald-400 transition-colors">{game.title}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full uppercase">{game.genre}</span>
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                <Clock size={10} />
                {game.hours_played}h / {game.time_to_beat}h
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-zinc-500">
              <span className="uppercase tracking-widest opacity-50">PROGRESS</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PlanCard({ plan }: { plan: GamingPlan }) {
  const { language } = useLanguage();
  const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const days = language === 'pt' ? daysPt : daysEn;
  const activeDays = JSON.parse(plan.days_of_week as any);

  return (
    <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold">{plan.title}</h3>
          <p className="text-xs text-zinc-500 mt-1">Target: {plan.hours_per_day.toFixed(1)}h per session</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-blue-500 uppercase tracking-widest">{plan.target_weeks} WEEKS</div>
        </div>
      </div>
      <div className="flex gap-2">
        {days.map((day, i) => (
          <div 
            key={day}
            className={`flex-1 text-center py-2 rounded-xl text-[10px] font-bold border transition-colors ${
              activeDays.includes(i) 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                : 'bg-black/20 border-white/5 text-zinc-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}
