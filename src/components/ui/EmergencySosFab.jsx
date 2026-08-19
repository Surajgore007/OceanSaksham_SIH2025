import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from '../Appicon';
import Button from './Button';
import sosService from '../../utils/sosService';
import authService from '../../utils/authService';
import { useTranslation } from '../../context/LanguageContext';

const EmergencySosFab = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sosResult, setSosResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // Do not render on public auth pages
  const isAuthPage = ['/', '/login', '/register', '/forgot-password'].includes(location.pathname);
  if (!currentUser || isAuthPage) {
    return null;
  }

  const handleBroadcastSos = async () => {
    setIsSending(true);
    setErrorMessage('');
    setSosResult(null);

    try {
      const alert = await sosService.createSosAlert();
      setSosResult(alert);
    } catch (err) {
      console.error('SOS Error:', err);
      setErrorMessage(err?.message || 'Unable to access GPS or broadcast SOS. Please call Coast Guard 1078 directly.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseModal = () => {
    if (isSending) return;
    setIsModalOpen(false);
    setSosResult(null);
    setErrorMessage('');
  };

  return (
    <>
      {/* Floating Handy SOS Button */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-40 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={() => {
            setSosResult(null);
            setErrorMessage('');
            setIsModalOpen(true);
          }}
          className="group flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-full shadow-2xl transition-all duration-200 hover:scale-105 border-2 border-white ring-2 ring-red-600/30 cursor-pointer select-none"
          title="Emergency Coastal SOS"
          aria-label="Emergency Coastal SOS"
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-xs group-hover:animate-pulse">
            !
          </div>
          <span className="tracking-wide uppercase font-extrabold">{t('emergencySos', 'SOS')}</span>
        </button>
      </div>

      {/* SOS Safety Confirmation & Status Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
            onClick={handleCloseModal}
          />
          
          <div 
            className="relative z-10 bg-white border-2 border-slate-200 rounded-3xl shadow-2xl w-full max-w-md p-6 text-slate-900 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
                  <Icon name="AlertTriangle" size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    {t('emergencySos', 'Emergency SOS Broadcast')}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    INCOIS & Coast Guard Distress Channel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSending}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* Success State */}
            {sosResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-950 text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <Icon name="CheckCircle" size={28} />
                  </div>
                  <h4 className="font-bold text-base text-emerald-900">Distress Signal Dispatched!</h4>
                  <p className="text-xs text-emerald-800 font-medium">
                    {t('sosSentSuccess', 'SOS alert sent to officials!')}
                  </p>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200 text-xs font-mono font-bold text-emerald-900">
                    Ref ID: {sosResult.sosId || 'SOS-ACTIVE'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-slate-900">📍 Broadcasted Coordinates:</p>
                  <p className="font-mono">{sosResult.latitude?.toFixed(5)}°, {sosResult.longitude?.toFixed(5)}° (±{Math.round(sosResult.accuracy || 10)}m)</p>
                  <p className="text-[11px] text-slate-500 mt-1">Official rescue stations have been alerted. Keep your phone accessible.</p>
                </div>

                <Button
                  variant="default"
                  size="default"
                  onClick={handleCloseModal}
                  className="w-full font-bold bg-slate-900 text-white rounded-xl py-3"
                >
                  Close & Stay Safe
                </Button>
              </div>
            ) : (
              /* Confirmation State */
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed font-medium">
                  ⚠️ <strong>Important Safety Advisory:</strong> Triggering an SOS dispatches emergency rescue telemetry with your live GPS location to National Ocean Information Services (INCOIS) & Coast Guard.
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                    {errorMessage}
                  </div>
                )}

                {/* Emergency Helplines */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Direct Helplines:</span>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-800">Coast Guard Distress:</span>
                    <a href="tel:1078" className="text-red-700 hover:underline">📞 1078 (Toll Free)</a>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-800">National Emergency:</span>
                    <a href="tel:108" className="text-primary hover:underline">📞 108</a>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleCloseModal}
                    disabled={isSending}
                    className="flex-1 font-bold border-slate-300 text-slate-800 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="default"
                    iconName="AlertTriangle"
                    onClick={handleBroadcastSos}
                    loading={isSending}
                    disabled={isSending}
                    className="flex-1 font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg"
                  >
                    {isSending ? t('sosSending', 'Broadcasting...') : 'Broadcast SOS'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencySosFab;
