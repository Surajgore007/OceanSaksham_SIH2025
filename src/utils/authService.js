

/**
 * Authentication Service
 * Handles login, logout, and authentication state management
 */
class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
  }

  /**
   * Subscribe to authentication state changes
   */
  onAuthStateChange(callback) {
    this.listeners?.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners?.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all listeners of auth state changes
   */
  notifyListeners(user) {
    this.listeners?.forEach(callback => callback(user));
  }

  /**
   * Enhanced login with location access
   */
  async login(credentials) {
    try {
      const { emailOrPhone, password, role } = credentials;
      
      // Mock credentials validation
      const mockCredentials = {
        citizen: {
          email: 'citizen@oceansaksham.gov.in',
          phone: '9876543210',
          password: 'citizen123'
        },
        official: {
          email: 'official@oceansaksham.gov.in',
          phone: '9876543211',
          password: 'official123'
        },
        analyst: {
          email: 'analyst@oceansaksham.gov.in',
          phone: '9876543212',
          password: 'analyst123'
        }
      };

      const roleCredentials = mockCredentials?.[role];

      // Also allow credentials saved via registration flow
      let registeredCredentials = null;
      try {
        const saved = localStorage.getItem(`oceansaksham_credentials_${role}`);
        registeredCredentials = saved ? JSON.parse(saved) : null;
      } catch {}

      const matchesMock = (
        (emailOrPhone === roleCredentials?.email || emailOrPhone === roleCredentials?.phone) &&
        password === roleCredentials?.password
      );

      const matchesRegistered = registeredCredentials ? (
        (emailOrPhone === registeredCredentials?.email || emailOrPhone === registeredCredentials?.phone) &&
        password === registeredCredentials?.password
      ) : false;

      const isValidCredentials = matchesMock || matchesRegistered;

      if (!isValidCredentials) {
        throw new Error('Invalid credentials. Please check your email/phone and password.');
      }

      // Request location permission immediately after successful login
      let location = null;
      try {
        location = await this.requestLocationPermission();
      } catch (locationError) {
        console.warn('Location permission denied:', locationError);
        // Don't fail login if location is denied, but log it
      }

      // Create user object with location data
      const user = {
        id: `user_${role}_${Date.now()}`,
        name: role === 'citizen' ? 'Rajesh Kumar' : 
              role === 'official' ? 'Dr. Priya Sharma' : 'Arun Patel',
        email: roleCredentials?.email,
        phone: roleCredentials?.phone,
        role: role,
        avatar: `https://randomuser.me/api/portraits/${role === 'official' ? 'women' : 'men'}/${Math.floor(Math.random() * 50) + 1}.jpg`,
        location: location || {
          state: role === 'citizen' ? 'Tamil Nadu' : 
                 role === 'official' ? 'Kerala' : 'Gujarat',
          district: role === 'citizen' ? 'Chennai' : 
                   role === 'official' ? 'Kochi' : 'Ahmedabad'
        },
        coordinates: location?.coordinates || null,
        permissions: role === 'citizen' ? ['report_hazard', 'view_alerts'] :
                    role === 'official' ? ['verify_reports', 'manage_alerts', 'create_hotspots'] :
                    ['view_analytics', 'export_data', 'verify_reports'],
        loginTime: new Date()?.toISOString(),
        isActive: true,
        hasLocationAccess: !!location
      };

      // Store authentication data
      localStorage.setItem('oceanSaksham_user', JSON.stringify(user));
      localStorage.setItem('oceanSaksham_token', `jwt_token_${user?.id}`);
      localStorage.setItem('oceanSaksham_loginTime', user?.loginTime);

      this.currentUser = user;
      this.notifyListeners(user);

      return { success: true, user, hasLocation: !!location };
    } catch (error) {
      throw new Error(error.message || 'Login failed. Please try again.');
    }
  }

  /**
   * Request location permission and get current position
   */
  async requestLocationPermission() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          let location = {
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            },
            address: null, // Would be reverse geocoded in real app
            timestamp: new Date().toISOString()
          };
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Location access denied';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  /**
   * Enhanced logout with cleanup
   */
  async logout() {
    try {
      // Clear all authentication data
      localStorage.removeItem('oceanSaksham_user');
      localStorage.removeItem('oceanSaksham_token');
      localStorage.removeItem('oceanSaksham_loginTime');
      
      // Clear any cached data
      localStorage.removeItem('reportSubmission_draft');
      localStorage.removeItem('userReports');
      localStorage.removeItem('hazardReports');
      
      // Clear session storage
      sessionStorage.clear();

      this.currentUser = null;
      this.notifyListeners(null);

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if there's an error
      this.currentUser = null;
      this.notifyListeners(null);
      return { success: true };
    }
  }

  /**
   * Get current user from storage
   */
  getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const savedUser = localStorage.getItem('oceanSaksham_user');
      const savedToken = localStorage.getItem('oceanSaksham_token');
      
      if (savedUser && savedToken) {
        const user = JSON.parse(savedUser);
        
        // Check if session is still valid (24 hours)
        const loginTime = new Date(user.loginTime);
        const now = new Date();
        const hoursDiff = (now?.getTime() - loginTime?.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
          // Session expired
          this.logout();
          return null;
        }

        this.currentUser = user;
        return user;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      this.logout();
    }

    return null;
  }

  /**
   * Update user location
   */
  async updateUserLocation() {
    if (!this.currentUser) return null;

    try {
      let location = await this.requestLocationPermission();
      
      const updatedUser = {
        ...this.currentUser,
        coordinates: location?.coordinates,
        hasLocationAccess: true,
        lastLocationUpdate: new Date()?.toISOString()
      };

      localStorage.setItem('oceanSaksham_user', JSON.stringify(updatedUser));
      this.currentUser = updatedUser;
      this.notifyListeners(updatedUser);

      return location;
    } catch (error) {
      console.error('Location update error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getCurrentUser();
  }

  /**
   * Check if user has specific role
   */
  hasRole(requiredRoles) {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles?.includes(user?.role);
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;