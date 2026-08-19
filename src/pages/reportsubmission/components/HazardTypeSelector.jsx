import React from 'react';
import Icon from '../../../components/Appicon';
import { useTranslation } from '../../../context/LanguageContext';

const HazardTypeSelector = ({ selectedType, onTypeSelect, className = '' }) => {
  const { t } = useTranslation();

  const hazardTypes = [
    {
      id: 'flood',
      name: t('flood', 'Coastal Flooding'),
      icon: 'CloudRain',
      description: t('floodDesc', 'Water overflow from ocean onto normally dry coastal land'),
      color: 'bg-blue-600',
      borderColor: 'border-blue-400',
      textColor: 'text-blue-900'
    },
    {
      id: 'high-waves',
      name: t('high_waves', 'High Waves'),
      icon: 'Wind',
      description: t('high_wavesDesc', 'Unusually large waves that can damage coastal structures'),
      color: 'bg-cyan-600',
      borderColor: 'border-cyan-400',
      textColor: 'text-cyan-900'
    },
    {
      id: 'tsunami',
      name: t('tsunami', 'Tsunami'),
      icon: 'Waves',
      description: t('tsunamiDesc', 'Large ocean waves caused by underwater seismic disturbances'),
      color: 'bg-red-600',
      borderColor: 'border-red-400',
      textColor: 'text-red-900'
    },
    {
      id: 'storm-surge',
      name: t('storm_surge', 'Storm Surge'),
      icon: 'Zap',
      description: t('storm_surgeDesc', 'Rise in sea level during storms causing coastal flooding'),
      color: 'bg-purple-600',
      borderColor: 'border-purple-400',
      textColor: 'text-purple-900'
    },
    {
      id: 'coastal-erosion',
      name: t('coastal_erosion', 'Coastal Erosion'),
      icon: 'Landmark',
      description: t('coastal_erosionDesc', 'Shoreline loss, damaged dunes, or unstable coastal edges'),
      color: 'bg-amber-600',
      borderColor: 'border-amber-400',
      textColor: 'text-amber-900'
    },
    {
      id: 'other',
      name: t('other', 'Other Coastal Hazard'),
      icon: 'AlertCircle',
      description: t('otherDesc', 'Any other urgent coastal hazard or unsafe marine condition'),
      color: 'bg-slate-700',
      borderColor: 'border-slate-400',
      textColor: 'text-slate-900'
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-1.5">
          {t('selectHazardType', 'Select Hazard Type')}
        </h2>
        <p className="text-sm font-medium text-slate-600">
          {t('chooseHazardDesc', 'Choose the type of coastal hazard you want to report')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {hazardTypes?.map((hazard) => {
          const isSelected = selectedType === hazard?.id;
          
          return (
            <button
              key={hazard?.id}
              type="button"
              onClick={() => onTypeSelect(hazard?.id)}
              className={`
                relative p-5 sm:p-6 rounded-2xl border-2 transition-all duration-200 
                text-left hover:shadow-lg focus:outline-none focus:ring-2 
                focus:ring-primary focus:ring-offset-2
                ${isSelected 
                  ? `${hazard?.borderColor} bg-blue-50/70 shadow-md ring-2 ring-primary ring-offset-2` 
                  : 'border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50'
                }
              `}
              aria-pressed={isSelected}
              aria-describedby={`hazard-${hazard?.id}-desc`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-xs">
                    <Icon name="Check" size={14} color="white" strokeWidth={3} />
                  </div>
                </div>
              )}

              {/* Hazard Icon */}
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-xs
                ${isSelected ? hazard?.color : 'bg-slate-100 text-slate-700'}
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
                  text-base font-bold mb-1.5 transition-colors
                  ${isSelected ? hazard?.textColor : 'text-slate-900'}
                `}>
                  {hazard?.name}
                </h3>
                <p 
                  id={`hazard-${hazard?.id}-desc`}
                  className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed"
                >
                  {hazard?.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Emergency Contact Info */}
      <div className="mt-8 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl">
        <div className="flex items-start space-x-3">
          <Icon name="AlertTriangle" size={20} className="text-amber-700 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-amber-900 mb-1">
              {t('emergencyNoticeTitle', 'Emergency Situations')}
            </h4>
            <p className="text-xs sm:text-sm font-medium text-amber-800 leading-relaxed">
              {t('emergencyNoticeText', 'For immediate life-threatening emergencies, call 108 (Disaster Response) or 1078 (Coast Guard) before submitting this report.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HazardTypeSelector;
