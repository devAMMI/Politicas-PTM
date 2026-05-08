import React from 'react';

interface FooterProps {
  navigate: (to: string) => void;
}

const CATEGORIES = [
  'Calidad e Inocuidad',
  'Seguridad Industrial',
  'Recursos Humanos',
  'Operaciones',
  'Medio Ambiente',
  'General',
];

const Footer: React.FC<FooterProps> = ({ navigate }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#071d38] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main grid */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand */}
          <div>
            <img
              src="https://i.imgur.com/FpiAvCx.png"
              alt="PTM"
              className="h-10 object-contain mb-4 brightness-0 invert opacity-80"
            />
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Portal de Politicas Internas de PTM. Consulta y gestion de documentos normativos para todos los colaboradores del grupo.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-5">Categorias</h3>
            <ul className="space-y-2.5">
              {CATEGORIES.map(cat => (
                <li key={cat}>
                  <button
                    onClick={() => navigate(`/categoria/${encodeURIComponent(cat)}`)}
                    className="text-sm text-slate-400 hover:text-white transition-colors text-left"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Logos */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-5">Grupo Empresarial</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-center">
                <img src="https://i.imgur.com/nwFGGgf.png" alt="AMMI" className="h-7 object-contain" />
              </div>
              <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-center">
                <img src="/logo-06.png" alt="PLIHSA" className="h-7 object-contain" />
              </div>
              <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-center">
                <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-7 object-contain" />
              </div>
              <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-center">
                <img src="https://i.imgur.com/kAzFS5n.png" alt="MillFoods" className="h-7 object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-slate-500 text-xs">
            &copy; {year} PTM &mdash; Grupo AMMI. Todos los derechos reservados.
          </p>
          <p className="text-slate-600 text-xs">
            Uso exclusivo para PTM &mdash; Politicas Internas
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
