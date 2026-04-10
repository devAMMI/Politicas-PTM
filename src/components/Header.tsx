import React, { useEffect, useState } from 'react';
import { Users, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PlihsaLogo from './PlihsaLogo';

interface HeaderProps {
  navigate: (to: string) => void;
  currentPage: string;
}

const Header: React.FC<HeaderProps> = ({ navigate, currentPage }) => {
  const { user, adminUser, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAdmin = currentPage.startsWith('admin');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (isAdmin) {
    return (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-10 object-contain" />
              <div className="h-6 w-px bg-gray-300" />
              <span className="text-sm font-semibold text-slate-600 uppercase tracking-widest">Panel de Administracion</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 hidden sm:block">{user?.email}</span>
              <button
                onClick={() => navigate('/panel/evaluaciones')}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#0A2647] transition-colors font-medium"
              >
                <ClipboardList size={14} />
                <span className="hidden sm:inline">Evaluaciones</span>
              </button>
              {adminUser?.role === 'superadmin' && (
                <button
                  onClick={() => navigate('/panel/usuarios')}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#0A2647] transition-colors font-medium"
                >
                  <Users size={14} />
                  <span className="hidden sm:inline">Usuarios</span>
                </button>
              )}
              <button
                onClick={() => navigate('/panel')}
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Panel
              </button>
              <button
                onClick={() => navigate('/')}
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Ver sitio
              </button>
              <button
                onClick={handleSignOut}
                className="bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm'}`}>
      <div className="bg-[#0A2647] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9">
            <div className="flex items-center gap-4">
              <span className="text-xs text-blue-200 font-medium tracking-wide uppercase">Grupo AMMI</span>
              <div className="flex items-center gap-4 ml-2">
                <img src="https://i.imgur.com/F0RKq8C.png" alt="AMMI" className="h-5 object-contain opacity-90" />
                <PlihsaLogo height={22} />
                <img src="https://i.imgur.com/kAzFS5n.png" alt="Millfoods" className="h-5 object-contain opacity-90" />
              </div>
            </div>
            <span className="text-xs text-blue-200">Red Interna PTM</span>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
              <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-11 object-contain transition-transform group-hover:scale-105" />
            </button>

            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => navigate('/')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPage === 'home' ? 'bg-[#0A2647] text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                Inicio
              </button>
              <button
                onClick={() => navigate('/#politicas')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200"
              >
                Politicas
              </button>
            </nav>

            <button
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
              <div className={`w-5 h-0.5 bg-current transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              <button
                onClick={() => { navigate('/'); setMenuOpen(false); }}
                className="block w-full text-left px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                Inicio
              </button>
              <button
                onClick={() => { navigate('/#politicas'); setMenuOpen(false); }}
                className="block w-full text-left px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                Politicas
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
