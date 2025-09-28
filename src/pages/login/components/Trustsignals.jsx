import React from 'react';
import Icon from '../../../components/AppIcon';

const TrustSignals = ({ className = '' }) => {
  const trustBadges = [
    {
      id: 'ssl',
      icon: 'Shield',
      label: 'SSL Secured',
      description: 'Your data is encrypted and secure'
    },
    {
      id: 'government',
      icon: 'Building2',
      label: 'Government Authorized',
      description: 'Official coastal authority platform'
    },
    {
      id: 'incois',
      icon: 'Waves',
      label: 'INCOIS Certified',
      description: 'Indian National Centre for Ocean Information Services'
    }
  ];

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {trustBadges?.map((badge) => (
          <div
            key={badge?.id}
            className="flex items-center space-x-3 p-3 bg-card/60 backdrop-blur-sm border border-border/30 rounded-lg"
          >
            <div className="flex items-center justify-center w-8 h-8 bg-success/10 rounded-full">
              <Icon name={badge?.icon} size={16} className="text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {badge?.label}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {badge?.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustSignals;