import { useState, useEffect } from 'react';
import { Game, UserGame } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Search, Plus, ExternalLink, Filter, Clock, Gamepad2, Check, Star, Trophy, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';

export default function GameCatalog() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/games').then(res => res.json()),
      fetch('/api/user-games').then(res => res.json())
    ]).then(([gamesData, userGamesData]) => {
      setGames(gamesData);
      setUserGames(userGamesData);
      setLoading(false);
    });
  }, []);

  const filteredGames = games.filter(g => 
    g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.genre.toLowerCase().includes(search.toLowerCase())
  );

  const addToBacklog = async (gameId: number) => {
    const res = await fetch('/api/user-games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: gameId, status: 'backlog' })
    });
    if (res.ok) {
      navigate('/');
    }
  };

  const isGameInBacklog = (gameId: number) => userGames.some(ug => ug.game_id === gameId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.gameCatalog}</h1>
          <p className="text-zinc-500 mt-1">{t.discoverNextAdventure}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder={t.searchGames}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-900 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-emerald-500/50 w-64 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredGames.map(game => (
          <motion.div 
            layout
            key={game.id}
            className="group bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden hover:border-emerald-500/30 transition-all flex flex-col h-full"
          >
            <Link to={`/game/${game.id}`} className="relative aspect-[16/9] overflow-hidden">
              <img 
                src={game.cover_url} 
                alt={game.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-1 text-yellow-500">
                <Star size={12} fill="currentColor" />
                <span className="text-[10px] font-black">{game.public_rating || 0}</span>
              </div>
            </Link>
            
            <div className="p-5 flex-1 flex flex-col">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{game.genre}</span>
                </div>
                <h3 className="font-black text-lg line-clamp-1 mb-2">{game.title}</h3>
                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{game.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
                  <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t.mainStory}</div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-blue-400" />
                    <span className="text-xs font-bold">{game.time_to_beat}h</span>
                  </div>
                </div>
                <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
                  <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t.platinum}</div>
                  <div className="flex items-center gap-1.5">
                    <Trophy size={12} className="text-yellow-500" />
                    <span className="text-xs font-bold">{game.time_to_platinum}h</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {game.steam_link && (
                  <a href={game.steam_link} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#171a21] hover:bg-[#2a475e] rounded-lg text-white transition-colors" title="Steam">
                    <ShoppingCart size={14} />
                  </a>
                )}
                {game.epic_link && (
                  <a href={game.epic_link} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg text-white transition-colors" title="Epic">
                    <ShoppingCart size={14} />
                  </a>
                )}
                {game.gog_link && (
                  <a href={game.gog_link} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#4d2d5e] hover:bg-[#6d3d7e] rounded-lg text-white transition-colors" title="GOG">
                    <ShoppingCart size={14} />
                  </a>
                )}
              </div>
              
              <div className="mt-auto">
                {isGameInBacklog(game.id) ? (
                  <div className="w-full bg-emerald-500/10 text-emerald-500 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                    <Check size={16} />
                    {t.inBacklog}
                  </div>
                ) : (
                  <button 
                    onClick={() => addToBacklog(game.id)}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-500/20"
                  >
                    <Plus size={16} />
                    {t.addToBacklog}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
