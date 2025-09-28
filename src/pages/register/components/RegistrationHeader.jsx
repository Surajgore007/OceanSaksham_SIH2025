import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';


const RegistrationHeader = () => {
  const navigate = useNavigate();

  return (
    <div className="text-center space-y-4">
      {/* Logo Section */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-card">
          <Icon name="Waves" size={32} color="white" />
        </div>
      </div>

      {/* Title and Description */}
      <div className="space-y-2">
        <h1 className="text-2xl lg:text-3xl font-bold text-primary">
          Join OceanSaksham
        </h1>
        <p className="text-base text-muted-foreground max-w-md mx-auto">
          Create your account to report coastal hazards and help protect our communities
        </p>
      </div>

      {/* Quick Stats */}
      <div className="flex justify-center space-x-6 pt-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-10 h-10 bg-success/10 rounded-full mb-2">
            <Icon name="Users" size={20} className="text-success" />
          </div>
          <p className="text-xs text-muted-foreground">10,000+ Users</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center w-10 h-10 bg-secondary/10 rounded-full mb-2">
            <Icon name="MapPin" size={20} className="text-secondary" />
          </div>
          <p className="text-xs text-muted-foreground">50+ Coastal Areas</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center w-10 h-10 bg-accent/10 rounded-full mb-2">
            <Icon name="Shield" size={20} className="text-accent" />
          </div>
          <p className="text-xs text-muted-foreground">24/7 Monitoring</p>
        </div>
      </div>

      {/* Emergency Notice */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mt-6">
        <div className="flex items-center justify-center space-x-2">
          <Icon name="AlertTriangle" size={16} className="text-accent" />
          <p className="text-sm font-medium text-accent">
            Emergency Reporting System
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Quick registration for immediate hazard reporting capabilities
        </p>
      </div>
    </div>
  );
};

export default RegistrationHeader;