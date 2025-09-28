import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ActiveAlertsPanel = ({ className = '' }) => {
  const [activeAlerts] = useState([
    {
      id: 'ALT-001',
      title: 'Tsunami Warning - Critical Emergency',
      hazardType: 'tsunami',
      severity: 'critical',
      message: 'TSUNAMI WARNING: Immediate evacuation required for coastal areas. Move to higher ground immediately.',
      sentAt: new Date(Date.now() - 1800000), // 30 minutes ago
      status: 'active',
      channels: ['sms', 'push', 'email'],
      targetArea: 'Kochi Coastal Region (15km radius)',
      deliveryStats: {
        sms: { sent: 2450, delivered: 2380, failed: 70 },
        push: { sent: 1890, delivered: 1820, failed: 70 },
        email: { sent: 1200, delivered: 1150, failed: 50 }
      },
      confirmations: 1250,
      estimatedReach: 5540
    },
    {
      id: 'ALT-002',
      title: 'Cyclone Alert - High Risk',
      hazardType: 'cyclone',
      severity: 'high',
      message: 'CYCLONE ALERT: Severe weather approaching. Secure property, stock emergency supplies.',
      sentAt: new Date(Date.now() - 7200000), // 2 hours ago
      status: 'active',
      channels: ['sms', 'push'],
      targetArea: 'Thiruvananthapuram District (25km radius)',
      deliveryStats: {
        sms: { sent: 3200, delivered: 3150, failed: 50 },
        push: { sent: 2100, delivered: 2080, failed: 20 }
      },
      confirmations: 890,
      estimatedReach: 5300
    },
    {
      id: 'ALT-003',
      title: 'High Waves - Medium Risk',
      hazardType: 'high_waves',
      severity: 'medium',
      message: 'HIGH WAVES WARNING: Avoid coastal areas and fishing activities. Waves up to 4-5 meters expected.',
      sentAt: new Date(Date.now() - 14400000), // 4 hours ago
      status: 'completed',
      channels: ['sms', 'push'],
      targetArea: 'Calicut Fishing Communities (10km radius)',
      deliveryStats: {
        sms: { sent: 1800, delivered: 1780, failed: 20 },
        push: { sent: 1200, delivered: 1190, failed: 10 }
      },
      confirmations: 650,
      estimatedReach: 3000
    }
  ]);

  const getSeverityConfig = (severity) => {
    const configs = {
      low: { color: 'text-success', bg: 'bg-success/10', icon: 'Info' },
      medium: { color: 'text-warning', bg: 'bg-warning/10', icon: 'AlertTriangle' },
      high: { color: 'text-accent', bg: 'bg-accent/10', icon: 'AlertTriangle' },
      critical: { color: 'text-error', bg: 'bg-error/10', icon: 'AlertOctagon' }
    };
    return configs?.[severity] || configs?.medium;
  };

  const getStatusConfig = (status) => {
    const configs = {
      active: { color: 'text-success', bg: 'bg-success/10', label: 'Active', icon: 'Radio' },
      completed: { color: 'text-muted-foreground', bg: 'bg-muted/10', label: 'Completed', icon: 'CheckCircle' },
      cancelled: { color: 'text-error', bg: 'bg-error/10', label: 'Cancelled', icon: 'XCircle' }
    };
    return configs?.[status] || configs?.active;
  };

  const getChannelIcon = (channel) => {
    const icons = {
      sms: 'MessageSquare',
      push: 'Smartphone',
      email: 'Mail'
    };
    return icons?.[channel] || 'Bell';
  };

  const calculateDeliveryRate = (stats) => {
    const totalSent = Object.values(stats)?.reduce((sum, channel) => sum + channel?.sent, 0);
    const totalDelivered = Object.values(stats)?.reduce((sum, channel) => sum + channel?.delivered, 0);
    return totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <Icon name="Radio" size={20} className="text-success" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Active Alerts</h2>
              <p className="text-sm text-muted-foreground">
                {activeAlerts?.filter(a => a?.status === 'active')?.length} active, {activeAlerts?.length} total
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            iconName="RefreshCw"
            iconPosition="left"
          >
            Refresh
          </Button>
        </div>
      </div>
      <div className="divide-y divide-border">
        {activeAlerts?.map((alert) => {
          const severityConfig = getSeverityConfig(alert?.severity);
          const statusConfig = getStatusConfig(alert?.status);
          const deliveryRate = calculateDeliveryRate(alert?.deliveryStats);

          return (
            <div key={alert?.id} className="p-6 hover:bg-muted/30 transition-smooth">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`px-2 py-1 rounded-full ${severityConfig?.bg} flex items-center space-x-1`}>
                      <Icon name={severityConfig?.icon} size={12} className={severityConfig?.color} />
                      <span className={`text-xs font-medium ${severityConfig?.color} capitalize`}>
                        {alert?.severity}
                      </span>
                    </div>
                    <div className={`px-2 py-1 rounded-full ${statusConfig?.bg} flex items-center space-x-1`}>
                      <Icon name={statusConfig?.icon} size={12} className={statusConfig?.color} />
                      <span className={`text-xs font-medium ${statusConfig?.color}`}>
                        {statusConfig?.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {alert?.id} • {getTimeAgo(alert?.sentAt)}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-foreground mb-2">{alert?.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {alert?.message}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Icon name="MapPin" size={12} />
                      <span>{alert?.targetArea}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Icon name="Users" size={12} />
                      <span>{alert?.estimatedReach?.toLocaleString()} reached</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="Eye"
                  >
                    View
                  </Button>
                  {alert?.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      iconName="Square"
                    >
                      Stop
                    </Button>
                  )}
                </div>
              </div>
              {/* Delivery Statistics */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">Delivery Status</span>
                  <span className={`text-sm font-semibold ${deliveryRate >= 90 ? 'text-success' : deliveryRate >= 70 ? 'text-warning' : 'text-error'}`}>
                    {deliveryRate}% delivered
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {alert?.channels?.map((channel) => {
                    const stats = alert?.deliveryStats?.[channel];
                    if (!stats) return null;
                    
                    const channelRate = Math.round((stats?.delivered / stats?.sent) * 100);
                    
                    return (
                      <div key={channel} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Icon name={getChannelIcon(channel)} size={14} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground capitalize">
                              {channel}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {channelRate}%
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{stats?.delivered}/{stats?.sent}</span>
                            {stats?.failed > 0 && (
                              <span className="text-error">({stats?.failed} failed)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {alert?.confirmations > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">User Confirmations</span>
                      <span className="font-semibold text-success">
                        {alert?.confirmations?.toLocaleString()} received
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {activeAlerts?.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Radio" size={24} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Active Alerts</h3>
          <p className="text-muted-foreground">
            All alerts have been completed or cancelled
          </p>
        </div>
      )}
    </div>
  );
};

export default ActiveAlertsPanel;