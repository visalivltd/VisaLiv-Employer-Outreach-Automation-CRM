import React from 'react';

export default function VisaLivIcon({ size = 32, className = '', style = {} }) {
  return (
    <img
      src="/logo/icon.png"
      alt="VisaLiv"
      width={size}
      height={size}
      className={`visaliv-v-icon ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        ...style
      }}
    />
  );
}
