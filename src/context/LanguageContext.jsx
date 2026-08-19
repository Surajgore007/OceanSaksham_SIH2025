import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, availableLanguages } from '../utils/translations';

const LanguageContext = createContext({
  language: 'en',
  changeLanguage: () => {},
  t: (key, fallback) => fallback || key,
  availableLanguages: availableLanguages
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('oceansaksham_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  const changeLanguage = (langCode) => {
    if (translations[langCode]) {
      setLanguage(langCode);
      try {
        localStorage.setItem('oceansaksham_lang', langCode);
      } catch (err) {
        console.warn('Could not save language to localStorage:', err);
      }
    }
  };

  const t = (key, fallback = '') => {
    if (!key) return '';
    
    // Check current language
    const currentDict = translations[language] || translations.en;
    if (currentDict && currentDict[key] !== undefined) {
      return currentDict[key];
    }
    
    // Fallback to English
    if (translations.en && translations.en[key] !== undefined) {
      return translations.en[key];
    }

    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      changeLanguage: () => {},
      t: (key, fallback) => fallback || key,
      availableLanguages: availableLanguages
    };
  }
  return context;
};

export default LanguageContext;
