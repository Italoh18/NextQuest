import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Gamepad2, Mail, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: isAdminMode ? 'admin@nextquest.com' : email, 
          password,
          isAdminLogin: isAdminMode
        }),
      });
      
      if (res.status === 405) {
        setError('Erro 405: O servidor não permite este método. Verifique se o backend está rodando corretamente.');
        return;
      }

      const data = await res.json();
      if (res.ok) {
        login(data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl backdrop-blur-xl shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-emerald-500/10 rounded-2xl mb-4">
              <Gamepad2 className="text-emerald-500" size={40} />
            </div>
            <h1 className="text-3xl font-bold tracking-tighter italic">{t.appName}</h1>
            <p className="text-zinc-500 text-sm mt-2">{isAdminMode ? 'Painel Administrativo' : t.tagline}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isAdminMode && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">{t.email}</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" size={20} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all text-zinc-200"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">{isAdminMode ? 'Senha de Acesso' : t.password}</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all text-zinc-200"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-400 text-sm text-center font-medium"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 group transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              {isAdminMode ? 'Entrar no Painel' : t.startQuesting}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <button 
              onClick={() => {
                setIsAdminMode(!isAdminMode);
                setError('');
                setPassword('');
              }}
              className="text-zinc-500 text-xs hover:text-emerald-500 transition-colors"
            >
              {isAdminMode ? 'Voltar para Login Normal' : 'Login Administrativo'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
