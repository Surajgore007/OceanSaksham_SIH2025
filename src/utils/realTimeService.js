/**
 * Real-time Service
 * Handles real-time data updates, report verification status, and live map updates
 */
class RealTimeService {
  constructor() {
    this.listeners = new Map();
    this.reportListeners = new Map();
    this.updateInterval = null;
    this.isActive = false;

    // Live configuration via environment variables
    this.apiBaseUrl = import.meta?.env?.VITE_API_BASE || null;
    this.wsUrl = import.meta?.env?.VITE_REALTIME_WS_URL || null;

    // In-memory cache for live data
    this.cache = {
      hazards: [],
      reports: [],
      dashboardStats: null,
    };

    // WebSocket reference
    this.ws = null;
  }

  /**
   * Start real-time service
   */
  start() {
    if (this.isActive) return;
    this.isActive = true;

    // Prefer real-time WebSocket if provided
    if (this.wsUrl) {
      this.initializeWebSocket();
      // Also perform an initial REST fetch to populate immediately
      if (this.apiBaseUrl) {
        this.fetchAll().catch(() => {});
      }
      console.log('Real-time service started (WebSocket mode)');
      return;
    }

    // Fallback to REST polling if API base is provided
    if (this.apiBaseUrl) {
      this.fetchAll().catch(() => {});
      this.updateInterval = setInterval(() => {
        this.fetchAll().catch(() => {});
      }, 30000);
      console.log('Real-time service started (REST polling mode)');
      return;
    }

    // Final fallback to mock simulation if no live config is present
    this.updateInterval = setInterval(() => {
      this.simulateRealTimeUpdates();
    }, 30000);
    console.log('Real-time service started (mock simulation mode)');
  }

