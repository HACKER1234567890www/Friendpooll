import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button or show a subtle installed indicator
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0d3b2c] border border-[#00f090]/25 text-[#00f090] text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Installed PWA</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] px-3.5 py-1.5 text-xs font-semibold text-[#041a12] shadow-sm hover:brightness-110 active:scale-95 transition cursor-pointer"
        title="Install Friendpool as standalone Web App"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-[#00f090]/30 bg-[#0a2e22] px-3 py-1.5 text-xs font-medium text-[#00f090] hover:bg-[#0f3d2e] transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#08281d] border border-[#00f090]/30 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00f090]/15 flex items-center justify-center text-[#00f090]">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 bg-[#041810] p-3 rounded-xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#00f090]/20 text-[#00f090] flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Tap the <strong>Share</strong> button (box with upward arrow) in the Safari toolbar.</span>
                </div>
                <div className="flex items-start gap-3 bg-[#041810] p-3 rounded-xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#00f090]/20 text-[#00f090] flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Scroll down the action sheet and tap <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-3 bg-[#041810] p-3 rounded-xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#00f090]/20 text-[#00f090] flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Confirm with <strong>Add</strong> to launch Friendpool like a native app.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#00f090] py-2.5 text-sm font-semibold text-[#041a12] hover:bg-[#10b981] transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback info button if not on Chromium or iOS prompt
  return (
    <button
      onClick={() => {
        alert("To install Friendpool on desktop or unsupported browsers, use your browser's menu (⋮ or Share) > 'Install Friendpool' or 'Add to Home Screen'.");
      }}
      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a2e22]/60 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-[#00f090]/30 transition"
      title="PWA Install Guide"
    >
      <Download className="w-3.5 h-3.5 text-[#00f090]" />
      <span className="hidden sm:inline">PWA App</span>
    </button>
  );
};
