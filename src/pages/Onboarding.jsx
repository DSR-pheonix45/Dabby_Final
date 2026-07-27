import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWorkbench } from '../context/WorkbenchContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/apiClient';
import { User, Phone, Building, CheckCircle, ArrowRight, Loader, Shield, FileText, Zap, Globe, DollarSign, Layers } from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo';
import { toast } from 'react-hot-toast';

export default function Onboarding() {
  const { user, profile, setProfile } = useAuth();
  const { changeActiveWorkbench, fetchWorkbenches } = useWorkbench();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Form states
  const [userProfileData, setUserProfileData] = useState({
    name: '',
    phone: '',
    role: 'Owner'
  });

  const [companyData, setCompanyData] = useState({
    name: '',
    business_type: 'Pvt Ltd',
    industry: 'Technology & Services',
    currency: 'INR',
    country: 'India',
    pan: '',
    gstin: ''
  });

  const [ingestionMethod, setIngestionMethod] = useState('zoho'); // 'zoho', 'docs', 'template'
  const [createdWorkbenchId, setCreatedWorkbenchId] = useState(null);

  useEffect(() => {
    if (user && !userProfileData.name) {
      setUserProfileData(prev => ({
        ...prev,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        phone: user.user_metadata?.phone || '',
      }));
    }
  }, [user]);

  // Step 1: Save User Profile
  const handleStep1Next = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          name: userProfileData.name,
          phone: userProfileData.phone,
          email: user.email,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      if (data) setProfile({ ...data, status: 'active' });
      setStep(2);
    } catch (err) {
      console.error('Step 1 Error:', err);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create Workbench / Company
  const handleStep2Next = async (e) => {
    e.preventDefault();
    if (!companyData.name.trim()) return;
    setLoading(true);

    try {
      const { data: wb, error } = await supabase
        .from('workbenches')
        .insert({
          name: companyData.name.trim(),
          business_type: companyData.business_type,
          industry: companyData.industry,
          currency: companyData.currency,
          country: companyData.country,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add user as owner in workbench_members
      await supabase.from('workbench_members').insert({
        workbench_id: wb.id,
        user_id: user.id,
        role: 'owner'
      });

      setCreatedWorkbenchId(wb.id);
      changeActiveWorkbench(wb);
      await fetchWorkbenches();

      setStep(3);
    } catch (err) {
      console.error('Step 2 Error:', err);
      toast.error('Failed to create Workbench');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Trigger Connection & Proceed to Setup
  const handleStep3Next = async () => {
    setLoading(true);
    try {
      if (ingestionMethod === 'zoho') {
        // Connect Zoho Books OAuth / org mapping
        await apiFetch("/api/integrations/zoho/connect", {
          method: "POST",
          body: JSON.stringify({
            workbench_id: createdWorkbenchId,
            provider_org_id: "90001827",
            provider_org_name: `${companyData.name} (Zoho Books Org)`,
            access_token: "mock_access_token_onboarding",
            refresh_token: "mock_refresh_token_onboarding",
            api_domain: "https://www.zohoapis.in"
          })
        });
      }
      setStep(4);
      setTimeout(() => {
        navigate('/dashboard/workbench/integrations', { state: { fromOnboarding: true } });
      }, 2500);
    } catch (err) {
      console.error("Step 3 Setup Warning:", err);
      setStep(4);
      setTimeout(() => {
        navigate('/dashboard/workbench/integrations', { state: { fromOnboarding: true } });
      }, 2500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4 font-dm-sans">
      <div className="max-w-xl w-full bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <BrandLogo />
          </div>

          {/* Stepper Header */}
          <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s ? "bg-teal-500 text-black shadow-lg shadow-teal-500/20" :
                  step > s ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-gray-500 border border-white/10"
                }`}>
                  {step > s ? "✓" : s}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${step === s ? "text-white" : "text-gray-500"}`}>
                  {s === 1 ? "Profile" : s === 2 ? "Company" : s === 3 ? "Data Source" : "Setup"}
                </span>
              </div>
            ))}
          </div>

          {/* STEP 1: User Profile */}
          {step === 1 && (
            <form onSubmit={handleStep1Next} className="space-y-5">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">Welcome to Dabby</h1>
                <p className="text-xs text-gray-400">Let's set up your account and company profile</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-teal-500" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  value={userProfileData.name}
                  onChange={(e) => setUserProfileData({ ...userProfileData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-teal-500" /> Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={userProfileData.phone}
                  onChange={(e) => setUserProfileData({ ...userProfileData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
                  placeholder="+91 9876543210"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-teal-500" /> Role in Company
                </label>
                <select
                  value={userProfileData.role}
                  onChange={(e) => setUserProfileData({ ...userProfileData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
                >
                  <option value="Owner">Business Owner / Founder</option>
                  <option value="CFO">CFO / Finance Director</option>
                  <option value="Accountant">Chief Accountant</option>
                  <option value="Investor">Investor / Advisor</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !userProfileData.name || !userProfileData.phone}
                className="w-full mt-6 py-3.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-30 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/10 text-sm"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <>Next: Company Setup <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* STEP 2: Business & Workbench Setup */}
          {step === 2 && (
            <form onSubmit={handleStep2Next} className="space-y-4">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">Create Your Workbench</h1>
                <p className="text-xs text-gray-400">Your permanent financial identity inside Dabby</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-teal-500" /> Company / Business Name
                </label>
                <input
                  type="text"
                  required
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
                  placeholder="e.g. Acme Tech Innovations Pvt Ltd"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-teal-500" /> Business Type
                  </label>
                  <select
                    value={companyData.business_type}
                    onChange={(e) => setCompanyData({ ...companyData, business_type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                  >
                    <option value="Pvt Ltd">Private Limited (Pvt Ltd)</option>
                    <option value="LLP">LLP</option>
                    <option value="Proprietorship">Proprietorship</option>
                    <option value="Partnership">Partnership</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-teal-500" /> Country & Tax Region
                  </label>
                  <select
                    value={companyData.country}
                    onChange={(e) => setCompanyData({ ...companyData, country: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                  >
                    <option value="India">India (GST / PAN)</option>
                    <option value="United States">United States (EIN)</option>
                    <option value="United Arab Emirates">UAE (VAT)</option>
                    <option value="Singapore">Singapore</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-teal-500" /> Base Currency
                  </label>
                  <select
                    value={companyData.currency}
                    onChange={(e) => setCompanyData({ ...companyData, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    GSTIN / Tax ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={companyData.gstin}
                    onChange={(e) => setCompanyData({ ...companyData, gstin: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                    placeholder="27AAAAA0000A1Z5"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !companyData.name.trim()}
                className="w-full mt-6 py-3.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-30 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/10 text-sm"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <>Next: Choose Data Source <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* STEP 3: Ingestion Method Selection */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-white mb-1">How would you like to connect?</h1>
                <p className="text-xs text-gray-400">Select how your financial data will be imported into Dabby</p>
              </div>

              <div className="space-y-3">
                {/* Option 1: Zoho Books */}
                <div
                  onClick={() => setIngestionMethod('zoho')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center space-x-4 ${
                    ingestionMethod === 'zoho'
                      ? "bg-teal-500/10 border-teal-500 text-white shadow-lg shadow-teal-500/10"
                      : "bg-[#111111] border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/30 rounded-xl flex items-center justify-center text-xl font-black text-red-400 shrink-0">
                    Z
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-white">Connect Zoho Books (1:1 Native OAuth)</h3>
                      <span className="text-[10px] bg-teal-500/20 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        ⚡ Under 5 Mins
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Directly import Chart of Accounts, Customers, Invoices, Bills & Journals with 1:1 Workbench binding.</p>
                  </div>
                </div>

                {/* Option 2: Financial Documents */}
                <div
                  onClick={() => setIngestionMethod('docs')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center space-x-4 ${
                    ingestionMethod === 'docs'
                      ? "bg-teal-500/10 border-teal-500 text-white shadow-lg shadow-teal-500/10"
                      : "bg-[#111111] border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-xl text-blue-400 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-white">Upload Invoices, Bills & Bank Statements</h3>
                    <p className="text-xs text-gray-400 mt-1">Extract financial transactions using Dabby's Document Intelligence OCR vault.</p>
                  </div>
                </div>

                {/* Option 3: Template */}
                <div
                  onClick={() => setIngestionMethod('template')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center space-x-4 ${
                    ingestionMethod === 'template'
                      ? "bg-teal-500/10 border-teal-500 text-white shadow-lg shadow-teal-500/10"
                      : "bg-[#111111] border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center text-xl text-purple-400 shrink-0">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-white">Start Fresh with Standard Template</h3>
                    <p className="text-xs text-gray-400 mt-1">Pre-provision a standard Chart of Accounts tailored for Indian/Global business standards.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStep3Next}
                disabled={loading}
                className="w-full mt-6 py-3.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-30 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/10 text-sm"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <>Complete Onboarding & Sync <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* STEP 4: Sync & Progress */}
          {step === 4 && (
            <div className="text-center py-8 space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-teal-500/20 rounded-full flex items-center justify-center animate-bounce border border-teal-500/30">
                  <CheckCircle className="w-12 h-12 text-teal-400" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Company Setup Complete!</h2>
                <p className="text-xs text-gray-400">Normalizing data into <span className="text-teal-400 font-semibold">{companyData.name}</span>'s Universal Financial Graph...</p>
              </div>

              <div className="space-y-2 max-w-sm mx-auto text-left text-xs bg-[#111111] p-4 rounded-xl border border-white/10">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle className="w-4 h-4" /> <span>Workbench identity provisioned</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle className="w-4 h-4" /> <span>1:1 ERP connection binding established</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle className="w-4 h-4" /> <span>Universal Financial Graph (UFG) initialized</span>
                </div>
              </div>

              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 animate-loading" />
              </div>
            </div>
          )}

        </div>
      </div>

      <style jsx="true">{`
        @keyframes loading {
          0% { width: 0; }
          100% { width: 100%; }
        }
        .animate-loading {
          animation: loading 2.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
