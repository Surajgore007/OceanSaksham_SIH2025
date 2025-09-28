import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const HotspotClusters = ({ 
  clusters = [],
  onClusterClick = () => {},
  onZoomToCluster = () => {},
  className = ''
}) => {
  const [selectedCluster, setSelectedCluster] = useState(null);

  // Mock hotspot clusters data
  const mockClusters = [
    {
      id: 1,
      name: 'Chennai Coastal Zone',
      center: { lat: 13.0827, lng: 80.2707 },
      radius: 15, // km
      hazardCount: 8,
      severity: 'high',
      primaryHazards: ['tsunami', 'flooding'],
      lastActivity: new Date(Date.now() - 1800000),
      affectedArea: '45 sq km',
      population: 125000,
      status: 'active'
    },
    {
      id: 2,
      name: 'Mumbai Harbor District',
      center: { lat: 19.0760, lng: 72.8777 },
      radius: 12,
      hazardCount: 5,
      severity: 'medium',
      primaryHazards: ['storm_surge', 'high_waves'],
      lastActivity: new Date(Date.now() - 3600000),
      affectedArea: '28 sq km',
      population: 89000,
      status: 'monitoring'
    },
    {
      id: 3,
      name: 'Kochi Backwaters',
      center: { lat: 9.9312, lng: 76.2673 },
      radius: 8,
      hazardCount: 3,
      severity: 'low',
      primaryHazards: ['flooding'],
      lastActivity: new Date(Date.now() - 7200000),
      affectedArea: '18 sq km',
      population: 45000,
      status: 'resolved'
    },
    {
      id: 4,
      name: 'Visakhapatnam Port Area',
      center: { lat: 17.6868, lng: 83.2185 },
      radius: 10,
      hazardCount: 6,
      severity: 'critical',
      primaryHazards: ['tsunami', 'storm_surge'],
      lastActivity: new Date(Date.now() - 900000),
      affectedArea: '32 sq km',
      population: 156000,
      status: 'emergency'
    }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-error bg-error/10 border-error/20';
      case 'high': return 'text-warning bg-warning/10 border-warning/20';
      case 'medium': return 'text-secondary bg-secondary/10 border-secondary/20';
      case 'low': return 'text-success bg-success/10 border-success/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'emergency': return 'text-error bg-error/10';
      case 'active': return 'text-warning bg-warning/10';
      case 'monitoring': return 'text-secondary bg-secondary/10';
      case 'resolved': return 'text-success bg-success/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getHazardIcon = (hazardType) => {
    const icons = {
      tsunami: 'Waves',
      flooding: 'CloudRain',
      high_waves: 'Wind',
      storm_surge: 'Zap'
    };
    return icons?.[hazardType] || 'AlertTriangle';
  };

  const handleClusterSelect = (cluster) => {
    setSelectedCluster(cluster);
    onClusterClick(cluster);
  };

  const handleZoomTo = (cluster) => {
    onZoomToCluster(cluster);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon name="MapPin" size={20} className="text-primary" />
          <h3 className="font-semibold text-foreground">Hazard Hotspots</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {mockClusters?.length} active clusters
        </span>
      </div>
      {/* Clusters List */}
      <div className="space-y-3">
        {mockClusters?.map((cluster) => (
          <div
            key={cluster?.id}
            className={`
              border rounded-lg p-4 transition-smooth cursor-pointer
              ${selectedCluster?.id === cluster?.id 
                ? 'ring-2 ring-primary/50 bg-primary/5' :'hover:bg-muted/50'
              }
              ${getSeverityColor(cluster?.severity)}
            `}
            onClick={() => handleClusterSelect(cluster)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-foreground">{cluster?.name}</h4>
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium capitalize
                    ${getStatusColor(cluster?.status)}
                  `}>
                    {cluster?.status}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>{cluster?.hazardCount} hazards</span>
                  <span>{cluster?.affectedArea}</span>
                  <span>{cluster?.population?.toLocaleString()} people</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconName="ZoomIn"
                onClick={(e) => {
                  e?.stopPropagation();
                  handleZoomTo(cluster);
                }}
                aria-label={`Zoom to ${cluster?.name}`}
              />
            </div>

            {/* Hazard Types */}
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-xs text-muted-foreground">Primary hazards:</span>
              <div className="flex items-center space-x-1">
                {cluster?.primaryHazards?.map((hazard, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    <Icon 
                      name={getHazardIcon(hazard)} 
                      size={14} 
                      className="text-muted-foreground" 
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {hazard?.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity and Last Activity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Severity:</span>
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium capitalize
                  ${cluster?.severity === 'critical' ? 'bg-error/20 text-error' :
                    cluster?.severity === 'high' ? 'bg-warning/20 text-warning' :
                    cluster?.severity === 'medium'? 'bg-secondary/20 text-secondary' : 'bg-success/20 text-success'}
                `}>
                  {cluster?.severity}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Last activity: {cluster?.lastActivity?.toLocaleTimeString()}
              </span>
            </div>

            {/* Expanded Details */}
            {selectedCluster?.id === cluster?.id && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Radius:</span>
                    <span className="ml-2 font-medium text-foreground">{cluster?.radius} km</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Center:</span>
                    <span className="ml-2 font-data text-foreground text-xs">
                      {cluster?.center?.lat?.toFixed(4)}, {cluster?.center?.lng?.toFixed(4)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="Eye"
                    iconPosition="left"
                    onClick={(e) => {
                      e?.stopPropagation();
                      // Handle view details
                    }}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="AlertTriangle"
                    iconPosition="left"
                    onClick={(e) => {
                      e?.stopPropagation();
                      // Handle create alert
                    }}
                  >
                    Create Alert
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Summary Stats */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-error">1</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
          <div>
            <p className="text-lg font-bold text-warning">1</p>
            <p className="text-xs text-muted-foreground">High Risk</p>
          </div>
          <div>
            <p className="text-lg font-bold text-secondary">1</p>
            <p className="text-xs text-muted-foreground">Medium Risk</p>
          </div>
          <div>
            <p className="text-lg font-bold text-success">1</p>
            <p className="text-xs text-muted-foreground">Low Risk</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotspotClusters;