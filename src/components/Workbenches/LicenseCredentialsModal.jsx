import React, { useState } from "react";
import { BsX, BsKeyFill, BsLockFill, BsCopy, BsCheck2, BsEye, BsEyeSlash, BsShieldCheck } from "react-icons/bs";
import { toast } from "react-hot-toast";

export default function LicenseCredentialsModal({ isOpen, onClose, workbench }) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen || !workbench) return null;

  const licenseKey = workbench.license_key || "WB-PENDING-KEY";
  const accessPassword = workbench.access_password || "Wb-PendingPass";

  const handleCopyKey = () => {
    navigator.clipboard.writeText(licenseKey);
    setCopiedKey(true);
    toast.success("License Key copied!");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(accessPassword);
    setCopiedPassword(true);
    toast.success("Access Password copied!");
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleCopyAll = () => {
    const text = `Workbench: ${workbench.name}\nLicense Key: ${licenseKey}\nAccess Password: ${accessPassword}`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative font-dm-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BsShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">{workbench.name}</h3>
              <p className="text-xs text-gray-400">License Key & Access Credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <BsX className="w-5 h-5" />
          </button>
        </div>

        {/* Credentials Cards */}
        <div className="mt-6 space-y-4">
          {/* License Key */}
          <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-3.5 space-y-1.5">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <BsKeyFill className="text-amber-400" /> License Key
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold text-emerald-400 tracking-wider">
                {licenseKey}
              </span>
              <button
                onClick={handleCopyKey}
                className="p-2 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1"
              >
                {copiedKey ? <BsCheck2 className="text-emerald-400 w-4 h-4" /> : <BsCopy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Access Password */}
          <div className="bg-[#1C1C1C] border border-white/10 rounded-xl p-3.5 space-y-1.5">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BsLockFill className="text-amber-400" /> Access Password
              </span>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                {showPassword ? <BsEyeSlash /> : <BsEye />}
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold text-white tracking-wider">
                {showPassword ? accessPassword : "••••••••••••"}
              </span>
              <button
                onClick={handleCopyPassword}
                className="p-2 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1"
              >
                {copiedPassword ? <BsCheck2 className="text-emerald-400 w-4 h-4" /> : <BsCopy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300/90 leading-relaxed">
            🔑 Share these credentials to grant members or other devices access to this workbench.
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 mt-6 flex items-center justify-between border-t border-white/10">
          <button
            onClick={handleCopyAll}
            className="px-4 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors flex items-center gap-1.5"
          >
            {copiedAll ? <BsCheck2 className="text-emerald-400" /> : <BsCopy />}
            Copy All Credentials
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
