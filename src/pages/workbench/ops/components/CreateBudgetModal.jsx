import React, { useState, useEffect } from 'react';
import { BsXLg, BsCheckCircleFill, BsShieldCheck, BsPlusLg, BsTrash, BsExclamationTriangle, BsArrowRepeat } from 'react-icons/bs';
import { budgetService } from '../../../../services/budgetService';
import { collaborationService } from '../../../../services/collaborationService';
import { toast } from 'react-hot-toast';

const CASH_ASSET_ACCOUNTS = [
  { code: 'A-ACO-01', name: 'Cash / Bank Main Account' },
  { code: 'A-ACO-02', name: 'HDFC Operating Current Acc' },
  { code: 'A-ACO-03', name: 'ICICI Operations Acc' },
  { code: 'A-ACO-04', name: 'Petty Cash Box / Chest' },
];

const PERIODS = [
  'Q3 2026',
  'Q4 2026',
  'H2 2026',
  'FY 2026-27',
  'Monthly Aug 2026',
  'Monthly Sep 2026',
];

export default function CreateBudgetModal({ isOpen, onClose, workbenchId, onBudgetCreated }) {
  if (!isOpen) return null;

  const [activeDepts, setActiveDepts] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [sourceCashAccount, setSourceCashAccount] = useState('A-ACO-01 — Cash / Bank Main Account');
  const [period, setPeriod] = useState('Q3 2026');
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Planned usage sub-categories
  const [categoriesPlan, setCategoriesPlan] = useState([
    { category: 'Primary Operational Spend', allocated: '' }
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && workbenchId) {
      setLoadingDepts(true);
      collaborationService.getDepartments(workbenchId)
        .then(depts => {
          const activeOnly = (depts || []).filter(d => (d.status || 'active').toLowerCase() === 'active');
          setActiveDepts(activeOnly);
          if (activeOnly.length > 0) {
            setDepartment(activeOnly[0].name);
          } else {
            setDepartment('');
          }
        })
        .catch(err => {
          console.warn("[CreateBudgetModal] Notice loading active depts:", err);
          setActiveDepts([]);
          setDepartment('');
        })
        .finally(() => setLoadingDepts(false));
    }
  }, [isOpen, workbenchId]);

  const handleAddCategory = () => {
    setCategoriesPlan(prev => [...prev, { category: '', allocated: '' }]);
  };

  const handleRemoveCategory = (index) => {
    setCategoriesPlan(prev => prev.filter((_, i) => i !== index));
  };

  const handleCategoryChange = (index, field, value) => {
    setCategoriesPlan(prev => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!department) {
      toast.error('Please select an active department');
      return;
    }
    if (!allocatedAmount || Number(allocatedAmount) <= 0) {
      toast.error('Please enter a valid total budget allocation amount');
      return;
    }

    const cleanCategories = categoriesPlan
      .filter(c => c.category.trim() !== '')
      .map(c => ({
        category: c.category.trim(),
        allocated: Number(c.allocated) || 0,
        spent: 0
      }));

    setSubmitting(true);
    try {
      await budgetService.createBudget(workbenchId, {
        name: name.trim() || `${department} Budget (${period})`,
        department,
        source_cash_account: sourceCashAccount,
        period,
        allocated_amount: Number(allocatedAmount),
        notes: notes.trim(),
        categories_plan: cleanCategories
      });

      toast.success(`Budget allocated to ${department} successfully!`);
      if (onBudgetCreated) onBudgetCreated();
      onClose();
    } catch (err) {
      console.error('[CreateBudgetModal] Error:', err);
      toast.error('Failed to create budget allocation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 font-dm-sans">
      <div className="bg-[#141414] border border-white/10 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#1A1A1A]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl flex items-center justify-center text-lg">
              <BsShieldCheck />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Create & Allocate Budget</h3>
              <p className="text-xs text-gray-400">Allocate budget from cash asset accounts to active workbench departments</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors">
            <BsXLg />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Active Department Selection */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Active Department Dimension *
            </label>
            {loadingDepts ? (
              <div className="flex items-center text-xs text-gray-400 py-2">
                <BsArrowRepeat className="animate-spin mr-2" /> Loading active departments…
              </div>
            ) : activeDepts.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                <BsExclamationTriangle className="text-sm shrink-0" />
                <span>No active departments found. Please add an active department in <strong>Members → Departments</strong> first.</span>
              </div>
            ) : (
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-teal-500"
              >
                {activeDepts.map(d => (
                  <option key={d.id} value={d.name}>
                    {d.name} {d.code ? `(${d.code})` : ''} — ACTIVE
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Financial Period */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Financial Period *
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
            >
              {PERIODS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Budget Title / Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Budget Initiative Name (Optional)
            </label>
            <input
              type="text"
              placeholder={department ? `e.g. ${department} Growth & Ops Budget` : 'e.g. Q3 Growth Initiative'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Source Cash Asset Account */}
          <div className="p-4 bg-[#181818] border border-teal-500/20 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-teal-400 uppercase tracking-wider">
              Source Cash Asset Account (Funding Account) *
            </label>
            <p className="text-[11px] text-gray-400">
              Select the liquidity/cash asset account from which budget liquidity will be allocated.
            </p>
            <select
              value={sourceCashAccount}
              onChange={(e) => setSourceCashAccount(e.target.value)}
              className="w-full px-3 py-2.5 bg-black/60 border border-teal-500/30 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-teal-400"
            >
              {CASH_ASSET_ACCOUNTS.map(a => (
                <option key={a.code} value={`${a.code} — ${a.name}`}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Allocated Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Total Budget Amount to Allocate (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="e.g. 50000"
              value={allocatedAmount}
              onChange={(e) => setAllocatedAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-teal-400 font-extrabold focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Planned Usage Breakdown */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Planned Usage Categories
              </label>
              <button
                type="button"
                onClick={handleAddCategory}
                className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                <BsPlusLg className="text-[10px]" /> Add Category
              </button>
            </div>

            <div className="space-y-2">
              {categoriesPlan.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Digital Ads / Software Licenses"
                    value={c.category}
                    onChange={(e) => handleCategoryChange(i, 'category', e.target.value)}
                    className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                  <input
                    type="number"
                    placeholder="Plan Amt (₹)"
                    value={c.allocated}
                    onChange={(e) => handleCategoryChange(i, 'allocated', e.target.value)}
                    className="w-32 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                  {categoriesPlan.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(i)}
                      className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                    >
                      <BsTrash className="text-xs" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Remarks & Strategic Objective
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Budget allocation for active department operations"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || activeDepts.length === 0}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              <BsCheckCircleFill />
              <span>{submitting ? 'Allocating...' : 'Allocate Budget'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
