import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface FooterProps {
  navigate: (to: string) => void;
}

const Footer: React.FC<FooterProps> = ({ navigate }) => {
  const year = new Date().getFullYear();
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from('categories')
      .select('name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setCategories(data.map(c => c.name));
      });
  }, []);

  return (
    <footer className="bg-[#071d38] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="py-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

          {/* Brand */}
          <div>
            <img
              src="https://i.imgur.com/FpiAvCx.png"
              alt="PTM"
              className="h-8 object-contain mb-3 brightness-0 invert opacity-80"
            />
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
              Portal de Políticas Internas de PTM. Consulta y gestion de documentos normativos para todos los colaboradores.
            </p>
          </div>

          {/* Categories — dynamic from DB */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-3">Categorias</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => navigate(`/categoria/${encodeURIComponent(cat)}`)}
                  className="text-xs text-slate-400 hover:text-white transition-colors text-left"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Logos */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-3">Grupo Empresarial</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 items-center">
              <img src="https://i.imgur.com/nwFGGgf.png" alt="AMMI" className="h-6 object-contain object-left" />
              <img src="https://www.plihsa.com/wp-content/uploads/2023/02/Plihsa_Logo_Azul.svg" alt="PLIHSA" className="h-6 object-contain object-left" />
              <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-6 object-contain object-left" />
              <img src="https://i.imgur.com/kAzFS5n.png" alt="MillFoods" className="h-6 object-contain object-left" />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-slate-500 text-xs">
            &copy; {year} PTM &mdash; Grupo AMMI. Todos los derechos reservados.
          </p>
          <p className="text-slate-600 text-xs">
            Uso exclusivo para PTM &mdash; Políticas Internas
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
