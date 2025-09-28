import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegistrationHeader from './components/RegistrationHeader';
import RegistrationForm from './components/RegistrationForm';
import RegistrationSuccess from './components/RegistrationSuccess';

const Register = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);

  // Mock credentials for different roles
  const mockCredentials = {
    citizen: { email: 'citizen@example.com', password: 'Citizen123!' },
    official: { email: 'official@incois.gov.in', password: 'Official123!' },
    analyst: { email: 'analyst@imd.gov.in', password: 'Analyst123!' }
  };

  const handleRegistration = async (formData) => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock registration logic
      const newUser = {
        id: Date.now(),
        name: formData?.name,
        email: formData?.email,
        phone: formData?.phone,
        role: formData?.role,
        department: formData?.department,
        language: formData?.language,
        isVerified: false,
        createdAt: new Date()?.toISOString(),
        location: formData?.enableLocation ? 'Chennai, Tamil Nadu' : null
      };
      
      // Store user data in localStorage (mock database)
      const existingUsers = JSON.parse(localStorage.getItem('oceansaksham_users') || '[]');
      
      // Check if user already exists
      const userExists = existingUsers?.some(user => 
        user?.email === formData?.email || user?.phone === formData?.phone
      );
      
      if (userExists) {
        throw new Error('User with this email or phone already exists');
      }
      
      // Add new user
      existingUsers?.push(newUser);
      localStorage.setItem('oceansaksham_users', JSON.stringify(existingUsers));
      
      // Store mock credentials for login
      localStorage.setItem(`oceansaksham_credentials_${formData?.role}`, JSON.stringify({
        email: formData?.email,
        password: formData?.password,
        role: formData?.role
      }));
      
      setRegisteredUser(newUser);
      setRegistrationComplete(true);
      
    } catch (error) {
      console.error('Registration error:', error);
      alert(error?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Main Registration Card */}
          <div className="glass-card rounded-2xl p-6 lg:p-8 shadow-modal">
            {!registrationComplete ? (
              <>
                <RegistrationHeader />
                <div className="mt-8">
                  <RegistrationForm 
                    onSubmit={handleRegistration}
                    isLoading={isLoading}
                  />
                </div>
              </>
            ) : (
              <RegistrationSuccess 
                userEmail={registeredUser?.email}
                userRole={registeredUser?.role}
              />
            )}
          </div>

          {/* Additional Information */}
          {!registrationComplete && (
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                By registering, you agree to help protect coastal communities through accurate hazard reporting
              </p>
              
              {/* Mock Credentials Info */}
              <div className="mt-4 p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50">
                <p className="text-xs font-medium text-foreground mb-2">Demo Credentials Available:</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><strong>Citizen:</strong> citizen@example.com / Citizen123!</p>
                  <p><strong>Official:</strong> official@incois.gov.in / Official123!</p>
                  <p><strong>Analyst:</strong> analyst@imd.gov.in / Analyst123!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Contact Footer */}
      <div className="fixed bottom-4 left-4 right-4 z-20">
        <div className="bg-error/90 backdrop-blur-sm text-error-foreground rounded-lg p-3 text-center">
          <p className="text-xs font-medium">
            🚨 Emergency? Call 108 (Disaster Helpline) or 1078 (Pollution Control)
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;