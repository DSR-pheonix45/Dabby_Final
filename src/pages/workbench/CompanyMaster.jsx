import React, { useState } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { BsTrash, BsUpload, BsXLg, BsCheck } from 'react-icons/bs';
import { toast } from 'react-hot-toast';
import { accountService } from '../../services/accountService';

const ACCOUNT_CLASSES = {
  A: 'Assets',
  L: 'Liabilities',
  E: 'Equity',
  R: 'Revenue',
  X: 'Expenses'
};

const SUB_ACCOUNT_GROUPS = {
  Assets: [
    { label: 'Cash & Cash Equivalents', prefix: 'ACO' },
    { label: 'Accounts Receivable', prefix: 'AAR' },
    { label: 'Inventory', prefix: 'AIN' },
    { label: 'Tax & Operational Advances', prefix: 'ATX' },
    { label: 'Fixed & Intangible Assets', prefix: 'AFA' }
  ],
  Liabilities: [
    { label: 'Accounts Payable', prefix: 'LAP' },
    { label: 'Debt & Credit Lines', prefix: 'LDE' },
    { label: 'Statutory & Tax Liabilities', prefix: 'LST' },
    { label: 'Payroll Liabilities', prefix: 'LPR' }
  ],
  Equity: [
    { label: 'Share Capital', prefix: 'ESC' },
    { label: 'Retained Earnings & Option Pools', prefix: 'ERE' }
  ],
  Revenue: [
    { label: 'Operating Revenue', prefix: 'ROP' },
    { label: 'Contra-Revenue & Other Income', prefix: 'RCR' }
  ],
  Expenses: [
    { label: 'Direct Costs (COGS)', prefix: 'XDC' },
    { label: 'Personnel Costs (OPEX)', prefix: 'XPE' },
    { label: 'Marketing & Growth (OPEX)', prefix: 'XMK' },
    { label: 'Technology & Internal Tools (OPEX)', prefix: 'XTE' },
    { label: 'Administrative & Statutory Expenses', prefix: 'XAD' }
  ]
};

