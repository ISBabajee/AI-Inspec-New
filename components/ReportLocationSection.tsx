
import React from 'react';
import { InspectionRecord, ParsedAnalysisFinding, AIDerivedDataValue, NameplateData } from '../types';

interface ReportLocationSectionProps {
  inspection: InspectionRecord;
  currentUserEmail: string;
  sectionNumber: number;
  reportIdPrefix?: string; 
}

const ReportLocationSection: React.FC<ReportLocationSectionProps> = ({
  inspection,
  currentUserEmail,
  sectionNumber,
  reportIdPrefix = 'loc'
}) => {
  
  const sectionId = `${reportIdPrefix}-${inspection.id}`;
  const analysisOutput = inspection.analysisOutput;

  const getPriorityClass = (priority: string | undefined): string => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-700 font-bold bg-red-50 print:bg-red-100';
      case 'medium': return 'text-orange-600 font-bold bg-orange-50 print:bg-orange-100';
      case 'low': return 'text-green-700 font-bold bg-green-50 print:bg-green-100';
      default: return 'text-slate-800';
    }
  };
  
  const getPriorityCellClass = (priority: string | undefined): string => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-50 print:bg-red-100';
      case 'medium': return 'bg-orange-50 print:bg-orange-100';
      case 'low': return 'bg-green-50 print:bg-green-100';
      default: return 'bg-white';
    }
  };
  
  const calculateEfficiencyMetrics = () => {
    let ratedAmps: number | null = null;
    let ratedVolts: number | null = null;

    if (inspection.nameplateData) {
        for (const item of inspection.nameplateData) {
            const param = item.parameter.toLowerCase();
            // Simple fuzzy matching
            if (param.includes('amp') || param === 'a' || param.includes('current')) {
                const val = parseFloat(item.value.replace(/[^0-9.]/g, ''));
                if (!isNaN(val)) ratedAmps = val;
            }
            if (param.includes('volt') || param === 'v') {
                const val = parseFloat(item.value.replace(/[^0-9.]/g, ''));
                if (!isNaN(val)) ratedVolts = val;
            }
        }
    }

    const measuredAmps = inspection.measuredCurrent;
    const measuredVolts = inspection.voltage;

    let loadPercentage = null;
    if (ratedAmps && measuredAmps) {
        loadPercentage = (measuredAmps / ratedAmps) * 100;
    }

    let voltageDeviation = null;
    if (ratedVolts && measuredVolts) {
        voltageDeviation = ((measuredVolts - ratedVolts) / ratedVolts) * 100;
    }

    return { ratedAmps, ratedVolts, measuredAmps, measuredVolts, loadPercentage, voltageDeviation };
  };

  const renderEfficiencySection = () => {
      const { ratedAmps, ratedVolts, measuredAmps, measuredVolts, loadPercentage, voltageDeviation } = calculateEfficiencyMetrics();
      
      if (ratedAmps === null && ratedVolts === null) return null;

      return (
        <div className="mb-8 print-no-break">
            <h4 className="text-xl font-semibold text-slate-700 mb-3">Efficiency & Load Analysis</h4>
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <div className="overflow-x-auto shadow-sm rounded-lg border border-slate-300">
                        <table className="min-w-full divide-y divide-slate-300 text-sm">
                            <thead className="bg-slate-200">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Parameter</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Rated</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Measured</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-300">
                                <tr>
                                    <td className="px-4 py-2 font-medium text-slate-800">Current</td>
                                    <td className="px-4 py-2 text-slate-700">{ratedAmps !== null ? `${ratedAmps} A` : '-'}</td>
                                    <td className="px-4 py-2 text-slate-700">{measuredAmps !== null ? `${measuredAmps} A` : '-'}</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 font-medium text-slate-800">Voltage</td>
                                    <td className="px-4 py-2 text-slate-700">{ratedVolts !== null ? `${ratedVolts} V` : '-'}</td>
                                    <td className="px-4 py-2 text-slate-700">{measuredVolts !== null ? `${measuredVolts} V` : '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="space-y-3">
                    {loadPercentage !== null && (
                        <div className={`p-3 rounded border ${loadPercentage > 100 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                            <div className="text-sm font-bold uppercase tracking-wide opacity-70">Load Percentage</div>
                            <div className="text-2xl font-bold">{loadPercentage.toFixed(1)}%</div>
                            <div className="text-xs mt-1">{loadPercentage > 100 ? 'OVERLOADED' : 'Normal'}</div>
                        </div>
                    )}
                    {voltageDeviation !== null && (
                        <div className={`p-3 rounded border ${Math.abs(voltageDeviation) > 5 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                            <div className="text-sm font-bold uppercase tracking-wide opacity-70">Voltage Deviation</div>
                            <div className="text-2xl font-bold">{voltageDeviation > 0 ? '+' : ''}{voltageDeviation.toFixed(1)}%</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  };

  const renderScannerDataTable = (title: string, data: NameplateData[] | null | undefined) => {
    if (!data || data.length === 0) return null;
    return (
      <div className="mb-8 print-no-break">
          <h4 className="text-xl font-semibold text-slate-700 mb-3">{title}</h4>
          <div className="overflow-x-auto shadow-md rounded-lg border border-slate-300">
              <table className="min-w-full divide-y divide-slate-300 text-sm">
                  <thead className="bg-slate-200 print:bg-slate-200">
                      <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider w-1/3">Parameter</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider w-2/3">Value</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-300">
                      {data.map((row) => (
                         <tr key={row.id} className="even:bg-slate-50 print:even:bg-slate-100 transition-colors duration-100">
                              <td className="px-4 py-3 whitespace-pre-wrap font-medium text-slate-800">{row.parameter}</td>
                              <td className="px-4 py-3 whitespace-pre-wrap text-slate-700">{row.value}</td>
                          </tr>
                       ))}
                  </tbody>
              </table>
          </div>
      </div>
    );
  };


  const renderAiDerivedDataJSX = () => {
    if (!analysisOutput?.derivedData || analysisOutput.derivedData.length === 0) {
      return (
        <div className="mb-6 print-no-break">
          <h4 className="text-xl font-semibold text-slate-700 mb-2">AI-Derived Data & Calculations</h4>
          <p className="text-sm text-slate-500">No specific data was derived by the AI for this inspection.</p>
        </div>
      );
    }
    
    return (
        <div className="mb-8 print-no-break">
            <h4 className="text-xl font-semibold text-slate-700 mb-3">AI-Derived Data & Calculations</h4>
            <div className="overflow-x-auto shadow-md rounded-lg border border-slate-300">
                <table className="min-w-full divide-y divide-slate-300 text-sm">
                    <thead className="bg-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Parameter</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Value</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-300">
                        {analysisOutput.derivedData.map((item, index) => (
                           <tr key={index} className="hover:bg-slate-50 transition-colors duration-100">
                               <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">{item.parameter}</td>
                               <td className="px-4 py-3 whitespace-pre-wrap text-slate-700">{item.value}</td>
                           </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  const renderAiAnalysisFindingsJSX = () => {
    if (!analysisOutput) return <p className="text-sm text-slate-500">No analysis data available for this section.</p>;

    if (analysisOutput.error && !analysisOutput.findings && !analysisOutput.derivedData) {
      return (
         <div className="my-6 p-4 bg-white rounded-lg print-no-break shadow">
            <h4 className="text-xl font-semibold text-slate-700 mb-3">AI Powered Analysis & Findings</h4>
            <p className="text-orange-600 bg-orange-100 p-3 rounded-md mb-4 text-center text-sm border border-orange-300">
                AI analysis encountered an issue: {analysisOutput.error}
            </p>
            {inspection.rawAnalysisText && (
                <div className="mt-4">
                    <h5 className="text-md font-semibold text-slate-600 mb-1">Raw AI Output (for debugging):</h5>
                    <pre className="bg-slate-100 p-3 rounded-md text-xs whitespace-pre-wrap break-words border border-slate-200">{inspection.rawAnalysisText}</pre>
                </div>
            )}
        </div>
      );
    }

    let findingsDisplayContent = null;
    const consolidatedRecommendations: { finding: string, recommendation: string, priority: string }[] = [];


    if (analysisOutput.findings && analysisOutput.findings.length > 0) {
      const groupedFindings: { [key: string]: ParsedAnalysisFinding[] } = {};
      analysisOutput.findings.forEach(finding => {
        const category = finding.category || 'Uncategorized';
        if (!groupedFindings[category]) groupedFindings[category] = [];
        groupedFindings[category].push(finding);
        if (finding.recommendation && finding.recommendation.trim() !== '' && finding.recommendation.toLowerCase() !== 'monitor' && finding.recommendation.toLowerCase() !== 'no immediate action required.') {
            consolidatedRecommendations.push({
                finding: finding.finding,
                recommendation: finding.recommendation,
                priority: finding.priority || 'N/A'
            });
        }
      });

      findingsDisplayContent = (
        <div className="print-no-break">
          {Object.entries(groupedFindings).map(([category, catFindings]) => (
            <div key={category} className="mb-6 print-no-break">
              <h4 className="text-xl font-semibold text-slate-700 mb-3 capitalize">{category}</h4>
              <div className="overflow-x-auto shadow-md rounded-lg border border-slate-300">
                <table className="min-w-full divide-y divide-slate-300 text-sm">
                  <thead className="bg-slate-200">
                    <tr>
                      <th className="w-1/4 px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Finding</th>
                      <th className="w-2/4 px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Details</th>
                      <th className="w-1/4 px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-300">
                    {catFindings.map((item, index) => (
                      <tr key={index} className={`hover:bg-slate-50 transition-colors duration-100 ${getPriorityCellClass(item.priority)}`}>
                        <td className="px-4 py-3 whitespace-pre-wrap font-medium text-slate-800 break-words">{item.finding}</td>
                        <td className="px-4 py-3 whitespace-pre-wrap text-slate-700 break-words">{item.details}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${getPriorityClass(item.priority)} break-words`}>{item.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      );
    } else if (inspection.rawAnalysisText && !renderAiDerivedDataJSX()) { 
       findingsDisplayContent = (
         <div className="mt-4 print-no-break">
            <h4 className="text-xl font-semibold text-slate-700 mb-2">AI Analysis Output</h4>
            <p className="text-slate-600 mb-1 text-sm">The AI provided the following information, but it could not be fully parsed. Please review the raw output:</p>
            <pre className="bg-slate-100 p-3 rounded-md text-xs whitespace-pre-wrap break-words border border-slate-200">{inspection.rawAnalysisText}</pre>
        </div>
       );
    } else if (!renderAiDerivedDataJSX() && !findingsDisplayContent && !analysisOutput.error) { 
        findingsDisplayContent = <p className="text-slate-500 mt-4 text-sm">No specific AI findings were derived for this inspection.</p>;
    }
    
    return (
      <div className="my-8">
        <h3 className="text-2xl font-bold text-amber-600 mb-6 border-b-2 border-amber-200 pb-2">AI Powered Analysis & Findings</h3>
        {analysisOutput.error && (analysisOutput.findings || analysisOutput.derivedData) && ( 
            <p className="text-orange-600 bg-orange-100 p-3 rounded-md mb-4 text-center text-sm print-no-break border border-orange-300">
            AI analysis partially failed: {analysisOutput.error}. Some data might be missing or incomplete.
            </p>
        )}
        {findingsDisplayContent}

        {consolidatedRecommendations.length > 0 && (
            <div className="mt-8 mb-6 print-no-break">
                <h4 className="text-xl font-semibold text-slate-700 mb-3">Consolidated Recommendations</h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                    {consolidatedRecommendations.sort((a,b) => { // Sort by priority
                        const priorities = { 'high': 1, 'medium': 2, 'low': 3 };
                        return (priorities[a.priority.toLowerCase() as keyof typeof priorities] || 4) - 
                               (priorities[b.priority.toLowerCase() as keyof typeof priorities] || 4);
                    }).map((rec, index) => (
                        <div key={`rec-${index}`} className="text-sm">
                            <strong className={`mr-1 ${getPriorityClass(rec.priority)}`}>({rec.priority}) {rec.finding}:</strong>
                            <span className="text-slate-700 ml-1">{rec.recommendation}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {inspection.rawAnalysisText && (renderAiDerivedDataJSX() || findingsDisplayContent) && (
             <div className="mt-8 pt-4 border-t border-slate-300 print-no-break">
                <details className="text-sm">
                    <summary className="text-slate-500 cursor-pointer hover:text-slate-700 font-medium print-hidden">View Full Raw AI Output</summary>
                    <div className="print-raw-output"> 
                        <h5 className="text-md font-semibold text-slate-600 mb-1 mt-2">Raw AI Output:</h5>
                        <pre className="mt-1 bg-slate-100 p-3 rounded-md text-xs whitespace-pre-wrap break-words border border-slate-200">{inspection.rawAnalysisText}</pre>
                    </div>
                </details>
            </div>
        )}
        {analysisOutput.groundingChunks && analysisOutput.groundingChunks.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-300 print-no-break print-hidden"> {/* Typically hidden in print unless specifically styled */}
                <h4 className="text-md font-semibold text-slate-700 mb-2">Information Sources (from AI Grounding)</h4>
                <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                {analysisOutput.groundingChunks.map((chunk, index) => (
                    chunk.web?.uri && (
                    <li key={index}>
                        <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-800 hover:underline">
                        {chunk.web.title || chunk.web.uri}
                        </a>
                    </li>
                    )
                ))}
                </ul>
            </div>
        )}
         {inspection.inspectionStatus === 'pending-analysis' && !analysisOutput && (
          <p className="text-yellow-700 bg-yellow-100 p-3 rounded-md text-sm text-center mt-4 border border-yellow-300">Analysis is pending and will be processed when online.</p>
        )}
        {inspection.inspectionStatus === 'analysis-error' && inspection.analysisError && !analysisOutput?.error && ( 
           <p className="text-red-700 bg-red-100 p-3 rounded-md text-sm text-center mt-4 border border-red-300">Analysis failed: {inspection.analysisError}</p>
        )}
      </div>
    );
  };

  return (
      <section id={sectionId} className="report-content-section pt-8"> {/* Ensure pt-8 is desired or from parent */}
        <div className="mb-8 p-6 border border-slate-300 rounded-xl bg-amber-50 print-no-break shadow-lg">
          <h3 className="text-2xl font-bold text-amber-700 mb-1">SECTION {sectionNumber}: {inspection.location}</h3>
          <p className="text-lg text-slate-600 mb-4">{inspection.machineDetails}</p>
          <hr className="my-3 border-amber-200"/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-700">
            <div><strong className="font-semibold text-slate-800">Client:</strong> {inspection.clientName}</div>
            <div><strong className="font-semibold text-slate-800">Inspection Date:</strong> {new Date(inspection.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            {inspection.jobIdReference && <div><strong className="font-semibold text-slate-800">Job ID:</strong> {inspection.jobIdReference}</div>}
            <div><strong className="font-semibold text-slate-800">Site Engineer:</strong> {currentUserEmail}</div>
            <div className="md:col-span-2"><strong className="font-semibold text-slate-800">Status:</strong> 
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold
                ${inspection.inspectionStatus === 'analyzed' ? 'bg-green-100 text-green-800 border border-green-300' :
                  inspection.inspectionStatus === 'pending-analysis' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                  inspection.inspectionStatus === 'draft' ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                  'bg-red-100 text-red-800 border border-red-300'}`}>
                {inspection.inspectionStatus.replace('-', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {(inspection.irImageBase64 || inspection.dsImageBase64) && (
          <div className="mb-8 print-no-break">
            <h4 className="text-xl font-semibold text-slate-700 mb-3">Thermal Images</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-image-container">
               {inspection.irImageBase64 && (
                <div className="text-center bg-slate-50 p-4 rounded-lg border border-slate-200 shadow">
                    <h5 className="text-md font-semibold text-slate-600 mb-2">Infrared (IR) Image</h5>
                    <img src={`data:image/png;base64,${inspection.irImageBase64}`} alt="Infrared" className="max-w-full h-auto rounded-md border border-slate-300 mx-auto print-image" style={{maxHeight: '350px'}}/>
                    {inspection.irImageTimestamp && (
                        <p className="text-xs text-slate-500 mt-2">
                            Taken: {new Date(inspection.irImageTimestamp).toLocaleString()}
                        </p>
                    )}
                </div>
               )}
               {inspection.dsImageBase64 && (
                <div className="text-center bg-slate-50 p-4 rounded-lg border border-slate-200 shadow">
                    <h5 className="text-md font-semibold text-slate-600 mb-2">Digital Still (DS) Image</h5>
                    <img src={`data:image/png;base64,${inspection.dsImageBase64}`} alt="Digital Still" className="max-w-full h-auto rounded-md border border-slate-300 mx-auto print-image" style={{maxHeight: '350px'}}/>
                    {inspection.dsImageTimestamp && (
                        <p className="text-xs text-slate-500 mt-2">
                            Taken: {new Date(inspection.dsImageTimestamp).toLocaleString()}
                        </p>
                    )}
                </div>
               )}
            </div>
          </div>
        )}

        {inspection.technicianNotes && (
          <div className="mb-8 print-no-break">
            <h4 className="text-xl font-semibold text-slate-700 mb-2">Site Engineer Notes & Observations</h4>
            <div className="text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm shadow">{inspection.technicianNotes}</div>
          </div>
        )}

        {inspection.adminNotes && (
          <div className="mb-8 print-no-break">
            <h4 className="text-xl font-semibold text-purple-700 mb-2">Expert Review &amp; Comments</h4>
            <div className="text-slate-800 whitespace-pre-wrap bg-purple-50 p-4 rounded-lg border border-purple-200 text-sm shadow-md">{inspection.adminNotes}</div>
          </div>
        )}
        
        {renderAiDerivedDataJSX()}
        {renderEfficiencySection()}
        {renderAiAnalysisFindingsJSX()}

        {renderScannerDataTable("Extracted Nameplate Data", inspection.nameplateData)}
        {renderScannerDataTable("Extracted Meter Readings", inspection.meterData)}

      </section>
    );
};

export default ReportLocationSection;
