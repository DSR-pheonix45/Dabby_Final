import React from 'react';
import { useBudgets } from '../../../../hooks/useOps';
import OpsSummaryCard from '../components/OpsSummaryCard';
import OpsFilterBar from '../components/OpsFilterBar';
import OpsDataTable from '../components/OpsDataTable';
import { BsPieChart, BsGraphDown, BsShieldCheck, BsPercent } from 'react-icons/bs';

export default function Budgeting({ workbenchId }) {
  const { 
    data, 
    kpis, 
    loading, 
    activeFilters, 
    setFilters, 
    searchQuery, 
    setSearchQuery 
  } = useBudgets(workbenchId);

  const filtersConfig = [
    {
      id: 'department',
      label: 'All Departments',
      options: [
        { value: 'marketing', label: 'Marketing' },
        { value: 'sales', label: 'Sales' },
        { value: 'it', label: 'IT' },
        { value: 'operations', label: 'Operations' }
      ]
    }
  ];

  const columns = [
    { header: 'Budget Name', accessor: 'name' },
    { header: 'Department', accessor: 'department' },
    { header: 'Category', accessor: 'category' },
    { 
      header: 'Allocated', 
      align: 'right',
      render: (row) => <span>${row.allocated.toLocaleString()}</span>
    },
    { 
      header: 'Utilized', 
      align: 'right',
      render: (row) => <span>${row.utilized.toLocaleString()}</span>
    },
    { 
      header: 'Remaining', 
      align: 'right',
      render: (row) => <span className="font-semibold text-teal-400">${row.remaining.toLocaleString()}</span>
    },
    { 
      header: 'Variance', 
      align: 'right',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          row.variance.startsWith('-') ? 'bg-teal-500/10 text-teal-400' : 'bg-rose-500/10 text-rose-400'
        }`}>
          {row.variance}
        </span>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end space-x-2">
          <button className="text-xs text-teal-400 hover:text-teal-300">View</button>
        </div>
      )
    }
  ];

  const formatCurrency = (val) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6 fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OpsSummaryCard title="Budget Allocated" value={formatCurrency(kpis.allocated)} icon={BsShieldCheck} />
        <OpsSummaryCard title="Budget Utilized" value={formatCurrency(kpis.utilized)} icon={BsGraphDown} />
        <OpsSummaryCard title="Remaining Budget" value={formatCurrency(kpis.remaining)} icon={BsPieChart} />
        <OpsSummaryCard title="Utilization" value={`${kpis.utilizationPercent}%`} icon={BsPercent} trend={{direction: 'down', value: '2.1%'}} />
      </div>

      {/* Chart Placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#181818] border border-white/10 rounded-xl p-6 h-64 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent"></div>
          <div className="text-center relative z-10">
            <BsPieChart className="text-4xl text-white/20 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Department Allocation Chart</p>
            <p className="text-xs text-gray-500 mt-1">Data visualization module pending</p>
          </div>
        </div>
        
        <div className="bg-[#181818] border border-white/10 rounded-xl p-6 h-64 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent"></div>
          <div className="text-center relative z-10">
            <BsGraphDown className="text-4xl text-white/20 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Utilization Trend</p>
            <p className="text-xs text-gray-500 mt-1">Data visualization module pending</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <OpsFilterBar 
        filters={filtersConfig}
        activeFilters={activeFilters}
        onFilterChange={(id, val) => setFilters(prev => ({ ...prev, [id]: val }))}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      {/* Data Table */}
      <OpsDataTable 
        columns={columns} 
        data={data} 
        loading={loading} 
        emptyMessage="No budgets found matching your criteria." 
      />
    </div>
  );
}
