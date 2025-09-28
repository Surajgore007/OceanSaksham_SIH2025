import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const SubmissionSummary = ({ 
  formData, 
  onEdit, 
  onSubmit, 
  isSubmitting = false,
  className = '' 
}) => {
  const hazardTypeLabels = {
    'tsunami': 'Tsunami',
    'flooding': 'Coastal Flooding',
    'high-waves': 'High Waves',
    'storm-surge': 'Storm Surge'
  };

  const severityLabels = {
    'low': { name: 'Low', color: 'text-green-600', bg: 'bg-green-100', icon: 'Info' },
    'medium': { name: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: 'AlertTriangle' },
    'high': { name: 'High', color: 'text-orange-600', bg: 'bg-orange-100', icon: 'AlertCircle' },
    'critical': { name: 'Critical', color: 'text-red-600', bg: 'bg-red-100', icon: 'AlertOctagon' }
  };

  const formatLocation = (location) => {
    if (!location) return 'Not specified';
    
    if (location?.address) {
      return location?.address;
    }
    
    return `${location?.latitude?.toFixed(4)}, ${location?.longitude?.toFixed(4)}`;
  };

  const severity = severityLabels?.[formData?.severity] || severityLabels?.low;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Review Your Report
        </h2>
        <p className="text-sm text-muted-foreground">
          Please review all information before submitting
        </p>
      </div>
      {/* Summary Cards */}
      <div className="space-y-4">
        {/* Hazard Type */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-foreground flex items-center space-x-2">
              <Icon name="AlertTriangle" size={18} className="text-primary" />
              <span>Hazard Type</span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(1)}
              iconName="Edit2"
              iconSize={14}
            >
              Edit
            </Button>
          </div>
          <p className="text-foreground font-medium">
            {hazardTypeLabels?.[formData?.hazardType] || 'Not selected'}
          </p>
        </div>

        {/* Location */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-foreground flex items-center space-x-2">
              <Icon name="MapPin" size={18} className="text-primary" />
              <span>Location</span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(2)}
              iconName="Edit2"
              iconSize={14}
            >
              Edit
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-foreground">{formatLocation(formData?.location)}</p>
            {formData?.location && (
              <div className="text-sm text-muted-foreground font-data">
                <span>Lat: {formData?.location?.latitude?.toFixed(6)}</span>
                <span className="ml-4">Lng: {formData?.location?.longitude?.toFixed(6)}</span>
                {formData?.location?.accuracy && (
                  <span className="ml-4">±{formData?.location?.accuracy}m</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-foreground flex items-center space-x-2">
              <Icon name="FileText" size={18} className="text-primary" />
              <span>Details</span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(3)}
              iconName="Edit2"
              iconSize={14}
            >
              Edit
            </Button>
          </div>
          
          <div className="space-y-3">
            {/* Severity */}
            <div>
              <span className="text-sm text-muted-foreground">Severity:</span>
              <div className="flex items-center space-x-2 mt-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${severity?.bg}`}>
                  <Icon name={severity?.icon} size={14} className={severity?.color} />
                </div>
                <span className={`font-medium ${severity?.color}`}>{severity?.name}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <span className="text-sm text-muted-foreground">Description:</span>
              <p className="text-foreground mt-1 leading-relaxed">
                {formData?.description || 'No description provided'}
              </p>
            </div>

            {/* Contact Information */}
            {(formData?.contactName || formData?.contactPhone || formData?.contactEmail) && (
              <div>
                <span className="text-sm text-muted-foreground">Contact Information:</span>
                <div className="mt-1 space-y-1 text-sm">
                  {formData?.contactName && (
                    <p className="text-foreground">Name: {formData?.contactName}</p>
                  )}
                  {formData?.contactPhone && (
                    <p className="text-foreground">Phone: {formData?.contactPhone}</p>
                  )}
                  {formData?.contactEmail && (
                    <p className="text-foreground">Email: {formData?.contactEmail}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Media */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-foreground flex items-center space-x-2">
              <Icon name="Camera" size={18} className="text-primary" />
              <span>Media Files</span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(4)}
              iconName="Edit2"
              iconSize={14}
            >
              Edit
            </Button>
          </div>
          
          {formData?.mediaFiles && formData?.mediaFiles?.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {formData?.mediaFiles?.length} file(s) attached
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {formData?.mediaFiles?.slice(0, 4)?.map((file, index) => (
                  <div key={file?.id} className="relative">
                    {file?.preview ? (
                      <img
                        src={file?.preview}
                        alt={file?.name}
                        className="w-full h-16 object-cover rounded-lg border border-border"
                      />
                    ) : (
                      <div className="w-full h-16 bg-muted rounded-lg border border-border flex items-center justify-center">
                        <Icon 
                          name={file?.type?.startsWith('video/') ? 'Video' : 'File'} 
                          size={20} 
                          className="text-muted-foreground" 
                        />
                      </div>
                    )}
                    {formData?.mediaFiles?.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          +{formData?.mediaFiles?.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No media files attached</p>
          )}
        </div>
      </div>
      {/* Submission Info */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-start space-x-3">
          <Icon name="Info" size={20} className="text-primary mt-0.5" />
          <div>
            <h4 className="font-medium text-primary mb-2">Before You Submit</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Your report will be reviewed by coastal authorities</li>
              <li>• You'll receive updates on the verification status</li>
              <li>• Emergency services will be notified for critical hazards</li>
              <li>• Report data is stored securely and used for public safety</li>
            </ul>
          </div>
        </div>
      </div>
      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => onEdit(1)}
          iconName="ArrowLeft"
          iconPosition="left"
          className="sm:w-auto"
        >
          Back to Edit
        </Button>
        
        <Button
          onClick={onSubmit}
          loading={isSubmitting}
          iconName="Send"
          iconPosition="right"
          className="flex-1 sm:flex-none sm:min-w-[200px]"
          disabled={!formData?.hazardType || !formData?.location}
        >
          {isSubmitting ? 'Submitting Report...' : 'Submit Report'}
        </Button>
      </div>
      {/* Offline Notice */}
      <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
        <div className="flex items-center space-x-2">
          <Icon name="Wifi" size={16} className="text-warning" />
          <span className="text-sm text-warning font-medium">
            Report will be saved locally and submitted when online
          </span>
        </div>
      </div>
    </div>
  );
};

export default SubmissionSummary;