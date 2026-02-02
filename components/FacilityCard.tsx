
import React from 'react';
import { Facility } from '../types';

interface FacilityCardProps {
  facility: Facility;
  isRecommended: boolean;
  onBook?: (facility: Facility) => void;
  consultationMode?: 'In-Person' | 'Telemedicine';
  isBooked?: boolean;
  isGlobalBookingActive?: boolean;
}

const FacilityCard: React.FC<FacilityCardProps> = ({ 
  facility, 
  isRecommended, 
  onBook, 
  consultationMode, 
  isBooked,
  isGlobalBookingActive
}) => {
  const getButtonText = () => {
    if (isBooked) return 'Active Appointment';
    if (isGlobalBookingActive) return 'Locked: Active Booking';
    if (consultationMode === 'Telemedicine') return 'Book Telemedicine';
    if (consultationMode === 'In-Person') return 'Book In-Person';
    return 'Book Appointment';
  };

  const isBHS = facility.type === 'BHC';
  const isActionDisabled = isBooked || isGlobalBookingActive;

  return (
    <div className={`p-5 rounded-mynaga border transition-all duration-500 relative overflow-hidden ${isRecommended ? 'border-naga-purple dark:border-naga-orange ring-4 ring-purple-50 dark:ring-orange-900/10 bg-white dark:bg-dark-card naga-shadow' : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card opacity-90'}`}>
      <div className="absolute top-0 right-0 flex">
        {isBHS && (
          <div className="bg-emerald-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest border-l border-b border-emerald-600 shadow-sm">
            First Line
          </div>
        )}
        {isRecommended && (
          <div className="bg-naga-orange text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest ml-px">
            Best Match
          </div>
        )}
        {isBooked && (
          <div className="bg-indigo-600 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest ml-px">
            Active
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-extrabold text-naga-text dark:text-white text-lg leading-tight pr-12">
            {facility.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${facility.type === 'BHC' ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-dark-bg text-naga-lightText dark:text-dark-muted'}`}>
              {facility.type === 'BHC' ? 'Barangay Health Center' : facility.type}
            </span>
            <span className="text-[10px] font-bold text-naga-lightText dark:text-dark-muted uppercase tracking-tight">• {facility.distanceKm} km away</span>
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-slate-50 dark:bg-dark-bg/50 rounded-2xl border border-slate-100 dark:border-dark-border space-y-2">
        {facility.operatingHours && (
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-calendar-check text-[10px] text-naga-purple dark:text-naga-orange"></i>
            <p className="text-[10px] font-bold text-naga-text dark:text-white/80">{facility.operatingHours}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-user-doctor text-[10px] text-naga-purple dark:text-naga-orange"></i>
          <p className="text-[10px] font-bold text-naga-text dark:text-white/80 line-clamp-1">{facility.contactPersonnel || 'Available Staff'}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center text-naga-purple dark:text-white/70">
            <i className="fa-solid fa-clock-rotate-left text-xs"></i>
          </div>
          <div>
            <p className="text-[9px] font-black text-naga-lightText dark:text-dark-muted uppercase leading-none mb-0.5">Est. Wait</p>
            <p className="text-sm font-black text-naga-text dark:text-white">{facility.waitingTimeMinutes}m</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-naga-orange">
            <i className="fa-solid fa-tag text-xs"></i>
          </div>
          <div>
            <p className="text-[9px] font-black text-naga-lightText dark:text-dark-muted uppercase leading-none mb-0.5">Cost Profile</p>
            <p className="text-sm font-black text-naga-text dark:text-white">{facility.baseCost}</p>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex flex-wrap gap-1.5">
          {(facility.specializedServices || facility.services.slice(0, 2)).map(s => (
            <span key={s} className="text-[9px] font-bold bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border text-slate-500 dark:text-dark-muted px-2 py-1 rounded-lg">
              {s}
            </span>
          ))}
        </div>
      </div>

      <button 
        onClick={() => !isActionDisabled && onBook?.(facility)}
        disabled={isActionDisabled}
        className={`w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isBooked ? 'bg-indigo-600 text-white shadow-indigo-600/20' : isGlobalBookingActive ? 'bg-slate-200 text-slate-500 shadow-none' : isRecommended ? 'bg-naga-purple text-white shadow-naga-purple/20' : 'bg-slate-100 dark:bg-dark-card text-naga-text dark:text-white border border-slate-200 dark:border-dark-border shadow-none'}`}
      >
        <i className={`fa-solid ${isBooked ? 'fa-calendar-check' : isGlobalBookingActive ? 'fa-lock' : 'fa-calendar-plus'}`}></i>
        {getButtonText()}
      </button>
    </div>
  );
};

export default FacilityCard;
