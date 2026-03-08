import React from 'react';

/**
 * Reusable Card Component
 * For consistent card-based layouts
 */

const Card = ({ 
  children, 
  title,
  subtitle,
  headerAction,
  footer,
  padding = 'default',
  hover = false,
  className = '',
  ...props 
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8',
  };
  
  return (
    <div
      className={`
        bg-white rounded-lg shadow-md
        ${hover ? 'transition-shadow hover:shadow-lg' : ''}
        ${className}
      `}
      {...props}
    >
      {(title || headerAction) && (
        <div className={`border-b border-gray-200 ${paddingStyles[padding]}`}>
          <div className="flex justify-between items-start">
            <div>
              {title && (
                <h3 className="text-lg font-bold text-gray-900">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {headerAction && (
              <div className="ml-4">
                {headerAction}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className={paddingStyles[padding]}>
        {children}
      </div>
      
      {footer && (
        <div className={`border-t border-gray-200 ${paddingStyles[padding]} bg-gray-50 rounded-b-lg`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
