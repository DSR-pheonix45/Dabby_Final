import React, { useState } from 'react';
import { BsX, BsFileText, BsBraces, BsGraphUp, BsClockHistory } from 'react-icons/bs';
import PreviewTab from './tabs/PreviewTab';
import ExtractedDataTab from './tabs/ExtractedDataTab';
import FinancialImpactTab from './tabs/FinancialImpactTab';
import TimelineTab from './tabs/TimelineTab';

export default function RightPanel({ doc, onUpdate, onClose }) {
  const [activeTab, setActiveTab] = useState('EXTRACTED DATA');

  const tabs = [
    { id: 'PREVIEW', label: 'Preview', icon: BsFileText },
    { id: 'EXTRACTED DATA', label: 'Extracted Data', icon: BsBraces },
    { id: 'FINANCIAL IMPACT', label: 'Financial Impact', icon: BsGraphUp },
    { id: 'TIMELINE', label: 'Timeline', icon: BsClockHistory },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-4 -mb-4 text-xs font-bold tracking-wider uppercase transition-colors relative
                ${activeTab === tab.id ? "text-teal-400" : "text-gray-500 hover:text-gray-300"}`}
            >
              <tab.icon className="text-sm" />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-teal-500 rounded-t-full shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
              )}
            </button>
          ))}
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
        >
          <BsX className="w-5 h-5" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto relative">
        {activeTab === 'PREVIEW' && <PreviewTab doc={doc} />}
        {activeTab === 'EXTRACTED DATA' && <ExtractedDataTab doc={doc} onUpdate={onUpdate} />}
        {activeTab === 'FINANCIAL IMPACT' && <FinancialImpactTab doc={doc} onUpdate={onUpdate} />}
        {activeTab === 'TIMELINE' && <TimelineTab doc={doc} />}
      </div>
    </div>
  );
}
