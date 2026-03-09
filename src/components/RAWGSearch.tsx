import React, { useState } from 'react';
import { Search, Plus, Loader2, ExternalLink, Clock, Trophy, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RAWGGame {
  id: number;
  name: string;
  background_image: string;
  released: string;
  rating: number;
  slug: string;
  genres: { name: string }[];
}

interface RAWGDetail extends RAWGGame {
  description_raw: string;
  playtime: number; // Main story approx
  suggestions_count: number;
}

export default function RAWGSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RAWGGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/rawg/search?query=${encodeURIComponent(query)}`);
      const data = await res.json() as { results?: RAWGGame[], error?: string };
      
      if (!res.ok) {
        const errorData = data as { error?: string, detail?: string };
        alert(errorData.error || errorData.detail || 'Erro ao buscar jogos no RAWG');
        return;
      }
      
      setResults(data.results || []);
    } catch (err) {
      console.error('Error searching RAWG:', err);
      alert('Erro de conexão ao buscar jogos');
    } finally {
      setLoading(false);
    }
  };

  const addGameToCatalog = async (rawgId: number) => {
    setAdding(rawgId);
    try {
      // 1. Get full details from RAWG
      const detailRes = await fetch(`/api/rawg/details/${rawgId}`);
      const detail: RAWGDetail = await detailRes.json();

      // 2. Prepare data for our DB
      const gameData = {
        title: detail.name,
        description: detail.description_raw?.substring(0, 500) + '...',
        cover_url: detail.background_image,
        genre: detail.genres?.[0]?.name || 'Ação',
        time_to_beat: detail.playtime || 15,
        time_to_platinum: Math.round((detail.playtime || 15) * 2.5),
        public_rating: detail.rating,
        slug: detail.slug
      };

      // 3. Save to our DB
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData)
      });

      if (res.ok) {
        alert('Jogo adicionado com sucesso ao catálogo!');
      } else {
        const err = await res.json() as { error?: string, detail?: string };
        alert(err.error || err.detail || 'Erro ao adicionar jogo');
      }
    } catch (err) {
      console.error('Error adding game:', err);
      alert('Erro ao processar requisição');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar no banco de dados global (RAWG)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
        />
        <button 
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : 'Buscar'}
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {results.map((game) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={game.id}
              className="bg-zinc-900/80 border border-white/5 rounded-2xl overflow-hidden group hover:border-emerald-500/30 transition-all"
            >
              <div className="aspect-video relative overflow-hidden">
                <img 
                  src={game.background_image} 
                  alt={game.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-1 text-yellow-500">
                  <Star size={10} fill="currentColor" />
                  <span className="text-[10px] font-black">{game.rating}</span>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-white line-clamp-1 mb-1">{game.name}</h3>
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-4">
                  {game.genres?.map(g => g.name).join(', ') || 'N/A'}
                </p>
                
                <button 
                  onClick={() => addGameToCatalog(game.id)}
                  disabled={adding === game.id}
                  className="w-full py-2 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {adding === game.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <>
                      <Plus size={14} />
                      Importar para Catálogo
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {results.length === 0 && !loading && query && (
        <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <p className="text-zinc-500 font-medium">Nenhum resultado encontrado no RAWG.</p>
        </div>
      )}
    </div>
  );
}
