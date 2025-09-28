import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const RegistrationForm = ({ onSubmit, isLoading = false }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '',
    department: '',
    credentials: '',
    language: 'en',
    location: '',
    agreeTerms: false,
    agreeEmergency: false,
    enableLocation: false
  });
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  const roleOptions = [
    { 
      value: 'citizen', 
      label: 'Citizen',
      description: 'Report coastal hazards and receive alerts'
    },
    { 
      value: 'official', 
      label: 'Government Official',
      description: 'Verify reports and manage emergency responses'
    },
    { 
      value: 'analyst', 
      label: 'Data Analyst',
      description: 'Analyze hazard patterns and generate insights'
    }
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिंदी (Hindi)' },
    { value: 'ta', label: 'தமிழ் (Tamil)' },
    { value: 'ml', label: 'മലയാളം (Malayalam)' }
  ];

  const departmentOptions = [
    { value: 'incois', label: 'INCOIS - Indian National Centre for Ocean Information Services' },
    { value: 'imd', label: 'IMD - India Meteorological Department' },
    { value: 'ndma', label: 'NDMA - National Disaster Management Authority' },
    { value: 'coast-guard', label: 'Indian Coast Guard' },
    { value: 'navy', label: 'Indian Navy' },
    { value: 'state-disaster', label: 'State Disaster Management Authority' },
    { value: 'local-admin', label: 'Local Administration' }
  ];

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password?.length >= 8) strength += 25;
    if (/[A-Z]/?.test(password)) strength += 25;
    if (/[0-9]/?.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/?.test(password)) strength += 25;
    return strength;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
    
    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData?.name?.trim()) newErrors.name = 'Full name is required';
      if (!formData?.email?.trim()) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/?.test(formData?.email)) newErrors.email = 'Invalid email format';
      if (!formData?.phone?.trim()) newErrors.phone = 'Phone number is required';
      else if (!/^[6-9]\d{9}$/?.test(formData?.phone)) newErrors.phone = 'Invalid Indian phone number';
    }
    
    if (step === 2) {
      if (!formData?.password) newErrors.password = 'Password is required';
      else if (formData?.password?.length < 8) newErrors.password = 'Password must be at least 8 characters';
      if (formData?.password !== formData?.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
      if (!formData?.role) newErrors.role = 'Please select your role';
    }
    
    if (step === 3) {
      if ((formData?.role === 'official' || formData?.role === 'analyst') && !formData?.department) {
        newErrors.department = 'Department selection is required';
      }
      if ((formData?.role === 'official' || formData?.role === 'analyst') && !formData?.credentials?.trim()) {
        newErrors.credentials = 'Credentials/ID is required for official roles';
      }
      if (!formData?.agreeTerms) newErrors.agreeTerms = 'You must agree to the terms';
      if (!formData?.agreeEmergency) newErrors.agreeEmergency = 'Emergency response agreement is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (validateStep(3)) {
      onSubmit(formData);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return 'bg-error';
    if (passwordStrength < 50) return 'bg-warning';
    if (passwordStrength < 75) return 'bg-secondary';
    return 'bg-success';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Weak';
    if (passwordStrength < 50) return 'Fair';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3]?.map((step) => (
          <div key={step} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
              ${currentStep >= step 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
              }
            `}>
              {step}
            </div>
            {step < 3 && (
              <div className={`
                w-16 h-0.5 mx-2
                ${currentStep > step ? 'bg-primary' : 'bg-muted'}
              `} />
            )}
          </div>
        ))}
      </div>
      {/* Step 1: Personal Information */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Personal Information</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your basic details to get started
            </p>
          </div>

          <Input
            label="Full Name"
            type="text"
            placeholder="Enter your full name"
            value={formData?.name}
            onChange={(e) => handleInputChange('name', e?.target?.value)}
            error={errors?.name}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="your.email@example.com"
            value={formData?.email}
            onChange={(e) => handleInputChange('email', e?.target?.value)}
            error={errors?.email}
            description="We'll send verification code to this email"
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="9876543210"
            value={formData?.phone}
            onChange={(e) => handleInputChange('phone', e?.target?.value)}
            error={errors?.phone}
            description="10-digit Indian mobile number for SMS alerts"
            required
          />

          <Select
            label="Preferred Language"
            options={languageOptions}
            value={formData?.language}
            onChange={(value) => handleInputChange('language', value)}
            placeholder="Select your language"
          />
        </div>
      )}
      {/* Step 2: Security & Role */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Security & Role</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create a secure password and select your role
            </p>
          </div>

          <div className="space-y-2">
            <Input
              label="Password"
              type="password"
              placeholder="Create a strong password"
              value={formData?.password}
              onChange={(e) => handleInputChange('password', e?.target?.value)}
              error={errors?.password}
              required
            />
            
            {formData?.password && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Password Strength</span>
                  <span className={`font-medium ${
                    passwordStrength < 50 ? 'text-error' : 'text-success'
                  }`}>
                    {getPasswordStrengthText()}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${getPasswordStrengthColor()}`}
                    style={{ width: `${passwordStrength}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            value={formData?.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e?.target?.value)}
            error={errors?.confirmPassword}
            required
          />

          <Select
            label="Select Your Role"
            options={roleOptions}
            value={formData?.role}
            onChange={(value) => handleInputChange('role', value)}
            placeholder="Choose your role in the system"
            error={errors?.role}
            description="This determines your access level and responsibilities"
            required
          />

          {formData?.role && (
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start space-x-3">
                <Icon 
                  name={
                    formData?.role === 'citizen' ? 'Users' :
                    formData?.role === 'official' ? 'Shield' : 'BarChart3'
                  } 
                  size={20} 
                  className="text-primary mt-0.5" 
                />
                <div>
                  <h4 className="font-medium text-foreground">
                    {roleOptions?.find(r => r?.value === formData?.role)?.label}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {roleOptions?.find(r => r?.value === formData?.role)?.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Step 3: Verification & Preferences */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Final Details</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete your registration with additional details
            </p>
          </div>

          {(formData?.role === 'official' || formData?.role === 'analyst') && (
            <>
              <Select
                label="Department/Organization"
                options={departmentOptions}
                value={formData?.department}
                onChange={(value) => handleInputChange('department', value)}
                placeholder="Select your department"
                error={errors?.department}
                searchable
                required
              />

              <Input
                label="Official ID/Credentials"
                type="text"
                placeholder="Enter your official ID or credentials"
                value={formData?.credentials}
                onChange={(e) => handleInputChange('credentials', e?.target?.value)}
                error={errors?.credentials}
                description="Employee ID, badge number, or other official identifier"
                required
              />
            </>
          )}

          <div className="space-y-3">
            <Checkbox
              label="Enable Location Services"
              description="Allow GPS access for automatic location detection and relevant alerts"
              checked={formData?.enableLocation}
              onChange={(e) => handleInputChange('enableLocation', e?.target?.checked)}
            />

            <Checkbox
              label="I agree to the Terms of Service and Privacy Policy"
              description="By checking this, you accept our terms and privacy policy"
              checked={formData?.agreeTerms}
              onChange={(e) => handleInputChange('agreeTerms', e?.target?.checked)}
              error={errors?.agreeTerms}
              required
            />

            <Checkbox
              label="I understand my emergency response responsibilities"
              description="I acknowledge the importance of accurate reporting during coastal hazard events"
              checked={formData?.agreeEmergency}
              onChange={(e) => handleInputChange('agreeEmergency', e?.target?.checked)}
              error={errors?.agreeEmergency}
              required
            />
          </div>

          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <Icon name="AlertTriangle" size={20} className="text-accent mt-0.5" />
              <div>
                <h4 className="font-medium text-accent">Emergency Response Notice</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  This system is designed for coastal hazard reporting and emergency management. 
                  False reporting may result in account suspension and legal consequences.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <div>
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              iconName="ChevronLeft"
              iconPosition="left"
            >
              Previous
            </Button>
          )}
        </div>

        <div className="flex space-x-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/login')}
          >
            Already have an account?
          </Button>

          {currentStep < 3 ? (
            <Button
              type="button"
              variant="default"
              onClick={handleNext}
              iconName="ChevronRight"
              iconPosition="right"
            >
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              variant="default"
              loading={isLoading}
              iconName="UserPlus"
              iconPosition="left"
            >
              Create Account
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export default RegistrationForm;