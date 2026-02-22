import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-400 mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-2.5
          bg-white/[0.04] border border-white/[0.07] rounded-xl
          text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent
          transition-all duration-200
          ${error ? 'border-semantic-error focus:ring-semantic-error' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-semantic-error">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};
