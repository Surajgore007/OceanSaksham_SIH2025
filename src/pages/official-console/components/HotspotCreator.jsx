import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const HotspotCreator = ({ 
  isOpen = false,
  onClose = () => {},
  onCreateHotspot = () => {},
  initialLocation = null
}) => {
  const [hotspotData, setHotspotData] = useState({
    name: '',
    description: '',
    hazardType: '',
    severity: 'high', // Default to high for danger theme
    radius: 1000,
    alertEnabled: true,
    coordinates: initialLocation || { lat: 19.0760, lng: 72.8777 }, // Default to Mumbai
    address: ''
  });

  const [isCreating, setIsCreating] = useState(false);

  const hazardTypeOptions = [
    { value: 'tsunami', label: 'Tsunami Risk Zone' },
    { value: 'flooding', label: 'Flood Prone Area' },
    { value: 'high_waves', label: 'High Wave Zone' },
    { value: 'storm_surge', label: 'Storm Surge Area' },
    { value: 'coastal_erosion', label: 'Erosion Risk Zone' },
    { value: 'oil_spill', label: 'Oil Spill Area' },
    { value: 'general', label: 'General Hazard Zone' }
  ];

  const severityOptions = [
    { value: 'low', label: 'Low Risk' },
    { value: 'medium', label: 'Medium Risk' },
    { value: 'high', label: 'High Risk' },
    { value: 'critical', label: 'Critical Risk' }
  ];

  const radiusOptions = [
    { value: 500, label: '500m radius' },
    { value: 1000, label: '1km radius' },
    { value: 2000, label: '2km radius' },
    { value: 5000, label: '5km radius' },
    { value: 10000, label: '10km radius' }
  ];

  const handleInputChange = (field, value) => {
    setHotspotData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCoordinateChange = (field, value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setHotspotData(prev => ({
        ...prev,
        coordinates: {
          ...prev?.coordinates,
          [field]: numValue
        }
      }));
    }
  };

  const handleCreate = async () => {
    if (!hotspotData?.name?.trim() || !hotspotData?.hazardType) {
      return;
    }

    setIsCreating(true);
    try {
      const newHotspot = {
        ...hotspotData,
        id: `hotspot_${Date.now()}`,
        lat: hotspotData.coordinates.lat,
        lng: hotspotData.coordinates.lng,
        location: hotspotData.address || `${hotspotData.coordinates.lat.toFixed(4)}, ${hotspotData.coordinates.lng.toFixed(4)}`,
        timestamp: new Date(),
        createdAt: new Date().toISOString(),
        createdBy: 'current_official',
        source: 'official',
        status: 'verified',
        type: hotspotData.hazardType,
        reportedBy: 'Official Authority'
      };

      // Store in localStorage
      const existingHotspots = JSON.parse(localStorage.getItem('hazardReports') || '[]');
      existingHotspots.push(newHotspot);
      localStorage.setItem('hazardReports', JSON.stringify(existingHotspots));

      // Call parent callback
      await onCreateHotspot(newHotspot);
      
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating hotspot:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setHotspotData({
      name: '',
      description: '',
      hazardType: '',
      severity: 'high',
      radius: 1000,
      alertEnabled: true,
      coordinates: { lat: 19.0760, lng: 72.8777 },
      address: ''
    });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation?.getCurrentPosition(
        (position) => {
          setHotspotData(prev => ({
            ...prev,
            coordinates: {
              lat: position?.coords?.latitude,
              lng: position?.coords?.longitude
            },
            address: `${position?.coords?.latitude?.toFixed(4)}, ${position?.coords?.longitude?.toFixed(4)}`
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default Mumbai coordinates on error
          setHotspotData(prev => ({
            ...prev,
            coordinates: { lat: 19.0760, lng: 72.8777 },
            address: 'Mumbai, Maharashtra'
          }));
        }
      );
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: '#38A169',
      medium: '#D69E2E',
      high: '#E53E3E',
      critical: '#9F1239'
    };
    return colors[severity] || colors.high;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-200 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-card rounded-lg shadow-modal border border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-error/10 rounded-lg">
                <Icon name="AlertTriangle" size={20} className="text-error" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Create Hazard Hotspot</h2>
                <p className="text-sm text-muted-foreground">
                  Define a high-risk danger zone for monitoring and alerts
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              iconName="X"
              onClick={onClose}
            />
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Danger Warning */}
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <Icon name="AlertTriangle" size={20} className="text-error mt-0.5" />
                <div>
                  <h4 className="font-medium text-error mb-1">Danger Zone Creation</h4>
                  <p className="text-sm text-muted-foreground">
                    This will create a high-visibility danger hotspot that will appear as a red warning marker on all maps.
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Hazard Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Hotspot Name"
                  type="text"
                  placeholder="e.g., Marina Beach High Wave Danger Zone"
                  value={hotspotData?.name}
                  onChange={(e) => handleInputChange('name', e?.target?.value)}
                  required
                />
                
                <Select
                  label="Hazard Type"
                  options={hazardTypeOptions}
                  value={hotspotData?.hazardType}
                  onChange={(value) => handleInputChange('hazardType', value)}
                  placeholder="Select hazard type"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Select
                    label="Risk Severity"
                    options={severityOptions}
                    value={hotspotData?.severity}
                    onChange={(value) => handleInputChange('severity', value)}
                  />
                  <div 
                    className="mt-1 p-2 rounded border-2 border-dashed"
                    style={{ 
                      borderColor: getSeverityColor(hotspotData.severity),
                      backgroundColor: `${getSeverityColor(hotspotData.severity)}10`
                    }}
                  >
                    <p className="text-xs font-medium" style={{ color: getSeverityColor(hotspotData.severity) }}>
                      Marker Color Preview: {hotspotData.severity.toUpperCase()}
                    </p>
                  </div>
                </div>
                
                <Select
                  label="Alert Radius"
                  options={radiusOptions}
                  value={hotspotData?.radius}
                  onChange={(value) => handleInputChange('radius', parseInt(value))}
                />
              </div>
              
              <Input
                label="Description"
                type="textarea"
                placeholder="Describe the hazard characteristics, risk factors, and safety warnings..."
                value={hotspotData?.description}
                onChange={(e) => handleInputChange('description', e?.target?.value)}
                className="min-h-20"
              />
            </div>

            {/* Location */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Danger Zone Location</h3>
                <Button
                  variant="outline"
                  size="sm"
                  iconName="MapPin"
                  onClick={getCurrentLocation}
                >
                  Use Current Location
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 13.0827"
                  value={hotspotData?.coordinates?.lat || ''}
                  onChange={(e) => handleCoordinateChange('lat', e?.target?.value)}
                />
                
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 80.2707"
                  value={hotspotData?.coordinates?.lng || ''}
                  onChange={(e) => handleCoordinateChange('lng', e?.target?.value)}
                />
              </div>
              
              <Input
                label="Address/Location Name"
                type="text"
                placeholder="Street address or landmark"
                value={hotspotData?.address}
                onChange={(e) => handleInputChange('address', e?.target?.value)}
              />
            </div>

            {/* Map Preview */}
            {hotspotData?.coordinates?.lat && hotspotData?.coordinates?.lng && (
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Hotspot Location Preview</h3>
                <div className="h-48 bg-muted/30 rounded-lg overflow-hidden border-2 border-error/20">
                  <iframe
                    width="100%"
                    height="100%"
                    loading="lazy"
                    title="Hotspot Location"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${hotspotData?.coordinates?.lat},${hotspotData?.coordinates?.lng}&z=14&output=embed`}
                  />
                </div>
                <div className="p-2 bg-error/5 rounded border border-error/20">
                  <p className="text-xs text-error font-medium">
                    Red danger marker will appear at: {hotspotData?.coordinates?.lat?.toFixed(4)}, {hotspotData?.coordinates?.lng?.toFixed(4)}
                  </p>
                </div>
              </div>
            )}

            {/* Hotspot Preview */}
            <div className="p-4 bg-muted/30 rounded-lg border">
              <h4 className="font-semibold text-foreground mb-3">Hotspot Marker Preview</h4>
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-lg"
                  style={{ backgroundColor: getSeverityColor(hotspotData.severity) }}
                >
                  <Icon name="AlertTriangle" size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{hotspotData.name || 'Unnamed Hotspot'}</p>
                  <p className="text-sm text-muted-foreground">
                    {hotspotData.hazardType?.replace('_', ' ')} • {hotspotData.severity} severity
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              iconName="AlertTriangle"
              onClick={handleCreate}
              loading={isCreating}
              disabled={!hotspotData?.name?.trim() || !hotspotData?.hazardType}
              className="bg-error hover:bg-error/90 text-white"
            >
              Create Danger Hotspot
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotspotCreator;