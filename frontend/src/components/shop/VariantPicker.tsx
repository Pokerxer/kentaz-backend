'use client';

import { motion } from 'framer-motion';

interface Variant {
  size?: string;
  color?: string;
  price: number;
  stock?: number;
}

interface VariantPickerProps {
  variants: Variant[];
  selectedSize: string | null;
  selectedColor: string | null;
  onSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', blue: '#1E40AF', navy: '#1E3A8A',
  red: '#DC2626', tan: '#D2B48C', cognac: '#9A6324', burgundy: '#722F37',
  nude: '#E3BC9A', brown: '#8B4513', pink: '#EC4899', green: '#059669',
  yellow: '#FACC15', purple: '#7C3AED', gray: '#6B7280', grey: '#6B7280',
  silver: '#C0C0C0', gold: '#FFD700', cream: '#FFFDD0', beige: '#F5F5DC',
  orange: '#F97316', emerald: '#10B981', 'natural black': '#1a1a1a',
  khaki: '#C3B091', lavender: '#967BB6', teal: '#008080', coral: '#FF6B6B',
  mint: '#98FF98', 'rose gold': '#B76E79', camel: '#C19A6B', olive: '#808000',
};

function getColorHex(colorName: string): string {
  const key = colorName.toLowerCase().trim();
  return COLOR_MAP[key] || '#9CA3AF';
}

function isLightColor(colorName: string): boolean {
  return ['white', 'cream', 'beige', 'nude', 'yellow', 'silver', 'ivory', 'off-white'].some(
    c => colorName.toLowerCase().includes(c)
  );
}

export function VariantPicker({ variants, selectedSize, selectedColor, onSizeChange, onColorChange }: VariantPickerProps) {
  const hasSizes  = variants.some(v => v.size);
  const hasColors = variants.some(v => v.color);

  const uniqueSizes = hasSizes ? Array.from(new Set(variants.filter(v => v.size).map(v => v.size!))) : [];
  const colorsForSelectedSize = hasColors
    ? hasSizes && selectedSize
      ? Array.from(new Set(variants.filter(v => v.size === selectedSize && v.color).map(v => v.color!)))
      : Array.from(new Set(variants.filter(v => v.color).map(v => v.color!)))
    : [];

  const sizeHasStock = (size: string) => variants.some(v => v.size === size && (v.stock ?? 0) > 0);
  const colorHasStock = (color: string) => {
    if (hasSizes && selectedSize) {
      const v = variants.find(vv => vv.size === selectedSize && vv.color === color);
      return v ? (v.stock ?? 0) > 0 : false;
    }
    return variants.some(v => v.color === color && (v.stock ?? 0) > 0);
  };

  if (!hasSizes && !hasColors) return null;

  return (
    <div className="space-y-5">
      {hasSizes && uniqueSizes.length > 0 && (
        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-sm font-semibold text-gray-900">Size</span>
            {selectedSize && <span className="text-sm text-gray-500 font-normal">{selectedSize}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueSizes.map(size => {
              const isSelected = selectedSize === size;
              const hasAnyStock = sizeHasStock(size);
              return (
                <motion.button
                  key={size}
                  type="button"
                  whileHover={hasAnyStock ? { scale: 1.04 } : {}}
                  whileTap={hasAnyStock ? { scale: 0.96 } : {}}
                  onClick={() => hasAnyStock && onSizeChange(size)}
                  className={`relative px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all select-none ${
                    isSelected ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                    : hasAnyStock ? 'border-gray-200 text-gray-700 hover:border-gray-400 bg-white'
                    : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'
                  }`}
                >
                  {size}
                  {!hasAnyStock && (
                    <svg className="absolute inset-0 w-full h-full rounded-xl" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <line x1="5" y1="95" x2="95" y2="5" stroke="#D1D5DB" strokeWidth="2" />
                    </svg>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {hasColors && colorsForSelectedSize.length > 0 && (
        <div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-sm font-semibold text-gray-900">Color</span>
            {selectedColor && <span className="text-sm text-gray-500 font-normal capitalize">{selectedColor}</span>}
          </div>
          <div className="flex flex-wrap gap-3">
            {colorsForSelectedSize.map(color => {
              const isSelected = selectedColor === color;
              const inStock = colorHasStock(color);
              const hex = getColorHex(color);
              const light = isLightColor(color);
              return (
                <motion.button
                  key={color}
                  type="button"
                  whileHover={inStock ? { scale: 1.1 } : {}}
                  whileTap={inStock ? { scale: 0.9 } : {}}
                  onClick={() => inStock && onColorChange(color)}
                  title={color.charAt(0).toUpperCase() + color.slice(1)}
                  className={`relative w-9 h-9 rounded-full border-2 transition-all select-none ${
                    isSelected ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
                    : inStock ? light ? 'border-gray-300 hover:border-gray-500' : 'border-transparent hover:border-gray-400'
                    : 'border-gray-200 opacity-40 cursor-not-allowed'
                  }`}
                  style={{ backgroundColor: hex }}
                >
                  {!inStock && (
                    <svg className="absolute inset-0 w-full h-full rounded-full" viewBox="0 0 36 36">
                      <line x1="4" y1="32" x2="32" y2="4" stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" />
                    </svg>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {hasSizes && hasColors && selectedSize && !selectedColor && colorsForSelectedSize.length > 0 && (
        <p className="text-xs text-amber-600 font-medium">Please select a color to continue</p>
      )}
    </div>
  );
}

export function findVariant(variants: Variant[], selectedSize: string | null, selectedColor: string | null): Variant | undefined {
  return variants.find(v => {
    const sizeOk = !selectedSize || v.size === selectedSize;
    const colorOk = !selectedColor || v.color === selectedColor;
    return sizeOk && colorOk;
  });
}

export function autoSelectVariant(variants: Variant[]): { size: string | null; color: string | null } {
  const hasSizes = variants.some(v => v.size);
  const hasColors = variants.some(v => v.color);
  const uniqueSizes = hasSizes ? Array.from(new Set(variants.filter(v => v.size).map(v => v.size!))) : [];
  const uniqueColors = hasColors ? Array.from(new Set(variants.filter(v => v.color).map(v => v.color!))) : [];

  let size: string | null = null;
  let color: string | null = null;

  if (hasSizes) {
    size = uniqueSizes.find(s => variants.some(v => v.size === s && (v.stock ?? 0) > 0)) ?? uniqueSizes[0] ?? null;
  }

  if (hasColors) {
    const sizesToCheck = size ? [size] : [null];
    for (const s of sizesToCheck) {
      const colorsForSize = s
        ? uniqueColors.filter(c => variants.some(v => v.size === s && v.color === c))
        : uniqueColors;
      color = colorsForSize.find(c => {
        const v = variants.find(vv => (s ? vv.size === s : true) && vv.color === c);
        return v && (v.stock ?? 0) > 0;
      }) ?? colorsForSize[0] ?? null;
    }
  }

  return { size, color };
}