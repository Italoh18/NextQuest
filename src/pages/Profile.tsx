import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Lock, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Profile() {
  const { user, login } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        if (user) login({ ...user, name });
        setPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar perfil' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
          <User className="text-emerald-500" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tighter">Meu Perfil</h1>
          <p className="text-zinc-500">Gerencie suas informações pessoais e segurança.</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {message.text && (
            <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                placeholder="Seu nome"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <p className="text-[10px] text-zinc-600 ml-1">Deixe em branco para manter a atual</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Save size={20} />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </motion.div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8">
        <h2 className="text-xl font-bold mb-4">Informações da Conta</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-white/5">
            <span className="text-zinc-500 text-sm">E-mail</span>
            <span className="text-white font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-white/5">
            <span className="text-zinc-500 text-sm">Tipo de Perfil</span>
            <span className="text-white font-medium capitalize">{user?.player_type || 'Não definido'}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-zinc-500 text-sm">Status da Conta</span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${user?.is_premium ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
              {user?.is_premium ? 'Premium' : 'Standard'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
