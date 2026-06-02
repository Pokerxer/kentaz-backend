'use client';

import { useState } from 'react';

interface BrandLogoProps {
  /** 'navbar' = compact inline; 'footer' = larger; 'page' = standalone page use */
  variant?: 'navbar' | 'footer' | 'page';
  className?: string;
}

const variantStyles = {
  navbar: { img: 'h-9 w-auto max-w-[120px]', text: 'text-xl md:text-2xl' },
  footer: { img: 'h-12 w-auto max-w-[160px]', text: 'text-2xl md:text-3xl' },
  page:   { img: 'h-14 w-auto max-w-[180px]', text: 'text-3xl' },
};

export function BrandLogo({ variant = 'navbar', className = '' }: BrandLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const s = variantStyles[variant];

  if (imgFailed) {
    return (
      <span
        className={`font-bold tracking-wider bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-clip-text text-transparent ${s.text} ${className}`}
      >
        Kentaz Emporium
      </span>
    );
  }

  return (
    <img
      src="/logo.png"
      alt="Kentaz Emporium"
      className={`object-contain ${s.img} ${className}`}
      onError={() => setImgFailed(true)}
    />
  );
}
