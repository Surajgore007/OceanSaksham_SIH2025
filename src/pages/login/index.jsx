import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import LanguageSelector from './components/LanguageSelector';
import TrustSignals from './components/Trustsignals';
import OceanBackground from './components/OceanBackground';
import OfflineStatusIndicator from '../../components/ui/OfflineStatusIndicator';
import authService from '../../utils/authService';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = authService?.getCurrentUser();
    if (currentUser) {
      const roleBasedRedirect = {
        'citizen': '/main-dashboard',
        'official': '/official-console',
        'analyst': '/main-dashboard'
      };
      navigate(roleBasedRedirect?.[currentUser?.role] || '/main-dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (formData) => {
    setIsLoading(true);
    setError('');
    setLocationStatus(null);

    try {
      const result = await authService?.login(formData);
      
      if (result?.success) {
        // Show location status
        if (result?.hasLocation) {
          setLocationStatus('Location access granted - You can now submit geotagged reports');
        } else {
          setLocationStatus('Location access denied - Some features may be limited');
        }

        // Redirect after showing status
        setTimeout(() => {
          const roleBasedRedirect = {
            'citizen': '/main-dashboard',
            'official': '/official-console',
            'analyst': '/main-dashboard'
          };
          navigate(roleBasedRedirect?.[result?.user?.role] || '/main-dashboard', { replace: true });
        }, 2000);
      }
    } catch (err) {
      setError(err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OceanBackground>
      <div className="min-h-screen flex flex-col">
        {/* Header with Language Selector and Status */}
        <div className="flex items-center justify-between p-4 lg:p-6">
          <OfflineStatusIndicator size="sm" />
          <LanguageSelector />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Side - Branding & Info */}
              <div className="hidden lg:block space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-20 h-20 bg-primary rounded-2xl">
                      <svg
                        className="w-12 h-12 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                        <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                        <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-primary">
                        OceanSaksham
                      </h1>
                      <p className="text-lg text-muted-foreground">
                        Coastal Hazard Management System
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold text-foreground">
                      Protecting India's Coastal Communities
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Real-time coastal hazard reporting and disaster management platform designed for Indian coastal communities. Report hazards, receive alerts, and stay informed about coastal safety.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-muted-foreground">Real-time Alerts</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-muted-foreground">Offline Support</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-muted-foreground">Multi-language</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-muted-foreground">Government Certified</span>
                    </div>
                  </div>
                </div>

                {/* Trust Signals */}
                <TrustSignals />
              </div>

              {/* Right Side - Login Form */}
              <div className="w-full">
                <LoginForm
                  onLogin={handleLogin}
                  isLoading={isLoading}
                  error={error}
                />
                
                {/* Location Status Display */}
                {locationStatus && (
                  <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm text-primary">{locationStatus}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date()?.getFullYear()} OceanSaksham - Indian National Centre for Ocean Information Services (INCOIS)
          </p>
        </div>
      </div>
    </OceanBackground>
  );
};

export default LoginPage;
