import React, { useState, useEffect, useRef } from 'react';
import { InspectionRecord, ParsedAnalysisFinding, AIDerivedDataValue } from '../types';
import { CloseIcon } from './Icons';
import { useAccessibility } from '../hooks/useAccessibility';

interface InspectionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: InspectionRecord | null;
  reportUserEmail: string;
}

const InspectionSummaryModal: React.FC<InspectionSummaryModalProps> = ({ isOpen, onClose, inspection, reportUserEmail }) => {
  const [show, setShow] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useAccessibility(modalContentRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShow(true), 10);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isOpen]);

  if (!isOpen && !show) { // Wait for transition to finish before unmounting content
    return null;
  }
  
  if (!inspection) return null;

  const getPriorityClass = (priority: string): string => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-[#DC2626] dark:text-red-400 font-semibold';
      case 'medium': return 'text-[#D97706] dark:text-orange-400 font-semibold';
      case 'low': return 'text-[#059669] dark:text-green-400 font-semibold';
      default: return 'text-slate-700 dark:text-gray-300';
    }
  };

  const renderAiDerivedData = (derivedData: AIDerivedDataValue[] | null | undefined) => {
    if (!derivedData || derivedData.length === 0) return null;
    return (
        <div className="mb-4">
            <h4 className="text-md font-semibold text-slate-700 dark:text-gray-200 mb-2">AI-Derived Data & Calculations</h4>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs divide-y divide-slate-200 dark:divide-gray-700 border border-slate-300 dark:border-gray-600">
                    <thead className="bg-slate-100 dark:bg-gray-800">
                        <tr>
                            <th className="px-2 py-1 text-left font-medium text-slate-600 dark:text-gray-300 uppercase tracking-wider">Parameter</th>
                            <th className="px-2 py-1 text-left font-medium text-slate-600 dark:text-gray-300 uppercase tracking-wider">Value</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-slate-200 dark:divide-gray-700">
                        {derivedData.map((item, index) => (
                           <tr key={index}>
                               <td className="px-2 py-1 whitespace-nowrap font-medium text-slate-800 dark:text-white">{item.parameter}</td>
                               <td className="px-2 py-1 whitespace-pre-wrap text-slate-700 dark:text-gray-300">{item.value}</td>
                           </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  const renderAiAnalysisFindings = (findings: ParsedAnalysisFinding[] | null | undefined) => {
    if (!findings || findings.length === 0) {
      return <p className="text-slate-500 dark:text-gray-400 text-xs">No specific findings provided by AI.</p>;
    }
    const groupedFindings: { [key: string]: ParsedAnalysisFinding[] } = {};
    findings.forEach(finding => {
      const category = finding.category || 'Uncategorized';
      if (!groupedFindings[category]) groupedFindings[category] = [];
      groupedFindings[category].push(finding);
    });

    return (
      <div className="mb-4">
        <h4 className="text-md font-semibold text-slate-700 dark:text-gray-200 mb-2">AI Analysis & Findings</h4>
        {Object.entries(groupedFindings).map(([category, categoryFindings]) => (
          <div key={category} className="mb-3">
            <h5 className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-1 capitalize">{category}</h5>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-200 dark:divide-gray-700 border border-slate-300 dark:border-gray-600">
                <thead className="bg-slate-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-slate-500 dark:text-gray-400 uppercase">Finding</th>
                    <th className="px-2 py-1 text-left font-medium text-slate-500 dark:text-gray-400 uppercase">Details</th>
                    <th className="px-2 py-1 text-left font-medium text-slate-500 dark:text-gray-400 uppercase">Priority</th>
                    <th className="px-2 py-1 text-left font-medium text-slate-500 dark:text-gray-400 uppercase">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-slate-200 dark:divide-gray-700">
                  {categoryFindings.map((item, index) => (
                    <tr key={index}>
                      <td className="px-2 py-1 whitespace-pre-wrap font-medium text-slate-800 dark:text-white break-words">{item.finding}</td>
                      <td className="px-2 py-1 whitespace-pre-wrap text-slate-700 dark:text-gray-300 break-words">{item.details}</td>
                      <td className={`px-2 py-1 whitespace-nowrap ${getPriorityClass(item.priority)} break-words`}>{item.priority}</td>
                      <td className="px-2 py-1 whitespace-pre-wrap text-slate-700 dark:text-gray-300 break-words">{item.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const analysisOutput = inspection.analysisOutput;
  const modalTitleId = `summary-modal-title-${inspection.id}`;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-[70] p-4 print:hidden transition-opacity duration-300 ease-in-out ${show ? 'opacity-100 bg-black bg-opacity-60' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div 
        ref={modalContentRef}
        className={`transform transition-all duration-300 ease-in-out ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} bg-white dark:bg-gray-900 p-5 md:p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-gray-700`}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-300 dark:border-gray-700">
          <h3 id={modalTitleId} className="text-xl md:text-2xl font-semibold text-brand-dark dark:text-brand-light-blue">Inspection Details</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Report Details Section */}
        <div className="mb-4 p-3 border border-slate-200 dark:border-gray-700 rounded-md bg-slate-50 dark:bg-gray-800/50 text-xs md:text-sm">
          <h4 className="text-md font-semibold text-slate-700 dark:text-gray-200 mb-2">Report Overview</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {inspection.jobIdReference && <div><strong className="text-slate-600 dark:text-gray-300">Job ID:</strong> <span className="text-slate-800 dark:text-white">{inspection.jobIdReference}</span></div>}
            <div><strong className="text-slate-600 dark:text-gray-300">Client:</strong> <span className="text-slate-800 dark:text-white">{inspection.clientName}</span></div>
            <div><strong className="text-slate-600 dark:text-gray-300">Location:</strong> <span className="text-slate-800 dark:text-white">{inspection.location}</span></div>
            <div><strong className="text-slate-600 dark:text-gray-300">Equipment:</strong> <span className="text-slate-800 dark:text-white">{inspection.machineDetails}</span></div>
            <div><strong className="text-slate-600 dark:text-gray-300">Date:</strong> <span className="text-slate-800 dark:text-white">{new Date(inspection.createdAt).toLocaleDateString()}</span></div>
            <div><strong className="text-slate-600 dark:text-gray-300">Site Engineer:</strong> <span className="text-slate-800 dark:text-white">{reportUserEmail}</span></div>
            <div>
              <strong className="text-slate-600 dark:text-gray-300">Status:</strong> 
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-medium
                ${inspection.inspectionStatus === 'analyzed' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                  inspection.inspectionStatus === 'pending-analysis' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' :
                  inspection.inspectionStatus === 'draft' ? 'bg-slate-100 text-slate-700 dark:bg-gray-700/80 dark:text-gray-300' :
                  'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>
                {inspection.inspectionStatus.replace('-', ' ')}
              </span>
            </div>
          </div>
        </div>

        {(inspection.irImageBase64 || inspection.dsImageBase64) && (
          <div className="mb-4">
            <h4 className="text-md font-semibold text-slate-700 dark:text-gray-200 mb-2">Images</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inspection.irImageBase64 && (
                <div className="text-center">
                  <h5 className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">Infrared (IR)</h5>
                  <img src={`data:image/png;base64,${inspection.irImageBase64}`} alt="Infrared" className="max-w-full h-auto rounded-md shadow-sm border border-slate-300 dark:border-gray-600 mx-auto" style={{maxHeight: '200px'}}/>
                  {inspection.irImageTimestamp && (
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                        {new Date(inspection.irImageTimestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              {inspection.dsImageBase64 && (
                <div className="text-center">
                  <h5 className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">Digital Still (DS)</h5>
                  <img src={`data:image/png;base64,${inspection.dsImageBase64}`} alt="Digital Still" className="max-w-full h-auto rounded-md shadow-sm border border-slate-300 dark:border-gray-600 mx-auto" style={{maxHeight: '200px'}}/>
                  {inspection.dsImageTimestamp && (
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                        {new Date(inspection.dsImageTimestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {inspection.technicianNotes && (
          <div className="mb-4">
            <h4 className="text-md font-semibold text-slate-700 dark:text-gray-200 mb-1">Site Engineer Notes</h4>
            <p className="text-xs md:text-sm text-slate-700 dark:text-gray-300 whitespace-pre-wrap bg-slate-50 dark:bg-gray-800/50 p-2 rounded-md border border-slate-200 dark:border-gray-600">{inspection.technicianNotes}</p>
          </div>
        )}

        {analysisOutput ? (
          <>
            {analysisOutput.error && !analysisOutput.findings && !analysisOutput.derivedData && (
              <p className="text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 p-2 rounded-md mb-3 text-xs md:text-sm text-center">
                  AI analysis encountered an issue: {analysisOutput.error}
              </p>
            )}
            {analysisOutput.error && (analysisOutput.findings || analysisOutput.derivedData) && (
                 <p className="text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 p-2 rounded-md mb-3 text-xs md:text-sm text-center">
                    AI analysis partially failed: {analysisOutput.error}. Some data might be missing or incomplete.
                 </p>
            )}
            {renderAiDerivedData(analysisOutput.derivedData)}
            {renderAiAnalysisFindings(analysisOutput.findings)}
            {inspection.rawAnalysisText && (
                 <div className="mt-3 pt-2 border-t border-slate-200 dark:border-gray-700">
                    <details className="text-xs">
                        <summary className="text-slate-500 dark:text-gray-400 cursor-pointer hover:text-slate-700 dark:hover:text-gray-200">View Full Raw AI Output</summary>
                        <pre className="mt-1 bg-slate-100 dark:bg-black/50 p-2 rounded-md whitespace-pre-wrap break-words">{inspection.rawAnalysisText}</pre>
                    </details>
                </div>
            )}
            {analysisOutput.groundingChunks && analysisOutput.groundingChunks.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-200 mb-1">Information Sources</h4>
                    <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-gray-400 space-y-0.5">
                    {analysisOutput.groundingChunks.map((chunk, index) => (
                        chunk.web?.uri && (
                        <li key={index}>
                            <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-sky-400 hover:text-blue-800 dark:hover:text-sky-200 hover:underline">
                            {chunk.web.title || chunk.web.uri}
                            </a>
                        </li>
                        )
                    ))}
                    </ul>
                </div>
            )}
          </>
        ) : inspection.inspectionStatus === 'pending-analysis' ? (
          <p className="text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-md text-sm text-center">Analysis is pending and will be processed when online.</p>
        ) : inspection.inspectionStatus === 'analysis-error' && inspection.analysisError ? (
           <p className="text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm text-center">Analysis failed: {inspection.analysisError}</p>
        ) : (
          <p className="text-slate-500 dark:text-gray-400 text-sm">No AI analysis has been performed or data is unavailable.</p>
        )}
        
        <div className="mt-6 pt-4 border-t border-slate-300 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-md shadow transition duration-150 ease-in-out text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InspectionSummaryModal;