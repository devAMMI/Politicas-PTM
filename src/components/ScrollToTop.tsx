import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
  threshold?: number;
}

const ScrollToTop: React.FC<ScrollToTopProps> = ({ threshold = 200 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  const scrollUp = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <button
      onClick={scrollUp}
      aria-label="Volver al inicio"
      className={`fixed bottom-8 right-6 z-40 inline-flex items-center gap-2 bg-[#0A2647] text-white pl-4 pr-5 py-2.5 rounded-xl shadow-lg text-sm font-semibold hover:bg-[#144272] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <ArrowUp size={15} />
      Volver al inicio
    </button>
  );
};

export default ScrollToTop;
