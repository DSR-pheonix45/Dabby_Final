import React, { useState } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { BsGear, BsBuilding } from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import { toast } from "react-hot-toast";
import CompanyMaster from "./CompanyMaster";

export default function WorkbenchSettings() {
  const { activeWorkbench, setActiveWorkbench } = useWorkbench();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: activeWorkbench?.name || "",
    legal_name: activeWorkbench?.legal_name || "",
    logo: activeWorkbench?.logo || ""
  });

  if (!activeWorkbench) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 font-dm-sans">
        Select a workbench to view settings.
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await collaborationService.updateSettings(activeWorkbench.id, {
        name: formData.name,
        legal_name: formData.legal_name,
        logo: formData.logo
      });
      // Update local context
      setActiveWorkbench({ ...activeWorkbench, ...formData });
      toast.success("Settings saved successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 font-dm-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Workbench Settings</h1>
            <p className="text-gray-400 text-sm mt-1">Manage configuration and preferences for {activeWorkbench.name}</p>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-sm text-gray-300">
            <span className="uppercase text-xs font-semibold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded mr-2">Active</span>
            <span>{activeWorkbench.name}</span>
          </div>
        </div>

        {/* Settings Content */}
        <div className="space-y-6 border-t border-white/10 pt-6">
          <div className="flex space-x-6 border-b border-white/10 mb-8">
            <button 
              onClick={() => setActiveTab('general')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'general' ? 'border-teal-500 text-teal-500' : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              General Information
            </button>
            <button 
              onClick={() => setActiveTab('master')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'master' ? 'border-teal-500 text-teal-500' : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Company Master
            </button>
          </div>

          {activeTab === 'general' && (
            <>
              <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center space-x-3">
              <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                <BsBuilding size={20} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">General Information</h3>
                <p className="text-sm text-gray-500">Basic details about this workbench.</p>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-20 h-20 bg-[#1A1A1A] border border-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Company Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-gray-500 text-xs text-center">No Logo</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Company Logo</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.onload = (e) => setFormData({ ...formData, logo: e.target.result });
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-500/10 file:text-teal-500 hover:file:bg-teal-500/20"
                  />
                  <p className="text-xs text-gray-600 mt-2">Recommended size: 256x256px</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Legal Name</label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    placeholder="E.g., Acme Corporation Pvt Ltd"
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
                  <input
                    type="text"
                    defaultValue={activeWorkbench.country || ""}
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Base Currency</label>
                  <input
                    type="text"
                    defaultValue={activeWorkbench.currency || ""}
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-gray-500 focus:outline-none transition-colors"
                    disabled
                  />
                  <p className="text-xs text-gray-600 mt-2">Base currency cannot be changed after creation.</p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/10">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-teal-500 hover:bg-teal-400 text-black font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#181818] border border-red-500/20 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-red-500/20 flex items-center space-x-3">
              <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                <BsGear size={20} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-500">Danger Zone</h3>
                <p className="text-sm text-red-500/70">Irreversible and destructive actions.</p>
              </div>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Delete Workbench</h4>
                <p className="text-sm text-gray-500 mt-1">Permanently remove this workbench and all associated data.</p>
              </div>
              <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium rounded-md transition-colors border border-red-500/20">
                Delete Workbench
              </button>
            </div>
          </div>
            </>
          )}

          {activeTab === 'master' && (
            <CompanyMaster />
          )}

        </div>

      </div>
    </div>
  );
}
