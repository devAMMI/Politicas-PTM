import React, { useEffect } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
interface HeaderProps {
  navigate: (to: string) => void;
  currentPage: string;
}

const Header: React.FC<HeaderProps> = ({ navigate, currentPage }) => {
  const { user, adminUser, signOut } = useAuth();
  useEffect(() => {}, []);

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
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-[#0A2647] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9">
            <div className="flex items-center gap-4">
              <img src="https://i.imgur.com/nwFGGgf.png" alt="AMMI" className="h-5 object-contain opacity-90" />
              <img src="/logo-06.png" alt="PLIHSA" className="h-5 object-contain opacity-90" />
              <img src="https://i.imgur.com/kAzFS5n.png" alt="Millfoods" className="h-5 object-contain opacity-90" />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-blue-200">Gobierno Corporativo</span>
              <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-4 object-contain opacity-80 mt-0.5" />
            </div>
          </div>
        </div>
      </div>

    </header>
  );
};

export default Header;
