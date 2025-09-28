import React from 'react';
import Icon from '../../../components/Appicon';

const ProgressIndicator = ({ 
  currentStep, 
  totalSteps, 
  steps = [],
  className = '' 
}) => {
  const defaultSteps = [
    { id: 1, name: 'Hazard Type', icon: 'AlertTriangle' },
    { id: 2, name: 'Location', icon: 'MapPin' },
    { id: 3, name: 'Details', icon: 'FileText' },
    { id: 4, name: 'Media', icon: 'Camera' }
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
          container: 'bg-primary text-primary-foreground',
          connector: 'bg-primary',
          text: 'text-primary font-medium'
        };
      case 'current':
        return {
          container: 'bg-primary text-primary-foreground ring-4 ring-primary/20',
          connector: 'bg-muted',
          text: 'text-primary font-medium'
        };
      default:
        return {
          container: 'bg-muted text-muted-foreground',
          connector: 'bg-muted',
          text: 'text-muted-foreground'
        };
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Progress Bar */}
      <div className="block sm:hidden mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round((currentStep / totalSteps) * 100)}%
          </span>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        
        <div className="mt-2 text-center">
          <span className="text-sm font-medium text-foreground">
            {stepData?.find(step => step?.id === currentStep)?.name}
          </span>
        </div>
      </div>
      {/* Desktop Step Indicator */}
      <div className="hidden sm:block">
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
                          <Icon name={step?.icon} size={20} />
                        )}
                      </div>
                      
                      {/* Pulse animation for current step */}
                      {status === 'current' && (
                        <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
                      )}
                    </div>

                    {/* Connector Line */}
                    {!isLast && (
                      <div className={`
                        flex-1 h-0.5 ml-4 transition-colors duration-200
                        ${classes?.connector}
                      `} />
                    )}
                  </div>
                  {/* Step Label */}
                  <div className="absolute top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
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
      {/* Progress Summary */}
      <div className="mt-8 p-4 bg-muted/30 border border-border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="Clock" size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Progress automatically saved
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success rounded-full pulse-indicator" />
            <span className="text-sm text-success font-medium">
              Auto-save enabled
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;