  /**
   * Stop real-time service
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    this.isActive = false;
    console.log('Real-time service stopped');
  }

  /**
   * Initialize WebSocket connection
   */
  initializeWebSocket() {
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.isActive = true;
        // Optionally send a subscription message depending on your backend protocol
        // this.ws.send(JSON.stringify({ type: 'subscribe', channels: ['hazards', 'reports', 'dashboardStats'] }));
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Expected message format: { type: 'hazards'|'reports'|'dashboardStats'|'report', payload: any }
          if (message?.type === 'hazards') {
            this.cache.hazards = Array.isArray(message?.payload) ? message.payload : [];
            this.notifyListeners('hazards', this.cache.hazards);
          } else if (message?.type === 'reports') {
            this.cache.reports = Array.isArray(message?.payload) ? message.payload : [];
            this.notifyListeners('reports', this.cache.reports);
          } else if (message?.type === 'dashboardStats') {
            this.cache.dashboardStats = message?.payload || null;
            this.notifyListeners('dashboardStats', this.cache.dashboardStats);
          } else if (message?.type === 'report') {
            const report = message?.payload;
            if (report?.id) {
              this.notifyReportListeners(report.id, report);
            }
          }
        } catch (err) {
          console.error('WS message parse error:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      this.ws.onclose = () => {
        // Attempt reconnection after a delay
        if (this.isActive) {
          setTimeout(() => this.initializeWebSocket(), 3000);
        }
      };
    } catch (error) {
      console.error('WebSocket init error:', error);
    }
  }

  /**
   * Fetch all data via REST and notify listeners
   */
  async fetchAll() {
    if (!this.apiBaseUrl) return;

    try {
      const [hazardsRes, reportsRes, statsRes] = await Promise.all([
        fetch(`${this.apiBaseUrl.replace(/\/$/, '')}/hazards`),
        fetch(`${this.apiBaseUrl.replace(/\/$/, '')}/reports`),
        fetch(`${this.apiBaseUrl.replace(/\/$/, '')}/dashboard/stats`),
      ]);

      const [hazards, reports, stats] = await Promise.all([
        hazardsRes.ok ? hazardsRes.json() : [],
        reportsRes.ok ? reportsRes.json() : [],
        statsRes.ok ? statsRes.json() : null,
      ]);

      this.cache.hazards = Array.isArray(hazards) ? hazards : [];
      this.cache.reports = Array.isArray(reports) ? reports : [];
      this.cache.dashboardStats = stats;

      this.notifyListeners('hazards', this.cache.hazards);
      this.notifyListeners('reports', this.cache.reports);
      if (this.cache.dashboardStats) {
        this.notifyListeners('dashboardStats', this.cache.dashboardStats);
      }
    } catch (error) {
      console.error('Live fetch error:', error);
    }
  }

  /**
   * Subscribe to real-time updates for specific data type
   */
  subscribe(dataType, callback) {
    if (!this.listeners?.has(dataType)) {
      this.listeners?.set(dataType, new Set());
    }
    
    this.listeners?.get(dataType)?.add(callback);
    
    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners?.get(dataType);
      if (typeListeners) {
        typeListeners?.delete(callback);
        if (typeListeners?.size === 0) {
          this.listeners?.delete(dataType);
        }
      }
    };
  }

  /**
   * Subscribe to specific report updates
   */
  subscribeToReport(reportId, callback) {
    if (!this.reportListeners?.has(reportId)) {
      this.reportListeners?.set(reportId, new Set());
    }
    
    this.reportListeners?.get(reportId)?.add(callback);
    
    // Return unsubscribe function
    return () => {
      const reportCallbacks = this.reportListeners?.get(reportId);
      if (reportCallbacks) {
        reportCallbacks?.delete(callback);
        if (reportCallbacks?.size === 0) {
          this.reportListeners?.delete(reportId);
        }
      }
    };
  }

  /**
   * Notify listeners of data updates
   */
  notifyListeners(dataType, data) {
    const typeListeners = this.listeners?.get(dataType);
    if (typeListeners) {
      typeListeners?.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${dataType} listener:`, error);
        }
      });
    }
  }

  /**
   * Notify report-specific listeners
   */
  notifyReportListeners(reportId, data) {
    const reportCallbacks = this.reportListeners?.get(reportId);
    if (reportCallbacks) {
      reportCallbacks?.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in report ${reportId} listener:`, error);
        }
      });
    }
  }

  /**
   * Simulate real-time updates (in production, this would be actual WebSocket/SSE)
   */
  simulateRealTimeUpdates() {
    // Simulate report status changes
    this.simulateReportStatusUpdates();
    
    // Simulate new hazard reports
    this.simulateNewHazardReports();
    
    // Simulate verification updates
    this.simulateVerificationUpdates();
  }

  /**
   * Simulate report status updates
   */
  simulateReportStatusUpdates() {
    const userReports = JSON.parse(localStorage.getItem('userReports') || '[]');
    let hasUpdates = false;

    userReports?.forEach(report => {
      // Randomly update pending reports to verified
      if (report?.status === 'pending' && Math.random() < 0.1) { // 10% chance
        const previousStatus = report?.status;
        report.status = Math.random() < 0.8 ? 'verified' : 'rejected';
        report.verifiedAt = new Date()?.toISOString();
        report.verifiedBy = 'official_' + Math.floor(Math.random() * 100);
        
        hasUpdates = true;

        // Notify specific report listeners
        this.notifyReportListeners(report?.id, {
          ...report,
          previousStatus,
          updatedAt: new Date()?.toISOString()
        });
      }
    });

    if (hasUpdates) {
      localStorage.setItem('userReports', JSON.stringify(userReports));
      this.notifyListeners('reports', userReports);
      this.notifyListeners('reportStatus', { 
        timestamp: new Date()?.toISOString(),
        hasUpdates: true 
      });
    }
  }

  /**
   * Simulate new hazard reports appearing on map
   */
  simulateNewHazardReports() {
    // Get existing hazard data
    const existingHazards = JSON.parse(localStorage.getItem('hazardReports') || '[]');
    
    // Occasionally add new verified reports to the map
    if (Math.random() < 0.05) { // 5% chance every 30 seconds
      const hazardTypes = ['tsunami', 'flooding', 'high_waves', 'storm_surge'];
      const severityLevels = ['low', 'medium', 'high', 'critical'];
      const locations = [
        { lat: 19.0760, lng: 72.8777, name: 'Mumbai Coast' },
        { lat: 13.0827, lng: 80.2707, name: 'Chennai Coast' },
        { lat: 15.2993, lng: 74.1240, name: 'Goa Coastline' },
        { lat: 11.9416, lng: 79.8083, name: 'Puducherry Beach' },
        { lat: 22.5726, lng: 88.3639, name: 'Kolkata Port' }
      ];

      const randomLocation = locations?.[Math.floor(Math.random() * locations?.length)];
      const newHazard = {
        id: `hazard_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: hazardTypes?.[Math.floor(Math.random() * hazardTypes?.length)],
        severity: severityLevels?.[Math.floor(Math.random() * severityLevels?.length)],
        lat: randomLocation?.lat + (Math.random() - 0.5) * 0.1, // Add small variation
        lng: randomLocation?.lng + (Math.random() - 0.5) * 0.1,
        location: randomLocation?.name,
        timestamp: new Date(),
        description: 'Real-time hazard update from coastal monitoring',
        reportedBy: 'Automated System',
        status: 'verified',
        priority: 'normal'
      };

      const updatedHazards = [...existingHazards, newHazard];
      localStorage.setItem('hazardReports', JSON.stringify(updatedHazards));

      // Notify map listeners
      this.notifyListeners('hazards', updatedHazards);
      this.notifyListeners('newHazard', newHazard);
    }
  }

  /**
   * Simulate verification updates from officials
   */
  simulateVerificationUpdates() {
    // Simulate dashboard statistics updates
    const stats = {
      totalReports: Math.floor(Math.random() * 50) + 150,
      verifiedReports: Math.floor(Math.random() * 30) + 120,
      pendingReports: Math.floor(Math.random() * 20) + 10,
      criticalAlerts: Math.floor(Math.random() * 5) + 2,
      lastUpdated: new Date()?.toISOString()
    };

    this.notifyListeners('dashboardStats', stats);
  }

  /**
   * Update report status (called when official verifies)
   */
  async updateReportStatus(reportId, newStatus, officialId) {
    // If live API is available, prefer updating the backend
    if (this.apiBaseUrl) {
      try {
        const res = await fetch(`${this.apiBaseUrl.replace(/\/$/, '')}/reports/${encodeURIComponent(reportId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, verifiedBy: officialId }),
        });
        if (res.ok) {
          await this.fetchAll();
          return;
        }
      } catch (e) {
        console.error('Live updateReportStatus error; falling back to local:', e);
      }
    }

    const userReports = JSON.parse(localStorage.getItem('oceansaksham_col_userReports') || localStorage.getItem('userReports') || '[]');
    const allReports = JSON.parse(localStorage.getItem('oceansaksham_col_hazardReports') || localStorage.getItem('hazardReports') || '[]');
    
    let updated = false;

    // Update in user reports
    const userReportIndex = userReports?.findIndex(r => r?.id === reportId);
    if (userReportIndex !== -1) {
      const previousStatus = userReports?.[userReportIndex]?.status;
      userReports[userReportIndex] = {
        ...userReports?.[userReportIndex],
        status: newStatus,
        verifiedAt: new Date()?.toISOString(),
        verifiedBy: officialId,
        previousStatus
      };
      updated = true;
    }

    // Update in all hazard reports
    const allReportIndex = allReports?.findIndex(r => r?.id === reportId);
    if (allReportIndex !== -1) {
      allReports[allReportIndex].status = newStatus;
      allReports[allReportIndex].verifiedAt = new Date()?.toISOString();
      allReports[allReportIndex].verifiedBy = officialId;
      updated = true;
    }

    if (updated) {
      // Prefer namespaced collections
      localStorage.setItem('oceansaksham_col_userReports', JSON.stringify(userReports));
      localStorage.setItem('oceansaksham_col_hazardReports', JSON.stringify(allReports));

      // Notify all relevant listeners
      this.notifyReportListeners(reportId, userReports?.[userReportIndex]);
      this.notifyListeners('reports', userReports);
      this.notifyListeners('hazards', allReports);
      this.notifyListeners('reportVerification', {
        reportId,
        newStatus,
        officialId,
        timestamp: new Date()?.toISOString()
      });
    }
  }

  /**
   * Get real-time connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isActive,
      lastUpdate: new Date()?.toISOString(),
      activeListeners: this.listeners?.size
    };
  }

  /**
   * Force refresh all data
   */
  forceRefresh() {
    if (this.apiBaseUrl) {
      this.fetchAll().catch(() => this.simulateRealTimeUpdates());
      return;
    }
    this.simulateRealTimeUpdates();
  }

  /**
   * Get cached data
   */
  getCachedData(dataType) {
    switch (dataType) {
      case 'reports':
        return this.cache.reports?.length ? this.cache.reports : JSON.parse(localStorage.getItem('oceansaksham_col_userReports') || localStorage.getItem('userReports') || '[]');
      case 'hazards':
        return this.cache.hazards?.length ? this.cache.hazards : JSON.parse(localStorage.getItem('oceansaksham_col_hazardReports') || localStorage.getItem('hazardReports') || '[]');
      case 'dashboardStats':
        return this.cache.dashboardStats;
      default:
        return null;
    }
  }
}

// Create singleton instance
const realTimeService = new RealTimeService();

export default realTimeService;