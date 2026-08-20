import React, { useState, useEffect, useCallback } from 'react';
import { 
  BsShieldCheck, 
  BsGraphDown, 
  BsPieChart, 
  BsPercent, 
  BsPlusLg, 
  BsBank, 
  BsLayers, 
  BsArrowRepeat,
  BsTrash,
  BsCheckCircleFill,
  BsExclamationTriangle
} from 'react-icons/bs';
import OpsSummaryCard from '../components/OpsSummaryCard';
import OpsFilterBar from '../components/OpsFilterBar';
import OpsDataTable from '../components/OpsDataTable';
import CreateBudgetModal from '../components/CreateBudgetModal';
import { budgetService } from '../../../../services/budgetService';
import { collaborationService } from '../../../../services/collaborationService';
import { formatCurrency } from '../../../../utils/currency';
import { toast } from 'react-hot-toast';

export default function Budgeting({ workbenchId }) {
  const [budgets, setBudgets] = useState([]);
  const [activeDepts, setActiveDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadBudgets = useCallback(async () => {
    if (!workbenchId) return;
    setLoading(true);
    try {
      const list = await budgetService.getBudgets(workbenchId);
      setBudgets(list || []);
      const depts = await collaborationService.getDepartments(workbenchId);
      const activeOnly = (depts || []).filter(d => (d.status || 'active').toLowerCase() === 'active');
      setActiveDepts(activeOnly);
    } catch (err) {
      console.error('[Budgeting] Failed to load budgets:', err);
      toast.error('Failed to load budget allocations');
    } finally {
      setLoading(false);
    }
  }, [workbenchId]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  useEffect(() => {
    const handleUpdate = () => loadBudgets();
    window.addEventListener('budget:updated', handleUpdate);
    return () => window.removeEventListener('budget:updated', handleUpdate);
  }, [loadBudgets]);

  const handleDelete = async (budgetId) => {
    if (!window.confirm('Are you sure you want to remove this budget allocation?')) return;
    try {
      await budgetService.deleteBudget(workbenchId, budgetId);
      toast.success('Budget allocation deleted');
      loadBudgets();
    } catch (err) {
      toast.error('Failed to delete budget');
    }
  };

  // KPIs
  const totalAllocated = budgets.reduce((sum, b) => sum + (Number(b.allocated_amount) || 0), 0);
  const totalUtilized = budgets.reduce((sum, b) => sum + (Number(b.utilized_amount) || 0), 0);
  const totalRemaining = Math.max(0, totalAllocated - totalUtilized);
  const overallUtilization = totalAllocated > 0 ? Math.round((totalUtilized / totalAllocated) * 100) : 0;

  // Filtered list
  const filteredBudgets = budgets.filter(b => {
    const term = search.toLowerCase();
    const matchesSearch = 
      (b.name || '').toLowerCase().includes(term) ||
      (b.department || '').toLowerCase().includes(term) ||
      (b.source_cash_account || '').toLowerCase().includes(term) ||
      (b.period || '').toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (deptFilter && b.department.toLowerCase() !== deptFilter.toLowerCase()) return false;
    return true;
  });

  const filtersConfig = [
    {
      id: 'department',
      label: 'Active Department Dimension',
      options: activeDepts.map(d => ({ value: d.name, label: d.name }))
    }
  ];

  const columns = [
    {
      header: 'Budget & Dimension',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-bold text-white text-xs">{row.name}</p>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{row.period}</p>
        </div>
      )
    },
    {
      header: 'Department Dimension',
      accessor: 'department',
      render: (row) => (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20">
          {row.department}
        </span>
      )
    },
    {
      header: 'Source Cash Asset Acc',
      accessor: 'source_cash_account',
      render: (row) => (
        <div className="flex items-center space-x-1.5 text-xs text-gray-300">
          <BsBank className="text-teal-400 text-xs shrink-0" />
          <span className="font-mono text-[11px]">{row.source_cash_account}</span>
        </div>
      )
    },
    {
      header: 'Allocated (₹)',
      align: 'right',
      render: (row) => (
        <span className="font-extrabold text-white text-xs">
          ₹{Number(row.allocated_amount || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Utilized (₹)',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-rose-400 text-xs">
          ₹{Number(row.utilized_amount || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Remaining Balance',
      align: 'right',
      render: (row) => {
        const rem = (row.allocated_amount || 0) - (row.utilized_amount || 0);
        return (
          <span className={`font-extrabold text-xs ${rem >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
            ₹{rem.toLocaleString()}
          </span>
        );
      }
    },
    {
      header: 'Status',
      align: 'right',
      render: (row) => {
        const pct = row.allocated_amount > 0 ? Math.round((row.utilized_amount / row.allocated_amount) * 100) : 0;
        const isOver = pct > 100;
        const isNear = pct >= 80 && pct <= 100;
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            isOver ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
            isNear ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
            'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          }`}>
            {isOver ? 'Over Budget' : `${pct}% Utilized`}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => handleDelete(row.id)}
          className="text-xs text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"
          title="Delete Budget Allocation"
        >
          <BsTrash />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 fade-in font-dm-sans">
      {/* Top Banner & Allocation Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141722] border border-white/10 rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BsShieldCheck className="text-teal-400" /> Department Financial Dimensions & Budget Planning
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Create and allocate budgets directly from cash-related asset accounts to department dimensions and plan expected expenditure usage.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={loadBudgets}
            className="p-2.5 bg-[#181818] hover:bg-[#222] border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
            title="Refresh Budgets"
          >
            <BsArrowRepeat className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2"
          >
            <BsPlusLg className="w-3.5 h-3.5" /> + Create & Allocate Budget
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OpsSummaryCard 
          title="Total Budget Allocated" 
          value={`₹${totalAllocated.toLocaleString()}`} 
          trend="Funded from Cash Assets"
          isPositive={true}
          icon={BsShieldCheck} 
        />
        <OpsSummaryCard 
          title="Total Utilized Spend" 
          value={`₹${totalUtilized.toLocaleString()}`} 
          trend="Posted Bills & Expenses"
          isPositive={false}
          icon={BsGraphDown} 
        />
        <OpsSummaryCard 
          title="Net Remaining Budget" 
          value={`₹${totalRemaining.toLocaleString()}`} 
          trend="Available Liquidity"
          isPositive={true}
          icon={BsPieChart} 
        />
        <OpsSummaryCard 
          title="Overall Utilization" 
          value={`${overallUtilization}%`} 
          trend={`${budgets.length} Active Allocations`}
          isPositive={overallUtilization <= 85}
          icon={BsPercent} 
        />
      </div>

      {/* Visual Department Dimension Allocation Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
            <BsLayers className="text-teal-400" /> Department Dimension Allocations ({budgets.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBudgets.map(b => {
            const alloc = b.allocated_amount || 0;
            const uti = b.utilized_amount || 0;
            const pct = alloc > 0 ? Math.min(100, Math.round((uti / alloc) * 100)) : 0;
            const rem = Math.max(0, alloc - uti);

            return (
              <div key={b.id} className="bg-[#181818] border border-white/10 rounded-2xl p-5 space-y-4 hover:border-teal-500/30 transition-all">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400">
                      {b.department}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1.5">{b.name}</h4>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{b.period}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-gray-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <BsTrash className="text-sm" />
                  </button>
                </div>

                {/* Source Account Tag */}
                <div className="flex items-center space-x-2 text-xs bg-[#111111] p-2.5 rounded-xl border border-white/5">
                  <BsBank className="text-teal-400 text-xs shrink-0" />
                  <span className="text-gray-400 text-[11px]">Funded From:</span>
                  <span className="font-mono text-white text-[11px] font-semibold">{b.source_cash_account}</span>
                </div>

                {/* Progress Bar & Amounts */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-400">Utilized: <strong className="text-white">₹{uti.toLocaleString()}</strong></span>
                    <span className="text-gray-400">Allocated: <strong className="text-teal-400">₹{alloc.toLocaleString()}</strong></span>
                  </div>

                  <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct > 90 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-teal-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 font-mono">Remaining: ₹{rem.toLocaleString()}</span>
                    <span className={`font-bold ${pct > 90 ? 'text-rose-400' : 'text-teal-400'}`}>{pct}% Used</span>
                  </div>
                </div>

                {/* Planned Categories */}
                {b.categories_plan && b.categories_plan.length > 0 && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Usage Category Plan:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {b.categories_plan.map((cp, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] text-gray-300">
                          {cp.category}: <strong className="text-white">₹{Number(cp.allocated || 0).toLocaleString()}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <OpsFilterBar 
        filters={filtersConfig}
        activeFilters={{ department: deptFilter }}
        onFilterChange={(id, val) => setDeptFilter(val)}
        searchQuery={search}
        onSearch={setSearch}
      />

      {/* Data Table */}
      <OpsDataTable 
        columns={columns} 
        data={filteredBudgets} 
        loading={loading} 
        emptyMessage="No budget allocations found matching your criteria. Click '+ Create & Allocate Budget' to set up department budget dimensions." 
      />

      {/* Create Budget Modal */}
      <CreateBudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workbenchId={workbenchId}
        onBudgetCreated={loadBudgets}
      />
    </div>
  );
}
