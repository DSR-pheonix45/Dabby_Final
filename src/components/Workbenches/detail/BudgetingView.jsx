import React, { useState, useEffect } from "react";
import { BsArrowRight } from "react-icons/bs";
import Card from "../../shared/Card";
import { supabase } from "../../../lib/supabase";

export default function BudgetingView({ workbenchId }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState([
    { label: "TOTAL BUDGET", value: "₹0" },
    { label: "TOTAL ACTUAL", value: "₹0" },
    { label: "VARIANCE", value: "0%", color: "text-gray-500" },
  ]);

  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    if (workbenchId) {
      fetchBudgetData();
    }

    const handleRefresh = () => {
      console.log("Refreshing BudgetingView data...");
      fetchBudgetData();
    };

    window.addEventListener('refresh-workbench-data', handleRefresh);
    return () => window.removeEventListener('refresh-workbench-data', handleRefresh);
  }, [workbenchId]);

  const fetchBudgetData = async () => {
    try {
      setLoading(true);

      let budgetData = [];

      // Attempt 1: Try fetching from the View (Best for granular data)
      const { data, error } = await supabase
        .from('view_budget_vs_actual')
        .select('*')
        .eq('workbench_id', workbenchId);

      if (!error && data && data.length > 0) {
        budgetData = data;
      } else {
        // Attempt 2: Fallback to raw 'budgets' table if view is empty/missing
        // This handles cases where budget_items might be missing due to schema mismatch
        const { data: rawBudgets, error: rawError } = await supabase
          .from('budgets')
          .select('*')
          .eq('workbench_id', workbenchId);

        if (rawBudgets && rawBudgets.length > 0) {
          // Fetch Transactions to calculate Actuals
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, direction')
            .eq('workbench_id', workbenchId);

          // Fetch Adjustments
          const { data: adjustments } = await supabase
            .from('adjustments')
            .select('adjustment_amount')
            .eq('workbench_id', workbenchId);

          // Calculate Net Spend
          let netActualSpend = 0;
          if (transactions) {
            const debits = transactions.filter(t => t.direction === 'debit').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
            const credits = transactions.filter(t => t.direction === 'credit').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
            netActualSpend += (debits - credits);
          }
          if (adjustments) {
            const adjTotal = adjustments.reduce((s, a) => s + parseFloat(a.adjustment_amount || 0), 0);
            netActualSpend += adjTotal;
          }

          budgetData = rawBudgets.map((b, index) => ({
            category: b.name, // Use budget name as category
            budgeted_amount: parseFloat(b.total_amount || b.allocated_amount || 0),
            actual_amount: index === 0 ? netActualSpend : 0, // Assign total to first budget
            progress_percentage: 0
          }));
        } else if (rawError) {
          console.warn("Error fetching raw budgets:", rawError);
        }
      }

      if (budgetData.length > 0) {
        const totalBudgeted = budgetData.reduce((sum, item) => sum + item.budgeted_amount, 0);
        const totalActual = budgetData.reduce((sum, item) => sum + item.actual_amount, 0);
        const variance = totalBudgeted > 0
          ? ((totalBudgeted - totalActual) / totalBudgeted * 100).toFixed(1)
          : 0;

        const formatCurrency = (val) => {
          if (!val) return "₹0";
          if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
          if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
          return `₹${val}`;
        };

        const remainingTotal = totalBudgeted - totalActual;

        setSummary([
          { label: "TOTAL BUDGET", value: formatCurrency(totalBudgeted) },
          { label: "TOTAL ACTUAL", value: formatCurrency(totalActual) },
          {
            label: "REMAINING",
            value: formatCurrency(remainingTotal),
            color: remainingTotal >= 0 ? "text-emerald-500" : "text-red-500"
          },
        ]);

        setAccounts(budgetData.map(item => {
          const itemRemaining = item.budgeted_amount - item.actual_amount;
          return {
            name: item.category,
            budgeted: formatCurrency(item.budgeted_amount),
            actual: formatCurrency(item.actual_amount),
            variance: formatCurrency(itemRemaining), // Shows remaining amount
            varianceColor: itemRemaining >= 0 ? 'text-emerald-500' : 'text-red-500',
            progress: Math.round(item.progress_percentage || 0),
            color: (item.progress_percentage || 0) > 100 ? "bg-red-500" : "bg-primary-300"
          };
        }));
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error("Error fetching budget data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Budget vs Actual</h3>
        <p className="text-gray-500 text-xs mb-6">Q3 FY26 — Period-wise budget tracking by account</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {summary.map((s, i) => (
            <Card key={i} variant="dark" className="border-white/5 p-6 bg-[#0E1117]/80">
              <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase block mb-3">{s.label}</span>
              <div className={`text-2xl font-bold ${s.color || 'text-white'}`}>{s.value}</div>
            </Card>
          ))}
        </div>

        {/* Account Table */}
        <Card variant="dark" className="border-white/5 overflow-hidden bg-[#0E1117]/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Account</th>
                  <th className="px-6 py-4 text-right">Budgeted</th>
                  <th className="px-6 py-4 text-right">Actual</th>
                  <th className="px-6 py-4 text-right">Remaining</th>
                  <th className="px-6 py-4 min-w-[200px]">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {accounts.map((acc, i) => (
                  <tr key={i} className="group hover:bg-white/5 transition-colors">
                    <td className="px-6 py-5 text-sm font-medium text-gray-300 group-hover:text-primary-300 transition-colors">{acc.name}</td>
                    <td className="px-6 py-5 text-sm text-right text-gray-500">{acc.budgeted}</td>
                    <td className="px-6 py-5 text-sm text-right text-white font-medium">{acc.actual}</td>
                    <td className={`px-6 py-5 text-sm text-right font-medium ${acc.varianceColor}`}>
                      {acc.variance}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${acc.color} rounded-full`}
                            style={{ width: `${Math.min(acc.progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 w-8">{acc.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
