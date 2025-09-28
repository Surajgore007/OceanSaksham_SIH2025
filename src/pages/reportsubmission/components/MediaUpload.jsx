import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/Appicon';
import Button from '../../../components/ui/Button';
import locationService from '../../../utils/locationService';

const MediaUpload = ({ 
  uploadedFiles = [], 
  onFilesChange, 
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  className = '' 
}) => {
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
      errors?.push(`${file?.name}: Unsupported file type. Please use JPG, PNG, WebP, MP4, WebM, or MOV files.`);
    }
    
    if (file?.size > maxFileSize) {
      errors?.push(`${file?.name}: File too large. Maximum size is ${formatFileSize(maxFileSize)}.`);
    }
    
    return errors;
  };

  const processGeotaggedFile = async (file, location = null) => {
    // Get fresh location for each file if not provided
    const currentLocation = location || await getCurrentLocation();
    
    // Get address if location is available
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

    return {
      id: Date.now() + Math.random(),
      file: file,
      name: file?.name,
      size: file?.size,
      type: file?.type,
      preview: file?.type?.startsWith('image/') ? URL.createObjectURL(file) : null,
      uploadedAt: new Date()?.toISOString(),
      location: currentLocation,
      address: address,
      geotagged: !!currentLocation,
      compressionRatio: 0
    };
  };

  const processFiles = async (fileList) => {
    const files = Array.from(fileList);
    const newErrors = [];
    
    // Check total file count
    if (uploadedFiles?.length + files?.length > maxFiles) {
      newErrors?.push(`Maximum ${maxFiles} files allowed. You can upload ${maxFiles - uploadedFiles?.length} more files.`);
      setErrors(newErrors);
      return;
    }
    
    // Validate each file
    files?.forEach(file => {
      const fileErrors = validateFile(file);
      newErrors?.push(...fileErrors);
    });
    
    if (newErrors?.length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors([]);
    
    // Process files with geotag information
    const processedFiles = [];
    
    for (const file of files) {
      const fileId = Date.now() + Math.random();
      
      // Start upload progress
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev?.[fileId] || 0;
          if (currentProgress >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [fileId]: currentProgress + 10 };
        });
      }, 200);
      
      try {
        const geotaggedFile = await processGeotaggedFile(file);
        geotaggedFile.id = fileId;
        
        // Complete upload
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        
        processedFiles?.push(geotaggedFile);
        
        // Remove progress after delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress?.[fileId];
            return newProgress;
          });
        }, 1000);
        
      } catch (error) {
        setErrors(prev => [...prev, `Failed to process ${file?.name}`]);
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress?.[fileId];
          return newProgress;
        });
      }
    }
    
    onFilesChange([...uploadedFiles, ...processedFiles]);
  };

  const startCamera = async () => {
    try {
      setErrors([]);

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrors(['Camera not supported in this browser']);
        return;
      }

      // Stop any existing stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }

      // Simple camera constraints
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setIsCapturing(true);

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

    } catch (error) {
      console.error('Camera error:', error);
      let errorMessage = 'Camera access denied. Please enable camera permissions to take photos.';
      
      if (error?.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please ensure your device has a camera.';
      } else if (error?.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error?.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      }
      
      setErrors([errorMessage]);
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStream(null);
    setIsCapturing(false);
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    
    if (isCapturing) {
      stopCamera();
      // Small delay to ensure cleanup
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
      // Get current location at the moment of capture
      const captureLocation = await getCurrentLocation();
      
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (blob && uploadedFiles?.length < maxFiles) {
          try {
            // Create file from blob with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `camera_capture_${timestamp}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg' });

            // Process the captured photo with current geotag
            const geotaggedPhoto = await processGeotaggedFile(file, captureLocation);

            onFilesChange([...uploadedFiles, geotaggedPhoto]);
            stopCamera();
          } catch (error) {
            console.error('Error processing captured photo:', error);
            setErrors(['Failed to process captured photo. Please try again.']);
          }
        } else if (uploadedFiles?.length >= maxFiles) {
          setErrors([`Maximum ${maxFiles} files allowed.`]);
        }
      }, 'image/jpeg', 0.85);
      
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
    // Reset input
    e.target.value = '';
  };

  const removeFile = (fileId) => {
    const updatedFiles = uploadedFiles?.filter(file => file?.id !== fileId);
    onFilesChange(updatedFiles);
    
    // Clean up preview URL
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
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
            Camera Capture
          </h2>
          <p className="text-sm text-muted-foreground">
            Take a geotagged photo for your report
          </p>
        </div>
        
        {/* Camera View */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3] max-h-[70vh]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Location indicator */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="flex items-center space-x-1 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs">
              <Icon name="MapPin" size={12} />
              {isLocationLoading ? (
                <span>Getting GPS...</span>
              ) : userLocation ? (
                <span>GPS: ±{userLocation?.accuracy?.toFixed(0)}m</span>
              ) : (
                <span className="text-yellow-300">No GPS</span>
              )}
            </div>
            
            {/* Camera switch button */}
            <Button
              variant="ghost"
              size="sm"
              iconName="RotateCcw"
              onClick={switchCamera}
              className="bg-black/70 backdrop-blur-sm text-white border-none hover:bg-black/80 p-2"
            />
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center space-x-4 px-4">
            <Button
              variant="outline"
              size="sm"
              iconName="X"
              onClick={stopCamera}
              className="bg-black/70 backdrop-blur-sm text-white border-white/30 hover:bg-black/80"
            >
              Cancel
            </Button>
            
            <Button
              variant="default"
              size="lg"
              iconName="Camera"
              onClick={capturePhoto}
              className="bg-primary hover:bg-primary/90 text-white px-8"
            >
              Capture
            </Button>
          </div>
        </div>
        
        {/* Hidden canvas for photo processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Camera info */}
        <div className="text-center text-xs text-muted-foreground">
          Using {facingMode === 'environment' ? 'back' : 'front'} camera • Location will be captured at the moment you take the photo
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 md:space-y-6 ${className}`}>
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
          Upload Geotagged Media
        </h2>
        <p className="text-sm text-muted-foreground">
          Add photos or videos with location data to support your report
        </p>
      </div>
      
      {/* Camera and File Upload Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4 md:mb-6">
        <Button
          variant="outline"
          iconName="Camera"
          iconPosition="left"
          onClick={startCamera}
          disabled={uploadedFiles?.length >= maxFiles}
          className="aspect-square flex-col h-20 md:h-24 text-xs md:text-sm"
        >
          <span className="mt-1">Take Photo</span>
          <span className="text-xs text-muted-foreground">Live Geotag</span>
        </Button>
        
        <Button
          variant="outline"
          iconName="Upload"
          iconPosition="left"
          onClick={openFileDialog}
          disabled={uploadedFiles?.length >= maxFiles}
          className="aspect-square flex-col h-20 md:h-24 text-xs md:text-sm"
        >
          <span className="mt-1">Upload Files</span>
          <span className="text-xs text-muted-foreground">Auto-geotag</span>
        </Button>
      </div>
      
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-4 md:p-6 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
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

        <div className="space-y-3">
          <div className="mx-auto w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Icon name="Upload" size={20} className="text-primary" />
          </div>

          <div>
            <h3 className="font-medium text-foreground mb-1 text-sm md:text-base">
              {isDragOver ? "Drop files here" : "Or drag and drop files"}
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Files will be automatically geotagged with your current location
            </p>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Supported: JPG, PNG, WebP, MP4, WebM, MOV</p>
            <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
            <p>Maximum {maxFiles} files ({uploadedFiles?.length}/{maxFiles} used)</p>
          </div>
        </div>
      </div>
      
      {/* Error Messages */}
      {errors?.length > 0 && (
        <div className="space-y-2">
          {errors?.map((error, index) => (
            <div key={index} className="p-3 bg-error/10 border border-error/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Icon name="AlertCircle" size={16} className="text-error mt-0.5 flex-shrink-0" />
                <p className="text-sm text-error">{error}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Upload Progress */}
      {Object.keys(uploadProgress)?.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-foreground text-sm">Processing Files...</h4>
          {Object.entries(uploadProgress)?.map(([fileId, progress]) => (
            <div key={fileId} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Adding geotag data...</span>
                <span className="text-foreground font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Uploaded Files */}
      {uploadedFiles?.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-foreground text-sm">Uploaded Files ({uploadedFiles?.length})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {uploadedFiles?.map((file) => (
              <div key={file?.id} className="bg-card border border-border rounded-lg p-3 md:p-4">
                <div className="flex items-start space-x-3">
                  {/* File Preview */}
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 relative">
                    {file?.preview ? (
                      <img 
                        src={file?.preview} 
                        alt={file?.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Icon 
                        name={file?.type?.startsWith('video/') ? "Video" : "File"} 
                        size={18} 
                        className="text-muted-foreground" 
                      />
                    )}
                    
                    {/* Geotag indicator */}
                    {file?.geotagged && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center">
                        <Icon name="MapPin" size={10} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{file?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file?.size)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(file.uploadedAt)?.toLocaleTimeString()}
                    </p>
                    
                    {/* Location info */}
                    {file?.geotagged && file?.address && (
                      <p className="text-xs text-success mt-1 truncate">
                        📍 {file?.address?.address}
                      </p>
                    )}
                    
                    {!file?.geotagged && (
                      <p className="text-xs text-warning mt-1">
                        ⚠️ No location data
                      </p>
                    )}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file?.id)}
                    iconName="X"
                    className="text-muted-foreground hover:text-error w-6 h-6 flex-shrink-0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Media Guidelines */}
      <div className="p-3 md:p-4 bg-muted/30 border border-border rounded-lg">
        <div className="flex items-start space-x-3">
          <Icon name="Info" size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-foreground mb-2 text-sm">Geotagged Media Guidelines</h4>
            <ul className="text-xs md:text-sm text-muted-foreground space-y-1">
              <li>• Photos taken with camera are geotagged at the moment of capture</li>
              <li>• Uploaded files are tagged with your current location</li>
              <li>• Location data helps officials verify and respond to reports</li>
              <li>• All location data is encrypted and used only for official purposes</li>
              <li>• Take clear photos showing hazard conditions and surroundings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaUpload;