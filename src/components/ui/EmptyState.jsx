import React from 'react';
import Button from './Button';

/**
 * Empty State Component
 * Shown when no data is available
 */

const EmptyState = ({
  icon = '📋',
  title,
  titleAr,
  description,
  descriptionAr,
  action,
  actionLabel,
  actionLabelAr,
  onAction,
  className = '',
}) => {
  return (
    <div className={`text-center py-16 px-4 ${className}`}>
      <div className="text-6xl mb-4">{icon}</div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {titleAr || title || 'لا توجد بيانات'}
      </h3>
      
      {(description || descriptionAr) && (
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          {descriptionAr || description}
        </p>
      )}
      
      {(action || onAction) && (
        <div className="mt-6">
          {action || (
            <Button
              variant="primary"
              onClick={onAction}
            >
              {actionLabelAr || actionLabel || 'إضافة'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
