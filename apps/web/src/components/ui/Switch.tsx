import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  id?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  id,
}) => {
  const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const toggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  };

  const isSmall = size === 'sm';

  return (
    <div className="flex items-center justify-between gap-3">
      {(label || description) && (
        <label
          htmlFor={switchId}
          onClick={toggle}
          className={`cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {label && <span className="text-sm font-medium text-cream-900 block">{label}</span>}
          {description && <span className="text-xs text-cream-600 block">{description}</span>}
        </label>
      )}
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
          isSmall ? 'h-5 w-9' : 'h-6 w-11'
        } ${checked ? 'bg-emerald-600' : 'bg-cream-300'} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span
          className={`pointer-events-none inline-block transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            isSmall ? 'h-4 w-4' : 'h-5 w-5'
          } ${
            checked
              ? isSmall
                ? 'translate-x-4'
                : 'translate-x-5'
              : 'translate-x-0.5'
          } mt-0.5`}
        />
      </button>
    </div>
  );
};
