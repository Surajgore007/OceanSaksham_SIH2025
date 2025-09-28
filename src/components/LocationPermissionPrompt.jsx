import React, { useState, useEffect } from 'react';
import Icon from './Appicon';
import Button from './ui/Button';
import locationService from '../utils/locationService';

const LocationPermissionPrompt = ({ onPermissionResult }) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  // Check if we should show the prompt
  useEffect(() => {
    const checkPermissionStatus = async () => {
      // Check localStorage for previous user decision
      const userDecision = localStorage.getItem('locationPermissionDecision');
      const sessionChecked = sessionStorage.getItem('locationPermissionChecked');
      
      // If user already made a decision, don't show prompt
      if (userDecision === 'granted' || userDecision === 'permanently_denied' || sessionChecked === 'true') {
        setShouldShow(false);
        
        // Still call the callback with the stored decision
        if (userDecision === 'granted') {
          try {
            const position = await locationService.getCurrentPosition();
            onPermissionResult({ granted: true, location: position });
          } catch (error) {
            // Permission might have been revoked, show prompt
            setShouldShow(true);
          }
        } else {
          onPermissionResult({ 
            granted: false, 
            skipLocation: userDecision === 'permanently_denied'
          });
        }
        return;
      }

      // Check browser permission status
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          
          switch (permission.state) {
            case 'granted':
              // Permission already granted, get location and don't show prompt
              try {
                const position = await locationService.getCurrentPosition();
                localStorage.setItem('locationPermissionDecision', 'granted');
                setShouldShow(false);
                onPermissionResult({ granted: true, location: position });
              } catch (error) {
                setShouldShow(true);
              }
              break;
            case 'denied':
              // Check if this is a session-based denial or permanent
              const previouslyAsked = localStorage.getItem('locationPermissionAsked');
              if (previouslyAsked === 'true') {
                // User has been asked before and denied, don't show again this session
                sessionStorage.setItem('locationPermissionChecked', 'true');
                setShouldShow(false);
                onPermissionResult({ granted: false, skipLocation: true });
              } else {
                setShouldShow(true);
              }
              break;
            case 'prompt':
            default:
              // Show prompt for first-time users
              setShouldShow(true);
              break;
          }
        } catch (error) {
          // Fallback: check if we've asked before
          const previouslyAsked = localStorage.getItem('locationPermissionAsked');
          if (!previouslyAsked) {
            setShouldShow(true);
          } else {
            setShouldShow(false);
            onPermissionResult({ granted: false, skipLocation: true });
          }
        }
      } else {
        // Browser doesn't support permissions API, show prompt if not asked before
        const previouslyAsked = localStorage.getItem('locationPermissionAsked');
        setShouldShow(!previouslyAsked);
      }
    };

    checkPermissionStatus();
  }, [onPermissionResult]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    setPermissionDenied(false);

    // Mark that we've asked for permission
    localStorage.setItem('locationPermissionAsked', 'true');

    try {
      const granted = await locationService.requestLocationPermission();
      
      if (granted) {
        // Store successful grant
        localStorage.setItem('locationPermissionDecision', 'granted');
        sessionStorage.setItem('locationPermissionChecked', 'true');
        
        const position = locationService.getCachedPosition() || await locationService.getCurrentPosition();
        onPermissionResult({ granted: true, location: position });
      } else {
        setPermissionDenied(true);
        // Don't store denial immediately - let user decide if it's permanent
      }
    } catch (error) {
      setPermissionDenied(true);
      console.error('Location permission error:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleContinueWithoutLocation = () => {
    // Mark as session-only denial (will ask again in new session)
    sessionStorage.setItem('locationPermissionChecked', 'true');
    onPermissionResult({ granted: false, skipLocation: true });
  };

  const handlePermanentlyDecline = () => {
    // Mark as permanent denial (won't ask again)
    localStorage.setItem('locationPermissionDecision', 'permanently_denied');
    sessionStorage.setItem('locationPermissionChecked', 'true');
    onPermissionResult({ granted: false, skipLocation: true });
  };

  const handleRetryPermission = () => {
    // Clear denial state and try again
    setPermissionDenied(false);
    handleRequestPermission();
  };

  const instructions = locationService.showPermissionInstructions();

  // Don't render if we shouldn't show the prompt
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-modal">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="MapPin" size={24} className="text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {instructions.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {instructions.message}
          </p>
        </div>

        {/* Main Action */}
        {!permissionDenied ? (
          <div className="space-y-4">
            <Button
              onClick={handleRequestPermission}
              loading={isRequesting}
              className="w-full"
              iconName="Navigation"
              iconPosition="left"
            >
              {isRequesting ? 'Requesting Location Access...' : 'Enable Location Access'}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full"
              iconName="Info"
              iconPosition="left"
            >
              How to Enable Location
            </Button>

            <div className="flex space-x-2">
              <Button
                variant="ghost"
                onClick={handleContinueWithoutLocation}
                className="flex-1 text-muted-foreground"
                size="sm"
              >
                Not Now
              </Button>
              <Button
                variant="ghost"
                onClick={handlePermanentlyDecline}
                className="flex-1 text-muted-foreground"
                size="sm"
              >
                Don't Ask Again
              </Button>
            </div>
          </div>
        ) : (
          /* Permission Denied State */
          <div className="space-y-4">
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <Icon name="AlertCircle" size={20} className="text-error mt-0.5" />
                <div>
                  <h4 className="font-medium text-error mb-1">Location Access Denied</h4>
                  <p className="text-sm text-muted-foreground">
                    Location access is required for accurate hazard reporting and real-time features.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleRetryPermission}
              className="w-full"
              iconName="RefreshCw"
              iconPosition="left"
            >
              Try Again
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowInstructions(true)}
              className="w-full"
              iconName="Settings"
              iconPosition="left"
            >
              Manual Setup Instructions
            </Button>

            <div className="flex space-x-2">
              <Button
                variant="ghost"
                onClick={handleContinueWithoutLocation}
                className="flex-1 text-muted-foreground"
                size="sm"
              >
                Not Now
              </Button>
              <Button
                variant="ghost"
                onClick={handlePermanentlyDecline}
                className="flex-1 text-muted-foreground"
                size="sm"
              >
                Don't Ask Again
              </Button>
            </div>
          </div>
        )}

        {/* Instructions Panel */}
        {showInstructions && (
          <div className="mt-6 p-4 bg-muted/50 border border-border rounded-lg">
            <h4 className="font-medium text-foreground mb-3">Manual Setup Steps:</h4>
            <ol className="text-sm text-muted-foreground space-y-2">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center mt-0.5">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 p-2 bg-primary/10 rounded border border-primary/20">
              <p className="text-xs text-primary font-medium">
                Tip: Look for a location icon in your browser's address bar and click 'Allow'
              </p>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="mt-6 p-4 bg-success/5 border border-success/20 rounded-lg">
          <h4 className="font-medium text-success mb-2">With Location Access You Get:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Accurate hazard reporting at your exact location</li>
            <li>• Real-time proximity alerts for nearby hazards</li>
            <li>• Automatic location tagging for reports</li>
            <li>• Personalized emergency information</li>
          </ul>
        </div>

        {/* Privacy Notice */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <Icon name="Shield" size={12} className="inline mr-1" />
            Your location data is only used for hazard reporting and is not shared with third parties.
            You can revoke permission at any time in your browser settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionPrompt;