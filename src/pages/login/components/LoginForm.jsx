import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/Appicon';

const LoginForm = ({ onLogin, isLoading, error }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
    role: 'citizen'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const roleOptions = [
    { 
      value: 'citizen', 
      label: 'Citizen',
      description: 'Report coastal hazards and view alerts'
    },
    { 
      value: 'official', 
      label: 'Government Official',
      description: 'Verify reports and manage alerts'
    },
    { 
      value: 'analyst', 
      label: 'Data Analyst',
      description: 'Analyze hazard patterns and trends'
    }
  ];

  const validateForm = () => {
    const errors = {};
    
    if (!formData?.emailOrPhone?.trim()) {
      errors.emailOrPhone = 'Email or phone number is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[6-9]\d{9}$/;
      
      if (!emailRegex?.test(formData?.emailOrPhone) && !phoneRegex?.test(formData?.emailOrPhone)) {
        errors.emailOrPhone = 'Please enter a valid email or 10-digit phone number';
      }
    }
    
    if (!formData?.password?.trim()) {
      errors.password = 'Password is required';
    } else if (formData?.password?.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData?.role) {
      errors.role = 'Please select your role';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors)?.length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors?.[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onLogin(formData);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card rounded-2xl p-8 shadow-modal">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mx-auto mb-4">
            <Icon name="Waves" size={32} color="white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Welcome Back
          </h1>
          <p className="text-muted-foreground">
            Sign in to access OceanSaksham coastal hazard reporting system
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center space-x-2 p-3 mb-6 bg-error/10 border border-error/20 rounded-lg">
            <Icon name="AlertCircle" size={16} className="text-error flex-shrink-0" />
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email/Phone Input */}
          <Input
            label="Email or Phone Number"
            type="text"
            placeholder="Enter email or 10-digit phone number"
            value={formData?.emailOrPhone}
            onChange={(e) => handleInputChange('emailOrPhone', e?.target?.value)}
            error={validationErrors?.emailOrPhone}
            required
            className="mb-4"
          />

          {/* Password Input */}
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={formData?.password}
              onChange={(e) => handleInputChange('password', e?.target?.value)}
              error={validationErrors?.password}
              required
              className="mb-4"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-smooth"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={20} />
            </button>
          </div>

          {/* Role Selection */}
          <Select
            label="Select Your Role"
            description="Choose your role to access appropriate features"
            options={roleOptions}
            value={formData?.role}
            onChange={(value) => handleInputChange('role', value)}
            error={validationErrors?.role}
            required
            className="mb-6"
          />

          {/* Sign In Button */}
          <Button
            type="submit"
            variant="default"
            size="lg"
            loading={isLoading}
            fullWidth
            iconName="LogIn"
            iconPosition="right"
            className="mb-4"
          >
            Sign In
          </Button>

          {/* Forgot Password Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-primary hover:text-primary/80 transition-smooth"
            >
              Forgot your password?
            </button>
          </div>
        </form>

        {/* Demo Credentials */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2 mb-3">
            <Icon name="Info" size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <h3 className="text-sm font-semibold text-blue-800">Demo Credentials for Testing</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-1 gap-2">
              <div className="bg-white rounded p-2 border border-blue-100">
                <div className="font-medium text-blue-700 mb-1">Citizen Account:</div>
                <div className="text-gray-600">Email: citizen@oceansaksham.gov.in</div>
                <div className="text-gray-600">Phone: 9876543210</div>
                <div className="text-gray-600">Password: citizen123</div>
              </div>
              <div className="bg-white rounded p-2 border border-blue-100">
                <div className="font-medium text-blue-700 mb-1">Official Account:</div>
                <div className="text-gray-600">Email: official@oceansaksham.gov.in</div>
                <div className="text-gray-600">Phone: 9876543211</div>
                <div className="text-gray-600">Password: official123</div>
              </div>
              <div className="bg-white rounded p-2 border border-blue-100">
                <div className="font-medium text-blue-700 mb-1">Analyst Account:</div>
                <div className="text-gray-600">Email: analyst@oceansaksham.gov.in</div>
                <div className="text-gray-600">Phone: 9876543212</div>
                <div className="text-gray-600">Password: analyst123</div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-border"></div>
          <span className="px-3 text-sm text-muted-foreground">or</span>
          <div className="flex-1 border-t border-border"></div>
        </div>

        {/* Create Account Link */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Don't have an account?
          </p>
          <Button
            variant="outline"
            size="default"
            onClick={() => navigate('/register')}
            iconName="UserPlus"
            iconPosition="left"
            fullWidth
          >
            Create Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;