import React from 'react';

const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Cargando...' }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="w-10 h-10 border-4 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
    <p className="text-slate-500 text-sm">{message}</p>
  </div>
);

export default LoadingSpinner;
