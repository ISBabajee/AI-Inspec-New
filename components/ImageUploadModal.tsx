import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { UploadIcon } from './Icons';
import { useAccessibility } from '../hooks/useAccessibility';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (base64Image: string | null, error?: string) => void;
  imageType: 'IR' | 'DS' | 'NAMEPLATE' | 'METER';
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ isOpen, onClose, onUpload, imageType }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useAccessibility(modalContentRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShow(true), 10);
      return () => clearTimeout(timer);
    } else {
      // Reset state when closing to ensure it's fresh for the next open
      setSelectedFile(null);
      setPreviewSrc(null);
      setError(null);
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setShow(false);
    }
  }, [isOpen]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setPreviewSrc(null);
    setSelectedFile(null);
    const file = event.target.files?.[0];

    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Invalid file type. Please select an image.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // Max file size: 5MB
        setError('File is too large. Maximum size is 5MB.');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setPreviewSrc(dataUrl);
          } else {
            setPreviewSrc(reader.result as string);
          }
        };
        img.onerror = () => {
          setPreviewSrc(reader.result as string);
        };
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        setError('Failed to read file.');
        onUpload(null, 'Failed to read file.');
      }
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !previewSrc) {
      setError('No file selected or preview not available.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    
    const base64Data = previewSrc.split(',')[1];
    if (!base64Data) {
        const err = 'Could not extract base64 data from preview.';
        setError(err);
        onUpload(null, err);
        setIsProcessing(false);
        return;
    }
    
    // Pass data to the parent. The parent component will now handle closing the modal.
    onUpload(base64Data);
  };

  const handleCancel = () => {
    onClose();
  }

  if (!isOpen) {
    return null;
  }

  const modalTitleId = `modal-title-upload-${imageType}`;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${show ? 'opacity-100 bg-black bg-opacity-75' : 'opacity-0 pointer-events-none'}`}>
      <div 
        ref={modalContentRef} 
        className={`transform transition-all duration-300 ease-in-out ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-lg border border-slate-200 dark:border-gray-700`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
      >
        <h3 id={modalTitleId} className="text-2xl font-semibold text-slate-800 dark:text-white mb-4">Upload {imageType} Image</h3>
        
        {error && <p className="text-red-500 bg-red-100 dark:text-red-300 dark:bg-red-900/50 p-3 rounded mb-4 text-sm">{error}</p>}

        <div className="mb-4">
          <label htmlFor="imageUploadInput" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Choose an image file (PNG, JPG, WebP, max 5MB):
          </label>
          <input
            ref={fileInputRef}
            id="imageUploadInput"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 dark:file:bg-sky-800 file:text-brand-light-blue dark:file:text-sky-300 hover:file:bg-blue-100 dark:hover:file:bg-sky-700 disabled:opacity-50"
            aria-describedby="file-upload-constraints"
            disabled={isProcessing}
          />
          <p id="file-upload-constraints" className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Ensure the image is clear and relevant for analysis.
          </p>
        </div>

        {previewSrc && (
          <div className="mb-4 border border-slate-200 dark:border-gray-700 rounded p-2">
            <p className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Preview:</p>
            <img src={previewSrc} alt="Selected image preview" className="max-w-full max-h-60 object-contain mx-auto rounded" />
          </div>
        )}

        {isProcessing && (
            <div className="my-4">
                <LoadingSpinner text="Processing image..." />
            </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-6 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600 transition duration-150 disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !!error || isProcessing || !previewSrc}
            className="px-6 py-2 bg-brand-light-blue text-white rounded-md hover:bg-sky-500 disabled:bg-slate-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-150 flex items-center gap-2"
          >
             {isProcessing ? <LoadingSpinner size="sm" /> : (
                <>
                 <UploadIcon />
                Confirm Upload
                </>
             )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;