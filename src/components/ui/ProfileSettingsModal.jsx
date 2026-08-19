import React, { useState } from 'react';
import Icon from '../Appicon';
import Button from './Button';
import { useTranslation } from '../../context/LanguageContext';

const ProfileSettingsModal = ({ 
  isOpen = false, 
  onClose = () => {}, 
  user = null, 
  onLogout = () => {},
  isLoggingOut = false 
}) => {
  const { language, changeLanguage, t, availableLanguages } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [geotagEnabled, setGeotagEnabled] = useState(true);
  const [offlineSyncEnabled, setOfflineSyncEnabled] = useState(true);

  if (!isOpen) return null;

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  const roleText = user?.role === 'official' ? t('governmentOfficial', 'Government Official') : t('registeredCitizen', 'Registered Citizen');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden z-10 my-auto text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="User" size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {t('profileAndSettings', 'Profile & Settings')}
              </h2>
              <p className="text-xs text-slate-600">
                {t('accountDetails', 'Manage account details and disaster alerts')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
            aria-label="Close profile modal"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* User Card */}
          <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-extrabold shadow-sm flex-shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900 truncate leading-tight">
                  {user?.name || 'Rajesh Kumar'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    user?.role === 'official' 
                      ? 'bg-blue-100 text-blue-900 border border-blue-300' 
                      : 'bg-green-100 text-green-900 border border-green-300'
                  }`}>
                    <Icon name={user?.role === 'official' ? 'Shield' : 'User'} size={12} />
                    {roleText}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    {t('portalName', 'INCOIS Coastal Portal')}
                  </span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2 text-slate-700">
                <Icon name="Mail" size={14} className="text-slate-500" />
                <span className="truncate font-semibold">{user?.email || 'citizen@oceansaksham.gov.in'}</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-700">
                <Icon name="Phone" size={14} className="text-slate-500" />
                <span className="font-semibold">{user?.phone || '9876543210'}</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-700 sm:col-span-2">
                <Icon name="MapPin" size={14} className="text-green-600" />
                <span className="text-green-800 font-semibold">
                  {t('locationAccessActive', 'Location Access: Active (High Accuracy GPS)')}
                </span>
              </div>
            </div>
          </div>

          {/* Identity & Aadhaar e-KYC Verification Status */}
          <div className="p-4 bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Icon name="ShieldCheck" size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-emerald-950">Aadhaar e-KYC Verified</h4>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold">UIDAI Validated</span>
                  </div>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    Aadhaar ID: •••• •••• 4829 (Demo Sandbox)
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-emerald-200/80 text-[11px] text-emerald-900 leading-relaxed font-medium">
              💡 <strong>Future Scope:</strong> Aadhaar e-KYC directly integrates with DigiLocker and National Disaster Management Authority (NDMA) to eliminate false hazard reports and streamline government emergency relief dispatch.
            </div>
          </div>

          {/* Preferences Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              {t('systemPreferences', 'System & Alert Preferences')}
            </h4>
            <div className="space-y-3">
              {/* Emergency Alert Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-start space-x-3 pr-2">
                  <Icon name="Bell" size={18} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {t('criticalAlerts', 'Critical Coastal Alerts')}
                    </p>
                    <p className="text-xs text-slate-600 font-medium">
                      {t('criticalAlertsDesc', 'Receive real-time alerts for Tsunami & Storm Surges')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors flex-shrink-0 ${
                    notificationsEnabled ? 'bg-primary justify-end' : 'bg-slate-300 justify-start'
                  }`}
                  aria-label="Toggle emergency alerts"
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Auto Geotag Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-start space-x-3 pr-2">
                  <Icon name="Camera" size={18} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {t('cameraWatermark', 'Camera GPS Watermarking')}
                    </p>
                    <p className="text-xs text-slate-600 font-medium">
                      {t('cameraWatermarkDesc', 'Embed live coordinates on report photos automatically')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGeotagEnabled(!geotagEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors flex-shrink-0 ${
                    geotagEnabled ? 'bg-primary justify-end' : 'bg-slate-300 justify-start'
                  }`}
                  aria-label="Toggle geotagging"
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Offline Storage */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-start space-x-3 pr-2">
                  <Icon name="Database" size={18} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {t('offlineSync', 'Offline Incident Sync')}
                    </p>
                    <p className="text-xs text-slate-600 font-medium">
                      {t('offlineSyncDesc', 'Save reports locally if cellular signal drops during a storm')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOfflineSyncEnabled(!offlineSyncEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors flex-shrink-0 ${
                    offlineSyncEnabled ? 'bg-primary justify-end' : 'bg-slate-300 justify-start'
                  }`}
                  aria-label="Toggle offline sync"
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Language Selector */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center space-x-3">
                  <Icon name="Globe" size={18} className="text-primary" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {t('appLanguage', 'App Language')}
                    </p>
                    <p className="text-xs text-slate-600 font-medium">
                      {t('selectLanguageDesc', 'Select preferred regional coastal language')}
                    </p>
                  </div>
                </div>
                <select
                  value={language}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="rounded-lg border-2 border-primary/50 bg-blue-50/50 px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-primary focus:outline-none cursor-pointer"
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-2 justify-between items-center">
          <Button
            variant="default"
            size="default"
            iconName="ArrowLeft"
            iconPosition="left"
            onClick={onClose}
            className="w-full sm:w-auto font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs"
          >
            {t('backToMain', 'Back to Main Screen')}
          </Button>

          <Button
            variant="outline"
            size="default"
            iconName="LogOut"
            iconPosition="left"
            onClick={onLogout}
            loading={isLoggingOut}
            disabled={isLoggingOut}
            className="w-full sm:w-auto font-bold rounded-xl border-red-300 text-red-700 hover:text-red-800 hover:bg-red-50 hover:border-red-500 transition-colors"
          >
            {isLoggingOut ? t('submitting', 'Signing Out...') : t('logoutAccount', 'Log Out Account')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsModal;
