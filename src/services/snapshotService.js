import { apiJson, apiFetch } from "../lib/apiClient";

export const snapshotService = {
  async createSnapshot(workbenchId, snapshotName = null, notes = null) {
    return apiJson("/api/tb-snapshots/create", {
      method: "POST",
      body: JSON.stringify({
        workbench_id: workbenchId,
        snapshot_name: snapshotName,
        snapshot_type: "manual",
        notes: notes
      })
    });
  },

  async listSnapshots(workbenchId) {
    return apiJson(`/api/tb-snapshots/workbench/${workbenchId}`);
  },

  async getSnapshotDetail(snapshotId) {
    return apiJson(`/api/tb-snapshots/${snapshotId}`);
  },

  async importTrialBalanceExcel(workbenchId, file, snapshotName = null) {
    const formData = new FormData();
    formData.append("workbench_id", workbenchId);
    if (snapshotName) formData.append("snapshot_name", snapshotName);
    formData.append("file", file);

    const res = await apiFetch("/api/tb-snapshots/import-excel", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to import Trial Balance spreadsheet");
    }

    return res.json();
  },

  async triggerAutoMonthly(workbenchId) {
    return apiJson(`/api/tb-snapshots/auto-monthly?workbench_id=${workbenchId}`, {
      method: "POST"
    });
  }
};
