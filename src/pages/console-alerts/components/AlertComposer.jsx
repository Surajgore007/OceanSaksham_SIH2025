import React, { useState } from 'react';
import Icon from '../../../components/Appicon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const AlertComposer = ({ onSendAlert, className = '' }) => {
  const [alertData, setAlertData] = useState({
    hazardType: '',
    severity: '',
    title: '',
    message: '',
    language: 'english',
    channels: {
      sms: true,
      push: true,
      email: false
    },
    targetArea: {
      type: 'radius',
      center: { lat: 11.0168, lng: 76.9558 },
      radius: 5
    },
    schedule: 'immediate'
  });

  const [isLoading, setIsLoading] = useState(false);

  const hazardTypes = [
    { value: 'tsunami', label: 'Tsunami Warning' },
    { value: 'cyclone', label: 'Cyclone Alert' },
    { value: 'storm_surge', label: 'Storm Surge' },
    { value: 'high_waves', label: 'High Waves' },
    { value: 'coastal_flooding', label: 'Coastal Flooding' },
    { value: 'erosion', label: 'Coastal Erosion' }
  ];

  const severityLevels = [
    { value: 'low', label: 'Low Risk' },
    { value: 'medium', label: 'Medium Risk' },
    { value: 'high', label: 'High Risk' },
    { value: 'critical', label: 'Critical Emergency' }
  ];

  const languageOptions = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'हिंदी (Hindi)' },
    { value: 'tamil', label: 'தமிழ் (Tamil)' },
    { value: 'malayalam', label: 'മലയാളം (Malayalam)' }
  ];

  const messageTemplates = {
    tsunami: {
      english: "TSUNAMI WARNING: Immediate evacuation required for coastal areas. Move to higher ground immediately. Follow official evacuation routes.",
      hindi: "सुनामी चेतावनी: तटीय क्षेत्रों के लिए तत्काल निकासी आवश्यक। तुरंत ऊंचे स्थान पर जाएं।",
      tamil: "சுனாமி எச்சரிக்கை: கடலோர பகுதிகளுக்கு உடனடி வெளியேற்றம் தேவை। உடனடியாக உயரமான இடத்திற்கு செல்லுங்கள்।",
      malayalam: "സുനാമി മുന്നറിയിപ്പ്: തീരദേശ പ്രദേശങ്ങളിൽ നിന്ന് ഉടനടി ഒഴിപ്പിക്കൽ ആവശ്യം। ഉടനടി ഉയർന്ന സ്ഥലത്തേക്ക് പോകുക."
    },
    cyclone: {
      english: "CYCLONE ALERT: Severe weather approaching. Secure property, stock emergency supplies. Stay indoors and monitor updates.",
      hindi: "चक्रवात अलर्ट: गंभीर मौसम आ रहा है। संपत्ति सुरक्षित करें, आपातकालीन आपूर्ति स्टॉक करें।",
      tamil: "புயல் எச்சரிக்கை: கடுமையான வானிலை நெருங்குகிறது. சொத்துக்களை பாதுகாக்கவும், அவசர பொருட்களை சேமிக்கவும்।",
      malayalam: "ചുഴലിക്കാറ്റ് മുന്നറിയിപ്പ്: കഠിനമായ കാലാവസ്ഥ അടുക്കുന്നു. സ്വത്ത് സുരക്ഷിതമാക്കുക, അടിയന്തര സാധനങ്ങൾ സംഭരിക്കുക."
    }
  };

  const handleInputChange = (field, value) => {
    setAlertData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleChannelChange = (channel, checked) => {
    setAlertData(prev => ({
      ...prev,
      channels: {
        ...prev?.channels,
        [channel]: checked
      }
    }));
  };

  const loadTemplate = () => {
    if (alertData?.hazardType && messageTemplates?.[alertData?.hazardType]) {
      const template = messageTemplates?.[alertData?.hazardType]?.[alertData?.language];
      setAlertData(prev => ({
        ...prev,
        message: template,
        title: `${hazardTypes?.find(h => h?.value === alertData?.hazardType)?.label} - ${severityLevels?.find(s => s?.value === alertData?.severity)?.label}`
      }));
    }
  };

  const handleSendAlert = async () => {
    setIsLoading(true);
    try {
      await onSendAlert(alertData);
      // Reset form after successful send
      setAlertData({
        hazardType: '',
        severity: '',
        title: '',
        message: '',
        language: 'english',
        channels: { sms: true, push: true, email: false },
        targetArea: { type: 'radius', center: { lat: 11.0168, lng: 76.9558 }, radius: 5 },
        schedule: 'immediate'
      });
    } catch (error) {
      console.error('Failed to send alert:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'text-success bg-success/10',
      medium: 'text-warning bg-warning/10',
      high: 'text-accent bg-accent/10',
      critical: 'text-error bg-error/10'
    };
    return colors?.[severity] || 'text-muted-foreground bg-muted/10';
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <Icon name="Megaphone" size={20} className="text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Create Alert</h2>
            <p className="text-sm text-muted-foreground">Compose and send emergency notifications</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            iconName="FileText"
            iconPosition="left"
            onClick={loadTemplate}
            disabled={!alertData?.hazardType || !alertData?.severity}
          >
            Load Template
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Alert Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Hazard Type"
              placeholder="Select hazard type"
              options={hazardTypes}
              value={alertData?.hazardType}
              onChange={(value) => handleInputChange('hazardType', value)}
              required
            />
            
            <Select
              label="Severity Level"
              placeholder="Select severity"
              options={severityLevels}
              value={alertData?.severity}
              onChange={(value) => handleInputChange('severity', value)}
              required
            />
          </div>

          {alertData?.severity && (
            <div className={`px-3 py-2 rounded-lg ${getSeverityColor(alertData?.severity)}`}>
              <div className="flex items-center space-x-2">
                <Icon name="AlertTriangle" size={16} />
                <span className="text-sm font-medium">
                  {severityLevels?.find(s => s?.value === alertData?.severity)?.label}
                </span>
              </div>
            </div>
          )}

          <Input
            label="Alert Title"
            placeholder="Enter alert title"
            value={alertData?.title}
            onChange={(e) => handleInputChange('title', e?.target?.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Alert Message *
            </label>
            <textarea
              className="w-full h-32 px-3 py-2 border border-border rounded-lg bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Enter detailed alert message..."
              value={alertData?.message}
              onChange={(e) => handleInputChange('message', e?.target?.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {alertData?.message?.length}/500 characters
            </p>
          </div>

          <Select
            label="Language"
            options={languageOptions}
            value={alertData?.language}
            onChange={(value) => handleInputChange('language', value)}
          />
        </div>

        {/* Right Column - Delivery Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Delivery Channels
            </label>
            <div className="space-y-3">
              <Checkbox
                label="SMS Notifications"
                description="Send via SMS gateway"
                checked={alertData?.channels?.sms}
                onChange={(e) => handleChannelChange('sms', e?.target?.checked)}
              />
              <Checkbox
                label="Push Notifications"
                description="Send to mobile app users"
                checked={alertData?.channels?.push}
                onChange={(e) => handleChannelChange('push', e?.target?.checked)}
              />
              <Checkbox
                label="Email Notifications"
                description="Send to registered email addresses"
                checked={alertData?.channels?.email}
                onChange={(e) => handleChannelChange('email', e?.target?.checked)}
              />
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Icon name="MapPin" size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">Target Area</span>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Radius (km)"
                  type="number"
                  value={alertData?.targetArea?.radius}
                  onChange={(e) => handleInputChange('targetArea', {
                    ...alertData?.targetArea,
                    radius: parseInt(e?.target?.value) || 5
                  })}
                  min="1"
                  max="100"
                />
                <div className="flex flex-col justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="Map"
                    iconPosition="left"
                    className="h-10"
                  >
                    Select Area
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Current center: Kochi, Kerala ({alertData?.targetArea?.radius}km radius)
              </p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Icon name="Clock" size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">Estimated Reach</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">SMS Recipients</p>
                <p className="font-semibold text-foreground">~2,450</p>
              </div>
              <div>
                <p className="text-muted-foreground">App Users</p>
                <p className="font-semibold text-foreground">~1,890</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Shield" size={16} />
          <span>Alert will be logged and tracked</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            iconName="Save"
            iconPosition="left"
          >
            Save Draft
          </Button>
          <Button
            variant="default"
            iconName="Send"
            iconPosition="left"
            onClick={handleSendAlert}
            loading={isLoading}
            disabled={!alertData?.hazardType || !alertData?.severity || !alertData?.message?.trim()}
          >
            Send Alert
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AlertComposer;