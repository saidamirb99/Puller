import React from 'react';

interface FilterChip {
  label: string;
  value: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  activeChip: string;
  onChange: (value: string) => void;
  className?: string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  chips,
  activeChip,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-2 ${className}`}>
      {chips.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onChange(chip.value)}
          className={`
            px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap
            transition-all duration-200
            ${
              activeChip === chip.value
                ? 'bg-brand-purple text-white shadow-md'
                : 'bg-transparent text-gray-400 border border-dark-border hover:border-brand-purple hover:text-brand-purple'
            }
          `}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
};
