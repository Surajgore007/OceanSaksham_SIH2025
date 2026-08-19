import React from 'react';
import Icon from '../../../components/Appicon';
import { useTranslation } from '../../../context/LanguageContext';

const ProgressIndicator = ({ 
  currentStep, 
  totalSteps, 
  steps = [],
  className = '' 
}) => {
  const { t } = useTranslation();

  const defaultSteps = [
    { id: 1, name: t('step1Title', 'Hazard Type'), icon: 'AlertTriangle' },
    { id: 2, name: t('step2Title', 'Location & Notes'), icon: 'MapPin' },
    { id: 3, name: t('step3Title', 'Media & Submit'), icon: 'Camera' }
  ];

  const stepData = steps?.length > 0 ? steps : defaultSteps;

  const getStepStatus = (stepNumber) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepClasses = (status) => {
    switch (status) {
      case 'completed':
        return {
          container: 'bg-primary text-white shadow-md',
          connector: 'bg-primary',
          text: 'text-primary font-bold'
        };
      case 'current':
        return {
          container: 'bg-primary text-white ring-4 ring-primary/20 shadow-md',
          connector: 'bg-slate-200',
          text: 'text-slate-900 font-bold'
        };
      default:
        return {
          container: 'bg-slate-200 text-slate-500',
          connector: 'bg-slate-200',
          text: 'text-slate-500 font-semibold'
        };
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Progress Bar */}
      <div className="block sm:hidden mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800">
            {stepData?.find(step => step?.id === currentStep)?.name || `Step ${currentStep}`}
          </span>
          <span className="text-xs font-bold text-primary">
            {currentStep}/{totalSteps}
          </span>
        </div>
        
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop Step Indicator */}
      <div className="hidden sm:block pb-4">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {stepData?.map((step, index) => {
              const status = getStepStatus(step?.id);
              const classes = getStepClasses(status);
              const isLast = index === stepData?.length - 1;

              return (
                <li key={step?.id} className="relative flex-1">
                  <div className="flex items-center">
                    {/* Step Circle */}
                    <div className="relative flex items-center justify-center">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center 
                        transition-all duration-200 ${classes?.container}
                      `}>
                        {status === 'completed' ? (
                          <Icon name="Check" size={20} strokeWidth={3} />
                        ) : (
                          <Icon name={step?.icon} size={18} />
                        )}
                      </div>
                      
                      {status === 'current' && (
                        <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
                      )}
                    </div>

                    {/* Connector Line */}
                    {!isLast && (
                      <div className={`
                        flex-1 h-0.5 ml-4 mr-2 transition-colors duration-200
                        ${classes?.connector}
                      `} />
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="absolute top-12 left-5 transform -translate-x-1/2 whitespace-nowrap">
                    <span className={`text-xs transition-colors duration-200 ${classes?.text}`}>
                      {step?.name}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
};

export default ProgressIndicator;