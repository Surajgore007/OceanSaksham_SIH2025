import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../Appicon';
import Button from './Button';
import ProfileSettingsModal from './ProfileSettingsModal';
import authService from '../../utils/authService';
import { useTranslation } from '../../context/LanguageContext';

const Header = ({ user = null, onLogout = () => {} }) => {
  const { t, language, changeLanguage, availableLanguages } = useTranslation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
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
      key: 'dashboard',
      label: t('liveMap', 'Live Map'), 
      path: '/main-dashboard', 
      icon: 'Map',
      roles: ['citizen', 'official']
    },
    { 
      key: 'reportHazard',
      label: t('reportHazard', 'Report Hazard'), 
      path: '/report-submission', 
      icon: 'AlertTriangle',
      roles: ['citizen', 'official']
    },
    { 
      key: 'officialConsole',
      label: t('officialConsole', 'Official Console'), 
      path: '/official-console', 
      icon: 'Shield',
      roles: ['official']
    },
    { 
      key: 'alerts',
      label: t('alerts', 'Alerts'), 
      path: '/console-alerts', 
      icon: 'Bell',
      roles: ['official']
    }
  ];

  const getVisibleNavItems = () => {
    if (!currentUser) return [];
    return primaryNavItems?.filter(item => 
      item?.roles?.includes(currentUser?.role?.toLowerCase() || 'citizen')
    );
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      await authService?.logout();
      onLogout();
      setIsProfileModalOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      onLogout();
      setIsProfileModalOpen(false);
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const currentLangObj = availableLanguages.find(l => l.code === language) || availableLanguages[0];

  if (isAuthPage) {
    return null;
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border shadow-card">
        <div className="flex items-center justify-between h-16 px-3 sm:px-4 lg:px-6">
          {/* Logo Section */}
          <div 
            onClick={() => navigate(currentUser?.role === 'official' ? '/official-console' : '/main-dashboard')}
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer select-none"
          >
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-lg shadow-xs flex-shrink-0">
              <Icon name="Waves" size={22} color="white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-bold text-primary leading-tight">
                {t('appName', 'OceanSaksham')}
              </h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight truncate max-w-[140px] sm:max-w-none">
                {t('tagline', 'Coastal Hazard Management')}
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
                    className="text-sm font-semibold text-slate-800 hover:text-slate-950"
                  >
                    {item?.label}
                  </Button>
                );
              })}
            </nav>
          )}

          {/* Right Section - Language, User Identity Pill & Direct Logout */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Quick Language Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 transition-colors"
                title="Change Language"
                aria-label="Change Language"
              >
                <Icon name="Globe" size={13} className="text-primary" />
                <span>{currentLangObj.nativeName}</span>
                <Icon name={isLangMenuOpen ? "ChevronUp" : "ChevronDown"} size={12} className="text-slate-600" />
              </button>

              {/* Language Selection Popover */}
              {isLangMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-44 bg-white border-2 border-slate-200 rounded-xl shadow-2xl z-50 py-1 max-h-60 overflow-y-auto">
                    {availableLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          changeLanguage(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-bold flex items-center justify-between hover:bg-slate-100 transition-colors ${
                          language === lang.code ? 'text-primary bg-primary/10' : 'text-slate-800'
                        }`}
                      >
                        <span>{lang.nativeName}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {isAuthenticated ? (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {/* Clickable User Pill -> Opens Profile & Settings */}
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 hover:border-slate-300 rounded-full transition-all cursor-pointer text-left group"
                  title="Click to view Profile & Settings"
                  aria-label="Open user profile and settings"
                >
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 leading-none group-hover:text-primary transition-colors max-w-[70px] sm:max-w-[100px] truncate">
                      {currentUser?.name || 'User'}
                    </span>
                    <span className="text-[10px] font-semibold text-primary capitalize leading-tight">
                      {currentUser?.role === 'official' ? t('official', 'Official') : t('citizen', 'Citizen')}
                    </span>
                  </div>
                  <Icon name="ChevronDown" size={12} className="text-slate-500 group-hover:text-slate-800 transition-colors hidden sm:inline" />
                </button>

                {/* Direct Logout Button */}
                <Button
                  variant="outline"
                  size="sm"
                  iconName="LogOut"
                  onClick={handleLogout}
                  loading={isLoggingOut}
                  disabled={isLoggingOut}
                  className="rounded-xl border-slate-300 text-slate-700 hover:text-error hover:border-error/50 hover:bg-error/5 text-xs font-semibold px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">{t('logout', 'Logout')}</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="text-slate-800 hover:text-slate-950 font-semibold"
                >
                  {t('login', 'Login')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="font-semibold text-white"
                >
                  {t('register', 'Register')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Dedicated Profile & Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
    </>
  );
};

export default Header;
