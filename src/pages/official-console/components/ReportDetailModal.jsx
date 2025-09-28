import React, { useState } from 'react';
import Icon from '../../../components/Appicon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Image from '../../../components/AppImage';

const ReportDetailModal = ({ 
  report = null,
  isOpen = false,
  onClose = () => {},
  onVerify = () => {},
  onReject = () => {},
  onCreateHotspot = () => {}
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !report) return null;

  const handleVerify = async () => {
    setIsProcessing(true);
    await onVerify(report?.id, adminNotes);
    setIsProcessing(false);
    setAdminNotes('');
    onClose();
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await onReject(report?.id, adminNotes);
    setIsProcessing(false);
    setAdminNotes('');
    onClose();
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'text-success bg-success/10 border-success/20',
      medium: 'text-warning bg-warning/10 border-warning/20',
      high: 'text-error bg-error/10 border-error/20',
      critical: 'text-error bg-error/20 border-error/30'
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

  const tabs = [
    { id: 'details', label: 'Report Details', icon: 'FileText' },
    { id: 'media', label: 'Media Files', icon: 'Image' },
    { id: 'location', label: 'Location', icon: 'MapPin' },
    { id: 'actions', label: 'Admin Actions', icon: 'Settings' }
  ];

  return (
    <div className="fixed inset-0 z-200 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-card rounded-lg shadow-modal border border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-secondary/10 rounded-lg">
                <Icon 
                  name={getHazardIcon(report?.hazardType)} 
                  size={20} 
                  className="text-secondary" 
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Report #{report?.id?.slice(-8)?.toUpperCase()}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {report?.hazardType?.replace('-', ' ')?.charAt(0)?.toUpperCase() + report?.hazardType?.replace('-', ' ')?.slice(1)} • {new Date(report.timestamp)?.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`
                px-3 py-1 rounded-full text-sm font-medium border
                ${getSeverityColor(report?.severity)}
              `}>
                {report?.severity?.charAt(0)?.toUpperCase() + report?.severity?.slice(1)} Risk
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconName="X"
                onClick={onClose}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border">
            <nav className="flex space-x-8 px-6">
              {tabs?.map((tab) => (
                <button
                  key={tab?.id}
                  onClick={() => setActiveTab(tab?.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-smooth
                    ${activeTab === tab?.id
                      ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  <Icon name={tab?.icon} size={16} />
                  <span>{tab?.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Report Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Hazard Type</label>
                        <p className="text-foreground capitalize">{report?.hazardType?.replace('-', ' ')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Severity Level</label>
                        <p className="text-foreground capitalize">{report?.severity}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Reported At</label>
                        <p className="text-foreground">{new Date(report.timestamp)?.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Reporter Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-foreground">{report?.reporter?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone</label>
                        <p className="text-foreground font-data">{report?.reporter?.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-foreground">{report?.reporter?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Description</h3>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-foreground whitespace-pre-wrap">{report?.description}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="space-y-4">
                {report?.media && report?.media?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {report?.media?.map((item, index) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer rounded-lg overflow-hidden border border-border"
                        onClick={() => setSelectedMedia(item)}
                      >
                        <Image
                          src={item?.url}
                          alt={`Report media ${index + 1}`}
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Icon name="Eye" size={24} color="white" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Icon name="Image" size={48} className="text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No media files attached to this report</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'location' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Address</h3>
                    <p className="text-foreground">{report?.location?.address}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Coordinates</h3>
                    <p className="text-foreground font-data">
                      {report?.location?.coordinates?.lat?.toFixed(6)}, {report?.location?.coordinates?.lng?.toFixed(6)}
                    </p>
                  </div>
                </div>
                
                <div className="h-64 bg-muted/30 rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    loading="lazy"
                    title="Report Location"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${report?.location?.coordinates?.lat},${report?.location?.coordinates?.lng}&z=15&output=embed`}
                  />
                </div>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Administrative Notes</h3>
                  <Input
                    type="textarea"
                    placeholder="Add notes for verification/rejection..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e?.target?.value)}
                    className="min-h-24"
                  />
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button
                    variant="default"
                    iconName="CheckCircle"
                    onClick={handleVerify}
                    loading={isProcessing}
                    disabled={!adminNotes?.trim()}
                  >
                    Verify Report
                  </Button>
                  <Button
                    variant="destructive"
                    iconName="XCircle"
                    onClick={handleReject}
                    loading={isProcessing}
                    disabled={!adminNotes?.trim()}
                  >
                    Reject Report
                  </Button>
                  <Button
                    variant="outline"
                    iconName="MapPin"
                    onClick={() => onCreateHotspot(report)}
                  >
                    Create Hotspot
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Media Viewer Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-300 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80"
            onClick={() => setSelectedMedia(null)}
          />
          <div className="relative max-w-4xl max-h-full">
            <Image
              src={selectedMedia?.url}
              alt="Full size media"
              className="max-w-full max-h-full object-contain"
            />
            <Button
              variant="ghost"
              size="sm"
              iconName="X"
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDetailModal;