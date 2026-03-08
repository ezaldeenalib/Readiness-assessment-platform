import React from 'react';
import { designSystem } from '../../styles/designSystem';

/**
 * Reusable Button Component
 * Variants: primary, secondary, outline, ghost, danger
 * Sizes: sm, md, lg
 */

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  ...props 
}) => {
  // Variant styles
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md active:shadow-sm disabled:bg-blue-300',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white shadow-sm hover:shadow-md active:shadow-sm disabled:bg-gray-300',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100 disabled:border-blue-300 disabled:text-blue-300',
    ghost: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:text-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md active:shadow-sm disabled:bg-red-300',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md active:shadow-sm disabled:bg-green-300',
  };
  
  // Size styles
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-4 focus:ring-blue-200
    disabled:cursor-not-allowed disabled:opacity-60
    ${fullWidth ? 'w-full' : ''}
    ${variants[variant]}
    ${sizes[size]}
    ${className}
  `;
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={baseStyles}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {icon && iconPosition === 'left' && !loading && (
        <span className="mr-2">{icon}</span>
      )}
      
      {children}
      
      {icon && iconPosition === 'right' && !loading && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  );
};

export default Button;
