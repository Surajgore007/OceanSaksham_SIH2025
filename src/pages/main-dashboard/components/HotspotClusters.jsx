import React, { useState } from 'react';
import Icon from '../../../components/Appicon';
import Button from '../../../components/ui/Button';
import { useTranslation } from '../../../context/LanguageContext';

const HotspotClusters = ({ 
  clusters = [],
  onClusterClick = () => {},
  onZoomToCluster = () => {},
  className = ''
}) => {
  const { t } = useTranslation();
  const [selectedCluster, setSelectedCluster] = useState(null);

  // Hotspot clusters data
  const mockClusters = [
    {
      id: 1,
      name: 'Chennai Coastal Zone',
      center: { lat: 13.0827, lng: 80.2707 },
      radius: 15,
      hazardCount: 8,
      severity: 'high',
      primaryHazards: ['tsunami', 'flood'],
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
      primaryHazards: ['flood'],
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
      status: 'active'
    }
  ];

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-100 border-red-300';
      case 'high': return 'text-amber-800 bg-amber-100 border-amber-300';
      case 'medium': return 'text-blue-800 bg-blue-100 border-blue-300';
      case 'low': return 'text-green-800 bg-green-100 border-green-300';
      default: return 'text-slate-700 bg-slate-100 border-slate-300';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return 'text-red-700 bg-red-100';
      case 'monitoring': return 'text-amber-800 bg-amber-100';
      case 'resolved': return 'text-green-800 bg-green-100';
      default: return 'text-slate-700 bg-slate-100';
    }
  };

  const getHazardIcon = (hazardType) => {
    const icons = {
      tsunami: 'Waves',
      flood: 'CloudRain',
      high_waves: 'Wind',
      storm_surge: 'Zap'
    };
    return icons?.[hazardType] || 'AlertTriangle';
  };

  const handleClusterSelect = (cluster) => {
    setSelectedCluster(cluster);
    onClusterClick(cluster);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon name="MapPin" size={18} />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">{t('hotspots', 'Hazard Hotspots')}</h3>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {mockClusters.length} {t('active', 'Active')}
        </span>
      </div>

      {/* Clusters List */}
      <div className="space-y-3">
        {mockClusters?.map((cluster) => (
          <div
            key={cluster?.id}
            className={`
              border-2 rounded-2xl p-4 sm:p-5 transition-all cursor-pointer bg-white shadow-xs
              ${selectedCluster?.id === cluster?.id 
                ? 'ring-2 ring-primary border-primary bg-blue-50/50' 
                : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }
            `}
            onClick={() => handleClusterSelect(cluster)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
                  <h4 className="font-bold text-slate-900 text-base">{cluster?.name}</h4>
                  <span className={`
                    px-2.5 py-0.5 rounded-full text-xs font-bold
                    ${getStatusBadge(cluster?.status)}
                  `}>
                    {t(cluster?.status, cluster?.status)}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs font-semibold text-slate-600 flex-wrap gap-y-1">
                  <span>{cluster?.hazardCount} {t('reportSubmission', 'Reports')}</span>
                  <span>•</span>
                  <span>{cluster?.affectedArea}</span>
                  <span>•</span>
                  <span>{cluster?.population?.toLocaleString()} {t('citizen', 'Citizens')}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconName="ZoomIn"
                onClick={(e) => {
                  e?.stopPropagation();
                  onZoomToCluster(cluster);
                }}
                className="text-primary hover:bg-primary/10 rounded-xl"
                aria-label={`Zoom to ${cluster?.name}`}
              />
            </div>

            {/* Hazard Types */}
            <div className="flex items-center space-x-2 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600">{t('step1Title', 'Hazard Type')}:</span>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                {cluster?.primaryHazards?.map((hazard, index) => (
                  <div key={index} className="flex items-center space-x-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                    <Icon 
                      name={getHazardIcon(hazard)} 
                      size={13} 
                      className="text-primary" 
                    />
                    <span className="text-xs font-bold text-slate-800">
                      {t(hazard, hazard?.replace('_', ' '))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity and Last Activity */}
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center space-x-2">
                <span className="text-slate-600">{t('severity', 'Severity')}:</span>
                <span className={`
                  px-2.5 py-0.5 rounded-full font-bold border
                  ${getSeverityBadge(cluster?.severity)}
                `}>
                  {t(cluster?.severity, cluster?.severity)}
                </span>
              </div>
              <span className="text-slate-500">
                {cluster?.lastActivity?.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotspotClusters;