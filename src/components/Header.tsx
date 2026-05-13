import React from 'react';
interface HeaderProps {
  navigate: (to: string) => void;
  currentPage: string;
}

const Header: React.FC<HeaderProps> = ({ navigate, currentPage }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-[#0A2647] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <img src="https://i.imgur.com/nwFGGgf.png" alt="AMMI" className="h-8 object-contain opacity-90" />
              <div className="h-6 w-px bg-white/20" />
              <img src="https://www.plihsa.com/wp-content/uploads/2023/02/Plihsa_Logo_Azul.svg" alt="PLIHSA" className="h-7 object-contain opacity-90" />
              <div className="h-6 w-px bg-white/20" />
              <img src="https://i.imgur.com/kAzFS5n.png" alt="Millfoods" className="h-7 object-contain opacity-90" />
            </div>
            <span className="text-xs text-blue-200 tracking-wide">Gobierno Corporativo</span>
          </div>
        </div>
      </div>

    </header>
  );
};

export default Header;
