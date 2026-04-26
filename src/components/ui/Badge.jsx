import React from 'react';
import { riskLevels, questionTypes, statusColors } from '../../styles/designSystem';

/**
 * Reusable Badge Component
 * For status, risk levels, question types, etc.
 */

const Badge = ({ 
  children,
  variant = 'default',
  type,  // 'risk', 'question', 'status'
  value, // The actual value (e.g., 'low', 'StaticDataLinked', 'draft')
  size = 'md',
  icon,
  className = '',
  ...props 
}) => {
  // Size styles
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };
  
  // Get colors based on type and value
  let colors = {};
  let displayText = children;
  let displayIcon = icon;
  
  if (type === 'risk' && value) {
    const riskConfig = riskLevels[value.toLowerCase()];
    if (riskConfig) {
      colors = {
        bg: riskConfig.bg,
        text: riskConfig.text,
        border: riskConfig.border,
      };
      displayText = displayText || riskConfig.label;
      displayIcon = displayIcon || riskConfig.icon;
    }
  } else if (type === 'question' && value) {
    const questionConfig = questionTypes[value];
    if (questionConfig) {
      colors = {
        bg: questionConfig.bg,
        text: questionConfig.text,
        border: questionConfig.border,
      };
      displayText = displayText || questionConfig.label;
      displayIcon = displayIcon || questionConfig.icon;
    }
  } else if (type === 'status' && value) {
    const statusConfig = statusColors[value];
    if (statusConfig) {
      colors = {
        bg: statusConfig.bg,
        text: statusConfig.text,
        border: statusConfig.border,
      };
      displayText = displayText || statusConfig.label;
    }
  }
  
  // Default variant styles
  const variants = {
    default: 'bg-gray-100 text-gray-700 border-gray-200',
    primary: 'bg-blue-100 text-blue-700 border-blue-200',
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  };
  
  const baseStyles = `
    inline-flex items-center gap-1
    font-medium rounded-full border
    ${sizes[size]}
    ${colors.bg ? '' : variants[variant]}
    ${className}
  `;
  
  const style = colors.bg ? {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border,
  } : {};
  
  return (
    <span
      className={baseStyles}
      style={style}
      {...props}
    >
      {displayIcon && <span>{displayIcon}</span>}
      {displayText}
    </span>
  );
};

export default Badge;
