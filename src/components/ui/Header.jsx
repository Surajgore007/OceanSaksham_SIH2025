import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import authService from '../../utils/authService';

const Header = ({ user = null, onLogout = () => {} }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthenticated = !!currentUser;
  const isAuthPage = ['/login', '/register']?.includes(location?.pathname);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService?.onAuthStateChange((updatedUser) => {
      setCurrentUser(updatedUser);
    });

    return unsubscribe;
  }, []);

  // Primary navigation items (visible in main nav)
  const primaryNavItems = [
    { 
      label: 'Dashboard', 
      path: '/main-dashboard', 
      icon: 'BarChart3',
      roles: ['citizen', 'official', 'analyst']
    },
    { 
      label: 'Report Hazard', 
      path: '/report-submission', 
      icon: 'AlertTriangle',
      roles: ['citizen', 'official', 'analyst']
    },
    { 
      label: 'Official Console', 
      path: '/official-console', 
      icon: 'Shield',
      roles: ['official', 'analyst']
    },
    { 
      label: 'Alerts', 
      path: '/console-alerts', 
      icon: 'Bell',
      roles: ['official']
    }
  ];

  // Secondary navigation items (in overflow menu)
  const secondaryNavItems = [
    { label: 'Settings', path: '/settings', icon: 'Settings' },
    { label: 'Help', path: '/help', icon: 'HelpCircle' },
    { label: 'Profile', path: '/profile', icon: 'User' }
  ];

  const getVisibleNavItems = () => {
    if (!currentUser) return [];
    return primaryNavItems?.filter(item => 
      item?.roles?.includes(currentUser?.role?.toLowerCase() || 'citizen')
    );
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setIsMenuOpen(false);
    
    try {
      await authService?.logout();
      onLogout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation even on error
      onLogout();
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isAuthPage) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-100 bg-card border-b border-border shadow-card">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Logo Section */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
            <Icon name="Waves" size={24} color="white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-primary leading-tight">
              OceanSaksham
            </h1>
            <p className="text-xs text-muted-foreground leading-tight">
              Coastal Hazard Management
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center space-x-1">
            {getVisibleNavItems()?.map((item) => {
              const isActive = location?.pathname === item?.path;
              return (
                <Button
                  key={item?.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  iconName={item?.icon}
                  iconPosition="left"
                  iconSize={16}
                  onClick={() => handleNavigation(item?.path)}
                  className="text-sm font-medium"
                >
                  {item?.label}
                </Button>
              );
            })}
          </nav>
        )}

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Location Status Indicator */}
          {currentUser?.hasLocationAccess && (
            <div className="hidden sm:flex items-center space-x-1 px-2 py-1 bg-success/10 rounded-full">
              <Icon name="MapPin" size={12} className="text-success" />
              <span className="text-xs font-medium text-success">GPS</span>
            </div>
          )}

          {/* Offline Status Indicator */}
          <div className="hidden sm:flex items-center space-x-2">
            <div className="flex items-center space-x-1 px-2 py-1 bg-success/10 rounded-full">
              <div className="w-2 h-2 bg-success rounded-full pulse-indicator"></div>
              <span className="text-xs font-medium text-success">Online</span>
            </div>
          </div>

          {isAuthenticated ? (
            <>
              {/* User Info & Menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="Menu"
                  iconPosition="right"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="md:hidden"
                >
                  Menu
                </Button>
                
                {/* Desktop User Menu */}
                <div className="hidden md:flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {currentUser?.name || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {currentUser?.role || 'Citizen'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="LogOut"
                    onClick={handleLogout}
                    loading={isLoggingOut}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'Signing Out...' : 'Logout'}
                  </Button>
                </div>
              </div>

              {/* Mobile Menu Overlay */}
              {isMenuOpen && (
                <div className="fixed inset-0 z-200 md:hidden">
                  <div className="fixed inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} />
                  <div className="fixed top-16 right-0 w-80 max-w-[90vw] h-[calc(100vh-4rem)] bg-card border-l border-border shadow-modal">
                    <div className="flex flex-col h-full">
                      {/* User Info */}
                      <div className="p-4 border-b border-border">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <Icon name="User" size={20} color="white" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {currentUser?.name || 'User'}
                            </p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {currentUser?.role || 'Citizen'}
                            </p>
                            {currentUser?.hasLocationAccess && (
                              <div className="flex items-center space-x-1 mt-1">
                                <Icon name="MapPin" size={12} className="text-success" />
                                <span className="text-xs text-success">Location Enabled</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Navigation Items */}
                      <div className="flex-1 overflow-y-auto">
                        <div className="p-2">
                          <div className="space-y-1">
                            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Navigation
                            </p>
                            {getVisibleNavItems()?.map((item) => {
                              const isActive = location?.pathname === item?.path;
                              return (
                                <Button
                                  key={item?.path}
                                  variant={isActive ? "default" : "ghost"}
                                  size="sm"
                                  iconName={item?.icon}
                                  iconPosition="left"
                                  onClick={() => handleNavigation(item?.path)}
                                  className="w-full justify-start"
                                >
                                  {item?.label}
                                </Button>
                              );
                            })}
                          </div>

                          <div className="mt-6 space-y-1">
                            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              More
                            </p>
                            {secondaryNavItems?.map((item) => (
                              <Button
                                key={item?.path}
                                variant="ghost"
                                size="sm"
                                iconName={item?.icon}
                                iconPosition="left"
                                onClick={() => handleNavigation(item?.path)}
                                className="w-full justify-start"
                              >
                                {item?.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Logout Button */}
                      <div className="p-4 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          iconName="LogOut"
                          iconPosition="left"
                          onClick={handleLogout}
                          loading={isLoggingOut}
                          disabled={isLoggingOut}
                          className="w-full justify-start"
                        >
                          {isLoggingOut ? 'Signing Out...' : 'Logout'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/register')}
              >
                Register
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;