
import React, { useState, useRef, useMemo } from 'react';
import { IntakeData, Booking } from '../types';

interface IntakeFormProps {
  onSubmit: (data: IntakeData) => void;
  isLoading: boolean;
  bookings: Booking[];
}

const IntakeForm: React.FC<IntakeFormProps> = ({ onSubmit, isLoading, bookings }) => {
  const [step, setStep] = useState(1);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const prescriptionInputRef = useRef<HTMLInputElement>(null);
  const labResultsInputRef = useRef<HTMLInputElement>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const [formData, setFormData] = useState<IntakeData>({
    patientType: 'Adult',
    primaryConcern: 'Consultation',
    firstName: '',
    lastName: '',
    birthDate: '',
    sex: 'Male',
    barangay: '',
    symptoms: [],
    otherSymptom: '',
    isFollowUp: false,
    conditionStatus: 'Unchanged',
    medicationStatus: 'Ongoing',
    hasPhilHealth: false,
    philHealthPIN: '',
    additionalDetails: '',
    consultationMode: 'In-Person',
    mobile: ''
  });

  // Derived patient history based on name entry
  const patientHistory = useMemo(() => {
    if (!formData.firstName || !formData.lastName) return [];
    const fullName = `${formData.firstName} ${formData.lastName}`.toLowerCase();
    return bookings.filter(b => 
      b.patientName.toLowerCase() === fullName && 
      b.status === 'Completed'
    ).sort((a, b) => new Date(b.completionDate || b.date).getTime() - new Date(a.completionDate || a.date).getTime());
  }, [bookings, formData.firstName, formData.lastName]);

  const concerns = [
    'Consultation', 
    'Prescription Refill',
    'Animal Bite Treatment',
    'Dental Check-up',
    'Maternal / Prenatal Care',
    'Immunization (Bakuna)',
    'TB / NTP Program',
    'PhilHealth YAKAP Profiling',
    'Emergency care'
  ];

  const commonSymptoms = [
    'Fever', 'Cough', 'Cold / Flu Symptoms', 'Headache', 'Body Ache', 
    'Difficulty Breathing', 'Chest Pain', 'Nausea / Vomiting', 
    'Diarrhea', 'Skin Rash / Itching', 'Others'
  ];

  const conditionOptions: ('Improved' | 'Unchanged' | 'Worsened')[] = ['Improved', 'Unchanged', 'Worsened'];
  const medicationOptions: ('Finished' | 'Ongoing' | 'Did not take')[] = ['Finished', 'Ongoing', 'Did not take'];

  const barangays = [
    'Abella', 'Bagumbayan Norte', 'Bagumbayan Sur', 'Balatas', 'Calauag', 
    'Cararayan', 'Carolina', 'Concepcion Grande', 'Concepcion Pequeña', 
    'Dayangdang', 'Del Rosario', 'Dinaga', 'Igualdad', 'Lerma', 'Liboton', 
    'Mabolo', 'Pacol', 'Panicuason', 'Peñafrancia', 'Sabang', 'San Felipe', 
    'San Francisco', 'San Isidro', 'Sta. Cruz', 'Tabuco', 'Tinago', 'Triangulo'
  ];

  const handleAutofill = () => {
    setFormData({
      ...formData,
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      birthDate: '1992-05-15',
      sex: 'Male',
      barangay: 'Abella',
      mobile: '09123456789'
    });
  };

  const handleLinkHistory = (booking: Booking) => {
    setSelectedHistoryId(booking.id);
    const medList = booking.prescriptions?.map(p => `${p.drugName} ${p.strength} (${p.quantity})`).join(', ') || '';
    setFormData(prev => ({
      ...prev,
      additionalDetails: `Linking from previous record (${booking.completionDate || booking.date} at ${booking.facilityName}):\nDiagnosis: ${booking.diagnosis || 'N/A'}\nPrevious Meds: ${medList}\n\n${prev.additionalDetails}`.trim(),
      prescriptionImage: 'HISTORY_LINKED' // Marker for automated retrieval
    }));
  };

  const toggleSymptom = (symptom: string) => {
    setFormData(prev => {
      const exists = prev.symptoms.includes(symptom);
      if (exists) {
        return { ...prev, symptoms: prev.symptoms.filter(s => s !== symptom) };
      } else {
        return { ...prev, symptoms: [...prev.symptoms, symptom] };
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'prescriptionImage' | 'labResultsImage') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
        if (field === 'prescriptionImage') setSelectedHistoryId(null); // Clear history selection if manual upload
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => {
    if (step === 1 && formData.primaryConcern === 'Prescription Refill') {
      setFormData(prev => ({ ...prev, isFollowUp: true }));
    }
    setStep(s => s + 1);
  };
  const prevStep = () => setStep(s => s - 1);

  const isStep1Valid = formData.firstName && formData.lastName && formData.birthDate && formData.barangay && formData.primaryConcern && formData.sex;
  const isStep2Valid = formData.primaryConcern === 'Prescription Refill'
    ? (formData.prescriptionImage || formData.additionalDetails.trim().length > 0)
    : (formData.isFollowUp 
        ? (formData.conditionStatus && formData.medicationStatus) 
        : (formData.symptoms.length > 0 || formData.additionalDetails.trim().length > 0));

  const isStep3Valid = isAuthorized && (!formData.hasPhilHealth || (formData.hasPhilHealth && formData.philHealthPIN && formData.philHealthPIN.trim().length > 0));

  return (
    <div className="max-w-xl w-full mx-auto bg-white dark:bg-dark-card rounded-mynaga naga-shadow overflow-hidden border border-slate-100 dark:border-dark-border transition-colors duration-300">
      <div className="bg-naga-purple dark:bg-naga-blue px-8 pt-10 pb-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white dark:bg-dark-bg rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-heart-pulse text-naga-purple dark:text-naga-orange text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">NaGabay</h1>
              <p className="text-naga-pink font-semibold text-xs uppercase tracking-widest">Smart Health Navigator</p>
            </div>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight mb-1">Patient Intake</h2>
          <p className="text-white/80 text-sm font-medium italic">Gagabayan ka sa iyong medikal na pangangailangan</p>
        </div>
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
      </div>

      <div className="px-8 pb-10 -mt-6 relative z-20">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-slate-50 dark:border-dark-border transition-colors duration-300">
          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-naga-orange' : 'bg-slate-100 dark:bg-dark-border'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="animate-fadeIn space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-naga-text dark:text-white uppercase tracking-wider">Step 1: Patient Basics</h2>
                <button 
                  onClick={handleAutofill}
                  className="flex items-center gap-2 px-3 py-1.5 bg-naga-purple/5 hover:bg-naga-purple/10 text-naga-purple dark:text-naga-orange dark:bg-naga-orange/5 border border-naga-purple/20 dark:border-naga-orange/20 rounded-full text-[10px] font-bold transition-all active:scale-95"
                >
                  <i className="fa-solid fa-user-check"></i>
                  Autofill from Profile
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">First Name</label>
                  <input type="text" placeholder="e.g. Juan" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-xs outline-none focus:border-naga-purple dark:text-white transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Last Name</label>
                  <input type="text" placeholder="e.g. Dela Cruz" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-xs outline-none focus:border-naga-purple dark:text-white transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Birthday</label>
                  <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-xs outline-none focus:border-naga-purple dark:text-white transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Sex</label>
                  <select value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value as any})} className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-xs outline-none focus:border-naga-purple dark:text-white transition-all">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Barangay</label>
                <select value={formData.barangay} onChange={e => setFormData({...formData, barangay: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-xs outline-none focus:border-naga-purple dark:text-white transition-all">
                  <option value="">Select Barangay</option>
                  {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1">Primary Health Concern</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {concerns.map(c => (
                    <button
                      key={c}
                      onClick={() => setFormData({...formData, primaryConcern: c})}
                      className={`text-left p-3 rounded-xl border-2 font-bold text-xs transition-all flex items-center justify-between ${formData.primaryConcern === c ? 'bg-naga-purple text-white border-naga-purple shadow-sm' : 'bg-white dark:bg-dark-card text-naga-text dark:text-white border-slate-50'}`}
                    >
                      {c}
                      <i className={`fa-solid fa-circle-check ${formData.primaryConcern === c ? 'text-white' : 'text-slate-100'}`}></i>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                disabled={!isStep1Valid}
                onClick={nextStep} 
                className="w-full py-4 bg-naga-purple text-white rounded-mynaga font-bold shadow-lg disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95"
              >
                Next Step
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fadeIn space-y-6">
              <h2 className="text-base font-bold text-naga-text dark:text-white uppercase tracking-wider">Step 2: Reason for {formData.primaryConcern === 'Prescription Refill' ? 'Refill' : 'Consult'}</h2>
              
              {formData.primaryConcern !== 'Prescription Refill' && (
                <div className="flex gap-2 p-1 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl">
                  <button 
                    onClick={() => setFormData({...formData, isFollowUp: false})}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!formData.isFollowUp ? 'bg-white dark:bg-dark-card text-naga-purple shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    New Case
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, isFollowUp: true})}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.isFollowUp ? 'bg-white dark:bg-dark-card text-naga-purple shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Follow-up Visit
                  </button>
                </div>
              )}

              <div className="animate-fadeIn space-y-6">
                {(formData.isFollowUp || formData.primaryConcern === 'Prescription Refill') && (
                  <div className="space-y-4">
                    {/* Record Retrieval from History */}
                    {patientHistory.length > 0 && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500 rounded-mynaga animate-fadeIn">
                        <div className="flex items-center gap-2 mb-3">
                           <i className="fa-solid fa-cloud-arrow-down text-emerald-600 animate-pulse"></i>
                           <h4 className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-widest">Medical History Found</h4>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">We found previous prescriptions in your Naga Health account. Link one to skip manual uploads.</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                           {patientHistory.map(h => (
                             <button
                               key={h.id}
                               onClick={() => handleLinkHistory(h)}
                               className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${selectedHistoryId === h.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white dark:bg-dark-card border-slate-100 dark:border-dark-border hover:border-emerald-500'}`}
                             >
                               <div>
                                 <p className={`text-[9px] font-black uppercase ${selectedHistoryId === h.id ? 'text-white/70' : 'text-slate-400'}`}>{h.completionDate || h.date}</p>
                                 <p className="text-[11px] font-bold line-clamp-1">{h.diagnosis || 'General Consult'}</p>
                                 <p className={`text-[8px] font-bold uppercase ${selectedHistoryId === h.id ? 'text-white/60' : 'text-slate-400'}`}>{h.facilityName}</p>
                               </div>
                               <i className={`fa-solid ${selectedHistoryId === h.id ? 'fa-check-circle' : 'fa-link text-slate-300'}`}></i>
                             </button>
                           ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block ml-1">Current Condition Status</label>
                      <div className="grid grid-cols-3 gap-2">
                        {conditionOptions.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setFormData({...formData, conditionStatus: opt})}
                            className={`py-3 rounded-xl border-2 font-bold text-[10px] transition-all text-center ${formData.conditionStatus === opt ? 'bg-naga-purple text-white border-naga-purple' : 'bg-slate-50 dark:bg-dark-bg text-naga-text dark:text-white border-slate-100 dark:border-dark-border'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {formData.primaryConcern !== 'Prescription Refill' && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block ml-1">
                      {formData.isFollowUp ? 'Symptoms Still Present' : 'Select Symptoms'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {commonSymptoms.map(s => (
                        <button
                          key={s}
                          onClick={() => toggleSymptom(s)}
                          className={`text-left p-3 rounded-xl border-2 font-bold text-[11px] transition-all flex items-center gap-2 ${formData.symptoms.includes(s) ? 'bg-naga-purple text-white border-naga-purple shadow-sm' : 'bg-slate-50 dark:bg-dark-bg text-naga-text dark:text-white border-slate-100 dark:border-dark-border'}`}
                        >
                          <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${formData.symptoms.includes(s) ? 'bg-white border-white' : 'border-slate-300'}`}>
                            {formData.symptoms.includes(s) && <div className="w-1 h-1 bg-naga-purple rounded-full"></div>}
                          </div>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(formData.isFollowUp || formData.primaryConcern === 'Prescription Refill') && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block ml-1">Current Medication Status</label>
                      <div className="grid grid-cols-1 gap-2">
                        {medicationOptions.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setFormData({...formData, medicationStatus: opt})}
                            className={`py-3 px-4 rounded-xl border-2 font-bold text-[11px] transition-all flex items-center justify-between ${formData.medicationStatus === opt ? 'bg-naga-purple text-white border-naga-purple' : 'bg-slate-50 dark:bg-dark-bg text-naga-text dark:text-white border-slate-100 dark:border-dark-border'}`}
                          >
                            {opt}
                            {formData.medicationStatus === opt && <i className="fa-solid fa-check"></i>}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Old Prescription {formData.primaryConcern === 'Prescription Refill' ? '(Required)' : '(Optional)'}</label>
                        <button 
                          onClick={() => prescriptionInputRef.current?.click()}
                          className={`w-full py-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${formData.prescriptionImage && formData.prescriptionImage !== 'HISTORY_LINKED' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : formData.prescriptionImage === 'HISTORY_LINKED' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 dark:bg-dark-bg border-slate-200 dark:border-dark-border text-slate-400'}`}
                        >
                          <i className={`fa-solid ${formData.prescriptionImage ? (formData.prescriptionImage === 'HISTORY_LINKED' ? 'fa-database' : 'fa-file-circle-check') : 'fa-camera'}`}></i>
                          <span className="text-[9px] font-black uppercase">{formData.prescriptionImage ? (formData.prescriptionImage === 'HISTORY_LINKED' ? 'Record Linked' : 'Uploaded') : 'Upload Photo'}</span>
                        </button>
                        <input type="file" ref={prescriptionInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'prescriptionImage')} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Recent Lab Results (Optional)</label>
                        <button 
                          onClick={() => labResultsInputRef.current?.click()}
                          className={`w-full py-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${formData.labResultsImage ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-slate-50 dark:bg-dark-bg border-slate-200 dark:border-dark-border text-slate-400'}`}
                        >
                          <i className={`fa-solid ${formData.labResultsImage ? 'fa-vial-circle-check' : 'fa-upload'}`}></i>
                          <span className="text-[9px] font-black uppercase">{formData.labResultsImage ? 'Uploaded' : 'Upload'}</span>
                        </button>
                        <input type="file" ref={labResultsInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'labResultsImage')} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block ml-1">Additional Details (Optional)</label>
                <textarea 
                  placeholder={formData.primaryConcern === 'Prescription Refill' ? "List the medications you need refilled..." : (formData.isFollowUp ? "Tell us about your previous visit and how you are progressing..." : "Tell us more about how you feel...")}
                  value={formData.additionalDetails}
                  onChange={e => setFormData({...formData, additionalDetails: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-xs outline-none h-24 resize-none dark:text-white focus:border-naga-purple transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={prevStep} className="px-6 py-4 font-bold text-naga-lightText dark:text-dark-muted hover:text-naga-text transition-colors">Back</button>
                <button 
                  disabled={!isStep2Valid}
                  onClick={nextStep} 
                  className="flex-1 py-4 bg-naga-purple text-white rounded-mynaga font-bold shadow-lg transition-all active:scale-[1.01] active:scale-95 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fadeIn space-y-6">
              <h2 className="text-base font-bold text-naga-text dark:text-white uppercase tracking-wider">Step 3: Consultation & Verification</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setFormData({...formData, consultationMode: 'In-Person'})}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${formData.consultationMode === 'In-Person' ? 'bg-white border-naga-purple shadow-md' : 'border-transparent opacity-60'}`}
                >
                  <i className="fa-solid fa-hospital text-xl text-naga-purple"></i>
                  <span className="text-[10px] font-black uppercase text-naga-text">In-Person Visit</span>
                </button>
                <div className="relative">
                  <button 
                    disabled={!formData.isFollowUp && formData.primaryConcern !== 'Prescription Refill'}
                    onClick={() => setFormData({...formData, consultationMode: 'Telemedicine'})}
                    className={`w-full flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${formData.consultationMode === 'Telemedicine' ? 'bg-white border-naga-purple shadow-md' : 'border-transparent opacity-60'} ${(!formData.isFollowUp && formData.primaryConcern !== 'Prescription Refill') ? 'cursor-not-allowed grayscale' : ''}`}
                  >
                    <i className="fa-solid fa-video text-xl text-naga-purple"></i>
                    <span className="text-[10px] font-black uppercase text-naga-text">Telemedicine</span>
                  </button>
                  {(!formData.isFollowUp && formData.primaryConcern !== 'Prescription Refill') && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-full text-center">
                       <span className="text-[8px] font-black text-naga-orange uppercase tracking-tighter bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded-full border border-naga-orange/20">Follow-up only</span>
                    </div>
                  )}
                </div>
              </div>

              <div 
                onClick={() => setIsAuthorized(!isAuthorized)}
                className={`p-5 rounded-mynaga border-2 transition-all cursor-pointer flex gap-4 items-start ${isAuthorized ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500' : 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30'}`}
              >
                <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${isAuthorized ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-dark-bg border-indigo-200 dark:border-indigo-900/50'}`}>
                   {isAuthorized && <i className="fa-solid fa-check text-[10px]"></i>}
                </div>
                <p className={`text-[10px] font-bold leading-relaxed italic ${isAuthorized ? 'text-emerald-700 dark:text-emerald-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
                  "I authorize Naga City Health to use my information for medical triage and allow my health records to be shared within the health facility network of Naga City to ensure continuity of care."
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">PhilHealth member - yes/no</label>
                  <div className="flex gap-2 p-1 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl">
                    <button 
                      onClick={() => setFormData({...formData, hasPhilHealth: true})}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.hasPhilHealth ? 'bg-naga-orange text-white shadow-sm' : 'text-slate-400'}`}
                    >
                      Yes
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, hasPhilHealth: false})}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!formData.hasPhilHealth ? 'bg-naga-purple text-white shadow-sm' : 'text-slate-400'}`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {formData.hasPhilHealth && (
                  <div className="animate-fadeIn space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">PhilHealth PIN</label>
                    <input 
                      type="text" 
                      placeholder="Enter 12-digit PIN" 
                      value={formData.philHealthPIN} 
                      onChange={e => setFormData({...formData, philHealthPIN: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl text-sm font-bold outline-none focus:border-naga-purple dark:text-white transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={prevStep} className="px-6 py-4 font-bold text-naga-lightText dark:text-dark-muted hover:text-naga-text transition-colors">Back</button>
                <button 
                  onClick={() => onSubmit(formData)} 
                  disabled={isLoading || !isStep3Valid}
                  className="flex-1 py-4 bg-naga-orange text-white rounded-mynaga font-bold shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Start Navigation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntakeForm;
