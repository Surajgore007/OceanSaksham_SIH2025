import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/Appicon';
import Button from '../../../components/ui/Button';
import locationService from '../../../utils/locationService';
import { useTranslation } from '../../../context/LanguageContext';

const MediaUpload = ({ 
  uploadedFiles = [], 
  onFilesChange, 
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  isQuickReport = false,
  hazardInfo = null,
  className = '' 
}) => {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Auto-launch camera in Quick Report mode if no file is captured yet
  useEffect(() => {
    if (isQuickReport && uploadedFiles?.length === 0 && !isCapturing) {
      startCamera();
    }
  }, [isQuickReport]);

  const acceptedTypes = {
    'image/jpeg': '.jpg,.jpeg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov'
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        try { 
          cameraStream.getTracks().forEach(track => track.stop()); 
        } catch (e) {}
      }
    };
  }, [cameraStream]);

  const getCurrentLocation = async () => {
    setIsLocationLoading(true);
    try {
      const location = await locationService?.getCurrentPosition();
      setUserLocation(location);
      return location;
    } catch (error) {
      console.warn('Could not get location:', error);
      setUserLocation(null);
      return null;
    } finally {
      setIsLocationLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i))?.toFixed(2)) + ' ' + sizes?.[i];
  };

  const validateFile = (file) => {
    const errors = [];
    
    if (!Object.keys(acceptedTypes)?.includes(file?.type)) {
      errors?.push(`${file?.name}: Unsupported file type.`);
    }
    
    if (file?.size > maxFileSize) {
      errors?.push(`${file?.name}: File too large. Maximum size is ${formatFileSize(maxFileSize)}.`);
    }
    
    return errors;
  };

  const readFileAsDataUrl = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

    const compressImageFile = (file, maxWidth = 1280, maxHeight = 1280, quality = 0.75) => {
    return new Promise((resolve) => {
      if (!file?.type?.startsWith('image/')) {
        return readFileAsDataUrl(file).then(resolve);
      }
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width || 640;
          canvas.height = height || 480;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target?.result || null);
        img.src = e.target?.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const processGeotaggedFile = async (file, location = null) => {
    const currentLocation = location || await getCurrentLocation();
    
    let address = null;
    if (currentLocation) {
      try {
        address = await locationService?.reverseGeocode(
          currentLocation?.latitude,
          currentLocation?.longitude
        );
      } catch (error) {
        console.warn('Could not get address:', error);
      }
    }

    // Convert and compress image file to lightweight Data URL (< 150KB)
    let dataUrl = null;
    if (file?.type?.startsWith('image/')) {
      dataUrl = await compressImageFile(file);
    } else {
      dataUrl = await readFileAsDataUrl(file);
    }

    return {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: dataUrl ? Math.round(dataUrl.length * 0.75) : file.size,
      type: file.type?.startsWith('image/') ? 'image/jpeg' : file.type,
      url: dataUrl,
      preview: dataUrl,
      uploadedAt: new Date().toISOString(),
      geotagged: !!currentLocation,
      location: currentLocation ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        timestamp: currentLocation.timestamp,
        source: currentLocation.source || 'GPS'
      } : null,
      address
    };
  };

  const processFiles = async (files) => {
    const newErrors = [];
    const validFiles = [];

    Array.from(files).forEach((file) => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        newErrors.push(...fileErrors);
      } else if (uploadedFiles.length + validFiles.length < maxFiles) {
        validFiles.push(file);
      } else {
        newErrors.push(`${t('maxFilesAllowed', 'Maximum 5 files allowed')}`);
      }
    });

    setErrors(newErrors);

    if (validFiles.length > 0) {
      const processedFiles = await Promise.all(
        validFiles.map(file => processGeotaggedFile(file))
      );
      onFilesChange([...uploadedFiles, ...processedFiles]);
    }
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      setErrors([]);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      getCurrentLocation();
    } catch (err) {
      console.error('Camera access error:', err);
      setErrors(['Unable to access camera. Please check camera permissions.']);
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCapturing(false);
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    
    if (isCapturing) {
      stopCamera();
      setTimeout(() => {
        startCamera();
      }, 200);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !cameraStream) {
      setErrors(['Camera not ready. Please try again.']);
      return;
    }

    try {
      const captureLocation = await getCurrentLocation();
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Downscale to max 1280px for high performance & safe storage
      const maxDim = 1280;
      let targetWidth = video.videoWidth || 640;
      let targetHeight = video.videoHeight || 480;
      if (targetWidth > maxDim || targetHeight > maxDim) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
          targetWidth = maxDim;
        } else {
          targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
          targetHeight = maxDim;
        }
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      // Compress JPEG at 0.75 quality (~80-120KB)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      
      if (uploadedFiles?.length < maxFiles) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `live_camera_${timestamp}.jpg`;
        
        const geotaggedPhoto = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: fileName,
          size: Math.round(dataUrl.length * 0.75),
          type: 'image/jpeg',
          url: dataUrl,
          preview: dataUrl,
          uploadedAt: new Date().toISOString(),
          geotagged: !!captureLocation,
          location: captureLocation ? {
            latitude: captureLocation.latitude,
            longitude: captureLocation.longitude,
            accuracy: captureLocation.accuracy,
            timestamp: captureLocation.timestamp,
            source: captureLocation.source || 'GPS'
          } : null,
          address: null
        };

        onFilesChange([...uploadedFiles, geotaggedPhoto]);
        stopCamera();
      } else {
        setErrors([t('maxFilesAllowed', 'Maximum 5 files allowed')]);
      }
    } catch (error) {
      console.error('Photo capture error:', error);
      setErrors(['Failed to capture photo. Please try again.']);
    }
  };

  const handleDragOver = (e) => {
    e?.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e?.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e?.preventDefault();
    setIsDragOver(false);
    const files = e?.dataTransfer?.files;
    processFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = e?.target?.files;
    if (files?.length > 0) {
      processFiles(files);
    }
    e.target.value = '';
  };

  const removeFile = (fileId) => {
    const updatedFiles = uploadedFiles?.filter(file => file?.id !== fileId);
    onFilesChange(updatedFiles);
    
    const fileToRemove = uploadedFiles?.find(file => file?.id === fileId);
    if (fileToRemove && fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove?.preview);
    }
  };

  const openFileDialog = () => {
    fileInputRef?.current?.click();
  };

  if (isCapturing) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center mb-4">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
            {t('cameraCapture', 'Camera Capture')}
          </h2>
          <p className="text-sm font-medium text-slate-600">
            {t('takeGeotaggedPhoto', 'Take a live geotagged photo for your report')}
          </p>
        </div>
        
        {/* Camera View */}
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] max-h-[70vh] shadow-2xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Location indicator */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-full text-white text-xs font-bold shadow-md">
              <Icon name="MapPin" size={13} className="text-primary" />
              {isLocationLoading ? (
                <span>GPS...</span>
              ) : userLocation ? (
                <span>GPS: ±{userLocation?.accuracy?.toFixed(0)}m</span>
              ) : (
                <span className="text-amber-300">No GPS</span>
              )}
            </div>
            
            {/* Camera switch button */}
            <Button
              variant="ghost"
              size="sm"
              iconName="RotateCcw"
              onClick={switchCamera}
              className="bg-black/80 backdrop-blur-sm text-white border-none hover:bg-black p-2 rounded-full"
            />
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center space-x-4 px-4">
            <Button
              variant="outline"
              size="sm"
              iconName="X"
              onClick={stopCamera}
              className="bg-black/80 backdrop-blur-sm text-white border-white/40 hover:bg-black font-bold rounded-xl"
            >
              {t('cancel', 'Cancel')}
            </Button>
            
            <Button
              variant="default"
              size="lg"
              iconName="Camera"
              onClick={capturePhoto}
              className="bg-primary hover:bg-primary/90 text-white px-8 font-bold rounded-xl shadow-lg"
            >
              {t('captureBtn', 'Capture Photo')}
            </Button>
          </div>
        </div>
        
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        <div className="text-center text-xs font-semibold text-slate-500">
          {t('usingCamera', 'Location will be embedded at the moment you take the photo')}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 md:space-y-6 ${className}`}>
      {isQuickReport ? (
        /* Rapid Ground Verification Header */
        <div className="text-center mb-4 md:mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 rounded-full text-xs font-bold text-amber-900 mb-2">
            <Icon name="Zap" size={13} className="text-amber-700" />
            <span>Rapid Ground Verification Mode</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Capture Live Ground Photo
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-600 max-w-md mx-auto">
            Live camera evidence is required to confirm this active incident in real-time.
          </p>
        </div>
      ) : (
        /* Regular Report Header */
        <div className="text-center mb-4 md:mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1.5">
            {t('uploadGeotaggedMedia', 'Upload Geotagged Media')}
          </h2>
          <p className="text-sm font-medium text-slate-600">
            {t('uploadMediaDesc', 'Add photos or videos with location data to support your report')}
          </p>
        </div>
      )}

      {/* Quick Report Camera Mode VS Standard Upload Buttons */}
      {isQuickReport ? (
        <div className="space-y-3">
          {uploadedFiles?.length === 0 && (
            <button
              type="button"
              onClick={startCamera}
              className="w-full flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all text-slate-900 shadow-sm group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                <Icon name="Camera" size={32} />
              </div>
              <span className="font-extrabold text-base text-slate-900">Open Camera for Live Photo</span>
              <span className="text-xs font-bold text-primary mt-1">Automatic GPS Watermarking Active</span>
            </button>
          )}

          {/* Anti-Spoofing Policy Banner */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900 font-medium flex items-start gap-2.5">
            <Icon name="ShieldCheck" size={16} className="text-blue-700 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Ground-Truth Protection:</strong> Gallery/File uploads are disabled in Rapid Verification mode to prevent outdated or downloaded image spoofing.
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Camera and File Upload Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4 md:mb-6">
            <button
              type="button"
              onClick={startCamera}
              disabled={uploadedFiles?.length >= maxFiles}
              className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50 transition-all text-slate-900 shadow-xs group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Icon name="Camera" size={20} />
              </div>
              <span className="font-bold text-sm text-slate-900">{t('takePhoto', 'Take Photo')}</span>
              <span className="text-xs font-semibold text-primary">{t('liveGeotag', 'Live Geotag')}</span>
            </button>
            
            <button
              type="button"
              onClick={openFileDialog}
              disabled={uploadedFiles?.length >= maxFiles}
              className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50 transition-all text-slate-900 shadow-xs group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Icon name="Upload" size={20} />
              </div>
              <span className="font-bold text-sm text-slate-900">{t('uploadFiles', 'Upload Files')}</span>
              <span className="text-xs font-semibold text-emerald-700">{t('autoGeotag', 'Auto Geotag')}</span>
            </button>
          </div>
          
          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200
              ${isDragOver 
                ? 'border-primary bg-blue-50 scale-[1.01]' 
                : 'border-slate-300 bg-white hover:border-primary/50 hover:bg-slate-50'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={Object.values(acceptedTypes)?.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Icon name="UploadCloud" size={24} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base">
                  {isDragOver ? t('dropFilesHere', 'Drop files here') : t('dragDropFiles', 'Or drag and drop files')}
                </h3>
                <p className="text-xs font-semibold text-slate-600 mt-1">
                  {t('autoGeotagNotice', 'Files will be automatically geotagged with your current location')}
                </p>
              </div>

              <p className="text-xs font-semibold text-slate-500 pt-1">
                {t('supportedFormats', 'Supported: JPG, PNG, WebP, MP4, WebM, MOV (Max 10MB)')}
              </p>
            </div>
          </div>
        </>
      )}
      
      {/* Error Messages */}
      {errors?.length > 0 && (
        <div className="space-y-2">
          {errors?.map((error, index) => (
            <div key={index} className="p-3 bg-red-50 border-2 border-red-200 rounded-xl text-xs font-bold text-red-800 flex items-center space-x-2">
              <Icon name="AlertCircle" size={16} className="text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Uploaded Files */}
      {uploadedFiles?.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900 text-sm">
            {t('uploadedFilesCount', 'Uploaded Evidence')} ({uploadedFiles?.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {uploadedFiles?.map((file) => (
              <div key={file?.id} className="bg-white border-2 border-slate-200 rounded-2xl p-3 shadow-xs">
                <div className="flex items-start space-x-3">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                    {file?.preview ? (
                      <img 
                        src={file?.preview} 
                        alt={file?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon 
                        name={file?.type?.startsWith('video/') ? "Video" : "File"} 
                        size={18} 
                        className="text-slate-500" 
                      />
                    )}
                    {file?.geotagged && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-green-600 rounded-full flex items-center justify-center ring-2 ring-white">
                        <Icon name="Check" size={8} className="text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-xs truncate">{file?.name}</p>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {formatFileSize(file?.size)}
                    </p>
                    {file?.geotagged && (
                      <p className="text-[11px] font-bold text-green-700 mt-0.5">
                        📍 {t('liveGeotag', 'Live GPS Tagged')}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFile(file?.id)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100"
                    aria-label="Remove file"
                  >
                    <Icon name="Trash2" size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Media Guidelines */}
      <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
        <div className="flex items-start space-x-3">
          <Icon name="Info" size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-slate-900 mb-1.5 text-xs sm:text-sm">
              {t('mediaGuidelinesTitle', 'Geotagged Evidence Guidelines')}
            </h4>
            <ul className="text-xs font-semibold text-slate-600 space-y-1">
              <li>• {t('guideline1', 'Photos taken with camera are geotagged at the exact moment of capture')}</li>
              <li>• {t('guideline2', 'Location coordinates help disaster officials verify emergency reports')}</li>
              <li>• {t('guideline3', 'Capture clear wide-angle photos showing wave height and landmarks')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaUpload;