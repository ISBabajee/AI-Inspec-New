import React from 'react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { GoToReportsIcon, ExcelExportIcon } from '../Icons';
import { useData } from '../../hooks/useData';

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


const SiteEngineerReportsView: React.FC = () => {
    const { userInspections } = useData();

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Reporting Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportActionCard
            title="Client Summary Reports"
            description="Generate consolidated summary reports for specific clients. This includes an overview of all inspections, findings, and their priorities, with an option to create a complete, printable report document."
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
            title="Export My Data to Excel"
            description="Export all of your inspection records into a single, detailed Excel file. Each inspection will be on a separate sheet, containing all captured data, AI analysis, and findings."
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
    </div>
  );
};

export default SiteEngineerReportsView;