const STORAGE_KEY = "dabby_budget_allocations";

export const budgetService = {
  /**
   * Fetch all budget allocations for a workbench
   */
  async getBudgets(workbenchId) {
    let list = [];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${workbenchId}`);
      if (stored) {
        try { list = JSON.parse(stored); } catch (err) {}
      }
    }

    // Seed default department allocations if empty
    if (!list || list.length === 0) {
      list = [
        {
          id: `bgt_${workbenchId}_1`,
          workbench_id: workbenchId,
          name: "Q3 Tech & Cloud Infrastructure",
          department: "Engineering & Tech",
          source_cash_account: "A-ACO-02 — HDFC Operating Current Acc",
          period: "Q3 2026",
          allocated_amount: 1500000,
          utilized_amount: 850000,
          notes: "AWS Cloud hosting, Datadog monitoring, GitHub Enterprise licenses",
          categories_plan: [
            { category: "Cloud Hosting & Servers", allocated: 900000, spent: 550000 },
            { category: "SaaS Tools & Security", allocated: 600000, spent: 300000 }
          ],
          created_at: new Date(Date.now() - 30 * 86400000).toISOString()
        },
        {
          id: `bgt_${workbenchId}_2`,
          workbench_id: workbenchId,
          name: "H2 Digital Growth & Ads",
          department: "Marketing & Growth",
          source_cash_account: "A-ACO-01 — Cash / Bank Main",
          period: "H2 2026",
          allocated_amount: 1200000,
          utilized_amount: 420000,
          notes: "Google Ads, Meta Performance campaigns & influencer marketing",
          categories_plan: [
            { category: "Digital Ad Campaigns", allocated: 800000, spent: 320000 },
            { category: "Brand Events & PR", allocated: 400000, spent: 100000 }
          ],
          created_at: new Date(Date.now() - 15 * 86400000).toISOString()
        },
        {
          id: `bgt_${workbenchId}_3`,
          workbench_id: workbenchId,
          name: "Q3 Sales Operations & Field Travel",
          department: "Sales & Business Dev",
          source_cash_account: "A-ACO-03 — ICICI Operations Acc",
          period: "Q3 2026",
          allocated_amount: 800000,
          utilized_amount: 680000,
          notes: "Enterprise customer visits, trade shows & CRM software",
          categories_plan: [
            { category: "Client Entertainment & Travel", allocated: 500000, spent: 450000 },
            { category: "Sales Enablement Tools", allocated: 300000, spent: 230000 }
          ],
          created_at: new Date(Date.now() - 10 * 86400000).toISOString()
        },
        {
          id: `bgt_${workbenchId}_4`,
          workbench_id: workbenchId,
          name: "Office Operations & Petty Contingency",
          department: "Operations & Logistics",
          source_cash_account: "A-ACO-04 — Petty Cash Box",
          period: "Monthly Aug 2026",
          allocated_amount: 250000,
          utilized_amount: 90000,
          notes: "Petty cash supplies, courier, pantry & facility maintenance",
          categories_plan: [
            { category: "Facilities & Supplies", allocated: 150000, spent: 60000 },
            { category: "Logistics & Freight", allocated: 100000, spent: 30000 }
          ],
          created_at: new Date().toISOString()
        }
      ];

      if (typeof window !== 'undefined') {
        localStorage.setItem(`${STORAGE_KEY}_${workbenchId}`, JSON.stringify(list));
      }
    }

    return list;
  },

  /**
   * Create and allocate budget from cash asset account to department dimension
   */
  async createBudget(workbenchId, payload) {
    const nowIso = new Date().toISOString();
    const newBudget = {
      id: `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workbench_id: workbenchId,
      name: payload.name || `${payload.department} Budget`,
      department: payload.department,
      source_cash_account: payload.source_cash_account || "A-ACO-01 — Cash / Bank Main",
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
