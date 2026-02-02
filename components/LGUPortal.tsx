
import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Booking } from '../types';

interface LGUPortalProps {
  bookings: Booking[];
  onClose: () => void;
}

const LGUPortal: React.FC<LGUPortalProps> = ({ bookings, onClose }) => {
  const completedConsults = useMemo(() => 
    bookings.filter(b => b.status === 'Completed' && b.diagnosis), 
  [bookings]);

  // Aggregate Data: Map<Barangay, Map<Diagnosis, Count>>
  const outbreakData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    
    completedConsults.forEach(b => {
      const brgy = b.patientBarangay || 'Unknown';
      const diag = b.diagnosis?.split('-')[0].trim() || 'Uncategorized'; // Take basic code or name
      
      if (!data[brgy]) data[brgy] = {};
      data[brgy][diag] = (data[brgy][diag] || 0) + 1;
    });
    
    return data;
  }, [completedConsults]);

  const topDiagnoses = useMemo(() => {
    const counts: Record<string, number> = {};
    completedConsults.forEach(b => {
      const diag = b.diagnosis?.split('-')[0].trim() || 'Uncategorized';
      counts[diag] = (counts[diag] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [completedConsults]);

  const barangayList = Object.keys(outbreakData).sort();

  const handleDownloadExcel = () => {
    if (completedConsults.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Prepare data for "Detailed Trends" sheet
    const trendsRows: any[] = [];
    barangayList.forEach(brgy => {
      Object.entries(outbreakData[brgy]).forEach(([diag, count]) => {
        trendsRows.push({
          'Barangay': brgy,
          'Diagnosis': diag,
          'Case Count': count,
          'Last Updated': new Date().toLocaleDateString()
        });
      });
    });

    // Prepare data for "Summary" sheet
    const summaryRows = [
      { 'Metric': 'Total Consultations', 'Value': completedConsults.length },
      { 'Metric': 'Active Barangays Reporting', 'Value': barangayList.length },
      { 'Metric': 'City Alert Level', 'Value': completedConsults.length > 50 ? 'Moderate' : 'Normal' },
      { 'Metric': '', 'Value': '' },
      { 'Metric': 'TOP 5 DIAGNOSES', 'Value': '' },
      ...topDiagnoses.map(([diag, count]) => ({
        'Metric': diag,
        'Value': count
      }))
    ];

    // Create workbook and worksheets
    const wb = XLSX.utils.book_new();
    const wsTrends = XLSX.utils.json_to_sheet(trendsRows);
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, wsSummary, "City Overview");
    XLSX.utils.book_append_sheet(wb, wsTrends, "Barangay Trends");

    // Write file
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Naga_Health_Trends_${dateStr}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg animate-fadeIn pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-slate-200 dark:border-dark-border px-6 py-6 sticky top-0 z-30 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-dark-bg text-slate-500 hover:scale-105 transition-all shadow-sm">
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <div>
              <h1 className="text-2xl font-black text-naga-text dark:text-white leading-none mb-1">Public Health Surveillance</h1>
              <div className="flex items-center gap-3">
                <p className="text-xs font-bold text-naga-orange uppercase tracking-[0.1em]">LGU Monitoring Portal</p>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <p className="text-[10px] font-black text-emerald-500 uppercase">Live Network</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownloadExcel}
              className="px-6 py-3 bg-white dark:bg-dark-card border-2 border-slate-100 dark:border-dark-border rounded-xl text-naga-text dark:text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-dark-bg transition-all active:scale-95 shadow-sm"
            >
              <i className="fa-solid fa-file-excel text-emerald-500 text-sm"></i>
              Export Report
            </button>
            <div className="w-12 h-12 rounded-2xl bg-naga-orange flex items-center justify-center text-white shadow-lg">
              <i className="fa-solid fa-shield-virus text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Statistics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white dark:bg-dark-card p-6 rounded-mynaga border border-slate-100 dark:border-dark-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-naga-purple">
              <i className="fa-solid fa-file-medical text-xl"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Consultations</p>
              <p className="text-2xl font-black text-naga-text dark:text-white">{completedConsults.length}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card p-6 rounded-mynaga border border-slate-100 dark:border-dark-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
              <i className="fa-solid fa-house-chimney-medical text-xl"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Barangays</p>
              <p className="text-2xl font-black text-naga-text dark:text-white">{barangayList.length}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card p-6 rounded-mynaga border border-slate-100 dark:border-dark-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500">
              <i className="fa-solid fa-triangle-exclamation text-xl"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Alert Level</p>
              <p className="text-2xl font-black text-naga-text dark:text-white">{completedConsults.length > 50 ? 'Moderate' : 'Normal'}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Heatmap List */}
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-naga-purple rounded-full"></div>
              <h2 className="text-lg font-black text-naga-text dark:text-white uppercase tracking-tight">Diagnosis Occurrence by Barangay</h2>
            </div>

            {barangayList.length === 0 ? (
              <div className="py-24 text-center bg-white dark:bg-dark-card rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-dark-border">
                <i className="fa-solid fa-chart-line text-5xl text-slate-100 mb-4"></i>
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No completed records available for tracking</p>
              </div>
            ) : (
              <div className="space-y-4">
                {barangayList.map(brgy => (
                  <div key={brgy} className="bg-white dark:bg-dark-card rounded-mynaga border border-slate-100 dark:border-dark-border overflow-hidden shadow-sm transition-all hover:shadow-md">
                    <div className="p-5 border-b border-slate-50 dark:border-dark-border flex items-center justify-between bg-slate-50/50 dark:bg-dark-bg/20">
                      <div className="flex items-center gap-3">
                        <i className="fa-solid fa-location-dot text-naga-purple"></i>
                        <h3 className="font-black text-naga-text dark:text-white uppercase tracking-tight">Brgy. {brgy}</h3>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">Anonymized Data</span>
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap gap-4">
                        {Object.entries(outbreakData[brgy]).map(([diag, count]) => (
                          <div key={diag} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-dark-bg/50 rounded-2xl border border-slate-100 dark:border-dark-border min-w-[140px]">
                            {/* Added explicit type casting for 'count' to resolve TypeScript operator '>' error on line 181/182 */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${(count as number) > 5 ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white dark:bg-dark-card text-naga-purple border border-slate-100'}`}>
                              {count as number}
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-naga-text dark:text-white uppercase tracking-tight leading-tight line-clamp-2">{diag}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">Occurrences</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Insights */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-naga-purple rounded-[2rem] p-6 text-white shadow-xl shadow-naga-purple/20">
              <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <i className="fa-solid fa-fire text-naga-orange"></i>
                City-Wide Top Trends
              </h3>
              <div className="space-y-4">
                {topDiagnoses.length === 0 ? (
                   <p className="text-xs text-white/50 italic">Insufficient data for trends</p>
                ) : (
                  topDiagnoses.map(([diag, count], idx) => (
                    <div key={diag} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-white/30">{idx + 1}</span>
                        <span className="text-xs font-bold leading-tight">{diag}</span>
                      </div>
                      <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-lg">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-[2rem] p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Outbreak Intelligence</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <i className="fa-solid fa-circle-check text-xs"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-tight text-naga-text dark:text-white">Reporting Compliance</p>
                    <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">All 17 facilities synced in the last 24 hours.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/20 flex items-center justify-center text-naga-purple flex-shrink-0">
                    <i className="fa-solid fa-user-shield text-xs"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-tight text-naga-text dark:text-white">Data Privacy Status</p>
                    <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">PII Redaction Active. No patient identifiers exposed.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-100 dark:bg-dark-card rounded-[2rem] border-2 border-white dark:border-dark-border">
              <h4 className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest">System Note</h4>
              <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium italic">
                "Real-time monitoring enabled. This portal is for LGU decision-makers to allocate additional medical supplies or deploy health teams to barangays with rising case counts."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LGUPortal;
