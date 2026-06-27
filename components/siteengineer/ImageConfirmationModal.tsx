import React, { useRef } from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';
import { CaptureIcon, UploadIcon } from '../Icons';

interface ImageConfirmationModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onConfirm: () => void;
  onRetake: () => void;
  onReplace: () => void;
  onClose: () => void; 
}

const ImageConfirmationModal: React.FC<ImageConfirmationModalProps> = ({
  isOpen,
  imageSrc,
  onConfirm,
  onRetake,
  onReplace,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useAccessibility(modalRef, isOpen, onClose);

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[80] p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-image-title"
      >
        <h3 id="confirm-image-title" className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-white mb-4">
          Image Ready
        </h3>
        <div className="mb-6 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
          <img src={imageSrc} alt="Captured preview" className="w-full h-auto max-h-64 object-contain bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onRetake}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600 transition"
          >
            <CaptureIcon />
            Retake
          </button>
          <button
            onClick={onReplace}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600 transition"
          >
            <UploadIcon />
            Replace
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageConfirmationModal;
