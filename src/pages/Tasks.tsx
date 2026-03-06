import React, { useState, useEffect } from 'react';
import { ChecklistItem, UserGame } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ListTodo, CheckCircle2, Circle, Library, Search, Filter } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface TaskWithGame extends ChecklistItem {
  game_title: string;
  game_cover: string;
}

export default function Tasks() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<TaskWithGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      // We need to fetch all user games first to get their IDs, then fetch checklists for each
      const gamesRes = await fetch('/api/user-games');
      const games: UserGame[] = await gamesRes.json();
      
      const allTasks: TaskWithGame[] = [];
      await Promise.all(games.map(async (game) => {
        const tasksRes = await fetch(`/api/checklists/${game.game_id}`);
        const gameTasks: ChecklistItem[] = await tasksRes.json();
        gameTasks.forEach(task => {
          allTasks.push({
            ...task,
            game_title: game.title,
            game_cover: game.cover_url
          });
        });
      }));
      
      setTasks(allTasks.sort((a, b) => b.id - a.id));
      setLoading(false);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/checklists/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentStatus })
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !currentStatus } : t));
      }
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' ? true : filter === 'completed' ? task.completed : !task.completed;
    const matchesSearch = task.task.toLowerCase().includes(search.toLowerCase()) || task.game_title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter flex items-center gap-3">
            <ListTodo className="text-emerald-500" size={32} />
            Minhas Tarefas
          </h1>
          <p className="text-zinc-500 mt-1">Gerencie seus objetivos em cada jogo da sua biblioteca.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Buscar tarefas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-900 border border-white/5 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-emerald-500/50 text-sm w-64"
            />
          </div>
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/5">
            {(['pending', 'completed', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === f ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {f === 'pending' ? 'Pendentes' : f === 'completed' ? 'Concluídas' : 'Todas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={task.id}
              className={`group flex items-center gap-6 p-5 rounded-[2rem] border transition-all ${
                task.completed 
                  ? 'bg-zinc-900/30 border-white/5 opacity-60' 
                  : 'bg-zinc-900/50 border-white/10 hover:border-emerald-500/30'
              }`}
            >
              <button 
                onClick={() => toggleTask(task.id, task.completed)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  task.completed 
                    ? 'bg-emerald-500 text-black' 
                    : 'bg-white/5 text-zinc-600 hover:bg-white/10 hover:text-emerald-500 border border-white/5'
                }`}
              >
                {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              </button>

              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-lg truncate ${task.completed ? 'line-through text-zinc-600' : 'text-white'}`}>
                  {task.task}
                </h3>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    <Library size={12} />
                    {task.game_title}
                  </div>
                </div>
              </div>

              <div className="hidden sm:block">
                <img 
                  src={task.game_cover} 
                  className="w-12 h-12 rounded-xl object-cover border border-white/10" 
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="text-center py-20 bg-zinc-900/20 rounded-[3rem] border border-dashed border-white/5">
            <ListTodo size={48} className="mx-auto text-zinc-800 mb-4" />
            <h3 className="text-xl font-bold text-zinc-600">Nenhuma tarefa encontrada</h3>
            <p className="text-zinc-700 text-sm mt-1">Adicione tarefas na página de detalhes de cada jogo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
