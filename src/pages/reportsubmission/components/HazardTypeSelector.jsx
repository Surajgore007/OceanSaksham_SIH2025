import React from 'react';
import Icon from '../../../components/Appicon';


const HazardTypeSelector = ({ selectedType, onTypeSelect, className = '' }) => {
  const hazardTypes = [
    {
      id: 'tsunami',
      name: 'Tsunami',
      icon: 'Waves',
      description: 'Large ocean waves caused by underwater disturbances',
      color: 'bg-red-500',
      borderColor: 'border-red-200',
      textColor: 'text-red-700'
    },
    {
      id: 'flooding',
      name: 'Coastal Flooding',
      icon: 'CloudRain',
      description: 'Water overflow from ocean onto normally dry coastal land',
      color: 'bg-blue-500',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700'
    },
    {
      id: 'high-waves',
      name: 'High Waves',
      icon: 'Wind',
      description: 'Unusually large waves that can damage coastal structures',
      color: 'bg-cyan-500',
      borderColor: 'border-cyan-200',
      textColor: 'text-cyan-700'
    },
    {
      id: 'storm-surge',
      name: 'Storm Surge',
      icon: 'Zap',
      description: 'Rise in sea level during storms causing coastal flooding',
      color: 'bg-purple-500',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700'
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Select Hazard Type
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose the type of coastal hazard you want to report
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {hazardTypes?.map((hazard) => {
          const isSelected = selectedType === hazard?.id;
          
          return (
            <button
              key={hazard?.id}
              onClick={() => onTypeSelect(hazard?.id)}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-200 
                text-left hover:shadow-lg focus:outline-none focus:ring-2 
                focus:ring-primary focus:ring-offset-2 haptic-feedback
                ${isSelected 
                  ? `${hazard?.borderColor} bg-white shadow-md ring-2 ring-primary ring-offset-2` 
                  : 'border-border bg-card hover:border-primary/30'
                }
              `}
              aria-pressed={isSelected}
              aria-describedby={`hazard-${hazard?.id}-desc`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Icon name="Check" size={14} color="white" strokeWidth={3} />
                  </div>
                </div>
              )}
              {/* Hazard Icon */}
              <div className={`
                w-12 h-12 rounded-lg flex items-center justify-center mb-4
                ${isSelected ? hazard?.color : 'bg-muted'}
              `}>
                <Icon 
                  name={hazard?.icon} 
                  size={24} 
                  color={isSelected ? 'white' : 'currentColor'} 
                  strokeWidth={2}
                />
              </div>
              {/* Hazard Info */}
              <div>
                <h3 className={`
                  font-semibold mb-2 transition-colors
                  ${isSelected ? hazard?.textColor : 'text-foreground'}
                `}>
                  {hazard?.name}
                </h3>
                <p 
                  id={`hazard-${hazard?.id}-desc`}
                  className="text-sm text-muted-foreground leading-relaxed"
                >
                  {hazard?.description}
                </p>
              </div>
              {/* Hover Effect Overlay */}
              <div className={`
                absolute inset-0 rounded-xl transition-opacity duration-200
                ${isSelected ? 'opacity-0' : 'opacity-0 hover:opacity-5 bg-primary'}
              `} />
            </button>
          );
        })}
      </div>
      {/* Emergency Contact Info */}
      <div className="mt-8 p-4 bg-warning/10 border border-warning/20 rounded-lg">
        <div className="flex items-start space-x-3">
          <Icon name="AlertTriangle" size={20} className="text-warning mt-0.5" />
          <div>
            <h4 className="font-medium text-warning mb-1">Emergency Situations</h4>
            <p className="text-sm text-muted-foreground">
              For immediate life-threatening emergencies, call <strong>108</strong> (Emergency Services) 
              or <strong>1078</strong> (Coast Guard) before submitting this report.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HazardTypeSelector;