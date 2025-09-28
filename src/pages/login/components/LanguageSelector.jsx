import React, { useState, useEffect } from 'react';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const LanguageSelector = ({ className = '' }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const languageOptions = [
    { value: 'en', label: 'English', description: 'English' },
    { value: 'hi', label: 'हिंदी', description: 'Hindi' },
    { value: 'ta', label: 'தமிழ்', description: 'Tamil' },
    { value: 'ml', label: 'മലയാളം', description: 'Malayalam' }
  ];

  useEffect(() => {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('oceanSaksham_language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const handleLanguageChange = (languageCode) => {
    setCurrentLanguage(languageCode);
    localStorage.setItem('oceanSaksham_language', languageCode);
    
    // Trigger language change event for other components
    window.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { language: languageCode } 
    }));
  };

  const getCurrentLanguageLabel = () => {
    const current = languageOptions?.find(lang => lang?.value === currentLanguage);
    return current?.label || 'English';
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-2 p-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg shadow-card">
        <Icon name="Globe" size={16} className="text-muted-foreground" />
        <Select
          options={languageOptions}
          value={currentLanguage}
          onChange={handleLanguageChange}
          placeholder="Language"
          className="min-w-[120px]"
        />
      </div>
    </div>
  );
};

export default LanguageSelector;