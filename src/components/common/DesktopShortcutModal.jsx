import React, { useState } from 'react';
import { Monitor, Download, Sparkles, X, Check, Laptop, ExternalLink, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export default function DesktopShortcutModal({ isOpen, onClose }) {
  const { isInstallable, isInstalled, promptInstall, downloadDesktopShortcut } = usePWAInstall();
  const [downloaded, setDownloaded] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const handleInstallPWA = async () => {
    setInstalling(true);
    try {
      await promptInstall();
    } catch (err) {
      console.error('PWA install error:', err);
    } finally {
      setInstalling(false);
    }
  };

  const handleDownloadShortcut = () => {
    downloadDesktopShortcut();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-teal-500/20 bg-neutral-950 p-6 sm:p-8 shadow-2xl shadow-teal-500/10 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow accent */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg transition-colors hover:bg-neutral-800/60"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <img src="/dabby-logo.svg" alt="Dabby Logo" className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Add Dabby to Desktop
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                Daily App
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Launch Dabby (https://www.datalis.in) directly from your desktop
            </p>
          </div>
        </div>

        {/* Status Badge if already installed */}
        {isInstalled && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-emerald-400 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Dabby is already installed as a desktop application!</span>
          </div>
        )}

        {/* Action Options */}
        <div className="space-y-3 mb-6">
          {/* Option 1: Native PWA Install */}
          {isInstallable && !isInstalled && (
            <button
              onClick={handleInstallPWA}
              disabled={installing}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-neutral-950 font-semibold shadow-lg shadow-teal-500/20 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 text-left">
                <Sparkles className="w-5 h-5 shrink-0" />
                <div>
                  <div className="text-sm font-bold">Install Dabby Desktop App</div>
                  <div className="text-[11px] font-normal opacity-90">
                    1-Click Chrome/Edge native desktop installation
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 opacity-70 shrink-0" />
            </button>
          )}

          {/* Option 2: Download .url Desktop Shortcut */}
          <button
            onClick={handleDownloadShortcut}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-teal-500/40 hover:bg-neutral-850 text-white transition-all duration-200 group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 rounded-lg bg-neutral-800 group-hover:bg-teal-500/10 group-hover:text-teal-400 transition-colors">
                {downloaded ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4 text-neutral-300" />}
              </div>
              <div>
                <div className="text-sm font-medium text-neutral-200 group-hover:text-white">
                  {downloaded ? 'Shortcut Downloaded!' : 'Download Desktop Shortcut (.url)'}
                </div>
                <div className="text-[11px] text-neutral-400">
                  Double-click shortcut to open Dabby in your default browser
                </div>
              </div>
            </div>
            <span className="text-xs font-mono text-neutral-400 bg-neutral-800 px-2 py-1 rounded group-hover:text-teal-300">
              .url
            </span>
          </button>
        </div>

        {/* Instructions section */}
        <div className="rounded-xl bg-neutral-900/60 border border-neutral-800/80 p-4">
          <div className="text-xs font-semibold text-neutral-300 mb-2 flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-teal-400" />
            How to create shortcut manually in Chrome/Edge:
          </div>
          <ol className="text-xs text-neutral-400 space-y-1.5 list-decimal list-inside pl-1">
            <li>Click browser options menu <span className="font-mono text-neutral-300">⋮</span> (top right).</li>
            <li>Go to <span className="text-neutral-200 font-medium">Save and Share</span> &rarr; <span className="text-neutral-200 font-medium">Create Shortcut...</span></li>
            <li>Check <span className="text-teal-300 font-medium">"Open as window"</span> and click <span className="text-neutral-200 font-medium">Create</span>.</li>
          </ol>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-4 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Works on Windows, macOS, Linux & ChromeOS</span>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
