import { apiFetch } from "../lib/apiClient";

export const accountService = {
  async getAccounts(workbenchId) {
    const res = await apiFetch(`/api/workbench-accounts/${workbenchId}`);
    if (!res.ok) throw new Error("Failed to fetch accounts");
    return res.json();
  },

  async createAccount(accountData) {
    const res = await apiFetch(`/api/workbench-accounts/`, {
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
};
