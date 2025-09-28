
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../Appicon';
import Button from './Button';

const BottomTabNavigation = ({ user = null, className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthenticated = !!user;
  const isAuthPage = ['/login', '/register']?.includes(location?.pathname);

  // Navigation tabs based on user role
  const navigationTabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/main-dashboard',
      icon: 'BarChart3',
      roles: ['citizen', 'official', 'analyst']
    },
    {
      id: 'report',
      label: 'Report',
      path: '/report-submission',
      icon: 'AlertTriangle',
      roles: ['citizen', 'official', 'analyst']
    },
    {
      id: 'console',
      label: 'Console',
      path: '/official-console',
      icon: 'Shield',
      roles: ['official', 'analyst']
    },
    {
      id: 'alerts',
      label: 'Alerts',
      path: '/console-alerts',
      icon: 'Bell',
      roles: ['official']
    }
  ];

  const getVisibleTabs = () => {
    if (!user) return [];
    const userRole = user?.role?.toLowerCase() || 'citizen';
    return navigationTabs?.filter(tab => tab?.roles?.includes(userRole));
  };

  const handleTabClick = (path) => {
    navigate(path);
  };

  // Don't render on auth pages or when not authenticated
  if (!isAuthenticated || isAuthPage) {
    return null;
  }

  const visibleTabs = getVisibleTabs();

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-100 bg-card border-t border-border shadow-modal ${className}`}>
      <div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
        {visibleTabs?.map((tab) => {
          const isActive = location?.pathname === tab?.path;
          
          return (
            <button
              key={tab?.id}
              onClick={() => handleTabClick(tab?.path)}
              className={`
                flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-2 
                transition-smooth haptic-feedback rounded-lg
                ${isActive 
                  ? 'text-primary bg-primary/10' :'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
              aria-label={`Navigate to ${tab?.label}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`
                flex items-center justify-center w-6 h-6 mb-1
                ${isActive ? 'text-primary' : 'text-current'}
              `}>
                <Icon 
                  name={tab?.icon} 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className={`
                text-xs font-medium leading-tight truncate max-w-full
                ${isActive ? 'text-primary' : 'text-current'}
              `}>
                {tab?.label}
              </span>
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      {/* Emergency FAB for quick reporting */}
      <div className="absolute -top-6 right-4">
        <Button
          variant="default"
          size="icon"
          iconName="Plus"
          onClick={() => navigate('/report-submission')}
          className="w-12 h-12 rounded-full bg-accent hover:bg-accent/90 emergency-fab shadow-modal"
          aria-label="Quick Report"
        />
      </div>
    </nav>
  );
};

export default BottomTabNavigation;