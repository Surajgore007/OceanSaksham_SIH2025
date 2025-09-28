/**
 * Enhanced Location Service with Aggressive GPS Accuracy
 * Addresses common issues: IP fallback, permission problems, device GPS settings
 */
class LocationService {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.locationListeners = [];
    this.permissionRequested = false;
    this.permissionGranted = false;
    this.lastAccuratePosition = null;
    this.isIndoors = false;
  }

  /**
   * Request location permission with explicit user guidance
   */
  async requestLocationPermission() {
    if (this.permissionRequested) {
      return this.permissionGranted;
    }

    if (!this.isGeolocationAvailable()) {
      console.error('Geolocation not supported');
      return false;
    }

    // Check if we're on HTTPS (required for modern browsers)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.error('Geolocation requires HTTPS in modern browsers');
      return false;
    }

    this.permissionRequested = true;

    return new Promise((resolve) => {
      // First check permission state if available
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          if (result.state === 'denied') {
            console.log('Geolocation permission permanently denied');
            this.permissionGranted = false;
            resolve(false);
            return;
          }
        }).catch(() => {
          // Permission API not supported, continue with direct request
        });
      }

      // Request permission with immediate GPS attempt
      this.attemptGPSPermission(resolve);
    });
  }

  /**
   * Attempt GPS permission with strict high-accuracy requirements
   */
  attemptGPSPermission(resolve) {
    const strictGPSOptions = {
      enableHighAccuracy: true,
      timeout: 60000, // Extended timeout for GPS lock
      maximumAge: 0   // Force fresh GPS reading
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('GPS permission granted. Accuracy:', position.coords.accuracy);
        
        // Only accept if accuracy suggests actual GPS (not cell tower)
        if (position.coords.accuracy > 50000) {
          console.warn('Accuracy too poor, likely IP-based location. Trying alternative approach...');
          this.tryAlternativeGPSApproach(resolve);
          return;
        }

        this.permissionGranted = true;
        const location = this.formatPosition(position);
        this.currentPosition = location;
        this.lastAccuratePosition = location;
        this.notifyListeners(location);
        resolve(true);
      },
      (error) => {
        console.log('Initial GPS permission failed:', error.message);
        
        // Try alternative approach for stubborn devices
        if (error.code === 1) { // PERMISSION_DENIED
          this.permissionGranted = false;
          resolve(false);
        } else {
          // Try alternative approach for timeout or unavailable
          this.tryAlternativeGPSApproach(resolve);
        }
      },
      strictGPSOptions
    );
  }

  /**
   * Alternative GPS approach for difficult devices
   */
  tryAlternativeGPSApproach(resolve) {
    console.log('Trying alternative GPS approach...');
    
    // More aggressive GPS-only settings
    const alternativeOptions = {
      enableHighAccuracy: true,
      timeout: 90000, // Even longer timeout
      maximumAge: 5000 // Allow slightly cached position for speed
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Alternative GPS succeeded. Accuracy:', position.coords.accuracy);
        
        this.permissionGranted = true;
        const location = this.formatPosition(position);
        this.currentPosition = location;
        
        if (location.accuracy <= 1000) {
          this.lastAccuratePosition = location;
        }
        
        this.notifyListeners(location);
        resolve(true);
      },
      (error) => {
        console.log('Alternative GPS also failed:', error.message);
        this.permissionGranted = false;
        resolve(false);
      },
      alternativeOptions
    );
  }

  /**
   * Subscribe to location updates
   */
  onLocationUpdate(callback) {
    this.locationListeners?.push(callback);
    return () => {
      this.locationListeners = this.locationListeners?.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all listeners of location updates
   */
  notifyListeners(location) {
    this.locationListeners?.forEach(callback => callback(location));
  }

  /**
   * Check if geolocation is available
   */
  isGeolocationAvailable() {
    return 'geolocation' in navigator;
  }

  /**
   * Advanced GPS positioning with multiple strategies
   */
  async getCurrentPosition(options = {}) {
    if (!this.isGeolocationAvailable()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    // Security check
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      throw new Error('Geolocation requires HTTPS connection for security');
    }

    // Permission check
    if (!this.permissionRequested) {
      await this.requestLocationPermission();
    }

    if (!this.permissionGranted) {
      throw new Error('Location permission denied. Please enable location access and ensure GPS is enabled on your device.');
    }

    // Try multiple GPS strategies
    return this.tryMultipleGPSStrategies(options);
  }

  /**
   * Try multiple GPS strategies for best accuracy
   */
  async tryMultipleGPSStrategies(options = {}) {
    const strategies = [
      // Strategy 1: Ultra high accuracy GPS
      {
        name: 'Ultra High Accuracy',
        options: {
          enableHighAccuracy: true,
          timeout: 45000,
          maximumAge: 0
        },
        minAccuracy: 50
      },
      // Strategy 2: High accuracy with longer timeout
      {
        name: 'Extended GPS Lock',
        options: {
          enableHighAccuracy: true,
          timeout: 75000,
          maximumAge: 10000
        },
        minAccuracy: 200
      },
      // Strategy 3: Moderate accuracy for difficult environments
      {
        name: 'Adaptive GPS',
        options: {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 30000
        },
        minAccuracy: 1000
      }
    ];

    let bestPosition = null;
    let lastError = null;

    for (const strategy of strategies) {
      try {
        console.log(`Trying GPS strategy: ${strategy.name}`);
        
        const position = await this.executeGPSStrategy(strategy.options);
        const location = this.formatPosition(position);
        
        console.log(`${strategy.name} result: ${location.accuracy}m accuracy`);
        
        // Accept if accuracy meets strategy requirements
        if (location.accuracy <= strategy.minAccuracy) {
          this.currentPosition = location;
          
          if (location.accuracy <= 100) {
            this.lastAccuratePosition = location;
          }
          
          this.notifyListeners(location);
          return location;
        } else {
          // Keep as potential fallback
          if (!bestPosition || location.accuracy < bestPosition.accuracy) {
            bestPosition = location;
          }
        }
      } catch (error) {
        console.warn(`${strategy.name} failed:`, error.message);
        lastError = error;
      }
    }

    // Use best position if we got something
    if (bestPosition) {
      console.log(`Using best available position: ${bestPosition.accuracy}m accuracy`);
      this.currentPosition = bestPosition;
      this.notifyListeners(bestPosition);
      return bestPosition;
    }

    // All strategies failed
    throw lastError || new Error('All GPS strategies failed');
  }

  /**
   * Execute a specific GPS strategy
   */
  executeGPSStrategy(options) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('GPS strategy timeout'));
      }, options.timeout + 5000); // Add buffer to options timeout

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          
          // Validate coordinates
          const coords = position.coords;
          if (!coords || 
              typeof coords.latitude !== 'number' || 
              typeof coords.longitude !== 'number' ||
              Math.abs(coords.latitude) > 90 ||
              Math.abs(coords.longitude) > 180 ||
              coords.accuracy > 500000) { // Reject obviously wrong data
            reject(new Error('Invalid GPS data received'));
            return;
          }
          
          resolve(position);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(new Error(this.getErrorMessage(error.code)));
        },
        options
      );
    });
  }

  /**
   * Get current position with fallback only as last resort
   */
  async getCurrentPositionWithFallback(options = {}) {
    try {
      return await this.getCurrentPosition(options);
    } catch (error) {
      console.warn('All GPS strategies failed, using fallback:', error.message);
      
      // Only use fallback if GPS completely fails
      const fallbackLocations = [
        { lat: 19.0760, lng: 72.8777, name: 'Mumbai, Maharashtra' },
        { lat: 13.0827, lng: 80.2707, name: 'Chennai, Tamil Nadu' },
        { lat: 15.2993, lng: 74.1240, name: 'Panaji, Goa' },
        { lat: 11.9416, lng: 79.8083, name: 'Puducherry' }
      ];
      
      const randomLocation = fallbackLocations[Math.floor(Math.random() * fallbackLocations.length)];
      
      const fallbackLocation = {
        latitude: randomLocation.lat,
        longitude: randomLocation.lng,
        accuracy: 1000,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: new Date().toISOString(),
        isFallback: true,
        fallbackReason: error.message,
        fallbackLocationName: randomLocation.name
      };
      
      this.currentPosition = fallbackLocation;
      this.notifyListeners(fallbackLocation);
      return fallbackLocation;
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(errorCode) {
    switch (errorCode) {
      case 1: return 'Location access denied. Please enable location permissions in your browser and ensure GPS is enabled on your device.';
      case 2: return 'Location unavailable. Please ensure GPS is enabled and try moving to an outdoor location with clear sky view.';
      case 3: return 'Location request timed out. GPS may need more time to acquire satellites.';
      default: return 'Unknown location error. Please check your device settings.';
    }
  }

  /**
   * Start continuous GPS monitoring
   */
  startWatchingPosition(options = {}) {
    if (!this.isGeolocationAvailable()) {
      throw new Error('Geolocation is not supported');
    }

    if (!this.permissionGranted) {
      throw new Error('Location permission not granted');
    }

    if (this.watchId !== null) {
      this.stopWatchingPosition();
    }

    const watchOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 15000 // Accept reasonably fresh positions
    };

    const finalOptions = { ...watchOptions, ...options };

    this.watchId = navigator.geolocation?.watchPosition(
      (position) => {
        const location = this.formatPosition(position);
        
        // Only update if accuracy is reasonable
        if (location.accuracy <= 1000 && 
            (!this.currentPosition || location.accuracy <= this.currentPosition.accuracy * 1.5)) {
          
          this.currentPosition = location;
          if (location.accuracy <= 100) {
            this.lastAccuratePosition = location;
          }
          this.notifyListeners(location);
        }
      },
      (error) => {
        console.error('GPS watch error:', this.formatGeolocationError(error));
      },
      finalOptions
    );

    return this.watchId;
  }

  /**
   * Stop watching position changes
   */
  stopWatchingPosition() {
    if (this.watchId !== null) {
      navigator.geolocation?.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Format position object with strict validation
   */
  formatPosition(position) {
    const coords = position?.coords;
    
    // Strict validation
    if (!coords || 
        typeof coords.latitude !== 'number' || 
        typeof coords.longitude !== 'number' ||
        Math.abs(coords.latitude) > 90 ||
        Math.abs(coords.longitude) > 180) {
      throw new Error('Invalid coordinates received');
    }

    // Detect if this might be IP-based location (very poor accuracy)
    const isProbablyGPS = coords.accuracy <= 10000;
    const isHighAccuracy = coords.accuracy <= 100;

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy || null,
      altitude: coords.altitude || null,
      altitudeAccuracy: coords.altitudeAccuracy || null,
      heading: coords.heading || null,
      speed: coords.speed || null,
      timestamp: new Date(position.timestamp)?.toISOString(),
      isReal: isProbablyGPS,
      isHighAccuracy: isHighAccuracy,
      source: isHighAccuracy ? 'GPS' : isProbablyGPS ? 'WiFi/Cell' : 'IP/Network'
    };
  }

  /**
   * Format geolocation error
   */
  formatGeolocationError(error) {
    let message = 'Location access failed';
    let code = 'UNKNOWN_ERROR';

    switch (error?.code) {
      case 1:
        message = 'Location access denied. Check browser permissions and device GPS settings.';
        code = 'PERMISSION_DENIED';
        break;
      case 2:
        message = 'GPS unavailable. Please move to an outdoor location.';
        code = 'POSITION_UNAVAILABLE';
        break;
      case 3:
        message = 'GPS timeout. Satellites may need more time to connect.';
        code = 'TIMEOUT';
        break;
    }

    return {
      message: `${message} (${code})`,
      code: code,
      originalError: error
    };
  }

  /**
   * Get distance between two coordinates
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  /**
   * Reverse geocoding
   */
  async reverseGeocode(latitude, longitude) {
    const mockLocations = [
      { lat: 19.0760, lng: 72.8777, address: 'Mumbai, Maharashtra', district: 'Mumbai', state: 'Maharashtra' },
      { lat: 13.0827, lng: 80.2707, address: 'Chennai, Tamil Nadu', district: 'Chennai', state: 'Tamil Nadu' },
      { lat: 15.2993, lng: 74.1240, address: 'Panaji, Goa', district: 'North Goa', state: 'Goa' },
      { lat: 11.9416, lng: 79.8083, address: 'Puducherry', district: 'Puducherry', state: 'Puducherry' },
      { lat: 22.5726, lng: 88.3639, address: 'Kolkata, West Bengal', district: 'Kolkata', state: 'West Bengal' }
    ];

    let closestLocation = mockLocations?.[0];
    let minDistance = this.calculateDistance(latitude, longitude, closestLocation?.lat, closestLocation?.lng);

    for (const location of mockLocations) {
      const distance = this.calculateDistance(latitude, longitude, location?.lat, location?.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = location;
      }
    }

    return {
      address: closestLocation?.address,
      district: closestLocation?.district,
      state: closestLocation?.state,
      country: 'India',
      coordinates: { latitude, longitude }
    };
  }

  /**
   * Create geotagged image
   */
  async createGeotaggedImage(imageBlob, location = null) {
    try {
      const currentLocation = location || (await this.getCurrentPosition());
      const address = await this.reverseGeocode(
        currentLocation?.latitude, 
        currentLocation?.longitude
      );

      return {
        id: Date.now() + Math.random(),
        blob: imageBlob,
        url: URL.createObjectURL(imageBlob),
        location: currentLocation,
        address: address,
        timestamp: new Date()?.toISOString(),
        size: imageBlob?.size,
        type: imageBlob?.type,
        geotagged: true
      };
    } catch (error) {
      console.error('Geotagging error:', error);
      
      return {
        id: Date.now() + Math.random(),
        blob: imageBlob,
        url: URL.createObjectURL(imageBlob),
        location: null,
        address: null,
        timestamp: new Date()?.toISOString(),
        size: imageBlob?.size,
        type: imageBlob?.type,
        geotagged: false,
        error: error?.message
      };
    }
  }

  /**
   * Get current cached position, prefer high accuracy
   */
  getCachedPosition() {
    return this.lastAccuratePosition || this.currentPosition;
  }

  /**
   * Check if position is recent and accurate
   */
  isPositionRecent(minutes = 5) {
    const position = this.getCachedPosition();
    if (!position) return false;
    
    const now = new Date();
    const positionTime = new Date(position.timestamp);
    const diffMinutes = (now?.getTime() - positionTime?.getTime()) / (1000 * 60);
    
    return diffMinutes <= minutes && (!position.accuracy || position.accuracy <= 1000);
  }

  /**
   * Get position with fallback to cached
   */
  async getPositionWithFallback(maxAge = 5) {
    if (this.isPositionRecent(maxAge)) {
      return this.getCachedPosition();
    }
    
    try {
      return await this.getCurrentPosition();
    } catch (error) {
      const cached = this.getCachedPosition();
      if (cached) {
        console.warn('Using cached position due to error:', error);
        return cached;
      }
      throw error;
    }
  }

  /**
   * Check permission status
   */
  hasLocationPermission() {
    return this.permissionGranted;
  }

  /**
   * Get permission instructions
   */
  showPermissionInstructions() {
    return {
      title: "High-Accuracy GPS Required",
      message: "For precise hazard reporting, please enable high-accuracy location access:",
      steps: [
        "Ensure you're using HTTPS (secure connection)",
        "Click 'Allow' when your browser asks for location permission",
        "Enable GPS/Location Services in your device settings",
        "For best results, try this outdoors with clear sky view",
        "If using mobile, ensure 'High Accuracy' mode is enabled in location settings"
      ],
      troubleshooting: [
        "If accuracy is poor, move outdoors away from buildings",
        "Wait 30-60 seconds for GPS to acquire satellite lock",
        "Disable WiFi scanning if it's interfering with GPS",
        "Try refreshing the page and allowing location again"
      ]
    };
  }

  /**
   * Get detailed accuracy status
   */
  getAccuracyStatus() {
    const position = this.getCachedPosition();
    if (!position || !position.accuracy) {
      return { status: 'unknown', message: 'Location accuracy unknown' };
    }

    const accuracy = position.accuracy;
    const source = position.source || 'Unknown';

    if (accuracy <= 5) {
      return { status: 'excellent', message: `Excellent GPS accuracy (${source})` };
    } else if (accuracy <= 20) {
      return { status: 'very_good', message: `Very good GPS accuracy (${source})` };
    } else if (accuracy <= 100) {
      return { status: 'good', message: `Good location accuracy (${source})` };
    } else if (accuracy <= 1000) {
      return { status: 'fair', message: `Fair accuracy - WiFi/Cell (${source})` };
    } else if (accuracy <= 10000) {
      return { status: 'poor', message: `Poor accuracy - Cell tower (${source})` };
    } else {
      return { status: 'very_poor', message: `Very poor - Network/IP location (${source})` };
    }
  }

  /**
   * Force GPS refresh with user feedback
   */
  async forceGPSRefresh() {
    console.log('Forcing GPS refresh...');
    this.currentPosition = null;
    this.lastAccuratePosition = null;
    return this.getCurrentPosition({ maximumAge: 0 });
  }

  /**
   * Check device capabilities
   */
  getDeviceCapabilities() {
    return {
      hasGeolocation: 'geolocation' in navigator,
      hasPermissionsAPI: 'permissions' in navigator,
      isSecureContext: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };
  }
}

// Create singleton instance
const locationService = new LocationService();

export default locationService;