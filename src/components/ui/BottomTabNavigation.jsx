import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../Appicon';
import { useTranslation } from '../../context/LanguageContext';

const BottomTabNavigation = ({ user = null, className = '' }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthenticated = !!user;
  const isAuthPage = ['/login', '/register']?.includes(location?.pathname);

  // Navigation tabs based on user role
  const navigationTabs = [
    {
      id: 'dashboard',
      label: t('liveMap', 'Live Map'),
      path: '/main-dashboard',
      icon: 'Map',
      roles: ['citizen', 'official']
    },
    {
      id: 'report',
      label: t('reportHazard', 'Report Hazard'),
      path: '/report-submission',
      icon: 'AlertTriangle',
      roles: ['citizen', 'official'],
      isAction: true
    },
    {
      id: 'console',
      label: t('console', 'Console'),
      path: '/official-console',
      icon: 'Shield',
      roles: ['official']
    },
    {
      id: 'alerts',
      label: t('alerts', 'Alerts'),
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
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-2xl text-slate-900 ${className}`}>
      <div className="flex items-center justify-around h-16 px-3 safe-area-inset-bottom max-w-lg mx-auto">
        {visibleTabs?.map((tab) => {
          const isActive = location?.pathname === tab?.path;
          
          if (tab.isAction) {
            return (
              <button
                key={tab?.id}
                onClick={() => handleTabClick(tab?.path)}
                className={`
                  flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full
                  transition-all duration-200 shadow-md font-bold text-xs
                  ${isActive 
                    ? 'bg-primary text-white ring-2 ring-primary/30' 
                    : 'bg-primary text-white hover:bg-primary/90'
                  }
                `}
                aria-label={`Navigate to ${tab?.label}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon 
                  name={tab?.icon} 
                  size={16} 
                  strokeWidth={2.5}
                />
                <span className="whitespace-nowrap">
                  {tab?.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab?.id}
              onClick={() => handleTabClick(tab?.path)}
              className={`
                flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-1.5 
                transition-all duration-200 rounded-xl relative
                ${isActive 
                  ? 'text-primary font-bold' 
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
                }
              `}
              aria-label={`Navigate to ${tab?.label}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`
                flex items-center justify-center w-7 h-7 rounded-lg transition-colors
                ${isActive ? 'bg-primary/10 text-primary' : 'text-current'}
              `}>
                <Icon 
                  name={tab?.icon} 
                  size={19} 
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span className="text-[11px] leading-tight truncate max-w-full mt-0.5">
                {tab?.label}
              </span>
              {isActive && (
                <div className="w-4 h-0.5 bg-primary rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabNavigation;
