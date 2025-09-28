import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import locationService from '../../../utils/locationService';
import realTimeService from '../../../utils/realTimeService';

const MapContainer = ({ 
  hazardData = [], 
  filters = {}, 
  onMarkerClick = () => {},
  onLocationUpdate = () => {},
  showQuickReport = true,
  onQuickReport = () => {}
}) => {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const circlesRef = useRef([]); // <-- added: keep hazard area circles
  const userLocationMarkerRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 19.0760, lng: 72.8777 });
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [realTimeHazards, setRealTimeHazards] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [zoom, setZoom] = useState(8);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapLoadTimeout, setMapLoadTimeout] = useState(false);

  // Initialize Google Maps API
  useEffect(() => {
    const loadGoogleMapsAPI = () => {
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkGoogleMaps = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkGoogleMaps);
            initializeMap();
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCKh9ng5UL9TgJqDWlKZ6VPtxAUiR6GGeo`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setTimeout(() => {
          if (window.google && window.google.maps) {
            initializeMap();
          } else {
            console.error('Google Maps API loaded but objects not available');
            setMapLoadTimeout(true);
          }
        }, 100);
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps API script');
        setMapLoadTimeout(true);
      };

      setTimeout(() => {
        if (!isMapLoaded && !mapLoadTimeout) {
          console.error('Map loading timeout - showing fallback');
          setMapLoadTimeout(true);
        }
      }, 10000);

      document.head.appendChild(script);
    };

    loadGoogleMapsAPI();
  }, []);

  const initializeMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.log('Map container or Google Maps not ready');
      return;
    }

    try {
      console.log('Initializing Google Maps with Tsunami Service styling...');
      
      // Tsunami service style map - terrain with muted colors
      const map = new google.maps.Map(mapRef.current, {
        zoom: zoom,
        center: mapCenter,
        mapTypeId: google.maps.MapTypeId.TERRAIN, // Changed from ROADMAP to TERRAIN
        styles: [
          // Muted terrain styling similar to tsunami service
          {
            featureType: 'administrative',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#666666' }]
          },
          {
            featureType: 'administrative.country',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#999999' }]
          },
          {
            featureType: 'landscape',
            elementType: 'geometry',
            stylers: [{ color: '#f5f5dc' }] // Light beige for land
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#a8c8ec' }] // Light blue for water
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#4682b4' }]
          },
          {
            featureType: 'road',
            stylers: [{ visibility: 'off' }] // Hide roads for cleaner look
          },
          {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }] // Hide points of interest
          },
          {
            featureType: 'transit',
            stylers: [{ visibility: 'off' }] // Hide transit
          }
        ],
        // Remove default UI controls for cleaner look
        disableDefaultUI: false,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      googleMapRef.current = map;
      
      console.log('Tsunami service style map initialized successfully');
      setIsMapLoaded(true);

      map.addListener('zoom_changed', () => {
        setZoom(map.getZoom());
      });

      map.addListener('center_changed', () => {
        const center = map.getCenter();
        setMapCenter({ lat: center.lat(), lng: center.lng() });
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setIsMapLoaded(false);
    }
  };

  // Load hazard data and set up real-time updates
  useEffect(() => {
    loadHazardData();
    
    realTimeService?.start();
    
    const unsubscribeHazards = realTimeService?.subscribe('hazards', (updatedHazards) => {
      setRealTimeHazards(updatedHazards);
      setLastUpdate(new Date());
    });

    const unsubscribeNewHazard = realTimeService?.subscribe('newHazard', (newHazard) => {
      setRealTimeHazards(prev => [...prev, newHazard]);
      setLastUpdate(new Date());
    });

    getCurrentLocation();
    
    const locationUnsubscribe = locationService?.onLocationUpdate((location) => {
      setUserLocation(location);
      onLocationUpdate(location);
    });

    return () => {
      unsubscribeHazards?.();
      unsubscribeNewHazard?.();
      locationUnsubscribe?.();
      realTimeService?.stop();

      // cleanup circles and markers on unmount
      if (markersRef.current.length) {
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
      }
      if (circlesRef.current.length) {
        circlesRef.current.forEach(c => c.setMap(null));
        circlesRef.current = [];
      }
    };
  }, []);

  const loadHazardData = () => {
    const userReports = JSON.parse(localStorage.getItem('userReports') || '[]');
    const officialHazards = JSON.parse(localStorage.getItem('hazardReports') || '[]');
    
    const combinedHazards = [
      // Only include user reports that are VERIFIED and NOT REJECTED
      ...userReports
        ?.filter(report => {
          const isVerified = report?.verificationStatus === 'verified' || 
                           (report?.status === 'verified' && report?.verificationStatus !== 'rejected');
          const isNotRejected = report?.verificationStatus !== 'rejected' && 
                               report?.status !== 'rejected';
          const hasLocation = report?.location;
          
          return isVerified && isNotRejected && hasLocation;
        })
        ?.map(report => ({
          id: report?.id,
          type: report?.hazardType,
          severity: report?.severity,
          lat: report?.location?.coordinates?.latitude || 
               report?.location?.coordinates?.lat || 
               report?.location?.lat || 
               report?.location?.latitude,
          lng: report?.location?.coordinates?.longitude || 
               report?.location?.coordinates?.lng || 
               report?.location?.lng || 
               report?.location?.longitude,
          location: report?.location?.address?.address || 
                   report?.location?.address || 
                   report?.location?.name || 
                   'Unknown Location',
          timestamp: new Date(report.submittedAt),
          description: report?.description,
          reportedBy: 'Citizen Report',
          status: 'verified',
          source: 'citizen',
          verificationStatus: report?.verificationStatus || 'verified'
        })),

      // Official hazards (hotspots) - always include as they're pre-verified
      ...officialHazards?.map(hazard => ({
        ...hazard,
        lat: hazard?.lat || hazard?.coordinates?.lat,
        lng: hazard?.lng || hazard?.coordinates?.lng,
        source: 'official',
        status: 'verified',
        verificationStatus: 'verified',
        timestamp: hazard?.timestamp instanceof Date ? hazard?.timestamp : new Date(hazard.timestamp)
      }))
    ];

    const validHazards = combinedHazards.filter(hazard => 
      hazard.lat != null && hazard.lng != null && 
      !isNaN(hazard.lat) && !isNaN(hazard.lng)
    );

    setRealTimeHazards(validHazards);
  };

  // Update markers when hazards or filters change
  useEffect(() => {
    if (isMapLoaded && googleMapRef.current) {
      updateMapMarkers();
    }
  }, [realTimeHazards, filters, isMapLoaded]);

  // Update user location marker
  useEffect(() => {
    if (isMapLoaded && googleMapRef.current && userLocation) {
      updateUserLocationMarker();
    }
  }, [userLocation, isMapLoaded]);

  const getCurrentLocation = async () => {
    setIsLocationLoading(true);
    try {
      const location = await locationService?.getCurrentPosition();
      setUserLocation(location);
      const newCenter = { 
        lat: location?.latitude, 
        lng: location?.longitude 
      };
      setMapCenter(newCenter);
      
      if (googleMapRef.current) {
        googleMapRef.current.setCenter(newCenter);
        googleMapRef.current.setZoom(12);
      }
      
      onLocationUpdate(location);
    } catch (error) {
      console.error('Location error:', error);
      const mockLocation = {
        latitude: 19.0760,
        longitude: 72.8777,
        accuracy: 100
      };
      setUserLocation(mockLocation);
      const newCenter = { 
        lat: mockLocation.latitude, 
        lng: mockLocation.longitude 
      };
      setMapCenter(newCenter);
      
      if (googleMapRef.current) {
        googleMapRef.current.setCenter(newCenter);
      }
      
      onLocationUpdate(mockLocation);
    } finally {
      setIsLocationLoading(false);
    }
  };

  const getFilteredHazards = () => {
    return realTimeHazards?.filter(hazard => {
      if (filters?.types && filters?.types?.length > 0 && !filters?.types?.includes(hazard?.type)) {
        return false;
      }
      if (filters?.severity && filters?.severity?.length > 0 && !filters?.severity?.includes(hazard?.severity)) {
        return false;
      }
      if (filters?.timeRange) {
        const hoursDiff = (Date.now() - hazard?.timestamp?.getTime()) / (1000 * 60 * 60);
        if (hoursDiff > filters?.timeRange) {
          return false;
        }
      }
      return true;
    });
  };

  // Create severity-based colored markers - same size for all verified hazards
  const createHazardIcon = (hazard) => {
    // Color mapping based on severity levels
    const severityColors = {
      low: '#22c55e',      // Green
      medium: '#f59e0b',   // Orange/Amber
      high: '#ef4444',     // Red
      critical: '#dc2626'  // Dark Red
    };
    
    const color = severityColors[hazard?.severity] || severityColors.high;
    const size = 28; // Same size for all verified hazards
    const strokeWidth = 3;
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${size/2}" cy="${size/2}" r="${(size-strokeWidth*2)/2}" 
                  fill="${color}" 
                  stroke="#ffffff" 
                  stroke-width="${strokeWidth}"
                  fill-opacity="0.8"/>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size/2, size/2)
    };
  };

  const updateMapMarkers = () => {
    if (!googleMapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current = [];

    // Clear existing circles (hazard areas)
    if (circlesRef.current && circlesRef.current.length) {
      circlesRef.current.forEach(circle => circle.setMap(null));
      circlesRef.current = [];
    }

    // Severity color mapping for reference
    const severityColors = {
      low: '#22c55e',      // Green
      medium: '#f59e0b',   // Orange/Amber
      high: '#ef4444',     // Red
      critical: '#dc2626'  // Dark Red
    };

    // optional radius by severity
    const severityRadius = {
      low: 300,
      medium: 700,
      high: 1500,
      critical: 3000
    };

    const filteredHazards = getFilteredHazards();

    filteredHazards.forEach(hazard => {
      const marker = new google.maps.Marker({
        position: { lat: hazard.lat, lng: hazard.lng },
        map: googleMapRef.current,
        title: `${hazard.type} - ${hazard.severity}`,
        icon: createHazardIcon(hazard),
        optimized: false
      });

      // draw hazard circle (bigger than user marker)
      try {
        const radiusMeters = hazard.radius || severityRadius[hazard.severity] || 1000;

        const circle = new google.maps.Circle({
          strokeColor: severityColors[hazard?.severity] || severityColors.high,
          strokeOpacity: 0.6,
          strokeWeight: 2,
          fillColor: severityColors[hazard?.severity] || severityColors.high,
          fillOpacity: 0.12,
          map: googleMapRef.current,
          center: { lat: hazard.lat, lng: hazard.lng },
          radius: radiusMeters,
          zIndex: 400 // lower than user's marker (user uses 1000)
        });

        circlesRef.current.push(circle);
      } catch (err) {
        console.warn('Failed to draw hazard circle:', err);
      }

      // Clean info window for verified hazards - no source distinction
      const infoWindowContent = `
        <div style="padding: 20px; max-width: 320px; font-family: 'Segoe UI', sans-serif; background: white;">
          <div style="border-bottom: 2px solid ${severityColors[hazard?.severity] || severityColors.high}; padding-bottom: 10px; margin-bottom: 15px;">
            <h3 style="margin: 0; color: ${severityColors[hazard?.severity] || severityColors.high}; font-size: 18px; font-weight: bold;">
              VERIFIED HAZARD EVENT
            </h3>
          </div>
          
          <div style="margin-bottom: 15px;">
            <h4 style="margin: 0 0 5px 0; color: #1f2937; font-size: 16px; text-transform: uppercase;">
              ${hazard?.type?.replace('_', ' ')}
            </h4>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              ${hazard?.location}
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <div>
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Severity</p>
              <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: ${severityColors[hazard?.severity] || severityColors.high};">
                ${hazard?.severity?.toUpperCase()}
              </p>
            </div>
            <div>
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Origin Time</p>
              <p style="margin: 2px 0 0 0; font-size: 14px; color: #1f2937;">
                ${hazard?.timestamp?.toLocaleString()}
              </p>
            </div>
          </div>

          ${hazard?.description ? `
            <div style="margin-bottom: 15px; padding: 10px; background: #f9fafb; border-radius: 6px;">
              <p style="margin: 0; font-size: 13px; color: #374151;">
                <strong>Details:</strong> ${hazard?.description}
              </p>
            </div>
          ` : ''}

          <div style="padding: 10px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 15px;">
            <p style="margin: 0; font-size: 12px; color: #92400e;">
              <strong>Location:</strong> ${hazard?.lat?.toFixed(4)}°, ${hazard?.lng?.toFixed(4)}°
            </p>
          </div>

          <div style="text-align: center; margin-top: 15px;">
            <button onclick="window.reportSimilarHazard && window.reportSimilarHazard('${hazard.id}')" 
                    style="background: ${severityColors[hazard?.severity] || severityColors.high}; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">
              Report Similar Event
            </button>
          </div>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent
      });

      marker.addListener('click', () => {
        markersRef.current.forEach(m => m.infoWindow?.close());
        
        infoWindow.open(googleMapRef.current, marker);
        setSelectedMarker(hazard);
        onMarkerClick(hazard);
      });

      marker.infoWindow = infoWindow;
      marker.hazardData = hazard;
      markersRef.current.push(marker);
    });
  };

  // Global function for quick report from hotspot
  useEffect(() => {
    window.reportSimilarHazard = (hazardId) => {
      const hazard = realTimeHazards.find(h => h.id === hazardId);
      if (hazard && onQuickReport) {
        onQuickReport(hazard);
      }
    };

    return () => {
      delete window.reportSimilarHazard;
    };
  }, [realTimeHazards, onQuickReport]);

  const updateUserLocationMarker = () => {
    if (!googleMapRef.current || !userLocation) return;

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setMap(null);
    }

    // User location marker - blue circle to distinguish from red hazard markers
    const userMarker = new google.maps.Marker({
      position: { lat: userLocation.latitude, lng: userLocation.longitude },
      map: googleMapRef.current,
      title: 'Your Current Location',
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" fill="#2563eb" stroke="#ffffff" stroke-width="3" fill-opacity="0.8"/>
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(20, 20),
        anchor: new google.maps.Point(10, 10)
      },
      zIndex: 1000,
      optimized: false
    });

    const userInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 15px; max-width: 200px; font-family: 'Segoe UI', sans-serif;">
          <h3 style="margin: 0 0 10px 0; color: #2563eb; font-size: 16px;">Your Location</h3>
          <p style="margin: 5px 0; font-size: 12px; color: #6b7280;">
            Accuracy: ±${userLocation.accuracy || 'N/A'}m
          </p>
          <div style="background: #f1f5f9; padding: 8px; border-radius: 4px; margin-top: 8px;">
            <p style="margin: 0; font-size: 11px; color: #374151;">
              <strong>Coordinates:</strong><br>
              ${userLocation.latitude?.toFixed(6)}°, ${userLocation.longitude?.toFixed(6)}°
            </p>
          </div>
        </div>
      `
    });

    userMarker.addListener('click', () => {
      userInfoWindow.open(googleMapRef.current, userMarker);
    });

    userLocationMarkerRef.current = userMarker;
  };

  const handleZoomIn = () => {
    if (googleMapRef.current) {
      const currentZoom = googleMapRef.current.getZoom();
      googleMapRef.current.setZoom(Math.min(currentZoom + 1, 20));
    }
  };

  const handleZoomOut = () => {
    if (googleMapRef.current) {
      const currentZoom = googleMapRef.current.getZoom();
      googleMapRef.current.setZoom(Math.max(currentZoom - 1, 1));
    }
  };

  const filteredHazards = getFilteredHazards();

  return (
    <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden">
      {isMapLoaded ? (
        <div
          ref={mapRef}
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: '400px' }}
        />
      ) : mapLoadTimeout ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="MapPin" size={24} className="text-error" />
            </div>
            <h3 className="text-foreground font-semibold mb-2">Map Unavailable</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Unable to load Google Maps. This might be due to network issues or API configuration.
            </p>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => {
                setMapLoadTimeout(false);
                setIsMapLoaded(false);
                window.location.reload();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tsunami service map...</p>
            <p className="text-muted-foreground text-sm mt-2">Initializing terrain view...</p>
          </div>
        </div>
      )}

      <div
        ref={mapRef}
        className={`absolute inset-0 w-full h-full ${isMapLoaded ? 'block' : 'hidden'}`}
        style={{ minHeight: '400px' }}
      />

      {/* Map Overlay Controls */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Real-time Update Indicator - Tsunami Service Style */}
        <div className="absolute top-4 left-4 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-red-600 rounded-full pulse-indicator"></div>
              <span className="text-gray-800 font-medium">Live Hazard Data</span>
              <span className="text-gray-500">
                {lastUpdate?.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute top-4 right-16 pointer-events-auto flex flex-col space-y-1">
          <Button
            variant="default"
            size="icon"
            iconName="Plus"
            onClick={handleZoomIn}
            className="bg-white/95 backdrop-blur-sm shadow-lg w-8 h-8 border border-gray-200"
            disabled={!isMapLoaded}
          />
          <Button
            variant="default"
            size="icon"
            iconName="Minus"
            onClick={handleZoomOut}
            className="bg-white/95 backdrop-blur-sm shadow-lg w-8 h-8 border border-gray-200"
            disabled={!isMapLoaded}
          />
        </div>

        {/* Location Button */}
        <div className="absolute top-4 right-4 pointer-events-auto">
          <Button
            variant="default"
            size="icon"
            iconName="MapPin"
            onClick={getCurrentLocation}
            loading={isLocationLoading}
            className="bg-white/95 backdrop-blur-sm shadow-lg border border-gray-200"
            aria-label="Get current location"
            disabled={!isMapLoaded}
          />
        </div>

        {/* Quick Report FAB */}
        {showQuickReport && (
          <div className="absolute bottom-6 right-6 pointer-events-auto">
            <Button
              variant="default"
              size="icon"
              iconName="Plus"
              onClick={onQuickReport}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg"
              aria-label="Quick Report Hazard"
            />
          </div>
        )}

        {/* Legend - Severity Based Color System */}
        <div className="absolute bottom-6 left-6 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-lg max-w-xs">
            <h4 className="font-semibold text-gray-800 mb-3 text-sm">Legend</h4>
            
            <div className="mb-3 p-2 rounded-lg border border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Verified Events:</span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                  {filteredHazards.length}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Severity Levels</p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-7 h-7 rounded-full border-2 border-white" style={{backgroundColor: '#22c55e', opacity: 0.8}}></div>
                  <span className="text-gray-600">Low Severity</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-7 h-7 rounded-full border-2 border-white" style={{backgroundColor: '#f59e0b', opacity: 0.8}}></div>
                  <span className="text-gray-600">Medium Severity</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-7 h-7 rounded-full border-2 border-white" style={{backgroundColor: '#ef4444', opacity: 0.8}}></div>
                  <span className="text-gray-600">High Severity</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-7 h-7 rounded-full border-2 border-white" style={{backgroundColor: '#dc2626', opacity: 0.8}}></div>
                  <span className="text-gray-600">Critical Severity</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white opacity-80"></div>
                  <span className="text-gray-600">Your Location</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-200">
              All markers are verified hazard events. Color indicates severity level from green (low) to dark red (critical).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapContainer;
