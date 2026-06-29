import React, { useState } from 'react';
import { X, Building2, MapPin, ShieldCheck, CreditCard, ChevronRight, ChevronLeft, Globe, DollarSign, Clock, Check, ArrowRight, RefreshCw, Plus, BookOpen, AlertTriangle, Layers, ChevronDown } from 'lucide-react';
import { backendService } from '../../services/backendService';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const COUNTRIES = [
  { value: 'India', label: 'India', currency: 'INR', fyDefault: 'April' },
  { value: 'United States', label: 'United States', currency: 'USD', fyDefault: 'January' },
  { value: 'United Kingdom', label: 'United Kingdom', currency: 'GBP', fyDefault: 'April' },
  { value: 'UAE', label: 'United Arab Emirates', currency: 'AED', fyDefault: 'January' },
  { value: 'Singapore', label: 'Singapore', currency: 'SGD', fyDefault: 'January' },
  { value: 'Australia', label: 'Australia', currency: 'AUD', fyDefault: 'July' },
  { value: 'Canada', label: 'Canada', currency: 'CAD', fyDefault: 'January' },
  { value: 'Germany', label: 'Germany', currency: 'EUR', fyDefault: 'January' },
];

const INDUSTRY_COA_TEMPLATES = {
  services: {
    technology: [
      { type: 'income', sub_account: 'Revenue', name: 'SaaS Revenue' },
      { type: 'income', sub_account: 'Revenue', name: 'Consulting Income' },
      { type: 'income', sub_account: 'Revenue', name: 'Service Fees' },
      { type: 'expense', sub_account: 'Operating Expenses', name: 'Cloud Hosting' },
      { type: 'expense', sub_account: 'Operating Expenses', name: 'Software Subscriptions' },
      { type: 'expense', sub_account: 'Payroll', name: 'Employee Salaries' },
      { type: 'expense', sub_account: 'Payroll', name: 'Contractor Payments' },
      { type: 'expense', sub_account: 'Marketing', name: 'Digital Ads' },
      { type: 'expense', sub_account: 'Marketing', name: 'Events & Conferences' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Cash & Bank' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Accounts Receivable' },
      { type: 'liability', sub_account: 'Current Liabilities', name: 'Accounts Payable' },
      { type: 'liability', sub_account: 'Current Liabilities', name: 'Accrued Expenses' },
    ],
    default: [
      { type: 'income', sub_account: 'Revenue', name: 'Service Revenue' },
      { type: 'income', sub_account: 'Revenue', name: 'Other Income' },
      { type: 'expense', sub_account: 'Operating Expenses', name: 'Rent & Utilities' },
      { type: 'expense', sub_account: 'Payroll', name: 'Salaries & Wages' },
      { type: 'expense', sub_account: 'Administrative', name: 'Office Supplies' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Cash & Bank' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Accounts Receivable' },
      { type: 'liability', sub_account: 'Current Liabilities', name: 'Accounts Payable' },
    ],
  },
  manufacturing: {
    default: [
      { type: 'income', sub_account: 'Revenue', name: 'Product Sales' },
      { type: 'income', sub_account: 'Revenue', name: 'Export Revenue' },
      { type: 'expense', sub_account: 'Cost of Goods Sold', name: 'Raw Materials' },
      { type: 'expense', sub_account: 'Cost of Goods Sold', name: 'Direct Labour' },
      { type: 'expense', sub_account: 'Cost of Goods Sold', name: 'Manufacturing Overhead' },
      { type: 'expense', sub_account: 'Operating Expenses', name: 'Utilities' },
      { type: 'expense', sub_account: 'Payroll', name: 'Salaries & Wages' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Cash & Bank' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Inventory' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Accounts Receivable' },
      { type: 'asset', sub_account: 'Fixed Assets', name: 'Plant & Machinery' },
      { type: 'liability', sub_account: 'Current Liabilities', name: 'Accounts Payable' },
    ],
  },
  trading: {
    default: [
      { type: 'income', sub_account: 'Revenue', name: 'Sales Revenue' },
      { type: 'income', sub_account: 'Revenue', name: 'Commission Income' },
      { type: 'expense', sub_account: 'Cost of Goods Sold', name: 'Purchases' },
      { type: 'expense', sub_account: 'Cost of Goods Sold', name: 'Freight & Shipping' },
      { type: 'expense', sub_account: 'Operating Expenses', name: 'Warehouse Rent' },
      { type: 'expense', sub_account: 'Payroll', name: 'Salaries' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Cash & Bank' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Inventory' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Accounts Receivable' },
      { type: 'liability', sub_account: 'Current Liabilities', name: 'Accounts Payable' },
    ],
  },
  ecommerce: {
    default: [
      { type: 'income', sub_account: 'Revenue', name: 'Online Sales' },
      { type: 'income', sub_account: 'Revenue', name: 'Marketplace Revenue' },
      { type: 'expense', sub_account: 'Cost of Goods Sold', name: 'Product Cost' },
      { type: 'expense', sub_account: 'Cost of Goods Sold', name: 'Shipping & Logistics' },
      { type: 'expense', sub_account: 'Operating Expenses', name: 'Platform Fees' },
      { type: 'expense', sub_account: 'Marketing', name: 'Digital Advertising' },
      { type: 'expense', sub_account: 'Payroll', name: 'Salaries' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Cash & Bank' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Inventory' },
      { type: 'liability', sub_account: 'Current Liabilities', name: 'Accounts Payable' },
    ],
  },
  others: {
    default: [
      { type: 'income', sub_account: 'Revenue', name: 'Primary Revenue' },
      { type: 'income', sub_account: 'Revenue', name: 'Other Income' },
      { type: 'expense', sub_account: 'Operating Expenses', name: 'General Expenses' },
      { type: 'expense', sub_account: 'Payroll', name: 'Salaries' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Cash & Bank' },
      { type: 'asset', sub_account: 'Current Assets', name: 'Accounts Receivable' },
      { type: 'liability', sub_account: 'Current Liabilities', name: 'Accounts Payable' },
    ],
  },
};

const getCoaTemplate = (industry, sector) => {
  const industryTemplates = INDUSTRY_COA_TEMPLATES[industry] || INDUSTRY_COA_TEMPLATES.others;
  return industryTemplates[sector] || industryTemplates.default || INDUSTRY_COA_TEMPLATES.others.default;
};

const TYPE_COLORS = {
  income: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10B981' },
  expense: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#EF4444' },
  asset: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3B82F6' },
  liability: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#F59E0B' },
};

const CreateWorkbenchModal = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [coaLoading, setCoaLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdWorkbench, setCreatedWorkbench] = useState(null);
  const [jurisdictionAccepted, setJurisdictionAccepted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    industry: 'services',
    sector: 'technology',
    business_type: 'pvt_ltd',
    location: 'India',
    currency: 'INR',
    legal_name: '',
    pan: '',
    gstin: '',
    incorporation_date: '',
    fy_start: 'April',
    books_start_date: new Date().toISOString().split('T')[0],
  });

  if (!isOpen) return null;

  const isIndia = formData.location === 'India';
  const selectedCountry = COUNTRIES.find(c => c.value === formData.location) || COUNTRIES[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updates = { [name]: value };

    // Auto-set currency and FY start when country changes
    if (name === 'location') {
      const country = COUNTRIES.find(c => c.value === value);
      if (country) {
        updates.currency = country.currency;
        updates.fy_start = country.fyDefault;
      }
      // Clear India-specific fields when switching away
      if (value !== 'India') {
        updates.pan = '';
        updates.gstin = '';
      }
      // Reset jurisdiction acceptance on country change
      setJurisdictionAccepted(false);
    }

    setFormData({ ...formData, ...updates });
  };

  const isStepValid = () => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}[A-Z]{1}[0-9A-Z]{1}$/;

    switch (step) {
      case 1:
        return formData.name.trim() !== '' && formData.industry !== '' && formData.sector !== '' && formData.business_type !== '';
      case 2:
        return formData.location.trim() !== '' && formData.currency.trim() !== '';
      case 3:
        if (!isIndia) {
          // Non-India: require legal name, incorporation date, and jurisdiction acceptance
          return formData.legal_name.trim() !== '' && formData.incorporation_date !== '' && jurisdictionAccepted;
        }
        const vPan = formData.pan.trim().toUpperCase();
        const vGstin = formData.gstin.trim().toUpperCase();
        return (
          formData.legal_name.trim() !== '' &&
          panRegex.test(vPan) &&
          (!vGstin || gstinRegex.test(vGstin)) &&
          formData.incorporation_date !== ''
        );
      case 4:
        return formData.books_start_date !== '';
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (isStepValid()) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isStepValid() || step < 4) return;

    setLoading(true);
    setError(null);

    try {
      const { name, books_start_date, ...extraData } = formData;
      const workbench = await backendService.createWorkbench(
        name.trim(),
        books_start_date,
        `Workbench for ${name.trim()}`,
        extraData
      );

      setCreatedWorkbench(workbench);
      onSuccess(workbench);
      onClose();
      resetModal();
    } catch (err) {
      console.error("Error creating workbench:", err);
      setError(err.message || "Failed to create workbench");
    } finally {
      setLoading(false);
    }
  };



  const resetModal = () => {
    setStep(1);
    setCreatedWorkbench(null);
    setError(null);
    setJurisdictionAccepted(false);
    setFormData({
      name: '',
      industry: 'services',
      sector: 'technology',
      business_type: 'pvt_ltd',
      location: 'India',
      currency: 'INR',
      legal_name: '',
      pan: '',
      gstin: '',
      incorporation_date: '',
      fy_start: 'April',
      books_start_date: new Date().toISOString().split('T')[0],
    });
  };

  const steps = [
    { title: 'Company Info', icon: <Building2 size={18} /> },
    { title: 'Location', icon: <Globe size={18} /> },
    { title: 'Legal & Compliance', icon: <ShieldCheck size={18} /> },
    { title: 'Books & Start', icon: <Clock size={18} /> },
  ];



  return (
    <div className="modal-overlay">
      <div className="modal-content glass">
        <button className="close-btn" onClick={() => { resetModal(); onClose(); }}><X size={20} /></button>

        <div className="modal-header">
          <h2>Create New Workbench</h2>
          {step <= 4 && (
            <div className="step-progress">
              {steps.map((s, i) => (
                <div key={i} className={`step-item ${step > i + 1 ? 'completed' : ''} ${step === i + 1 ? 'active' : ''}`}>
                  <div className="step-icon">{step > i + 1 ? <Check size={14} /> : s.icon}</div>
                  <span className="step-title">{s.title}</span>
                  {i < steps.length - 1 && <div className="step-line"></div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="error-notice">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="form-step">
              <div className="form-grid">
                <div className="form-group span-2">
                  <label>Workbench Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Acme Corp Finance" required />
                </div>
                <div className="form-group">
                  <label>Business Industry</label>
                  <select name="industry" value={formData.industry} onChange={handleChange}>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="services">Services</option>
                    <option value="trading">Trading</option>
                    <option value="ecommerce">E-commerce</option>
                    <option value="others">Others</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Sector</label>
                  <select name="sector" value={formData.sector} onChange={handleChange}>
                    <option value="construction">Construction</option>
                    <option value="finance">Finance</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="technology">Technology</option>
                    <option value="education">Education</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="others">Others</option>
                  </select>
                </div>
                <div className="form-group span-2">
                  <label>Business Type</label>
                  <select name="business_type" value={formData.business_type} onChange={handleChange}>
                    <option value="proprietorship">Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="pvt_ltd">Private Limited (Pvt Ltd)</option>
                    <option value="llp">LLP</option>
                    <option value="public_ltd">Public Limited</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <div className="form-grid">
                <div className="form-group">
                  <label><Globe size={14} /> Country</label>
                  <select name="location" value={formData.location} onChange={handleChange}>
                    {COUNTRIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label><DollarSign size={14} /> Currency</label>
                  <input type="text" name="currency" value={formData.currency} onChange={handleChange} placeholder="e.g. INR" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <div className="form-grid">
                <div className="form-group span-2">
                  <label>Legal Entity Name *</label>
                  <input type="text" name="legal_name" value={formData.legal_name} onChange={handleChange} placeholder="Full legal name" required />
                </div>

                {isIndia ? (
                  <>
                    <div className="form-group">
                      <label>PAN *</label>
                      <input type="text" name="pan" value={formData.pan} onChange={handleChange} placeholder="ABCDE1234F" required />
                    </div>
                    <div className="form-group">
                      <label>GSTIN</label>
                      <input type="text" name="gstin" value={formData.gstin} onChange={handleChange} placeholder="22AAAAA0000A1Z5" />
                    </div>
                  </>
                ) : (
                  <div className="form-group span-2">
                    <label
                      className="jurisdiction-checkbox-wrapper"
                      onClick={() => setJurisdictionAccepted(!jurisdictionAccepted)}
                    >
                      <div className={`jurisdiction-check ${jurisdictionAccepted ? 'checked' : ''}`}>
                        {jurisdictionAccepted && <Check size={12} />}
                      </div>
                      <div className="jurisdiction-content">
                        <strong>Jurisdiction Acceptance *</strong>
                        <p>
                          I acknowledge that Dabby is incorporated and operates exclusively under 
                          <strong> Indian jurisdiction</strong>. Dabby does not collect tax identification 
                          numbers or regulatory compliance documents for entities outside India. 
                          I understand that Dabby and its parent entity are <strong>not liable</strong> for 
                          any regulatory, tax, or legal obligations arising in <strong>{selectedCountry.label}</strong> or 
                          any jurisdiction outside India. This platform is provided as a financial 
                          intelligence tool only — not as a licensed accounting or tax advisory service 
                          in my country.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <div className="form-group span-2">
                  <label>Date of Incorporation *</label>
                  <input type="date" name="incorporation_date" value={formData.incorporation_date} onChange={handleChange} required />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="form-step">
              <div className="form-grid">
                <div className="form-group">
                  <label>Financial Year Start *</label>
                  <select name="fy_start" value={formData.fy_start} onChange={handleChange}>
                    <option value="January">January</option>
                    <option value="April">April</option>
                    <option value="July">July</option>
                    <option value="October">October</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Books Start Date *</label>
                  <input type="date" name="books_start_date" value={formData.books_start_date} onChange={handleChange} required />
                </div>
              </div>
            </div>
          )}



          {step <= 4 && (
            <div className="modal-footer">
              {step > 1 && (
                <button type="button" className="back-btn" onClick={handleBack}>
                  <ChevronLeft size={18} /> Back
                </button>
              )}
              <div className="spacer"></div>
              {step < 4 ? (
                <button
                  type="button"
                  className={`next-btn ${!isStepValid() ? 'disabled' : ''}`}
                  onClick={handleNext}
                  disabled={!isStepValid()}
                >
                  Next Step <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  type="submit"
                  className={`submit-btn ${!isStepValid() || loading ? 'disabled' : ''}`}
                  onClick={handleSubmit}
                  disabled={!isStepValid() || loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="spinning" /> Creating...
                    </>
                  ) : 'Create Workbench'}
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      <style jsx="true">{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .modal-content {
          width: 100%;
          max-width: 700px;
          border-radius: 1.5rem;
          background-color: #0a0a0a;
          border: 1px solid #1a1a1a;
          position: relative;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          overflow: hidden;
          color: white;
        }

        .close-btn {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          color: #666;
          transition: color 0.2s;
          background: none;
          border: none;
          cursor: pointer;
          z-index: 10;
        }

        .close-btn:hover {
          color: white;
        }

        .modal-header {
          padding: 2.5rem 2.5rem 1.5rem;
          border-bottom: 1px solid #1a1a1a;
        }

        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 2rem;
          color: white;
        }

        .step-progress {
          display: flex;
          justify-content: space-between;
          position: relative;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          position: relative;
          flex: 1;
          z-index: 1;
        }

        .step-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          border: 1px solid #2a2a2a;
          transition: all 0.3s;
        }

        .step-item.active .step-icon {
          background-color: #81E6D9;
          color: #000;
          border-color: #81E6D9;
        }

        .step-item.completed .step-icon {
          background-color: rgba(129, 230, 217, 0.2);
          color: #81E6D9;
          border-color: #81E6D9;
        }

        .step-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: #666;
        }

        .step-item.active .step-title {
          color: white;
        }

        .step-line {
          position: absolute;
          top: 18px;
          left: 50%;
          width: 100%;
          height: 1px;
          background-color: #2a2a2a;
          z-index: -1;
        }

        .step-item.completed .step-line {
          background-color: #81E6D9;
        }

        .modal-body {
          padding: 2.5rem;
          overflow-y: auto;
          background-color: #0a0a0a;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group.span-2 {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #efefef;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .form-group input, .form-group select {
          background-color: #121212;
          border: 1px solid #2a2a2a;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          color: white;
          transition: all 0.2s;
        }

        .form-group input:focus, .form-group select:focus {
          border-color: #81E6D9;
          outline: none;
          background-color: #161616;
        }

        .form-group input::placeholder {
          color: #444;
        }

        .modal-footer {
          padding: 1.5rem 2.5rem 2.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-top: 1px solid #1a1a1a;
          background-color: #0a0a0a;
        }

        .spacer {
          flex: 1;
        }

        .next-btn, .submit-btn {
          background-color: #81E6D9;
          color: #000;
          padding: 0.75rem 1.8rem;
          border-radius: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: transform 0.2s;
          border: none;
          cursor: pointer;
        }

        .next-btn.disabled, .submit-btn.disabled {
          background-color: #333;
          color: #666;
          cursor: not-allowed;
          opacity: 0.5;
        }

        .back-btn {
          color: #888;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: color 0.2s;
          background: none;
          border: none;
          cursor: pointer;
        }

        .error-notice {
          padding: 0.75rem 1rem;
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 0.75rem;
          color: #ef4444;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
        }

        /* Jurisdiction Checkbox */
        .jurisdiction-checkbox-wrapper {
          display: flex;
          gap: 1rem;
          padding: 1.25rem;
          background-color: rgba(245, 158, 11, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 1rem;
          margin-top: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          align-items: flex-start;
        }

        .jurisdiction-checkbox-wrapper:hover {
          background-color: rgba(245, 158, 11, 0.08);
          border-color: rgba(245, 158, 11, 0.35);
        }

        .jurisdiction-check {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 2px solid rgba(245, 158, 11, 0.4);
          background-color: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          color: transparent;
          transition: all 0.2s;
          margin-top: 2px;
        }

        .jurisdiction-check.checked {
          background-color: #F59E0B;
          border-color: #F59E0B;
          color: #000;
        }

        .jurisdiction-content strong {
          display: block;
          font-size: 0.85rem;
          color: #F59E0B;
          margin-bottom: 0.5rem;
        }

        .jurisdiction-content p {
          font-size: 0.75rem;
          line-height: 1.6;
          color: #999;
          margin: 0;
        }

        .jurisdiction-content p strong {
          display: inline;
          color: #ccc;
          font-size: 0.75rem;
        }

        /* COA Guide Styles */
        .coa-guide {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .coa-intro {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .coa-intro-icon {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(129, 230, 217, 0.15), rgba(129, 230, 217, 0.05));
          border: 1px solid rgba(129, 230, 217, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #81E6D9;
        }

        .coa-intro h3 {
          font-size: 1rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.4rem;
        }

        .coa-intro p {
          font-size: 0.8rem;
          color: #888;
          line-height: 1.5;
          margin: 0;
        }

        .coa-hierarchy {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: 1rem 1.25rem;
          background-color: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 1rem;
        }

        .hierarchy-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 0;
        }

        .hierarchy-number {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background-color: rgba(129, 230, 217, 0.1);
          border: 1px solid rgba(129, 230, 217, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 800;
          color: #81E6D9;
          flex-shrink: 0;
        }

        .hierarchy-item strong {
          display: block;
          font-size: 0.8rem;
          color: white;
        }

        .hierarchy-item span {
          font-size: 0.7rem;
          color: #666;
        }

        .hierarchy-connector {
          width: 1px;
          height: 8px;
          background-color: #2a2a2a;
          margin-left: 14px;
        }

        .coa-recommended {
          border: 1px solid #1a1a1a;
          border-radius: 1rem;
          padding: 1.25rem;
          background-color: #0d0d0d;
        }

        .coa-recommended h4 {
          font-size: 0.8rem;
          font-weight: 700;
          color: #ccc;
          margin-bottom: 1rem;
        }

        .coa-labels-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .coa-label-chip {
          display: flex;
          flex-direction: column;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid;
          gap: 0.15rem;
        }

        .coa-label-type {
          font-size: 0.55rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .coa-label-name {
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }

        .coa-label-sub {
          font-size: 0.6rem;
          color: #666;
        }

        .coa-actions {
          display: flex;
          gap: 1rem;
          padding-top: 0.5rem;
        }

        .coa-action-btn {
          flex: 1;
          padding: 0.85rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .coa-action-btn.primary {
          background-color: #81E6D9;
          color: #000;
        }

        .coa-action-btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(129, 230, 217, 0.2);
        }

        .coa-action-btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .coa-action-btn.secondary {
          background-color: #1a1a1a;
          color: #999;
          border: 1px solid #2a2a2a;
        }

        .coa-action-btn.secondary:hover {
          border-color: #444;
          color: white;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CreateWorkbenchModal;
