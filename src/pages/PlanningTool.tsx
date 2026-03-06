import { useState, useEffect } from 'react';
import { Game, UserGame } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, CheckCircle2, Plus, Trash2, ArrowRight, TrendingUp, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function PlanningTool() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [days, setDays] = useState<number[]>([5, 6, 0]); // Fri, Sat, Sun
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user-games')
      .then(res => res.json())
      .then(data => {
        setUserGames(data.filter((ug: UserGame) => ug.status !== 'completed' && ug.status !== 'platinum'));
        setLoading(false);
      });
  }, []);

  const toggleGame = (id: number) => {
    setSelectedGames(prev => 
      prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
    );
  };

  const toggleDay = (day: number) => {
    setDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const totalHours = userGames
    .filter(ug => selectedGames.includes(ug.game_id))
    .reduce((acc, ug) => acc + (ug.time_to_beat || 0), 0);

  const totalDays = weeks * days.length;
  const hoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGames.length === 0) return alert(t.selectGames);
    
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        target_weeks: weeks,
        days_of_week: JSON.stringify(days),
        game_ids: selectedGames
      })
    });

    if (res.ok) {
      navigate('/');
    }
  };

  const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayLabels = language === 'pt' ? daysPt : daysEn;

  if (loading) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 bg-blue-500/10 text-blue-500 rounded-3xl mb-4">
          <Calendar size={48} />
        </div>
        <h1 className="text-4xl font-black tracking-tighter">{t.planningTool}</h1>
        <p className="text-zinc-500 max-w-lg mx-auto">
          {t.planTagline}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
          {/* Step 1: Title & Duration */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-500 text-black flex items-center justify-center text-sm font-black">1</span>
              {t.planDetails}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">{t.planName}</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t.planNamePlaceholder}
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:border-blue-500/50 text-lg"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">{t.howManyWeeks}</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" 
                    max="12" 
                    value={weeks}
                    onChange={e => setWeeks(Number(e.target.value))}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="text-2xl font-black text-blue-500 w-12 text-center">{weeks}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Step 2: Days of Week */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-500 text-black flex items-center justify-center text-sm font-black">2</span>
              {t.playingDays}
            </h2>
            <div className="flex gap-2">
              {dayLabels.map((day, i) => (
                <button 
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex-1 py-4 rounded-2xl text-xs font-bold border transition-all active:scale-95 ${
                    days.includes(i) 
                      ? 'bg-blue-500 text-black border-blue-500 shadow-lg shadow-blue-500/20' 
                      : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/20'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </section>

          {/* Step 3: Select Games */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-500 text-black flex items-center justify-center text-sm font-black">3</span>
              {t.selectGames}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userGames.map(ug => (
                <div 
                  key={ug.game_id}
                  onClick={() => toggleGame(ug.game_id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 ${
                    selectedGames.includes(ug.game_id)
                      ? 'bg-blue-500/10 border-blue-500/50'
                      : 'bg-zinc-900 border-white/5 hover:border-white/20'
                  }`}
                >
                  <img src={ug.cover_url} className="w-12 h-16 object-cover rounded-lg" referrerPolicy="no-referrer" />
                  <div className="flex-1">
                    <h3 className="font-bold text-sm line-clamp-1">{ug.title}</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{ug.time_to_beat}h {t.needed}</p>
                  </div>
                  {selectedGames.includes(ug.game_id) && <CheckCircle2 className="text-blue-500" size={20} />}
                </div>
              ))}
              {userGames.length === 0 && (
                <div className="col-span-2 p-8 border border-dashed border-white/10 rounded-3xl text-center text-zinc-500">
                  {t.noPlaying}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <div className="sticky top-24 bg-zinc-900 border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">{t.planSummary}</h3>
            
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-zinc-400">
                  <Clock size={20} />
                  <span className="text-sm font-medium">{t.totalHours}</span>
                </div>
                <span className="text-xl font-black">{totalHours}h</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-zinc-400">
                  <Calendar size={20} />
                  <span className="text-sm font-medium">{t.sessions}</span>
                </div>
                <span className="text-xl font-black">{totalDays}</span>
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">{t.hoursPerSession}</div>
                <div className="text-5xl font-black tracking-tighter text-blue-500">
                  {hoursPerDay.toFixed(1)}<span className="text-xl font-bold ml-1">h</span>
                </div>
              </div>

              <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 flex gap-3">
                <Info size={20} className="text-blue-500 shrink-0" />
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  {t.planAdvice}
                </p>
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-400 text-black font-black py-5 rounded-2xl flex items-center justify-center gap-2 group transition-all active:scale-95 shadow-xl shadow-blue-500/20"
              >
                {t.savePlan}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
