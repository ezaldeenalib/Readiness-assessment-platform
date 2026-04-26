import React from 'react';
import { riskLevels } from '../../styles/designSystem';

/**
 * Score Display Component
 * Shows score with circular progress and risk level
 */

const ScoreDisplay = ({ 
  score = 0,
  maxScore = 100,
  riskLevel,
  size = 'md',
  showDetails = true,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));
  
  // Determine risk level if not provided
  const calculatedRiskLevel = riskLevel || (
    percentage >= 80 ? 'low' :
    percentage >= 60 ? 'medium' :
    percentage >= 40 ? 'high' :
    'critical'
  );
  
  const riskConfig = riskLevels[calculatedRiskLevel];
  
  // Size configurations
  const sizes = {
    sm: {
      container: 'w-24 h-24',
      text: 'text-xl',
      subtext: 'text-xs',
      strokeWidth: 8,
    },
    md: {
      container: 'w-32 h-32',
      text: 'text-3xl',
      subtext: 'text-sm',
      strokeWidth: 10,
    },
    lg: {
      container: 'w-40 h-40',
      text: 'text-4xl',
      subtext: 'text-base',
      strokeWidth: 12,
    },
  };
  
  const config = sizes[size];
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Color based on risk level
  let strokeColor = '#3B82F6'; // Default blue
  if (calculatedRiskLevel === 'low') strokeColor = '#22C55E';
  else if (calculatedRiskLevel === 'medium') strokeColor = '#F59E0B';
  else if (calculatedRiskLevel === 'high') strokeColor = '#F97316';
  else if (calculatedRiskLevel === 'critical') strokeColor = '#EF4444';
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Circular Progress */}
      <div className={`relative ${config.container}`}>
        <svg className="transform -rotate-90 w-full h-full">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={config.strokeWidth}
            fill="none"
          />
          
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke={strokeColor}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`${config.text} font-bold`} style={{ color: strokeColor }}>
            {percentage.toFixed(0)}%
          </div>
        </div>
      </div>
      
      {/* Details */}
      {showDetails && (
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-600 mb-2">
            {score.toFixed(1)} من {maxScore}
          </div>
          
          {riskConfig && (
            <div
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: riskConfig.bg,
                color: riskConfig.text,
                borderColor: riskConfig.border,
                border: '1px solid',
              }}
            >
              <span>{riskConfig.icon}</span>
              <span>{riskConfig.label}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScoreDisplay;
