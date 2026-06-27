
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Link, useNavigate } from 'react-router-dom';
import { GoToReportsIcon, ExcelExportIcon, ClientReportsIcon, CloseIcon } from '../Icons';
import { useData } from '../../hooks/useData';
import { InspectionRecord } from '../../types';

const ReportActionCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    actionElement: React.ReactNode;
    color: string;
}> = ({ title, description, icon, actionElement, color }) => (
    <div className={`p-6 rounded-xl shadow-lg flex flex-col h-full ${color}`}>
        <div className="flex items-start text-white mb-3">
            <div className="w-10 h-10 mr-4 shrink-0">{icon}</div>
            <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <p className="text-white/80 text-sm mb-4 flex-grow">{description}</p>
        {actionElement}
    </div>
);

const SampleSelectorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'critical' | 'motor' | 'clean') => void;
}> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-md border border-slate-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Select Sample Scenario</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-white"><CloseIcon /></button>
                </div>
                <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">Choose a scenario to preview how different findings appear in the final report.</p>
                <div className="space-y-3">
                    <button onClick={() => onSelect('critical')} className="w-full p-4 text-left border rounded-lg bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                        <div className="font-bold text-red-800 dark:text-red-400 text-base">Critical Electrical Fault</div>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">Simulates a high-priority connection issue with significant temperature rise.</p>
                    </button>
                    <button onClick={() => onSelect('motor')} className="w-full p-4 text-left border rounded-lg bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                        <div className="font-bold text-orange-800 dark:text-orange-400 text-base">Motor Bearing Overheating</div>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">Simulates a mechanical friction issue detected in motor housing.</p>
                    </button>
                    <button onClick={() => onSelect('clean')} className="w-full p-4 text-left border rounded-lg bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <div className="font-bold text-green-800 dark:text-green-400 text-base">Normal Operation (Baseline)</div>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">Simulates a clean scan with no anomalies detected.</p>
                    </button>
                </div>
            </div>
        </div>
    );
};


