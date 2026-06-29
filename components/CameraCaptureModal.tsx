import React, { useRef, useEffect, useState, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { CaptureIcon } from './Icons';
import { useAccessibility } from '../hooks/useAccessibility';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string | null, error?: string) => void;
  imageType: 'IR' | 'DS' | 'NAMEPLATE' | 'METER';
}

const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ isOpen, onClose, onCapture, imageType }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [show, setShow] = useState(false);

  useAccessibility(modalContentRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShow(true), 10);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isOpen]);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "environment" // Prefer rear camera
          } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } else {
        setError('Camera access is not supported by your browser.');
        onCapture(null, 'Camera access is not supported by your browser.');
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      let message = 'Error accessing camera. Please ensure permissions are granted.';
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          message = "Camera permission denied. Please enable camera access in your browser settings.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          message = "No camera found. Please ensure a camera is connected and enabled.";
        }
      }
      setError(message);
      onCapture(null, message); // Notify parent about the error
    }
  }, [onCapture]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { // Cleanup on unmount or if isOpen changes before effect completes
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only re-run when isOpen changes. startCamera/stopCamera are memoized.

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && stream) {
      setIsCapturing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const base64Data = imageDataUrl.split(',')[1];
        onCapture(base64Data);
      } else {
        onCapture(null, 'Failed to get canvas context.');
      }
      setIsCapturing(false);
      stopCamera();
    } else {
      onCapture(null, 'Camera or canvas not ready.');
      setIsCapturing(false);
    }
  };

  if (!isOpen) {
    return null;
  }
  const modalTitleId = `modal-title-${imageType}`;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${show ? 'opacity-100 bg-black bg-opacity-75' : 'opacity-0 pointer-events-none'}`}>
      <div 
        ref={modalContentRef} 
        className={`transform transition-all duration-300 ease-in-out ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-2xl border border-slate-200 dark:border-gray-700`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
      >
        <h3 id={modalTitleId} className="text-2xl font-semibold text-slate-800 dark:text-white mb-4">Capture {imageType} Image</h3>
        {error && <p className="text-red-500 bg-red-100 dark:text-red-300 dark:bg-red-900/50 p-3 rounded mb-4">{error}</p>}
        
        <div className="relative w-full aspect-video bg-slate-200 dark:bg-gray-800 rounded overflow-hidden mb-4">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden"></canvas>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isCapturing}
            className="px-6 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600 transition duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleCapture}
            disabled={!stream || !!error || isCapturing}
            className="px-6 py-2 bg-brand-light-blue text-white rounded-md hover:bg-sky-500 disabled:bg-slate-400 dark:disabled:bg-gray-500 transition duration-150 flex items-center gap-2"
          >
            {isCapturing ? <LoadingSpinner size="sm" /> : (
              <>
                <CaptureIcon />
                Snap Photo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCaptureModal;