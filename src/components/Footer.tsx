import React from 'react';
import PlihsaLogo from './PlihsaLogo';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0A2647] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-12 object-contain mb-4 brightness-0 invert opacity-90" />
            <p className="text-slate-300 text-sm leading-relaxed">
              Portal de Politicas Internas de PTM. Consulta y gestion de documentos normativos para todos los colaboradores.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-4">Grupo Empresarial</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <img src="https://i.imgur.com/F0RKq8C.png" alt="AMMI" className="h-6 object-contain brightness-0 invert opacity-70" />
                <span className="text-slate-400 text-sm">AMMI</span>
              </div>
              <div className="flex items-center gap-3">
                <PlihsaLogo height={22} />
                <span className="text-slate-400 text-sm">PLIHSA</span>
              </div>
              <div className="flex items-center gap-3">
                <img src="https://i.imgur.com/FpiAvCx.png" alt="PTM" className="h-5 object-contain brightness-0 invert opacity-70" />
                <span className="text-slate-400 text-sm">PTM</span>
              </div>
              <div className="flex items-center gap-3">
                <img src="https://i.imgur.com/kAzFS5n.png" alt="Millfoods" className="h-5 object-contain brightness-0 invert opacity-70" />
                <span className="text-slate-400 text-sm">MillFoods</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-4">Categorias</h3>
            <ul className="space-y-2 text-sm text-slate-400">
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
            Uso exclusivo de red interna &mdash; 192.168.20.20
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