const SiteEngineerReportsView: React.FC = () => {
    const { userInspections } = useData();
    const navigate = useNavigate();
    const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);

    const exportToExcel = () => {
        if (userInspections.length === 0) {
            alert("No inspections to export.");
            return;
        }

        const workbook = XLSX.utils.book_new();

        userInspections.forEach((insp, index) => {
            const sheetData: (string | number | null | undefined)[][] = [];
            const merges: XLSX.Range[] = [];
            let currentRow = 0;

            const addSection = (title: string) => {
                sheetData.push([title]);
                merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
                currentRow++;
            };

            const addRow = (label: string, value: any) => {
                sheetData.push([label, value ?? '']);
                currentRow++;
            };
            
            const addSpacer = () => { sheetData.push([]); currentRow++; };

            const addTable = (title: string, headers: string[], data: any[][]) => {
                if (data.length === 0) return;
                addSection(title);
                sheetData.push(headers);
                currentRow++;
                data.forEach(rowData => {
                    sheetData.push(rowData);
                    currentRow++;
                });
                addSpacer();
            };

            addSection("Overview & Equipment Information");
            addRow("Client Name", insp.clientName);
            addRow("Location", insp.location);
            addRow("Component", insp.component);
            addRow("Inspection Date", new Date(insp.createdAt).toLocaleDateString());
            addRow("Status", insp.inspectionStatus);
            addRow("PM Work Order", insp.pmWorkOrder);
            addRow("Item ID", insp.itemId);
            addRow("Operation Priority", insp.operationPriority);
            addRow("Fault Item/Description (AI)", insp.faultItemDescription);
            addSpacer();

            addSection("Problem Details (AI Populated)");
            addRow("Item", insp.problemItem);
            addRow("Type", insp.problemType);
            addRow("Manufacturer", insp.problemManufacturer);
            addRow("Anomaly", insp.problemAnomaly);
            addRow("Root Cause", insp.problemRootCause);
            addRow("Remedial Action", insp.problemRemedial);
            addSpacer();
            
            addSection("Trending Data (User Input)");
            addRow("Ambient Temp (°C)", insp.ambientTemp);
            addRow("Nominal Max Current (A)", insp.nominalMaxCurrent);
            addRow("Measured Current (A)", insp.measuredCurrent);
            addRow("Reference Temp (°C)", insp.referenceTemp);
            addRow("Voltage (V)", insp.voltage);
            addRow("L1 Load (A)", insp.l1Load);
            addRow("L2 Load (A)", insp.l2Load);
            addRow("L3 Load (A)", insp.l3Load);
            addRow("Neutral Load (A)", insp.neutralLoad);
            addRow("Ultrasonic Reading", insp.ultrasonicReading);
            addSpacer();
            
            addTable(
                "AI Derived Data",
                ["Parameter", "Value"],
                insp.analysisOutput?.derivedData?.map(d => [d.parameter, d.value]) || []
            );

            addTable(
                "AI Analysis Findings",
                ["Category", "Finding", "Details", "Priority", "Recommendation"],
                insp.analysisOutput?.findings?.map(f => [f.category, f.finding, f.details, f.priority, f.recommendation]) || []
            );
            
            addTable(
                "Extracted Nameplate Data",
                ["Parameter", "Value"],
                insp.nameplateData?.map(d => [d.parameter, d.value]) || []
            );

            addTable(
                "Extracted Meter Data",
                ["Parameter", "Value"],
                insp.meterData?.map(d => [d.parameter, d.value]) || []
            );

            addRow("Technician Notes", insp.technicianNotes);
            addRow("Admin Notes", insp.adminNotes);

            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
            worksheet['!merges'] = merges;
            worksheet['!cols'] = [ {wch: 25}, {wch: 40}, {wch: 40}, {wch: 15}, {wch: 40} ];

            const boldStyle = { font: { bold: true } };
            const sectionHeaderStyle = { font: { bold: true, sz: 14, color: { rgb: "FFFFFFFF" } }, fill: { fgColor: { rgb: "FF4A5568" } } };
            const tableHeaderStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFE2E8F0" } } };

            sheetData.forEach((row, r) => {
                const cellRef = XLSX.utils.encode_cell({c: 0, r: r});
                if (!worksheet[cellRef]) return;

                if (merges.some(m => m.s.r === r)) {
                    worksheet[cellRef].s = sectionHeaderStyle;
                } else if (r > 0 && merges.some(m => m.s.r === r - 1)) {
                    row.forEach((_, c) => {
                        const headerCellRef = XLSX.utils.encode_cell({c:c, r:r});
                        if (worksheet[headerCellRef]) worksheet[headerCellRef].s = tableHeaderStyle;
                    });
                } else if (row.length === 2) {
                    const labelCellRef = XLSX.utils.encode_cell({c: 0, r: r});
                    if (worksheet[labelCellRef]) worksheet[labelCellRef].s = boldStyle;
                }
            });

            const safeSheetName = `${index + 1}-${insp.location || 'NoLocation'}`.substring(0, 31).replace(/[\\*?:/\[\]]/g, "_");
            XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
        });

        XLSX.writeFile(workbook, "AI-Inspec_Detailed_Report_My_Records.xlsx");
    };

    const handleSelectSample = (type: 'critical' | 'motor' | 'clean') => {
        let sampleInspection: InspectionRecord;
        const base: Partial<InspectionRecord> = {
            id: `sample-${type}-${Date.now()}`,
            clientName: 'Sample Corp',
            pmWorkOrder: 'WO-SAMPLE-001',
            itemId: 'EQ-SAMPLE-01',
            inspectionStatus: 'analyzed',
            createdAt: new Date(),
            updatedAt: new Date(),
            irImageBase64: null, 
            dsImageBase64: null,
            irImageTimestamp: new Date(),
            dsImageTimestamp: new Date(),
            nameplateImageBase64: null,
            nameplateImageTimestamp: null,
            meterImageBase64: null,
            meterImageTimestamp: null,
        };

        if (type === 'critical') {
            sampleInspection = {
                ...base,
                id: 'sample-critical',
                location: 'Main Electrical Room',
                component: 'Main Distribution Panel',
                machineDetails: 'MDP-01, S/N: 99887766',
                operationPriority: 'High',
                ambientTemp: 25,
                nominalMaxCurrent: 100,
                measuredCurrent: 85,
                referenceTemp: 30,
                voltage: 480,
                l1Load: 80,
                l2Load: 85,
                l3Load: 82,
                neutralLoad: 5,
                technicianNotes: 'Visual inspection shows discoloration on Phase B lug. Immediate attention advised.',
                adminNotes: 'Confirmed thermal anomaly. Priority maintenance ticket created.',
                nameplateData: [{id: '1', parameter: 'Rated Voltage', value: '480V'}, {id: '2', parameter: 'Rated Current', value: '100A'}],
                meterData: [{id: '1', parameter: 'Voltage L1-L2', value: '481V'}],
                analysisOutput: {
                    findings: [
                        { category: 'Connection Issues', finding: 'Phase B Lug Overheating', details: 'Significant thermal gradient observed at Phase B lug connection. Temp delta > 40°C.', priority: 'High', recommendation: 'Clean and re-torque connection immediately.' },
                        { category: 'Load Imbalance', finding: 'Minor Load Imbalance', details: 'Phase B carries slightly higher load.', priority: 'Low', recommendation: 'Monitor during next maintenance cycle.' }
                    ],
                    derivedData: [
                        { parameter: 'Max Temperature', value: '105°C' },
                        { parameter: 'Delta T (Phase-to-Phase)', value: '35°C' },
                        { parameter: 'Load %', value: '85%' }
                    ],
                    groundingChunks: []
                }
            } as InspectionRecord;
        } else if (type === 'motor') {
            sampleInspection = {
                ...base,
                id: 'sample-motor',
                location: 'Production Line 1',
                component: 'Conveyor Motor M1',
                machineDetails: 'Siemens 50HP, Frame 254T',
                operationPriority: 'Medium',
                ambientTemp: 22,
                nominalMaxCurrent: 65,
                measuredCurrent: 45,
                referenceTemp: 22,
                voltage: 460,
                technicianNotes: 'Motor casing shows elevated temperature near drive end bearing.',
                nameplateData: [{id: '1', parameter: 'HP', value: '50'}, {id: '2', parameter: 'RPM', value: '1750'}, {id: '3', parameter: 'FLA', value: '65A'}],
                meterData: [],
                analysisOutput: {
                    findings: [
                        { category: 'Mechanical', finding: 'Drive End Bearing Overheating', details: 'Localized hotspot on motor drive end bearing housing.', priority: 'Medium', recommendation: 'Grease bearing and monitor vibration. Plan for replacement if temp rises.' },
                    ],
                    derivedData: [
                        { parameter: 'Housing Temp', value: '75°C' },
                        { parameter: 'Delta T (vs Ambient)', value: '53°C' }
                    ],
                    groundingChunks: []
                }
            } as InspectionRecord;
        } else {
            sampleInspection = {
                ...base,
                id: 'sample-clean',
                location: 'Server Room',
                component: 'UPS Battery Bank',
                machineDetails: 'Bank A - Strings 1-4',
                operationPriority: 'Low',
                ambientTemp: 20,
                nominalMaxCurrent: 200,
                measuredCurrent: 120,
                referenceTemp: 20,
                voltage: 480,
                technicianNotes: 'All scans normal. No thermal anomalies detected.',
                nameplateData: [{id: '1', parameter: 'Capacity', value: '100kVA'}],
                meterData: [],
                analysisOutput: {
                    findings: [
                        { category: 'General', finding: 'Normal Operation', details: 'Thermal patterns consistent with normal operation. No hotspots found.', priority: 'Low', recommendation: 'Continue routine monitoring.' },
                    ],
                    derivedData: [
                        { parameter: 'Max Temp Observed', value: '24°C' },
                    ],
                    groundingChunks: []
                }
            } as InspectionRecord;
        }

        navigate('/complete-report', { state: { clientName: 'Sample Corp', inspections: [sampleInspection] } });
        setIsSampleModalOpen(false);
    };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Reporting Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportActionCard
            title="Client Summary Reports"
            description="Generate consolidated summary reports for specific clients. Includes full analysis, findings, and options to print or save as PDF."
            icon={<GoToReportsIcon />}
            color="bg-green-500 hover:bg-green-600"
            actionElement={
                <Link
                    to="/client-reports"
                    data-tour-id="go-to-client-reports-btn"
                    className="mt-auto block text-center w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-2.5 px-6 rounded-lg shadow transition duration-150 ease-in-out text-base"
                >
                    Open Client Reports
                </Link>
            }
        />
        <ReportActionCard
            title="Sample Reports"
            description="Load sample reports to preview the output format (PDF/Word). Choose from various scenarios like critical faults or healthy systems."
            icon={<ClientReportsIcon className="w-10 h-10" />}
            color="bg-purple-500 hover:bg-purple-600"
            actionElement={
                <button
                    onClick={() => setIsSampleModalOpen(true)}
                    className="mt-auto block w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-2.5 px-6 rounded-lg shadow transition duration-150 ease-in-out text-base"
                >
                    Load Sample Reports
                </button>
            }
        />
        <ReportActionCard
            title="Export My Data to Excel"
            description="Export all of your inspection records into a single, detailed Excel file. Each inspection will be on a separate sheet."
            icon={<ExcelExportIcon />}
            color="bg-teal-500 hover:bg-teal-600"
            actionElement={
                <button
                    onClick={exportToExcel}
                    className="mt-auto block w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-2.5 px-6 rounded-lg shadow transition duration-150 ease-in-out text-base"
                >
                    Export All My Records
                </button>
            }
        />
      </div>
      <SampleSelectorModal 
        isOpen={isSampleModalOpen} 
        onClose={() => setIsSampleModalOpen(false)} 
        onSelect={handleSelectSample} 
      />
    </div>
  );
};

export default SiteEngineerReportsView;
