import React from 'react';
import { BsSearch, BsFilter } from 'react-icons/bs';

export default function OpsFilterBar({ 
  filters, 
  filtersConfig, 
  activeFilters = {}, 
  onFilterChange = () => {}, 
  onSearch, 
  onSearchChange, 
  searchQuery = '' 
}) {
  const filterList = filters || filtersConfig || [];
  const handleSearchChange = onSearch || onSearchChange || (() => {});

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181818] p-4 rounded-xl border border-white/10 mb-6">
      
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full bg-[#111111] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-colors"
        />
      </div>

      {/* Filter Dropdowns */}
      {filterList.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center text-sm text-gray-400 mr-2">
            <BsFilter className="mr-2" /> Filters
          </div>
          
          {filterList.map((filter) => (
            <select
              key={filter.id}
              value={activeFilters[filter.id] || ''}
              onChange={(e) => onFilterChange(filter.id, e.target.value)}
              className="bg-[#111111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50 appearance-none min-w-[120px]"
            >
              <option value="">{filter.label}</option>
              {(filter.options || []).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ))}
        </div>
      )}
    </div>
  );
}
