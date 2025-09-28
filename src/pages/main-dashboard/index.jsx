import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import BottomTabNavigation from '../../components/ui/BottomTabNavigation';
import AuthenticationGuard from '../../components/ui/AuthenticationGuard';

import MapContainer from './components/MapContainer';
import FilterPanel from './components/FilterPanel';
import StatusOverview from './components/StatusOverview';
import HotspotClusters from './components/HotspotClusters';
import Icon from '../../components/Appicon';
import Button from '../../components/ui/Button';
import authService from '../../utils/authService';
import realTimeService from '../../utils/realTimeService';

const MainDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeView, setActiveView] = useState('map'); // 'map', 'overview', 'hotspots'
  const [filters, setFilters] = useState({
    types: [],
    severity: [],
    timeRange: 24
  });
  const [selectedHazard, setSelectedHazard] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [realTimeStats, setRealTimeStats] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: false });
  const [quickReportData, setQuickReportData] = useState(null);

  // Initialize user and real-time service
  useEffect(() => {
    const currentUser = authService?.getCurrentUser();
    setUser(currentUser);

    if (currentUser) {
      // Start real-time service
      realTimeService?.start();

      // Subscribe to real-time updates
      const unsubscribeStats = realTimeService?.subscribe('dashboardStats', (stats) => {
        setRealTimeStats(stats);
      });

      const unsubscribeReports = realTimeService?.subscribe('reportStatus', (status) => {
        if (status?.hasUpdates) {
          // Show notification or update UI
          console.log('Report statuses updated');
        }
      });

      // Monitor connection status
      const statusInterval = setInterval(() => {
        setConnectionStatus(realTimeService?.getConnectionStatus());
      }, 5000);

      return () => {
        unsubscribeStats();
        unsubscribeReports();
        clearInterval(statusInterval);
        realTimeService?.stop();
      };
    }
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService?.onAuthStateChange((updatedUser) => {
      setUser(updatedUser);
    });

    return unsubscribe;
  }, []);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleMarkerClick = (hazard) => {
    setSelectedHazard(hazard);
  };

  const handleLocationUpdate = (location) => {
    setUserLocation(location);
  };

  // Enhanced quick report handler that can pre-fill data
  const handleQuickReport = (sourceHazard = null) => {
    if (sourceHazard) {
      // Pre-fill report data from hotspot/hazard
      const preFilledData = {
        hazardType: sourceHazard.type,
        location: {
          coordinates: {
            latitude: sourceHazard.lat,
            longitude: sourceHazard.lng
          },
          address: sourceHazard.location || `${sourceHazard.lat.toFixed(4)}, ${sourceHazard.lng.toFixed(4)}`,
          name: sourceHazard.location || 'Similar Location'
        },
        severity: sourceHazard.severity,
        description: sourceHazard.source === 'official' 
          ? `Similar incident near ${sourceHazard.location || 'hotspot location'}. Related to existing ${sourceHazard.type.replace('_', ' ')} hazard in this area.`
          : `Similar incident reported in the same area as previous ${sourceHazard.type.replace('_', ' ')} report.`,
        relatedToHazard: sourceHazard.id,
        isQuickReport: true
      };
      
      // Store pre-filled data and navigate
      localStorage.setItem('quickReportData', JSON.stringify(preFilledData));
      navigate('/report-submission?quick=true');
    } else {
      // Regular quick report
      navigate('/report-submission');
    }
  };

  const handleLogout = async () => {
    try {
      await authService?.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login'); // Force navigation even on error
    }
  };

  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
  };

  const handleClusterClick = (cluster) => {
    console.log('Cluster clicked:', cluster);
    // In real app, this would zoom map to cluster location
  };

  const handleZoomToCluster = (cluster) => {
    console.log('Zoom to cluster:', cluster);
    // In real app, this would center map on cluster
  };

  // Get filtered hazard count for display
  const getFilteredHazardCount = () => {
    const allReports = realTimeService?.getCachedData('hazards') || [];
    return allReports?.filter(hazard => {
      if (filters?.types && filters?.types?.length > 0 && !filters?.types?.includes(hazard?.type)) {
        return false;
      }
      if (filters?.severity && filters?.severity?.length > 0 && !filters?.severity?.includes(hazard?.severity)) {
        return false;
      }
      if (filters?.timeRange) {
        const timestamp = hazard?.timestamp instanceof Date ? hazard?.timestamp : new Date(hazard?.timestamp);
        const hoursDiff = (Date.now() - timestamp?.getTime()) / (1000 * 60 * 60);
        if (hoursDiff > filters?.timeRange) {
          return false;
        }
      }
      return true;
    })?.length;
  };

  const forceRefreshData = () => {
    realTimeService?.forceRefresh();
  };

  return (
    <AuthenticationGuard user={user} requiredRoles={['citizen', 'official', 'analyst']}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header with enhanced user management */}
        <Header user={user} onLogout={handleLogout} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col pt-14 md:pt-16 overflow-hidden">
          <div className="flex flex-1 min-h-0">
            {/* Desktop Filter Panel */}
            <div className="hidden md:block flex-shrink-0">
              <FilterPanel
                filters={filters}
                onFiltersChange={handleFiltersChange}
                isOpen={true}
                resultCount={getFilteredHazardCount()}
                className="h-full"
              />
            </div>

            {/* Mobile Filter Panel */}
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              isOpen={isFilterPanelOpen}
              onToggle={toggleFilterPanel}
              resultCount={getFilteredHazardCount()}
              className="md:hidden"
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Enhanced View Toggle Bar */}
              <div className="bg-card border-b border-border px-3 md:px-4 py-2 flex-shrink-0">
                <div className="flex items-center justify-between max-w-full overflow-hidden">
                  <div className="flex items-center space-x-1 min-w-0 flex-shrink">
                    <Button
                      variant={activeView === 'map' ? 'default' : 'ghost'}
                      size="sm"
                      iconName="Map"
                      iconPosition="left"
                      onClick={() => setActiveView('map')}
                      className="text-xs md:text-sm whitespace-nowrap"
                    >
                      <span className="hidden sm:inline">Live </span>Map
                    </Button>
                    <Button
                      variant={activeView === 'overview' ? 'default' : 'ghost'}
                      size="sm"
                      iconName="BarChart3"
                      iconPosition="left"
                      onClick={() => setActiveView('overview')}
                      className="text-xs md:text-sm"
                    >
                      Overview
                    </Button>
                    <Button
                      variant={activeView === 'hotspots' ? 'default' : 'ghost'}
                      size="sm"
                      iconName="MapPin"
                      iconPosition="left"
                      onClick={() => setActiveView('hotspots')}
                      className="text-xs md:text-sm"
                    >
                      Hotspots
                    </Button>
                  </div>

                  <div className="hidden md:flex items-center space-x-3 flex-shrink-0">
                    {/* Real-time Status */}
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        connectionStatus?.isConnected ? 'bg-success pulse-indicator' : 'bg-error'
                      }`}></div>
                      <span className="text-xs text-muted-foreground">
                        {connectionStatus?.isConnected ? 'Live' : 'Offline'}
                      </span>
                    </div>

                    {/* Refresh Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="RefreshCw"
                      onClick={forceRefreshData}
                      className="text-xs"
                    >
                      Refresh
                    </Button>

                    {/* Last Update Time */}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Updated: {new Date()?.toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Mobile Status Indicator */}
                  <div className="md:hidden flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus?.isConnected ? 'bg-success pulse-indicator' : 'bg-error'
                    }`}></div>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="RefreshCw"
                      onClick={forceRefreshData}
                      className="p-1"
                    />
                  </div>
                </div>
              </div>

              {/* Content Views */}
              <div className="flex-1 overflow-hidden">
                {activeView === 'map' && (
                  <MapContainer
                    filters={filters}
                    onMarkerClick={handleMarkerClick}
                    onLocationUpdate={handleLocationUpdate}
                    onQuickReport={handleQuickReport}
                    showQuickReport={true}
                  />
                )}

                {activeView === 'overview' && (
                  <div className="h-full overflow-y-auto p-3 md:p-4">
                    <StatusOverview realTimeStats={realTimeStats} />
                  </div>
                )}

                {activeView === 'hotspots' && (
                  <div className="h-full overflow-y-auto p-3 md:p-4">
                    <HotspotClusters
                      onClusterClick={handleClusterClick}
                      onZoomToCluster={handleZoomToCluster}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Selected Hazard Details Modal */}
          {selectedHazard && (
            <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedHazard(null)} />
              <div className="relative bg-card border border-border rounded-lg shadow-modal w-full max-w-md max-h-[90vh] overflow-y-auto mx-4">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Hazard Details</h3>
                  <div className="flex items-center space-x-2">
                    {/* Real-time indicator */}
                    <div className="w-2 h-2 bg-success rounded-full pulse-indicator"></div>
                    <Button
                      variant="ghost"
                      size="icon"
                      iconName="X"
                      onClick={() => setSelectedHazard(null)}
                    />
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className={`
                      flex items-center justify-center w-12 h-12 rounded-full
                      ${selectedHazard?.severity === 'critical' ? 'bg-error/10 text-error' :
                        selectedHazard?.severity === 'high' ? 'bg-warning/10 text-warning' :
                        selectedHazard?.severity === 'medium'? 'bg-secondary/10 text-secondary' : 'bg-success/10 text-success'}
                    `}>
                      <Icon 
                        name={selectedHazard?.type === 'tsunami' ? 'Waves' : 
                              selectedHazard?.type === 'flooding' ? 'CloudRain' :
                              selectedHazard?.type === 'high_waves' ? 'Wind' : 'Zap'} 
                        size={24} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground capitalize truncate">
                        {selectedHazard?.type?.replace('_', ' ')}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">{selectedHazard?.location}</p>
                      <p className="text-xs text-primary">
                        {selectedHazard?.source === 'citizen' ? 'Citizen Report' : 'Official Report'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Severity:</span>
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium capitalize
                        ${selectedHazard?.severity === 'critical' ? 'bg-error/10 text-error' :
                          selectedHazard?.severity === 'high' ? 'bg-warning/10 text-warning' :
                          selectedHazard?.severity === 'medium'? 'bg-secondary/10 text-secondary' : 'bg-success/10 text-success'}
                      `}>
                        {selectedHazard?.severity}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <span className="text-sm font-medium text-success">Verified</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Reported:</span>
                      <span className="text-sm text-foreground">
                        {selectedHazard?.timestamp?.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Coordinates:</span>
                      <span className="text-sm text-foreground font-mono">
                        {selectedHazard?.lat?.toFixed(4)}°, {selectedHazard?.lng?.toFixed(4)}°
                      </span>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-foreground mb-2">Description</h5>
                    <p className="text-sm text-muted-foreground">{selectedHazard?.description}</p>
                  </div>

                  {/* Enhanced Action Buttons */}
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        iconName="MapPin"
                        iconPosition="left"
                        onClick={() => {
                          // Navigate to location on map
                          setActiveView('map');
                          setSelectedHazard(null);
                        }}
                        className="flex-1"
                      >
                        View on Map
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        iconName="AlertTriangle"
                        iconPosition="left"
                        onClick={() => {
                          handleQuickReport(selectedHazard);
                        }}
                        className="flex-1"
                      >
                        Report Similar
                      </Button>
                    </div>
                    
                    {/* Smart Quick Report Info */}
                    {selectedHazard?.source === 'official' && (
                      <div className="p-3 bg-blue/10 border border-blue/20 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <Icon name="Lightbulb" size={14} className="text-blue mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-blue">
                            <p className="font-medium mb-1">Smart Quick Report</p>
                            <p>Click "Report Similar" to create a related incident report with location and hazard type pre-filled from this hotspot.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Update Notifications */}
          {realTimeStats?.hasUpdates && (
            <div className="fixed bottom-20 md:bottom-6 right-4 z-150 pointer-events-auto">
              <div className="bg-primary text-white px-4 py-2 rounded-lg shadow-modal flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full pulse-indicator"></div>
                <span className="text-sm">New updates available</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={forceRefreshData}
                  className="text-white hover:bg-white/20 h-6 px-2 text-xs"
                >
                  Refresh
                </Button>
              </div>
            </div>
          )}

          {/* Quick Report Success Notification */}
          {quickReportData && (
            <div className="fixed top-16 md:top-20 right-4 z-150 pointer-events-auto">
              <div className="bg-success text-white px-4 py-3 rounded-lg shadow-modal max-w-sm">
                <div className="flex items-start space-x-2">
                  <Icon name="CheckCircle" size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Quick Report Ready!</p>
                    <p className="text-xs opacity-90">Form pre-filled with hazard location and details.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

      </div>
    </AuthenticationGuard>
  );
};

export default MainDashboard;