import React, { useState } from "react";
import { BsX, BsCopy, BsCheck } from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import { toast } from "react-hot-toast";

export default function AddMemberModal({ isOpen, onClose, workbenchId }) {
  const [role, setRole] = useState("viewer");
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const data = await collaborationService.generateInviteLink(workbenchId, role);
      // Construct full URL
      const fullUrl = `${window.location.origin}/dashboard/join?token=${data.token}`;
      setInviteLink(fullUrl);
      setCopied(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate invite link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-dm-sans">
      <div className="bg-[#181818] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white tracking-tight">Invite Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <BsX size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {!inviteLink ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Assign Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors appearance-none"
                >
                  <option value="viewer">Viewer</option>
                  <option value="accountant">Accountant</option>
                  <option value="finance_manager">Finance Manager</option>
                  <option value="cfo">CFO</option>
                  <option value="auditor">Auditor</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Generate a secure invite link. Anyone with this link can join your workbench as a {role}.
                </p>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-white/10 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-sm rounded-md transition-colors shadow-[0_0_10px_rgba(20,184,166,0.3)] disabled:opacity-50"
                >
                  {isGenerating ? "Generating..." : "Generate Link"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-green-400 mb-1.5">Link Generated Successfully!</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-gray-300 focus:outline-none font-mono text-xs"
                  />
                  <button
                    onClick={handleCopy}
                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors"
                  >
                    {copied ? <BsCheck size={18} className="text-green-400" /> : <BsCopy size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This link will expire in 7 days.
                </p>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-white/10 mt-6">
                <button
                  onClick={() => setInviteLink(null)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Create Another
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-md transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
