import React from 'react';

interface PlihsaLogoProps {
  className?: string;
  height?: number;
}

const PlihsaLogo: React.FC<PlihsaLogoProps> = ({ height = 20 }) => {
  const fontSize = height * 0.52;
  const paddingH = height * 0.55;
  const paddingV = height * 0.15;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1B9ED4',
        borderRadius: 9999,
        paddingLeft: paddingH,
        paddingRight: paddingH,
        paddingTop: paddingV,
        paddingBottom: paddingV,
        height: height,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          color: '#ffffff',
          fontWeight: 800,
          fontSize: fontSize,
          letterSpacing: '0.04em',
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
