import React, { useState } from 'react';
import { UploadIcon, CaptureIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

interface ImageInputAreaProps {
  id: string; 
  title: React.ReactNode;
  icon: React.ReactNode;
  cardColor: string;
  imageSrc: string | null;
  imageTimestamp: Date | null;
  onTimestampChange: (newDate: Date) => void;
  onCaptureClick: () => void;
  onUploadClick: () => void;
  onImageUpdate: (base64: string | null, error?: string) => void;
  onRemoveClick?: () => void;
  dataTourId?: string;
  highlighted?: boolean;
}

const ImageInputArea: React.FC<ImageInputAreaProps> = ({ 
    id,
    title,
    icon,
    cardColor,
    imageSrc, 
    imageTimestamp, 
    onCaptureClick, 
    onUploadClick, 
    onImageUpdate,
    onRemoveClick,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className={`relative rounded-xl shadow-lg transition-all duration-300 overflow-hidden group ${cardColor}`}>
        {imageSrc ? (
            <>
                <img src={`data:image/png;base64,${imageSrc}`} alt={String(title)} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"></div>
                <div className="relative p-4 flex flex-col justify-between h-48 sm:h-56 text-white">
                    <div>
                        <h3 className="text-lg font-bold drop-shadow-md">{title}</h3>
                        <p className="text-xs opacity-80 drop-shadow-sm">{imageTimestamp ? new Date(imageTimestamp).toLocaleString() : 'No timestamp'}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full mt-4">
                        <button onClick={onCaptureClick} className="col-span-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-1.5 px-2 text-xs sm:text-sm rounded-md shadow transition-colors">Retake</button>
                        <button onClick={onUploadClick} className="col-span-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-1.5 px-2 text-xs sm:text-sm rounded-md shadow transition-colors">Replace</button>
                        {onRemoveClick && <button onClick={onRemoveClick} className="col-span-2 sm:col-span-1 bg-red-500/80 hover:bg-red-600/80 backdrop-blur-sm text-white font-semibold py-1.5 px-2 text-xs sm:text-sm rounded-md shadow transition-colors">Remove</button>}
                    </div>
                </div>
            </>
        ) : (
            <div className="w-full h-48 sm:h-56 p-4 flex flex-col items-center justify-center text-center text-white">
                <div className="text-white/80">
                    {icon}
                </div>
                <h3 className="mt-3 text-lg font-bold">{title}</h3>
                <p className="text-sm text-white/70 flex-grow content-end mb-3">Add an image to proceed</p>
                <div className="flex gap-3">
                    <button onClick={onCaptureClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg">
                        <CaptureIcon /> Capture
                    </button>
                    <button onClick={onUploadClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg">
                        <UploadIcon /> Upload
                    </button>
                </div>
            </div>
        )}

        {isProcessing && (
            <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10">
                <LoadingSpinner text="Processing..." />
            </div>
        )}
    </div>
  );
};

export default ImageInputArea;