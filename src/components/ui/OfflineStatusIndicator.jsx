import React, { useState, useEffect } from 'react';
import Icon from '../Appicon';

const OfflineStatusIndicator = ({ 
  className = '',
  showLabel = true,
  size = 'default' // 'sm', 'default', 'lg'
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'pending', 'error'
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Simulate sync process when coming back online
      if (pendingCount > 0) {
        setSyncStatus('syncing');
        setTimeout(() => {
          setSyncStatus('synced');
          setPendingCount(0);
        }, 2000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('pending');
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Simulate pending data when offline
    if (!isOnline) {
      const interval = setInterval(() => {
        setPendingCount(prev => prev + Math.floor(Math.random() * 2));
      }, 5000);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline, pendingCount]);

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        dotColor: 'bg-warning',
        icon: 'WifiOff',
        label: 'Offline',
        description: pendingCount > 0 ? `${pendingCount} pending` : 'Working offline'
      };
    }

    switch (syncStatus) {
      case 'syncing':
        return {
          color: 'text-secondary',
          bgColor: 'bg-secondary/10',
          dotColor: 'bg-secondary',
          icon: 'RefreshCw',
          label: 'Syncing',
          description: 'Updating data...',
          animate: 'animate-spin'
        };
      case 'pending':
        return {
          color: 'text-warning',
          bgColor: 'bg-warning/10', 
          dotColor: 'bg-warning',
          icon: 'Clock',
          label: 'Pending',
          description: `${pendingCount} items to sync`
        };
      case 'error':
        return {
          color: 'text-error',
          bgColor: 'bg-error/10',
          dotColor: 'bg-error',
          icon: 'AlertCircle',
          label: 'Sync Error',
          description: 'Failed to sync data'
        };
      default:
        return {
          color: 'text-success',
          bgColor: 'bg-success/10',
          dotColor: 'bg-success',
          icon: 'Wifi',
          label: 'Online',
          description: 'All data synced'
        };
    }
  };

  const sizeClasses = {
    sm: {
      container: 'px-2 py-1',
      dot: 'w-1.5 h-1.5',
      icon: 12,
      text: 'text-xs',
      spacing: 'space-x-1'
    },
    default: {
      container: 'px-2 py-1',
      dot: 'w-2 h-2', 
      icon: 14,
      text: 'text-xs',
      spacing: 'space-x-1'
    },
    lg: {
      container: 'px-3 py-2',
      dot: 'w-2.5 h-2.5',
      icon: 16,
      text: 'text-sm',
      spacing: 'space-x-2'
    }
  };

  const status = getStatusConfig();
  const sizeConfig = sizeClasses?.[size];

  return (
    <div className={`
      flex items-center ${sizeConfig?.spacing} ${sizeConfig?.container} 
      ${status?.bgColor} rounded-full transition-smooth ${className}
    `}>
      {/* Status Dot */}
      <div className={`
        ${sizeConfig?.dot} ${status?.dotColor} rounded-full
        ${syncStatus === 'synced' ? 'pulse-indicator' : ''}
      `} />
      {/* Status Icon (optional) */}
      {status?.icon && (
        <Icon 
          name={status?.icon} 
          size={sizeConfig?.icon} 
          className={`${status?.color} ${status?.animate || ''}`}
        />
      )}
      {/* Status Label */}
      {showLabel && (
        <span className={`font-medium ${status?.color} ${sizeConfig?.text}`}>
          {status?.label}
        </span>
      )}
      {/* Pending Count Badge */}
      {pendingCount > 0 && !isOnline && (
        <div className="flex items-center justify-center w-5 h-5 bg-warning text-warning-foreground rounded-full text-xs font-bold">
          {pendingCount > 99 ? '99+' : pendingCount}
        </div>
      )}
    </div>
  );
};

// Detailed status component for settings/admin pages
export const DetailedOfflineStatus = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(new Date());
  const [dataUsage, setDataUsage] = useState({ cached: '2.3 MB', pending: '156 KB' });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Connection Status</h3>
        <OfflineStatusIndicator size="sm" />
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Network:</span>
          <span className={isOnline ? 'text-success' : 'text-warning'}>
            {isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Last Sync:</span>
          <span className="text-foreground font-data">
            {lastSync?.toLocaleTimeString()}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cached Data:</span>
          <span className="text-foreground font-data">{dataUsage?.cached}</span>
        </div>
        
        {!isOnline && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pending Sync:</span>
            <span className="text-warning font-data">{dataUsage?.pending}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineStatusIndicator;