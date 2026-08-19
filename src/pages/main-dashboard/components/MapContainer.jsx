import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/Appicon';
import Button from '../../../components/ui/Button';
import locationService from '../../../utils/locationService';
import realTimeService from '../../../utils/realTimeService';
import localDb from '../../../utils/localDb';
import { useTranslation } from '../../../context/LanguageContext';

const MapContainer = ({ 
  hazardData = [], 
  filters = {}, 
  onMarkerClick = () => {},
  onLocationUpdate = () => {},
  showQuickReport = true,
  onQuickReport = () => {}
}) => {
  const { t } = useTranslation();
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
  const [showLegend, setShowLegend] = useState(false);

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

      // Handle Google Maps authentication/billing failures gracefully
      window.gm_authFailure = () => {
        console.warn('Google Maps authentication failure (billing or key restriction). Falling back.');
        setMapLoadTimeout(true);
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}`;
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

    return () => {
      if (window.gm_authFailure) {
        delete window.gm_authFailure;
      }
    };
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
        // Remove all default UI controls, pan/rotate arrows, and keyboard overlays
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        rotateControl: false,
        scaleControl: false,
        panControl: false,
        keyboardShortcuts: false,
        gestureHandling: 'greedy'
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
    
    const unsubscribeHazards = realTimeService?.subscribe('hazards', () => {
      loadHazardData();
      setLastUpdate(new Date());
    });

    const unsubscribeReports = realTimeService?.subscribe('reports', () => {
      loadHazardData();
      setLastUpdate(new Date());
    });

    const unsubscribeUserReports = realTimeService?.subscribe('userReports', () => {
      loadHazardData();
      setLastUpdate(new Date());
    });

    const unsubscribeNewHazard = realTimeService?.subscribe('newHazard', () => {
      loadHazardData();
      setLastUpdate(new Date());
    });

    getCurrentLocation();
    
    const locationUnsubscribe = locationService?.onLocationUpdate((location) => {
      setUserLocation(location);
      onLocationUpdate(location);
    });

    return () => {
      unsubscribeHazards?.();
      unsubscribeReports?.();
      unsubscribeUserReports?.();
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
    const userReports = localDb.getCollection('userReports') || [];
    const officialHazards = localDb.getCollection('hazardReports') || [];
    
    // Demo data for demonstration purposes - India's coastal areas
    const demoHazards = [
      {
        id: 'demo-1',
        type: 'tsunami',
        hazardType: 'tsunami',
        severity: 'high',
        lat: 19.0760,
        lng: 72.8777,
        location: 'Gateway of India, Mumbai Coast',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        description: 'High wave activity detected near Mumbai coast. Authorities monitoring situation.',
        reportedBy: 'Mumbai Coastal Authority',
        reportedByRole: 'official',
        source: 'official',
        status: 'verified',
        verificationStatus: 'verified'
      },
      {
        id: 'demo-2',
        type: 'flooding',
        hazardType: 'flooding',
        severity: 'medium',
        lat: 12.9716,
        lng: 77.5946,
        location: 'Chennai Coast, Tamil Nadu',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        description: 'Coastal flooding reported in Chennai coastal area due to high tide.',
        reportedBy: 'Rajesh Kumar',
        reportedByRole: 'citizen',
        source: 'citizen',
        status: 'verified',
        verificationStatus: 'verified'
      },
      {
        id: 'demo-3',
        type: 'high_waves',
        hazardType: 'high_waves',
        severity: 'critical',
        lat: 8.5241,
        lng: 76.9366,
        location: 'Kochi Coast, Kerala',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        description: 'Dangerous high waves observed at Kochi coast. Public advised to stay away.',
        reportedBy: 'Kochi Port Authority',
        reportedByRole: 'official',
        source: 'official',
        status: 'verified',
        verificationStatus: 'verified'
      },
      {
        id: 'demo-4',
        type: 'storm_surge',
        hazardType: 'storm_surge',
        severity: 'high',
        lat: 22.5726,
        lng: 88.3639,
        location: 'Kolkata Coast, West Bengal',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        description: 'Storm surge warning issued for Kolkata coastal area.',
        reportedBy: 'Kolkata Weather Station',
        reportedByRole: 'official',
        source: 'official',
        status: 'verified',
        verificationStatus: 'verified'
      },
      {
        id: 'demo-5',
        type: 'flooding',
        hazardType: 'flooding',
        severity: 'low',
        lat: 15.2993,
        lng: 74.1240,
        location: 'Goa Coast',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        description: 'Minor coastal flooding in Goa area due to heavy rainfall.',
        reportedBy: 'Goa Coastal Guard',
        reportedByRole: 'citizen',
        source: 'citizen',
        status: 'verified',
        verificationStatus: 'verified'
      },
      {
        id: 'demo-6',
        type: 'tsunami',
        hazardType: 'tsunami',
        severity: 'critical',
        lat: 19.0400,
        lng: 72.8200,
        location: 'Versova Beach, Mumbai Coast',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        description: 'CRITICAL: Tsunami warning issued for Versova Beach area. Immediate evacuation advised.',
        reportedBy: 'Dr. Priya Sharma',
        reportedByRole: 'official',
        source: 'official',
        status: 'verified',
        verificationStatus: 'verified'
      },
      {
        id: 'demo-7',
        type: 'storm_surge',
        hazardType: 'storm_surge',
        severity: 'critical',
        lat: 19.1000,
        lng: 72.9000,
        location: 'Powai Lake Coastal Area, Mumbai',
        timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        description: 'CRITICAL: Severe storm surge detected near Powai coastal area. High alert issued.',
        reportedBy: 'Dr. Priya Sharma',
        reportedByRole: 'official',
        source: 'official',
        status: 'verified',
        verificationStatus: 'verified'
      },
      {
        id: 'demo-8',
        type: 'high_waves',
        hazardType: 'high_waves',
        severity: 'critical',
        lat: 19.0200,
        lng: 72.8500,
        location: 'Aksa Beach, Mumbai Coast',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        description: 'CRITICAL: Extremely dangerous high waves at Aksa Beach. Beach closed immediately.',
        reportedBy: 'Dr. Priya Sharma',
        reportedByRole: 'official',
        source: 'official',
        status: 'verified',
        verificationStatus: 'verified'
      }
    ];
    
    const combinedHazards = [
      // Demo hazards for demonstration
      ...demoHazards,
      // Include user reports that are not rejected
      ...userReports
        ?.filter(report => {
          const isNotRejected = report?.verificationStatus !== 'rejected' && report?.status !== 'rejected';
          const hasLocation = report?.location || (report?.lat != null && report?.lng != null);
          return isNotRejected && hasLocation;
        })
        ?.map(report => {
          const submitterName = report?.reportedBy || report?.reporterName || report?.reporter?.name || 'User Report';
          const submitterRole = report?.reportedByRole || report?.reporterRole || report?.source || 'citizen';
          const latVal = report?.location?.coordinates?.latitude ?? 
                         report?.location?.coordinates?.lat ?? 
                         report?.location?.lat ?? 
                         report?.location?.latitude ?? 
                         report?.lat;
          const lngVal = report?.location?.coordinates?.longitude ?? 
                         report?.location?.coordinates?.lng ?? 
                         report?.location?.lng ?? 
                         report?.location?.longitude ?? 
                         report?.lng;
          const locStr = report?.location?.address?.address || 
                         report?.location?.address || 
                         report?.location?.name || 
                         (typeof report?.location === 'string' ? report.location : 'Reported Location');

          return {
            id: report?.id,
            type: report?.hazardType || report?.type || 'general',
            hazardType: report?.hazardType || report?.type || 'general',
            severity: report?.severity || 'medium',
            lat: latVal,
            lng: lngVal,
            location: locStr,
            timestamp: new Date(report.timestamp || report.submittedAt || Date.now()),
            description: report?.description || '',
            reportedBy: submitterName,
            reportedByRole: submitterRole,
            source: submitterRole,
            status: report?.status || 'pending_verification',
            verificationStatus: report?.verificationStatus || report?.status || 'pending'
          };
        }),

      // Official hazards (hotspots) - always include
      ...officialHazards?.map(hazard => ({
        ...hazard,
        type: hazard?.hazardType || hazard?.type || 'general',
        hazardType: hazard?.hazardType || hazard?.type || 'general',
        lat: hazard?.lat ?? hazard?.coordinates?.lat ?? hazard?.coordinates?.latitude,
        lng: hazard?.lng ?? hazard?.coordinates?.lng ?? hazard?.coordinates?.longitude,
        reportedBy: hazard?.reportedBy || 'Official Authority',
        reportedByRole: hazard?.reportedByRole || 'official',
        source: hazard?.source || 'official',
        status: hazard?.status || 'verified',
        verificationStatus: hazard?.verificationStatus || 'verified',
        timestamp: hazard?.timestamp instanceof Date ? hazard?.timestamp : new Date(hazard?.timestamp || Date.now())
      }))
    ];

    // Deduplicate by ID
    const uniqueHazards = combinedHazards.reduce((acc, curr) => {
      if (!acc.find(h => h.id === curr.id)) {
        acc.push(curr);
      }
      return acc;
    }, []);

    const validHazards = uniqueHazards.filter(hazard => 
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

  // Global function for quick report from hotspot & closing info windows
  useEffect(() => {
    window.reportSimilarHazard = (hazardId) => {
      const hazard = realTimeHazards.find(h => h.id === hazardId);
      if (hazard && onQuickReport) {
        onQuickReport(hazard);
      }
    };

    window.closeAllInfoWindows = () => {
      markersRef.current.forEach(m => m.infoWindow?.close());
      if (userLocationMarkerRef.current?.infoWindow) {
        userLocationMarkerRef.current.infoWindow.close();
      }
    };

    return () => {
      delete window.reportSimilarHazard;
      delete window.closeAllInfoWindows;
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
          <svg width="22" height="22" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="9" fill="#0284c7" stroke="#ffffff" stroke-width="3" fill-opacity="0.95"/>
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(22, 22),
        anchor: new google.maps.Point(11, 11)
      },
      zIndex: 1000,
      optimized: false
    });

    const userInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 16px 18px; min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position: relative; background: #ffffff;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 10px;">
            <h3 style="margin: 0; color: #0369a1; font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
              📍 Your Location
            </h3>
            <button onclick="window.closeAllInfoWindows && window.closeAllInfoWindows()" 
                    style="border: none; background: #f1f5f9; width: 26px; height: 26px; border-radius: 50%; cursor: pointer; font-size: 14px; font-weight: bold; color: #334155; display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0;"
                    aria-label="Close">
              ✕
            </button>
          </div>
          <p style="margin: 4px 0 8px 0; font-size: 12px; font-weight: 600; color: #475569;">
            Accuracy: ±${Math.round(userLocation.accuracy || 10)}m
          </p>
          <div style="background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #0f172a; font-family: monospace;">
              ${userLocation.latitude?.toFixed(6)}°, ${userLocation.longitude?.toFixed(6)}°
            </p>
          </div>
        </div>
      `
    });

    userMarker.addListener('click', () => {
      markersRef.current.forEach(m => m.infoWindow?.close());
      userInfoWindow.open(googleMapRef.current, userMarker);
    });

    userMarker.infoWindow = userInfoWindow;
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
    <div className="relative w-full h-full bg-slate-100 overflow-hidden select-none">
      {/* Seamless Full-Bleed Map Canvas Container */}
      <div
        ref={mapRef}
        className={`absolute inset-0 w-full h-full ${isMapLoaded ? 'block' : 'hidden'}`}
        style={{ minHeight: '400px' }}
      />

      {!isMapLoaded && !mapLoadTimeout && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-800 font-bold text-sm">Loading coastal hazard map...</p>
          </div>
        </div>
      )}

      {mapLoadTimeout && !isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10 p-6">
          <div className="text-center p-6 bg-white border border-slate-200 rounded-2xl shadow-xl max-w-sm">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Icon name="MapPin" size={24} />
            </div>
            <h3 className="text-slate-900 font-bold mb-1">Map Loading Timeout</h3>
            <p className="text-slate-600 text-xs mb-4">
              Click below to retry initializing the live map view.
            </p>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => {
                setMapLoadTimeout(false);
                setIsMapLoaded(false);
                window.location.reload();
              }}
              className="font-bold bg-primary text-white"
            >
              Retry Map
            </Button>
          </div>
        </div>
      )}

      {/* Map Floating Controls (Pointer events enabled ONLY on the exact buttons) */}
      <div className="absolute top-3 right-3 z-10 pointer-events-auto">
        <div className="flex flex-col bg-white border border-slate-300 rounded-2xl shadow-xl overflow-hidden p-1 space-y-1">
          <Button
            variant="ghost"
            size="icon"
            iconName="MapPin"
            onClick={getCurrentLocation}
            loading={isLocationLoading}
            className="w-9 h-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors text-slate-800"
            aria-label="Get current location"
            disabled={!isMapLoaded}
          />
          <div className="w-full h-px bg-slate-200" />
          <Button
            variant="ghost"
            size="icon"
            iconName="Plus"
            onClick={handleZoomIn}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 transition-colors text-slate-800"
            disabled={!isMapLoaded}
            aria-label="Zoom in"
          />
          <Button
            variant="ghost"
            size="icon"
            iconName="Minus"
            onClick={handleZoomOut}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 transition-colors text-slate-800"
            disabled={!isMapLoaded}
            aria-label="Zoom out"
          />
          <div className="w-full h-px bg-slate-200" />
          <Button
            variant={showLegend ? "default" : "ghost"}
            size="icon"
            iconName="Info"
            onClick={() => setShowLegend(!showLegend)}
            className="w-9 h-9 rounded-xl transition-colors"
            aria-label="Toggle map legend"
          />
        </div>
      </div>

      {/* Bottom Left Legend Modal/Card */}
      {showLegend && (
        <div className="absolute bottom-3 left-3 z-10 pointer-events-auto max-w-xs w-[calc(100%-24px)] sm:w-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-2xl text-slate-900">
              <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2">
                  <Icon name="Info" size={16} className="text-primary" />
                  <h4 className="font-bold text-sm text-slate-900">{t('mapLegend', 'Map Legend')}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLegend(false)}
                  className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
                  aria-label="Close legend"
                >
                  <Icon name="X" size={14} />
                </button>
              </div>
              
              <div className="space-y-2 mb-3">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('hazardSeverity', 'Hazard Severity')}</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-success ring-2 ring-success/30" />
                    <span className="text-slate-800">{t('low', 'Low')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-secondary ring-2 ring-secondary/30" />
                    <span className="text-slate-800">{t('medium', 'Medium')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-warning ring-2 ring-warning/30" />
                    <span className="text-slate-800">{t('high', 'High')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-error ring-2 ring-error/30" />
                    <span className="text-slate-800">{t('critical', 'Critical')}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-medium text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                {t('legendDescription', 'Markers indicate verified coastal hazard events. Pulses indicate active live alerts.')}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default MapContainer;

