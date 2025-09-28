import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import BottomTabNavigation from '../../components/ui/BottomTabNavigation';
import AuthenticationGuard from '../../components/ui/AuthenticationGuard';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import localDb from '../../utils/localDb';
import realTimeService from '../../utils/realTimeService';

// Import all components
import HazardTypeSelector from './components/HazardTypeSelector';
import LocationPicker from './components/LocationPicker';
import HazardDetailsForm from './components/HazardDetailsForm';
import MediaUpload from './components/MediaUpload';
import ProgressIndicator from './components/ProgressIndicator';
import SubmissionSummary from './components/SubmissionSummary';

const ReportSubmission = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isQuickReport, setIsQuickReport] = useState(false);
  const [sourceHazardInfo, setSourceHazardInfo] = useState(null);

  // Mock user data
  const mockUser = {
    id: 'user_001',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@email.com',
    role: 'citizen',
    phone: '+91 98765 43210'
  };

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

  const totalSteps = 5; // Including summary step

  const steps = [
    { id: 1, name: 'Hazard Type', icon: 'AlertTriangle' },
    { id: 2, name: 'Location', icon: 'MapPin' },
    { id: 3, name: 'Details', icon: 'FileText' },
    { id: 4, name: 'Media', icon: 'Camera' },
    { id: 5, name: 'Review', icon: 'CheckCircle' }
  ];

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
        if (!formData?.description || formData?.description?.trim()?.length < 10) {
          errors.description = 'Please provide a description (minimum 10 characters)';
        }
        if (!formData?.severity) {
          errors.severity = 'Please select a severity level';
        }
        break;
      case 4:
        // Media is optional, no validation needed
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
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API submission
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Create report object with PENDING_VERIFICATION status
      const reportData = {
        id: `report_${Date.now()}`,
        ...formData,
        submittedAt: new Date().toISOString(),
        submittedBy: mockUser.id,
        status: 'pending_verification',
        verificationStatus: 'pending',
        priority: formData.severity === 'critical' ? 'high' : 'normal',
        officialNotes: null,
        verifiedAt: null,
        verifiedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        // Include related hazard info for tracking
        relatedToHazard: formData.relatedToHazard,
        isQuickReport: formData.isQuickReport
      };

      // Store in pending verification queue
      localDb.insert('pendingReports', reportData);
      localDb.insert('userReports', reportData);

      // Legacy storage for compatibility
      try {
        const legacyUserReports = JSON.parse(localStorage.getItem('userReports') || '[]');
        legacyUserReports.push(reportData);
        localStorage.setItem('userReports', JSON.stringify(legacyUserReports));
      } catch {}

      const pendingRecord = {
        id: reportData.id,
        type: reportData.hazardType,
        severity: reportData.severity,
        lat: reportData.location?.coordinates?.latitude || 
             reportData.location?.coordinates?.lat || 
             reportData.location?.lat,
        lng: reportData.location?.coordinates?.longitude || 
             reportData.location?.coordinates?.lng || 
             reportData.location?.lng,
        location: reportData.location?.name || 
                 reportData.location?.label || 
                 reportData.location?.address || 
                 'Reported Location',
        timestamp: new Date(reportData.submittedAt),
        description: reportData.description,
        source: 'citizen',
        status: 'pending_verification',
        verificationStatus: 'pending',
        priority: reportData.priority,
        reportedBy: reportData.submittedBy,
        contactInfo: {
          name: reportData.contactName,
          phone: reportData.contactPhone,
          email: reportData.contactEmail
        },
        mediaFiles: reportData.mediaFiles,
        relatedToHazard: reportData.relatedToHazard,
        isQuickReport: reportData.isQuickReport
      };

      // Store in pending verification queue for officials
      localDb.insert('pendingVerification', pendingRecord);

      // Notify real-time listeners
      realTimeService.notifyListeners('pendingReports', localDb.getCollection('pendingReports'));
      realTimeService.notifyListeners('userReports', localDb.getCollection('userReports'));
      realTimeService.notifyListeners('pendingVerification', localDb.getCollection('pendingVerification'));

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
    navigate('/main-dashboard');
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
          <LocationPicker
            selectedLocation={formData?.location}
            onLocationSelect={(location) => handleFormDataChange({ location })}
            isPreFilled={isQuickReport && formData?.location}
            sourceInfo={sourceHazardInfo}
          />
        );
      case 3:
        return (
          <HazardDetailsForm
            formData={formData}
            onFormDataChange={handleFormDataChange}
            errors={formErrors}
            isPreFilled={isQuickReport}
            sourceInfo={sourceHazardInfo}
          />
        );
      case 4:
        return (
          <MediaUpload
            uploadedFiles={formData?.mediaFiles}
            onFilesChange={(files) => handleFormDataChange({ mediaFiles: files })}
          />
        );
      case 5:
        return (
          <SubmissionSummary
            formData={formData}
            onEdit={handleStepEdit}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isQuickReport={isQuickReport}
            sourceInfo={sourceHazardInfo}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AuthenticationGuard user={mockUser}>
      <div className="min-h-screen bg-background">
        <Header user={mockUser} />
        
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
            {currentStep < 5 && (
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
                    onClick={() => navigate('/main-dashboard')}
                    iconName="X"
                    iconPosition="left"
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    onClick={handleNext}
                    iconName="ArrowRight"
                    iconPosition="right"
                    className="flex-1 sm:flex-none sm:min-w-[120px]"
                  >
                    {currentStep === 4 ? 'Review' : 'Next'}
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
          <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/50">
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

        <BottomTabNavigation user={mockUser} />
      </div>
    </AuthenticationGuard>
  );
};

export default ReportSubmission;