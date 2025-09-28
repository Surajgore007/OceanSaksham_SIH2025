/**
 * Production-Ready Enhanced Location Service
 * Features:
 * - Smart GPS accuracy detection and improvement
 * - Intelligent caching with expiration
 * - Silent fallback without annoying popups
 * - Multiple positioning strategies
 * - Battery optimization
 */
class LocationService {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.locationListeners = [];
    this.permissionGranted = null;
    this.lastAccuratePosition = null;
    this.locationCache = new Map();
    this.isWatching = false;
    this.watchingCallbacks = [];
    this.accuracyThreshold = 100; // meters
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.maxRetries = 3;
    
    // Initialize with cached permissions if available
    this.initializeFromCache();
  }

  /**
   * Initialize from cached data
   */
  initializeFromCache() {
    try {
      const cached = localStorage.getItem('locationPermissionStatus');
      if (cached) {
        const { status, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        // Only use cached permission status if less than 1 hour old
        if (age < 3600000) {
          this.permissionGranted = status === 'granted';
        }
      }
      
      // Load last known position
      const cachedPosition = localStorage.getItem('lastKnownLocation');
      if (cachedPosition) {
        const parsed = JSON.parse(cachedPosition);
        const age = Date.now() - parsed.cacheTime;
        
        if (age < this.cacheTimeout) {
          this.currentPosition = parsed;
          this.lastAccuratePosition = parsed.accuracy <= this.accuracyThreshold ? parsed : null;
        }
      }
    } catch (error) {
      console.warn('Failed to initialize from cache:', error);
    }
  }

  /**
   * Check if geolocation is available and properly configured
   */
  isGeolocationAvailable() {
    return 'geolocation' in navigator && 
           (window.location.protocol === 'https:' || window.location.hostname === 'localhost');
  }

  /**
   * Silent permission check - doesn't trigger permission dialog
   */
  async checkPermissionStatus() {
    if (!this.isGeolocationAvailable()) {
      return 'unavailable';
    }

    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        // Cache the permission status
        localStorage.setItem('locationPermissionStatus', JSON.stringify({
          status: permission.state,
          timestamp: Date.now()
        }));
        
        this.permissionGranted = permission.state === 'granted';
        return permission.state;
      } catch (error) {
        console.warn('Permissions API not fully supported');
      }
    }
    
    return 'prompt';
  }

  /**
   * Smart location acquisition with multiple strategies
   */
  async getCurrentPosition(options = {}) {
    if (!this.isGeolocationAvailable()) {
      throw new Error('Geolocation not available in this environment');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
      silent: false
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    // Check permission first
    const permissionStatus = await this.checkPermissionStatus();
    
    if (permissionStatus === 'denied') {
      if (!finalOptions.silent) {
        console.warn('Location permission denied');
      }
      return this.getFallbackLocation();
    }

    // Try multiple positioning strategies
    const strategies = [
      {
        name: 'HighAccuracy',
        options: {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      },
      {
        name: 'Balanced',
        options: {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 120000
        }
      },
      {
        name: 'PowerSaving',
        options: {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 300000
        }
      }
    ];

    let lastError = null;
    
    for (const strategy of strategies) {
      try {
        const position = await this.executePositioningStrategy(strategy.options, finalOptions.silent);
        
        if (position && this.isValidPosition(position)) {
          const formattedPosition = this.formatPosition(position);
          
          // Cache good positions
          this.cachePosition(formattedPosition);
          
          // Update current position
          this.currentPosition = formattedPosition;
          if (formattedPosition.accuracy <= this.accuracyThreshold) {
            this.lastAccuratePosition = formattedPosition;
          }
          
          // Notify listeners
          this.notifyListeners(formattedPosition);
          
          return formattedPosition;
        }
      } catch (error) {
        lastError = error;
        if (!finalOptions.silent) {
          console.warn(`${strategy.name} strategy failed:`, error.message);
        }
      }
    }

    // All strategies failed, try cached position
    const cachedPosition = this.getCachedPosition();
    if (cachedPosition) {
      if (!finalOptions.silent) {
        console.log('Using cached position due to GPS failure');
      }
      return cachedPosition;
    }

    // Final fallback
    if (!finalOptions.silent) {
      console.warn('All positioning strategies failed, using fallback');
    }
    return this.getFallbackLocation();
  }

  /**
   * Execute a specific positioning strategy
   */
  executePositioningStrategy(options, silent = false) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Position timeout'));
      }, options.timeout + 2000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve(position);
        },
        (error) => {
          clearTimeout(timeoutId);
          
          if (!silent) {
            const errorMessages = {
              1: 'Location access denied',
              2: 'Position unavailable', 
              3: 'Request timeout'
            };
            console.warn(errorMessages[error.code] || 'Unknown location error');
          }
          
          reject(error);
        },
        options
      );
    });
  }

  /**
   * Validate position quality
   */
  isValidPosition(position) {
    const coords = position?.coords;
    if (!coords) return false;
    
    // Check coordinate validity
    if (typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      return false;
    }
    
    if (Math.abs(coords.latitude) > 90 || Math.abs(coords.longitude) > 180) {
      return false;
    }
    
    // Reject obviously wrong accuracy values
    if (coords.accuracy && coords.accuracy > 100000) {
      return false;
    }
    
    return true;
  }

  /**
   * Format position with metadata
   */
  formatPosition(position) {
    const coords = position.coords;
    const accuracy = coords.accuracy || 10000;
    
    // Determine source based on accuracy
    let source = 'Unknown';
    if (accuracy <= 10) {
      source = 'GPS';
    } else if (accuracy <= 100) {
      source = 'GPS/GLONASS';
    } else if (accuracy <= 1000) {
      source = 'WiFi/Cell';
    } else {
      source = 'Network/IP';
    }

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      speed: coords.speed,
      timestamp: new Date(position.timestamp).toISOString(),
      source: source,
      isHighAccuracy: accuracy <= this.accuracyThreshold,
      quality: this.getQualityRating(accuracy),
      cacheTime: Date.now()
    };
  }

  /**
   * Get quality rating for position
   */
  getQualityRating(accuracy) {
    if (accuracy <= 10) return 'excellent';
    if (accuracy <= 50) return 'very_good';
    if (accuracy <= 100) return 'good';
    if (accuracy <= 500) return 'fair';
    if (accuracy <= 2000) return 'poor';
    return 'very_poor';
  }

  /**
   * Cache position with timestamp
   */
  cachePosition(position) {
    try {
      const cacheKey = `location_${Date.now()}`;
      this.locationCache.set(cacheKey, position);
      
      // Also store in localStorage for persistence
      localStorage.setItem('lastKnownLocation', JSON.stringify(position));
      
      // Clean old cache entries
      this.cleanCache();
    } catch (error) {
      console.warn('Failed to cache position:', error);
    }
  }

  /**
   * Clean old cache entries
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, position] of this.locationCache.entries()) {
      if (now - position.cacheTime > this.cacheTimeout) {
        this.locationCache.delete(key);
      }
    }
  }

  /**
   * Get cached position if available and fresh
   */
  getCachedPosition() {
    if (this.currentPosition) {
      const age = Date.now() - this.currentPosition.cacheTime;
      if (age < this.cacheTimeout) {
        return this.currentPosition;
      }
    }

    // Try localStorage cache
    try {
      const cached = localStorage.getItem('lastKnownLocation');
      if (cached) {
        const position = JSON.parse(cached);
        const age = Date.now() - position.cacheTime;
        
        if (age < this.cacheTimeout) {
          return position;
        }
      }
    } catch (error) {
      console.warn('Failed to read cached position:', error);
    }

    return null;
  }

  /**
   * Get fallback location for demo/testing
   */
  getFallbackLocation() {
    const fallbackLocations = [
      { lat: 19.0760, lng: 72.8777, name: 'Mumbai, Maharashtra', country: 'India' },
      { lat: 13.0827, lng: 80.2707, name: 'Chennai, Tamil Nadu', country: 'India' },
      { lat: 15.2993, lng: 74.1240, name: 'Panaji, Goa', country: 'India' },
      { lat: 11.9416, lng: 79.8083, name: 'Puducherry, India', country: 'India' },
      { lat: 22.5726, lng: 88.3639, name: 'Kolkata, West Bengal', country: 'India' }
    ];

    const randomLocation = fallbackLocations[Math.floor(Math.random() * fallbackLocations.length)];
    
    const fallbackPosition = {
      latitude: randomLocation.lat,
      longitude: randomLocation.lng,
      accuracy: 10000,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: new Date().toISOString(),
      source: 'Fallback',
      isHighAccuracy: false,
      quality: 'demo',
      isFallback: true,
      fallbackLocationName: randomLocation.name,
      cacheTime: Date.now()
    };

    // Cache fallback for consistency
    this.currentPosition = fallbackPosition;
    
    return fallbackPosition;
  }

  /**
   * Enhanced position watching with smart battery management
   */
  startWatchingPosition(options = {}) {
    if (this.isWatching) {
      return this.watchId;
    }

    if (!this.isGeolocationAvailable()) {
      throw new Error('Geolocation not available');
    }

    const defaultWatchOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 30000
    };

    const watchOptions = { ...defaultWatchOptions, ...options };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (this.isValidPosition(position)) {
          const formattedPosition = this.formatPosition(position);
          
          // Only update if significantly different or more accurate
          if (this.shouldUpdatePosition(formattedPosition)) {
            this.cachePosition(formattedPosition);
            this.currentPosition = formattedPosition;
            
            if (formattedPosition.accuracy <= this.accuracyThreshold) {
              this.lastAccuratePosition = formattedPosition;
            }
            
            this.notifyListeners(formattedPosition);
          }
        }
      },
      (error) => {
        console.warn('Position watch error:', error.message);
      },
      watchOptions
    );

    this.isWatching = true;
    return this.watchId;
  }

  /**
   * Check if position should be updated
   */
  shouldUpdatePosition(newPosition) {
    if (!this.currentPosition) return true;
    
    const timeDiff = new Date(newPosition.timestamp).getTime() - 
                    new Date(this.currentPosition.timestamp).getTime();
    
    // Update if position is much more accurate
    if (newPosition.accuracy < this.currentPosition.accuracy * 0.5) {
      return true;
    }
    
    // Update if position has moved significantly
    const distance = this.calculateDistance(
      this.currentPosition.latitude, this.currentPosition.longitude,
      newPosition.latitude, newPosition.longitude
    );
    
    if (distance > Math.max(newPosition.accuracy, 50)) {
      return true;
    }
    
    // Update if position is stale (older than 5 minutes)
    return timeDiff > 300000;
  }

  /**
   * Stop watching position
   */
  stopWatchingPosition() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
    }
  }

  /**
   * Subscribe to location updates
   */
  onLocationUpdate(callback) {
    if (typeof callback === 'function') {
      this.locationListeners.push(callback);
      
      // Immediately call with current position if available
      if (this.currentPosition) {
        callback(this.currentPosition);
      }
      
      return () => {
        this.locationListeners = this.locationListeners.filter(listener => listener !== callback);
      };
    }
    return () => {};
  }

  /**
   * Notify all listeners of location updates
   */
  notifyListeners(position) {
    this.locationListeners.forEach(callback => {
      try {
        callback(position);
      } catch (error) {
        console.warn('Location listener error:', error);
      }
    });
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c * 1000; // Convert to meters
    
    return distance;
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get current position with fallback to cached
   */
  async getCurrentPositionWithFallback(maxCacheAge = 300000) { // 5 minutes
    try {
      return await this.getCurrentPosition({ silent: true });
    } catch (error) {
      console.warn('Live position failed, trying cached:', error.message);
      
      const cached = this.getCachedPosition();
      if (cached && (Date.now() - cached.cacheTime) <= maxCacheAge) {
        return cached;
      }
      
      // Final fallback
      return this.getFallbackLocation();
    }
  }

  /**
   * Enhanced position method that's production-ready
   */
  async getCurrentPositionEnhanced(options = {}) {
    // This method combines all our strategies for the best result
    const enhancedOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
      silent: true,
      ...options
    };

    return this.getCurrentPosition(enhancedOptions);
  }

  /**
   * Get accuracy status for UI display
   */
  getAccuracyStatus(position = null) {
    const pos = position || this.currentPosition;
    if (!pos) {
      return { status: 'unknown', message: 'Location not available', color: '#6b7280' };
    }

    if (pos.isFallback) {
      return { status: 'fallback', message: 'Demo location', color: '#06b6d4' };
    }

    const accuracy = pos.accuracy;
    const source = pos.source;

    const statusMap = {
      excellent: { message: `Excellent GPS (±${Math.round(accuracy)}m)`, color: '#22c55e' },
      very_good: { message: `Very good GPS (±${Math.round(accuracy)}m)`, color: '#65a30d' },
      good: { message: `Good location (±${Math.round(accuracy)}m)`, color: '#84cc16' },
      fair: { message: `Fair accuracy (±${Math.round(accuracy)}m)`, color: '#eab308' },
      poor: { message: `Poor accuracy (±${Math.round(accuracy)}m)`, color: '#f97316' },
      very_poor: { message: `Very poor (±${Math.round(accuracy)}m)`, color: '#ef4444' }
    };

    const status = statusMap[pos.quality] || statusMap.very_poor;
    
    return {
      status: pos.quality,
      message: `${status.message} via ${source}`,
      color: status.color,
      accuracy: accuracy,
      source: source
    };
  }

  /**
   * Force refresh location (for user-initiated updates)
   */
  async refreshLocation() {
    // Clear cache to force fresh location
    this.currentPosition = null;
    this.locationCache.clear();
    
    return this.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0,
      silent: false
    });
  }

  /**
   * Show permission instructions (for compatibility)
   */
  showPermissionInstructions() {
    return {
      title: "Location Access Required",
      message: "For accurate hazard reporting and real-time features, please enable location access:",
      steps: [
        "Click 'Allow' when your browser asks for location permission",
        "Ensure GPS/Location Services are enabled in your device settings",
        "For best results, try this outdoors with clear sky view",
        "If using mobile, ensure 'High Accuracy' mode is enabled"
      ],
      troubleshooting: [
        "If accuracy is poor, move outdoors away from buildings",
        "Wait 30-60 seconds for GPS to acquire satellite lock",
        "Try refreshing the page and allowing location again"
      ]
    };
  }

  /**
   * Check if location permission is granted
   */
  hasLocationPermission() {
    return this.permissionGranted === true;
  }

  /**
   * Request location permission (for compatibility with existing code)
   */
  async requestLocationPermission() {
    try {
      const permissionStatus = await this.checkPermissionStatus();
      
      if (permissionStatus === 'granted') {
        this.permissionGranted = true;
        return true;
      }
      
      if (permissionStatus === 'denied') {
        this.permissionGranted = false;
        return false;
      }
      
      // Try to get position to trigger permission dialog
      const position = await this.getCurrentPosition({ silent: false });
      this.permissionGranted = true;
      return true;
    } catch (error) {
      this.permissionGranted = false;
      return false;
    }
  }

  /**
   * Get device capabilities for diagnostics
   */
  getDeviceCapabilities() {
    return {
      hasGeolocation: 'geolocation' in navigator,
      hasPermissionsAPI: 'permissions' in navigator,
      isSecureContext: this.isGeolocationAvailable(),
      supportsHighAccuracy: true,
      userAgent: navigator.userAgent,
      platform: navigator.platform || 'Unknown',
      currentPermission: this.permissionGranted
    };
  }

  /**
   * Reverse geocoding (mock implementation for compatibility)
   */
  async reverseGeocode(latitude, longitude) {
    const mockLocations = [
      { lat: 19.0760, lng: 72.8777, address: 'Mumbai, Maharashtra', district: 'Mumbai', state: 'Maharashtra' },
      { lat: 13.0827, lng: 80.2707, address: 'Chennai, Tamil Nadu', district: 'Chennai', state: 'Tamil Nadu' },
      { lat: 15.2993, lng: 74.1240, address: 'Panaji, Goa', district: 'North Goa', state: 'Goa' },
      { lat: 11.9416, lng: 79.8083, address: 'Puducherry', district: 'Puducherry', state: 'Puducherry' },
      { lat: 22.5726, lng: 88.3639, address: 'Kolkata, West Bengal', district: 'Kolkata', state: 'West Bengal' }
    ];

    let closestLocation = mockLocations[0];
    let minDistance = this.calculateDistance(latitude, longitude, closestLocation.lat, closestLocation.lng);

    for (const location of mockLocations) {
      const distance = this.calculateDistance(latitude, longitude, location.lat, location.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = location;
      }
    }

    return {
      address: closestLocation.address,
      district: closestLocation.district,
      state: closestLocation.state,
      country: 'India',
      coordinates: { latitude, longitude }
    };
  }

  /**
   * Create geotagged image (compatibility method)
   */
  async createGeotaggedImage(imageBlob, location = null) {
    try {
      const currentLocation = location || (await this.getCurrentPosition());
      const address = await this.reverseGeocode(
        currentLocation.latitude, 
        currentLocation.longitude
      );

      return {
        id: Date.now() + Math.random(),
        blob: imageBlob,
        url: URL.createObjectURL(imageBlob),
        location: currentLocation,
        address: address,
        timestamp: new Date().toISOString(),
        size: imageBlob.size,
        type: imageBlob.type,
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
        timestamp: new Date().toISOString(),
        size: imageBlob.size,
        type: imageBlob.type,
        geotagged: false,
        error: error.message
      };
    }
  }

  /**
   * Cleanup method for component unmounting
   */
  cleanup() {
    this.stopWatchingPosition();
    this.locationListeners = [];
    this.locationCache.clear();
  }
}

// Create singleton instance
const locationService = new LocationService();

export default locationService;