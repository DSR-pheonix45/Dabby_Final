import React, { useState, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import AccountsReceivable from './tabs/AccountsReceivable';
import AccountsPayable from './tabs/AccountsPayable';
import Budgeting from './tabs/Budgeting';
import ExpenseClaimsReview from './tabs/ExpenseClaimsReview';
import Transfers from './tabs/Transfers';
import { BsArrowRepeat } from 'react-icons/bs';
import { toast } from 'react-hot-toast';

export default function OPS() {
  const { workbench } = useOutletContext() || {};
  const location = useLocation();
  const workbenchId = workbench?.id;
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'ar');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  const tabs = [
    { id: 'ar', label: 'Accounts Receivable' },
    { id: 'ap', label: 'Accounts Payable' },
    { id: 'budgeting', label: 'Budgeting' },
    { id: 'claims', label: 'Employee Claims & Approvals' },
    { id: 'transfers', label: 'Transfers & Capital' }
  ];

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success("Operations data refreshed");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111111] overflow-hidden">
      
      {/* Module Header */}
      <div className="px-6 lg:px-10 py-5 border-b border-white/10 flex items-center justify-between gap-4 bg-[#181818]/50">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Operations
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Operational finance views and management</p>
        </div>

        <button 
          onClick={handleRefresh}
          title="Refresh Operations Data"
          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all shadow-sm flex items-center justify-center"
        >
          <BsArrowRepeat className="text-base" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 lg:px-10 border-b border-white/10 bg-[#181818]/50">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-auto px-6 lg:px-10 py-8">
        <div className="w-full">
          {activeTab === 'ar' && <AccountsReceivable key={refreshKey} workbenchId={workbenchId} />}
          {activeTab === 'ap' && <AccountsPayable key={refreshKey} workbenchId={workbenchId} />}
          {activeTab === 'budgeting' && <Budgeting key={refreshKey} workbenchId={workbenchId} />}
          {activeTab === 'claims' && <ExpenseClaimsReview key={refreshKey} workbenchId={workbenchId} />}
          {activeTab === 'transfers' && <Transfers key={refreshKey} workbenchId={workbenchId} />}
        </div>
      </div>
      
    </div>
  );
}
