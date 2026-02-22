import React from 'react';
import { isMaterialIcon } from '../../data/icon-library';

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const containerSizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const materialFontSizes = {
  sm: 18,
  md: 22,
  lg: 26,
};

const emojiFontSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  icon,
  color,
  size = 'md',
  className = '',
}) => {
  const isMaterial = isMaterialIcon(icon);

  return (
    <div
      className={`${containerSizes[size]} rounded-xl flex items-center justify-center ${className}`}
      style={{ backgroundColor: `${color}20` }}
    >
      {isMaterial ? (
        <span
          className="material-symbols-outlined"
          style={{ color, fontSize: materialFontSizes[size] }}
        >
          {icon}
        </span>
      ) : (
        <span className={emojiFontSizes[size]} style={{ color }}>
          {icon}
        </span>
      )}
    </div>
  );
};
