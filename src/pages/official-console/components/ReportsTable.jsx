import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const ReportsTable = ({ 
  reports = [],
  selectedReports = [],
  onSelectReport = () => {},
  onSelectAll = () => {},
  onViewReport = () => {},
  onVerifyReport = () => {},
  onRejectReport = () => {},
  sortBy = 'timestamp',
  sortOrder = 'desc',
  onSort = () => {}
}) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'text-success bg-success/10',
      medium: 'text-warning bg-warning/10',
      high: 'text-error bg-error/10',
      critical: 'text-error bg-error/20 font-bold'
    };
    return colors?.[severity] || colors?.low;
  };

  const getHazardIcon = (type) => {
    const icons = {
      tsunami: 'Waves',
      flooding: 'Droplets',
      'high-waves': 'Wind',
      'storm-surge': 'CloudRain',
      erosion: 'Mountain'
    };
    return icons?.[type] || 'AlertTriangle';
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'text-warning bg-warning/10', icon: 'Clock', label: 'Pending' },
      verified: { color: 'text-success bg-success/10', icon: 'CheckCircle', label: 'Verified' },
      rejected: { color: 'text-error bg-error/10', icon: 'XCircle', label: 'Rejected' }
    };
    return badges?.[status] || badges?.pending;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date?.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handleSort = (column) => {
    const newOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(column, newOrder);
  };

  const SortableHeader = ({ column, children, className = '' }) => (
    <th 
      className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-smooth ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortBy === column && (
          <Icon 
            name={sortOrder === 'asc' ? 'ChevronUp' : 'ChevronDown'} 
            size={14} 
          />
        )}
      </div>
    </th>
  );

  if (reports?.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Reports Found</h3>
        <p className="text-muted-foreground">
          No reports match your current filters. Try adjusting your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Table Header with Bulk Actions */}
      {selectedReports?.length > 0 && (
        <div className="bg-primary/5 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Icon name="CheckSquare" size={20} className="text-primary" />
              <span className="font-medium text-foreground">
                {selectedReports?.length} report{selectedReports?.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                iconName="CheckCircle"
                onClick={() => onVerifyReport(selectedReports, true)}
              >
                Bulk Verify
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="XCircle"
                onClick={() => onRejectReport(selectedReports, true)}
              >
                Bulk Reject
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-4 py-3 w-12">
                <Checkbox
                  checked={selectedReports?.length === reports?.length && reports?.length > 0}
                  onChange={(e) => onSelectAll(e?.target?.checked)}
                />
              </th>
              <SortableHeader column="timestamp">Time</SortableHeader>
              <SortableHeader column="hazardType">Hazard</SortableHeader>
              <SortableHeader column="severity">Severity</SortableHeader>
              <SortableHeader column="location">Location</SortableHeader>
              <SortableHeader column="reporter">Reporter</SortableHeader>
              <SortableHeader column="status">Status</SortableHeader>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reports?.map((report) => {
              const isSelected = selectedReports?.includes(report?.id);
              const isHovered = hoveredRow === report?.id;
              const statusBadge = getStatusBadge(report?.status);

              return (
                <tr
                  key={report?.id}
                  className={`
                    transition-smooth hover:bg-muted/30 cursor-pointer
                    ${isSelected ? 'bg-primary/5' : ''}
                    ${isHovered ? 'shadow-sm' : ''}
                  `}
                  onMouseEnter={() => setHoveredRow(report?.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onViewReport(report)}
                >
                  <td className="px-4 py-4" onClick={(e) => e?.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => onSelectReport(report?.id, e?.target?.checked)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {formatTimestamp(report?.timestamp)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.timestamp)?.toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Icon 
                        name={getHazardIcon(report?.hazardType)} 
                        size={16} 
                        className="text-secondary" 
                      />
                      <span className="text-sm font-medium text-foreground capitalize">
                        {report?.hazardType?.replace('-', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${getSeverityColor(report?.severity)}
                    `}>
                      {report?.severity?.charAt(0)?.toUpperCase() + report?.severity?.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col max-w-xs">
                      <span className="text-sm font-medium text-foreground truncate">
                        {report?.location?.address}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {report?.location?.coordinates?.lat?.toFixed(4)}, {report?.location?.coordinates?.lng?.toFixed(4)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {report?.reporter?.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {report?.reporter?.phone}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-1">
                      <Icon name={statusBadge?.icon} size={14} className={statusBadge?.color} />
                      <span className={`text-xs font-medium ${statusBadge?.color}`}>
                        {statusBadge?.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right" onClick={(e) => e?.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Eye"
                        onClick={() => onViewReport(report)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                      {report?.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconName="CheckCircle"
                            onClick={() => onVerifyReport([report?.id])}
                            className="text-success hover:text-success hover:bg-success/10"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            iconName="XCircle"
                            onClick={() => onRejectReport([report?.id])}
                            className="text-error hover:text-error hover:bg-error/10"
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsTable;