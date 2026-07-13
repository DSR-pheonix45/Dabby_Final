import React from 'react';
import { BsSearch, BsFilter } from 'react-icons/bs';

export default function BusinessEngineFilters({ activeFilters, onFilterChange, searchQuery, onSearch }) {
  const documentTypes = ['Invoice', 'Receipt', 'Bank Statement', 'Bill'];
  const stages = [
    { id: 'ready_to_post', label: 'Draft · Ready to Post' },
    { id: 'needs_review', label: 'Needs Review' },
    { id: 'partially_completed', label: 'Partially Completed' },
    { id: 'completed', label: 'Completed' }
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181818] p-4 rounded-xl border border-white/10 mb-6">
      
      {/* Global Search */}
      <div className="relative flex-1 max-w-md">
        <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by party, doc type..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full bg-[#111111] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-colors"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center text-sm text-gray-400 mr-2">
          <BsFilter className="mr-2" /> Filters
        </div>
        
        <select
          value={activeFilters.type || ''}
          onChange={(e) => onFilterChange('type', e.target.value)}
          className="bg-[#111111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50 appearance-none min-w-[140px]"
        >
          <option value="">All Document Types</option>
          {documentTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select
          value={activeFilters.stage || ''}
          onChange={(e) => onFilterChange('stage', e.target.value)}
          className="bg-[#111111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50 appearance-none min-w-[140px]"
        >
          <option value="">All Stages</option>
          {stages.map(stage => (
            <option key={stage.id} value={stage.id}>{stage.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