export default function CompanyMaster() {
  const { activeWorkbench, changeActiveWorkbench } = useWorkbench();
  
  const [initialAccounts, setInitialAccounts] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Upload States
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedAccounts, setImportedAccounts] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);

  React.useEffect(() => {
    if (activeWorkbench) {
      loadAccounts();
    }
  }, [activeWorkbench]);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await accountService.getAccounts(activeWorkbench.id);
      setInitialAccounts(data);
      if (data && data.length > 0) {
        // Map backend snake_case to frontend camelCase
        setTableRows(data.map(acc => ({
          id: acc.id,
          accountClass: acc.account_class,
          groupCode: acc.group_code,
          ledger: acc.ledger,
          label: acc.label || '',
          fullCode: acc.full_code,
          isNew: false
        })));
      } else {
        setTableRows([{ id: `row-${Date.now()}`, accountClass: '', groupCode: '', ledger: '', label: '', fullCode: '', isNew: true }]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to completely re-index all rows to guarantee consecutive numbering (01, 02, 03...)
  const reindexRows = (rows) => {
    const counters = {};
    return rows.map(row => {
      if (!row.groupCode) return { ...row, fullCode: '' };
      if (!counters[row.groupCode]) counters[row.groupCode] = 0;
      counters[row.groupCode]++;
      const paddedSequence = String(counters[row.groupCode]).padStart(2, '0');
      return { ...row, fullCode: `${row.groupCode}${paddedSequence}` };
    });
  };

  const handleAccountChange = (rowId, newClass) => {
    setTableRows(prev => {
      const updated = prev.map(row => {
        if (row.id !== rowId) return row;
        // Reset downstream values since the parent class changed
        return { ...row, accountClass: newClass, groupCode: '', fullCode: '' };
      });
      return reindexRows(updated);
    });
  };

  const handleSubAccountChange = (rowId, newPrefix) => {
    setTableRows(prev => {
      const updated = prev.map(row => {
        if (row.id !== rowId) return row;
        return { ...row, groupCode: newPrefix };
      });
      return reindexRows(updated);
    });
  };

  const updateRowField = (rowId, fieldName, value) => {
    setTableRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, [fieldName]: value } : row
    ));
  };

  const addNewBlankRow = () => {
    setTableRows(prev => [
      ...prev, 
      { id: `row-${Date.now()}`, accountClass: '', groupCode: '', ledger: '', label: '', fullCode: '', isNew: true }
    ]);
  };

  const deleteRow = (rowId) => {
    setTableRows(prev => {
      const freshRows = prev.filter(row => row.id !== rowId);
      return reindexRows(freshRows);
    });
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return toast.error("Please select a file first");
    setIsProcessing(true);
    try {
      const result = await accountService.importAccounts(activeWorkbench.id, uploadFile);
      setImportedAccounts(result.accounts || []);
      setUploadModalOpen(false);
      setConfirmModalOpen(true);
    } catch (err) {
      toast.error("Failed to process document: " + err.message);
    } finally {
      setIsProcessing(false);
      setUploadFile(null);
    }
  };

  const confirmImport = () => {
    const newRows = importedAccounts.map((acc, index) => ({
      id: `imported-${Date.now()}-${index}`,
      accountClass: acc.account_class || '',
      groupCode: acc.group_code || '',
      ledger: acc.ledger || '',
      label: acc.label || '',
      fullCode: '', // will be reindexed
      isNew: true
    }));
    setTableRows(prev => reindexRows([...prev, ...newRows]));
    setConfirmModalOpen(false);
    toast.success("Accounts imported! Click Save Master Data to confirm.");
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all accounts in this Chart of Accounts? This will permanently delete all saved ledgers.")) {
      return;
    }
    setIsSaving(true);
    try {
      await accountService.clearAllAccounts(activeWorkbench.id);
      setInitialAccounts([]);
      setTableRows([]);
      toast.success("Chart of Accounts cleared successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear accounts: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Find deleted rows
      const currentIds = new Set(tableRows.map(r => r.id));
      const deletedAccountIds = initialAccounts.filter(acc => !currentIds.has(acc.id)).map(acc => acc.id);
      
      // 2. Prepare formatted accounts payload
      const validAccounts = tableRows
        .filter(row => row.fullCode && row.ledger)
        .map(row => ({
          id: row.id,
          account_class: row.accountClass,
          group_code: row.groupCode,
          full_code: row.fullCode,
          ledger: row.ledger,
          label: row.label,
          is_new: !!row.isNew
        }));

      await accountService.syncAccounts(activeWorkbench.id, validAccounts, deletedAccountIds);
      
      toast.success("Company Master synchronized successfully!");
      await loadAccounts(); // Reload to get actual UUIDs from DB
    } catch (err) {
      console.error(err);
      toast.error("Failed to sync Company Master: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">Loading Company Master...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-white">Company Master Chart</h3>
              <p className="text-sm text-gray-500 mt-1">Manage accounts, sub-accounts, and ledgers for your company structure.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleClearAll}
                disabled={isSaving}
                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium rounded-md transition-colors text-sm disabled:opacity-50 flex items-center gap-1.5"
                title="Delete all ledgers in this Chart of Accounts"
              >
                <BsTrash size={15} />
                <span>Clear All</span>
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-medium rounded-md transition-colors text-sm disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Master Data"}
              </button>
            </div>
          </div>

          {/* Top Action Bar Layer */}
          <div className="flex justify-between items-center mb-6 gap-2 border-b border-white/10 pb-4">
            <div className="flex gap-4">
              <button 
                onClick={() => toast("✨ AI Assistant - Coming Soon")} 
                className="flex items-center space-x-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-md text-sm font-medium transition-colors"
              >
                <span>✨ AI Assistant</span>
              </button>
              <select 
                onChange={(e) => {
                  if (e.target.value) {
                    setUploadModalOpen(true);
                    e.target.value = ""; // reset
                  }
                }} 
                className="bg-[#222] border border-white/10 text-gray-300 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-teal-500"
                defaultValue=""
              >
                <option value="" disabled>⬇️ Import Data</option>
                <option value="tally">Tally XML</option>
                <option value="zoho">Zoho Books</option>
                <option value="pl">P&L / Balance Sheet</option>
                <option value="trial">Trial Balance</option>
              </select>
            </div>
          </div>

          {/* Flat Data Table Matrix */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-base">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 bg-white/5">
                  <th className="p-4 text-left font-semibold">Code</th>
                  <th className="p-4 text-left font-semibold">Account Class</th>
                  <th className="p-4 text-left font-semibold">Sub-Account Group</th>
                  <th className="p-4 text-left font-semibold">Ledger</th>
                  <th className="p-4 text-left font-semibold">Label</th>
                  <th className="p-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    {/* Code Field */}
                    <td className="p-4 font-mono text-teal-400 font-bold tracking-wider whitespace-nowrap">
                      {row.fullCode || '—'}
                    </td>

                    {/* Account Selection */}
                    <td className="p-4">
                      <select 
                        value={row.accountClass}
                        onChange={(e) => handleAccountChange(row.id, e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-teal-500 min-w-[150px]"
                      >
                        <option value="" disabled>Select Class</option>
                        {Object.values(ACCOUNT_CLASSES).map(cls => <option key={cls} value={cls}>{cls}</option>)}
                      </select>
                    </td>

                    {/* Dynamic Sub-Account Dropdown mapping */}
                    <td className="p-4">
                      <select 
                        value={row.groupCode}
                        disabled={!row.accountClass}
                        onChange={(e) => handleSubAccountChange(row.id, e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-teal-500 disabled:opacity-50 min-w-[200px]"
                      >
                        <option value="" disabled>Select Group</option>
                        {row.accountClass && SUB_ACCOUNT_GROUPS[row.accountClass]?.map(group => (
                          <option key={group.prefix} value={group.prefix}>{group.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Custom Input Vectors */}
                    <td className="p-4">
                      <input 
                        type="text" 
                        value={row.ledger} 
                        onChange={(e) => updateRowField(row.id, 'ledger', e.target.value)}
                        placeholder="e.g., ICICI Current" 
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded px-3 py-2 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500 min-w-[180px]"
                      />
                    </td>
                    <td className="p-4">
                      <input 
                        type="text" 
                        value={row.label} 
                        onChange={(e) => updateRowField(row.id, 'label', e.target.value)}
                        placeholder="e.g., Operating" 
                        className="w-full bg-[#1A1A1A] border border-white/10 rounded px-3 py-2 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500 min-w-[180px]"
                      />
                    </td>

                    {/* Delete Row Target */}
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => deleteRow(row.id)} 
                        className="text-gray-500 hover:text-red-500 transition-colors p-2"
                        title="Delete Row"
                      >
                        <BsTrash size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tableRows.length === 0 && (
              <div className="py-8 text-center text-gray-500 italic border-b border-white/5">
                No ledgers added yet.
              </div>
            )}
          </div>

          <button 
            onClick={addNewBlankRow} 
            className="mt-4 flex items-center space-x-2 text-teal-500 hover:text-teal-400 font-medium text-sm transition-colors"
          >
            <span className="text-lg leading-none mb-0.5">+</span>
            <span>Add Row</span>
          </button>

        </div>
      </div>

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#18181A] border border-white/10 rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => { setUploadModalOpen(false); setUploadFile(null); }} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <BsXLg />
            </button>
            <h3 className="text-xl font-bold text-white mb-2">Import Document</h3>
            <p className="text-sm text-gray-400 mb-6">Upload your Trial Balance, P&L, Tally XML, or Zoho export. Our AI will automatically map the ledgers.</p>
            
            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 hover:border-teal-500/50 transition-colors relative cursor-pointer">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => setUploadFile(e.target.files[0])}
              />
              <BsUpload className="text-3xl text-teal-500 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-300">
                {uploadFile ? uploadFile.name : 'Click or drag file to upload'}
              </p>
            </div>
            
            <button 
              onClick={handleUploadSubmit}
              disabled={!uploadFile || isProcessing}
              className="w-full mt-6 bg-teal-500 hover:bg-teal-400 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isProcessing ? 'Analyzing Document...' : 'Scan & Extract Accounts'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-[#18181A] border border-white/10 rounded-2xl shadow-2xl p-6 relative max-h-[80vh] flex flex-col">
            <button onClick={() => setConfirmModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <BsXLg />
            </button>
            <h3 className="text-xl font-bold text-white mb-2">Review Extracted Accounts</h3>
            <p className="text-sm text-gray-400 mb-4">Please review the AI mapping before adding these ledgers to your Company Master.</p>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/10 rounded-xl mb-6">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#111] text-gray-400 sticky top-0">
                  <tr>
                    <th className="p-3 border-b border-white/10 font-semibold">Ledger</th>
                    <th className="p-3 border-b border-white/10 font-semibold">Account Class</th>
                    <th className="p-3 border-b border-white/10 font-semibold">Group Code</th>
                    <th className="p-3 border-b border-white/10 font-semibold">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {importedAccounts.map((acc, idx) => (
                    <tr key={idx} className="border-b border-white/5 text-gray-200 hover:bg-white/5">
                      <td className="p-3 font-medium">{acc.ledger}</td>
                      <td className="p-3">{acc.account_class}</td>
                      <td className="p-3 font-mono text-teal-400">{acc.group_code}</td>
                      <td className="p-3">{acc.label}</td>
                    </tr>
                  ))}
                  {importedAccounts.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500">No accounts could be extracted.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setConfirmModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmImport}
                disabled={importedAccounts.length === 0}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                <BsCheck size={20} />
                Confirm & Append
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
