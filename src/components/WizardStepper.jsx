import React from 'react';

const steps = [
  { number: 1, title: 'المعلومات العامة', titleEn: 'General Info' },
  { number: 2, title: 'البنية التحتية', titleEn: 'Infrastructure' },
  { number: 3, title: 'الخدمات الرقمية', titleEn: 'Digital Services' },
  { number: 4, title: 'الأمن السيبراني', titleEn: 'Cybersecurity' },
  { number: 5, title: 'المراقبة والموافقات', titleEn: 'Monitoring' },
  { number: 6, title: 'معلومات الفروع', titleEn: 'Subsidiaries' },
  { number: 7, title: 'التقنيات المتقدمة', titleEn: 'Advanced Tech' },
];

export default function WizardStepper({ currentStep, completedSteps }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`step-circle ${
                  currentStep === step.number
                    ? 'active'
                    : completedSteps.includes(step.number)
                    ? 'completed'
                    : 'pending'
                }`}
              >
                {completedSteps.includes(step.number) ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <div className="text-center mt-2">
                <div className="text-sm font-semibold text-gray-700">
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">{step.titleEn}</div>
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div
                className={`step-line ${
                  completedSteps.includes(step.number) ? 'completed' : ''
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
