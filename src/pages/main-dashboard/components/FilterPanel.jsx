import React, { useState } from 'react';
import Icon from '../../../components/Appicon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const FilterPanel = ({ 
  filters = {}, 
  onFiltersChange = () => {},
  isOpen = true,
  onToggle = () => {},
  resultCount = 0,
  className = ''
}) => {
  const [localFilters, setLocalFilters] = useState({
    types: [],
    severity: [],
    timeRange: 24,
    ...filters
  });

  const hazardTypes = [
    { id: 'tsunami', label: 'Tsunami', icon: 'Waves', count: 2 },
    { id: 'flooding', label: 'Coastal Flooding', icon: 'CloudRain', count: 1 },
    { id: 'high_waves', label: 'High Waves', icon: 'Wind', count: 1 },
    { id: 'storm_surge', label: 'Storm Surge', icon: 'Zap', count: 1 }
  ];

  const severityLevels = [
    { id: 'low', label: 'Low', color: 'text-success', count: 1 },
    { id: 'medium', label: 'Medium', color: 'text-secondary', count: 1 },
    { id: 'high', label: 'High', color: 'text-warning', count: 2 },
    { id: 'critical', label: 'Critical', color: 'text-error', count: 1 }
  ];

  const timeRanges = [
    { value: 1, label: 'Last Hour' },
    { value: 6, label: 'Last 6 Hours' },
    { value: 12, label: 'Last 12 Hours' },
    { value: 24, label: 'Last 24 Hours' },
    { value: 72, label: 'Last 3 Days' },
    { value: 168, label: 'Last Week' }
  ];

  const handleTypeChange = (typeId, checked) => {
    const newTypes = checked 
      ? [...localFilters?.types, typeId]
      : localFilters?.types?.filter(t => t !== typeId);
    
    const newFilters = { ...localFilters, types: newTypes };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSeverityChange = (severityId, checked) => {
    const newSeverity = checked
      ? [...localFilters?.severity, severityId]
      : localFilters?.severity?.filter(s => s !== severityId);
    
    const newFilters = { ...localFilters, severity: newSeverity };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleTimeRangeChange = (hours) => {
    const newFilters = { ...localFilters, timeRange: hours };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = { types: [], severity: [], timeRange: 24 };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = localFilters?.types?.length > 0 || 
                          localFilters?.severity?.length > 0 || 
                          localFilters?.timeRange !== 24;

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="md:hidden fixed top-20 left-4 z-50">
        <Button
          variant="default"
          size="sm"
          iconName="Filter"
          iconPosition="left"
          onClick={onToggle}
          className="bg-card shadow-modal"
        >
          Filters
          {hasActiveFilters && (
            <div className="ml-2 w-2 h-2 bg-accent rounded-full" />
          )}
        </Button>
      </div>
      {/* Filter Panel */}
      <div className={`
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        fixed md:relative top-0 left-0 h-full md:h-auto w-80 md:w-72
        bg-card border-r md:border border-border shadow-modal md:shadow-card
        transition-transform duration-300 ease-in-out z-40 md:z-auto
        ${className}
      `}>
        {/* Mobile Overlay */}
        {isOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/50 -z-10"
            onClick={onToggle}
          />
        )}

        <div className="flex flex-col h-full md:h-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-2">
              <Icon name="Filter" size={20} className="text-primary" />
              <h3 className="font-semibold text-foreground">Filters</h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {resultCount} results
              </span>
              <Button
                variant="ghost"
                size="icon"
                iconName="X"
                onClick={onToggle}
                className="md:hidden"
              />
            </div>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Hazard Types */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Hazard Types</h4>
              <div className="space-y-2">
                {hazardTypes?.map((type) => (
                  <div key={type?.id} className="flex items-center justify-between">
                    <Checkbox
                      label={
                        <div className="flex items-center space-x-2">
                          <Icon name={type?.icon} size={16} className="text-muted-foreground" />
                          <span>{type?.label}</span>
                        </div>
                      }
                      checked={localFilters?.types?.includes(type?.id)}
                      onChange={(e) => handleTypeChange(type?.id, e?.target?.checked)}
                    />
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {type?.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Levels */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Severity</h4>
              <div className="space-y-2">
                {severityLevels?.map((level) => (
                  <div key={level?.id} className="flex items-center justify-between">
                    <Checkbox
                      label={
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            level?.id === 'critical' ? 'bg-error' :
                            level?.id === 'high' ? 'bg-warning' :
                            level?.id === 'medium'? 'bg-secondary' : 'bg-success'
                          }`} />
                          <span className={level?.color}>{level?.label}</span>
                        </div>
                      }
                      checked={localFilters?.severity?.includes(level?.id)}
                      onChange={(e) => handleSeverityChange(level?.id, e?.target?.checked)}
                    />
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {level?.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Range */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Time Range</h4>
              <div className="space-y-2">
                {timeRanges?.map((range) => (
                  <button
                    key={range?.value}
                    onClick={() => handleTimeRangeChange(range?.value)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg transition-smooth
                      ${localFilters?.timeRange === range?.value
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-foreground'
                      }
                    `}
                  >
                    {range?.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Active Filters</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {localFilters?.types?.map(type => (
                    <span key={type} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {hazardTypes?.find(h => h?.id === type)?.label}
                    </span>
                  ))}
                  {localFilters?.severity?.map(severity => (
                    <span key={severity} className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full">
                      {severity}
                    </span>
                  ))}
                  {localFilters?.timeRange !== 24 && (
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                      {timeRanges?.find(t => t?.value === localFilters?.timeRange)?.label}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterPanel;