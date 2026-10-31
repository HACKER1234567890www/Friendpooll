import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Vote, 
  Users, 
  History 
} from 'lucide-react';

export type NavTab = 'dashboard' | 'contributions' | 'proposals' | 'members' | 'audit';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  openProposalsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  openProposalsCount,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contributions', label: 'Ledger', icon: ReceiptText },
    { id: 'proposals', label: 'Proposals', icon: Vote, badge: openProposalsCount },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'audit', label: 'Audit', icon: History },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#062319]/95 backdrop-blur-xl border-t border-[#00f090]/20 pb-safe md:hidden"
      >
        <div className="grid grid-cols-5 h-16 max-w-md mx-auto px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  isActive ? 'text-[#00f090]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-8 h-1 bg-[#00f090] rounded-b-full shadow-[0_0_8px_#00f090]" />
                )}
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {Boolean(tab.badge && tab.badge > 0) && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 bg-emerald-400 text-[#041a12] text-[10px] font-extrabold rounded-full flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Top Subnav */}
      <div className="hidden md:block bg-[#041a12]/80 border-b border-white/10 sticky top-[53px] z-30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#00f090]/15 text-[#00f090] border border-[#00f090]/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#00f090] text-[#041a12] text-[10px] font-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
