
import React from 'react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'fa-house', functional: true },
    { id: 'services', label: 'Services', icon: 'fa-cubes' },
    { id: 'news', label: 'News', icon: 'fa-file-lines' },
    { id: 'emergency', label: 'Emergency', icon: 'fa-triangle-exclamation' },
    { id: 'account', label: 'Account', icon: 'fa-circle-user' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-card bottom-nav-shadow px-2 pt-3 pb-6 flex justify-around items-center z-50 transition-colors duration-300">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            if (tab.functional) onTabChange(tab.id);
          }}
          className={`flex flex-col items-center gap-1 transition-all ${!tab.functional ? 'opacity-30 cursor-not-allowed grayscale' : activeTab === tab.id ? 'text-naga-orange' : 'text-slate-400 dark:text-dark-muted hover:text-slate-600 dark:hover:text-white'}`}
          disabled={!tab.functional}
        >
          <div className={`text-lg transition-transform ${activeTab === tab.id && tab.functional ? 'scale-110' : ''}`}>
            <i className={`fa-solid ${tab.icon}`}></i>
          </div>
          <span className={`text-[10px] font-bold ${activeTab === tab.id ? 'opacity-100' : 'opacity-80'}`}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
