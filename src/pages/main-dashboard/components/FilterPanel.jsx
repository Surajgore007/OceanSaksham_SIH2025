import React, { useState, useEffect } from 'react';
import Icon from '../../../components/Appicon';
import Button from '../../../components/ui/Button';
import { useTranslation } from '../../../context/LanguageContext';

const FilterPanel = ({ 
  filters = {}, 
  onFiltersChange = () => {},
  isOpen = false,
  onToggle = () => {},
  resultCount = 0,
  className = ''
}) => {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState({
    types: [],
    severity: [],
    timeRange: 24,
    ...filters
  });

  useEffect(() => {
    setLocalFilters(prev => ({
      ...prev,
      ...filters
    }));
  }, [filters]);

  const hazardTypes = [
    { id: 'tsunami', label: t('tsunami', 'Tsunami'), icon: 'Waves' },
    { id: 'flooding', label: t('flooding', 'Coastal Flooding'), icon: 'CloudRain' },
    { id: 'high_waves', label: t('high_waves', 'High Waves'), icon: 'Wind' },
    { id: 'storm_surge', label: t('storm_surge', 'Storm Surge'), icon: 'Zap' }
  ];

  const severityLevels = [
    { id: 'low', label: t('low', 'Low'), badgeColor: 'bg-green-100 text-green-900 border-green-400' },
    { id: 'medium', label: t('medium', 'Medium'), badgeColor: 'bg-blue-100 text-blue-900 border-blue-400' },
    { id: 'high', label: t('high', 'High'), badgeColor: 'bg-amber-100 text-amber-900 border-amber-400' },
    { id: 'critical', label: t('critical', 'Critical'), badgeColor: 'bg-red-100 text-red-900 border-red-400' }
  ];

  const timeRanges = [
    { value: 1, label: t('past1Hr', 'Past 1 Hr') },
    { value: 12, label: t('past12Hrs', 'Past 12 Hrs') },
    { value: 24, label: t('past24Hrs', 'Past 24 Hrs') },
    { value: 72, label: t('past3Days', 'Past 3 Days') },
    { value: 168, label: t('past7Days', 'Past 7 Days') }
  ];

  const toggleType = (typeId) => {
    const isSelected = localFilters?.types?.includes(typeId);
    const newTypes = isSelected 
      ? localFilters?.types?.filter(t => t !== typeId)
      : [...(localFilters?.types || []), typeId];
    
    const newFilters = { ...localFilters, types: newTypes };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const toggleSeverity = (severityId) => {
    const isSelected = localFilters?.severity?.includes(severityId);
    const newSeverity = isSelected
      ? localFilters?.severity?.filter(s => s !== severityId)
      : [...(localFilters?.severity || []), severityId];
    
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
    const cleared = { types: [], severity: [], timeRange: 24 };
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const hasActiveFilters = (localFilters?.types?.length || 0) > 0 || 
                          (localFilters?.severity?.length || 0) > 0 || 
                          localFilters?.timeRange !== 24;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 z-50 transition-opacity"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Filter Drawer / Panel - Solid High-Contrast White Card */}
      <aside className={`
        fixed md:relative top-0 left-0 h-full md:h-auto 
        w-80 max-w-[85vw] md:w-64 lg:w-72
        bg-white border-r md:border border-slate-200 shadow-2xl md:shadow-none
        transition-transform duration-300 ease-in-out z-50 md:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${className}
      `}>
        <div className="flex flex-col h-full md:h-auto max-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0 bg-white">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Icon name="Filter" size={16} />
              </div>
              <h3 className="font-bold text-slate-900 text-base">{t('filters', 'Filters')}</h3>
              {hasActiveFilters && (
                <span className="text-xs bg-primary text-white font-bold px-2 py-0.5 rounded-full">
                  {t('active', 'Active')}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-primary hover:underline font-bold"
                >
                  {t('reset', 'Reset')}
                </button>
              )}
              <Button
                variant="ghost"
                size="icon"
                iconName="X"
                onClick={onToggle}
                className="md:hidden w-8 h-8 rounded-full text-slate-700 hover:bg-slate-100"
                aria-label="Close filters"
              />
            </div>
          </div>

          {/* Filter Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white">
            {/* Hazard Types Chips */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {t('step1Title', 'Hazard Type')}
                </h4>
                <span className="text-xs font-semibold text-slate-500">
                  {localFilters?.types?.length ? `${localFilters.types.length} ${t('selected', 'selected')}` : t('all', 'All')}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {hazardTypes.map((type) => {
                  const isSelected = localFilters?.types?.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleType(type.id)}
                      className={`
                        flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold
                        border-2 transition-all duration-150 text-left
                        ${isSelected 
                          ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon name={type.icon} size={17} className={isSelected ? 'text-blue-700' : 'text-slate-500'} />
                        <span className={isSelected ? 'text-blue-950 font-bold' : 'text-slate-900 font-semibold'}>{type.label}</span>
                      </div>
                      {isSelected && (
                        <Icon name="Check" size={16} className="text-blue-700" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity Levels Chips */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {t('severityLevel', 'Severity Level')}
                </h4>
                <span className="text-xs font-semibold text-slate-500">
                  {localFilters?.severity?.length ? `${localFilters.severity.length} ${t('selected', 'selected')}` : t('all', 'All')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {severityLevels.map((lvl) => {
                  const isSelected = localFilters?.severity?.includes(lvl.id);
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => toggleSeverity(lvl.id)}
                      className={`
                        flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold
                        border-2 transition-all duration-150
                        ${isSelected 
                          ? `${lvl.badgeColor} ring-2 ring-current shadow-xs` 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }
                      `}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        lvl.id === 'critical' ? 'bg-red-600' :
                        lvl.id === 'high' ? 'bg-amber-500' :
                        lvl.id === 'medium' ? 'bg-blue-600' : 'bg-green-600'
                      }`} />
                      <span>{lvl.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Range Pills */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {t('timeWindow', 'Time Window')}
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {timeRanges.map((range) => {
                  const isSelected = localFilters?.timeRange === range.value;
                  return (
                    <button
                      key={range.value}
                      type="button"
                      onClick={() => handleTimeRangeChange(range.value)}
                      className={`
                        px-3 py-2 rounded-lg text-xs font-bold border-2 text-center transition-all
                        ${isSelected 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }
                      `}
                    >
                      {range.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Mobile Apply Footer */}
          <div className="p-4 border-t border-slate-200 bg-white md:hidden">
            <Button
              variant="default"
              size="lg"
              fullWidth
              onClick={onToggle}
              className="font-bold shadow-md bg-primary hover:bg-primary/90 text-white"
            >
              {t('showResults', 'Show Results')} ({resultCount})
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default FilterPanel;