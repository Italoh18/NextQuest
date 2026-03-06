import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Mail, Lock, Gamepad2, Calendar, Monitor, ArrowRight } from 'lucide-react';

const PLAYER_TYPES = [
  'Casual',
  'Hardcore',
  'Completista',
  'Competitivo',
  'Social',
  'Speedrunner'
];

const WEEK_DAYS = [
  { id: 0, label: 'Dom' },
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' }
];

const PLATFORMS = [
  'Steam',
  'Epic Games',
  'PlayStation',
  'Xbox',
  'Nintendo Switch',
  'Mobile',
  'GOG',
  'Ubisoft Connect',
  'EA App'
];

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [playerType, setPlayerType] = useState('Casual');
  const [playDays, setPlayDays] = useState<number[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleToggleDay = (dayId: number) => {
    setPlayDays(prev => 
      prev.includes(dayId) ? prev.filter(id => id !== dayId) : [...prev, dayId]
    );
  };

  const handleTogglePlatform = (platform: string) => {
    setPlatforms(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          name, 
          player_type: playerType, 
          play_days: playDays, 
          platforms 
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        login(data.user);
        navigate('/');
      } else {
        setError(data.error || 'Erro ao cadastrar');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">CRIAR CONTA</h1>
          <p className="text-zinc-400">Junte-se à elite dos jogadores e organize sua jornada.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <User size={14} /> Informações Básicas
              </h2>
              
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    placeholder="Nome Completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Player Profile */}
            <div className="space-y-4">
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Gamepad2 size={14} /> Perfil de Jogador
              </h2>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 ml-1">Tipo de Jogador</label>
                <select
                  value={playerType}
                  onChange={(e) => setPlayerType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none"
                >
                  {PLAYER_TYPES.map(type => (
                    <option key={type} value={type} className="bg-zinc-900">{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 ml-1 flex items-center gap-1">
                  <Calendar size={12} /> Dias que costuma jogar
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map(day => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => handleToggleDay(day.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        playDays.includes(day.id)
                          ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : 'bg-white/5 text-zinc-500 hover:bg-white/10'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Platforms */}
          <div className="space-y-4">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Monitor size={14} /> Plataformas (Opcional)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {PLATFORMS.map(platform => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => handleTogglePlatform(platform)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    platforms.includes(platform)
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/20'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group"
          >
            {loading ? 'CRIANDO CONTA...' : (
              <>
                CRIAR MINHA CONTA
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-emerald-500 font-bold hover:underline">
              Fazer Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
