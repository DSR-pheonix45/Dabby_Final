import { collaborationService } from "./collaborationService";

const STORAGE_KEY = "dabby_budget_allocations";

export const budgetService = {
  /**
   * Fetch all budget allocations for a workbench (matching active departments)
   */
  async getBudgets(workbenchId) {
    let list = [];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${workbenchId}`);
      if (stored) {
        try { list = JSON.parse(stored); } catch (err) {}
      }
    }

    // Fetch active departments for this workbench
    let activeDepts = [];
    try {
      const depts = await collaborationService.getDepartments(workbenchId);
      activeDepts = (depts || []).filter(d => (d.status || 'active').toLowerCase() === 'active');
    } catch (err) {
      console.warn("[budgetService] Notice fetching active departments:", err);
    }

    // Seed default department allocations matching active departments if empty
    if (!list || list.length === 0) {
      if (activeDepts.length > 0) {
        list = activeDepts.map((d, index) => {
          const monthlyCap = Number(d.monthly_budget) || 50000;
          const annualCap = Number(d.annual_budget) || monthlyCap * 12;
          return {
            id: `bgt_${workbenchId}_${index + 1}`,
            workbench_id: workbenchId,
            name: `${d.name} Active Operations Budget`,
            department: d.name,
            source_cash_account: index % 2 === 0 ? "A-ACO-01 — Cash / Bank Main Account" : "A-ACO-02 — HDFC Operating Current Acc",
            period: "Annual FY 2026-27",
            allocated_amount: annualCap,
            utilized_amount: Math.round(annualCap * 0.35),
            notes: `Operational cash allocation for ${d.name} department`,
            categories_plan: [
              { category: "Departmental Operations & Software", allocated: Math.round(annualCap * 0.6), spent: Math.round(annualCap * 0.25) },
              { category: "Staff & Travel Expense Pool", allocated: Math.round(annualCap * 0.4), spent: Math.round(annualCap * 0.1) }
            ],
            created_at: new Date().toISOString()
          };
        });
      }

      if (list.length > 0 && typeof window !== 'undefined') {
        localStorage.setItem(`${STORAGE_KEY}_${workbenchId}`, JSON.stringify(list));
      }
    }

    return list;
  },

  /**
   * Create and allocate budget from cash asset account to active department dimension
   */
  async createBudget(workbenchId, payload) {
    const nowIso = new Date().toISOString();
    const newBudget = {
      id: `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workbench_id: workbenchId,
      name: payload.name || `${payload.department} Budget`,
      department: payload.department,
      source_cash_account: payload.source_cash_account || "A-ACO-01 — Cash / Bank Main Account",
      period: payload.period || "Q3 2026",
      allocated_amount: Number(payload.allocated_amount) || 0,
      utilized_amount: 0,
      notes: payload.notes || "",
      categories_plan: payload.categories_plan || [],
      created_at: nowIso
    };

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${workbenchId}`);
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(newBudget);
      localStorage.setItem(`${STORAGE_KEY}_${workbenchId}`, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("budget:updated"));
    }

    return newBudget;
  },

  /**
   * Delete a budget allocation
   */
  async deleteBudget(workbenchId, budgetId) {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${workbenchId}`);
      if (stored) {
        const list = JSON.parse(stored).filter(b => b.id !== budgetId);
        localStorage.setItem(`${STORAGE_KEY}_${workbenchId}`, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent("budget:updated"));
      }
    }
  }
};
