import React from 'react';
import Icon from '../../../components/Appicon';
import { useTranslation } from '../../../context/LanguageContext';

const StatusOverview = ({ 
  stats = {},
  alerts = [],
  className = ''
}) => {
  const { t } = useTranslation();

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
      type: 'flood',
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
      title: t('totalReports', 'Total Reports'),
      value: defaultStats?.totalReports,
      icon: 'FileText',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: '+12%'
    },
    {
      title: t('activeHazards', 'Active Hazards'),
      value: defaultStats?.activeHazards,
      icon: 'AlertTriangle',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      trend: '+2'
    },
    {
      title: t('criticalAlertsCount', 'Critical Alerts'),
      value: defaultStats?.criticalAlerts,
      icon: 'AlertCircle',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: '0'
    },
    {
      title: t('systemStatus', 'System Status'),
      value: t('live', 'Online'),
      icon: 'Wifi',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '99.9%'
    }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-300';
      case 'high': return 'text-amber-800 bg-amber-100 border-amber-300';
      case 'medium': return 'text-blue-800 bg-blue-100 border-blue-300';
      case 'low': return 'text-green-800 bg-green-100 border-green-300';
      default: return 'text-slate-700 bg-slate-100 border-slate-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-red-700 bg-red-100';
      case 'monitoring': return 'text-amber-800 bg-amber-100';
      case 'resolved': return 'text-green-800 bg-green-100';
      default: return 'text-slate-700 bg-slate-100';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards?.map((card, index) => (
          <div key={index} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${card?.bgColor}`}>
                <Icon name={card?.icon} size={22} className={card?.color} />
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {card?.trend}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black text-slate-900">{card?.value}</p>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{card?.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Alerts */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="Bell" size={16} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">{t('alerts', 'Recent Alerts')}</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {defaultStats?.lastUpdate?.toLocaleTimeString()}
          </span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {recentAlerts?.map((alert) => (
            <div key={alert?.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3.5">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-xl border flex-shrink-0
                    ${getSeverityColor(alert?.severity)}
                  `}>
                    <Icon 
                      name={alert?.type === 'tsunami' ? 'Waves' : 
                            alert?.type === 'flood' ? 'CloudRain' :
                            alert?.type === 'high_waves' ? 'Wind' : 'Zap'} 
                      size={18} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                      <p className="font-bold text-slate-900 text-sm">
                        {t(alert?.type, alert?.type?.replace('_', ' '))}
                      </p>
                      <span className={`
                        px-2 py-0.5 rounded-full text-xs font-bold border
                        ${getSeverityColor(alert?.severity)}
                      `}>
                        {t(alert?.severity, alert?.severity)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                      {alert?.location}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {alert?.timestamp?.toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`
                  px-2.5 py-1 rounded-full text-xs font-bold
                  ${getStatusColor(alert?.status)}
                `}>
                  {t(alert?.status, alert?.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusOverview;