import React, { useState } from 'react';
import Icon from '../../../components/Appicon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const GeographicTargeting = ({ onAreaSelect, className = '' }) => {
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [targetingMode, setTargetingMode] = useState('radius');
  const [radiusSettings, setRadiusSettings] = useState({
    center: { lat: 11.0168, lng: 76.9558, name: 'Kochi, Kerala' },
    radius: 10
  });

  const predefinedAreas = [
    {
      id: 'kerala-coast',
      name: 'Kerala Coastal Belt',
      type: 'state',
      population: 2500000,
      coordinates: { lat: 10.8505, lng: 76.2711 },
      districts: ['Thiruvananthapuram', 'Kollam', 'Alappuzha', 'Ernakulam', 'Thrissur', 'Malappuram', 'Kozhikode', 'Kannur', 'Kasaragod']
    },
    {
      id: 'tamil-nadu-coast',
      name: 'Tamil Nadu Coastal Region',
      type: 'state',
      population: 3200000,
      coordinates: { lat: 11.1271, lng: 78.6569 },
      districts: ['Chennai', 'Kanchipuram', 'Tiruvallur', 'Cuddalore', 'Villupuram', 'Nagapattinam', 'Thanjavur', 'Tiruvarur']
    },
    {
      id: 'karnataka-coast',
      name: 'Karnataka Coastal Areas',
      type: 'state',
      population: 1800000,
      coordinates: { lat: 14.5203, lng: 74.3587 },
      districts: ['Dakshina Kannada', 'Udupi', 'Uttara Kannada']
    },
    {
      id: 'goa-coast',
      name: 'Goa Coastal Zone',
      type: 'state',
      population: 800000,
      coordinates: { lat: 15.2993, lng: 74.1240 },
      districts: ['North Goa', 'South Goa']
    },
    {
      id: 'mumbai-metro',
      name: 'Mumbai Metropolitan Region',
      type: 'metro',
      population: 4500000,
      coordinates: { lat: 19.0760, lng: 72.8777 },
      districts: ['Mumbai City', 'Mumbai Suburban', 'Thane', 'Raigad']
    }
  ];

  const vulnerabilityZones = [
    {
      id: 'fishing-communities',
      name: 'Fishing Communities',
      description: 'Coastal fishing villages and harbors',
      priority: 'high',
      population: 850000
    },
    {
      id: 'tourist-areas',
      name: 'Tourist Destinations',
      description: 'Beach resorts and tourist hotspots',
      priority: 'medium',
      population: 1200000
    },
    {
      id: 'industrial-zones',
      name: 'Industrial Coastal Areas',
      description: 'Ports, refineries, and industrial complexes',
      priority: 'high',
      population: 650000
    },
    {
      id: 'urban-coastal',
      name: 'Urban Coastal Areas',
      description: 'Densely populated coastal cities',
      priority: 'critical',
      population: 3500000
    }
  ];

  const targetingModes = [
    { value: 'radius', label: 'Radius-based Targeting' },
    { value: 'predefined', label: 'Predefined Areas' },
    { value: 'vulnerability', label: 'Vulnerability Zones' },
    { value: 'custom', label: 'Custom Polygon' }
  ];

  const handleAreaToggle = (areaId) => {
    setSelectedAreas(prev => 
      prev?.includes(areaId) 
        ? prev?.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  const handleRadiusChange = (field, value) => {
    setRadiusSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateTotalPopulation = () => {
    if (targetingMode === 'radius') {
      // Estimate population based on radius
      const basePopulation = 100000; // per km²
      const area = Math.PI * Math.pow(radiusSettings?.radius, 2);
      return Math.round(area * basePopulation * 0.3); // 30% coastal density factor
    }
    
    if (targetingMode === 'predefined') {
      return selectedAreas?.reduce((total, areaId) => {
        const area = predefinedAreas?.find(a => a?.id === areaId);
        return total + (area?.population || 0);
      }, 0);
    }
    
    if (targetingMode === 'vulnerability') {
      return selectedAreas?.reduce((total, zoneId) => {
        const zone = vulnerabilityZones?.find(z => z?.id === zoneId);
        return total + (zone?.population || 0);
      }, 0);
    }
    
    return 0;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-success bg-success/10',
      medium: 'text-warning bg-warning/10',
      high: 'text-accent bg-accent/10',
      critical: 'text-error bg-error/10'
    };
    return colors?.[priority] || colors?.medium;
  };

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="MapPin" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Geographic Targeting</h2>
              <p className="text-sm text-muted-foreground">
                Define alert coverage areas and population targeting
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Estimated Reach</p>
            <p className="text-lg font-bold text-primary">
              {calculateTotalPopulation()?.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-6">
          <Select
            label="Targeting Mode"
            options={targetingModes}
            value={targetingMode}
            onChange={setTargetingMode}
          />
        </div>

        {/* Radius-based Targeting */}
        {targetingMode === 'radius' && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-3">Radius Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  label="Center Location"
                  value={radiusSettings?.center?.name}
                  placeholder="Search location..."
                  readOnly
                />
                <Input
                  label="Radius (km)"
                  type="number"
                  value={radiusSettings?.radius}
                  onChange={(e) => handleRadiusChange('radius', parseInt(e?.target?.value) || 1)}
                  min="1"
                  max="100"
                />
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  iconName="MapPin"
                  iconPosition="left"
                >
                  Use Current Location
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  iconName="Map"
                  iconPosition="left"
                >
                  Select on Map
                </Button>
              </div>
            </div>

            {/* Map Preview */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <iframe
                  width="100%"
                  height="100%"
                  loading="lazy"
                  title="Target Area Map"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${radiusSettings?.center?.lat},${radiusSettings?.center?.lng}&z=10&output=embed`}
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Predefined Areas */}
        {targetingMode === 'predefined' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Select Predefined Areas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predefinedAreas?.map((area) => (
                <div key={area?.id} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedAreas?.includes(area?.id)}
                      onChange={() => handleAreaToggle(area?.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-foreground">{area?.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          area?.type === 'state' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                        }`}>
                          {area?.type}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        Population: {area?.population?.toLocaleString()}
                      </p>
                      
                      <div className="flex flex-wrap gap-1">
                        {area?.districts?.slice(0, 3)?.map((district) => (
                          <span key={district} className="text-xs bg-muted px-2 py-1 rounded">
                            {district}
                          </span>
                        ))}
                        {area?.districts?.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{area?.districts?.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vulnerability Zones */}
        {targetingMode === 'vulnerability' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Select Vulnerability Zones</h3>
            
            <div className="space-y-3">
              {vulnerabilityZones?.map((zone) => (
                <div key={zone?.id} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedAreas?.includes(zone?.id)}
                      onChange={() => handleAreaToggle(zone?.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground">{zone?.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(zone?.priority)}`}>
                          {zone?.priority} priority
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {zone?.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Icon name="Users" size={14} className="text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {zone?.population?.toLocaleString()} people
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Polygon */}
        {targetingMode === 'custom' && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <Icon name="Polygon" size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Custom Area Selection</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Draw custom polygons on the map to define precise target areas
              </p>
              <Button
                variant="outline"
                iconName="Map"
                iconPosition="left"
              >
                Open Map Editor
              </Button>
            </div>
          </div>
        )}

        {/* Summary */}
        {(selectedAreas?.length > 0 || targetingMode === 'radius') && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="bg-primary/5 rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-3">Targeting Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Target Mode</p>
                  <p className="font-semibold text-foreground capitalize">
                    {targetingModes?.find(m => m?.value === targetingMode)?.label}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Selected Areas</p>
                  <p className="font-semibold text-foreground">
                    {targetingMode === 'radius' ? '1 radius area' : `${selectedAreas?.length} areas`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimated Population</p>
                  <p className="font-semibold text-primary">
                    {calculateTotalPopulation()?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeographicTargeting;