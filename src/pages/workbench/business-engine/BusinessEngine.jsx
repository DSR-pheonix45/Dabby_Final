import React from 'react';
import { BsCpu, BsTools, BsGear } from 'react-icons/bs';

export default function BusinessEngine() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#0F1117] overflow-hidden font-sans text-gray-200">
      
      {/* Module Header */}
      <div className="px-6 lg:px-10 py-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141722]/80 backdrop-blur-md z-10">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BsCpu className="text-teal-400" />
            Business Engine
            <span className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-0.5 rounded-full uppercase font-bold">
              Workflow Engine
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Configure trade events, rules, and custom financial flows</p>
        </div>
      </div>

      {/* Main Blank Placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-6 shadow-xl shadow-teal-500/5 animate-pulse">
          <BsTools size={36} />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Business Engine Workspace</h2>
        <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
          This tab is reserved for custom trade logic, event mapping, and automated settlement workflows. Logic and workflow will be added here.
        </p>

        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-gray-400">
          <BsGear className="animate-spin text-teal-400" />
          <span>Workflow Ready for Custom Logic</span>
        </div>
      </div>

    </div>
  );
}
