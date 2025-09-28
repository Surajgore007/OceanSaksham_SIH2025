import React from 'react';
import Icon from '../../../components/Appicon';

const ReportMetrics = ({ metrics = {} }) => {
  const defaultMetrics = {
    pending: 24,
    verified: 156,
    rejected: 12,
    critical: 3,
    dailyTarget: 50,
    verificationRate: 87,
    avgResponseTime: '2.4h',
    ...metrics
  };

  const metricCards = [
    {
      id: 'pending',
      title: 'Pending Reports',
      value: defaultMetrics?.pending,
      icon: 'Clock',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      trend: '+5 today'
    },
    {
      id: 'verified',
      title: 'Verified Today',
      value: defaultMetrics?.verified,
      icon: 'CheckCircle',
      color: 'text-success',
      bgColor: 'bg-success/10',
      trend: `${Math.round((defaultMetrics?.verified / defaultMetrics?.dailyTarget) * 100)}% of target`
    },
    {
      id: 'critical',
      title: 'Critical Alerts',
      value: defaultMetrics?.critical,
      icon: 'AlertTriangle',
      color: 'text-error',
      bgColor: 'bg-error/10',
      trend: 'Immediate attention'
    },
    {
      id: 'rate',
      title: 'Verification Rate',
      value: `${defaultMetrics?.verificationRate}%`,
      icon: 'TrendingUp',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      trend: `Avg: ${defaultMetrics?.avgResponseTime}`
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metricCards?.map((metric) => (
        <div
          key={metric?.id}
          className="glass-card rounded-lg p-4 transition-smooth hover:shadow-modal"
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-lg
              ${metric?.bgColor}
            `}>
              <Icon 
                name={metric?.icon} 
                size={20} 
                className={metric?.color}
              />
            </div>
            {metric?.id === 'critical' && metric?.value > 0 && (
              <div className="w-2 h-2 bg-error rounded-full pulse-indicator" />
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              {metric?.title}
            </h3>
            <p className="text-2xl font-bold text-foreground">
              {metric?.value}
            </p>
            <p className="text-xs text-muted-foreground">
              {metric?.trend}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReportMetrics;