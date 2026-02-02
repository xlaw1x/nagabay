
import React from 'react';

interface HomeViewProps {
  onStartTriage: () => void;
  onStartTelemedicine: () => void;
  onStaffLogin?: () => void;
  onLGULogin?: () => void;
  onSplitView?: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onStartTriage, onStartTelemedicine, onStaffLogin, onLGULogin, onSplitView }) => {
  const menuItems = [
    { label: 'Services', icon: 'fa-gears', color: 'text-naga-orange', bg: 'bg-rose-50', darkBg: 'dark:bg-rose-950/20', functional: false },
    { label: 'Citizen Guide', icon: 'fa-address-card', color: 'text-naga-orange', bg: 'bg-rose-50', darkBg: 'dark:bg-rose-950/20', functional: false },
    { label: 'e-Services', icon: 'fa-globe', color: 'text-naga-orange', bg: 'bg-rose-50', darkBg: 'dark:bg-rose-950/20', functional: false },
    { label: 'Emergency', icon: 'fa-triangle-exclamation', color: 'text-naga-orange', bg: 'bg-rose-50', darkBg: 'dark:bg-rose-950/20', functional: false },
    { label: 'Students', icon: 'fa-graduation-cap', color: 'text-naga-orange', bg: 'bg-rose-50', darkBg: 'dark:bg-rose-950/20', functional: false },
    { label: 'Startup', icon: 'fa-rocket', color: 'text-naga-orange', bg: 'bg-rose-50', darkBg: 'dark:bg-rose-950/20', functional: false },
    { label: 'Business', icon: 'fa-chart-line', color: 'text-naga-orange', bg: 'bg-rose-50', darkBg: 'dark:bg-rose-950/20', functional: false },
    { label: 'Health', icon: 'fa-heart-pulse', color: 'text-naga-purple', bg: 'bg-purple-50', darkBg: 'dark:bg-purple-950/20', special: true, functional: true },
    { label: 'View All', icon: 'fa-plus', color: 'text-naga-orange', bg: 'bg-rose-50', darkBg: 'dark:bg-rose-950/20', functional: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg transition-colors duration-300">
      {/* Official MyNaga Branding Banner */}
      <div className="relative px-6 pt-6 pb-20 overflow-hidden bg-gradient-to-br from-[#fdf2f2] via-[#fff5f2] to-white dark:from-[#1e1b4b] dark:to-dark-bg">
        
        {/* NAGA Branding Graphics on Right */}
        <div className="absolute top-0 right-0 w-1/2 h-full pointer-events-none select-none">
          {/* Rotating Circular Text "kita ang naga" */}
          <div className="absolute top-4 right-14 w-28 h-28 animate-[spin_20s_linear_infinite] opacity-30">
             <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="transparent" />
                <text className="text-[10px] font-black uppercase tracking-widest fill-naga-orange">
                   <textPath xlinkHref="#circlePath"> kita ang naga • kita ang naga • kita ang naga • </textPath>
                </text>
             </svg>
          </div>
          
          {/* Precise MyNaga Logo Recreation */}
          <div className="absolute top-20 right-6 scale-75 sm:scale-100 origin-top-right">
             <div className="absolute -top-10 -left-10 w-24 h-24 bg-naga-orange rounded-full flex items-center justify-center shadow-xl z-20 border-4 border-white dark:border-dark-bg/20">
                <span className="text-white text-3xl font-black italic tracking-tighter">my</span>
             </div>
             <div className="grid grid-cols-2 gap-1.5">
                <div className="w-24 h-24 bg-naga-purple rounded-tl-[3.5rem] rounded-br-[3.5rem] flex items-center justify-center shadow-md border-b-4 border-black/10">
                   <span className="text-white text-7xl font-black">n</span>
                </div>
                <div className="w-24 h-24 bg-[#4dd0e1] rounded-tr-[3.5rem] rounded-bl-[3.5rem] flex items-center justify-center shadow-md border-b-4 border-black/10">
                   <span className="text-white text-7xl font-black">a</span>
                </div>
                <div className="w-24 h-24 bg-[#f05123] rounded-bl-[3.5rem] rounded-tr-[3.5rem] flex items-center justify-center shadow-md border-b-4 border-black/10">
                   <span className="text-white text-7xl font-black">g</span>
                </div>
                <div className="w-24 h-24 bg-[#fbc02d] rounded-br-[3.5rem] rounded-tl-[3.5rem] flex items-center justify-center shadow-md border-b-4 border-black/10">
                   <span className="text-white text-7xl font-black">a</span>
                </div>
             </div>
          </div>
        </div>

        {/* Top Header Section: Search & Notification */}
        <div className="relative z-30 flex items-center gap-3 mb-12">
          <div className="relative flex-1">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input 
              type="text" 
              placeholder='Search "Business Permit"'
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-dark-card rounded-full shadow-sm border border-slate-50 dark:border-dark-border outline-none transition-all placeholder:text-slate-400 font-bold text-sm dark:text-white"
              disabled
            />
          </div>
          <div className="relative">
            <button disabled className="w-11 h-11 bg-slate-100 dark:bg-dark-card rounded-full flex items-center justify-center text-slate-500 dark:text-white transition-all opacity-50 shadow-sm border border-white dark:border-dark-border">
              <i className="fa-regular fa-bell text-lg"></i>
            </button>
          </div>
        </div>

        {/* Big Greeting Heading */}
        <div className="relative z-20">
          <h1 className="text-[42px] font-black text-[#34265e] dark:text-white leading-[1.05] tracking-tight">
            Marhay na aga<br />Nagueño!
          </h1>
        </div>
      </div>

      {/* Main Action Content Area */}
      <div className="bg-white dark:bg-dark-bg rounded-t-[3rem] -mt-10 px-6 pt-10 relative z-30 min-h-[60vh] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.1)] transition-colors duration-300">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10">
          <h2 className="text-xl font-black text-naga-text dark:text-white tracking-tight">What would you like to do?</h2>
          <div className="flex flex-wrap gap-2">
             <button 
              onClick={onLGULogin}
              className="text-[9px] font-black bg-emerald-500 px-3 py-2 rounded-xl text-white uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <i className="fa-solid fa-chart-line"></i> LGU Trends
            </button>
             <button 
              onClick={onSplitView}
              className="text-[9px] font-black bg-naga-orange px-3 py-2 rounded-xl text-white uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              Split View
            </button>
            <button 
              onClick={onStaffLogin}
              className="text-[10px] font-black bg-slate-50 dark:bg-dark-card px-4 py-2.5 rounded-xl text-naga-purple dark:text-naga-orange uppercase tracking-widest border border-slate-200 dark:border-dark-border hover:bg-slate-100 transition-all shadow-sm"
            >
              Staff Portal
            </button>
          </div>
        </div>

        {/* Grid of services */}
        <div className="grid grid-cols-4 gap-y-10 gap-x-4 mb-12">
          {menuItems.map((item, idx) => (
            <button 
              key={idx} 
              onClick={() => {
                if (item.functional) onStartTriage();
              }}
              className={`flex flex-col items-center group transition-transform ${item.functional ? 'active:scale-90' : 'cursor-not-allowed opacity-80'}`}
              disabled={!item.functional}
            >
              <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.darkBg} flex items-center justify-center mb-2.5 shadow-sm transition-all ${item.functional ? 'group-hover:shadow-md group-hover:-translate-y-1' : ''} ${item.special ? 'ring-2 ring-naga-purple/20 dark:ring-naga-orange/20 ring-offset-2 dark:ring-offset-dark-bg' : ''}`}>
                <i className={`fa-solid ${item.icon} ${item.color} text-xl`}></i>
              </div>
              <span className={`text-[11px] font-extrabold text-center leading-tight tracking-tight ${item.functional ? (item.special ? 'text-naga-purple dark:text-white' : 'text-slate-600') : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Report / Improvement Card */}
        <div className="bg-naga-purple dark:bg-naga-blue rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-naga-purple/30">
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-1 leading-tight">Help us improve our city</h3>
            <p className="text-white/70 text-[13px] mb-8 max-w-[90%] font-medium leading-relaxed">
              Spotted an issue in your area? Contact us so we can fix it.
            </p>
            <div className="flex gap-3">
              <button disabled className="flex-1 bg-white text-naga-purple py-4 rounded-full text-xs font-black opacity-30 cursor-not-allowed">
                View Reports
              </button>
              <button disabled className="flex-1 bg-naga-orange text-white py-4 rounded-full text-xs font-black opacity-30 cursor-not-allowed">
                Report Issue
              </button>
            </div>
          </div>
          <div className="absolute top-[-40%] right-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-naga-orange/30 rounded-full blur-3xl"></div>
        </div>

        <div className="mt-16 text-center pb-12">
            <p className="text-[10px] text-naga-lightText dark:text-dark-muted font-black uppercase tracking-[0.2em] opacity-60">Naga City Government • 2025</p>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
