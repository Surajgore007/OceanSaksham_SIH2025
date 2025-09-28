import React, { useState, useEffect } from 'react';
import Icon from '../../../components/Appicon';
import Button from '../../../components/ui/Button';

const DeliveryChannelStatus = ({ className = '' }) => {
  const [channelStatus, setChannelStatus] = useState({
    sms: {
      name: 'SMS Gateway',
      status: 'operational',
      lastCheck: new Date(),
      dailyQuota: 50000,
      dailyUsed: 12450,
      successRate: 97.8,
      avgDeliveryTime: '2.3s',
      provider: 'TextLocal India',
      issues: []
    },
    push: {
      name: 'Push Notifications',
      status: 'operational',
      lastCheck: new Date(),
      dailyQuota: 100000,
      dailyUsed: 8920,
      successRate: 99.2,
      avgDeliveryTime: '0.8s',
      provider: 'Firebase FCM',
      issues: []
    },
    email: {
      name: 'Email Service',
      status: 'degraded',
      lastCheck: new Date(Date.now() - 300000),
      dailyQuota: 25000,
      dailyUsed: 3200,
      successRate: 89.5,
      avgDeliveryTime: '15.2s',
      provider: 'AWS SES',
      issues: ['High bounce rate detected', 'Delayed delivery to Gmail addresses']
    },
    voice: {
      name: 'Voice Calls',
      status: 'maintenance',
      lastCheck: new Date(Date.now() - 1800000),
      dailyQuota: 5000,
      dailyUsed: 0,
      successRate: 0,
      avgDeliveryTime: 'N/A',
      provider: 'Twilio Voice',
      issues: ['Scheduled maintenance until 14:00 IST']
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Simulate real-time status updates
    const interval = setInterval(() => {
      setChannelStatus(prev => ({
        ...prev,
        sms: {
          ...prev?.sms,
          dailyUsed: prev?.sms?.dailyUsed + Math.floor(Math.random() * 5),
          lastCheck: new Date()
        },
        push: {
          ...prev?.push,
          dailyUsed: prev?.push?.dailyUsed + Math.floor(Math.random() * 8),
          lastCheck: new Date()
        }
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = (status) => {
    const configs = {
      operational: {
        color: 'text-success',
        bg: 'bg-success/10',
        icon: 'CheckCircle',
        label: 'Operational'
      },
      degraded: {
        color: 'text-warning',
        bg: 'bg-warning/10',
        icon: 'AlertTriangle',
        label: 'Degraded'
      },
      maintenance: {
        color: 'text-secondary',
        bg: 'bg-secondary/10',
        icon: 'Settings',
        label: 'Maintenance'
      },
      offline: {
        color: 'text-error',
        bg: 'bg-error/10',
        icon: 'XCircle',
        label: 'Offline'
      }
    };
    return configs?.[status] || configs?.operational;
  };

  const getChannelIcon = (channel) => {
    const icons = {
      sms: 'MessageSquare',
      push: 'Smartphone',
      email: 'Mail',
      voice: 'Phone'
    };
    return icons?.[channel] || 'Bell';
  };

  const getQuotaPercentage = (used, quota) => {
    return Math.round((used / quota) * 100);
  };

  const getQuotaColor = (percentage) => {
    if (percentage >= 90) return 'text-error';
    if (percentage >= 75) return 'text-warning';
    return 'text-success';
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update last check times
    setChannelStatus(prev => {
      const updated = { ...prev };
      Object.keys(updated)?.forEach(key => {
        updated[key] = {
          ...updated?.[key],
          lastCheck: new Date()
        };
      });
      return updated;
    });
    
    setIsRefreshing(false);
  };

  const handleTestChannel = (channel) => {
    console.log(`Testing ${channel} channel...`);
    // Implement test functionality
  };

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
              <Icon name="Wifi" size={20} className="text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Delivery Channels</h2>
              <p className="text-sm text-muted-foreground">
                Real-time status and performance metrics
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            iconName="RefreshCw"
            iconPosition="left"
            onClick={handleRefresh}
            loading={isRefreshing}
          >
            Refresh
          </Button>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(channelStatus)?.map(([key, channel]) => {
            const statusConfig = getStatusConfig(channel?.status);
            const quotaPercentage = getQuotaPercentage(channel?.dailyUsed, channel?.dailyQuota);
            const quotaColor = getQuotaColor(quotaPercentage);

            return (
              <div key={key} className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon name={getChannelIcon(key)} size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{channel?.name}</h3>
                      <p className="text-xs text-muted-foreground">{channel?.provider}</p>
                    </div>
                  </div>
                  
                  <div className={`px-2 py-1 rounded-full ${statusConfig?.bg} flex items-center space-x-1`}>
                    <Icon name={statusConfig?.icon} size={12} className={statusConfig?.color} />
                    <span className={`text-xs font-medium ${statusConfig?.color}`}>
                      {statusConfig?.label}
                    </span>
                  </div>
                </div>
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                    <p className={`text-sm font-semibold ${channel?.successRate >= 95 ? 'text-success' : channel?.successRate >= 85 ? 'text-warning' : 'text-error'}`}>
                      {channel?.successRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Delivery</p>
                    <p className="text-sm font-semibold text-foreground">{channel?.avgDeliveryTime}</p>
                  </div>
                </div>
                {/* Daily Quota */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Daily Usage</span>
                    <span className={`text-xs font-semibold ${quotaColor}`}>
                      {quotaPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        quotaPercentage >= 90 ? 'bg-error' : 
                        quotaPercentage >= 75 ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>{channel?.dailyUsed?.toLocaleString()} used</span>
                    <span>{channel?.dailyQuota?.toLocaleString()} limit</span>
                  </div>
                </div>
                {/* Issues */}
                {channel?.issues?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-warning mb-2">Active Issues:</p>
                    <div className="space-y-1">
                      {channel?.issues?.map((issue, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Icon name="AlertCircle" size={12} className="text-warning mt-0.5" />
                          <p className="text-xs text-muted-foreground">{issue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Last check: {channel?.lastCheck?.toLocaleTimeString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="Play"
                    onClick={() => handleTestChannel(key)}
                    disabled={channel?.status === 'offline' || channel?.status === 'maintenance'}
                  >
                    Test
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall System Status */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">System Overview</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full pulse-indicator"></div>
                <span className="text-sm text-success font-medium">All Systems Operational</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Sent Today</p>
                <p className="font-semibold text-foreground">
                  {Object.values(channelStatus)?.reduce((sum, channel) => sum + channel?.dailyUsed, 0)?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Success Rate</p>
                <p className="font-semibold text-success">
                  {Math.round(Object.values(channelStatus)?.reduce((sum, channel) => sum + channel?.successRate, 0) / Object.keys(channelStatus)?.length)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Active Channels</p>
                <p className="font-semibold text-foreground">
                  {Object.values(channelStatus)?.filter(channel => channel?.status === 'operational')?.length}/4
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Next Maintenance</p>
                <p className="font-semibold text-foreground">Dec 28, 02:00</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryChannelStatus;