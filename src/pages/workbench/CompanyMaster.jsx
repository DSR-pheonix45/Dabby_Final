import React, { useState } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { BsTrash } from 'react-icons/bs';
import { toast } from 'react-hot-toast';

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
  
  // Try to load flat table structure from context, otherwise use an empty initial row
  const [tableRows, setTableRows] = useState(
    Array.isArray(activeWorkbench?.companyMaster) && activeWorkbench?.companyMaster.length > 0
      ? activeWorkbench.companyMaster
      : [
          { id: `row-${Date.now()}`, accountClass: '', groupCode: '', ledger: '', label: '', fullCode: '' }
        ]
  );

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
      { id: `row-${Date.now()}`, accountClass: '', groupCode: '', ledger: '', label: '', fullCode: '' }
    ]);
  };

  const deleteRow = (rowId) => {
    setTableRows(prev => {
      const freshRows = prev.filter(row => row.id !== rowId);
      return reindexRows(freshRows);
    });
  };

  const handleSave = () => {
    // Save to context
    changeActiveWorkbench({ ...activeWorkbench, companyMaster: tableRows });
    toast.success("Company Master saved successfully! (Frontend state)");
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-white">Company Master Chart</h3>
            <p className="text-sm text-gray-500 mt-1">Manage accounts, sub-accounts, and ledgers for your company structure.</p>
          </div>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-medium rounded-md transition-colors text-sm"
          >
            Save Master Data
          </button>
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
                  toast("Import Module - Coming Soon");
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
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 bg-white/5">
                <th className="p-3 text-left font-semibold">Code</th>
                <th className="p-3 text-left font-semibold">Account Class</th>
                <th className="p-3 text-left font-semibold">Sub-Account Group</th>
                <th className="p-3 text-left font-semibold">Ledger</th>
                <th className="p-3 text-left font-semibold">Label</th>
                <th className="p-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  {/* Code Field */}
                  <td className="p-3 font-mono text-teal-400 font-bold tracking-wider whitespace-nowrap">
                    {row.fullCode || '—'}
                  </td>

                  {/* Account Selection */}
                  <td className="p-3">
                    <select 
                      value={row.accountClass}
                      onChange={(e) => handleAccountChange(row.id, e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-teal-500 min-w-[150px]"
                    >
                      <option value="" disabled>Select Class</option>
                      {Object.values(ACCOUNT_CLASSES).map(cls => <option key={cls} value={cls}>{cls}</option>)}
                    </select>
                  </td>

                  {/* Dynamic Sub-Account Dropdown mapping */}
                  <td className="p-3">
                    <select 
                      value={row.groupCode}
                      disabled={!row.accountClass}
                      onChange={(e) => handleSubAccountChange(row.id, e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-teal-500 disabled:opacity-50 min-w-[200px]"
                    >
                      <option value="" disabled>Select Group</option>
                      {row.accountClass && SUB_ACCOUNT_GROUPS[row.accountClass]?.map(group => (
                        <option key={group.prefix} value={group.prefix}>{group.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Custom Input Vectors */}
                  <td className="p-3">
                    <input 
                      type="text" 
                      value={row.ledger} 
                      onChange={(e) => updateRowField(row.id, 'ledger', e.target.value)}
                      placeholder="e.g., ICICI Current" 
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded px-3 py-1.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500 min-w-[150px]"
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="text" 
                      value={row.label} 
                      onChange={(e) => updateRowField(row.id, 'label', e.target.value)}
                      placeholder="e.g., Operating" 
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded px-3 py-1.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500 min-w-[150px]"
                    />
                  </td>

                  {/* Delete Row Target */}
                  <td className="p-3 text-center">
                    <button 
                      onClick={() => deleteRow(row.id)} 
                      className="text-gray-500 hover:text-red-500 transition-colors p-1"
                      title="Delete Row"
                    >
                      <BsTrash size={16} />
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
  );
}
