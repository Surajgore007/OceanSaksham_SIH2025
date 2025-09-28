import React, { useState } from 'react';
import Icon from '../../../components/Appicon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const ReportFilters = ({ 
  onFilterChange = () => {},
  totalCount = 0,
  filteredCount = 0 
}) => {
  const [filters, setFilters] = useState({
    search: '',
    hazardType: '',
    severity: '',
    timeRange: '24h',
    location: '',
    status: 'pending'
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const hazardTypeOptions = [
    { value: '', label: 'All Hazard Types' },
    { value: 'tsunami', label: 'Tsunami Warning' },
    { value: 'flooding', label: 'Coastal Flooding' },
    { value: 'high-waves', label: 'High Waves' },
    { value: 'storm-surge', label: 'Storm Surge' },
    { value: 'erosion', label: 'Coastal Erosion' }
  ];

  const severityOptions = [
    { value: '', label: 'All Severity Levels' },
    { value: 'low', label: 'Low Risk' },
    { value: 'medium', label: 'Medium Risk' },
    { value: 'high', label: 'High Risk' },
    { value: 'critical', label: 'Critical Risk' }
  ];

  const timeRangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending Review' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All Status' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      hazardType: '',
      severity: '',
      timeRange: '24h',
      location: '',
      status: 'pending'
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Object.entries(filters)?.some(([key, value]) => {
    if (key === 'timeRange') return value !== '24h';
    if (key === 'status') return value !== 'pending';
    return value !== '';
  });

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Icon name="Filter" size={20} className="text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Filter Reports</h3>
          <div className="text-sm text-muted-foreground">
            {filteredCount !== totalCount ? (
              <span>
                Showing {filteredCount} of {totalCount} reports
              </span>
            ) : (
              <span>{totalCount} total reports</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              iconName="X"
              onClick={clearFilters}
            >
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Less' : 'More'}
          </Button>
        </div>
      </div>
      {/* Quick Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Input
          type="search"
          placeholder="Search reports..."
          value={filters?.search}
          onChange={(e) => handleFilterChange('search', e?.target?.value)}
          className="w-full"
        />
        
        <Select
          options={statusOptions}
          value={filters?.status}
          onChange={(value) => handleFilterChange('status', value)}
          placeholder="Filter by status"
        />
        
        <Select
          options={hazardTypeOptions}
          value={filters?.hazardType}
          onChange={(value) => handleFilterChange('hazardType', value)}
          placeholder="Filter by hazard type"
        />
        
        <Select
          options={timeRangeOptions}
          value={filters?.timeRange}
          onChange={(value) => handleFilterChange('timeRange', value)}
          placeholder="Select time range"
        />
      </div>
      {/* Expanded Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
          <Select
            label="Severity Level"
            options={severityOptions}
            value={filters?.severity}
            onChange={(value) => handleFilterChange('severity', value)}
            placeholder="Filter by severity"
          />
          
          <Input
            label="Location"
            type="text"
            placeholder="City, district, or coordinates"
            value={filters?.location}
            onChange={(e) => handleFilterChange('location', e?.target?.value)}
          />
        </div>
      )}
      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
          {Object.entries(filters)?.map(([key, value]) => {
            if (!value || (key === 'timeRange' && value === '24h') || (key === 'status' && value === 'pending')) return null;
            
            const getDisplayValue = () => {
              switch (key) {
                case 'hazardType':
                  return hazardTypeOptions?.find(opt => opt?.value === value)?.label || value;
                case 'severity':
                  return severityOptions?.find(opt => opt?.value === value)?.label || value;
                case 'timeRange':
                  return timeRangeOptions?.find(opt => opt?.value === value)?.label || value;
                case 'status':
                  return statusOptions?.find(opt => opt?.value === value)?.label || value;
                default:
                  return value;
              }
            };

            return (
              <div
                key={key}
                className="flex items-center space-x-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
              >
                <span>{getDisplayValue()}</span>
                <button
                  onClick={() => handleFilterChange(key, key === 'timeRange' ? '24h' : key === 'status' ? 'pending' : '')}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReportFilters;