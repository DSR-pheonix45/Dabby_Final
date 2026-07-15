import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import AccountsReceivable from './tabs/AccountsReceivable';
import AccountsPayable from './tabs/AccountsPayable';
import Budgeting from './tabs/Budgeting';
import { BsDownload, BsArrowRepeat } from 'react-icons/bs';

export default function OPS() {
  const { workbench } = useOutletContext() || {};
  const workbenchId = workbench?.id;
  const [activeTab, setActiveTab] = useState('ar');

  const tabs = [
    { id: 'ar', label: 'Accounts Receivable' },
    { id: 'ap', label: 'Accounts Payable' },
    { id: 'budgeting', label: 'Budgeting' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111111] overflow-hidden">
      
      {/* Module Header */}
      <div className="px-6 lg:px-10 py-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181818]/50">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Operations</h1>
          <p className="text-sm text-gray-400 mt-1">Operational finance views and management</p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-[#181818] hover:bg-[#222222] border border-white/10 rounded-lg text-sm font-medium text-white transition-colors">
            <BsArrowRepeat className="text-gray-400" />
            <span>Refresh</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black border border-transparent rounded-lg text-sm font-bold transition-colors">
            <BsDownload />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 lg:px-10 border-b border-white/10 bg-[#181818]/50">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 text-sm font-bold border-b-2 transition-colors ${
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
        <div className="max-w-7xl mx-auto">
          {activeTab === 'ar' && <AccountsReceivable workbenchId={workbenchId} />}
          {activeTab === 'ap' && <AccountsPayable workbenchId={workbenchId} />}
          {activeTab === 'budgeting' && <Budgeting workbenchId={workbenchId} />}
        </div>
      </div>
      
    </div>
  );
}
