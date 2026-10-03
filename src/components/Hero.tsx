import React, { useEffect, useState } from 'react';
import {
  FileText, Users, Briefcase, Monitor, Scale, Globe, LayoutGrid,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface HeroProps {
  navigate: (to: string) => void;
}

// Maps category slug → lucide icon
function categoryIcon(slug: string): React.ReactNode {
  const size = 22;
  if (slug.includes('comunidad') || slug.includes('terceros')) return <Globe size={size} />;
  if (slug.includes('administracion') || slug.includes('operacion')) return <Briefcase size={size} />;
  if (slug.includes('gente') || slug.includes('rrhh') || slug.includes('humanos')) return <Users size={size} />;
  if (slug === 'ti' || slug.includes('tecnolog')) return <Monitor size={size} />;
  if (slug.includes('legalidad') || slug.includes('cultura') || slug.includes('legal')) return <Scale size={size} />;
  return <LayoutGrid size={size} />;
}

// Converts a hex color to a subtle translucent gradient for the dark hero bg
function colorToGradient(hex: string): string {
  return `${hex}33`; // 20% opacity overlay
}

const Hero: React.FC<HeroProps> = ({ navigate }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, slug, color')
      .eq('is_active', true)
      .order('order_num')
      .then(({ data }) => {
        if (data) setCategories(data as Category[]);
        setLoading(false);
      });
  }, []);

  return (
    <section className="relative flex-1 bg-gradient-to-br from-[#7A0C14] via-[#B5121B] to-[#E84A2A] overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-white -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white translate-y-1/2 -translate-x-1/3" />
      </div>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-10 lg:pt-10 lg:pb-12">
        <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">

          {/* Left: text content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/90 text-xs font-medium uppercase tracking-widest">Portal Interno PTM</span>
            </div>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-4">
              Pol&iacute;ticas Internas
              <div className="h-px my-2 bg-gradient-to-r from-[#F6A800]/90 via-[#FFB36B]/50 to-transparent rounded-full" />
            </h1>
            <p className="text-[#FFE5DB] text-base lg:text-lg max-w-lg leading-relaxed mb-6 mx-auto lg:mx-0">
              Accede a todas las pol&iacute;ticas, normativas y procedimientos internos de PTM.
              Documentaci&oacute;n actualizada para todos los colaboradores del grupo.
            </p>
            {/* Ethics quote */}
            <blockquote className="border-l-4 border-[#F6A800] pl-4 mb-6 text-[#FFE5DB]/90 text-sm italic leading-relaxed max-w-lg mx-auto lg:mx-0">
              "Actuar con ética es responsabilidad de todos. Conoce, aplica y fortalece nuestro Código de Ética en cada decisión."
            </blockquote>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={() => navigate('/codigoetica')}
                className="inline-flex items-center justify-center gap-2 bg-white text-[#8F1018] font-semibold px-6 py-3 rounded-xl hover:bg-[#FFF4EC] transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                <FileText size={18} />
                Ver C&oacute;digo de &Eacute;tica
              </button>
            </div>
          </div>

          {/* Right: PTM logo + category cards */}
          <div className="flex-1 flex flex-col items-center lg:items-end gap-4 w-full">
            {/* Logo */}
            <div className="relative flex items-center justify-center gap-4 sm:gap-6 px-5 py-3">
              <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[#F6A800]/12 blur-2xl" />
              <img
                src="https://i.imgur.com/FpiAvCx.png"
                alt="PTM"
                className="relative h-14 sm:h-16 lg:h-24 w-[7rem] sm:w-[8rem] lg:w-[9rem] object-contain brightness-0 invert drop-shadow-[0_8px_12px_rgba(25,35,70,0.28)]"
              />
              <div className="relative h-12 sm:h-14 lg:h-20 w-px bg-slate-500/35" />
              <img
                src="https://i.imgur.com/sMMeJrA.png"
                alt="Metálicos Punto de Venta"
                className="relative h-14 sm:h-16 lg:h-24 w-[7rem] sm:w-[8rem] lg:w-[9rem] object-contain brightness-0 invert drop-shadow-[0_8px_12px_rgba(25,35,70,0.28)]"
              />
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
              {loading ? (
                <div className="col-span-2 flex items-center justify-center py-10">
                  <Loader2 size={24} className="text-white/50 animate-spin" />
                </div>
              ) : (
                <>
                  {categories.slice(0, 5).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => navigate(`/politicas-publicadas/${encodeURIComponent(cat.name)}`)}
                      className="border border-white/15 rounded-2xl p-5 flex flex-col items-center text-center gap-3 backdrop-blur-sm hover:border-white/35 hover:scale-105 hover:brightness-110 transition-all duration-300 cursor-pointer"
                      style={{ background: `linear-gradient(135deg, ${colorToGradient(cat.color)}, ${cat.color}22)` }}
                    >
                      <div className="text-white/85">{categoryIcon(cat.slug)}</div>
                      <span className="text-white/85 text-xs font-medium leading-snug">{cat.name}</span>
                    </button>
                  ))}

                  {/* "Todas las Políticas" always last */}
                  <button
                    onClick={() => navigate('/politicas-publicadas')}
                    className="border border-white/20 rounded-2xl p-5 flex flex-col items-center text-center gap-3 backdrop-blur-sm hover:border-white/40 hover:scale-105 hover:brightness-110 transition-all duration-300 cursor-pointer bg-white/10"
                  >
                    <div className="text-white/85"><LayoutGrid size={22} /></div>
                    <span className="text-white/85 text-xs font-medium leading-snug">Todas las Pol&iacute;ticas</span>
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

    </section>
  );
};

export default Hero;
