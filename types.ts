
export enum TriageLevel {
  EMERGENCY = 'Emergency',
  URGENT = 'Urgent',
  ROUTINE = 'Routine'
}

export interface PrescribedDrug {
  drugName: string;
  strength: string;
  dose: string;
  frequency: string;
  duration: string;
  quantity: string;
}

export interface Facility {
  id: string;
  name: string;
  type: 'BHC' | 'Public Hospital' | 'Private Hospital' | 'Clinic';
  services: string[];
  specializedServices?: string[];
  contactPersonnel?: string;
  philHealthSupported: boolean;
  distanceKm: number;
  baseCost: 'Free' | 'Low' | 'Moderate' | 'High';
  currentCongestion: number;
  waitingTimeMinutes: number;
  contactNumber?: string;
  operatingHours?: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface Booking {
  id: string;
  facilityId: string;
  facilityName: string;
  date: string;
  timeSlot: string;
  status: 'Pending' | 'Approved' | 'Declined' | 'Completed';
  // FIX: Added 'Awaiting Patient Booking' to support the referral workflow state
  detailedStatus?: 'Awaiting Assessment' | 'Assessment in Progress' | 'Awaiting Doctor' | 'In Consultation Call' | 'Discharging' | 'Awaiting Patient Booking';
  patientName: string;
  patientBarangay: string;
  patientBirthDate: string;
  patientSex: 'Male' | 'Female' | 'Other';
  triageLevel: TriageLevel;
  concern: string;
  isFollowUp?: boolean;
  consultationMode: 'In-Person' | 'Telemedicine';
  symptoms?: string[];
  additionalDetails?: string;
  // Timing data for average wait calculations
  consultationStartTime?: string;
  consultationEndTime?: string;
  // Provider clinical data
  vitals?: {
    bp: string;
    hr: string;
    rr: string;
    o2sat: string;
    temp: string;
  };
  peFindings?: string;
  // Post-consultation data
  diagnosis?: string;
  treatment?: string;
  prescriptions?: PrescribedDrug[];
  requestedLabs?: string;
  nonPharma?: string;
  followUpDate?: string;
  completionDate?: string;
  isSharedWithNetwork?: boolean;
  // Referral & Consent fields
  referralFromFacilityId?: string;
  referralToFacilityId?: string;
  referralNote?: string;
  consentRequested?: boolean;
  // Denial fields
  denialReason?: string;
  denialInstructions?: string;
}

export interface TriageResult {
  triageLevel: TriageLevel;
  urgencyScore: number;
  explanation: string;
  recommendedFacilityIds: string[];
  institutionalWin: string;
  actionPlan: string;
  bookingContact: {
    name: string;
    phone: string;
    scheduleNotes: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  triageData?: TriageResult;
}

export interface IntakeData {
  patientType: 'Adult' | 'Child' | 'Pregnant';
  primaryConcern: string;
  selectedFacilityId?: string;
  lastName: string;
  firstName: string;
  birthDate: string;
  sex: 'Male' | 'Female' | 'Other';
  barangay: string;
  symptoms: string[];
  otherSymptom?: string;
  isFollowUp: boolean;
  conditionStatus?: 'Improved' | 'Unchanged' | 'Worsened';
  medicationStatus?: 'Finished' | 'Ongoing' | 'Did not take';
  prescriptionImage?: string;
  labResultsImage?: string;
  hasPhilHealth: boolean;
  philHealthPIN?: string;
  additionalDetails: string;
  consultationMode: 'In-Person' | 'Telemedicine';
  preferredDate?: string;
  preferredTimeSlot?: string;
  mobile?: string;
}