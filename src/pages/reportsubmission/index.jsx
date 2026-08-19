import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Header from '../../components/ui/Header';
import BottomTabNavigation from '../../components/ui/BottomTabNavigation';
import AuthenticationGuard from '../../components/ui/AuthenticationGuard';
import Icon from '../../components/Appicon';
import Button from '../../components/ui/Button';
import localDb from '../../utils/localDb';
import realTimeService from '../../utils/realTimeService';
import authService from '../../utils/authService';

// Import all components
import HazardTypeSelector from './components/HazardTypeSelector';
import LocationPicker from './components/LocationPicker';
import MediaUpload from './components/MediaUpload';
import ProgressIndicator from './components/ProgressIndicator';

/**
 * Returns the home dashboard path for a given role.
 * IDENTITY (who is logged in) and ROUTE (what page) are independent.
 * Submitting a report must NEVER change the user's role.
 */
const getDashboardForRole = (role) => {
  const dashboards = {
    citizen: '/main-dashboard',
    official: '/official-console',
  };
  return dashboards[role?.toLowerCase()] || '/main-dashboard';
};

const ReportSubmission = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isQuickReport, setIsQuickReport] = useState(false);
  const [sourceHazardInfo, setSourceHazardInfo] = useState(null);

  // Real authenticated user — NEVER a mock
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  // Form data state
  const [formData, setFormData] = useState({
    hazardType: '',
    location: null,
    description: '',
    severity: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    mediaFiles: [],
    relatedToHazard: null,
    isQuickReport: false
  });

  const totalSteps = 3;

  const steps = [
    { id: 1, name: 'Hazard', icon: 'AlertTriangle' },
    { id: 2, name: 'Location + Details', icon: 'MapPin' },
    { id: 3, name: 'Evidence + Submit', icon: 'Camera' }
  ];

  // Keep currentUser in sync with auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((updatedUser) => {
      setCurrentUser(updatedUser);
    });
    return unsubscribe;
  }, []);

  // Check for quick report mode and load pre-filled data
  useEffect(() => {
    const quickMode = searchParams.get('quick') === 'true';
    setIsQuickReport(quickMode);
    
    if (quickMode) {
      const quickReportData = localStorage.getItem('quickReportData');
      if (quickReportData) {
        try {
          const preFilledData = JSON.parse(quickReportData);
          setFormData(prev => ({
            ...prev,
            ...preFilledData
          }));
          setSourceHazardInfo({
            type: preFilledData.hazardType,
            location: preFilledData.location?.address || preFilledData.location?.name,
            severity: preFilledData.severity
          });
          // Clear the stored data
          localStorage.removeItem('quickReportData');
        } catch (error) {
          console.error('Error loading quick report data:', error);
        }
      }
    } else {
      // Load regular draft data
      const savedData = localStorage.getItem('reportSubmission_draft');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setFormData(parsed);
        } catch (error) {
          console.error('Error loading saved draft:', error);
        }
      }
    }
  }, [searchParams]);

  // Auto-save to localStorage (but not for quick reports)
  useEffect(() => {
    if (!isQuickReport) {
      localStorage.setItem('reportSubmission_draft', JSON.stringify(formData));
    }
  }, [formData, isQuickReport]);

  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 1:
        if (!formData?.hazardType) {
          errors.hazardType = 'Please select a hazard type';
        }
        break;
      case 2:
        if (!formData?.location) {
          errors.location = 'Please select a location';
        }
        break;
      case 3:
        break;
    }

    setFormErrors(errors);
    return Object.keys(errors)?.length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleStepEdit = (step) => {
    setCurrentStep(step);
  };

  const handleFormDataChange = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear related errors
    const newErrors = { ...formErrors };
    Object.keys(updates)?.forEach(key => {
      delete newErrors?.[key];
    });
    setFormErrors(newErrors);
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep(2)) {
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API submission
      await new Promise(resolve => setTimeout(resolve, 3000));

      const submitterRole = currentUser?.role || 'citizen';
      const submitterName = currentUser?.name || (submitterRole.charAt(0).toUpperCase() + submitterRole.slice(1));
      const submitterId = currentUser?.id || `user_${submitterRole}_${Date.now()}`;
      const nowIso = new Date().toISOString();

      const normalizedLocation = {
        name: formData.location?.name || formData.location?.address?.name || formData.location?.address || 'Reported Location',
        address: formData.location?.address?.address || formData.location?.address || formData.location?.name || 'Reported Location',
        coordinates: {
          latitude: formData.location?.coordinates?.latitude ?? formData.location?.coordinates?.lat ?? formData.location?.lat,
          longitude: formData.location?.coordinates?.longitude ?? formData.location?.coordinates?.lng ?? formData.location?.lng,
          lat: formData.location?.coordinates?.latitude ?? formData.location?.coordinates?.lat ?? formData.location?.lat,
          lng: formData.location?.coordinates?.longitude ?? formData.location?.coordinates?.lng ?? formData.location?.lng,
        },
        lat: formData.location?.coordinates?.latitude ?? formData.location?.coordinates?.lat ?? formData.location?.lat,
        lng: formData.location?.coordinates?.longitude ?? formData.location?.coordinates?.lng ?? formData.location?.lng,
      };

      // Create canonical report object with complete required fields
      const reportData = {
        id: `report_${Date.now()}`,
        hazardType: formData.hazardType,
        type: formData.hazardType,
        severity: formData.severity || 'medium',
        description: formData.description || '',
        location: normalizedLocation,
        lat: normalizedLocation.lat,
        lng: normalizedLocation.lng,
        media: formData.mediaFiles || [],
        mediaFiles: formData.mediaFiles || [],
        status: 'pending_verification',
        verificationStatus: 'pending',
        priority: formData.severity === 'critical' ? 'high' : 'normal',
        timestamp: nowIso,
        submittedAt: nowIso,
        reportedBy: submitterName,
        reportedByRole: submitterRole,
        submittedBy: submitterId,
        reporterName: submitterName,
        reporterRole: submitterRole,
        source: submitterRole,
        reporter: {
          name: submitterName,
          role: submitterRole,
          phone: formData.contactPhone || currentUser?.phone || 'Not provided',
          email: formData.contactEmail || currentUser?.email || 'Not provided',
        },
        contactInfo: {
          name: formData.contactName || submitterName,
          phone: formData.contactPhone || currentUser?.phone || 'Not provided',
          email: formData.contactEmail || currentUser?.email || 'Not provided',
        },
        contactName: formData.contactName || submitterName,
        contactPhone: formData.contactPhone || currentUser?.phone || '',
        contactEmail: formData.contactEmail || currentUser?.email || '',
        officialNotes: null,
        verifiedAt: null,
        verifiedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        relatedToHazard: formData.relatedToHazard || null,
        isQuickReport: !!formData.isQuickReport
      };

      // Store in canonical shared collection
      localDb.insert('userReports', reportData);
      localDb.insert('pendingVerification', reportData);
      localDb.insert('pendingReports', reportData);

      // Notify real-time listeners across all channels
      realTimeService.notifyListeners('userReports', localDb.getCollection('userReports'));
      realTimeService.notifyListeners('reports', localDb.getCollection('userReports'));
      realTimeService.notifyListeners('pendingVerification', localDb.getCollection('pendingVerification'));
      realTimeService.notifyListeners('pendingReports', localDb.getCollection('pendingReports'));
      realTimeService.notifyListeners('hazards', localDb.getCollection('hazardReports'));

      // Clear draft only if not quick report
      if (!isQuickReport) {
        localStorage.removeItem('reportSubmission_draft');
      }

      setShowSuccessModal(true);
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    // Reset form
    setFormData({
      hazardType: '',
      location: null,
      description: '',
      severity: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      mediaFiles: [],
      relatedToHazard: null,
      isQuickReport: false
    });
    setCurrentStep(1);
    setIsQuickReport(false);
    setSourceHazardInfo(null);
    // Return to the dashboard that matches the CURRENT user's role —
    // never silently convert the user to a citizen.
    navigate(getDashboardForRole(currentUser?.role));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <HazardTypeSelector
            selectedType={formData?.hazardType}
            onTypeSelect={(type) => handleFormDataChange({ hazardType: type })}
            isPreFilled={isQuickReport && formData?.hazardType}
            sourceInfo={sourceHazardInfo}
          />
        );
      case 2:
        return (
          <div className="space-y-6">
            <LocationPicker
              selectedLocation={formData?.location}
              onLocationSelect={(location) => handleFormDataChange({ location })}
              isPreFilled={isQuickReport && formData?.location}
              sourceInfo={sourceHazardInfo}
            />

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">Short Description</h3>
                <Icon name="FileText" size={20} className="text-primary" />
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => handleFormDataChange({ description: e.target.value })}
                placeholder="Briefly describe what you see..."
                rows={4}
                maxLength={400}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Optional, but helpful for officials. Keep it short.
              </p>
            </div>
          </div>
        );
      case 3:
        return (
          <MediaUpload
            uploadedFiles={formData?.mediaFiles}
            onFilesChange={(files) => handleFormDataChange({ mediaFiles: files })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AuthenticationGuard user={currentUser} requiredRoles={['citizen', 'official']}>
      <div className="min-h-screen bg-background">
        <Header user={currentUser} />
        
        <main className="pt-16 pb-20 lg:pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Quick Report Banner */}
            {isQuickReport && sourceHazardInfo && (
              <div className="mb-6 p-4 bg-blue/10 border border-blue/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Icon name="Zap" size={20} className="text-blue mt-1" />
                  <div>
                    <h3 className="font-semibold text-blue mb-1">Quick Report Mode</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Creating a related incident report based on existing {sourceHazardInfo.type?.replace('_', ' ')} hazard.
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Location: {sourceHazardInfo.location}</span>
                      <span>Severity: {sourceHazardInfo.severity}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Indicator */}
            <ProgressIndicator
              currentStep={currentStep}
              totalSteps={totalSteps}
              steps={steps}
              className="mb-8"
            />

            {/* Step Content */}
            <div className="glass-card rounded-xl p-6 lg:p-8 mb-8">
              {renderStepContent()}
            </div>

            {/* Navigation Controls */}
            {currentStep <= totalSteps && (
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  iconName="ArrowLeft"
                  iconPosition="left"
                  className="sm:w-auto"
                >
                  Previous
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => navigate(getDashboardForRole(currentUser?.role))}
                    iconName="X"
                    iconPosition="left"
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    onClick={currentStep === totalSteps ? handleSubmit : handleNext}
                    loading={isSubmitting}
                    iconName={currentStep === totalSteps ? 'Send' : 'ArrowRight'}
                    iconPosition="right"
                    className="flex-1 sm:flex-none sm:min-w-[120px]"
                  >
                    {currentStep === totalSteps ? 'Submit Report' : 'Next'}
                  </Button>
                </div>
              </div>
            )}

            {/* Error Summary */}
            {Object.keys(formErrors)?.length > 0 && (
              <div className="mt-6 p-4 bg-error/10 border border-error/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Icon name="AlertCircle" size={20} className="text-error mt-0.5" />
                  <div>
                    <h4 className="font-medium text-error mb-2">Please fix the following errors:</h4>
                    <ul className="text-sm text-error space-y-1">
                      {Object.values(formErrors)?.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Enhanced Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-modal">
              <div className="text-center">
                <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Clock" size={32} className="text-warning" />
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {isQuickReport ? 'Quick Report Submitted!' : 'Report Submitted Successfully!'}
                </h3>
                
                <p className="text-muted-foreground mb-4">
                  {isQuickReport 
                    ? 'Your related incident report has been submitted and is pending verification.'
                    : 'Your hazard report has been submitted and is pending verification by coastal authorities.'
                  }
                </p>
                
                {isQuickReport && sourceHazardInfo && (
                  <div className="bg-blue/10 border border-blue/20 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2 text-blue mb-2">
                      <Icon name="Link" size={16} />
                      <span className="text-sm font-medium">Related to Existing Hazard</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This report has been linked to the {sourceHazardInfo.type?.replace('_', ' ')} hazard for pattern analysis.
                    </p>
                  </div>
                )}
                
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-6">
                  <div className="flex items-center space-x-2 text-warning mb-2">
                    <Icon name="AlertCircle" size={16} />
                    <span className="text-sm font-medium">Status: Pending Verification</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You'll receive updates once an official reviews and verifies your report. 
                    Verified reports will appear on the public hazard map.
                  </p>
                </div>

                {/* Report Reference */}
                <div className="bg-muted/20 rounded-lg p-3 mb-6">
                  <p className="text-xs text-muted-foreground mb-1">Report Reference:</p>
                  <p className="font-mono text-sm text-foreground">
                    #{formData.hazardType?.toUpperCase()}-{Date.now().toString().slice(-6)}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleSuccessClose}
                    className="w-full"
                  >
                    Return to Dashboard
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSuccessModal(false);
                      setFormData({
                        hazardType: '',
                        location: null,
                        description: '',
                        severity: '',
                        contactName: '',
                        contactPhone: '',
                        contactEmail: '',
                        mediaFiles: [],
                        relatedToHazard: null,
                        isQuickReport: false
                      });
                      setCurrentStep(1);
                      setIsQuickReport(false);
                      setSourceHazardInfo(null);
                    }}
                    className="w-full"
                  >
                    Submit Another Report
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => navigate('/my-reports')}
                    className="w-full text-xs"
                  >
                    View My Report Status
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <BottomTabNavigation user={currentUser} />
      </div>
    </AuthenticationGuard>
  );
};

export default ReportSubmission;
