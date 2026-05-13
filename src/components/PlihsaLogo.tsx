import React from 'react';

interface PlihsaLogoProps {
  className?: string;
  height?: number;
}

const PlihsaLogo: React.FC<PlihsaLogoProps> = ({ height = 32 }) => {
  const iconSize = height * 0.75;
  const fontSize = height * 0.45;
  const gap = height * 0.25;
  const paddingH = height * 0.45;
  const paddingV = height * 0.18;
  const radius = height * 0.28;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: gap,
        backgroundColor: '#25D366',
        borderRadius: radius,
        paddingLeft: paddingH,
        paddingRight: paddingH,
        paddingTop: paddingV,
        paddingBottom: paddingV,
        height: height,
        lineHeight: 1,
      }}
    >
      <img
        src="/logo_whatsapp.svg"
        alt=""
        style={{ width: iconSize, height: iconSize, display: 'block', flexShrink: 0 }}
      />
      <span
        style={{
          color: '#ffffff',
          fontWeight: 800,
          fontSize: fontSize,
          letterSpacing: '0.05em',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: 1,
        }}
      >
        PLIHSA
      </span>
    </span>
  );
};

export default PlihsaLogo;
