import React, { useState } from "react";
import { BsX, BsKeyFill, BsLockFill, BsCheckCircleFill, BsShieldLock } from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import { toast } from "react-hot-toast";
import { useWorkbench } from "../../context/WorkbenchContext";

export default function AccessWorkbenchModal({ isOpen, onClose, onSuccess }) {
  const { fetchWorkbenches, changeActiveWorkbench } = useWorkbench();
  const [licenseKey, setLicenseKey] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      toast.error("Please enter a License Key");
      return;
    }
    if (!accessPassword.trim()) {
      toast.error("Please enter the Access Password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await collaborationService.accessByLicense(licenseKey.trim(), accessPassword.trim());
      
      toast.success(
        res.status === "already_member"
          ? `Already connected to ${res.workbench?.name || "Workbench"}`
          : `Successfully connected to ${res.workbench?.name || "Workbench"}!`
      );

      // Refresh workbenches in context and activate this workbench
      await fetchWorkbenches();
      if (res.workbench) {
        changeActiveWorkbench(res.workbench);
      }

      setLicenseKey("");
      setAccessPassword("");
      if (onSuccess) onSuccess(res.workbench);
      onClose();
    } catch (err) {
      console.error("Access workbench error:", err);
      const msg = err.message || "Failed to access workbench. Please verify your License Key and Password.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative font-dm-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BsShieldLock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Access Workbench</h3>
              <p className="text-xs text-gray-400">Connect to an existing workbench on any device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <BsX className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>{error}</span>
            </div>
          )}

          {/* License Key Input */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
              <BsKeyFill className="text-emerald-400" /> License Key
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="e.g. WB-8A3F-92B1-4C0E"
              className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-500/50 uppercase tracking-wider"
              required
            />
          </div>

          {/* Access Password Input */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
              <BsLockFill className="text-emerald-400" /> Access Password
            </label>
            <input
              type="password"
              value={accessPassword}
              onChange={(e) => setAccessPassword(e.target.value)}
              placeholder="Enter workbench password"
              className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-[11px] text-gray-400 leading-relaxed">
            💡 Entering a valid License Key and Password will grant your current account full member access to the workbench on this device.
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <BsCheckCircleFill className="w-3.5 h-3.5" />
                  Access Workbench
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
