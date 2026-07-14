import React, { useState } from 'react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { BsPlus, BsTrash, BsChevronRight, BsChevronDown } from 'react-icons/bs';

const defaultMasterData = [
  { id: 'asset', name: 'Asset', subAccounts: [] },
  { id: 'liabilities', name: 'Liabilities', subAccounts: [] },
  { id: 'revenue', name: 'Revenue', subAccounts: [] },
  { id: 'equity', name: 'Equity', subAccounts: [] },
  { id: 'expenses', name: 'Expenses', subAccounts: [] }
];

export default function CompanyMaster() {
  const { activeWorkbench, setActiveWorkbench } = useWorkbench();
  // We'll initialize from workbench if available, otherwise use defaults
  const [masterData, setMasterData] = useState(
    activeWorkbench?.companyMaster || defaultMasterData
  );

  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [expandedSubAccounts, setExpandedSubAccounts] = useState({});

  const toggleAccount = (accountId) => {
    setExpandedAccounts(prev => ({ ...prev, [accountId]: !prev[accountId] }));
  };

  const toggleSubAccount = (subAccountId) => {
    setExpandedSubAccounts(prev => ({ ...prev, [subAccountId]: !prev[subAccountId] }));
  };

  const addSubAccount = (accountId) => {
    const name = prompt("Enter sub-account name (e.g., based on industry, dept, size):");
    if (!name) return;

    setMasterData(prev => prev.map(acc => {
      if (acc.id === accountId) {
        return {
          ...acc,
          subAccounts: [...acc.subAccounts, { id: `sa_${Date.now()}`, name, labels: [] }]
        };
      }
      return acc;
    }));
    // Expand the account to show the new sub-account
    setExpandedAccounts(prev => ({ ...prev, [accountId]: true }));
  };

  const removeSubAccount = (accountId, subAccountId) => {
    if (!window.confirm("Are you sure you want to remove this sub-account?")) return;
    setMasterData(prev => prev.map(acc => {
      if (acc.id === accountId) {
        return {
          ...acc,
          subAccounts: acc.subAccounts.filter(sa => sa.id !== subAccountId)
        };
      }
      return acc;
    }));
  };

  const addLabel = (accountId, subAccountId) => {
    const name = prompt("Enter new label:");
    if (!name) return;

    setMasterData(prev => prev.map(acc => {
      if (acc.id === accountId) {
        return {
          ...acc,
          subAccounts: acc.subAccounts.map(sa => {
            if (sa.id === subAccountId) {
              return { ...sa, labels: [...sa.labels, { id: `lbl_${Date.now()}`, name }] };
            }
            return sa;
          })
        };
      }
      return acc;
    }));
    // Expand the sub-account to show the new label
    setExpandedSubAccounts(prev => ({ ...prev, [subAccountId]: true }));
  };

  const removeLabel = (accountId, subAccountId, labelId) => {
    setMasterData(prev => prev.map(acc => {
      if (acc.id === accountId) {
        return {
          ...acc,
          subAccounts: acc.subAccounts.map(sa => {
            if (sa.id === subAccountId) {
              return { ...sa, labels: sa.labels.filter(l => l.id !== labelId) };
            }
            return sa;
          })
        };
      }
      return acc;
    }));
  };

  const handleSave = () => {
    // In a real scenario, we'd make an API call to save masterData
    setActiveWorkbench({ ...activeWorkbench, companyMaster: masterData });
    alert("Company Master saved successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-white">Company Master Chart</h3>
            <p className="text-sm text-gray-500 mt-1">Manage accounts, sub-accounts, and labels for your company structure.</p>
          </div>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-medium rounded-md transition-colors text-sm"
          >
            Save Master Data
          </button>
        </div>

        <div className="space-y-4">
          {masterData.map((account) => (
            <div key={account.id} className="bg-[#1A1A1A] border border-white/5 rounded-lg">
              {/* Account Header */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleAccount(account.id)}
              >
                <div className="flex items-center space-x-3 text-white font-medium">
                  {expandedAccounts[account.id] ? <BsChevronDown size={16} className="text-gray-400" /> : <BsChevronRight size={16} className="text-gray-400" />}
                  <span>{account.name}</span>
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-400">Fixed</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); addSubAccount(account.id); }}
                  className="flex items-center space-x-1 text-sm text-teal-500 hover:text-teal-400 px-3 py-1 bg-teal-500/10 rounded-md"
                >
                  <BsPlus size={16} />
                  <span>Sub-account</span>
                </button>
              </div>

              {/* Sub-accounts */}
              {expandedAccounts[account.id] && (
                <div className="border-t border-white/5 p-4 pl-10 space-y-3">
                  {account.subAccounts.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No sub-accounts configured yet.</p>
                  ) : (
                    account.subAccounts.map((subAccount) => (
                      <div key={subAccount.id} className="bg-[#222] border border-white/5 rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div 
                            className="flex items-center space-x-2 text-gray-200 cursor-pointer font-medium"
                            onClick={() => toggleSubAccount(subAccount.id)}
                          >
                            {expandedSubAccounts[subAccount.id] ? <BsChevronDown size={14} className="text-gray-400" /> : <BsChevronRight size={14} className="text-gray-400" />}
                            <span>{subAccount.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => addLabel(account.id, subAccount.id)}
                              className="text-xs text-teal-500 hover:text-teal-400 px-2 py-1 bg-teal-500/10 rounded-md flex items-center"
                            >
                              <BsPlus size={14} /> Add Label
                            </button>
                            <button 
                              onClick={() => removeSubAccount(account.id, subAccount.id)}
                              className="text-red-500/70 hover:text-red-500 p-1"
                            >
                              <BsTrash size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Labels */}
                        {expandedSubAccounts[subAccount.id] && (
                          <div className="pl-6 pt-2 mt-2 border-t border-white/5 flex flex-wrap gap-2">
                            {subAccount.labels.length === 0 ? (
                              <span className="text-xs text-gray-500">No labels created.</span>
                            ) : (
                              subAccount.labels.map(label => (
                                <div key={label.id} className="flex items-center space-x-1 bg-white/10 px-2.5 py-1 rounded text-xs text-gray-300">
                                  <span>{label.name}</span>
                                  <button onClick={() => removeLabel(account.id, subAccount.id, label.id)} className="text-gray-400 hover:text-red-400 ml-1">
                                    &times;
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
