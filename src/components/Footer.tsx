import React from 'react';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#071d38] text-white">
      {/* Logos band */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5 text-center">Grupo Empresarial</p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            <img src="https://i.imgur.com/nwFGGgf.png" alt="AMMI" className="h-8 object-contain" />
            <div className="w-px h-8 bg-gray-200" />
            <img src="/logo-06.png" alt="PLIHSA" className="h-8 object-contain" />
            <div className="w-px h-8 bg-gray-200" />
            <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-8 object-contain" />
            <div className="w-px h-8 bg-gray-200" />
            <img src="https://i.imgur.com/kAzFS5n.png" alt="MillFoods" className="h-8 object-contain" />
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-10 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-10 object-contain mb-4 brightness-0 invert opacity-80" />
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Portal de Politicas Internas de PTM. Consulta y gestion de documentos normativos para todos los colaboradores del grupo.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-4">Categorias</h3>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-400">
              <li>Calidad e Inocuidad</li>
              <li>Seguridad Industrial</li>
              <li>Recursos Humanos</li>
              <li>Operaciones</li>
              <li>Medio Ambiente</li>
              <li>General</li>
            </ul>
          </div>
        </div>

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
