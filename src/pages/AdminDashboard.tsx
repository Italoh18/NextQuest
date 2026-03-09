import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  Shield, 
  Search, 
  Filter, 
  Trash2, 
  Crown, 
  Star, 
  Gamepad, 
  LogOut,
  ChevronRight,
  UserCheck,
  UserX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

import RAWGSearch from '../components/RAWGSearch';

interface Stats {
  totalUsers: number;
  premiumUsers: number;
  totalGames: number;
  totalRatings: number;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [gameSearchTerm, setGameSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
  const [filterPremium, setFilterPremium] = useState<'all' | 'premium' | 'free'>('all');
  
  const [activeTab, setActiveTab] = useState<'users' | 'catalog' | 'rawg'>('users');
  const [localGames, setLocalGames] = useState<any[]>([]);
  
  const { logout, user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats')
      ]);
      
      if (usersRes.ok && statsRes.ok) {
        const usersData = await usersRes.json() as User[];
        const statsData = await statsRes.json() as Stats;
        setUsers(usersData);
        setStats(statsData);
      }

      const gamesRes = await fetch('/api/games');
      if (gamesRes.ok) {
        const gamesData = await gamesRes.json() as any[];
        setLocalGames(gamesData);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: number, updates: Partial<User>) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error);
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const handleDeleteGame = async (gameId: number) => {
    if (!confirm('Tem certeza que deseja remover este jogo do catálogo?')) return;
    try {
      const res = await fetch(`/api/games/${gameId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting game:', err);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (u.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesPremium = filterPremium === 'all' || 
                          (filterPremium === 'premium' ? u.is_premium : !u.is_premium);
    return matchesSearch && matchesRole && matchesPremium;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* Sidebar / Header */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tighter">ADMIN PANEL</h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">NextQuest Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white">{currentUser?.name || currentUser?.email}</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Super Admin</p>
            </div>
            <button 
              onClick={() => { logout(); navigate('/login'); }}
              className="p-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all border border-white/5"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Usuários', value: stats?.totalUsers, icon: Users, color: 'text-blue-400' },
            { label: 'Contas Premium', value: stats?.premiumUsers, icon: Crown, color: 'text-yellow-400' },
            { label: 'Jogos no Catálogo', value: stats?.totalGames, icon: Gamepad, color: 'text-emerald-400' },
            { label: 'Avaliações Feitas', value: stats?.totalRatings, icon: Star, color: 'text-purple-400' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-white/5 ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <TrendingUp size={16} className="text-zinc-600" />
              </div>
              <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === 'users' 
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                : 'bg-white/5 text-zinc-500 hover:bg-white/10'
            }`}
          >
            Usuários
          </button>
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === 'catalog' 
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                : 'bg-white/5 text-zinc-500 hover:bg-white/10'
            }`}
          >
            Catálogo
          </button>
          <button 
            onClick={() => setActiveTab('rawg')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === 'rawg' 
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                : 'bg-white/5 text-zinc-500 hover:bg-white/10'
            }`}
          >
            Importar RAWG
          </button>
        </div>

        {activeTab === 'users' ? (
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-1">Gerenciar Usuários</h2>
                <p className="text-sm text-zinc-500">Controle permissões, status premium e visualize perfis.</p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all w-64"
                  />
                </div>

                <select 
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as any)}
                  className="bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                >
                  <option value="all" className="bg-zinc-900">Todos Cargos</option>
                  <option value="admin" className="bg-zinc-900">Admins</option>
                  <option value="user" className="bg-zinc-900">Usuários</option>
                </select>

                <select 
                  value={filterPremium}
                  onChange={(e) => setFilterPremium(e.target.value as any)}
                  className="bg-white/5 border border-white/10 rounded-2xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                >
                  <option value="all" className="bg-zinc-900">Todos Status</option>
                  <option value="premium" className="bg-zinc-900">Premium</option>
                  <option value="free" className="bg-zinc-900">Free</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Usuário</th>
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Perfil</th>
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-white font-bold">
                            {u.name?.[0] || u.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{u.name || 'Sem nome'}</p>
                            <p className="text-xs text-zinc-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                            {u.player_type || 'N/A'}
                          </span>
                          <div className="flex gap-1">
                            {u.platforms && JSON.parse(u.platforms).slice(0, 2).map((p: string) => (
                              <span key={p} className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-500">{p}</span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            u.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {u.role}
                          </span>
                          {u.is_premium ? (
                            <span className="flex items-center gap-1 text-yellow-500 text-[10px] font-black uppercase tracking-widest">
                              <Crown size={12} /> Premium
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Free</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleUpdateUser(u.id, { is_premium: !u.is_premium })}
                            className={`p-2 rounded-xl transition-all ${u.is_premium ? 'text-zinc-500 hover:text-zinc-300' : 'text-yellow-500 hover:bg-yellow-500/10'}`}
                            title={u.is_premium ? "Remover Premium" : "Tornar Premium"}
                          >
                            <Crown size={18} />
                          </button>
                          <button 
                            onClick={() => handleUpdateUser(u.id, { role: u.role === 'admin' ? 'user' : 'admin' })}
                            className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                            title="Alternar Cargo"
                          >
                            <Shield size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Excluir Usuário"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="p-20 text-center">
                  <Users size={48} className="mx-auto text-zinc-800 mb-4" />
                  <p className="text-zinc-500 font-bold">Nenhum usuário encontrado com estes filtros.</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'catalog' ? (
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-1">Catálogo Local</h2>
                <p className="text-sm text-zinc-500">Gerencie os jogos que já estão no banco de dados.</p>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar no catálogo local..."
                  value={gameSearchTerm}
                  onChange={(e) => setGameSearchTerm(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Jogo</th>
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Gênero</th>
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tempo</th>
                    <th className="px-8 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {localGames.filter(g => g.title.toLowerCase().includes(gameSearchTerm.toLowerCase())).map((g) => (
                    <tr key={g.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <img src={g.cover_url} alt="" className="w-12 h-16 object-cover rounded-lg border border-white/10" referrerPolicy="no-referrer" />
                          <div>
                            <p className="text-sm font-bold text-white">{g.title}</p>
                            <p className="text-[10px] text-zinc-500 line-clamp-1 max-w-xs">{g.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{g.genre}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-[10px] text-zinc-400">
                          <p>Zerar: {g.time_to_beat}h</p>
                          <p>Platina: {g.time_to_platinum}h</p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleDeleteGame(g.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white tracking-tight mb-1">Importar do RAWG</h2>
              <p className="text-sm text-zinc-500">Pesquise no banco de dados global e adicione jogos ao catálogo do NextQuest.</p>
            </div>
            <RAWGSearch />
          </div>
        )}
      </main>
    </div>
  );
}
