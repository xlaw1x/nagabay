
import React, { useState, useEffect } from 'react';
import { Booking, TriageLevel, Facility, PrescribedDrug } from '../types';
import { NAGA_FACILITIES } from '../constants';
import TelemedicineView from './TelemedicineView';

interface ProviderHubProps {
  bookings: Booking[];
  facility: Facility;
  onUpdateBooking: (id: string, status: 'Pending' | 'Approved' | 'Declined' | 'Completed', postData?: Partial<Booking>) => void;
  onUpdateFacility?: (updates: Partial<Facility>) => void;
  onClose: () => void;
  onRefer?: (originalBooking: Booking, targetFacility: Facility, note: string) => void;
  hideHeader?: boolean;
}

const calculateAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Sub-component for the live timer
const ConsultationTimer: React.FC<{ startTime: string }> = ({ startTime }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const update = () => {
      const now = new Date().getTime();
      const diff = now - start;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-naga-purple/10 rounded-md">
      <i className="fa-solid fa-clock-rotate-left text-[8px] text-naga-purple"></i>
      <span className="text-[10px] font-black text-naga-purple font-mono">{elapsed}</span>
    </div>
  );
};

const ProviderHub: React.FC<ProviderHubProps> = ({ bookings, facility, onUpdateBooking, onUpdateFacility, onClose, onRefer, hideHeader = false }) => {
  const today = new Date().toISOString().split('T')[0];
  const [activeConsultation, setActiveConsultation] = useState<string | null>(null);
  const [isDischargeMode, setIsDischargeMode] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<string | null>(null);
  const [referralTarget, setReferralTarget] = useState<string | null>(null);
  const [denialTarget, setDenialTarget] = useState<string | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Booking | null>(null);
  const [referralNote, setReferralNote] = useState('');
  const [historyTarget, setHistoryTarget] = useState<string | null>(null);
  const [isTelemedicineActive, setIsTelemedicineActive] = useState(false);
  const [telemedicineBooking, setTelemedicineBooking] = useState<Booking | null>(null);
  
  const [consultationForm, setConsultationForm] = useState({
    bp: '',
    hr: '',
    rr: '',
    o2sat: '',
    temp: '',
    peFindings: '',
    diagnosis: '',
    requestedLabs: '',
    nonPharma: '',
    followUpDate: '',
  });

  const [rescheduleForm, setRescheduleForm] = useState({
    date: today,
    time: '08:00 AM'
  });

  const [denialForm, setDenialForm] = useState({
    reason: '',
    instructions: ''
  });

  const [prescriptions, setPrescriptions] = useState<PrescribedDrug[]>([
    { drugName: '', strength: '', dose: '', frequency: '', duration: '', quantity: '' }
  ]);

  const timeSlots = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', 
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
  ];

  const pendingCount = bookings.filter(b => b.status === 'Pending' && b.facilityId === facility.id && b.detailedStatus !== 'Awaiting Patient Booking').length;
  const activeCount = bookings.filter(b => b.status === 'Approved' && b.facilityId === facility.id).length;
  const completedCount = bookings.filter(b => b.status === 'Completed' && b.facilityId === facility.id).length;

  const handleAttendCase = (booking: Booking) => {
    if (activeConsultation === booking.id) {
      setActiveConsultation(null);
      setIsDischargeMode(false);
    } else {
      setActiveConsultation(booking.id);
      setIsDischargeMode(false);
      // Timer begins when provider clicks "Attend to Patient"
      if (!booking.consultationStartTime) {
        onUpdateBooking(booking.id, 'Approved', {
          consultationStartTime: new Date().toISOString(),
          detailedStatus: 'Assessment in Progress'
        });
      }
    }
  };

  const handleForDoctor = (id: string) => {
    // Triggers "Awaiting Doctor Consultation" banner or Waiting Room on patient side
    onUpdateBooking(id, 'Approved', {
      detailedStatus: 'Awaiting Doctor'
    });
    setIsDischargeMode(true);
  };

  const handleStartCall = (booking: Booking) => {
    onUpdateBooking(booking.id, 'Approved', {
      detailedStatus: 'In Consultation Call'
    });
    setTelemedicineBooking(booking);
    setIsTelemedicineActive(true);
  };

  const handleEndTelemedicineCall = () => {
    if (telemedicineBooking) {
      // Stay in the same consultation but show discharge form
      setIsTelemedicineActive(false);
      setActiveConsultation(telemedicineBooking.id);
      setIsDischargeMode(true);
      setTelemedicineBooking(null);
    }
  };

  const handleCompleteConsultation = (id: string) => {
    if (!consultationForm.diagnosis) {
      alert("Please enter a diagnosis before completing.");
      return;
    }
    // Finalize timer and consultation
    onUpdateBooking(id, 'Completed', {
      vitals: {
        bp: consultationForm.bp,
        hr: consultationForm.hr,
        rr: consultationForm.rr,
        o2sat: consultationForm.o2sat,
        temp: consultationForm.temp
      },
      peFindings: consultationForm.peFindings,
      diagnosis: consultationForm.diagnosis,
      requestedLabs: consultationForm.requestedLabs,
      nonPharma: consultationForm.nonPharma,
      followUpDate: consultationForm.followUpDate,
      prescriptions: [...prescriptions],
      completionDate: new Date().toISOString().split('T')[0],
      consultationEndTime: new Date().toISOString(), // Timer ends here
      detailedStatus: undefined
    });
    setActiveConsultation(null);
    setIsDischargeMode(false);
    resetForm();
  };

  const handleReferralFinalize = (booking: Booking, targetFacility: Facility) => {
    if (!referralNote.trim()) {
      alert("Please provide a referral note.");
      return;
    }
    // Finalize current case
    onUpdateBooking(booking.id, 'Completed', {
       consultationEndTime: new Date().toISOString(),
       detailedStatus: undefined,
       referralToFacilityId: targetFacility.id,
       diagnosis: consultationForm.diagnosis || 'Referred for specialist evaluation'
    });
    // Create referral link
    onRefer?.(booking, targetFacility, referralNote);
    
    setReferralTarget(null);
    setReferralNote('');
    setActiveConsultation(null);
    setIsDischargeMode(false);
    alert(`Patient referred to ${targetFacility.name}. Awaiting patient to schedule their visit.`);
  };

  const resetForm = () => {
    setConsultationForm({ bp: '', hr: '', rr: '', o2sat: '', temp: '', peFindings: '', diagnosis: '', requestedLabs: '', nonPharma: '', followUpDate: '' });
    setPrescriptions([{ drugName: '', strength: '', dose: '', frequency: '', duration: '', quantity: '' }]);
  };

  const handleRescheduleSubmit = (id: string) => {
    onUpdateBooking(id, 'Pending', {
      date: rescheduleForm.date,
      timeSlot: rescheduleForm.time,
      detailedStatus: 'Awaiting Assessment'
    });
    setRescheduleTarget(null);
  };

  const handleDenySubmit = (id: string) => {
    onUpdateBooking(id, 'Declined', {
      denialReason: denialForm.reason,
      denialInstructions: denialForm.instructions,
      detailedStatus: undefined
    });
    setDenialTarget(null);
    setDenialForm({ reason: '', instructions: '' });
  };

  const addPrescriptionRow = () => {
    setPrescriptions([...prescriptions, { drugName: '', strength: '', dose: '', frequency: '', duration: '', quantity: '' }]);
  };

  const removePrescriptionRow = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const updatePrescriptionField = (index: number, field: keyof PrescribedDrug, value: string) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptions(updated);
  };

  const adjustWaitingTime = (delta: number) => {
    const newTime = Math.max(0, facility.waitingTimeMinutes + delta);
    onUpdateFacility?.({ waitingTimeMinutes: newTime });
  };

  const getTriageBadge = (level: TriageLevel) => {
    switch (level) {
      case (TriageLevel.EMERGENCY):
        return 'bg-red-500 text-white animate-pulse ring-4 ring-red-500/20';
      case (TriageLevel.URGENT):
        return 'bg-naga-orange text-white';
      default:
        return 'bg-emerald-500 text-white';
    }
  };

  const getPatientHistory = (patientName: string) => {
    return bookings.filter(b => 
      b.patientName === patientName && 
      b.status === 'Completed'
    ).sort((a, b) => new Date(b.completionDate || b.date).getTime() - new Date(a.completionDate || a.date).getTime());
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-dark-bg animate-fadeIn pb-12">
      {/* Telemedicine Overlay for Doctor */}
      {isTelemedicineActive && telemedicineBooking && (
        <TelemedicineView 
          role="doctor"
          patientName={telemedicineBooking.patientName}
          onEndCall={handleEndTelemedicineCall}
        />
      )}

      {/* Patient Detailed Record Modal */}
      {detailsTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fadeIn p-4">
          <div className="bg-white dark:bg-dark-card w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-dark-border flex flex-col max-h-[90vh]">
            <div className="p-8 bg-gradient-to-r from-naga-purple to-indigo-700 text-white flex justify-between items-start shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1 block">Full Patient Case</span>
                <h3 className="text-2xl font-black uppercase tracking-tight leading-tight">{detailsTarget.patientName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Brgy. {detailsTarget.patientBarangay}</p>
                  <span className="text-white/30">•</span>
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest">{calculateAge(detailsTarget.patientBirthDate)} YRS • {detailsTarget.patientSex}</p>
                </div>
              </div>
              <button onClick={() => setDetailsTarget(null)} className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Assigned Triage</p>
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${getTriageBadge(detailsTarget.triageLevel)}`}>
                    {detailsTarget.triageLevel}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Consul. Mode</p>
                  <span className="text-xs font-black text-naga-text dark:text-white uppercase">
                    <i className={`fa-solid ${detailsTarget.consultationMode === 'Telemedicine' ? 'fa-video text-indigo-500' : 'fa-hand-holding-medical text-naga-orange'} mr-2`}></i>
                    {detailsTarget.consultationMode === 'Telemedicine' ? 'Consultation (via Telemedicine)' : detailsTarget.consultationMode}
                  </span>
                </div>
              </div>

              {detailsTarget.referralFromFacilityId && (
                <div className="p-6 bg-orange-50 dark:bg-orange-950/20 border-2 border-naga-orange/30 rounded-[2rem] shadow-lg shadow-orange-500/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-naga-orange rounded-xl flex items-center justify-center text-white shadow-md">
                      <i className="fa-solid fa-share-nodes"></i>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-naga-orange uppercase tracking-[0.15em]">Incoming Referral Record</h4>
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        From: <span className="text-naga-text dark:text-white">{NAGA_FACILITIES.find(f => f.id === detailsTarget.referralFromFacilityId)?.name || 'Other Facility'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-dark-card p-4 rounded-xl border-naga-orange/10 italic text-sm text-slate-600 dark:text-slate-400 font-medium">
                    "{detailsTarget.referralNote || 'No specific note provided'}"
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-clipboard-list text-naga-purple"></i>
                    Primary Complaint
                  </h4>
                  <p className="text-lg font-black text-naga-text dark:text-white uppercase leading-tight">
                    {detailsTarget.concern} ({detailsTarget.isFollowUp ? 'Follow-up' : 'New Case'})
                  </p>
                </div>

                {detailsTarget.symptoms && detailsTarget.symptoms.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Present Symptoms</h4>
                    <div className="flex flex-wrap gap-2">
                      {detailsTarget.symptoms.map(s => (
                        <span key={s} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-black uppercase border border-indigo-100 dark:border-indigo-900/50">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {detailsTarget.additionalDetails && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Additional Intake Details</h4>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-dark-bg p-4 rounded-2xl border border-slate-100 dark:border-dark-border">
                      {detailsTarget.additionalDetails}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 dark:bg-dark-bg border-t border-slate-100 dark:border-dark-border flex gap-4 shrink-0">
              <button onClick={() => setDetailsTarget(null)} className="flex-1 py-4 bg-white dark:bg-dark-card text-naga-text dark:text-white font-black text-[10px] uppercase rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm">Close Record</button>
              <button 
                onClick={() => {
                  handleAttendCase(detailsTarget);
                  setDetailsTarget(null);
                }} 
                className="flex-2 px-10 py-4 bg-naga-purple text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-naga-purple/20 hover:scale-105 active:scale-95 transition-all"
              >
                Attend to Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal Overlay */}
      {historyTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="h-full w-full max-w-lg bg-white dark:bg-dark-card shadow-2xl border-l border-slate-200 dark:border-dark-border flex flex-col animate-slideInRight">
            <div className="p-6 bg-naga-purple text-white flex items-center justify-between">
               <div>
                  <h3 className="font-black text-lg leading-tight uppercase tracking-tight">Health History</h3>
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{historyTarget}</p>
               </div>
               <button onClick={() => setHistoryTarget(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-50 dark:bg-dark-bg/50">
               <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex gap-3 mb-2">
                  <i className="fa-solid fa-circle-info text-indigo-500 mt-1"></i>
                  <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 leading-relaxed uppercase tracking-tighter">Unified records from the Naga Health Network.</p>
               </div>
               {getPatientHistory(historyTarget).length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-40">
                    <i className="fa-solid fa-folder-open text-6xl mb-4"></i>
                    <p className="text-xs font-black uppercase tracking-widest">No previous clinical records found</p>
                 </div>
               ) : (
                 <div className="relative space-y-6 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-dark-border">
                    {getPatientHistory(historyTarget).map((h, i) => (
                       <div key={h.id} className="relative pl-12">
                          <div className={`absolute left-0 top-1 w-10 h-10 rounded-full bg-white dark:bg-dark-card border-2 flex items-center justify-center z-10 shadow-sm ${h.facilityId === facility.id ? 'border-naga-purple' : 'border-indigo-400'}`}>
                             <i className={`fa-solid ${h.facilityId === facility.id ? 'fa-clipboard-check text-naga-purple' : 'fa-share-nodes text-indigo-400'} text-xs`}></i>
                          </div>
                          <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-slate-100 dark:border-dark-border shadow-sm space-y-4">
                             <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-naga-purple dark:text-naga-orange uppercase">{h.completionDate || h.date}</p>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{h.facilityName}</span>
                             </div>

                             <div>
                                <h4 className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Primary Concern</h4>
                                <p className="text-xs font-black text-naga-text dark:text-white uppercase">{h.concern}</p>
                             </div>

                             {h.vitals && (
                               <div>
                                  <h4 className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Vital Signs</h4>
                                  <div className="grid grid-cols-3 gap-2">
                                     <div className="p-2 bg-slate-50 dark:bg-dark-bg rounded-lg border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase">BP</p>
                                        <p className="text-[10px] font-bold">{h.vitals.bp}</p>
                                     </div>
                                     <div className="p-2 bg-slate-50 dark:bg-dark-bg rounded-lg border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase">HR</p>
                                        <p className="text-[10px] font-bold">{h.vitals.hr}</p>
                                     </div>
                                     <div className="p-2 bg-slate-50 dark:bg-dark-bg rounded-lg border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase">Temp</p>
                                        <p className="text-[10px] font-bold">{h.vitals.temp}°C</p>
                                     </div>
                                  </div>
                               </div>
                             )}

                             {h.peFindings && (
                               <div>
                                  <h4 className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">PE Findings</h4>
                                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">"{h.peFindings}"</p>
                               </div>
                             )}

                             <div>
                                <h4 className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Final Diagnosis</h4>
                                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-xl">
                                  <p className="text-xs font-black text-naga-purple dark:text-naga-orange uppercase">{h.diagnosis || "General Consultation"}</p>
                                </div>
                             </div>

                             {h.requestedLabs && (
                               <div>
                                  <h4 className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Requested Labs</h4>
                                  <p className="text-xs font-bold text-naga-orange bg-orange-50 dark:bg-orange-950/20 p-2 rounded-lg">{h.requestedLabs}</p>
                               </div>
                             )}

                             {(h.prescriptions?.length || h.nonPharma) && (
                               <div>
                                  <h4 className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Treatment Plan</h4>
                                  <div className="space-y-2">
                                    {h.prescriptions?.map((p, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="font-bold">{p.drugName} {p.strength}</span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase">Qty: {p.quantity}</span>
                                      </div>
                                    ))}
                                    {h.nonPharma && (
                                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100">
                                        {h.nonPharma}
                                      </p>
                                    )}
                                  </div>
                               </div>
                             )}

                             {h.referralNote && (
                               <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-naga-orange/20 rounded-xl">
                                  <h4 className="text-[8px] font-black uppercase text-naga-orange mb-1 tracking-widest">Referral Instruction</h4>
                                  <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 italic">"{h.referralNote}"</p>
                               </div>
                             )}
                          </div>
                       </div>
                    ))}
                 </div>
               )}
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-dark-border">
               <button onClick={() => setHistoryTarget(null)} className="w-full py-4 bg-slate-100 dark:bg-dark-card text-naga-text dark:text-white font-black text-[10px] uppercase rounded-xl border border-slate-200">Close Records</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      {!hideHeader && (
        <div className="bg-white dark:bg-dark-card border-b border-slate-200 px-6 py-6 sticky top-0 z-40 shadow-sm transition-colors">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-dark-bg text-slate-500 hover:scale-105 transition-all shadow-sm">
                <i className="fa-solid fa-arrow-left md:fa-repeat"></i>
              </button>
              <div>
                <h1 className="text-lg md:text-2xl font-black text-naga-text dark:text-white leading-none mb-1">Station Management</h1>
                <p className="text-[9px] md:text-xs font-bold text-naga-purple dark:text-naga-orange uppercase tracking-[0.1em] line-clamp-1">{facility.name}</p>
              </div>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-naga-purple flex items-center justify-center text-white shadow-lg">
              <i className="fa-solid fa-user-doctor text-lg md:text-xl"></i>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 md:mb-10">
          <div className="h-28 md:h-32 bg-naga-purple p-4 md:p-5 rounded-tl-[2rem] rounded-br-[2rem] shadow-lg flex flex-col justify-between text-white transition-transform hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <i className="fa-solid fa-users text-lg opacity-40"></i>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Queue</span>
            </div>
            <p className="text-2xl md:text-3xl font-black">{pendingCount}</p>
          </div>
          <div className="h-28 md:h-32 bg-[#4dd0e1] p-4 md:p-5 rounded-tr-[2rem] rounded-bl-[2rem] shadow-lg flex flex-col justify-between text-white transition-transform hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <i className="fa-solid fa-pulse text-lg opacity-40"></i>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Active</span>
            </div>
            <p className="text-2xl md:text-3xl font-black">{activeCount}</p>
          </div>
          <div className="h-28 md:h-32 bg-[#f05123] p-4 md:p-5 rounded-tl-[2rem] rounded-br-[2rem] shadow-lg flex flex-col justify-between text-white transition-transform hover:-translate-y-1 group">
            <div className="flex justify-between items-start">
              <i className="fa-solid fa-clock text-lg opacity-40"></i>
              <div className="flex items-center gap-1">
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mr-1">Wait Time</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={(e) => { e.stopPropagation(); adjustWaitingTime(-5); }} className="w-5 h-5 rounded bg-white/20 hover:bg-white/40 flex items-center justify-center text-[10px]"><i className="fa-solid fa-minus"></i></button>
                   <button onClick={(e) => { e.stopPropagation(); adjustWaitingTime(5); }} className="w-5 h-5 rounded bg-white/20 hover:bg-white/40 flex items-center justify-center text-[10px]"><i className="fa-solid fa-plus"></i></button>
                </div>
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-black">{facility.waitingTimeMinutes}<span className="text-xs font-bold ml-1 uppercase">min</span></p>
          </div>
          <div className="h-28 md:h-32 bg-[#fbc02d] p-4 md:p-5 rounded-tr-[2rem] rounded-bl-[2rem] shadow-lg flex flex-col justify-between text-white transition-transform hover:-translate-y-1">
            <div className="flex justify-between items-start">
              <i className="fa-solid fa-check-circle text-lg opacity-40"></i>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Done</span>
            </div>
            <p className="text-2xl md:text-3xl font-black">{completedCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
           <div className="h-8 w-1 bg-naga-orange rounded-full"></div>
           <h2 className="text-lg font-black text-naga-text dark:text-white uppercase tracking-tight">Consultation Workflow</h2>
        </div>

        <div className="space-y-4">
          {bookings.filter(b => b.facilityId === facility.id && b.status !== 'Completed' && b.status !== 'Declined' && b.detailedStatus !== 'Awaiting Patient Booking').length === 0 ? (
            <div className="py-20 text-center bg-white dark:bg-dark-card rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-dark-border">
               <i className="fa-solid fa-calendar-check text-5xl text-slate-100 mb-4"></i>
               <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No active consults in the queue</p>
            </div>
          ) : (
            bookings.filter(b => b.facilityId === facility.id && b.status !== 'Completed' && b.status !== 'Declined' && b.detailedStatus !== 'Awaiting Patient Booking').map(booking => (
              <div key={booking.id} className={`bg-white dark:bg-dark-card p-5 md:p-6 rounded-mynaga border transition-all ${booking.status === 'Approved' || activeConsultation === booking.id ? 'border-naga-purple/30 shadow-md ring-2 ring-naga-purple/10' : 'border-slate-100 dark:border-dark-border shadow-sm'}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-50 dark:bg-dark-bg flex items-center justify-center text-slate-400 border border-slate-100 dark:border-dark-border flex-shrink-0 relative">
                      <i className={`fa-solid ${booking.consultationMode === 'Telemedicine' ? 'fa-laptop-medical text-indigo-500' : 'fa-user'}`}></i>
                      {booking.referralFromFacilityId && (
                         <div className="absolute -top-1 -right-1 w-5 h-5 bg-naga-orange text-white rounded-full flex items-center justify-center text-[8px] shadow-sm border border-white" title="Referred Patient">
                           <i className="fa-solid fa-share-nodes"></i>
                         </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-black text-naga-text dark:text-white uppercase tracking-tight text-sm md:text-base">{booking.patientName}</h3>
                        <span className="text-slate-400 font-bold text-[10px] uppercase">{calculateAge(booking.patientBirthDate)} yrs • {booking.patientSex} • Brgy. {booking.patientBarangay}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${getTriageBadge(booking.triageLevel)}`}>{booking.triageLevel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] md:text-xs font-bold text-naga-purple dark:text-naga-orange">
                          {booking.concern} ({booking.isFollowUp ? 'Follow-up' : 'New Case'})
                        </p>
                        {booking.referralFromFacilityId && (
                          <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-950/20 text-naga-orange text-[8px] font-black uppercase rounded-lg border border-naga-orange/10">Referred</span>
                        )}
                      </div>
                      <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{booking.date} • {booking.timeSlot} • {booking.consultationMode === 'Telemedicine' ? 'Tele-Link' : 'Walk-in'}</p>
                      
                      {/* Workflow Status & Timer Bar */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {booking.detailedStatus && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-dark-bg rounded-md text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-naga-purple animate-pulse"></span>
                            <span className="text-[8px] font-black uppercase">{booking.detailedStatus}</span>
                          </div>
                        )}
                        {booking.consultationStartTime && (
                          <ConsultationTimer startTime={booking.consultationStartTime} />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap lg:justify-end">
                    {booking.consultationMode === 'Telemedicine' && booking.detailedStatus === 'Awaiting Doctor' && (
                      <button onClick={() => handleStartCall(booking)} className="px-4 py-2 bg-emerald-500 text-white font-black text-[9px] uppercase rounded-xl shadow-lg flex items-center gap-1.5 animate-bounce">
                        <i className="fa-solid fa-video"></i> Start Video consultation
                      </button>
                    )}

                    <button onClick={() => setDetailsTarget(booking)} className="px-3 py-2 md:px-4 md:py-2.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 font-black text-[9px] uppercase border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-1.5">
                      <i className="fa-solid fa-file-medical"></i> Intake Data
                    </button>
                    
                    <button onClick={() => setHistoryTarget(booking.patientName)} className="px-3 py-2 md:px-4 md:py-2.5 text-slate-600 dark:text-slate-400 font-black text-[9px] uppercase border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5">
                      <i className="fa-solid fa-clock-rotate-left"></i> History
                    </button>
                    
                    <button onClick={() => {
                      setRescheduleTarget(booking.id);
                      setRescheduleForm({ date: booking.date, time: booking.timeSlot });
                    }} className="px-3 py-2 md:px-4 md:py-2.5 text-slate-600 dark:text-slate-400 font-black text-[9px] uppercase border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5">
                      <i className="fa-solid fa-calendar-alt"></i> Resched
                    </button>

                    <button onClick={() => setDenialTarget(booking.id)} className="px-3 py-2 md:px-4 md:py-2.5 text-red-600 font-black text-[9px] uppercase border border-red-200 rounded-xl hover:bg-red-50 flex items-center gap-1.5">
                      <i className="fa-solid fa-ban"></i> Deny
                    </button>

                    {booking.status === 'Pending' ? (
                      <button onClick={() => onUpdateBooking(booking.id, 'Approved', { detailedStatus: 'Awaiting Assessment' })} className="px-4 py-2 md:px-6 md:py-2.5 bg-emerald-500 text-white font-black text-[9px] uppercase rounded-xl shadow-lg flex items-center gap-1.5">
                        <i className="fa-solid fa-check"></i> Approve
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleAttendCase(booking)} 
                        className={`px-4 py-2 md:px-6 md:py-2.5 ${activeConsultation === booking.id ? 'bg-slate-200 text-slate-600' : 'bg-naga-purple text-white'} font-black text-[9px] uppercase rounded-xl shadow-lg flex items-center gap-1.5 transition-all`}
                      >
                        <i className={`fa-solid ${activeConsultation === booking.id ? 'fa-minus' : 'fa-stethoscope'}`}></i>
                        {activeConsultation === booking.id ? 'Minimize' : 'Attend to Case'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Reschedule UI */}
                {rescheduleTarget === booking.id && (
                  <div className="mt-6 p-6 bg-slate-50 dark:bg-dark-bg/30 rounded-[2rem] border border-slate-200 dark:border-dark-border animate-fadeIn space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Reschedule Appointment</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">New Date</label>
                        <div className="relative">
                          <input 
                            type="date" 
                            min={today}
                            value={rescheduleForm.date}
                            onChange={e => setRescheduleForm({...rescheduleForm, date: e.target.value})}
                            className="w-full p-3 bg-white dark:bg-dark-bg border border-slate-100 rounded-xl text-xs font-bold appearance-none cursor-pointer pr-10"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <i className="fa-solid fa-calendar-days text-[12px]"></i>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">New Time Slot</label>
                        <select 
                          value={rescheduleForm.time}
                          onChange={e => setRescheduleForm({...rescheduleForm, time: e.target.value})}
                          className="w-full p-3 bg-white dark:bg-dark-bg border border-slate-100 rounded-xl text-xs font-bold"
                        >
                          {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setRescheduleTarget(null)} className="flex-1 py-3 text-[9px] font-black uppercase text-slate-400">Cancel</button>
                      <button onClick={() => handleRescheduleSubmit(booking.id)} className="flex-1 py-3 bg-naga-purple text-white rounded-xl text-[9px] font-black uppercase shadow-md">Confirm New Time</button>
                    </div>
                  </div>
                )}

                {/* Deny UI */}
                {denialTarget === booking.id && (
                  <div className="mt-6 p-6 bg-red-50 dark:bg-red-950/10 rounded-[2rem] border border-red-100 dark:border-red-900/30 animate-fadeIn space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-red-600 mb-2 tracking-widest">Deny Appointment Request</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-red-400 ml-1 mb-1 block">Reason for Denial</label>
                        <textarea 
                          placeholder="Why is this appointment being denied?"
                          value={denialForm.reason}
                          onChange={e => setDenialForm({...denialForm, reason: e.target.value})}
                          className="w-full p-4 bg-white dark:bg-dark-bg border border-red-100 rounded-xl text-xs outline-none h-20 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-red-400 ml-1 mb-1 block">Further Instructions for Patient</label>
                        <textarea 
                          placeholder="What should the patient do instead?"
                          value={denialForm.instructions}
                          onChange={e => setDenialForm({...denialForm, instructions: e.target.value})}
                          className="w-full p-4 bg-white dark:bg-dark-bg border border-red-100 rounded-xl text-xs outline-none h-20 resize-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setDenialTarget(null)} className="flex-1 py-3 text-[9px] font-black uppercase text-slate-400">Cancel</button>
                      <button 
                        disabled={!denialForm.reason.trim()}
                        onClick={() => handleDenySubmit(booking.id)} 
                        className="flex-[2] py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg disabled:opacity-50"
                      >
                        Confirm Denial
                      </button>
                    </div>
                  </div>
                )}

                {activeConsultation === booking.id && (
                  <div className="mt-6 pt-6 border-t border-slate-100 dark:border-dark-border space-y-8 animate-fadeIn">
                     {!isDischargeMode ? (
                        <div className="space-y-6 animate-fadeIn">
                           <div className="flex items-center gap-2 mb-4">
                             <div className="w-8 h-8 rounded-lg bg-naga-purple/10 flex items-center justify-center text-naga-purple">
                               <i className="fa-solid fa-heart-pulse"></i>
                             </div>
                             <h4 className="text-sm font-black uppercase text-naga-purple tracking-widest">Vital Signs & Assessment</h4>
                           </div>
                           
                           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">BP (mmHg)</label>
                                <input type="text" placeholder="120/80" value={consultationForm.bp} onChange={e => setConsultationForm({...consultationForm, bp: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-xs font-bold focus:border-naga-purple outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">HR (bpm)</label>
                                <input type="text" placeholder="72" value={consultationForm.hr} onChange={e => setConsultationForm({...consultationForm, hr: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-xs font-bold focus:border-naga-purple outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">RR (bpm)</label>
                                <input type="text" placeholder="18" value={consultationForm.rr} onChange={e => setConsultationForm({...consultationForm, rr: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-xs font-bold focus:border-naga-purple outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">O2 Sat (%)</label>
                                <input type="text" placeholder="98" value={consultationForm.o2sat} onChange={e => setConsultationForm({...consultationForm, o2sat: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-xs font-bold focus:border-naga-purple outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Temp (°C)</label>
                                <input type="text" placeholder="36.5" value={consultationForm.temp} onChange={e => setConsultationForm({...consultationForm, temp: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-xs font-bold focus:border-naga-purple outline-none" />
                              </div>
                           </div>

                           <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Pertinent Findings</label>
                             <textarea 
                              placeholder="Notable findings..." 
                              value={consultationForm.peFindings}
                              onChange={e => setConsultationForm({...consultationForm, peFindings: e.target.value})}
                              className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 rounded-2xl text-xs font-medium outline-none h-32 resize-none shadow-sm focus:border-naga-purple"
                             />
                           </div>

                           <div className="pt-4 flex justify-end">
                              <button 
                                onClick={() => handleForDoctor(booking.id)}
                                className="px-10 py-4 bg-naga-purple text-white font-black text-xs uppercase rounded-2xl shadow-xl shadow-naga-purple/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                              >
                                <i className="fa-solid fa-user-md"></i>
                                For Doctor Consultation
                              </button>
                           </div>
                        </div>
                     ) : (
                        <div className="space-y-8 animate-fadeIn">
                           <div className="flex items-center gap-2 mb-4">
                             <button onClick={() => setIsDischargeMode(false)} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-bg flex items-center justify-center text-slate-400 hover:text-naga-purple transition-all">
                               <i className="fa-solid fa-arrow-left text-xs"></i>
                             </button>
                             <h4 className="text-sm font-black uppercase text-naga-orange tracking-widest">Discharge Plan & Disposition</h4>
                           </div>

                           <div className="space-y-4">
                              <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Final Diagnosis</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g., J00 - Acute Nasopharyngitis" 
                                  value={consultationForm.diagnosis}
                                  onChange={e => setConsultationForm({...consultationForm, diagnosis: e.target.value})}
                                  className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl text-sm font-bold outline-none focus:border-naga-orange"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Laboratory Requests</label>
                                <textarea 
                                  placeholder="CBC, Urinalysis, Chest X-ray..." 
                                  value={consultationForm.requestedLabs}
                                  onChange={e => setConsultationForm({...consultationForm, requestedLabs: e.target.value})}
                                  className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl text-sm font-bold outline-none h-20 resize-none focus:border-naga-orange"
                                />
                                <p className="text-[8px] font-bold text-slate-400 mt-1 ml-1 uppercase">Separate labs will generate an e-lab request form for the patient.</p>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Medications</label>
                                  <button onClick={addPrescriptionRow} className="text-[9px] font-black text-naga-purple uppercase flex items-center gap-1 hover:text-naga-orange transition-colors">
                                    <i className="fa-solid fa-plus-circle"></i> Add Drug
                                  </button>
                                </div>
                                
                                <div className="space-y-3">
                                  {prescriptions.map((p, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 dark:bg-dark-bg/50 rounded-2xl border border-slate-100 dark:border-dark-border animate-fadeIn relative shadow-sm">
                                      {prescriptions.length > 1 && (
                                        <button onClick={() => removePrescriptionRow(idx)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-200 dark:bg-dark-card flex items-center justify-center text-slate-400 hover:text-red-500">
                                          <i className="fa-solid fa-times text-[10px]"></i>
                                        </button>
                                      )}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                          <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Drug Name</label>
                                          <input type="text" placeholder="Paracetamol" value={p.drugName} onChange={e => updatePrescriptionField(idx, 'drugName', e.target.value)} className="w-full p-2 bg-white dark:bg-dark-card border border-slate-100 rounded-lg text-[11px] font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Strength</label>
                                          <input type="text" placeholder="500mg" value={p.strength} onChange={e => updatePrescriptionField(idx, 'strength', e.target.value)} className="w-full p-2 bg-white dark:bg-dark-card border border-slate-100 rounded-lg text-[11px] font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Dose</label>
                                          <input type="text" placeholder="1 tablet" value={p.dose} onChange={e => updatePrescriptionField(idx, 'dose', e.target.value)} className="w-full p-2 bg-white dark:bg-dark-card border border-slate-100 rounded-lg text-[11px] font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Frequency</label>
                                          <input type="text" placeholder="3x a day" value={p.frequency} onChange={e => updatePrescriptionField(idx, 'frequency', e.target.value)} className="w-full p-2 bg-white dark:bg-dark-card border border-slate-100 rounded-lg text-[11px] font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Duration</label>
                                          <input type="text" placeholder="5 days" value={p.duration} onChange={e => updatePrescriptionField(idx, 'duration', e.target.value)} className="w-full p-2 bg-white dark:bg-dark-card border border-slate-100 rounded-lg text-[11px] font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Quantity</label>
                                          <input type="text" placeholder="15 tabs" value={p.quantity} onChange={e => updatePrescriptionField(idx, 'quantity', e.target.value)} className="w-full p-2 bg-white dark:bg-dark-card border border-slate-100 rounded-lg text-[11px] font-bold" />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Instructions</label>
                                  <textarea 
                                    placeholder="Advice, diet..." 
                                    value={consultationForm.nonPharma}
                                    onChange={e => setConsultationForm({...consultationForm, nonPharma: e.target.value})}
                                    className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 rounded-2xl text-xs outline-none h-24 resize-none shadow-sm focus:border-naga-orange"
                                  />
                                </div>
                                <div className="space-y-2 relative group">
                                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Professional Follow-up Calendar</label>
                                  <div className="relative">
                                    <input 
                                      type="date" 
                                      min={today}
                                      value={consultationForm.followUpDate}
                                      onChange={e => setConsultationForm({...consultationForm, followUpDate: e.target.value})}
                                      className="w-full p-4 pl-12 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl text-sm font-bold outline-none shadow-sm focus:border-naga-orange appearance-none cursor-pointer transition-all"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-naga-orange">
                                      <i className="fa-solid fa-calendar-day text-lg"></i>
                                    </div>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                      <i className="fa-solid fa-chevron-down text-xs"></i>
                                    </div>
                                  </div>
                                  <p className="text-[8px] font-bold text-slate-400 mt-1 ml-1 uppercase">Patient will receive a calendar notification.</p>
                                </div>
                              </div>

                              <div className="flex flex-col gap-4 pt-6 border-t border-slate-100 dark:border-dark-border">
                                 <div className="flex flex-col sm:flex-row gap-4">
                                   <button 
                                    onClick={() => handleCompleteConsultation(activeConsultation!)} 
                                    className="flex-1 py-5 bg-emerald-500 text-white font-black text-xs uppercase rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                   >
                                    <i className="fa-solid fa-house-user text-base"></i>
                                    Send Home (Complete)
                                   </button>
                                   <button 
                                    onClick={() => setReferralTarget(activeConsultation!)} 
                                    className={`flex-1 py-5 ${referralTarget === activeConsultation ? 'bg-slate-200 text-slate-600' : 'bg-naga-orange text-white shadow-naga-orange/20'} font-black text-xs uppercase rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2`}
                                   >
                                    <i className="fa-solid fa-share-nodes text-base"></i>
                                    Refer to Another Facility
                                   </button>
                                 </div>

                                 {/* Referral UI - Positioned BELOW the buttons */}
                                 {referralTarget === booking.id && (
                                    <div className="p-6 bg-orange-50 dark:bg-orange-950/10 rounded-[2.5rem] border border-naga-orange/20 animate-fadeIn naga-shadow">
                                      <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-naga-orange/10 flex items-center justify-center text-naga-orange">
                                          <i className="fa-solid fa-file-export"></i>
                                        </div>
                                        <h4 className="text-[10px] font-black uppercase text-naga-orange tracking-widest">Incoming Referral Details</h4>
                                      </div>
                                      
                                      <div className="mb-6">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Clinical Reason for Referral</label>
                                        <textarea 
                                          placeholder="State clinical reason for referral..." 
                                          value={referralNote}
                                          onChange={(e) => setReferralNote(e.target.value)}
                                          className="w-full p-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl text-xs outline-none h-24 resize-none focus:border-naga-orange shadow-inner"
                                        />
                                      </div>

                                      <p className="text-[9px] font-black text-slate-400 uppercase mb-3 ml-1">Select Target Health Station</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar pb-2">
                                        {NAGA_FACILITIES.filter(f => f.id !== facility.id).map(f => (
                                          <button
                                            key={f.id}
                                            disabled={!referralNote.trim()}
                                            onClick={() => handleReferralFinalize(booking, f)}
                                            className="p-4 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl text-left hover:border-naga-orange transition-all disabled:opacity-40 group shadow-sm hover:shadow-md"
                                          >
                                            <p className="text-[10px] font-black uppercase leading-tight mb-1 group-hover:text-naga-orange transition-colors">{f.name}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">{f.type} • {f.distanceKm}km away</p>
                                          </button>
                                        ))}
                                      </div>
                                      <div className="mt-4 pt-4 border-t border-naga-orange/10 flex justify-end">
                                         <button onClick={() => setReferralTarget(null)} className="text-[9px] font-black uppercase text-slate-400 px-4 py-2 hover:text-slate-600">Cancel Referral</button>
                                      </div>
                                    </div>
                                  )}

                                 <div className="flex justify-center">
                                   <button 
                                    onClick={() => {
                                      setActiveConsultation(null);
                                      setIsDischargeMode(false);
                                    }} 
                                    className="py-3 px-6 font-black text-slate-400 text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                                   >
                                    Keep Active
                                   </button>
                                 </div>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderHub;
