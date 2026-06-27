
import React, { useState, useRef, useEffect } from 'react';
import { ImageType } from '../types';
import { CaptureIcon, UploadIcon, EditIcon, CloseIcon } from './Icons';

interface ImageInputAreaProps {
  type: ImageType;
  title: string;
  icon: React.ReactNode;
  imageSrc: string | null;
  onCameraClick: (type: ImageType) => void;
  onUploadClick: (type: ImageType) => void;
  onViewClick: (src: string, alt: string) => void;
  isMobile?: boolean;
}

interface ChooserPopupProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
  onCamera: () => void;
  onUpload: () => void;
}

const ChooserPopup: React.FC<ChooserPopupProps> = ({ isOpen, onClose, anchorRef, onCamera, onUpload }) => {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const chooserRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (isOpen && anchorRef.current && chooserRef.current) {
          const rect = anchorRef.current.getBoundingClientRect();
          const chooserHeight = chooserRef.current.offsetHeight;
          const chooserWidth = chooserRef.current.offsetWidth;
          const windowHeight = window.innerHeight;
          const windowWidth = window.innerWidth;

          let top = rect.bottom + 8;
          if (top + chooserHeight > windowHeight - 8) { // 8px buffer
              top = rect.top - chooserHeight - 8;
          }

          let left = rect.left + rect.width / 2 - chooserWidth / 2;
          if (left < 8) {
              left = 8;
          } else if (left + chooserWidth > windowWidth - 8) {
              left = windowWidth - chooserWidth - 8;
          }

          setStyle({
              position: 'fixed', // Use fixed to position relative to viewport
              top: `${top}px`,
              left: `${left}px`,
              zIndex: 50,
          });
      }
  }, [isOpen, anchorRef]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        ref={chooserRef}
        style={style}
        className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-2 border border-slate-200 dark:border-gray-700 flex flex-col gap-1 w-64"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-3 py-2 border-b border-slate-100 dark:border-gray-700 mb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">Select Source</span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200">
                <CloseIcon className="w-4 h-4" />
            </button>
        </div>
        <button onClick={onCamera} className="flex items-center gap-3 w-full text-left px-3 py-3 text-sm text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors">
          <CaptureIcon className="w-5 h-5 text-brand-orange" />
          <span>Capture with Camera</span>
        </button>
        <button onClick={onUpload} className="flex items-center gap-3 w-full text-left px-3 py-3 text-sm text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors">
          <UploadIcon className="w-5 h-5 text-sky-500" />
          <span>Upload from Gallery</span>
        </button>
      </div>
    </div>
  );
};

const ImageInputArea: React.FC<ImageInputAreaProps> = ({ type, title, icon, imageSrc, onCameraClick, onUploadClick, onViewClick, isMobile = false }) => {
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleOpenChooser = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsChooserOpen(true);
  };
  
  const handleCloseChooser = () => {
    setIsChooserOpen(false);
  };
  
  const handleCamera = () => {
    onCameraClick(type);
    handleCloseChooser();
  };
  
  const handleUpload = () => {
    onUploadClick(type);
    handleCloseChooser();
  };

  if (imageSrc) {
    if (isMobile) {
        return (
            <div className="relative group w-full aspect-square">
                 <button
                    onClick={() => onViewClick(`data:image/png;base64,${imageSrc}`, title)}
                    className="w-full h-full p-2 rounded-lg shadow-md transition-all duration-200 overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center"
                >
                    <img src={`data:image/png;base64,${imageSrc}`} alt={title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="relative z-10 mt-auto text-white">
                        <h3 className="font-bold text-xs drop-shadow-sm">{title}</h3>
                    </div>
                </button>
                <button
                    ref={buttonRef}
                    onClick={handleOpenChooser}
                    className="absolute top-1.5 right-1.5 z-20 p-1.5 bg-black/40 backdrop-blur-sm text-white rounded-full"
                    title={`Change ${title} image`}
                    aria-label={`Change ${title} image`}
                >
                    <EditIcon className="w-3 h-3" />
                </button>
                <ChooserPopup 
                    isOpen={isChooserOpen} 
                    onClose={handleCloseChooser} 
                    anchorRef={buttonRef} 
                    onCamera={handleCamera} 
                    onUpload={handleUpload} 
                />
            </div>
        );
    }
    return (
        <div className="relative group">
            <button
                onClick={() => onViewClick(`data:image/png;base64,${imageSrc}`, title)}
                className="w-full h-40 sm:h-48 rounded-xl shadow-lg transition-all duration-300 overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center"
            >
                <img src={`data:image/png;base64,${imageSrc}`} alt={title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div className="relative text-white z-10 mt-auto flex flex-col items-center">
                    <h3 className="font-bold drop-shadow-md">{title}</h3>
                    <p className="text-xs opacity-90 drop-shadow-sm">Click to view</p>
                </div>
            </button>
            <button
                ref={buttonRef}
                onClick={handleOpenChooser}
                className="absolute top-2 right-2 z-20 p-2 bg-black/40 backdrop-blur-sm text-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 hover:bg-black/60"
                title={`Change ${title} image`}
                aria-label={`Change ${title} image`}
            >
                <EditIcon className="w-4 h-4" />
            </button>
            <ChooserPopup 
                isOpen={isChooserOpen} 
                onClose={handleCloseChooser} 
                anchorRef={buttonRef} 
                onCamera={handleCamera} 
                onUpload={handleUpload} 
            />
        </div>
    );
  }

  if (isMobile) {
    return (
        <div className="relative w-full aspect-square">
            <button
                ref={buttonRef}
                onClick={handleOpenChooser}
                className="relative w-full aspect-square p-2 rounded-lg shadow-md transition-all duration-200 overflow-hidden group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 flex flex-col items-center justify-center text-center"
            >
                <div className="text-slate-400 dark:text-slate-500 text-3xl mb-1">{icon}</div>
                <div className="relative z-10 mt-auto text-slate-700 dark:text-white">
                    <h3 className="font-bold text-xs drop-shadow-sm">{title}</h3>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400">Tap to add</p>
                </div>
            </button>
            <ChooserPopup 
                isOpen={isChooserOpen} 
                onClose={handleCloseChooser} 
                anchorRef={buttonRef} 
                onCamera={handleCamera} 
                onUpload={handleUpload} 
            />
        </div>
    );
  }

  return (
    <div className="relative">
        <button
            ref={buttonRef}
            onClick={handleOpenChooser}
            className="w-full h-40 sm:h-48 p-4 rounded-xl shadow-lg transition-all duration-300 overflow-hidden group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 hover:shadow-sky-200/50 dark:hover:shadow-sky-800/50 flex flex-col items-center justify-center text-center"
        >
            <div className="text-slate-400 dark:text-slate-500 text-4xl mb-2">{icon}</div>
            <h3 className="font-bold text-slate-700 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">No image</p>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-2 font-semibold">Click to add</p>
        </button>
        <ChooserPopup 
            isOpen={isChooserOpen} 
            onClose={handleCloseChooser} 
            anchorRef={buttonRef} 
            onCamera={handleCamera} 
            onUpload={handleUpload} 
        />
    </div>
  );
};

export default ImageInputArea;
