import React from 'react';
import { BookOpen, Shield, Award } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-br from-[#0A2647] via-[#144272] to-[#205295] overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white translate-y-1/2 -translate-x-1/3" />
      </div>
      <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 lg:pt-10 lg:pb-12">
        <div className="flex flex-col lg:flex-row items-start gap-8">

          {/* Left: text content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/90 text-xs font-medium uppercase tracking-widest">Portal Interno PTM</span>
            </div>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-4">
              Pol&iacute;ticas Internas
              <div className="h-px my-2 bg-gradient-to-r from-blue-400/80 via-blue-300/40 to-transparent rounded-full" />
              <span className="block text-blue-300 mt-1">Corporativas</span>
            </h1>
            <p className="text-blue-100 text-base lg:text-lg max-w-lg leading-relaxed mb-6 mx-auto lg:mx-0">
              Accede a todas las pol&iacute;ticas, normativas y procedimientos internos de PTM. Documentaci&oacute;n actualizada para todos los colaboradores del grupo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a
                href="#politicas"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0A2647] font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                <BookOpen size={18} />
                Ver Pol&iacute;ticas
              </a>
            </div>
          </div>

          {/* Right: PTM logo + category cards */}
          <div className="flex-1 flex flex-col items-center lg:items-end gap-4 w-full">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-3xl bg-blue-400/20 blur-2xl scale-110" />
              <div className="absolute inset-0 rounded-3xl bg-white/10 blur-xl scale-105" />
              <img
                src="https://i.imgur.com/FpiAvCx.png"
                alt="PTM"
                className="relative h-24 lg:h-32 object-contain"
                style={{ filter: 'drop-shadow(0 0 18px rgba(147,197,253,0.6)) drop-shadow(0 0 40px rgba(96,165,250,0.35))' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              {[
                { icon: <Shield size={20} />, label: 'Seguridad Industrial', color: 'from-blue-500/20 to-blue-600/20' },
                { icon: <Award size={20} />, label: 'Calidad e Inocuidad', color: 'from-emerald-500/20 to-emerald-600/20' },
                { icon: <BookOpen size={20} />, label: 'Recursos Humanos', color: 'from-amber-500/20 to-amber-600/20' },
                { icon: <Shield size={20} />, label: 'Operaciones', color: 'from-sky-500/20 to-sky-600/20' },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`bg-gradient-to-br ${item.color} border border-white/15 rounded-2xl p-4 flex flex-col items-center text-center gap-2 backdrop-blur-sm hover:border-white/30 transition-all duration-300`}
                >
                  <div className="text-white/80">{item.icon}</div>
                  <span className="text-white/80 text-xs font-medium leading-snug">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#F8F9FC] to-transparent" />
    </section>
  );
};

export default Hero;
