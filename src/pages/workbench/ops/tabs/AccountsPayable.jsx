import React from 'react';
import { useAccountsPayable } from '../../../../hooks/useOps';
import OpsSummaryCard from '../components/OpsSummaryCard';
import OpsFilterBar from '../components/OpsFilterBar';
import OpsDataTable from '../components/OpsDataTable';
import { BsWallet2, BsCalendarX, BsExclamationCircle, BsClockHistory } from 'react-icons/bs';

export default function AccountsPayable({ workbenchId }) {
  const { 
    data, 
    kpis, 
    loading, 
    activeFilters, 
    setFilters, 
    searchQuery, 
    setSearchQuery 
  } = useAccountsPayable(workbenchId);

  const filtersConfig = [
    {
      id: 'status',
      label: 'All Statuses',
      options: [
        { value: 'outstanding', label: 'Outstanding' },
        { value: 'due soon', label: 'Due Soon' },
        { value: 'overdue', label: 'Overdue' }
      ]
    }
  ];

  const columns = [
    { header: 'Vendor', accessor: 'vendor' },
    { header: 'Bill #', accessor: 'billNumber' },
    { header: 'Date', accessor: 'date' },
    { header: 'Due Date', accessor: 'dueDate' },
    { 
      header: 'Amount', 
      align: 'right',
      render: (row) => <span className="font-semibold">${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    },
    { 
      header: 'Days Left', 
      align: 'right',
      render: (row) => <span className={row.daysRemaining < 0 ? 'text-rose-400 font-medium' : ''}>{row.daysRemaining}</span>
    },
    { 
      header: 'Status', 
      render: (row) => {
        let colorClass = 'bg-gray-500/10 text-gray-400';
        if (row.status === 'Overdue') colorClass = 'bg-rose-500/10 text-rose-400';
        if (row.status === 'Due Soon') colorClass = 'bg-amber-500/10 text-amber-400';
        if (row.status === 'Outstanding') colorClass = 'bg-blue-500/10 text-blue-400';

        return (
          <span className={`px-2 py-1 rounded text-xs font-semibold ${colorClass}`}>
            {row.status}
          </span>
        );
      }
    },
    { header: 'Terms', accessor: 'terms' },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end space-x-2">
          <button className="text-xs text-teal-400 hover:text-teal-300">View</button>
          <button className="text-xs text-indigo-400 hover:text-indigo-300">Pay</button>
        </div>
      )
    }
  ];

  const formatCurrency = (val) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OpsSummaryCard title="Total Payables" value={formatCurrency(kpis.total)} icon={BsWallet2} />
        <OpsSummaryCard title="Due This Week" value={formatCurrency(kpis.dueThisWeek)} icon={BsCalendarX} trend={{direction: 'up', value: '12%'}} />
        <OpsSummaryCard title="Overdue Payables" value={formatCurrency(kpis.overdue)} icon={BsExclamationCircle} />
        <OpsSummaryCard title="Average DPO" value={`${kpis.dpo} Days`} icon={BsClockHistory} subtitle="Days Payable Outstanding" />
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
        emptyMessage="No payables found matching your criteria." 
      />
    </div>
  );
}
