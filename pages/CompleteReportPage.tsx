
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { InspectionRecord, ParsedAnalysisFinding, NameplateData } from '../types';
import ReportLocationSection from '../components/ReportLocationSection';
import LoadingSpinner from '../components/LoadingSpinner';

const COMPANY_NAME = "NAFA Entech Solutionz"; // For watermark and header/footer

interface ConsolidatedAction {
  recommendation: string;
  priority: string;
  location:string;
  finding: string;
}

interface ConsolidatedEquipmentData {
    location: string;
    type: 'Nameplate' | 'Meter';
    id: string; // From NameplateData, prefixed with inspection ID
    parameter: string;
    value: string;
}


// Define print styles as a string to be injected into the new window
const printStyles = `
  @page {
    size: A4;
    margin: 25mm 15mm 25mm 15mm; /* Top, Right, Bottom, Left margins */
    
    @top-left {
      content: "${COMPANY_NAME}";
      font-size: 8pt;
      color: #666;
      padding-top: 5mm; /* Adjust to not be too close to edge */
    }
    @top-right {
      content: "Thermal Analysis Report - ${COMPANY_NAME}"; /* Client name will be dynamic */
      font-size: 8pt;
      color: #666;
      padding-top: 5mm;
    }
    @bottom-left {
      content: "Confidential - ${COMPANY_NAME}";
      font-size: 8pt;
      color: #666;
      padding-bottom: 5mm;
    }
    @bottom-right {
      content: "Page " counter(page);
      font-size: 8pt;
      color: #666;
      padding-bottom: 5mm;
    }
  }
  /* Remove @page rules for the first page (cover) */
  @page :first {
    margin: 0; /* Full bleed for cover */
    @top-left { content: ""; }
    @top-right { content: ""; }
    @bottom-left { content: ""; }
    @bottom-right { content: ""; }
  }

  body { 
    margin: 0; 
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; /* Professional print font */
    font-size: 10pt; 
    color: #2d2d2d;
    -webkit-print-color-adjust: exact !important; 
    print-color-adjust: exact !important;
  }
  .printable-report-container { /* This class will be on the main report div in the new window */
    padding: 0 !important; 
    width: 100% !important;
    max-width: 100% !important;
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
  }
  .print-hidden { display: none !important; }
  .print-page-break-before { page-break-before: always !important; }
  .print-page-break-after { page-break-after: always !important; }
  .print-no-break { page-break-inside: avoid !important; }
  
  .report-cover-page {
    height: 100vh; /* Full page for print */
    width: 210mm; /* A4 width */
    height: 297mm; /* A4 height */
    display: flex;
    flex-direction: column;
    justify-content: space-between; /* Pushes elements apart */
    align-items: center;
    text-align: center;
    background-color: #EFF6FF !important; /* blue-50 */
    padding: 20mm;
    box-sizing: border-box;
  }
  .report-cover-page .company-logo-placeholder {
    font-size: 18pt;
    font-weight: bold;
    color: #1E3A8A !important; /* blue-900 */
    align-self: flex-start; /* Logo top left */
  }
   .report-cover-page .cover-main-title {
    font-size: 32pt;
    font-weight: bold;
    color: #1D4ED8 !important; /* blue-800 */
    margin-bottom: 0.5cm;
    line-height: 1.2;
  }
  .report-cover-page .cover-subtitle {
    font-size: 18pt;
    color: #2563EB !important; /* blue-700 */
    margin-bottom: 2cm;
  }
  .report-cover-page .cover-client-details {
    font-size: 14pt;
    color: #424242 !important; /* Dark grey */
    text-align: left;
    margin-bottom: 1cm;
  }
   .report-cover-page .cover-client-details p { margin-bottom: 0.3cm; }
  .report-cover-page .cover-footer-info {
    font-size: 10pt;
    color: #757575 !important; /* Grey */
    align-self: flex-end; /* Footer bottom right */
  }

  .report-watermark { /* Combined watermark class for print */
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-40deg);
    font-size: 72pt; 
    color: rgba(37, 99, 235, 0.06) !important; /* professional blue with low opacity */
    font-weight: bold;
    pointer-events: none;
    z-index: -1000; /* Ensure it's behind everything */
    text-align: center;
    white-space: nowrap;
    width: 150%; /* Ensure coverage */
  }
  
  .report-content-section {
    /* padding-top: 5mm; */
    /* padding-bottom: 5mm; */
  }

  .toc-section, #enhanced-summary-section, .report-location-section-wrapper {
     /* Sections after cover page do not need special height */
  }

  .toc-list a { text-decoration: none; color: #000 !important; }
  .toc-list li { margin-bottom: 0.4rem; font-size: 11pt; }
  
  table { width: 100%; border-collapse: collapse; margin-bottom: 1.2rem; font-size: 9pt; }
  th, td { border: 1px solid #ababab !important; padding: 5px 7px !important; text-align: left; word-break: break-word; }
  thead { background-color: #d8d8d8 !important; } 
  thead th { color: #000 !important; font-weight: bold; }
  
  h1, h2, h3, h4, h5, h6 { margin-top: 1rem; margin-bottom: 0.5rem; color: #000 !important; font-weight: bold; }
  h2 { font-size: 16pt; margin-top: 1.2rem; border-bottom: 1.5px solid #444; padding-bottom: 0.25rem; } /* Major section titles */
  h3 { font-size: 13pt; color: #222 !important; } /* Sub-section titles */
  h4 { font-size: 11pt; font-weight: bold; } /* Table titles or smaller headers */
  
  .text-red-700 { color: #A00000 !important; }
  .text-orange-600 { color: #D04800 !important; }
  .text-green-700 { color: #006800 !important; }
  .font-bold { font-weight: bold !important; }
  .font-semibold { font-weight: 600 !important; }

  .bg-blue-50 { background-color: #EFF6FF !important; }
  .bg-slate-100 { background-color: #EEF2F6 !important; }
  .border { border-width: 1px !important; }
  .border-blue-200 { border-color: #BFDBFE !important; }
  .border-blue-300 { border-color: #93C5FD !important; }
  .rounded-lg { border-radius: 0.3rem !important; }

  .whitespace-pre-wrap { white-space: pre-wrap !important; }
  .break-words { word-break: break-word !important; }

  .print-image-container { display: flex !important; flex-direction: row !important; gap: 0.8rem !important; margin-bottom: 0.8rem; page-break-inside: avoid; }
  .print-image-container > div { flex: 1; }
  .print-image { max-width: 100% !important; height: auto !important; border: 1px solid #bbb; border-radius: 3px; max-height: 250px !important;}
  
  details > summary { display: none; } 
  details[open] .print-raw-output { display: block !important; } 
  details:not([open]) .print-raw-output { display: none !important; }
`;


const CompleteReportPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { allInspections, loading: dataLoading } = useData();

  const [clientName, setClientName] = useState<string | null>(null);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const reportGeneratedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  
  const sectionIds = useMemo(() => {
    if (!inspections.length && clientName) return ['report-cover', 'table-of-contents', 'enhanced-summary-section']; // Basic sections even if no inspections
    if (!inspections.length) return [];
    return [
      'report-cover',
      'table-of-contents',
      'enhanced-summary-section',
      ...inspections.map(inspection => `loc-${inspection.id}`),
    ];
  }, [inspections, clientName]);

  useEffect(() => {
    setLoading(true);
    let clientNameToLoad: string | null = location.state?.clientName || null;
    
    if (!clientNameToLoad) {
        setError("Client name not provided. Cannot generate report.");
        setLoading(false);
        return;
    }
    setClientName(clientNameToLoad);

    if (location.state?.inspections) {
      setInspections(location.state.inspections.sort((a: InspectionRecord, b: InspectionRecord) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      setLoading(false);
      setError(null);
    } else if (!dataLoading) {
      // Fallback to useData if state is not passed
      const clientInspections = allInspections.filter(i => i.clientName === clientNameToLoad);
      setInspections(clientInspections.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      setLoading(false);
      setError(null);
    }

  }, [location.state, allInspections, dataLoading]);


  // Reset currentSectionIndex if the number of sections changes
  useEffect(() => {
    setCurrentSectionIndex(0);
  }, [sectionIds.length]);


  const scrollToSection = (index: number) => {
    if (index >= 0 && index < sectionIds.length) {
      const element = document.getElementById(sectionIds[index]);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setCurrentSectionIndex(index);
      }
    }
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      scrollToSection(currentSectionIndex - 1);
    }
  };

  const handleNextSection = () => {
    if (currentSectionIndex < sectionIds.length - 1) {
      scrollToSection(currentSectionIndex + 1);
    }
  };

  useEffect(() => {
    if (sectionIds.length > 0) {
        const element = document.getElementById(sectionIds[currentSectionIndex]);
        if (element) {
            setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
  }, [sectionIds, currentSectionIndex]);


  const handlePrint = () => {
    if (!reportContainerRef.current) {
      alert("Report content not found. Cannot print.");
      return;
    }

    const reportContentClone = reportContainerRef.current.cloneNode(true) as HTMLElement;
    reportContentClone.querySelectorAll('.print-hidden-explicit').forEach(el => el.remove());
    const contentToPrint = reportContentClone.innerHTML;
    
    const dynamicPrintStyles = printStyles.replace(
      'content: "Thermal Analysis Report - ${COMPANY_NAME}";', 
      `content: "Thermal Analysis Report - ${clientName || 'Client'}";`
    );


    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <meta charset='utf-8'>
            <title>Inspection Report - ${clientName || 'Client'}</title>
            <link href="https://cdn.tailwindcss.com" rel="stylesheet">
            <style>${dynamicPrintStyles}</style>
          </head>
          <body>
            <div class="printable-report-container">
              ${contentToPrint}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 1000);
    } else {
      alert("Could not open print window. Please check your browser's pop-up settings.");
    }
  };


  const handleSaveAsWord = () => {
    if (!reportContainerRef.current) {
      alert("Report content not found. Cannot save as Word.");
      return;
    }
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Inspection Report - ${clientName || 'Client'}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 10pt; margin: 1in; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 10pt; }
          th, td { border: 1px solid black; padding: 4pt; text-align: left; }
          h1, h2, h3, h4, h5, h6 { margin-top: 12pt; margin-bottom: 3pt; color: black; }
          .print-hidden-explicit { display: none; }
        </style>
      </head>
      <body>`;
    
    const footer = "</body></html>";
    const reportContentClone = reportContainerRef.current.cloneNode(true) as HTMLElement;
    
    reportContentClone.querySelectorAll('.print-hidden-explicit').forEach(el => el.remove());
    reportContentClone.querySelectorAll('.report-watermark').forEach(el => el.remove());

    const sourceHTML = header + reportContentClone.innerHTML + footer;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `Inspection_Report_${clientName?.replace(/\s+/g, '_') || 'Client'}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    alert("Experimental 'Save as Word' initiated. Formatting may vary. For best results, use 'Print / Save as PDF'.");
  };

  const overallPriorities = useMemo(() => {
    const summary: { [key: string]: number } = { high: 0, medium: 0, low: 0, other: 0 };
    inspections.forEach(inspection => {
      inspection.analysisOutput?.findings?.forEach(finding => {
        const priority = finding.priority?.toLowerCase();
        if (priority === 'high') summary.high++;
        else if (priority === 'medium') summary.medium++;
        else if (priority === 'low') summary.low++;
        else summary.other++;
      });
    });
    return summary;
  }, [inspections]);
  
  const consolidatedActionableItems = useMemo((): ConsolidatedAction[] => {
    const items: ConsolidatedAction[] = [];
    inspections.forEach(inspection => {
        inspection.analysisOutput?.findings?.forEach(finding => {
            if (finding.recommendation && finding.recommendation.trim() !== '' && finding.recommendation.toLowerCase() !== 'monitor' && finding.recommendation.toLowerCase() !== 'no immediate action required.') {
                items.push({
                    location: `${inspection.location} - ${inspection.machineDetails}`,
                    finding: finding.finding,
                    recommendation: finding.recommendation,
                    priority: finding.priority || 'N/A'
                });
            }
        });
    });
    const priorities = { 'high': 1, 'medium': 2, 'low': 3 };
    return items.sort((a,b) => {
        const priorityA = priorities[a.priority.toLowerCase() as keyof typeof priorities] || 4;
        const priorityB = priorities[b.priority.toLowerCase() as keyof typeof priorities] || 4;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.location.localeCompare(b.location);
    });
  }, [inspections]);

  const consolidatedEquipmentData = useMemo((): ConsolidatedEquipmentData[] => {
    const items: ConsolidatedEquipmentData[] = [];
    inspections.forEach(inspection => {
      if (inspection.nameplateData && inspection.nameplateData.length > 0) {
        inspection.nameplateData.forEach(row => {
          if(row.parameter || row.value) {
            items.push({
                location: `${inspection.location} - ${inspection.machineDetails}`,
                type: 'Nameplate',
                id: `${inspection.id}-np-${row.id}`,
                parameter: row.parameter,
                value: row.value,
            });
          }
        });
      }
      if (inspection.meterData && inspection.meterData.length > 0) {
        inspection.meterData.forEach(row => {
            if(row.parameter || row.value) {
                items.push({
                    location: `${inspection.location} - ${inspection.machineDetails}`,
                    type: 'Meter',
                    id: `${inspection.id}-m-${row.id}`,
                    parameter: row.parameter,
                    value: row.value,
                });
            }
        });
      }
    });
    return items;
  }, [inspections]);

  const ReportCoverPage = () => (
    <section id="report-cover" className="report-cover-page print-no-break bg-blue-50 dark:bg-gray-900/20 text-slate-800 dark:text-white">
        <div className="company-logo-placeholder !text-[#1E3A8A] dark:!text-blue-200">{COMPANY_NAME}</div>
        <div className="cover-content">
            <h1 className="cover-main-title !text-[#1D4ED8] dark:!text-blue-300">Thermal Analysis Report</h1>
            <h2 className="cover-subtitle !text-[#2563EB] dark:!text-blue-400">Prepared for: {clientName || "Valued Client"}</h2>
            <div className="cover-client-details !text-slate-700 dark:!text-gray-300">
                <p><strong>Client:</strong> {clientName || "N/A"}</p>
                <p><strong>Date of Report:</strong> {reportGeneratedDate}</p>
                <p><strong>Prepared by:</strong> {currentUser?.email || COMPANY_NAME}</p>
            </div>
        </div>
        <div className="cover-footer-info !text-slate-500 dark:!text-gray-400">
            Report Generated by {COMPANY_NAME} 
            <br/>
            © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
        </div>
    </section>
  );

  const TableOfContents = () => (
    <section id="table-of-contents" className="toc-section print-page-break-before py-12 px-8 bg-white dark:bg-gray-950">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 border-b-2 border-slate-300 dark:border-gray-700 pb-2">Table of Contents</h2>
      <ol className="list-decimal pl-5 space-y-2 toc-list">
        <li>
          <a href="#enhanced-summary-section" onClick={(e) => { e.preventDefault(); scrollToSection(sectionIds.indexOf('enhanced-summary-section')); }} className="text-slate-800 dark:text-white hover:text-[#2563EB] dark:hover:text-blue-400">
            Overall Summary & Actionable Items
          </a>
        </li>
        {inspections.map((inspection, index) => (
          <li key={inspection.id}>
            <a href={`#loc-${inspection.id}`} onClick={(e) => { e.preventDefault(); scrollToSection(sectionIds.indexOf(`loc-${inspection.id}`)); }} className="text-slate-800 dark:text-white hover:text-[#2563EB] dark:hover:text-blue-400">
              Section {index + 1}: {inspection.location} - {inspection.machineDetails}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
  
  const PriorityBadge: React.FC<{priority: string}> = ({priority}) => {
    let colorClass = 'bg-slate-200 text-slate-700 dark:bg-gray-600 dark:text-gray-200';
    if (priority.toLowerCase() === 'high') colorClass = 'bg-red-100 text-[#DC2626] dark:bg-red-900/50 dark:text-red-300 print:bg-red-100 print:text-red-700';
    else if (priority.toLowerCase() === 'medium') colorClass = 'bg-amber-100 text-[#D97706] dark:bg-orange-900/50 dark:text-orange-300 print:bg-orange-100 print:text-orange-700';
    else if (priority.toLowerCase() === 'low') colorClass = 'bg-green-100 text-[#059669] dark:bg-green-900/50 dark:text-green-300 print:bg-green-100 print:text-green-700';
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${colorClass.replace('bg-', 'border-')} ${colorClass}`}>{priority}</span>;
  };

  const EnhancedSummarySection = () => (
    <section id="enhanced-summary-section" className="py-10 px-8 bg-white dark:bg-gray-950 print-page-break-before">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 border-b-2 border-slate-300 dark:border-gray-700 pb-2">Overall Summary for {clientName}</h2>
        
        <div className="mb-8 p-6 bg-blue-50 dark:bg-sky-900/50 rounded-lg shadow-lg border border-blue-200 dark:border-sky-800 print-no-break">
            <h3 className="text-xl font-semibold text-[#1D4ED8] dark:text-sky-300 mb-3">Priority Overview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-red-50 dark:bg-red-900/40 rounded border border-red-200 dark:border-red-800">
                    <div className="text-3xl font-bold text-[#DC2626] dark:text-red-400">{overallPriorities.high}</div>
                    <div className="text-sm text-[#B91C1C] dark:text-red-300">High Priority Findings</div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-orange-900/40 rounded border border-amber-200 dark:border-orange-800">
                    <div className="text-3xl font-bold text-[#D97706] dark:text-orange-400">{overallPriorities.medium}</div>
                    <div className="text-sm text-[#B45309] dark:text-orange-300">Medium Priority Findings</div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/40 rounded border border-green-200 dark:border-green-800">
                    <div className="text-3xl font-bold text-[#059669] dark:text-green-400">{overallPriorities.low}</div>
                    <div className="text-sm text-[#047857] dark:text-green-300">Low Priority Findings</div>
                </div>
            </div>
            {overallPriorities.other > 0 && <p className="text-xs text-slate-500 dark:text-gray-400 mt-2 text-center">{overallPriorities.other} findings with other/unspecified priority.</p>}
        </div>

        {consolidatedActionableItems.length > 0 && (
            <div className="mb-8 print-no-break">
                <h3 className="text-xl font-semibold text-slate-700 dark:text-white mb-4">Consolidated Actionable Recommendations</h3>
                <div className="overflow-x-auto shadow-md rounded-lg border border-slate-300 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-slate-300 dark:divide-gray-700">
                        <thead className="bg-slate-200 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-gray-300 uppercase">Priority</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-gray-300 uppercase">Location - Equipment</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-gray-300 uppercase">Finding</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-gray-300 uppercase">Recommendation</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-950 divide-y divide-slate-300 dark:divide-gray-700">
                            {consolidatedActionableItems.map((item, index) => (
                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-gray-800/50">
                                    <td className="px-4 py-3 whitespace-nowrap"><PriorityBadge priority={item.priority} /></td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300">{item.location}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300">{item.finding}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300 whitespace-pre-wrap">{item.recommendation}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        
        {consolidatedEquipmentData.length > 0 && (
        <div className="mb-8 print-no-break">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-white mb-4">Consolidated Equipment Data</h3>
            <div className="overflow-x-auto shadow-md rounded-lg border border-slate-300 dark:border-gray-700">
                <table className="min-w-full divide-y divide-slate-300 dark:divide-gray-700">
                    <thead className="bg-slate-200 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-gray-300 uppercase">Location - Equipment</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-gray-300 uppercase">Data Type</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-gray-300 uppercase">Parameter</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-gray-300 uppercase">Value</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-950 divide-y divide-slate-300 dark:divide-gray-700">
                        {consolidatedEquipmentData.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/50">
                                <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300">{item.location}</td>
                                <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300">{item.type}</td>
                                <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300">{item.parameter}</td>
                                <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300 whitespace-pre-wrap">{item.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        )}

        <p className="text-xs text-slate-500 dark:text-gray-400 mt-6">
            Note: This summary provides a high-level overview. Please refer to the detailed sections for each inspection location for complete findings, images, and context.
        </p>
    </section>
);


  if (loading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-120px)]"><LoadingSpinner text="Generating complete report..." size="lg" /></div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded-md shadow-md">{error}</div>;
  }

  if (!inspections.length && clientName) {
     return (
        <div className="container mx-auto p-4 md:p-8 text-center">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">Complete Report for {clientName}</h1>
            <p className="text-slate-600 dark:text-gray-300 bg-yellow-100 dark:bg-yellow-900/50 p-4 rounded-md shadow">No inspection records found for this client to include in the report.</p>
            <button 
                onClick={() => navigate('/client-reports')}
                className="mt-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-2 px-4 rounded-lg shadow"
            >
                Back to Client Summaries
            </button>
        </div>
    );
  }


  return (
    <>
      {/* Navigation and Action Bar - Hidden in Print */}
      <div className="sticky top-[64px] bg-blue-100 dark:bg-gray-900 p-3 shadow-md z-40 flex flex-col sm:flex-row justify-between items-center print-hidden print-hidden-explicit">
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <button
            onClick={handlePreviousSection}
            disabled={currentSectionIndex === 0}
            className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-md shadow disabled:opacity-50"
          >
            &larr; Previous Section
          </button>
          <span className="text-xs text-blue-800 dark:text-sky-200 font-medium">
             Section {currentSectionIndex + 1} of {sectionIds.length}: {sectionIds[currentSectionIndex]?.replace('loc-', '').replace('report-cover', 'Cover Page').replace('table-of-contents', 'Table of Contents').replace('enhanced-summary-section', 'Overall Summary')}
          </span>
          <button
            onClick={handleNextSection}
            disabled={currentSectionIndex === sectionIds.length - 1}
            className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-md shadow disabled:opacity-50"
          >
            Next Section &rarr;
          </button>
        </div>
        <div className="flex items-center space-x-2">
           <button
            onClick={() => navigate('/client-reports')}
            className="px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white text-xs font-semibold rounded-md shadow"
            >
            Back to Client Selection
            </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold rounded-md shadow"
          >
            Print / Save as PDF
          </button>
           <button
            onClick={handleSaveAsWord}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow"
            title="Experimental: Save as .doc. Formatting may vary."
          >
            Save as Word (Experimental)
          </button>
        </div>
      </div>

      {/* Main Report Content Area */}
      <div ref={reportContainerRef} className="container mx-auto max-w-4xl p-0 sm:p-2 md:p-4 bg-white dark:bg-black shadow-none sm:shadow-lg report-view-container"> 
        <div className="report-watermark print-hidden-explicit">{COMPANY_NAME}</div>
        
        <ReportCoverPage />

        <TableOfContents />
        
        <EnhancedSummarySection />

        {inspections.map((inspection, index) => (
          <div key={inspection.id} className="report-location-section-wrapper print-page-break-before py-10 px-8 bg-white dark:bg-gray-950">
            <ReportLocationSection
              inspection={inspection}
              currentUserEmail={currentUser?.email || 'N/A'}
              sectionNumber={index + 1}
            />
          </div>
        ))}


        <footer className="text-center p-6 mt-10 border-t border-slate-300 dark:border-gray-700 text-xs text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-950 print-no-break">
            This report was generated by {COMPANY_NAME} on {reportGeneratedDate}.
            <br />
            {COMPANY_NAME} - Confidential
        </footer>
      </div>
    </>
  );
};

export default CompleteReportPage;
