import React from 'react';
import { InspectionRecord } from '../types';

interface EntechReportTemplateProps {
  inspection: InspectionRecord;
}

const EntechReportTemplate: React.FC<EntechReportTemplateProps> = ({ inspection }) => {
  const analysisOutput = inspection.analysisOutput;
  const derivedData = analysisOutput?.derivedData || [];

  let calculatedAmbientTemp = inspection.ambientTemp;
  if (calculatedAmbientTemp === null || calculatedAmbientTemp === undefined) {
      const minScaleData = derivedData.find(d => /min/i.test(d.parameter) && /scale/i.test(d.parameter));
      if (minScaleData) {
          const val = parseFloat(minScaleData.value);
          if (!isNaN(val)) calculatedAmbientTemp = Math.round(val);
      } else {
          const minTempData = derivedData.find(d => /min/i.test(d.parameter) && /temp/i.test(d.parameter));
          if (minTempData) {
              const val = parseFloat(minTempData.value);
              if (!isNaN(val)) calculatedAmbientTemp = Math.round(val);
          }
      }
  }

  // Parse measurements (Sp1, Sp2, Bx1, etc.)
  const measurements = derivedData.filter(d => 
    /^(Sp\d*|Bx\d*|El\d*|Dt\d*|Delta\s*T|Temp|Spot|Point|Area|Box|Line|Max|Min|Avg)/i.test(d.parameter)
  );
  
  // Try to find specific delta T
  const deltaT = measurements.find(m => /Dt1|Delta T/i.test(m.parameter))?.value || 'N/A';

  const dateOfStudy = new Date(inspection.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).replace(/\//g, '-');

  return (
    <div className="bg-white p-6 print:p-0 max-w-4xl mx-auto shadow-sm flex flex-col relative box-border" style={{ pageBreakInside: 'avoid' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '24pt', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
          EN<span style={{ color: '#f97316' }}>TECH</span> SYSTEMS
        </h1>
      </div>

      {/* Summary Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '9pt' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px', fontWeight: 'bold', width: '33%' }}>Date of Study</td>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px' }}>{dateOfStudy}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px', fontWeight: 'bold' }}>Location</td>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px' }}>{inspection.clientName}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px', fontWeight: 'bold' }}>Floor Name</td>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px' }}>{inspection.location}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px', fontWeight: 'bold' }}>Panel Details</td>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px' }}>{inspection.component || '-'}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px', fontWeight: 'bold' }}>Equipment details</td>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px' }}>{inspection.machineDetails || '-'}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px', fontWeight: 'bold' }}>Image No</td>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px' }}>{inspection.jobIdReference || inspection.id.slice(0, 4)}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px', fontWeight: 'bold' }}>Ambient Temperature</td>
            <td style={{ border: '1px solid #0f172a', padding: '2px 4px' }}>{calculatedAmbientTemp !== null && calculatedAmbientTemp !== undefined ? `${calculatedAmbientTemp} °C` : '-'}</td>
          </tr>
        </tbody>
      </table>

      {/* Images Section using Table for MS Word Support */}
      <table style={{ width: '100%', border: 'none', marginBottom: '8px' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', border: 'none', padding: '4px', verticalAlign: 'top', textAlign: 'center' }}>
              {inspection.irImageBase64 ? (
                <img src={`data:image/jpeg;base64,${inspection.irImageBase64}`} alt="IR Image" width="260" style={{ maxWidth: '100%', height: 'auto', maxHeight: '180px', objectFit: 'contain' }} />
              ) : (
                <div style={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#9ca3af', fontSize: '9pt' }}>No IR Image</span>
                </div>
              )}
            </td>
            <td style={{ width: '50%', border: 'none', padding: '4px', verticalAlign: 'top', textAlign: 'center' }}>
              {inspection.dsImageBase64 ? (
                <img src={`data:image/jpeg;base64,${inspection.dsImageBase64}`} alt="Digital Image" width="260" style={{ maxWidth: '100%', height: 'auto', maxHeight: '180px', objectFit: 'contain' }} />
              ) : (
                <div style={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#9ca3af', fontSize: '9pt' }}>No Digital Image</span>
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Measurements */}
      <div style={{ marginBottom: '8px' }}>
        <h3 style={{ fontSize: '10pt', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', marginTop: 0 }}>Measurements:</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #0f172a', padding: '2px', width: '33%' }}>Image Point</th>
              <th style={{ border: '1px solid #0f172a', padding: '2px', width: '33%' }}>Image Point Temperature</th>
              <th style={{ border: '1px solid #0f172a', padding: '2px', width: '33%' }}>Image Point Temperature Difference with Ambient</th>
            </tr>
          </thead>
          <tbody>
            {measurements.length > 0 ? measurements.map((m, idx) => {
              const tempMatch = m.value.match(/[\d.]+/);
              const temp = tempMatch ? parseFloat(tempMatch[0]) : null;
              let diff = '-';
              if (temp !== null && calculatedAmbientTemp !== null && calculatedAmbientTemp !== undefined) {
                diff = (temp - calculatedAmbientTemp).toFixed(1);
              }
              return (
                <tr key={idx}>
                  <td style={{ border: '1px solid #0f172a', padding: '2px' }}>{m.parameter}</td>
                  <td style={{ border: '1px solid #0f172a', padding: '2px' }}>{m.value}</td>
                  <td style={{ border: '1px solid #0f172a', padding: '2px' }}>{diff}</td>
                </tr>
              );
            }) : (
              <tr>
                <td style={{ border: '1px solid #0f172a', padding: '2px' }}>-</td>
                <td style={{ border: '1px solid #0f172a', padding: '2px' }}>-</td>
                <td style={{ border: '1px solid #0f172a', padding: '2px' }}>-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Analysis and Recommended Action */}
      <div style={{ marginBottom: '8px' }}>
        <h3 style={{ fontSize: '10pt', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', marginTop: 0 }}>Analysis and Recommended Action:</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #0f172a', padding: '2px 4px', fontWeight: 'bold', width: '33%' }}>Fault and Cause</td>
              <td style={{ border: '1px solid #0f172a', padding: '2px 4px' }}>
                {inspection.problemRootCause || inspection.problemAnomaly || '-'}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #0f172a', padding: '2px 4px', fontWeight: 'bold' }}>Recommendation</td>
              <td style={{ border: '1px solid #0f172a', padding: '2px 4px' }}>
                {inspection.problemRemedial || '-'}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #0f172a', padding: '2px 4px', fontWeight: 'bold' }}>Repair Priority Code-</td>
              <td style={{ border: '1px solid #0f172a', padding: '2px 4px', fontWeight: 'bold', ...getPriorityStyle(inspection.operationPriority), WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                {getPriorityCode(inspection.operationPriority)}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #0f172a', padding: '2px 4px', fontWeight: 'bold' }}>Delta T (Dt1)</td>
              <td style={{ border: '1px solid #0f172a', padding: '2px 4px' }}>{deltaT}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Address */}
      <div style={{ textAlign: 'center', fontSize: '8pt', color: '#6b7280', paddingTop: '4px' }}>
        A-3/C-67, Ravi Park, Jagtap Nagar, Wanowrie, Pune 411040. Mobile no 09822964552
      </div>
    </div>
  );
};

function getPriorityCode(priority?: string): string {
  if (!priority) return '-';
  const p = priority.toLowerCase();
  if (p.includes('critical') || p.includes('high')) return 'D';
  if (p.includes('medium')) return 'C'; 
  if (p.includes('low')) return 'A';
  return priority; // Fallback
}

function getPriorityStyle(priority?: string): React.CSSProperties {
    if (!priority) return {};
    const p = priority.toLowerCase();
    if (p.includes('critical') || p.includes('high') || p === 'd') return { backgroundColor: '#dc2626', color: 'white' };
    if (p.includes('medium') || p === 'c') return { backgroundColor: '#facc15', color: 'black' };
    if (p.includes('low') || p === 'a') return { backgroundColor: '#16a34a', color: 'white' };
    return {};
}

export default EntechReportTemplate;

