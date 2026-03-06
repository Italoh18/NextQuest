import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { User } from './types';
import { LogOut, Gamepad2, LayoutDashboard, Library, Calendar, ShieldCheck, Menu, X, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from './i18n';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GameCatalog from './pages/GameCatalog';
import GameDetail from './pages/GameDetail';
import PlanningTool from './pages/PlanningTool';
import AdminPanel from './pages/AdminPanel';

// Contexts
interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  loading: boolean;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['en'];
}

const AuthContext = createContext<AuthContextType | null>(null);
const LanguageContext = createContext<LanguageContextType | null>(null);

export const useAuth = () => useContext(AuthContext)!;
export const useLanguage = () => useContext(LanguageContext)!;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Detect browser language or default to 'pt'
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved) return saved;
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'pt' ? 'pt' : 'pt'; // Defaulting to PT as requested
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const login = (user: User) => setUser(user);
  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => setUser(null));
  };

  const t = translations[language];

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-emerald-500"
      >
        <Gamepad2 size={48} />
      </motion.div>
    </div>
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <AuthContext.Provider value={{ user, login, logout, loading }}>
        <Router>
          <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30">
            {user && <Navbar />}
            <main className={user ? "pt-20 pb-12 px-4 max-w-7xl mx-auto" : ""}>
              <Routes>
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="/catalog" element={user ? <GameCatalog /> : <Navigate to="/login" />} />
                <Route path="/game/:id" element={user ? <GameDetail /> : <Navigate to="/login" />} />
                <Route path="/planning" element={user ? <PlanningTool /> : <Navigate to="/login" />} />
                <Route path="/admin" element={user?.role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthContext.Provider>
    </LanguageContext.Provider>
  );
}

function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { label: t.dashboard, icon: LayoutDashboard, path: '/' },
    { label: t.catalog, icon: Library, path: '/catalog' },
    { label: t.planning, icon: Calendar, path: '/planning' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ label: t.admin, icon: ShieldCheck, path: '/admin' });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
            <Gamepad2 className="text-emerald-500" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tighter italic">{t.appName}</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map(item => (
            <Link 
              key={item.path} 
              to={item.path}
              className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
          
          <div className="h-4 w-px bg-white/10 mx-2" />

          <button 
            onClick={() => setLanguage(language === 'en' ? 'pt' : 'en')}
            className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-emerald-500 transition-colors uppercase tracking-widest"
          >
            <Languages size={16} />
            {language}
          </button>

          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-2 text-sm font-medium text-red-400/80 hover:text-red-400 transition-colors ml-4"
          >
            <LogOut size={18} />
            {t.logout}
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-4 md:hidden">
          <button 
            onClick={() => setLanguage(language === 'en' ? 'pt' : 'en')}
            className="p-2 text-zinc-400"
          >
            <Languages size={20} />
          </button>
          <button className="p-2 text-zinc-400" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-16 left-0 right-0 bg-[#0a0a0a] border-b border-white/5 py-4 px-4 flex flex-col gap-4"
          >
            {navItems.map(item => (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-lg font-medium text-zinc-400 hover:text-white"
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
            <button 
              onClick={() => { logout(); navigate('/login'); setIsOpen(false); }}
              className="flex items-center gap-3 text-lg font-medium text-red-400/80"
            >
              <LogOut size={20} />
              {t.logout}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
