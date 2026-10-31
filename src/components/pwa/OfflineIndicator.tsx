import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:right-auto md:w-80 z-50 flex items-center gap-2.5 rounded-xl bg-amber-900/90 border border-amber-500/40 px-3.5 py-2.5 text-xs font-medium text-amber-200 shadow-xl backdrop-blur-md">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <div>
        <p className="font-semibold text-white">Offline Mode</p>
        <p className="text-amber-200/80">Using local cached ledger and simulations.</p>
      </div>
    </div>
  );
};
