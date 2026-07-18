import React from 'react';
import { useAccountsReceivable } from '../../../../hooks/useOps';
import OpsSummaryCard from '../components/OpsSummaryCard';
import OpsFilterBar from '../components/OpsFilterBar';
import OpsDataTable from '../components/OpsDataTable';
import { BsCashCoin, BsExclamationTriangle, BsGraphUp, BsPeople } from 'react-icons/bs';

export default function AccountsReceivable({ workbenchId }) {
  const { 
    data, 
    kpis, 
    loading, 
    activeFilters, 
    setFilters, 
    searchQuery, 
    setSearchQuery 
  } = useAccountsReceivable(workbenchId);

  const filtersConfig = [
    {
      id: 'status',
      label: 'All Statuses',
      options: [
        { value: 'outstanding', label: 'Outstanding' },
        { value: 'overdue', label: 'Overdue' }
      ]
    }
  ];

  const columns = [
    { header: 'Customer', accessor: 'customer' },
    { header: 'Invoice #', accessor: 'invoiceNumber' },
    { header: 'Date', accessor: 'date' },
    { header: 'Due Date', accessor: 'dueDate' },
    { 
      header: 'Total', 
      align: 'right',
      render: (row) => <span className="font-semibold">₹{(row.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    },
    { 
      header: 'Paid', 
      align: 'right',
      render: (row) => <span className="font-medium text-emerald-400">₹{(row.paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    },
    { 
      header: 'Left', 
      align: 'right',
      render: (row) => <span className="font-bold text-amber-400">₹{(row.left || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    },
    { 
      header: 'Days Out.', 
      align: 'right',
      render: (row) => <span className={row.daysOutstanding > 30 ? 'text-rose-400' : ''}>{row.daysOutstanding}</span>
    },
    { 
      header: 'Status', 
      render: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          row.status === 'Overdue' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
        }`}>
          {row.status}
        </span>
      )
    },
    { header: 'Rep', accessor: 'rep' },
    {
      header: 'Actions',
      align: 'right',
      render: () => (
        <div className="flex justify-end space-x-2">
          <button className="text-xs text-teal-400 hover:text-teal-300">View</button>
          <button className="text-xs text-gray-400 hover:text-gray-300">Remind</button>
        </div>
      )
    }
  ];

  const formatCurrency = (val) => `₹${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OpsSummaryCard title="Total Receivable" value={formatCurrency(kpis.total)} icon={BsCashCoin} trend={{direction: 'up', value: '4%'}} />
        <OpsSummaryCard title="Overdue Receivable" value={formatCurrency(kpis.overdue)} icon={BsExclamationTriangle} trend={{direction: 'down', value: '2%'}} />
        <OpsSummaryCard title="Average DSO" value={`${kpis.dso} Days`} icon={BsGraphUp} subtitle="Days Sales Outstanding" />
        <OpsSummaryCard title="Customers Overdue" value={kpis.customersWithOverdue} icon={BsPeople} />
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
        emptyMessage="No receivables found matching your criteria." 
      />
    </div>
  );
}
