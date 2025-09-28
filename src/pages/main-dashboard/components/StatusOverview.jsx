import React from 'react';
import Icon from '../../../components/AppIcon';

const StatusOverview = ({ 
  stats = {},
  alerts = [],
  className = ''
}) => {
  const defaultStats = {
    totalReports: 156,
    activeHazards: 5,
    criticalAlerts: 1,
    lastUpdate: new Date(),
    ...stats
  };

  const recentAlerts = [
    {
      id: 1,
      type: 'tsunami',
      severity: 'critical',
      location: 'Chennai Coast',
      timestamp: new Date(Date.now() - 1800000),
      status: 'active'
    },
    {
      id: 2,
      type: 'flooding',
      severity: 'high',
      location: 'Goa Coastline',
      timestamp: new Date(Date.now() - 3600000),
      status: 'monitoring'
    },
    {
      id: 3,
      type: 'high_waves',
      severity: 'medium',
      location: 'Puducherry Beach',
      timestamp: new Date(Date.now() - 7200000),
      status: 'resolved'
    }
  ];

  const statusCards = [
    {
      title: 'Total Reports',
      value: defaultStats?.totalReports,
      icon: 'FileText',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: '+12%'
    },
    {
      title: 'Active Hazards',
      value: defaultStats?.activeHazards,
      icon: 'AlertTriangle',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      trend: '+2'
    },
    {
      title: 'Critical Alerts',
      value: defaultStats?.criticalAlerts,
      icon: 'AlertCircle',
      color: 'text-error',
      bgColor: 'bg-error/10',
      trend: '0'
    },
    {
      title: 'System Status',
      value: 'Online',
      icon: 'Wifi',
      color: 'text-success',
      bgColor: 'bg-success/10',
      trend: '99.9%'
    }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-error bg-error/10';
      case 'high': return 'text-warning bg-warning/10';
      case 'medium': return 'text-secondary bg-secondary/10';
      case 'low': return 'text-success bg-success/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-error bg-error/10';
      case 'monitoring': return 'text-warning bg-warning/10';
      case 'resolved': return 'text-success bg-success/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards?.map((card, index) => (
          <div key={index} className="glass-card rounded-lg p-4 transition-smooth hover:shadow-modal">
            <div className="flex items-center justify-between mb-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${card?.bgColor}`}>
                <Icon name={card?.icon} size={20} className={card?.color} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {card?.trend}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">{card?.value}</p>
              <p className="text-sm text-muted-foreground">{card?.title}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Recent Alerts */}
      <div className="bg-card border border-border rounded-lg shadow-card">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Icon name="Bell" size={20} className="text-primary" />
            <h3 className="font-semibold text-foreground">Recent Alerts</h3>
          </div>
          <span className="text-sm text-muted-foreground">
            Last updated: {defaultStats?.lastUpdate?.toLocaleTimeString()}
          </span>
        </div>
        
        <div className="divide-y divide-border">
          {recentAlerts?.map((alert) => (
            <div key={alert?.id} className="p-4 hover:bg-muted/50 transition-smooth">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full
                    ${getSeverityColor(alert?.severity)}
                  `}>
                    <Icon 
                      name={alert?.type === 'tsunami' ? 'Waves' : 
                            alert?.type === 'flooding' ? 'CloudRain' :
                            alert?.type === 'high_waves' ? 'Wind' : 'Zap'} 
                      size={16} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-foreground capitalize">
                        {alert?.type?.replace('_', ' ')}
                      </p>
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium capitalize
                        ${getSeverityColor(alert?.severity)}
                      `}>
                        {alert?.severity}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {alert?.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {alert?.timestamp?.toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium capitalize
                  ${getStatusColor(alert?.status)}
                `}>
                  {alert?.status}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-border">
          <button className="w-full text-center text-sm text-primary hover:text-primary/80 font-medium transition-smooth">
            View All Alerts
          </button>
        </div>
      </div>
      {/* System Health */}
      <div className="bg-card border border-border rounded-lg shadow-card p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Icon name="Activity" size={20} className="text-primary" />
          <h3 className="font-semibold text-foreground">System Health</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-full mx-auto mb-2">
              <Icon name="Server" size={24} className="text-success" />
            </div>
            <p className="text-sm font-medium text-foreground">API Status</p>
            <p className="text-xs text-success">Operational</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-full mx-auto mb-2">
              <Icon name="Database" size={24} className="text-success" />
            </div>
            <p className="text-sm font-medium text-foreground">Database</p>
            <p className="text-xs text-success">Connected</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-warning/10 rounded-full mx-auto mb-2">
              <Icon name="Wifi" size={24} className="text-warning" />
            </div>
            <p className="text-sm font-medium text-foreground">Sync Status</p>
            <p className="text-xs text-warning">Syncing</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusOverview;