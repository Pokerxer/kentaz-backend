'use client';

import { useState } from 'react';

interface BrandLogoProps {
  variant?: 'navbar' | 'footer' | 'page';
  className?: string;
}

const imgStyles = {
  navbar: 'h-9 w-auto max-w-[180px]',
  footer: 'h-12 w-auto max-w-[220px]',
  page:   'h-14 w-auto max-w-[260px]',
};

const textStyles = {
  navbar: { name: 'text-base md:text-lg font-black tracking-[0.18em]',  sub: 'text-[8px] md:text-[9px] tracking-[0.42em]' },
  footer: { name: 'text-xl md:text-2xl font-black tracking-[0.18em]',   sub: 'text-[9px] md:text-[10px] tracking-[0.44em]' },
  page:   { name: 'text-2xl font-black tracking-[0.18em]',              sub: 'text-[10px] tracking-[0.44em]' },
};

export function BrandLogo({ variant = 'navbar', className = '' }: BrandLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    const t = textStyles[variant];
    return (
      <div className={`flex flex-col leading-none gap-0.5 ${className}`}>
        <span className={`uppercase bg-gradient-to-r from-[#C9A84C] via-[#E8D48A] to-[#C9A84C] bg-clip-text text-transparent ${t.name}`}>
          Kentaz
        </span>
        <span className={`uppercase font-semibold text-[#C9A84C]/75 ${t.sub}`}>
          Emporium
        </span>
      </div>
    );
  }

  return (
    <img
      src="/logo.svg"
      alt="Kentaz Emporium"
      className={`object-contain ${imgStyles[variant]} ${className}`}
      onError={() => setImgFailed(true)}
    />
  );
}
