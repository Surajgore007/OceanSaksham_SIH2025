import React, { useState, useEffect } from 'react';
import Icon from '../../../components/Appicon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import locationService from '../../../utils/locationService'; // Import the centralized service
import localDb from '../../../utils/localDb';
import { useTranslation } from '../../../context/LanguageContext';

const LocationPicker = ({ 
  selectedLocation, 
  onLocationSelect, 
  className = '',
  reportData = null // Pass hazard report data to create hotspot
}) => {
  const { t } = useTranslation();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [accuracyStatus, setAccuracyStatus] = useState(null);
  const [manualCoords, setManualCoords] = useState({
    latitude: selectedLocation?.latitude || '',
    longitude: selectedLocation?.longitude || ''
  });
  const [locationMethod, setLocationMethod] = useState('current'); // 'current' or 'manual'

  useEffect(() => {
    if (selectedLocation) {
      setManualCoords({
        latitude: selectedLocation?.latitude?.toString(),
        longitude: selectedLocation?.longitude?.toString()
      });
    }
  }, [selectedLocation]);

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError('');
    setAccuracyStatus(null);

    try {
      // Check device capabilities first
      const capabilities = locationService.getDeviceCapabilities();
      if (!capabilities.isSecureContext) {
        console.warn('Non-HTTPS detected, GPS accuracy may be limited');
        // Don't throw error, just warn - continue with location attempt
      }

      // Try high-accuracy GPS first
      try {
        const location = await locationService.getCurrentPosition();
        
        if (location) {
          const locationData = {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            address: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
            timestamp: location.timestamp,
            coordinates: {
              lat: location.latitude,
              lng: location.longitude,
              latitude: location.latitude,
              longitude: location.longitude
            },
            isFallback: false,
            isHighAccuracy: location.isHighAccuracy,
            source: location.source
          };

          setCurrentLocation(locationData);
          onLocationSelect(locationData);
          
          // Auto-create hotspot for citizen reports
          createHotspotFromLocation(locationData);
          
          // Get and display accuracy status
          const accuracy = locationService.getAccuracyStatus();
          setAccuracyStatus(accuracy);
          
          // Clear any previous errors
          setLocationError('');
          
          // Log success with accuracy info
          console.log(`GPS success: ${location.accuracy}m accuracy via ${location.source || 'GPS'}`);
          
          return; // Successfully got location
        }
      } catch (gpsError) {
        console.warn('High-accuracy GPS failed, trying fallback:', gpsError.message);
        
        // Try fallback location service
        const fallbackLocation = await locationService.getCurrentPositionWithFallback();
        
        if (fallbackLocation) {
          const locationData = {
            latitude: fallbackLocation.latitude,
            longitude: fallbackLocation.longitude,
            accuracy: fallbackLocation.accuracy,
            address: fallbackLocation.fallbackLocationName || `${fallbackLocation.latitude.toFixed(4)}, ${fallbackLocation.longitude.toFixed(4)}`,
            timestamp: fallbackLocation.timestamp,
            coordinates: {
              lat: fallbackLocation.latitude,
              lng: fallbackLocation.longitude,
              latitude: fallbackLocation.latitude,
              longitude: fallbackLocation.longitude
            },
            isFallback: fallbackLocation.isFallback,
            fallbackReason: fallbackLocation.fallbackReason,
            fallbackLocationName: fallbackLocation.fallbackLocationName,
            source: fallbackLocation.source || 'Fallback'
          };

          setCurrentLocation(locationData);
          onLocationSelect(locationData);
          
          // Auto-create hotspot for citizen reports
          createHotspotFromLocation(locationData);
          
          // Set fallback accuracy status
          setAccuracyStatus({ 
            status: fallbackLocation.isFallback ? 'fallback' : 'fair', 
            message: fallbackLocation.isFallback ? 'Using demo location for testing' : 'Location acquired'
          });
          
          // Clear errors since we got a location
          setLocationError('');
          
          console.log(`Fallback location used: ${fallbackLocation.fallbackLocationName || 'Default location'}`);
          return;
        }
      }
      
      // If all else fails, throw error
      throw new Error('Unable to get any location - GPS and fallback both failed');
      
    } catch (error) {
      console.error('All location methods failed:', error);
      setLocationError('Location unavailable. Please use manual entry or try again later.');
      setAccuracyStatus({ status: 'error', message: 'Location services failed' });
      
      // Provide specific guidance based on error type
      if (error.message.includes('permission')) {
        setLocationError('Location permission required. Please allow location access and ensure GPS is enabled on your device.');
      } else if (error.message.includes('timeout')) {
        setLocationError('GPS timeout. Please move to an outdoor location and try again.');
      } else {
        setLocationError('Location services unavailable. Please use manual coordinate entry below.');
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleManualLocationSubmit = () => {
    const lat = parseFloat(manualCoords?.latitude);
    const lng = parseFloat(manualCoords?.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setLocationError('Please enter valid latitude and longitude values');
      return;
    }

    if (lat < -90 || lat > 90) {
      setLocationError('Latitude must be between -90 and 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      setLocationError('Longitude must be between -180 and 180');
      return;
    }

    const locationData = {
      latitude: lat,
      longitude: lng,
      accuracy: null,
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      timestamp: new Date().toISOString(),
      isManual: true,
      coordinates: {
        lat: lat,
        lng: lng,
        latitude: lat,
        longitude: lng
      }
    };

    onLocationSelect(locationData);
    createHotspotFromLocation(locationData);
    setLocationError('');
    setAccuracyStatus({ status: 'manual', message: 'Manually entered coordinates' });
  };

  const createHotspotFromLocation = (locationData) => {
    if (!reportData) return;

    // Create hotspot based on citizen report
    const hotspot = {
      id: `citizen_hotspot_${Date.now()}`,
      name: `${reportData.hazardType?.replace('_', ' ')} - ${locationData.address}`,
      description: reportData.description || `Citizen-reported ${reportData.hazardType} hazard`,
      hazardType: reportData.hazardType,
      severity: reportData.severity || 'medium',
      coordinates: {
        lat: locationData.latitude,
        lng: locationData.longitude
      },
      lat: locationData.latitude,
      lng: locationData.longitude,
      location: locationData.address,
      timestamp: new Date(locationData.timestamp),
      reportedBy: 'Citizen Report',
      status: 'pending', // Will be changed to 'verified' after validation
      source: 'citizen',
      radius: 1000, // Default 1km radius
      alertEnabled: true,
      createdAt: locationData.timestamp,
      submittedAt: locationData.timestamp
    };

    // Store in canonical collections
    localDb.insert('userReports', {
      ...reportData,
      id: hotspot.id,
      location: {
        coordinates: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          lat: locationData.latitude,
          lng: locationData.longitude
        },
        address: locationData.address,
        name: locationData.address,
        lat: locationData.latitude,
        lng: locationData.longitude,
        latitude: locationData.latitude,
        longitude: locationData.longitude
      },
      submittedAt: locationData.timestamp,
      status: 'pending_verification',
      verificationStatus: 'pending'
    });

    localDb.insert('hazardReports', hotspot);

    console.log('Created hotspot from citizen report:', hotspot);
  };

  const handleCoordinateChange = (field, value) => {
    setManualCoords(prev => ({
      ...prev,
      [field]: value
    }));
    setLocationError('');
  };

  const getAccuracyColor = (status) => {
    const colors = {
      excellent: '#22c55e',    // Green
      very_good: '#65a30d',    // Dark green
      good: '#84cc16',         // Light green
      fair: '#eab308',         // Yellow
      poor: '#f97316',         // Orange
      very_poor: '#ef4444',    // Red
      manual: '#6366f1',       // Blue
      fallback: '#06b6d4',     // Cyan
      error: '#dc2626',        // Dark red
      unknown: '#6b7280'       // Gray
    };
    return colors[status] || colors.unknown;
  };

  const getAccuracyIcon = (status) => {
    const icons = {
      excellent: 'CheckCircle',
      very_good: 'CheckCircle',
      good: 'CheckCircle',
      fair: 'AlertCircle',
      poor: 'AlertTriangle',
      very_poor: 'XCircle',
      manual: 'Edit3',
      fallback: 'MapPin',
      error: 'XCircle',
      unknown: 'HelpCircle'
    };
    return icons[status] || icons.unknown;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Select Location
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose the location where the hazard is occurring
        </p>
        {reportData && (
          <div className="mt-2 p-2 bg-accent/10 rounded-lg">
            <p className="text-xs text-accent font-medium">
              This location will be marked as a hazard hotspot: {reportData.hazardType?.replace('_', ' ')}
            </p>
          </div>
        )}
      </div>
      
      {/* Location Method Selector */}
      <div className="flex space-x-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setLocationMethod('current')}
          className={`
            flex-1 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all
            ${locationMethod === 'current' 
              ? 'bg-primary text-white shadow-xs' 
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
            }
          `}
        >
          {t('currentLocation', 'Current Location')}
        </button>
        <button
          type="button"
          onClick={() => setLocationMethod('manual')}
          className={`
            flex-1 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all
            ${locationMethod === 'manual' 
              ? 'bg-primary text-white shadow-xs' 
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
            }
          `}
        >
          {t('manualEntry', 'Manual Entry')}
        </button>
      </div>
      
      {locationMethod === 'current' && (
        <div className="space-y-4">
          {/* Current Location Section */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs text-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">{t('useCurrentLocation', 'Use Current Location')}</h3>
              <Icon name="MapPin" size={20} className="text-primary" />
            </div>

            {!currentLocation && !isLoadingLocation && (
              <div className="text-center py-6">
                <Icon name="Navigation" size={44} className="text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium mb-4 text-sm">
                  {t('getAutoLocation', 'Get your current location automatically')}
                </p>
                <Button
                  onClick={getCurrentLocation}
                  iconName="Navigation"
                  iconPosition="left"
                  className="mx-auto font-bold bg-primary text-white hover:bg-primary/90"
                >
                  {t('useMyLocationBtn', 'Use My Location')}
                </Button>
                <p className="text-xs font-semibold text-slate-500 mt-2.5">
                  {t('outdoorSkyTip', "For best accuracy, ensure you're outdoors with clear sky view")}
                </p>
              </div>
            )}

            {isLoadingLocation && (
              <div className="text-center py-6">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-800 font-bold mb-1 text-sm">{t('gettingLocation', 'Getting your location...')}</p>
                <p className="text-xs text-slate-500 font-medium">
                  {t('gettingLocationWait', 'This may take up to 45 seconds for best accuracy')}
                </p>
              </div>
            )}

            {currentLocation && (
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3.5 bg-green-50 border-2 border-green-200 rounded-xl">
                  <Icon name="CheckCircle" size={20} className="text-green-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-green-900 mb-1 text-sm">
                      {currentLocation.isFallback ? t('fallbackLocationUsed', 'Fallback Location Used') : t('locationFound', 'GPS Location Found')}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 truncate">
                      {currentLocation?.address}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-white p-2.5 rounded-lg border border-green-200">
                      <div>
                        <span className="text-slate-500 font-semibold">{t('latitude', 'Latitude')}:</span>
                        <span className="ml-1.5 font-bold text-slate-900">{currentLocation?.latitude?.toFixed(6)}°</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">{t('longitude', 'Longitude')}:</span>
                        <span className="ml-1.5 font-bold text-slate-900">{currentLocation?.longitude?.toFixed(6)}°</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  iconName="RefreshCw"
                  iconPosition="left"
                  loading={isLoadingLocation}
                  className="w-full font-bold border-slate-300 text-slate-800 hover:bg-slate-100"
                >
                  {t('refresh', 'Refresh Location')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {locationMethod === 'manual' && (
        <div className="space-y-4">
          {/* Manual Coordinates Entry */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs text-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">{t('enterCoordinates', 'Enter GPS Coordinates')}</h3>
              <Icon name="Edit3" size={20} className="text-primary" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Input
                label={t('latitude', 'Latitude')}
                type="number"
                placeholder={t('latPlaceholder', 'e.g., 18.9220')}
                value={manualCoords?.latitude}
                onChange={(e) => handleCoordinateChange('latitude', e?.target?.value)}
                step="any"
                min="-90"
                max="90"
                required
              />
              <Input
                label={t('longitude', 'Longitude')}
                type="number"
                placeholder={t('lngPlaceholder', 'e.g., 72.8347')}
                value={manualCoords?.longitude}
                onChange={(e) => handleCoordinateChange('longitude', e?.target?.value)}
                step="any"
                min="-180"
                max="180"
                required
              />
            </div>

            <Button
              onClick={handleManualLocationSubmit}
              iconName="MapPin"
              iconPosition="left"
              className="w-full font-bold bg-primary text-white hover:bg-primary/90"
              disabled={!manualCoords?.latitude || !manualCoords?.longitude}
            >
              {t('useMyLocationBtn', 'Set Location')}
            </Button>
          </div>

          {/* Map Preview for Manual Entry */}
          {selectedLocation && selectedLocation?.isManual && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="h-64">
                <iframe
                  width="100%"
                  height="100%"
                  loading="lazy"
                  title="Manual Location"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${selectedLocation?.latitude},${selectedLocation?.longitude}&z=15&output=embed`}
                  className="border-0"
                />
              </div>
              {reportData && (
                <div className="p-3 bg-accent/5 border-t border-accent/20">
                  <p className="text-xs text-accent font-medium">
                    Manual hotspot created: {reportData.hazardType?.replace('_', ' ')} at {selectedLocation?.latitude?.toFixed(4)}, {selectedLocation?.longitude?.toFixed(4)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Error Display - Only show for actual errors, not fallback situations */}
      {locationError && !currentLocation?.isFallback && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <Icon name="AlertCircle" size={20} className="text-error mt-0.5" />
            <div>
              <h4 className="font-medium text-error mb-1">Location Error</h4>
              <p className="text-sm text-muted-foreground">{locationError}</p>
              {locationError.includes('permission') && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <p className="mb-1">To enable location access:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Click the location icon in your browser's address bar</li>
                    <li>Select "Allow" or "Always allow"</li>
                    <li>Refresh the page if needed</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced Location Tips with Troubleshooting */}
      <div className="p-4 bg-muted/50 border border-border rounded-lg">
        <div className="flex items-start space-x-3">
          <Icon name="Info" size={20} className="text-primary mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground mb-2">GPS Accuracy & Troubleshooting</h4>
            
            {/* Current accuracy feedback */}
            {currentLocation && accuracyStatus && (
              <div className="mb-3 p-2 rounded border" style={{ 
                backgroundColor: `${getAccuracyColor(accuracyStatus.status)}10`,
                borderColor: `${getAccuracyColor(accuracyStatus.status)}30`
              }}>
                <p className="text-sm font-medium" style={{ color: getAccuracyColor(accuracyStatus.status) }}>
                  Current Status: {accuracyStatus.message}
                </p>
                {currentLocation.accuracy > 1000 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    This suggests network/IP location instead of GPS. Try troubleshooting steps below.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground mb-1">For Best GPS Accuracy:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Move outdoors with clear view of the sky</li>
                  <li>• Enable "High Accuracy" mode in device location settings</li>
                  <li>• Wait 30-60 seconds for GPS satellite lock</li>
                  <li>• Ensure you're using HTTPS (secure connection)</li>
                </ul>
              </div>

              {currentLocation && currentLocation.accuracy > 1000 && (
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-1">Poor Accuracy Troubleshooting:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Check if GPS is enabled in device settings</li>
                    <li>• Try disabling WiFi scanning interference</li>
                    <li>• Refresh page and allow location permission again</li>
                    <li>• Use manual entry if GPS remains unavailable</li>
                  </ul>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-foreground mb-1">About Hotspots:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Your report location creates a hazard hotspot automatically</li>
                  <li>• Hotspots warn other citizens and help emergency responders</li>
                  <li>• Even network-based locations are processed and useful</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
