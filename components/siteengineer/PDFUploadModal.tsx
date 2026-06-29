import React, { useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { useAccessibility } from '../../hooks/useAccessibility';
import LoadingSpinner from '../LoadingSpinner';
import { CloseIcon, UploadIcon } from '../Icons';
import { InspectionRecord } from '../../types';

// The workerSrc must be configured to use pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PDFUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (records: Partial<InspectionRecord>[]) => void;
}

export const PDFUploadModal: React.FC<PDFUploadModalProps> = ({ isOpen, onClose, onUploadComplete }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useAccessibility(modalRef, isOpen, onClose);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgressText('Reading PDF...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const numPages = pdf.numPages;
      const extractedRecords: Partial<InspectionRecord>[] = [];

      for (let i = 1; i <= numPages; i++) {
        setProgressText(`Processing page ${i} of ${numPages}...`);
        
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High scale for better image quality
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: context, viewport } as any).promise;
        
        const pageImageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        // Analyze page
        const response = await fetch('/api/gemini/analyze-oem-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: pageImageBase64 })
        });
        
        if (!response.ok) {
          console.error(`Failed to analyze page ${i}`);
          continue;
        }
        
        const data = await response.json();
        
        // Helper to crop image from normalized bbox [ymin, xmin, ymax, xmax] (0-1000)
        const cropImage = (bbox: number[]): string | undefined => {
          if (!bbox || bbox.length !== 4) return undefined;
          const [ymin, xmin, ymax, xmax] = bbox;
          
          const cropX = (xmin / 1000) * canvas.width;
          const cropY = (ymin / 1000) * canvas.height;
          const cropWidth = ((xmax - xmin) / 1000) * canvas.width;
          const cropHeight = ((ymax - ymin) / 1000) * canvas.height;
          
          // Add some padding or check bounds
          if (cropWidth <= 0 || cropHeight <= 0) return undefined;
          
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = cropWidth;
          cropCanvas.height = cropHeight;
          const cropCtx = cropCanvas.getContext('2d');
          if (!cropCtx) return undefined;
          
          cropCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
          return cropCanvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        };
        
        const irImageBase64 = cropImage(data.irImageBbox);
        const dsImageBase64 = cropImage(data.dsImageBbox);
        
        let analysisOutput: any = null;
        let inspectionStatus: 'draft' | 'pending-analysis' | 'analyzed' | 'analysis-error' = 'draft';
        let faultItemDescription = '';
        let problemItem = '';
        let problemType = '';
        let problemManufacturer = '';
        let problemAnomaly = '';
        let problemRootCause = '';
        let problemRemedial = '';

        if (irImageBase64) {
             setProgressText(`Running AI Analysis for page ${i}...`);
             const analysisResponse = await fetch('/api/gemini/analyze-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  inspection: { 
                    irImageBase64, 
                    dsImageBase64, 
                    ambientTemp: data.ambientTemp 
                  } 
                })
             });
             
             if (analysisResponse.ok) {
                 analysisOutput = await analysisResponse.json();
                 inspectionStatus = 'analyzed';
                 
                 // Extract fields from analysis Output
                 faultItemDescription = analysisOutput.faultItemDescription || '';
                 problemItem = analysisOutput.problemItem || '';
                 problemType = analysisOutput.problemType || '';
                 problemManufacturer = analysisOutput.problemManufacturer || '';
                 problemAnomaly = analysisOutput.problemAnomaly || '';
                 problemRootCause = analysisOutput.problemRootCause || '';
                 problemRemedial = analysisOutput.problemRemedial || '';
             } else {
                 inspectionStatus = 'analysis-error';
             }
        }

        // Create an inspection record with extracted data
        extractedRecords.push({
          component: data.imageNumber || `Page ${i}`,
          ambientTemp: data.ambientTemp,
          irImageBase64: irImageBase64,
          dsImageBase64: dsImageBase64,
          technicianNotes: data.measurements ? 
            'Measurements extracted from PDF:\n' + 
            data.measurements.map((m: any) => `- ${m.parameter}: ${m.value}`).join('\n') : '',
          analysisOutput: {
             findings: analysisOutput?.findings || [],
             derivedData: data.measurements || []
          },
          inspectionStatus: inspectionStatus,
          faultItemDescription,
          problemItem,
          problemType,
          problemManufacturer,
          problemAnomaly,
          problemRootCause,
          problemRemedial
        });
      }
      
      onUploadComplete(extractedRecords);
      onClose();
    } catch (error) {
      console.error("Error processing PDF:", error);
      alert("Failed to process the PDF report.");
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4" onClick={!isProcessing ? onClose : undefined}>
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Upload OEM PDF Report</h2>
          {!isProcessing && (
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              <CloseIcon />
            </button>
          )}
        </div>
        
        <p className="text-sm text-slate-600 dark:text-gray-300 mb-6">
          Upload a FLIR/OEM PDF report. The system will automatically extract each page into a separate inspection record, including IR images, DS images, and measurements.
        </p>

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sky-600 dark:text-sky-400 font-medium">{progressText}</p>
          </div>
        ) : (
          <div className="flex justify-center items-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-sky-300 border-dashed rounded-lg cursor-pointer bg-sky-50 dark:bg-gray-800 hover:bg-sky-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadIcon />
                <p className="mb-2 text-sm text-sky-600 dark:text-sky-400"><span className="font-semibold">Click to upload</span></p>
                <p className="text-xs text-sky-500 dark:text-sky-500">PDF documents only</p>
              </div>
              <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
