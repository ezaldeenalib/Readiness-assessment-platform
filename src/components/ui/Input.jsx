import React from 'react';

/**
 * Reusable Input Component
 * Supports text, number, date, select, textarea
 */

const Input = ({ 
  label,
  labelAr,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helpText,
  required = false,
  disabled = false,
  readOnly = false,
  icon,
  iconPosition = 'left',
  className = '',
  inputClassName = '',
  ...props 
}) => {
  const baseInputStyles = `
    w-full px-4 py-2.5
    border rounded-lg
    bg-white
    text-gray-900
    placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:cursor-not-allowed
    transition-all duration-200
    ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
    ${readOnly ? 'bg-gray-50 cursor-not-allowed' : ''}
    ${icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : ''}
    ${inputClassName}
  `;
  
  return (
    <div className={`${className}`}>
      {(label || labelAr) && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {labelAr || label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{icon}</span>
          </div>
        )}
        
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          className={baseInputStyles}
          {...props}
        />
        
        {icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{icon}</span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};

export default Input;
