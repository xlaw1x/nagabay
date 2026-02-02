
import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import HomeView from './components/HomeView';
import BottomNav from './components/BottomNav';
import ChatInterface from './components/ChatInterface';
import FacilityCard from './components/FacilityCard';
import IntakeForm from './components/IntakeForm';
import TelemedicineView from './components/TelemedicineView';
import ProviderHub from './components/ProviderHub';
import LGUPortal from './components/LGUPortal';
import { NAGA_FACILITIES } from './constants';
import { analyzeTriageViaAPI, getUserFriendlyErrorMessage } from './services/triageClient';
import { ChatMessage, TriageLevel, TriageResult, Facility, IntakeData, Booking } from './types';

type AppView = 'home' | 'intake' | 'dashboard' | 'telemedicine' | 'provider-hub' | 'split-view' | 'lgu-portal';

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

const App: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [view, setView] = useState<AppView>('home');
  const [patientSubView, setPatientSubView] = useState<AppView>('home');
  const [activeTab, setActiveTab] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isTyping, setIsTyping] = useState(false);
  const [currentTriage, setCurrentTriage] = useState<TriageResult | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [lastIntake, setLastIntake] = useState<IntakeData | null>(() => {
    const saved = localStorage.getItem('last_naga_intake');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [facilities, setFacilities] = useState<Facility[]>(NAGA_FACILITIES);
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('naga_health_emr');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedFacilityForBooking, setSelectedFacilityForBooking] = useState<Facility | null>(null);
  const [bookingDate, setBookingDate] = useState(today);
  const [bookingTime, setBookingTime] = useState('08:00 AM');
  const [bookingMode, setBookingMode] = useState<'In-Person' | 'Telemedicine'>('In-Person');
  const [isReferralBooking, setIsReferralBooking] = useState<string | null>(null);

  const [selectedStaffFacilityId, setSelectedStaffFacilityId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('naga_health_emr', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    if (lastIntake) {
      localStorage.setItem('last_naga_intake', JSON.stringify(lastIntake));
    }
  }, [lastIntake]);

  const staffFacility = useMemo(() => 
    facilities.find(f => f.id === selectedStaffFacilityId) || null,
  [selectedStaffFacilityId, facilities]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const recommendedFacilities = useMemo(() => {
    if (!currentTriage || !showRecommendations) return [];
    return currentTriage.recommendedFacilityIds
      .map(id => facilities.find(f => id === f.id))
      .filter((f): f is Facility => !!f);
  }, [currentTriage, facilities, showRecommendations]);

  const activeBookingForPatient = useMemo(() => {
    if (!lastIntake) return null;
    const patientName = `${lastIntake.firstName} ${lastIntake.lastName}`;
    return bookings.find(b => 
      b.patientName === patientName &&
      (b.status === 'Pending' || b.status === 'Approved') &&
      b.detailedStatus !== 'Awaiting Patient Booking'
    ) || null;
  }, [bookings, lastIntake]);

  const globalActiveBookings = useMemo(() => {
    return bookings.filter(b => 
      b.status !== 'Completed' && 
      b.status !== 'Declined'
    );
  }, [bookings]);

  const handleIntakeSubmit = async (data: IntakeData) => {
    setIsTyping(true);
    setLastIntake(data);
    try {
      // Call the backend API instead of directly calling Gemini
      const response = await analyzeTriageViaAPI(data);
      
      if (!response.success) {
        // Show user-friendly error message based on error type
        const errorMessage = getUserFriendlyErrorMessage(response.errorType);
        alert(`Unable to analyze symptoms: ${errorMessage}`);
        if (process.env.NODE_ENV !== 'production') {
          console.error('[APP] Triage analysis failed:', response.errorType, response.error);
        }
        return;
      }

      // Process successful response
      setCurrentTriage(response.data);
      setShowRecommendations(true);
      if (view === 'split-view') setPatientSubView('dashboard');
      else setView('dashboard');
      setActiveTab('account');
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      alert(`Error: ${errorMessage}`);
      if (process.env.NODE_ENV !== 'production') {
        console.error('[APP] Intake submission error:', error);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleBookClick = (facility: Facility) => {
    if (!lastIntake) {
      alert("Please complete the intake form first.");
      return;
    }
    
    if (activeBookingForPatient) {
      alert(`You already have an active appointment at ${activeBookingForPatient.facilityName}. You must cancel your current appointment before booking another facility.`);
      return;
    }

    setSelectedFacilityForBooking(facility);
    setBookingDate(lastIntake.preferredDate || today);
    setBookingTime(lastIntake.preferredTimeSlot || '08:00 AM');
    setBookingMode(lastIntake.consultationMode || 'In-Person');
    setIsReferralBooking(null);
  };

  const handleReferralBookClick = (booking: Booking) => {
    const targetFacility = facilities.find(f => f.id === booking.facilityId);
    if (!targetFacility) return;

    setSelectedFacilityForBooking(targetFacility);
    setBookingDate(today);
    setBookingTime('08:00 AM');
    setBookingMode('In-Person');
    setIsReferralBooking(booking.id);
  };

  const confirmBooking = () => {
    if (!selectedFacilityForBooking || !lastIntake) return;

    if (isReferralBooking) {
      setBookings(prev => prev.map(b => 
        b.id === isReferralBooking 
          ? { 
              ...b, 
              date: bookingDate, 
              timeSlot: bookingTime, 
              detailedStatus: 'Awaiting Assessment', 
              consultationMode: 'In-Person' 
            } 
          : b
      ));
      alert(`Referral appointment scheduled.`);
    } else {
      const newBooking: Booking = {
        id: Math.random().toString(36).substr(2, 9),
        facilityId: selectedFacilityForBooking.id,
        facilityName: selectedFacilityForBooking.name,
        date: bookingDate,
        timeSlot: bookingTime,
        status: 'Pending',
        detailedStatus: 'Awaiting Assessment',
        patientName: `${lastIntake.firstName} ${lastIntake.lastName}`,
        patientBarangay: lastIntake.barangay,
        patientBirthDate: lastIntake.birthDate,
        patientSex: lastIntake.sex,
        triageLevel: currentTriage?.triageLevel || TriageLevel.ROUTINE,
        concern: lastIntake.primaryConcern,
        isFollowUp: lastIntake.isFollowUp,
        consultationMode: bookingMode,
        symptoms: lastIntake.symptoms,
        additionalDetails: lastIntake.additionalDetails,
        isSharedWithNetwork: true,
      };

      setBookings([newBooking, ...bookings]);
    }
    
    setSelectedFacilityForBooking(null);
    setIsReferralBooking(null);
  };

  const cancelBooking = (id: string) => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      setBookings(prev => prev.filter(b => b.id !== id));
    }
  };

  const updateBookingStatus = (id: string, status: 'Pending' | 'Approved' | 'Declined' | 'Completed', postData?: Partial<Booking>) => {
    setBookings(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, status, ...postData } : b);
      return updated;
    });
  };

  const updateFacility = (id: string, updates: Partial<Facility>) => {
    setFacilities(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  // --- REFINED PDF GENERATION UTILITY ---

  const generateStandardPDF = (title: string, booking: Booking, contentBuilder: (doc: jsPDF) => void) => {
    const doc = new jsPDF();
    const facilityName = booking.facilityName || "Naga Health Facility";
    const patientAge = calculateAge(booking.patientBirthDate);
    const dateStr = booking.completionDate || booking.date || new Date().toISOString().split('T')[0];

    // Standard Header - Professional Format
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Republic of the Philippines", 105, 15, { align: "center" });
    doc.text("Province of Camarines Sur", 105, 20, { align: "center" });
    doc.text("CITY HEALTH OFFICE, NAGA CITY", 105, 25, { align: "center" });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(facilityName.toUpperCase(), 105, 32, { align: "center" });
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, 36, 190, 36);

    // Document Title & Date
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, 105, 48, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date Issued: ${dateStr}`, 155, 55);

    // Patient Info Block
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PATIENT INFORMATION", 20, 65);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${booking.patientName.toUpperCase()}`, 20, 72);
    doc.text(`Age/Sex: ${patientAge} / ${booking.patientSex}`, 20, 78);
    doc.text(`Address: Brgy. ${booking.patientBarangay}, Naga City`, 20, 84);

    doc.line(20, 90, 190, 90);

    // Dynamic Body Content
    contentBuilder(doc);

    // Standard Footer - MD Signature
    const footerY = 240;
    doc.line(130, footerY - 5, 190, footerY - 5);
    
    doc.setFont("helvetica", "bold");
    doc.text("DR. JOHN BONGAT, MD", 160, footerY, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Medical Officer IV", 160, footerY + 5, { align: "center" });
    doc.text("License No: 0123456", 160, footerY + 10, { align: "center" });
    doc.text("PTR No: 9876543", 160, footerY + 15, { align: "center" });
    
    doc.setFont("courier", "italic");
    doc.setFontSize(8);
    doc.text("[DIGITALLY SIGNED]", 160, footerY - 8, { align: "center" });

    doc.save(`${title.replace(/\s+/g, '_')}_${booking.patientName}.pdf`);
  };

  const downloadMedicalCertificate = (booking: Booking) => {
    generateStandardPDF("MEDICAL CERTIFICATE", booking, (doc) => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("TO WHOM IT MAY CONCERN:", 20, 105);
      
      const bodyText = `This is to certify that the above-named patient was seen and examined at this facility on ${booking.completionDate || booking.date} with the following clinical findings:`;
      const splitBody = doc.splitTextToSize(bodyText, 170);
      doc.text(splitBody, 20, 115);

      doc.setFont("helvetica", "bold");
      doc.text("DIAGNOSIS:", 20, 135);
      doc.setFont("helvetica", "normal");
      doc.text(booking.diagnosis || "General Consultation / Routine Check-up", 50, 135);

      doc.setFont("helvetica", "bold");
      doc.text("RECOMMENDATIONS:", 20, 150);
      doc.setFont("helvetica", "normal");
      const recText = booking.nonPharma || "Patient is advised rest and to follow the prescribed medication regimen.";
      const splitRec = doc.splitTextToSize(recText, 170);
      doc.text(splitRec, 20, 158);

      doc.text("This certification is being issued upon request of the patient for whatever medical/legal purpose it may serve.", 20, 190);
    });
  };

  const downloadPrescription = (booking: Booking) => {
    generateStandardPDF("PRESCRIPTION (Rx)", booking, (doc) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("Rx", 20, 105);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      
      if (booking.prescriptions && booking.prescriptions.length > 0) {
        booking.prescriptions.forEach((p, i) => {
          const yPos = 120 + (i * 20);
          doc.setFont("helvetica", "bold");
          doc.text(`${p.drugName} ${p.strength}`, 30, yPos);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.text(`Sig: ${p.dose} ${p.frequency} for ${p.duration}`, 30, yPos + 6);
          doc.text(`Qty: ${p.quantity}`, 160, yPos);
          doc.setFontSize(11);
        });
      } else {
        doc.text("No medications prescribed.", 30, 120);
      }

      if (booking.nonPharma) {
        doc.setFont("helvetica", "bold");
        doc.text("Special Instructions:", 20, 200);
        doc.setFont("helvetica", "normal");
        const splitAdvice = doc.splitTextToSize(booking.nonPharma, 170);
        doc.text(splitAdvice, 20, 208);
      }
    });
  };

  const downloadLabRequest = (booking: Booking) => {
    generateStandardPDF("LABORATORY REQUEST", booking, (doc) => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TEST(S) REQUESTED:", 20, 105);
      
      doc.setFont("helvetica", "normal");
      const labs = booking.requestedLabs || "Routine Examination";
      
      labs.split(',').forEach((lab, i) => {
        const y = 115 + (i * 10);
        doc.rect(20, y - 4, 5, 5); // Checkbox
        doc.text(lab.trim(), 28, y);
      });

      doc.setFont("helvetica", "bold");
      doc.text("CLINICAL INDICATION:", 20, 180);
      doc.setFont("helvetica", "normal");
      doc.text(booking.diagnosis || "For further clinical evaluation", 20, 188);

      doc.setFontSize(9);
      doc.text("Note: Fasting may be required for blood chemistry. Please present this at the laboratory counter.", 20, 210);
    });
  };

  const handleProviderReferral = (original: Booking, target: Facility, note: string) => {
    const newBooking: Booking = {
      ...original,
      id: Math.random().toString(36).substr(2, 9),
      facilityId: target.id,
      facilityName: target.name,
      status: 'Pending',
      detailedStatus: 'Awaiting Patient Booking',
      referralFromFacilityId: original.facilityId,
      referralNote: note,
      consentRequested: false,
      isSharedWithNetwork: true,
      date: 'N/A',
      timeSlot: 'N/A'
    };
    setBookings([newBooking, ...bookings]);
  };

  const renderBookingModal = () => {
    if (!selectedFacilityForBooking) return null;
    const timeSlots = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-mynaga overflow-hidden shadow-2xl border dark:border-dark-border">
          <div className="p-6 bg-naga-purple text-white flex justify-between items-start">
            <div>
              <h3 className="text-xl font-black uppercase">Confirm Appointment</h3>
              <p className="text-[10px] font-bold text-white/70 uppercase mt-1">{selectedFacilityForBooking.name}</p>
            </div>
            <button onClick={() => setSelectedFacilityForBooking(null)} className="text-white/60 hover:text-white"><i className="fa-solid fa-xmark text-lg"></i></button>
          </div>
          <div className="p-6 space-y-4">
             <input type="date" min={today} value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-dark-bg border dark:border-dark-border rounded-xl font-bold dark:text-white" />
             <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {timeSlots.map(slot => (
                  <button key={slot} onClick={() => setBookingTime(slot)} className={`py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${bookingTime === slot ? 'bg-naga-purple text-white border-naga-purple' : 'bg-white dark:bg-dark-card text-naga-text dark:text-white border-slate-50 dark:border-dark-border'}`}>{slot}</button>
                ))}
             </div>
             <button onClick={confirmBooking} className="w-full py-4 bg-naga-orange text-white font-black uppercase rounded-2xl shadow-lg">Confirm Appointment</button>
          </div>
        </div>
      </div>
    );
  };

  const renderFacilityPicker = (onBack?: () => void) => {
    return (
      <div className="p-10 text-center animate-fadeIn relative">
         {onBack && (
           <button onClick={onBack} className="absolute top-6 left-6 w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-bg text-slate-500 hover:scale-110 transition-all flex items-center justify-center shadow-sm">
             <i className="fa-solid fa-arrow-left"></i>
           </button>
         )}
         <div className="mb-8 mt-4">
            <h2 className="text-3xl font-black uppercase text-naga-text dark:text-white">Staff Portal</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select Facility to Manage Queue</p>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {facilities.map(f => {
              let colorBase = 'naga-purple';
              let iconColor = 'text-naga-purple';
              if (f.id === 'ncgh-1') {
                colorBase = 'naga-orange';
                iconColor = 'text-naga-orange';
              } else if (f.id === 'cho-1' || f.id === 'cho-2') {
                colorBase = 'naga-yellow';
                iconColor = 'text-naga-yellow';
              }

              const isSelected = selectedStaffFacilityId === f.id;

              return (
                <button 
                  key={f.id} 
                  onClick={() => setSelectedStaffFacilityId(f.id)} 
                  className={`p-6 bg-white dark:bg-dark-card rounded-mynaga border shadow-sm text-left hover:shadow-md transition-all group ${isSelected ? `border-${colorBase} ring-2 ring-${colorBase}/10` : 'border-slate-100 dark:border-dark-border'}`}
                >
                   <div className={`w-10 h-10 rounded-xl bg-slate-50 dark:bg-dark-bg flex items-center justify-center ${iconColor} mb-4 group-hover:bg-${colorBase} group-hover:text-white transition-colors`}>
                      <i className={`fa-solid ${f.type === 'Public Hospital' ? 'fa-hospital' : 'fa-house-medical'}`}></i>
                   </div>
                   <h3 className="font-black uppercase text-sm leading-tight line-clamp-2">{f.name}</h3>
                   <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">{f.type === 'BHC' ? 'Health Station' : f.type}</p>
                </button>
              );
            })}
         </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const patientName = lastIntake ? `${lastIntake.firstName} ${lastIntake.lastName}` : 'Guest Patient';
    const activeBookings = bookings.filter(b => b.patientName === patientName && b.status !== 'Completed' && b.status !== 'Declined' && b.detailedStatus !== 'Awaiting Patient Booking');
    const pendingReferrals = bookings.filter(b => b.patientName === patientName && b.detailedStatus === 'Awaiting Patient Booking');
    const emrRecords = bookings.filter(b => b.patientName === patientName && b.status === 'Completed');
    
    return (
      <div className="max-w-4xl mx-auto px-4 pt-10 pb-32 animate-fadeIn min-h-screen">
        <header className="flex justify-between items-center mb-10">
           <div className="flex items-center gap-4">
              <button onClick={() => setView('home')} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-bg text-slate-500 hover:scale-110 transition-all flex items-center justify-center shadow-sm">
                <i className="fa-solid fa-arrow-left"></i>
              </button>
              <div>
                <h1 className="text-3xl font-black text-naga-purple dark:text-white uppercase tracking-tight">Health Dashboard</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Naga Health Network Record</p>
              </div>
           </div>
           <button onClick={() => { if(view === 'split-view') setPatientSubView('intake'); else setView('intake'); }} className="bg-naga-orange text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg">New Consultation</button>
        </header>

        <div className="space-y-10">
          {/* Triage Recommendation Section */}
          {showRecommendations && currentTriage && (
            <section className="animate-fadeIn">
               <div className="bg-naga-purple text-white p-8 rounded-[2.5rem] shadow-2xl mb-8 relative overflow-hidden border border-white/10">
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-[1.25rem] flex items-center justify-center backdrop-blur-md shadow-inner">
                          <i className="fa-solid fa-robot text-2xl"></i>
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Triage Intelligence Analysis</h3>
                          <div className="flex items-center gap-3">
                             <p className="text-lg font-black uppercase tracking-tight">
                               Level: <span className="text-naga-orange">{currentTriage.triageLevel}</span>
                             </p>
                             <div className="h-4 w-px bg-white/20"></div>
                             <div className="flex items-center gap-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Severity Index:</p>
                                <span className="bg-cyan-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-black shadow-lg shadow-cyan-500/30">
                                   {currentTriage.urgencyScore}/10
                                </span>
                             </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 max-w-xs space-y-2">
                        <div className="flex justify-between items-end">
                           <p className="text-[8px] font-black uppercase tracking-widest text-white/50">Clinical Priority Meter</p>
                           <p className="text-[10px] font-black text-cyan-400">{(currentTriage.urgencyScore / 10 * 100).toFixed(0)}%</p>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                           <div 
                              className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-1000 ease-out"
                              style={{ width: `${(currentTriage.urgencyScore / 10) * 100}%` }}
                           ></div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-base font-medium leading-relaxed italic border-l-4 border-naga-orange pl-5 py-2 mb-6 bg-white/5 rounded-r-2xl">
                       "{currentTriage.explanation}"
                    </p>

                    <div className="p-5 bg-white/10 rounded-[1.5rem] border border-white/10 backdrop-blur-sm">
                      <p className="text-[10px] font-black uppercase text-white/40 mb-2 tracking-widest">Recommended Action</p>
                      <p className="text-xs font-bold leading-relaxed">{currentTriage.actionPlan}</p>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-naga-orange/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
               </div>

               <h3 className="font-black text-[10px] uppercase text-slate-400 mb-6 tracking-[0.2em] flex items-center gap-2">
                  <i className="fa-solid fa-star text-naga-orange"></i> Precision Matched Facilities
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {recommendedFacilities.map(f => (
                    <FacilityCard 
                      key={f.id} 
                      facility={f} 
                      isRecommended={true} 
                      onBook={handleBookClick} 
                      isBooked={activeBookingForPatient?.facilityId === f.id} 
                      isGlobalBookingActive={!!activeBookingForPatient} 
                    />
                  ))}
               </div>
            </section>
          )}

          {/* Pending Referrals Notification Section */}
          {pendingReferrals.length > 0 && (
            <section className="animate-fadeIn">
               <h3 className="font-black text-[10px] uppercase text-naga-orange mb-6 tracking-[0.2em] flex items-center gap-2">
                  <i className="fa-solid fa-share-nodes text-naga-orange"></i> Referrals Awaiting Booking
               </h3>
               <div className="space-y-4">
                 {pendingReferrals.map(b => (
                    <div key={b.id} className="p-6 bg-orange-50 dark:bg-orange-950/20 rounded-[2rem] border-2 border-naga-orange/20 shadow-md flex flex-col md:flex-row justify-between md:items-center gap-4 animate-pulse">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-naga-orange rounded-2xl flex items-center justify-center text-white shadow-lg">
                             <i className="fa-solid fa-hospital-user"></i>
                          </div>
                          <div>
                             <p className="text-[10px] font-black uppercase text-naga-orange mb-0.5">Recommended Referral</p>
                             <h4 className="font-black text-sm uppercase">{b.facilityName}</h4>
                             <p className="text-[9px] font-medium text-slate-500 italic">"Referral note: {b.referralNote || 'Please schedule your consultation here.'}"</p>
                          </div>
                       </div>
                       <button 
                        onClick={() => handleReferralBookClick(b)}
                        className="px-8 py-3 bg-naga-orange text-white font-black text-[10px] uppercase rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                       >
                         Book Appointment Now
                       </button>
                    </div>
                 ))}
               </div>
            </section>
          )}

          <section>
            <h3 className="font-black text-[10px] uppercase text-slate-400 mb-6 tracking-[0.2em] flex items-center gap-2">
               <i className="fa-solid fa-calendar-check text-naga-purple"></i> Active Appointments
            </h3>
            <div className="space-y-4">
              {activeBookings.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-dark-card rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-dark-border opacity-50">
                  <p className="text-[10px] font-black uppercase">No active appointments</p>
                </div>
              ) : (
                activeBookings.map(b => (
                  <div key={b.id} className="p-6 bg-white dark:bg-dark-card rounded-[2rem] border border-slate-100 dark:border-dark-border shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-naga-purple/10 rounded-2xl flex items-center justify-center text-naga-purple">
                        <i className={`fa-solid ${b.consultationMode === 'Telemedicine' ? 'fa-video' : 'fa-house-medical'}`}></i>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-naga-purple">{b.facilityName}</p>
                        <h4 className="font-black text-sm uppercase">{b.concern}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{b.date} • {b.timeSlot}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="px-4 py-1.5 bg-orange-100 dark:bg-orange-950/20 text-orange-600 text-[10px] font-black uppercase rounded-full">{b.status}</span>
                       <button onClick={() => cancelBooking(b.id)} className="w-10 h-10 rounded-xl border border-rose-100 text-rose-500 flex items-center justify-center hover:bg-rose-50"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <h3 className="font-black text-[10px] uppercase text-slate-400 mb-6 tracking-[0.2em] flex items-center gap-2">
               <i className="fa-solid fa-folder-open text-naga-purple"></i> Full Medical History / EMR
            </h3>
            {emrRecords.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-dark-card rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-dark-border opacity-50">
                <p className="text-[10px] font-black uppercase">No clinical records found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {emrRecords.map(b => (
                  <div key={b.id} className="bg-white dark:bg-dark-card rounded-[2.5rem] border border-slate-100 dark:border-dark-border shadow-md overflow-hidden animate-fadeIn">
                    <div className="p-6 bg-slate-50 dark:bg-dark-bg/50 border-b flex justify-between items-center">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{b.completionDate || b.date}</p>
                          <h4 className="text-lg font-black text-naga-text dark:text-white uppercase leading-tight">{b.diagnosis || "General Consultation"}</h4>
                       </div>
                       <div className="text-right">
                          <p className="text-[9px] font-black text-naga-purple uppercase">{b.facilityName}</p>
                       </div>
                    </div>
                    <div className="p-8 space-y-6">
                       {b.vitals && (
                         <div className="grid grid-cols-5 gap-2">
                            {Object.entries(b.vitals).map(([key, val]) => (
                               <div key={key} className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-center">
                                  <p className="text-[8px] font-black uppercase text-indigo-400 mb-0.5">{key}</p>
                                  <p className="text-xs font-black dark:text-white">{val}</p>
                               </div>
                            ))}
                         </div>
                       )}
                       <div className="grid md:grid-cols-2 gap-6">
                          <div>
                             <h5 className="text-[9px] font-black uppercase text-slate-400 mb-2">Findings</h5>
                             <p className="text-xs font-medium text-slate-600 dark:text-slate-400 italic leading-relaxed border-l-2 border-slate-200 pl-3">
                                {b.peFindings || "No physical findings recorded."}
                             </p>
                          </div>
                          <div>
                             <h5 className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Treatment Plan</h5>
                             <div className="space-y-2">
                                {b.prescriptions && b.prescriptions.length > 0 ? b.prescriptions.map((p, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-[11px] p-2 bg-slate-50 dark:bg-dark-bg/30 rounded-xl border border-slate-100">
                                     <span className="font-bold">{p.drugName} {p.strength}</span>
                                     <span className="text-slate-400 font-black text-[9px]">{p.quantity}</span>
                                  </div>
                                )) : <p className="text-[10px] text-slate-400 italic">None prescribed.</p>}
                             </div>
                             {b.nonPharma && (
                               <div className="mt-3 p-3 bg-slate-50 dark:bg-dark-bg/30 rounded-xl border border-slate-100">
                                  <h6 className="text-[8px] font-black text-slate-400 uppercase mb-1">Doctor's Advice</h6>
                                  <p className="text-[10px] font-medium leading-relaxed">{b.nonPharma}</p>
                               </div>
                             )}
                          </div>
                       </div>
                       <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-3">
                          <button onClick={() => downloadMedicalCertificate(b)} className="flex-1 min-w-[120px] py-3.5 bg-naga-purple text-white text-[10px] font-black uppercase rounded-2xl shadow-lg hover:scale-[1.02] transition-all">Med Cert</button>
                          <button onClick={() => downloadPrescription(b)} className="flex-1 min-w-[120px] py-3.5 bg-naga-orange text-white text-[10px] font-black uppercase rounded-2xl shadow-lg hover:scale-[1.02] transition-all">Prescription</button>
                          {b.requestedLabs && (
                            <button onClick={() => downloadLabRequest(b)} className="flex-1 min-w-[120px] py-3.5 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-2xl shadow-lg hover:scale-[1.02] transition-all">Lab Request</button>
                          )}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''} bg-slate-50 dark:bg-dark-bg transition-colors duration-300`}>
      {view === 'home' && (
        <HomeView 
          onStartTriage={() => setView('intake')} 
          onStartTelemedicine={() => setView('telemedicine')}
          onStaffLogin={() => setView('provider-hub')}
          onLGULogin={() => setView('lgu-portal')}
          onSplitView={() => { setView('split-view'); setPatientSubView('home'); }}
        />
      )}
      
      {view === 'intake' && (
        <div className="pt-10 pb-32 max-w-xl mx-auto px-4 relative">
          <div className="sticky top-4 z-40 mb-10">
            <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-2xl border border-white dark:border-dark-border flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <button onClick={() => setView('home')} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-bg text-slate-500 hover:scale-110 transition-all flex items-center justify-center shadow-sm">
                    <i className="fa-solid fa-arrow-left text-sm"></i>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-naga-purple rounded-2xl flex items-center justify-center text-white shadow-xl shadow-naga-purple/20">
                      <i className="fa-solid fa-notes-medical text-lg"></i>
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase text-naga-text dark:text-white leading-none mb-1">Health Navigator</h3>
                      <p className="text-[9px] font-bold text-naga-purple uppercase tracking-[0.2em]">{globalActiveBookings.length} Active Services</p>
                    </div>
                  </div>
               </div>
               <button 
                onClick={() => { setView('dashboard'); setActiveTab('account'); }}
                className="px-6 py-3 bg-naga-orange text-white text-[10px] font-black uppercase rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
               >
                 Dashboard
               </button>
            </div>
          </div>

          <div className="mb-10 space-y-4 px-2">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-naga-orange rounded-full"></div>
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Live Queue</h4>
               </div>
            </div>

            {globalActiveBookings.length > 0 ? (
              <div className="space-y-3">
                {globalActiveBookings.map(b => (
                  <div key={b.id} className="bg-naga-purple text-white p-5 rounded-[2rem] shadow-xl flex items-center justify-between relative overflow-hidden group border border-white/10">
                    <div className="flex items-center gap-4 relative z-10">
                       <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                          <i className={`fa-solid ${b.consultationMode === 'Telemedicine' ? 'fa-video' : 'fa-house-medical'} text-sm`}></i>
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-white/50 tracking-widest leading-none mb-1">Session: {b.split === true ? '(Remote)' : ''} {b.facilityName}</p>
                          <h5 className="text-xs font-black uppercase tracking-tight">{b.concern}</h5>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 relative z-10">
                       <button onClick={() => cancelBooking(b.id)} className="w-9 h-9 bg-rose-500 rounded-lg text-white flex items-center justify-center"><i className="fa-solid fa-trash-can text-xs"></i></button>
                       <button onClick={() => { setView('dashboard'); setActiveTab('account'); }} className="px-4 py-2 bg-white text-naga-purple rounded-lg text-[10px] font-black uppercase">Status</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-white dark:bg-dark-card rounded-[2rem] border border-slate-100 dark:border-dark-border flex items-center justify-between shadow-sm opacity-60">
                 <p className="text-[10px] font-bold text-slate-400 uppercase">No active appointments</p>
                 <div className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Network Ready
                 </div>
              </div>
            )}
          </div>

          <IntakeForm onSubmit={handleIntakeSubmit} isLoading={isTyping} bookings={bookings} />
        </div>
      )}

      {view === 'dashboard' && renderDashboard()}

      {view === 'telemedicine' && (
        <TelemedicineView 
          onEndCall={() => setView('dashboard')} 
          patientName={lastIntake ? `${lastIntake.firstName} ${lastIntake.lastName}` : undefined}
        />
      )}

      {view === 'provider-hub' && (
        selectedStaffFacilityId ? (
          <ProviderHub 
            facility={staffFacility!}
            bookings={bookings}
            onUpdateBooking={updateBookingStatus}
            onUpdateFacility={(updates) => updateFacility(selectedStaffFacilityId!, updates)}
            onClose={() => {
              setSelectedStaffFacilityId(null);
            }}
            onRefer={handleProviderReferral}
          />
        ) : renderFacilityPicker(() => setView('home'))
      )}

      {view === 'lgu-portal' && (
        <LGUPortal bookings={bookings} onClose={() => setView('home')} />
      )}

      {view === 'split-view' && (
        <div className="flex h-screen overflow-hidden animate-fadeIn bg-slate-100 dark:bg-dark-bg">
          <div className="w-1/2 border-r-4 border-naga-purple/20 overflow-y-auto bg-white dark:bg-dark-bg">
            <div className="p-6 border-b border-slate-100 bg-white dark:bg-dark-bg sticky top-0 z-[60] flex items-center justify-between backdrop-blur-md bg-opacity-90">
               <div className="flex items-center gap-3">
                  <button onClick={() => setView('home')} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-dark-card text-slate-400 hover:text-naga-purple transition-all flex items-center justify-center shadow-sm">
                    <i className="fa-solid fa-arrow-left text-[10px]"></i>
                  </button>
                  <h2 className="text-sm font-black uppercase tracking-widest text-naga-purple">Patient Console</h2>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => setPatientSubView('home')} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${patientSubView === 'home' ? 'bg-naga-purple text-white' : 'bg-white border dark:bg-dark-card'}`}>Home</button>
                  <button onClick={() => setPatientSubView('intake')} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${patientSubView === 'intake' ? 'bg-naga-purple text-white' : 'bg-white border dark:bg-dark-card'}`}>Intake</button>
                  <button onClick={() => setPatientSubView('dashboard')} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${patientSubView === 'dashboard' ? 'bg-naga-purple text-white' : 'bg-white border dark:bg-dark-card'}`}>History</button>
               </div>
            </div>
            {patientSubView === 'home' && <HomeView onStartTriage={() => setPatientSubView('intake')} onStartTelemedicine={() => setPatientSubView('telemedicine')} />}
            {patientSubView === 'intake' && (
              <div className="p-8">
                <IntakeForm onSubmit={handleIntakeSubmit} isLoading={isTyping} bookings={bookings} />
              </div>
            )}
            {patientSubView === 'dashboard' && renderDashboard()}
          </div>

          <div className="w-1/2 overflow-y-auto bg-slate-50 dark:bg-dark-card">
            <div className="p-6 border-b border-slate-100 dark:border-dark-border bg-white dark:bg-dark-bg sticky top-0 z-[60] backdrop-blur-md bg-opacity-90">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setView('home')} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-dark-card text-slate-400 hover:text-naga-orange transition-all flex items-center justify-center shadow-sm">
                      <i className="fa-solid fa-arrow-left text-[10px]"></i>
                    </button>
                    <h2 className="text-sm font-black uppercase tracking-widest text-naga-orange">Provider Hub</h2>
                  </div>
                  <button onClick={() => setView('home')} className="px-4 py-2 bg-naga-orange text-white text-[10px] font-black uppercase rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all">Exit Split View</button>
               </div>
            </div>
             {selectedStaffFacilityId ? (
              <ProviderHub 
                facility={staffFacility!}
                bookings={bookings}
                onUpdateBooking={updateBookingStatus}
                onUpdateFacility={(updates) => updateFacility(selectedStaffFacilityId!, updates)}
                onClose={() => setSelectedStaffFacilityId(null)}
                onRefer={handleProviderReferral}
                hideHeader={true}
              />
            ) : renderFacilityPicker(() => setView('home'))}
          </div>
        </div>
      )}

      {view !== 'telemedicine' && view !== 'provider-hub' && view !== 'lgu-portal' && view !== 'split-view' && (
        <BottomNav activeTab={activeTab} onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'home') setView('home');
          if (tab === 'account') setView('dashboard');
        }} />
      )}
      {renderBookingModal()}
    </div>
  );
};

export default App;
