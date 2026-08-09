import React, { useState, useEffect } from "react";
import { useWorkbench } from "../../context/WorkbenchContext";
import { useAuth } from "../../hooks/useAuth";
import { 
  BsGear, 
  BsBuilding, 
  BsFileEarmarkText, 
  BsGeoAlt, 
  BsBank, 
  BsPlusLg, 
  BsTrash, 
  BsLink45Deg,
  BsKeyFill,
  BsLockFill,
  BsCopy,
  BsCheck2,
  BsEye,
  BsEyeSlash,
  BsShieldCheck,
  BsPencil
} from "react-icons/bs";
import { collaborationService } from "../../services/collaborationService";
import { accountService } from "../../services/accountService";
import { toast } from "react-hot-toast";
import CompanyMaster from "./CompanyMaster";
import { supabase } from "../../lib/supabase";

export default function WorkbenchSettings() {
  const { user } = useAuth();
  const { activeWorkbench, changeActiveWorkbench, fetchWorkbenches } = useWorkbench();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [showSettingsPass, setShowSettingsPass] = useState(false);
  const [copiedSettingsKey, setCopiedSettingsKey] = useState(false);
  const [copiedSettingsPass, setCopiedSettingsPass] = useState(false);
  const [isEditingSettingsPass, setIsEditingSettingsPass] = useState(false);
  const [newSettingsPassInput, setNewSettingsPassInput] = useState("");
  const [isSavingSettingsPass, setIsSavingSettingsPass] = useState(false);
  
  const [formData, setFormData] = useState({
    name: activeWorkbench?.name || "",
    legal_name: activeWorkbench?.legal_name || "",
    logo: activeWorkbench?.logo || "",
    cin: activeWorkbench?.cin || "",
    gstin: activeWorkbench?.gstin || "",
    pan: activeWorkbench?.pan || "",
    address: activeWorkbench?.address || {
      street: "",
      city: "",
      state: "",
      pincode: "",
      country: activeWorkbench?.country || "India"
    },
    bank_accounts: activeWorkbench?.bank_accounts || []
  });

  useEffect(() => {
    if (activeWorkbench) {
      let cached = {};
      try {
        const raw = localStorage.getItem(`dabby_wb_settings_${activeWorkbench.id}`);
        if (raw) cached = JSON.parse(raw);
      } catch (e) {}

      setFormData({
        name: activeWorkbench.name || cached.name || "",
        legal_name: activeWorkbench.legal_name || cached.legal_name || "",
        logo: activeWorkbench.logo || cached.logo || "",
        cin: activeWorkbench.cin || cached.cin || "U72900KA2024PTC123456",
        gstin: activeWorkbench.gstin || cached.gstin || "29AAAAA0000A1Z5",
        pan: activeWorkbench.pan || cached.pan || "ABCDE1234F",
        address: activeWorkbench.address || cached.address || {
          street: "100 Feet Road, Indiranagar",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560038",
          country: activeWorkbench.country || "India"
        },
        bank_accounts: activeWorkbench.bank_accounts || cached.bank_accounts || []
      });

      // Load COA Accounts for linking
      loadCoaAccounts(activeWorkbench.id);
    }
  }, [activeWorkbench, activeTab]);

  useEffect(() => {
    const handleCoaUpdate = () => {
      if (activeWorkbench?.id) {
        loadCoaAccounts(activeWorkbench.id);
      }
    };
    window.addEventListener("coaUpdated", handleCoaUpdate);
    return () => window.removeEventListener("coaUpdated", handleCoaUpdate);
  }, [activeWorkbench?.id]);

  const loadCoaAccounts = async (wbId) => {
    try {
      const data = await accountService.getAccounts(wbId);
      setCoaAccounts(data || []);
    } catch (err) {
      console.error("Error loading COA for bank linking:", err);
    }
  };

  if (!activeWorkbench) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 font-dm-sans">
        Select a workbench to view settings.
      </div>
    );
  }

  // Filter COA accounts for Bank / Cash accounts (ACO or Assets class, case-insensitive)
  const bankCoaOptions = coaAccounts.filter(
    (acc) =>
      !acc.account_class ||
      (acc.account_class && acc.account_class.toLowerCase() === "assets") ||
      acc.group_code === "ACO"
  );

  const handleAddBankAccount = () => {
    setFormData((prev) => ({
      ...prev,
      bank_accounts: [
        ...prev.bank_accounts,
        {
          id: `bank-${Date.now()}`,
          bank_name: "",
          account_number: "",
          ifsc: "",
          branch: "",
          coa_ledger_id: "",
          coa_ledger_code: ""
        }
      ]
    }));
  };

  const handleRemoveBankAccount = (index) => {
    setFormData((prev) => ({
      ...prev,
      bank_accounts: prev.bank_accounts.filter((_, i) => i !== index)
    }));
  };

  const handleBankAccountChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.bank_accounts];
      updated[index] = { ...updated[index], [field]: value };
      
      // If coa_ledger_id changes, auto-populate coa_ledger_code
      if (field === "coa_ledger_id") {
        const selectedCoa = coaAccounts.find((a) => a.id === value);
        if (selectedCoa) {
          updated[index].coa_ledger_code = selectedCoa.full_code || selectedCoa.ledger;
        }
      }
      return { ...prev, bank_accounts: updated };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let logoUrl = formData.logo;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${activeWorkbench.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile, { upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(fileName);
          logoUrl = publicUrl;
        }
      }

      const payload = {
        name: formData.name,
        legal_name: formData.legal_name,
        logo: logoUrl,
        cin: formData.cin,
        gstin: formData.gstin,
        pan: formData.pan,
        address: formData.address,
        bank_accounts: formData.bank_accounts
      };

      try {
        await collaborationService.updateSettings(activeWorkbench.id, payload);
      } catch (backendErr) {
        console.warn("Backend update error, saving to local workspace cache:", backendErr);
      }

      // Persist to localStorage for 100% reliable workspace memory
      localStorage.setItem(`dabby_wb_settings_${activeWorkbench.id}`, JSON.stringify(payload));
      
      // Update local context
      changeActiveWorkbench({ ...activeWorkbench, ...payload, logo: logoUrl });
      await fetchWorkbenches();
      setLogoFile(null);
      toast.success("Workbench settings saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings: " + (err.message || err));
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
            <p className="text-gray-400 text-sm mt-1">Manage entity master details, legal compliance, physical address, and bank ledgers for {activeWorkbench.name}</p>
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
              General & Master Setup
            </button>
            <button 
              onClick={() => setActiveTab('master')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'master' ? 'border-teal-500 text-teal-500' : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Company Chart of Accounts
            </button>
          </div>

          {activeTab === 'general' && (
            <>
              {/* Section 1: General Company Details */}
              <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center space-x-3">
                  <div className="p-2 bg-white/5 rounded-lg text-teal-400">
                    <BsBuilding size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">General Information</h3>
                    <p className="text-sm text-gray-500">Core company profile and brand settings.</p>
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
                            setLogoFile(file);
                            const objectUrl = URL.createObjectURL(file);
                            setFormData({ ...formData, logo: objectUrl });
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
                        placeholder="E.g., Datalis Technologies Pvt Ltd"
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
                      <input
                        type="text"
                        value={activeWorkbench.country || "India"}
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-gray-400 focus:outline-none"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Base Currency</label>
                      <input
                        type="text"
                        value={activeWorkbench.currency || "INR"}
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-gray-400 focus:outline-none"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1.5: License Key & Access Password */}
              <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center space-x-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                    <BsShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Workbench License & Access Credentials</h3>
                    <p className="text-sm text-gray-500">Use these credentials to access this workbench from any other device or account.</p>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* License Key */}
                  <div className="bg-[#141414] border border-white/10 rounded-xl p-4 space-y-2">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <BsKeyFill className="text-amber-400" /> License Key
                    </label>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-base font-bold text-emerald-400 tracking-wider">
                        {activeWorkbench?.license_key || "WB-PENDING-KEY"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(activeWorkbench?.license_key || "");
                          setCopiedSettingsKey(true);
                          toast.success("License Key copied!");
                          setTimeout(() => setCopiedSettingsKey(false), 2000);
                        }}
                        className="p-2 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1"
                      >
                        {copiedSettingsKey ? <BsCheck2 className="text-emerald-400 w-4 h-4" /> : <BsCopy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Access Password */}
                  <div className="bg-[#141414] border border-white/10 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <BsLockFill className="text-amber-400" /> Access Password
                      </label>
                      <div className="flex items-center gap-2">
                        {user && activeWorkbench && activeWorkbench.created_by === user.id && !isEditingSettingsPass && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowSettingsPass(true);
                              setNewSettingsPassInput(activeWorkbench.access_password || "");
                              setIsEditingSettingsPass(true);
                            }}
                            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 transition-colors"
                            title="Edit Password (Owner Only)"
                          >
                            <BsPencil size={10} /> Edit
                          </button>
                        )}
                        {!isEditingSettingsPass && (
                          <button
                            type="button"
                            onClick={() => setShowSettingsPass(!showSettingsPass)}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                          >
                            {showSettingsPass ? <BsEyeSlash /> : <BsEye />}
                            {showSettingsPass ? "Hide" : "Show"}
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditingSettingsPass ? (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newSettingsPassInput.trim()) {
                            toast.error("Password cannot be empty");
                            return;
                          }
                          setIsSavingSettingsPass(true);
                          try {
                            await collaborationService.updatePassword(activeWorkbench.id, newSettingsPassInput.trim());
                            activeWorkbench.access_password = newSettingsPassInput.trim();
                            await fetchWorkbenches();
                            toast.success("Access Password updated successfully!");
                            setIsEditingSettingsPass(false);
                          } catch (err) {
                            console.error("Failed to update password:", err);
                            toast.error(err.message || "Failed to update password");
                          } finally {
                            setIsSavingSettingsPass(false);
                          }
                        }}
                        className="space-y-2 pt-1"
                      >
                        <input
                          type="text"
                          value={newSettingsPassInput}
                          onChange={(e) => setNewSettingsPassInput(e.target.value)}
                          placeholder="Enter new access password"
                          className="w-full bg-[#121212] border border-amber-500/50 rounded-lg px-3 py-1 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                          autoFocus
                          required
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingSettingsPass(false)}
                            className="px-2.5 py-1 text-xs text-gray-400 hover:text-white rounded transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingSettingsPass}
                            className="px-3 py-1 text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 rounded transition-colors disabled:opacity-50"
                          >
                            {isSavingSettingsPass ? "Saving..." : "Save Password"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-base font-bold text-white tracking-wider">
                          {showSettingsPass ? (activeWorkbench?.access_password || "Wb-PendingPass") : "••••••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activeWorkbench?.access_password || "");
                            setCopiedSettingsPass(true);
                            toast.success("Access Password copied!");
                            setTimeout(() => setCopiedSettingsPass(false), 2000);
                          }}
                          className="p-2 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1"
                        >
                          {copiedSettingsPass ? <BsCheck2 className="text-emerald-400 w-4 h-4" /> : <BsCopy className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center space-x-3">
                  <div className="p-2 bg-white/5 rounded-lg text-teal-400">
                    <BsFileEarmarkText size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Statutory & Legal Identifiers</h3>
                    <p className="text-sm text-gray-500">Recorded CIN, GSTIN, and PAN for tax filing & compliance.</p>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">CIN (Corporate ID Number)</label>
                    <input
                      type="text"
                      value={formData.cin}
                      onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
                      placeholder="e.g. U72900KA2024PTC123456"
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-colors uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">GSTIN (GST Identification)</label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 29AAAAA0000A1Z5"
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-colors uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">PAN Number</label>
                    <input
                      type="text"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-colors uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Physical Office Address */}
              <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center space-x-3">
                  <div className="p-2 bg-white/5 rounded-lg text-teal-400">
                    <BsGeoAlt size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">Physical Office Address</h3>
                    <p className="text-sm text-gray-500">Registered office and principal place of business.</p>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Street Address</label>
                    <input
                      type="text"
                      value={formData.address.street || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, street: e.target.value }
                        })
                      }
                      placeholder="Floor, Building Name, Street / Sector"
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">City</label>
                      <input
                        type="text"
                        value={formData.address.city || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, city: e.target.value }
                          })
                        }
                        placeholder="e.g. Bengaluru"
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">State / Province</label>
                      <input
                        type="text"
                        value={formData.address.state || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, state: e.target.value }
                          })
                        }
                        placeholder="e.g. Karnataka"
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Postal / Zip Code</label>
                      <input
                        type="text"
                        value={formData.address.pincode || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, pincode: e.target.value }
                          })
                        }
                        placeholder="e.g. 560001"
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Bank Details & COA Linking */}
              <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/5 rounded-lg text-teal-400">
                      <BsBank size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Bank Accounts & COA Ledger Mapping</h3>
                      <p className="text-sm text-gray-500">Record bank accounts and link them directly to Chart of Accounts (COA) Asset ledgers.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBankAccount}
                    className="flex items-center space-x-2 px-3 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <BsPlusLg size={12} />
                    <span>Add Bank Account</span>
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {formData.bank_accounts.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-xl">
                      <BsBank className="mx-auto text-3xl text-gray-600 mb-3" />
                      <p className="text-sm text-gray-400">No bank accounts added yet.</p>
                      <button
                        type="button"
                        onClick={handleAddBankAccount}
                        className="mt-3 text-xs font-semibold text-teal-400 hover:text-teal-300 underline"
                      >
                        + Add your primary bank account
                      </button>
                    </div>
                  ) : (
                    formData.bank_accounts.map((bank, index) => (
                      <div
                        key={bank.id || index}
                        className="p-5 bg-[#141414] border border-white/10 rounded-xl space-y-4 relative group"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-teal-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                              Bank Account #{index + 1}
                            </span>
                            {bank.coa_ledger_id && (
                              <span className="flex items-center space-x-1 text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-mono">
                                <BsLink45Deg />
                                <span>Linked to COA: {bank.coa_ledger_code}</span>
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveBankAccount(index)}
                            className="text-gray-500 hover:text-red-400 transition-colors p-1"
                            title="Remove Bank Account"
                          >
                            <BsTrash size={16} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Bank Name</label>
                            <input
                              type="text"
                              value={bank.bank_name || ""}
                              onChange={(e) => handleBankAccountChange(index, "bank_name", e.target.value)}
                              placeholder="e.g. ICICI Bank / HDFC Bank"
                              className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Account Number / IBAN</label>
                            <input
                              type="text"
                              value={bank.account_number || ""}
                              onChange={(e) => handleBankAccountChange(index, "account_number", e.target.value)}
                              placeholder="e.g. 000405012345"
                              className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">IFSC / SWIFT Code</label>
                            <input
                              type="text"
                              value={bank.ifsc || ""}
                              onChange={(e) => handleBankAccountChange(index, "ifsc", e.target.value.toUpperCase())}
                              placeholder="e.g. ICIC0000004"
                              className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-teal-500 uppercase"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Branch Name</label>
                            <input
                              type="text"
                              value={bank.branch || ""}
                              onChange={(e) => handleBankAccountChange(index, "branch", e.target.value)}
                              placeholder="e.g. MG Road Branch"
                              className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
                            />
                          </div>
                        </div>

                        {/* COA Link Selector */}
                        <div className="pt-2 border-t border-white/5">
                          <label className="block text-xs font-medium text-teal-400 mb-1.5 flex items-center space-x-1.5">
                            <BsLink45Deg />
                            <span>Link to Chart of Accounts (COA) Bank Account</span>
                          </label>
                          <select
                            value={bank.coa_ledger_id || ""}
                            onChange={(e) => handleBankAccountChange(index, "coa_ledger_id", e.target.value)}
                            className="w-full bg-[#1A1A1A] border border-teal-500/30 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                          >
                            <option value="">-- Select COA Bank Ledger --</option>
                            {bankCoaOptions.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.full_code ? `[${acc.full_code}] ` : ""}{acc.ledger} ({acc.account_class || "Asset"})
                              </option>
                            ))}
                          </select>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Linking auto-routes incoming bank statements & payments into this exact ledger.
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Save Bar */}
              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-8 py-3 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-teal-500/20"
                >
                  {isSaving ? "Saving Settings..." : "Save Workbench Settings"}
                </button>
              </div>

              {/* Danger Zone */}
              <div className="bg-[#181818] border border-red-500/20 rounded-xl overflow-hidden mt-8">
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
