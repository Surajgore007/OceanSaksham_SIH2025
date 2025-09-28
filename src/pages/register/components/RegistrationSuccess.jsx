import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RegistrationSuccess = ({ userEmail, userRole }) => {
  const navigate = useNavigate();

  const getRoleIcon = () => {
    switch (userRole) {
      case 'official': return 'Shield';
      case 'analyst': return 'BarChart3';
      default: return 'Users';
    }
  };

  const getRoleColor = () => {
    switch (userRole) {
      case 'official': return 'text-secondary';
      case 'analyst': return 'text-accent';
      default: return 'text-primary';
    }
  };

  return (
    <div className="text-center space-y-6">
      {/* Success Animation */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="flex items-center justify-center w-20 h-20 bg-success rounded-full shadow-card">
            <Icon name="CheckCircle" size={40} color="white" />
          </div>
          <div className="absolute -top-2 -right-2 flex items-center justify-center w-8 h-8 bg-primary rounded-full">
            <Icon name={getRoleIcon()} size={16} color="white" />
          </div>
        </div>
      </div>
      {/* Success Message */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-success">
          Registration Successful!
        </h2>
        <p className="text-base text-muted-foreground max-w-md mx-auto">
          Your account has been created successfully. Please check your email for verification.
        </p>
      </div>
      {/* Account Details */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Email:</span>
          <span className="text-sm font-medium text-foreground">{userEmail}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Role:</span>
          <div className="flex items-center space-x-2">
            <Icon name={getRoleIcon()} size={16} className={getRoleColor()} />
            <span className={`text-sm font-medium capitalize ${getRoleColor()}`}>
              {userRole}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status:</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-warning rounded-full pulse-indicator" />
            <span className="text-sm font-medium text-warning">
              Pending Verification
            </span>
          </div>
        </div>
      </div>
      {/* Next Steps */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center justify-center space-x-2">
          <Icon name="ListChecks" size={18} />
          <span>Next Steps</span>
        </h3>
        
        <div className="space-y-2 text-left">
          <div className="flex items-start space-x-3">
            <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold mt-0.5">
              1
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Check your email</p>
              <p className="text-xs text-muted-foreground">
                We've sent a verification link to {userEmail}
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex items-center justify-center w-6 h-6 bg-secondary text-secondary-foreground rounded-full text-xs font-bold mt-0.5">
              2
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Verify your account</p>
              <p className="text-xs text-muted-foreground">
                Click the verification link to activate your account
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex items-center justify-center w-6 h-6 bg-accent text-accent-foreground rounded-full text-xs font-bold mt-0.5">
              3
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Start reporting</p>
              <p className="text-xs text-muted-foreground">
                Begin using OceanSaksham to report coastal hazards
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="space-y-3 pt-4">
        <Button
          variant="default"
          onClick={() => navigate('/login')}
          iconName="LogIn"
          iconPosition="left"
          fullWidth
        >
          Continue to Login
        </Button>
        
        <Button
          variant="outline"
          onClick={() => window.location?.reload()}
          iconName="RotateCcw"
          iconPosition="left"
          fullWidth
        >
          Register Another Account
        </Button>
      </div>
      {/* Support Information */}
      <div className="pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">
          Need help? Contact our support team
        </p>
        <div className="flex justify-center space-x-4">
          <Button variant="ghost" size="sm" iconName="Mail">
            support@oceansaksham.gov.in
          </Button>
          <Button variant="ghost" size="sm" iconName="Phone">
            1800-XXX-XXXX
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;