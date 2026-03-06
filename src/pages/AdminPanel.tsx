import { useState, useEffect } from 'react';
import { User, Game } from '../types';
import { motion } from 'motion/react';
import { ShieldCheck, Users, Library, Edit2, Trash2, Search, Plus, Save, X } from 'lucide-react';
import { useLanguage } from '../App';

export default function AdminPanel() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'games'>('users');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/users').then(res => res.json()),
      fetch('/api/games').then(res => res.json())
    ]).then(([usersData, gamesData]) => {
      setUsers(usersData);
      setGames(gamesData);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const updateUser = async (user: User) => {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (res.ok) {
      setUsers(users.map(u => u.id === user.id ? user : u));
      setEditingUser(null);
    }
  };

  const saveGame = async () => {
    if (!editingGame) return;
    const method = editingGame.id ? 'PUT' : 'POST';
    const url = editingGame.id ? `/api/games/${editingGame.id}` : '/api/games';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingGame)
    });
    
    if (res.ok) {
      setEditingGame(null);
      fetchAll();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save game');
    }
  };

  const deleteGame = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este jogo?')) return;
    const res = await fetch(`/api/games/${id}`, { method: 'DELETE' });
    if (res.ok) fetchAll();
  };

  if (loading) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-emerald-500" size={32} />
            {t.adminPanel}
          </h1>
          <p className="text-zinc-500 mt-1">{t.manageUsersAndCatalog}</p>
        </div>
        {activeTab === 'games' && (
          <button 
            onClick={() => setEditingGame({ title: '', genre: '', time_to_beat: 0, time_to_platinum: 0, public_rating: 0 })}
            className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={20} />
            Novo Jogo
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-white/5 pb-4">
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'users' ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-500 hover:text-white'
          }`}
        >
          <Users size={18} />
          {t.users}
        </button>
        <button 
          onClick={() => setActiveTab('games')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'games' ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-500 hover:text-white'
          }`}
        >
          <Library size={18} />
          {t.games}
        </button>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden">
        {activeTab === 'users' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/5">
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">ID</th>
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.email}</th>
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.role}</th>
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-6 font-mono text-xs text-zinc-500">#{user.id}</td>
                  <td className="p-6 font-bold">{user.email}</td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      user.role === 'admin' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-6">
                    <button 
                      onClick={() => setEditingUser(user)}
                      className="p-2 text-zinc-500 hover:text-white transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/5">
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.game}</th>
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.genre}</th>
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.timeToBeat}</th>
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">Nota</th>
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {games.map(game => (
                <tr key={game.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <img src={game.cover_url} className="w-10 h-14 object-cover rounded-lg" referrerPolicy="no-referrer" />
                      <span className="font-bold">{game.title}</span>
                    </div>
                  </td>
                  <td className="p-6 text-sm text-zinc-400">{game.genre}</td>
                  <td className="p-6 text-sm font-mono text-zinc-500">{game.time_to_beat}h / {game.time_to_platinum}h</td>
                  <td className="p-6 text-sm font-bold text-yellow-500">{game.public_rating || 0}/10</td>
                  <td className="p-6">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingGame(game)}
                        className="p-2 text-zinc-500 hover:text-white transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteGame(game.id)}
                        className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold mb-6">{t.editUser}</h2>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">{t.email}</label>
                <input 
                  type="email"
                  value={editingUser.email}
                  onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">{t.role}</label>
                <select 
                  value={editingUser.role}
                  onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-xl font-bold transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={() => updateUser(editingUser)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-bold transition-colors"
                >
                  {t.saveChanges}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit/Add Game Modal */}
      {editingGame && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingGame(null)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl my-8"
          >
            <h2 className="text-2xl font-bold mb-6">{editingGame.id ? 'Editar Jogo' : 'Novo Jogo'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Título</label>
                  <input 
                    type="text"
                    value={editingGame.title}
                    onChange={e => setEditingGame({...editingGame, title: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Gênero</label>
                  <input 
                    type="text"
                    value={editingGame.genre}
                    onChange={e => setEditingGame({...editingGame, genre: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Capa (URL)</label>
                  <input 
                    type="text"
                    value={editingGame.cover_url}
                    onChange={e => setEditingGame({...editingGame, cover_url: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Descrição</label>
                  <textarea 
                    value={editingGame.description}
                    onChange={e => setEditingGame({...editingGame, description: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 h-32 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Tempo Zerar (h)</label>
                    <input 
                      type="number"
                      value={editingGame.time_to_beat}
                      onChange={e => setEditingGame({...editingGame, time_to_beat: Number(e.target.value)})}
                      className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Tempo Platina (h)</label>
                    <input 
                      type="number"
                      value={editingGame.time_to_platinum}
                      onChange={e => setEditingGame({...editingGame, time_to_platinum: Number(e.target.value)})}
                      className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Nota do Público (0-10)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={editingGame.public_rating}
                    onChange={e => setEditingGame({...editingGame, public_rating: Number(e.target.value)})}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Steam Link</label>
                  <input 
                    type="text"
                    value={editingGame.steam_link}
                    onChange={e => setEditingGame({...editingGame, steam_link: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Epic Link</label>
                  <input 
                    type="text"
                    value={editingGame.epic_link}
                    onChange={e => setEditingGame({...editingGame, epic_link: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">GOG Link</label>
                  <input 
                    type="text"
                    value={editingGame.gog_link}
                    onChange={e => setEditingGame({...editingGame, gog_link: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Video Review (URL)</label>
                  <input 
                    type="text"
                    value={editingGame.review_video_url}
                    onChange={e => setEditingGame({...editingGame, review_video_url: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setEditingGame(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-xl font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={saveGame}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-xl font-bold transition-colors"
              >
                Salvar Jogo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
