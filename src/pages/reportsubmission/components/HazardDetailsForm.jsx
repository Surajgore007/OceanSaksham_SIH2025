import React, { useState } from 'react';
import Icon from '../../../components/Appicon';
import Input from '../../../components/ui/Input';


const HazardDetailsForm = ({ 
  formData, 
  onFormDataChange, 
  errors = {},
  className = '' 
}) => {
  const [description, setDescription] = useState(formData?.description || '');
  const [severity, setSeverity] = useState(formData?.severity || '');
  const [contactInfo, setContactInfo] = useState({
    name: formData?.contactName || '',
    phone: formData?.contactPhone || '',
    email: formData?.contactEmail || ''
  });

  const maxDescriptionLength = 500;
  const remainingChars = maxDescriptionLength - description?.length;

  const severityLevels = [
    {
      id: 'low',
      name: 'Low',
      description: 'Minor hazard with minimal immediate risk',
      color: 'bg-green-500',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      icon: 'Info'
    },
    {
      id: 'medium',
      name: 'Medium',
      description: 'Moderate hazard requiring attention',
      color: 'bg-yellow-500',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
      icon: 'AlertTriangle'
    },
    {
      id: 'high',
      name: 'High',
      description: 'Serious hazard with significant risk',
      color: 'bg-orange-500',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700',
      icon: 'AlertCircle'
    },
    {
      id: 'critical',
      name: 'Critical',
      description: 'Immediate danger requiring urgent response',
      color: 'bg-red-500',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      icon: 'AlertOctagon'
    }
  ];

  const handleDescriptionChange = (e) => {
    const value = e?.target?.value;
    if (value?.length <= maxDescriptionLength) {
      setDescription(value);
      onFormDataChange({ description: value });
    }
  };

  const handleSeveritySelect = (severityId) => {
    setSeverity(severityId);
    onFormDataChange({ severity: severityId });
  };

  const handleContactChange = (field, value) => {
    const updatedContact = { ...contactInfo, [field]: value };
    setContactInfo(updatedContact);
    
    onFormDataChange({
      contactName: updatedContact?.name,
      contactPhone: updatedContact?.phone,
      contactEmail: updatedContact?.email
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Hazard Details
        </h2>
        <p className="text-sm text-muted-foreground">
          Provide detailed information about the hazard
        </p>
      </div>
      {/* Description Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description <span className="text-error">*</span>
          </label>
          <div className="relative">
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Describe what you're observing. Include details like wave height, water levels, affected areas, and any immediate dangers..."
              className={`
                w-full min-h-[120px] px-3 py-2 border rounded-lg resize-none
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                ${errors?.description 
                  ? 'border-error bg-error/5' :'border-border bg-input'
                }
              `}
              maxLength={maxDescriptionLength}
              required
            />
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {remainingChars} characters remaining
            </div>
          </div>
          {errors?.description && (
            <p className="text-sm text-error mt-1">{errors?.description}</p>
          )}
        </div>

        {/* Character Count Indicator */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">
            Minimum 20 characters recommended
          </span>
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${remainingChars < 50 
              ? 'bg-warning/10 text-warning' :'bg-muted text-muted-foreground'
            }
          `}>
            {description?.length}/{maxDescriptionLength}
          </div>
        </div>
      </div>
      {/* Severity Selection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Severity Level <span className="text-error">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {severityLevels?.map((level) => {
              const isSelected = severity === level?.id;
              
              return (
                <button
                  key={level?.id}
                  onClick={() => handleSeveritySelect(level?.id)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all duration-200 
                    text-left hover:shadow-md focus:outline-none focus:ring-2 
                    focus:ring-primary focus:ring-offset-2 haptic-feedback
                    ${isSelected 
                      ? `${level?.borderColor} bg-white shadow-md ring-2 ring-primary ring-offset-2` 
                      : 'border-border bg-card hover:border-primary/30'
                    }
                  `}
                  aria-pressed={isSelected}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Icon name="Check" size={12} color="white" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    {/* Severity Icon */}
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${isSelected ? level?.color : 'bg-muted'}
                    `}>
                      <Icon 
                        name={level?.icon} 
                        size={20} 
                        color={isSelected ? 'white' : 'currentColor'} 
                      />
                    </div>

                    {/* Severity Info */}
                    <div className="flex-1">
                      <h4 className={`
                        font-semibold mb-1 transition-colors
                        ${isSelected ? level?.textColor : 'text-foreground'}
                      `}>
                        {level?.name}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {level?.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {errors?.severity && (
            <p className="text-sm text-error mt-2">{errors?.severity}</p>
          )}
        </div>
      </div>
      {/* Contact Information (Optional) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground">
            Contact Information
          </label>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            Optional
          </span>
        </div>
        
        <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Provide your contact details if officials need to reach you for additional information.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Your full name"
              value={contactInfo?.name}
              onChange={(e) => handleContactChange('name', e?.target?.value)}
            />
            
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+91 98765 43210"
              value={contactInfo?.phone}
              onChange={(e) => handleContactChange('phone', e?.target?.value)}
            />
          </div>
          
          <Input
            label="Email Address"
            type="email"
            placeholder="your.email@example.com"
            value={contactInfo?.email}
            onChange={(e) => handleContactChange('email', e?.target?.value)}
            className="w-full"
          />
        </div>
      </div>
      {/* Guidelines */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-start space-x-3">
          <Icon name="Lightbulb" size={20} className="text-primary mt-0.5" />
          <div>
            <h4 className="font-medium text-primary mb-2">Reporting Guidelines</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Be specific about what you're observing</li>
              <li>• Include approximate measurements if possible (wave height, water depth)</li>
              <li>• Mention any immediate dangers to people or property</li>
              <li>• Note the time when you first observed the hazard</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HazardDetailsForm;