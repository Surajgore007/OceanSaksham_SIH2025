import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const AlertHistory = ({ className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  const [alertHistory] = useState([
    {
      id: 'ALT-001',
      title: 'Tsunami Warning - Critical Emergency',
      hazardType: 'tsunami',
      severity: 'critical',
      status: 'active',
      sentAt: new Date(Date.now() - 1800000),
      sentBy: 'Dr. Rajesh Kumar',
      targetArea: 'Kochi Coastal Region',
      totalReach: 5540,
      deliveryRate: 97,
      confirmations: 1250,
      effectiveness: 'high'
    },
    {
      id: 'ALT-002',
      title: 'Cyclone Alert - High Risk',
      hazardType: 'cyclone',
      severity: 'high',
      status: 'active',
      sentAt: new Date(Date.now() - 7200000),
      sentBy: 'Priya Nair',
      targetArea: 'Thiruvananthapuram District',
      totalReach: 5300,
      deliveryRate: 99,
      confirmations: 890,
      effectiveness: 'high'
    },
    {
      id: 'ALT-003',
      title: 'High Waves - Medium Risk',
      hazardType: 'high_waves',
      severity: 'medium',
      status: 'completed',
      sentAt: new Date(Date.now() - 14400000),
      sentBy: 'Mohammed Ali',
      targetArea: 'Calicut Fishing Communities',
      totalReach: 3000,
      deliveryRate: 99,
      confirmations: 650,
      effectiveness: 'medium'
    },
    {
      id: 'ALT-004',
      title: 'Storm Surge Warning - High Risk',
      hazardType: 'storm_surge',
      severity: 'high',
      status: 'completed',
      sentAt: new Date(Date.now() - 86400000),
      sentBy: 'Dr. Rajesh Kumar',
      targetArea: 'Mangalore Coastal Belt',
      totalReach: 4200,
      deliveryRate: 95,
      confirmations: 1100,
      effectiveness: 'high'
    },
    {
      id: 'ALT-005',
      title: 'Coastal Flooding - Low Risk',
      hazardType: 'coastal_flooding',
      severity: 'low',
      status: 'completed',
      sentAt: new Date(Date.now() - 172800000),
      sentBy: 'Anita Sharma',
      targetArea: 'Goa Coastal Areas',
      totalReach: 2800,
      deliveryRate: 98,
      confirmations: 420,
      effectiveness: 'medium'
    },
    {
      id: 'ALT-006',
      title: 'Tsunami Drill - Test Alert',
      hazardType: 'tsunami',
      severity: 'low',
      status: 'cancelled',
      sentAt: new Date(Date.now() - 259200000),
      sentBy: 'System Admin',
      targetArea: 'Chennai Test Zone',
      totalReach: 150,
      deliveryRate: 100,
      confirmations: 45,
      effectiveness: 'low'
    }
  ]);

  const severityOptions = [
    { value: '', label: 'All Severities' },
    { value: 'low', label: 'Low Risk' },
    { value: 'medium', label: 'Medium Risk' },
    { value: 'high', label: 'High Risk' },
    { value: 'critical', label: 'Critical Emergency' }
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const sortOptions = [
    { value: 'date_desc', label: 'Newest First' },
    { value: 'date_asc', label: 'Oldest First' },
    { value: 'severity_desc', label: 'Highest Severity' },
    { value: 'effectiveness_desc', label: 'Most Effective' }
  ];

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
    return configs?.[status] || configs?.completed;
  };

  const getEffectivenessConfig = (effectiveness) => {
    const configs = {
      high: { color: 'text-success', label: 'High' },
      medium: { color: 'text-warning', label: 'Medium' },
      low: { color: 'text-error', label: 'Low' }
    };
    return configs?.[effectiveness] || configs?.medium;
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredAndSortedAlerts = alertHistory?.filter(alert => {
      const matchesSearch = alert?.title?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
                           alert?.sentBy?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
                           alert?.targetArea?.toLowerCase()?.includes(searchTerm?.toLowerCase());
      const matchesSeverity = !filterSeverity || alert?.severity === filterSeverity;
      const matchesStatus = !filterStatus || alert?.status === filterStatus;
      
      return matchesSearch && matchesSeverity && matchesStatus;
    })?.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return a?.sentAt - b?.sentAt;
        case 'severity_desc':
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return severityOrder?.[b?.severity] - severityOrder?.[a?.severity];
        case 'effectiveness_desc':
          const effectivenessOrder = { high: 3, medium: 2, low: 1 };
          return effectivenessOrder?.[b?.effectiveness] - effectivenessOrder?.[a?.effectiveness];
        default: // date_desc
          return b?.sentAt - a?.sentAt;
      }
    });

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="History" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Alert History</h2>
              <p className="text-sm text-muted-foreground">
                {filteredAndSortedAlerts?.length} of {alertHistory?.length} alerts
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            iconName="Download"
            iconPosition="left"
          >
            Export
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e?.target?.value)}
            className="md:col-span-1"
          />
          <Select
            placeholder="Filter by severity"
            options={severityOptions}
            value={filterSeverity}
            onChange={setFilterSeverity}
          />
          <Select
            placeholder="Filter by status"
            options={statusOptions}
            value={filterStatus}
            onChange={setFilterStatus}
          />
          <Select
            placeholder="Sort by"
            options={sortOptions}
            value={sortBy}
            onChange={setSortBy}
          />
        </div>
      </div>
      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {filteredAndSortedAlerts?.map((alert) => {
          const severityConfig = getSeverityConfig(alert?.severity);
          const statusConfig = getStatusConfig(alert?.status);
          const effectivenessConfig = getEffectivenessConfig(alert?.effectiveness);

          return (
            <div key={alert?.id} className="p-6 hover:bg-muted/30 transition-smooth">
              <div className="flex items-start justify-between">
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
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Sent by</p>
                      <p className="font-medium text-foreground">{alert?.sentBy}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Target Area</p>
                      <p className="font-medium text-foreground">{alert?.targetArea}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Reach</p>
                      <p className="font-medium text-foreground">
                        {alert?.totalReach?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Delivery Rate</p>
                      <p className={`font-medium ${alert?.deliveryRate >= 95 ? 'text-success' : alert?.deliveryRate >= 85 ? 'text-warning' : 'text-error'}`}>
                        {alert?.deliveryRate}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Icon name="CheckCircle" size={14} className="text-success" />
                        <span className="text-muted-foreground">
                          {alert?.confirmations} confirmations
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Icon name="TrendingUp" size={14} className={effectivenessConfig?.color} />
                        <span className={`${effectivenessConfig?.color} font-medium`}>
                          {effectivenessConfig?.label} effectiveness
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="Eye"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filteredAndSortedAlerts?.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Search" size={24} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Alerts Found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
};

export default AlertHistory;