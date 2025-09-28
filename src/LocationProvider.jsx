import React, { useState, useEffect, createContext, useContext } from 'react';
import LocationPermissionPrompt from './components/LocationPermissionPrompt';
import locationService from './utils/locationService';

// Create Location Context
const LocationContext = createContext({
  hasPermission: false,
  userLocation: null,
  requestPermission: () => {},
  permissionState: 'pending' // 'pending', 'granted', 'denied', 'skipped'
});

// Hook to use location context
export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

const LocationProvider = ({ children }) => {
  const [permissionState, setPermissionState] = useState('pending');
  const [userLocation, setUserLocation] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check existing permission on mount
  useEffect(() => {
    const checkExistingPermission = async () => {
      if (locationService.hasLocationPermission()) {
        setPermissionState('granted');
        const location = locationService.getCachedPosition();
        if (location) {
          setUserLocation(location);
        }
      } else {
        // Show permission prompt after a brief delay
        setTimeout(() => {
          setShowPrompt(true);
        }, 1000);
      }
    };

    checkExistingPermission();
  }, []);

  const handleLocationPermissionResult = (result) => {
    setShowPrompt(false);
    
    if (result.granted) {
      setPermissionState('granted');
      setUserLocation(result.location);
      console.log('Location permission granted:', result.location);
    } else if (result.skipLocation) {
      setPermissionState('skipped');
      console.log('User chose to skip location access');
    } else {
      setPermissionState('denied');
      console.log('Location permission denied');
    }
  };

  const requestPermission = async () => {
    setShowPrompt(true);
  };

  const contextValue = {
    hasPermission: permissionState === 'granted',
    userLocation,
    requestPermission,
    permissionState
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {/* Show permission prompt when needed */}
      {showPrompt && (
        <LocationPermissionPrompt 
          onPermissionResult={handleLocationPermissionResult} 
        />
      )}
      
      {/* Render children regardless of permission state */}
      {children}
    </LocationContext.Provider>
  );
};

export default LocationProvider;