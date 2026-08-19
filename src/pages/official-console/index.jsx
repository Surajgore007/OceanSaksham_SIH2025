import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Appicon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Header from '../../components/ui/Header';
import BottomTabNavigation from '../../components/ui/BottomTabNavigation';
import AuthenticationGuard from '../../components/ui/AuthenticationGuard';
import OfflineStatusIndicator from '../../components/ui/OfflineStatusIndicator';
import localDb from '../../utils/localDb';
import realTimeService from '../../utils/realTimeService';
import authService from '../../utils/authService';
import sosService from '../../utils/sosService';

// Import components (assuming these exist)
import ReportMetrics from './components/ReportMetrics';
import ReportFilters from './components/ReportFilters';
import HotspotCreator from './components/HotspotCreator';

const OfficialConsole = () => {
  const navigate = useNavigate();
  
  // Real authenticated user — NEVER a hardcoded mock.
  // Auth state is initialized synchronously then kept in sync via subscription.
  const [user, setUser] = useState(() => authService.getCurrentUser());

  // Subscribe to auth state changes (handles login/logout while mounted)
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((updatedUser) => {
      setUser(updatedUser);
    });
    return unsubscribe;
  }, []);

  // State management
  const [reports, setReports] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [selectedReports, setSelectedReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHotspotModalOpen, setIsHotspotModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({});
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Initialize data and real-time live sync
  useEffect(() => {
    try {
      realTimeService?.start();
    } catch {}

    loadData(true);
    
    // Auto-sync polling every 3 seconds
    const pollInterval = setInterval(() => {
      loadData(false);
    }, 3000);

    // Set up real-time listeners
    const unsubscribePending = realTimeService?.subscribe('pendingVerification', () => {
      loadData(false);
    });

    const unsubscribeReports = realTimeService?.subscribe('userReports', () => {
      loadData(false);
    });

    const unsubscribeSos = realTimeService?.subscribe('sosAlerts', () => {
      loadData(false);
    });

    return () => {
      clearInterval(pollInterval);
      unsubscribePending?.();
      unsubscribeReports?.();
      unsubscribeSos?.();
    };
  }, []);

  const loadData = async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    
    try {
      // Fetch latest WhatsApp reports into in-memory store (bypasses localStorage 5MB limit)
      // window.__waReports holds all WhatsApp reports with base64 images in memory
      if (!window.__waReports) window.__waReports = {};
      try {
        const endpoints = ['http://localhost:5000/api/reports', '/whatsapp_reports.json'];
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep, { cache: 'no-store' });
            if (res.ok) {
              const liveReports = await res.json();
              if (Array.isArray(liveReports) && liveReports.length > 0) {
                liveReports.forEach(incoming => {
                  if (incoming?.id) window.__waReports[incoming.id] = incoming;
                });
                break;
              }
            }
          } catch {}
        }
      } catch {}

      const allReports = loadAllReportsForVerification();
      const allSosAlerts = sosService.getSosAlerts()
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setReports(allReports);
      setFilteredReports(allReports);
      setSosAlerts(allSosAlerts);
      
      // Calculate metrics
      const pendingCount = allReports.filter(r => r.verificationStatus === 'pending').length;
      const verifiedCount = allReports.filter(r => r.verificationStatus === 'verified').length;
      const rejectedCount = allReports.filter(r => r.verificationStatus === 'rejected').length;
      const criticalCount = allReports.filter(r => r.severity === 'critical' && r.verificationStatus === 'pending').length;
      
      setMetrics({
        pending: pendingCount,
        verified: verifiedCount,
        rejected: rejectedCount,
        critical: criticalCount,
        activeSos: allSosAlerts.filter(alert => alert.status === 'ACTIVE').length,
        dailyTarget: 50,
        verificationRate: allReports.length > 0 ? Math.round((verifiedCount / allReports.length) * 100) : 0,
        avgResponseTime: calculateAverageVerificationTime(allReports.filter(r => r.verifiedAt))
      });
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllReportsForVerification = () => {
    // Load from localStorage (regular web reports)
    const localUserReports = localDb.getCollection('userReports') || [];
    // Merge with in-memory WhatsApp reports (stored here to avoid localStorage 5MB quota)
    const waReports = window.__waReports ? Object.values(window.__waReports) : [];
    // Merge: waReports first so they appear at top, then local reports, deduped by id
    const seenIds = new Set();
    const userReports = [...waReports, ...localUserReports].filter(r => {
      if (!r?.id || seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      return true;
    });

    // Demo data for demonstration purposes - Critical alerts near Mumbai coast
    const demoReports = [
      {
        id: 'demo-6',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        submittedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        hazardType: 'tsunami',
        type: 'tsunami',
        severity: 'critical',
        status: 'verified',
        verificationStatus: 'verified',
        reportedBy: 'Mumbai Coastal Authority',
        reportedByRole: 'official',
        location: {
          address: 'Versova Beach, Mumbai Coast',
          name: 'Versova Beach, Mumbai Coast',
          coordinates: { latitude: 19.0400, longitude: 72.8200, lat: 19.0400, lng: 72.8200 }
        },
        description: 'CRITICAL: Tsunami warning issued for Versova Beach area. Immediate evacuation advised.',
        reporter: {
          name: 'Mumbai Coastal Authority',
          role: 'official',
          phone: '+91-22-1234-5678',
          email: 'coastal@mumbai.gov.in'
        },
        media: [],
        verifiedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        verifiedBy: 'Dr. Priya Sharma',
        officialNotes: 'Verified by Mumbai Coastal Authority. Immediate action required.'
      },
      {
        id: 'demo-7',
        timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        submittedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        hazardType: 'storm_surge',
        type: 'storm_surge',
        severity: 'critical',
        status: 'verified',
        verificationStatus: 'verified',
        reportedBy: 'Mumbai Weather Station',
        reportedByRole: 'official',
        location: {
          address: 'Powai Lake Coastal Area, Mumbai',
          name: 'Powai Lake Coastal Area, Mumbai',
          coordinates: { latitude: 19.1000, longitude: 72.9000, lat: 19.1000, lng: 72.9000 }
        },
        description: 'CRITICAL: Severe storm surge detected near Powai coastal area. High alert issued.',
        reporter: {
          name: 'Mumbai Weather Station',
          role: 'official',
          phone: '+91-22-2345-6789',
          email: 'weather@mumbai.gov.in'
        },
        media: [],
        verifiedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        verifiedBy: 'Dr. Priya Sharma',
        officialNotes: 'Confirmed by meteorological department. High alert status.'
      },
      {
        id: 'demo-8',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        submittedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        hazardType: 'high_waves',
        type: 'high_waves',
        severity: 'critical',
        status: 'verified',
        verificationStatus: 'verified',
        reportedBy: 'Mumbai Beach Authority',
        reportedByRole: 'official',
        location: {
          address: 'Aksa Beach, Mumbai Coast',
          name: 'Aksa Beach, Mumbai Coast',
          coordinates: { latitude: 19.0200, longitude: 72.8500, lat: 19.0200, lng: 72.8500 }
        },
        description: 'CRITICAL: Extremely dangerous high waves at Aksa Beach. Beach closed immediately.',
        reporter: {
          name: 'Mumbai Beach Authority',
          role: 'official',
          phone: '+91-22-3456-7890',
          email: 'beach@mumbai.gov.in'
        },
        media: [],
        verifiedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        verifiedBy: 'Dr. Priya Sharma',
        officialNotes: 'Beach closure implemented. Public safety ensured.'
      }
    ];

    // Normalize canonical user reports from shared database
    const normalizedUserReports = userReports.map(report => {
      const submitterName = report.reportedBy || report.reporterName || report.reporter?.name || report.contactName || 'Anonymous';
      const submitterRole = report.reportedByRole || report.reporterRole || report.reporter?.role || report.source || 'citizen';
      const rawTimestamp = report.timestamp || report.submittedAt || report.createdAt || Date.now();
      const locationObj = typeof report.location === 'object' && report.location ? report.location : {};
      const addressStr = locationObj.address?.address || locationObj.address || locationObj.name || (typeof report.location === 'string' ? report.location : 'Reported Location');
      const latVal = locationObj.coordinates?.latitude ?? locationObj.coordinates?.lat ?? locationObj.lat ?? report.lat ?? 19.0760;
      const lngVal = locationObj.coordinates?.longitude ?? locationObj.coordinates?.lng ?? locationObj.lng ?? report.lng ?? 72.8777;

      return {
        ...report,
        id: report.id,
        timestamp: new Date(rawTimestamp),
        submittedAt: report.submittedAt || new Date(rawTimestamp).toISOString(),
        hazardType: report.hazardType || report.type || 'general',
        type: report.hazardType || report.type || 'general',
        severity: report.severity || 'medium',
        status: report.status || report.verificationStatus || 'pending_verification',
        verificationStatus: report.verificationStatus || (report.status === 'verified' ? 'verified' : report.status === 'rejected' ? 'rejected' : 'pending'),
        location: {
          ...locationObj,
          address: addressStr,
          name: locationObj.name || addressStr,
          coordinates: {
            latitude: latVal,
            longitude: lngVal,
            lat: latVal,
            lng: lngVal
          },
          lat: latVal,
          lng: lngVal
        },
        description: report.description || '',
        reportedBy: submitterName,
        reportedByRole: submitterRole,
        reporter: {
          name: submitterName,
          role: submitterRole,
          phone: report.reporter?.phone || report.contactPhone || report.contactInfo?.phone || 'Not provided',
          email: report.reporter?.email || report.contactEmail || report.contactInfo?.email || 'Not provided'
        },
        media: report.media || report.mediaFiles || [],
        verifiedAt: report.verifiedAt,
        verifiedBy: report.verifiedBy,
        rejectedAt: report.rejectedAt,
        rejectedBy: report.rejectedBy,
        officialNotes: report.officialNotes
      };
    });

    // Combine normalized reports and demo reports
    const allReports = [...normalizedUserReports, ...demoReports];

    // Remove duplicates based on ID
    const uniqueReports = allReports.reduce((acc, report) => {
      if (!acc.find(r => r.id === report.id)) {
        acc.push(report);
      }
      return acc;
    }, []);

    // Sort by timestamp, newest first
    return uniqueReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const calculateAverageVerificationTime = (verifiedReports) => {
    if (verifiedReports.length === 0) return 'N/A';
    
    const totalMinutes = verifiedReports.reduce((acc, report) => {
      const submitted = new Date(report.timestamp);
      const verified = new Date(report.verifiedAt);
      const diffMinutes = (verified - submitted) / (1000 * 60);
      return acc + diffMinutes;
    }, 0);
    
    const avgMinutes = totalMinutes / verifiedReports.length;
    
    if (avgMinutes < 60) return `${Math.round(avgMinutes)}m`;
    if (avgMinutes < 1440) return `${Math.round(avgMinutes / 60)}h`;
    return `${Math.round(avgMinutes / 1440)}d`;
  };

  // Filter and sort reports
  useEffect(() => {
    let filtered = [...reports];

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'timestamp') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredReports(filtered);
  }, [reports, sortBy, sortOrder]);

  // Event handlers
  const handleFilterChange = (filters) => {
    let filtered = [...reports];

    // Apply filters
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(report =>
        report.location?.address?.toLowerCase().includes(searchTerm) ||
        report.reporter?.name?.toLowerCase().includes(searchTerm) ||
        report.hazardType?.toLowerCase().includes(searchTerm) ||
        report.description?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.hazardType) {
      filtered = filtered.filter(report => report.hazardType === filters.hazardType);
    }

    if (filters.severity) {
      filtered = filtered.filter(report => report.severity === filters.severity);
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(report => report.verificationStatus === filters.status);
    }

    if (filters.timeRange) {
      const now = new Date();
      const timeRanges = {
        '1h': 1 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      
      const timeLimit = timeRanges[filters.timeRange];
      if (timeLimit) {
        filtered = filtered.filter(report => 
          now - new Date(report.timestamp) <= timeLimit
        );
      }
    }

    setFilteredReports(filtered);
  };

  const handleSort = (column, order) => {
    setSortBy(column);
    setSortOrder(order);
  };

  const handleSelectReport = (reportId, isSelected) => {
    if (isSelected) {
      setSelectedReports(prev => [...prev, reportId]);
    } else {
      setSelectedReports(prev => prev.filter(id => id !== reportId));
    }
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedReports(filteredReports.map(report => report.id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
  };

  const handleVerifyReport = async (reportIds, adminNotes = '') => {
    const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];
    const verifierName = user?.name || user?.id || 'Official';
    const nowIso = new Date().toISOString();
    
    setBulkActionLoading(true);

    try {
      for (const reportId of idsArray) {
        // Update canonical user reports
        const updated = localDb.update('userReports', reportId, (report) => {
          const verifiedRecord = {
            ...report,
            status: 'verified',
            verificationStatus: 'verified',
            verifiedAt: nowIso,
            verifiedBy: verifierName,
            officialNotes: adminNotes
          };

          // Also update/insert in hazardReports for immediate map display
          localDb.insert('hazardReports', {
            ...verifiedRecord,
            type: verifiedRecord.hazardType || verifiedRecord.type,
            lat: verifiedRecord.location?.coordinates?.lat || verifiedRecord.location?.lat || verifiedRecord.lat,
            lng: verifiedRecord.location?.coordinates?.lng || verifiedRecord.location?.lng || verifiedRecord.lng,
          });

          return verifiedRecord;
        });

        // Update pending queue
        const pendingReports = localDb.getCollection('pendingVerification');
        const filteredPending = pendingReports.filter(r => r.id !== reportId);
        localDb.setCollection('pendingVerification', filteredPending);
      }

      // Update local state
      setReports(prev => prev.map(report => 
        idsArray.includes(report.id) 
          ? { 
              ...report, 
              status: 'verified',
              verificationStatus: 'verified',
              verifiedAt: nowIso,
              verifiedBy: verifierName,
              officialNotes: adminNotes
            }
          : report
      ));

      // Clear selections and update metrics
      setSelectedReports([]);
      setMetrics(prev => ({
        ...prev,
        pending: Math.max(0, (prev.pending || 0) - idsArray.length),
        verified: (prev.verified || 0) + idsArray.length
      }));

      // Notify real-time listeners across all channels
      realTimeService.notifyListeners('userReports', localDb.getCollection('userReports'));
      realTimeService.notifyListeners('reports', localDb.getCollection('userReports'));
      realTimeService.notifyListeners('hazards', localDb.getCollection('hazardReports'));
      realTimeService.notifyListeners('pendingVerification', localDb.getCollection('pendingVerification'));

    } catch (error) {
      console.error('Error verifying reports:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleRejectReport = async (reportIds, adminNotes = '') => {
    const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];
    const rejectorName = user?.name || user?.id || 'Official';
    const nowIso = new Date().toISOString();
    
    setBulkActionLoading(true);

    try {
      for (const reportId of idsArray) {
        // Update user reports as rejected
        localDb.update('userReports', reportId, (report) => ({
          ...report,
          status: 'rejected',
          verificationStatus: 'rejected',
          rejectedAt: nowIso,
          rejectedBy: rejectorName,
          officialNotes: adminNotes
        }));

        // Remove from hazardReports if present
        localDb.deleteItem('hazardReports', reportId);

        // Remove from pending queue
        const pendingReports = localDb.getCollection('pendingVerification');
        const filteredPending = pendingReports.filter(r => r.id !== reportId);
        localDb.setCollection('pendingVerification', filteredPending);
      }

      // Update local state
      setReports(prev => prev.map(report => 
        idsArray.includes(report.id) 
          ? { 
              ...report, 
              status: 'rejected',
              verificationStatus: 'rejected',
              rejectedAt: nowIso,
              rejectedBy: rejectorName,
              officialNotes: adminNotes
            }
          : report
      ));

      setSelectedReports([]);
      setMetrics(prev => ({
        ...prev,
        pending: Math.max(0, (prev.pending || 0) - idsArray.length),
        rejected: (prev.rejected || 0) + idsArray.length
      }));

      // Notify real-time listeners across all channels
      realTimeService.notifyListeners('userReports', localDb.getCollection('userReports'));
      realTimeService.notifyListeners('reports', localDb.getCollection('userReports'));
      realTimeService.notifyListeners('hazards', localDb.getCollection('hazardReports'));
      realTimeService.notifyListeners('pendingVerification', localDb.getCollection('pendingVerification'));

    } catch (error) {
      console.error('Error rejecting reports:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleMarkUnderReview = async (reportIds) => {
    const idsArray = Array.isArray(reportIds) ? reportIds : [reportIds];
    const reviewerName = user?.name || user?.id || 'Official';
    const nowIso = new Date().toISOString();
    
    setBulkActionLoading(true);

    try {
      for (const reportId of idsArray) {
        // Update user reports as under review
        localDb.update('userReports', reportId, (report) => ({
          ...report,
          status: 'under_review',
          verificationStatus: 'under_review',
          reviewStartedAt: nowIso,
          reviewedBy: reviewerName
        }));
      }

      // Update local state
      setReports(prev => prev.map(report => 
        idsArray.includes(report.id) 
          ? { 
              ...report, 
              status: 'under_review',
              verificationStatus: 'under_review',
              reviewStartedAt: nowIso,
              reviewedBy: reviewerName
            }
          : report
      ));

      setSelectedReports([]);

      // Notify real-time listeners across all channels
      realTimeService.notifyListeners('userReports', localDb.getCollection('userReports'));
      realTimeService.notifyListeners('reports', localDb.getCollection('userReports'));
      realTimeService.notifyListeners('pendingVerification', localDb.getCollection('pendingVerification'));

    } catch (error) {
      console.error('Error marking reports under review:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleCreateHotspot = async (hotspotData) => {
    console.log('Creating hotspot:', hotspotData);
    // In real app, this would make API call to create hotspot
  };

  const handleSosStatusChange = (alertId, status) => {
    const officialName = user?.name || user?.id || 'Official';
    sosService.updateSosStatus(alertId, status, officialName);
    setSosAlerts(sosService.getSosAlerts().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  };

  const openSosLocation = (alert) => {
    window.open(`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`, '_blank', 'noopener,noreferrer');
  };

  const handleLogout = () => {
    // In real app, clear auth tokens and redirect
    navigate('/login');
  };

  // Status Badge Component
  const StatusBadge = ({ status, verificationStatus, className = '' }) => {
    const getStatusConfig = () => {
      if (verificationStatus === 'pending' || status === 'pending_verification') {
        return {
          icon: 'Clock',
          label: 'Pending Verification',
          className: 'bg-warning/10 text-warning border-warning/20'
        };
      }
      
      switch (status) {
        case 'verified':
          return {
            icon: 'CheckCircle',
            label: 'Verified',
            className: 'bg-success/10 text-success border-success/20'
          };
        case 'rejected':
          return {
            icon: 'XCircle',
            label: 'Rejected',
            className: 'bg-error/10 text-error border-error/20'
          };
        case 'under_review':
          return {
            icon: 'Eye',
            label: 'Under Review',
            className: 'bg-blue/10 text-blue border-blue/20'
          };
        default:
          return {
            icon: 'AlertCircle',
            label: 'Unknown',
            className: 'bg-muted/10 text-muted-foreground border-muted/20'
          };
      }
    };

    const config = getStatusConfig();

    return (
      <div className={`
        inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border
        ${config.className} ${className}
      `}>
        <Icon name={config.icon} size={12} />
        <span>{config.label}</span>
      </div>
    );
  };

  const getStatusColor = (report) => {
    if (report.verificationStatus === 'pending' || report.status === 'pending_verification') {
      return 'border-l-warning';
    }
    
    switch (report.status) {
      case 'verified':
        return 'border-l-success';
      case 'rejected':
        return 'border-l-error';
      case 'under_review':
        return 'border-l-blue';
      default:
        return 'border-l-muted';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-primary rounded-full">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">Loading Console</h2>
            <p className="text-sm text-muted-foreground">Fetching latest reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthenticationGuard user={user} requiredRoles={['official']}>
      <div className="min-h-screen bg-background">
        <Header user={user} onLogout={handleLogout} />
        
        <main className="pt-16 pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
              <div className="flex items-center space-x-3 mb-4 lg:mb-0">
                <div className="flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-lg">
                  <Icon name="Shield" size={24} className="text-secondary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Official Console</h1>
                  <p className="text-muted-foreground">
                    Verify and manage coastal hazard reports
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-y-2">
                <OfflineStatusIndicator size="sm" />
                <Button
                  variant="outline"
                  iconName="Map"
                  onClick={() => navigate('/main-dashboard')}
                  className="font-bold border-slate-300 text-slate-800 hover:bg-slate-100"
                >
                  Live Hazard Map
                </Button>
                <Button
                  variant="outline"
                  iconName="MapPin"
                  onClick={() => setIsHotspotModalOpen(true)}
                  className="font-bold"
                >
                  Create Hotspot
                </Button>
                <Button
                  variant="default"
                  iconName="Bell"
                  onClick={() => navigate('/console-alerts')}
                  className="font-bold"
                >
                  Manage Alerts
                </Button>
              </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Verification</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold text-warning">{metrics.pending}</p>
                      {metrics.critical > 0 && (
                        <span className="px-2 py-1 bg-error/10 text-error rounded-full text-xs font-medium">
                          {metrics.critical} Critical
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                    <Icon name="Clock" size={24} className="text-warning" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Awaiting official review
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Verified Reports</p>
                    <p className="text-2xl font-bold text-success">{metrics.verified}</p>
                  </div>
                  <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                    <Icon name="CheckCircle" size={24} className="text-success" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Now visible on public map
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Verification Rate</p>
                    <p className="text-2xl font-bold text-primary">{metrics.verificationRate}%</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Icon name="TrendingUp" size={24} className="text-primary" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Reports approved vs total
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                    <p className="text-2xl font-bold text-blue">{metrics.avgResponseTime}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue/10 rounded-full flex items-center justify-center">
                    <Icon name="Zap" size={24} className="text-blue" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  From submission to verification
                </div>
              </div>
            </div>

            {/* Emergency SOS Queue */}
            <div className="bg-card border border-error/30 rounded-lg mb-6 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-error/20 bg-error/5">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center">
                    <Icon name="Siren" size={22} className="text-error" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Emergency SOS</h3>
                    <p className="text-sm text-muted-foreground">
                      {metrics.activeSos || 0} active alerts from the shared SOS store
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  iconName="RefreshCw"
                  onClick={loadData}
                >
                  Refresh
                </Button>
              </div>

              {sosAlerts.length > 0 ? (
                <div className="divide-y divide-border">
                  {sosAlerts.map((alert) => {
                    const isActive = alert.status === 'ACTIVE';
                    const isAcknowledged = alert.status === 'ACKNOWLEDGED';
                    return (
                      <div
                        key={alert.id}
                        className={`p-4 ${isActive ? 'bg-error/5 border-l-4 border-l-error' : ''}`}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${
                                isActive
                                  ? 'bg-error/10 text-error border-error/20'
                                  : isAcknowledged
                                    ? 'bg-warning/10 text-warning border-warning/20'
                                    : 'bg-success/10 text-success border-success/20'
                              }`}>
                                <Icon name={isActive ? 'Siren' : isAcknowledged ? 'Clock' : 'CheckCircle'} size={12} />
                                {alert.status}
                              </span>
                              <span className="font-mono text-sm text-foreground">{alert.sosId}</span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(alert.timestamp).toLocaleString()}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Location</p>
                                <p className="text-foreground">{alert.location?.address}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Coordinates</p>
                                <p className="font-mono text-foreground">
                                  {Number(alert.latitude).toFixed(6)}, {Number(alert.longitude).toFixed(6)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Accuracy</p>
                                <p className="text-foreground">
                                  {alert.accuracy ? `${Math.round(alert.accuracy)}m` : 'Unknown'}
                                  {alert.isCachedLocation ? ' (cached)' : ''}
                                </p>
                              </div>
                            </div>

                            {alert.reporter ? (
                              <div className="text-sm text-muted-foreground">
                                Reporter: <span className="text-foreground">{alert.reporter.name || alert.reporter.userId}</span>
                                {alert.reporter.phone && <span> · {alert.reporter.phone}</span>}
                                {alert.reporter.email && <span> · {alert.reporter.email}</span>}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">Reporter: Public SOS, not logged in</div>
                            )}
                          </div>

                          <div className="flex flex-wrap lg:flex-col gap-2 lg:min-w-40">
                            <Button
                              variant="outline"
                              size="sm"
                              iconName="MapPin"
                              onClick={() => openSosLocation(alert)}
                            >
                              View Location
                            </Button>
                            {isActive && (
                              <Button
                                variant="default"
                                size="sm"
                                iconName="CheckCircle"
                                onClick={() => handleSosStatusChange(alert.id, 'ACKNOWLEDGED')}
                              >
                                Acknowledge
                              </Button>
                            )}
                            {(isActive || isAcknowledged) && (
                              <Button
                                variant="outline"
                                size="sm"
                                iconName="ShieldCheck"
                                onClick={() => handleSosStatusChange(alert.id, 'RESOLVED')}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Icon name="ShieldCheck" size={40} className="text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-foreground">No SOS alerts</p>
                  <p className="text-sm text-muted-foreground">New public emergency alerts will appear here immediately.</p>
                </div>
              )}
            </div>

            {/* Filters */}
            <ReportFilters
              onFilterChange={handleFilterChange}
              totalCount={reports.length}
              filteredCount={filteredReports.length}
            />

            {/* Reports Table */}
            <div className="bg-card border border-border rounded-lg">
              {/* Header with bulk actions */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold text-foreground">
                    Verification Queue ({filteredReports.length})
                  </h3>
                  {selectedReports.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>{selectedReports.length} selected</span>
                    </div>
                  )}
                </div>

                {selectedReports.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="default"
                      size="sm"
                      iconName="CheckCircle"
                      onClick={() => handleVerifyReport(selectedReports, 'Bulk verified by official')}
                      loading={bulkActionLoading}
                    >
                      Verify Selected
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      iconName="XCircle"
                      onClick={() => handleRejectReport(selectedReports, 'Bulk rejected by official')}
                      loading={bulkActionLoading}
                    >
                      Reject Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      iconName="Eye"
                      onClick={() => handleMarkUnderReview(selectedReports)}
                      loading={bulkActionLoading}
                    >
                      Mark Under Review
                    </Button>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="p-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedReports.length === filteredReports.length && filteredReports.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-border"
                        />
                      </th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Hazard Type</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Severity</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Location</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Reporter</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Submitted</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr
                        key={report.id}
                        className={`
                          border-b border-border hover:bg-muted/30 transition-colors border-l-4
                          ${getStatusColor(report)}
                        `}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedReports.includes(report.id)}
                            onChange={(e) => handleSelectReport(report.id, e.target.checked)}
                            className="rounded border-border"
                          />
                        </td>
                        <td className="p-3">
                          <StatusBadge 
                            status={report.status} 
                            verificationStatus={report.verificationStatus}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <Icon 
                              name={report.hazardType === 'tsunami' ? 'Waves' : 
                                    report.hazardType === 'flooding' ? 'CloudRain' :
                                    report.hazardType === 'high-waves' ? 'Wind' : 'AlertTriangle'} 
                              size={16} 
                              className="text-muted-foreground"
                            />
                            <span className="capitalize text-foreground">
                              {report.hazardType?.replace('-', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`
                            px-2 py-1 rounded-full text-xs font-medium capitalize
                            ${report.severity === 'critical' ? 'bg-error/10 text-error' :
                              report.severity === 'high' ? 'bg-warning/10 text-warning' :
                              report.severity === 'medium' ? 'bg-blue/10 text-blue' :
                              'bg-success/10 text-success'}
                          `}>
                            {report.severity}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="max-w-xs truncate text-foreground">
                            {report.location?.address || 'Unknown Location'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-foreground">
                            <div className="font-medium">{report.reporter?.name}</div>
                            <div className="text-xs text-muted-foreground">{report.reporter?.phone}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-foreground">
                            <div>{new Date(report.timestamp).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(report.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Eye"
                              onClick={() => handleViewReport(report)}
                              className="h-8 w-8 p-0"
                              aria-label="View details"
                            />
                            
                            {(report.verificationStatus === 'pending' || report.status === 'pending_verification') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  iconName="CheckCircle"
                                  onClick={() => handleVerifyReport(report.id, 'Quick verified by official')}
                                  className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                                  aria-label="Quick verify"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  iconName="XCircle"
                                  onClick={() => handleRejectReport(report.id, 'Quick rejected by official')}
                                  className="h-8 w-8 p-0 text-error hover:text-error hover:bg-error/10"
                                  aria-label="Quick reject"
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredReports.length === 0 && (
                  <div className="text-center py-8">
                    <Icon name="CheckCircle" size={48} className="text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-foreground mb-2">All Caught Up!</h3>
                    <p className="text-muted-foreground">No reports pending verification at the moment.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Enhanced Report Detail Modal */}
        {isDetailModalOpen && selectedReport && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsDetailModalOpen(false)} />
            
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-4xl bg-card rounded-lg shadow-modal border border-border">
                {/* Header with enhanced status display */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-secondary/10 rounded-lg">
                      <Icon name="AlertTriangle" size={20} className="text-secondary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        Report #{selectedReport?.id?.slice(-8)?.toUpperCase()}
                      </h2>
                      <div className="flex items-center space-x-2 mt-1">
                        <StatusBadge 
                          status={selectedReport?.status} 
                          verificationStatus={selectedReport?.verificationStatus}
                        />
                        {selectedReport?.priority === 'high' && (
                          <span className="px-2 py-1 bg-error/10 text-error rounded-full text-xs font-medium">
                            High Priority
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm" iconName="X" onClick={() => setIsDetailModalOpen(false)} />
                </div>

                {/* Content with verification panel */}
                <div className="p-6 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Report Details (Left Column) */}
                    <div className="lg:col-span-2 space-y-6">
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Report Information</h3>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Hazard Type</label>
                              <p className="text-foreground capitalize">{selectedReport?.hazardType?.replace('-', ' ')}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Severity</label>
                              <p className="text-foreground capitalize">{selectedReport?.severity}</p>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Description</label>
                            <p className="text-foreground whitespace-pre-wrap mt-1">{selectedReport?.description}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Reporter Details</h3>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                          <div><strong>Name:</strong> {selectedReport?.reporter?.name}</div>
                          <div><strong>Phone:</strong> {selectedReport?.reporter?.phone}</div>
                          <div><strong>Email:</strong> {selectedReport?.reporter?.email}</div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Location Details</h3>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                          <div><strong>Address:</strong> {selectedReport?.location?.address || 'Not specified'}</div>
                          {selectedReport?.location && (
                            <div><strong>Coordinates:</strong> {selectedReport.location.lat?.toFixed(6)}, {selectedReport.location.lng?.toFixed(6)}</div>
                          )}
                        </div>
                      </div>

                      {/* Attached Evidence & Photos Gallery */}
                      <div>
                        <h3 className="font-semibold text-foreground mb-3 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Icon name="Camera" size={18} className="text-primary" />
                            Evidence & Photos ({selectedReport?.media?.length || selectedReport?.mediaFiles?.length || 0})
                          </span>
                        </h3>
                        {((selectedReport?.media && selectedReport?.media?.length > 0) || 
                          (selectedReport?.mediaFiles && selectedReport?.mediaFiles?.length > 0)) ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/30 rounded-2xl p-4 border border-border">
                            {(selectedReport?.media || selectedReport?.mediaFiles)?.map((item, index) => {
                              const mediaSrc = item?.url || item?.preview || (typeof item === 'string' ? item : '');
                              return (
                                <div
                                  key={index}
                                  onClick={() => setSelectedMedia(item)}
                                  className="group relative aspect-video bg-black/5 rounded-xl overflow-hidden border border-border cursor-pointer shadow-xs hover:shadow-md transition-all"
                                >
                                  {mediaSrc ? (
                                    <img
                                      src={mediaSrc}
                                      alt={`Evidence ${index + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                      <Icon name="Image" size={24} />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Icon name="Eye" size={20} />
                                  </div>
                                  {item?.geotagged && (
                                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-bold text-emerald-400">
                                      📍 GPS Tagged
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 bg-muted/20 border border-border rounded-xl text-center text-xs text-muted-foreground">
                            No media photos attached to this report.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Verification Panel (Right Column) */}
                    <VerificationPanel 
                      report={selectedReport}
                      user={user}
                      onVerify={handleVerifyReport}
                      onReject={handleRejectReport}
                      onMarkUnderReview={handleMarkUnderReview}
                      onClose={() => setIsDetailModalOpen(false)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full-Screen Media Lightbox Modal */}
        {selectedMedia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div 
              className="absolute inset-0"
              onClick={() => setSelectedMedia(null)}
            />
            <div className="relative max-w-4xl max-h-[85vh] z-10 p-2">
              <img
                src={selectedMedia?.url || selectedMedia?.preview || (typeof selectedMedia === 'string' ? selectedMedia : '')}
                alt="Full size evidence"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-slate-700"
              />
              <Button
                variant="ghost"
                size="sm"
                iconName="X"
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 bg-black/70 text-white hover:bg-black p-2 rounded-full cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Hotspot Creator Modal */}
        {isHotspotModalOpen && (
          <HotspotCreator
            isOpen={isHotspotModalOpen}
            onClose={() => {
              setIsHotspotModalOpen(false);
              setSelectedReport(null);
            }}
            onCreateHotspot={handleCreateHotspot}
            initialLocation={selectedReport?.location?.coordinates}
          />
        )}

        <BottomTabNavigation user={user} />
      </div>
    </AuthenticationGuard>
  );
};

// Verification Panel Component
const VerificationPanel = ({ 
  report, 
  user, 
  onVerify, 
  onReject, 
  onMarkUnderReview, 
  onClose 
}) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [verificationAction, setVerificationAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVerificationAction = async (action) => {
    if (!adminNotes.trim() && action !== 'review') {
      alert('Please provide notes for verification/rejection');
      return;
    }

    setIsProcessing(true);
    setVerificationAction(action);

    try {
      switch (action) {
        case 'verify':
          await onVerify(report.id, adminNotes);
          break;
        case 'reject':
          await onReject(report.id, adminNotes);
          break;
        case 'review':
          await onMarkUnderReview(report.id);
          break;
      }
      onClose();
    } finally {
      setIsProcessing(false);
      setVerificationAction(null);
      setAdminNotes('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center">
          <Icon name="Shield" size={16} className="mr-2" />
          Verification Actions
        </h3>

        {(report?.verificationStatus === 'pending' || report?.status === 'pending_verification') ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Official Notes (Required)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add verification notes, observations, or reasons..."
                className="w-full p-3 border border-border rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows="3"
              />
            </div>

            <div className="space-y-2">
              <Button
                variant="default"
                className="w-full bg-success hover:bg-success/90 text-white"
                iconName="CheckCircle"
                onClick={() => handleVerificationAction('verify')}
                loading={isProcessing && verificationAction === 'verify'}
                disabled={!adminNotes.trim() || isProcessing}
              >
                Verify & Approve
              </Button>

              <Button
                variant="outline"
                className="w-full border-blue text-blue hover:bg-blue/10"
                iconName="Eye"
                onClick={() => handleVerificationAction('review')}
                loading={isProcessing && verificationAction === 'review'}
                disabled={isProcessing}
              >
                Mark Under Review
              </Button>

              <Button
                variant="destructive"
                className="w-full"
                iconName="XCircle"
                onClick={() => handleVerificationAction('reject')}
                loading={isProcessing && verificationAction === 'reject'}
                disabled={!adminNotes.trim() || isProcessing}
              >
                Reject Report
              </Button>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
              <strong>Note:</strong> Verified reports will appear on the public hazard map. 
              Rejected reports will be archived and not displayed.
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <StatusBadge 
              status={report?.status} 
              verificationStatus={report?.verificationStatus}
              className="mb-2"
            />
            <p className="text-sm text-muted-foreground">
              This report has already been processed.
            </p>
            {report?.officialNotes && (
              <div className="mt-3 p-2 bg-muted/20 rounded text-xs">
                <strong>Official Notes:</strong> {report.officialNotes}
              </div>
            )}
            {report?.verifiedAt && (
              <div className="mt-2 text-xs text-muted-foreground">
                Processed: {new Date(report.verifiedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="font-medium text-foreground mb-3 flex items-center">
          <Icon name="Clock" size={16} className="mr-2" />
          Status Timeline
        </h4>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Report Submitted</p>
              <p className="text-xs text-muted-foreground">
                {new Date(report?.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {report?.status === 'under_review' && (
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-warning rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Under Review</p>
                <p className="text-xs text-muted-foreground">
                  Currently being reviewed by officials
                </p>
              </div>
            </div>
          )}

          {report?.status === 'verified' && (
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-success rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Verified</p>
                <p className="text-xs text-muted-foreground">
                  {report?.verifiedAt && new Date(report.verifiedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {report?.status === 'rejected' && (
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-error rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Rejected</p>
                <p className="text-xs text-muted-foreground">
                  {report?.rejectedAt && new Date(report.rejectedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfficialConsole;
