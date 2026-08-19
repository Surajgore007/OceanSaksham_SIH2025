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
import { useTranslation } from '../../context/LanguageContext';

const MainDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => authService?.getCurrentUser());
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
        if (typeof unsubscribeStats === 'function') unsubscribeStats();
        if (typeof unsubscribeReports === 'function') unsubscribeReports();
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
    // Verify sourceHazard is an actual hazard object and not a synthetic DOM click event
    const isActualHazard = sourceHazard && 
      typeof sourceHazard === 'object' && 
      !sourceHazard.nativeEvent && 
      !sourceHazard.target && 
      (sourceHazard.lat != null || sourceHazard.latitude != null || sourceHazard.type || sourceHazard.hazardType);

    if (isActualHazard) {
      const lat = Number(sourceHazard.lat ?? sourceHazard.latitude ?? 0);
      const lng = Number(sourceHazard.lng ?? sourceHazard.longitude ?? 0);
      const hazardType = sourceHazard.type || sourceHazard.hazardType || 'high_waves';
      const locName = sourceHazard.location || `${lat ? lat.toFixed(4) : '0.0000'}, ${lng ? lng.toFixed(4) : '0.0000'}`;

      // Pre-fill report data from hotspot/hazard
      const preFilledData = {
        hazardType: hazardType,
        location: {
          coordinates: {
            latitude: lat,
            longitude: lng,
            lat: lat,
            lng: lng
          },
          address: locName,
          name: locName
        },
        severity: sourceHazard.severity || 'medium',
        description: sourceHazard.source === 'official' 
          ? `Similar incident near ${locName}. Related to existing ${hazardType.replace('_', ' ')} hazard in this area.`
          : `Similar incident reported in the same area as previous ${hazardType.replace('_', ' ')} report.`,
        relatedToHazard: sourceHazard.id || null,
        isQuickReport: true
      };
      
      // Store pre-filled data and navigate
      localStorage.setItem('quickReportData', JSON.stringify(preFilledData));
      navigate('/report-submission?quick=true');
    } else {
      // Regular quick report
      localStorage.removeItem('quickReportData');
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
        const rawTime = hazard?.timestamp;
        const timestamp = rawTime instanceof Date ? rawTime : new Date(rawTime || Date.now());
        const timeVal = !isNaN(timestamp?.getTime?.()) ? timestamp.getTime() : Date.now();
        const hoursDiff = (Date.now() - timeVal) / (1000 * 60 * 60);
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
    <AuthenticationGuard user={user} requiredRoles={['citizen', 'official']}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top App Header */}
        <Header user={user} onLogout={handleLogout} />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col pt-16 pb-16 md:pb-0 overflow-hidden bg-slate-50">
          {/* Unified Action & View Switcher Bar */}
          <div className="bg-white border-b border-slate-200 px-2 sm:px-4 md:px-6 py-2 flex-shrink-0 shadow-xs">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 max-w-7xl mx-auto">
              {/* Segmented View Switcher */}
              <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar max-w-[calc(100%-110px)] sm:max-w-none">
                <button
                  type="button"
                  onClick={() => setActiveView('map')}
                  className={`
                    flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap
                    ${activeView === 'map'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }
                  `}
                >
                  <Icon name="Map" size={13} />
                  <span>{t('liveMap', 'Live Map')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('overview')}
                  className={`
                    flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap
                    ${activeView === 'overview'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }
                  `}
                >
                  <Icon name="BarChart3" size={13} />
                  <span>{t('overview', 'Overview')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('hotspots')}
                  className={`
                    flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap
                    ${activeView === 'hotspots'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }
                  `}
                >
                  <Icon name="MapPin" size={13} />
                  <span>{t('hotspots', 'Hotspots')}</span>
                </button>
              </div>

              {/* Action Controls & Live Status */}
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                {/* Filter Toggle Button */}
                <button
                  type="button"
                  onClick={toggleFilterPanel}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                    ${isFilterPanelOpen || (filters?.types?.length || 0) > 0 || (filters?.severity?.length || 0) > 0 || filters?.timeRange !== 24
                      ? 'bg-blue-50 border-blue-600 text-blue-950 shadow-xs'
                      : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                    }
                  `}
                  aria-label="Toggle hazard filters"
                >
                  <Icon name="Filter" size={14} />
                  <span className="hidden sm:inline">{t('filters', 'Filters')}</span>
                  {((filters?.types?.length || 0) > 0 || (filters?.severity?.length || 0) > 0 || filters?.timeRange !== 24) && (
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </button>

                {/* Status Dot + Refresh */}
                <div className="flex items-center space-x-1.5 pl-1">
                  <div 
                    className={`w-2.5 h-2.5 rounded-full ${
                      connectionStatus?.isConnected ? 'bg-green-600 pulse-indicator' : 'bg-slate-400'
                    }`}
                    title={connectionStatus?.isConnected ? t('live', 'Live Simulation Active') : t('offline', 'Offline')}
                  />
                  <button
                    type="button"
                    onClick={forceRefreshData}
                    className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                    title={t('refresh', 'Refresh data')}
                    aria-label="Refresh data"
                  >
                    <Icon name="RefreshCw" size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 relative">
            {/* Desktop Filter Panel */}
            <div className="hidden md:block flex-shrink-0">
              <FilterPanel
                filters={filters}
                onFiltersChange={handleFiltersChange}
                isOpen={isFilterPanelOpen}
                onToggle={toggleFilterPanel}
                resultCount={getFilteredHazardCount()}
                className="h-full"
              />
            </div>

            {/* Mobile Filter Drawer */}
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              isOpen={isFilterPanelOpen}
              onToggle={toggleFilterPanel}
              resultCount={getFilteredHazardCount()}
              className="md:hidden"
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
              {/* Content Views */}
              <div className="flex-1 overflow-hidden relative">
                {activeView === 'map' && (
                  <MapContainer
                    filters={filters}
                    onMarkerClick={handleMarkerClick}
                    onLocationUpdate={handleLocationUpdate}
                    onQuickReport={handleQuickReport}
                    showQuickReport={false}
                  />
                )}

                {activeView === 'overview' && (
                  <div className="h-full overflow-y-auto p-4 md:p-6 max-w-6xl mx-auto w-full">
                    <StatusOverview stats={realTimeStats} />
                  </div>
                )}

                {activeView === 'hotspots' && (
                  <div className="h-full overflow-y-auto p-4 md:p-6 max-w-6xl mx-auto w-full">
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHazard(null);
                }} 
              />
              
              {/* Modal Card */}
              <div 
                className="relative z-10 bg-white border-2 border-slate-200 rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto mx-4 p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-150 text-slate-900"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 bg-green-600 rounded-full pulse-indicator" />
                    <h3 className="font-bold text-slate-900 text-base">{t('hazardDetails', 'Hazard Details')}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHazard(null);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    aria-label="Close hazard details"
                  >
                    <Icon name="X" size={18} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className={`
                      flex items-center justify-center w-12 h-12 rounded-2xl
                      ${selectedHazard?.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        selectedHazard?.severity === 'high' ? 'bg-amber-100 text-amber-700' :
                        selectedHazard?.severity === 'medium'? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}
                    `}>
                      <Icon 
                        name={selectedHazard?.type === 'tsunami' ? 'Waves' : 
                              selectedHazard?.type === 'flooding' || selectedHazard?.type === 'flood' ? 'CloudRain' :
                              selectedHazard?.type === 'high_waves' ? 'Wind' : 'Zap'} 
                        size={24} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 capitalize truncate text-base">
                        {t(selectedHazard?.type, selectedHazard?.type?.replace('_', ' '))}
                      </h4>
                      <p className="text-xs font-semibold text-slate-600 truncate">{selectedHazard?.location}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary mt-0.5">
                        <Icon name="ShieldCheck" size={12} />
                        {selectedHazard?.source === 'citizen' ? t('citizenReport', 'Citizen Report') : t('officialHotspot', 'Official Hotspot')}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs border border-slate-200 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-semibold">{t('severity', 'Severity')}:</span>
                      <span className="font-bold capitalize text-slate-900">
                        {t(selectedHazard?.severity, selectedHazard?.severity)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-semibold">{t('status', 'Status')}:</span>
                      <span className="font-bold text-green-700">{t('verified', 'Verified')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-semibold">{t('coordinates', 'Coordinates')}:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {Number(selectedHazard?.lat || 0).toFixed(4)}°, {Number(selectedHazard?.lng || 0).toFixed(4)}°
                      </span>
                    </div>
                  </div>

                  {selectedHazard?.description && (
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('description', 'Description')}</h5>
                      <p className="text-sm font-medium text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">{selectedHazard?.description}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      iconName="MapPin"
                      onClick={() => {
                        setActiveView('map');
                        setSelectedHazard(null);
                      }}
                      className="flex-1 rounded-xl font-bold border-slate-300 text-slate-800 hover:bg-slate-100"
                    >
                      {t('viewOnMap', 'View on Map')}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      iconName="AlertTriangle"
                      onClick={() => {
                        handleQuickReport(selectedHazard);
                        setSelectedHazard(null);
                      }}
                      className="flex-1 rounded-xl font-bold bg-primary text-white hover:bg-primary/90"
                    >
                      {t('reportSimilar', 'Report Similar')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Bottom Dock Navigation */}
        <BottomTabNavigation user={user} />
      </div>
    </AuthenticationGuard>
  );
};

export default MainDashboard;
