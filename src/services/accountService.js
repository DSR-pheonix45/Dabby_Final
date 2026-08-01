import { apiFetch } from "../lib/apiClient";

export const accountService = {
  async getAccounts(workbenchId) {
    const res = await apiFetch(`/api/workbench-accounts/${workbenchId}`);
    if (!res.ok) throw new Error("Failed to fetch accounts");
    return res.json();
  },

  async createAccount(accountData) {
    const res = await apiFetch(`/api/workbench-accounts`, {
      method: "POST",
      body: JSON.stringify(accountData),
    });
    if (!res.ok) throw new Error("Failed to create account");
    return res.json();
  },

  async updateAccount(accountId, accountData) {
    const res = await apiFetch(`/api/workbench-accounts/${accountId}`, {
      method: "PUT",
      body: JSON.stringify(accountData),
    });
    if (!res.ok) throw new Error("Failed to update account");
    return res.json();
  },

  async deleteAccount(accountId) {
    const res = await apiFetch(`/api/workbench-accounts/${accountId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete account");
    return res.json();
  },

  async clearAllAccounts(workbenchId) {
    const res = await apiFetch(`/api/workbench-accounts/workbench/${workbenchId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to clear accounts");
    return res.json();
  },

  async syncAccounts(workbenchId, accounts, deletedIds = []) {
    const res = await apiFetch(`/api/workbench-accounts/sync`, {
      method: "POST",
      body: JSON.stringify({
        workbench_id: workbenchId,
        accounts,
        deleted_ids: deletedIds,
      }),
    });
    if (!res.ok) throw new Error("Failed to sync accounts");
    return res.json();
  },

  async importAccounts(workbenchId, file) {
    const formData = new FormData();
    formData.append("workbench_id", workbenchId);
    formData.append("file", file);

    const res = await apiFetch(`/api/workbench-accounts/ai-import`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to process document");
    return res.json();
  },

  async postVoucher(workbenchId, voucherData) {
    const res = await apiFetch(`/api/workbench-accounts/post-voucher`, {
      method: "POST",
      body: JSON.stringify({
        workbench_id: workbenchId,
        ...voucherData
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to post voucher");
    }
    return res.json();
  },

  async getKpiSummary(workbenchId) {
    const res = await apiFetch(`/api/workbench-accounts/kpi-summary/${workbenchId}`);
    if (!res.ok) throw new Error("Failed to fetch KPI summary");
    return res.json();
  }
};
