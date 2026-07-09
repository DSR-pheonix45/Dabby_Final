import { apiFetch } from '../lib/apiClient';

export const diService = {
  // --- COA Endpoints ---
  async getAccounts(workbenchId) {
    const res = await apiFetch(`/api/di/coa/accounts/${workbenchId}`);
    if (!res.ok) throw new Error('Failed to fetch accounts');
    return res.json();
  },

  async getTemplates() {
    const res = await apiFetch(`/api/di/coa/templates`);
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
  },

  async seedAccounts(workbenchId, templateId) {
    const res = await apiFetch(`/api/di/coa/seed`, {
      method: 'POST',
      body: JSON.stringify({ workbench_id: workbenchId, template_id: templateId }),
    });
    if (!res.ok) throw new Error('Failed to seed accounts');
    return res.json();
  },

  // --- Document Vault Endpoints ---
  async getDocuments(workbenchId) {
    const res = await apiFetch(`/api/di/documents/${workbenchId}`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async uploadDocument(workbenchId, file) {
    const formData = new FormData();
    formData.append('workbench_id', workbenchId);
    formData.append('file', file);

    const res = await apiFetch(`/api/di/documents/upload`, {
      method: 'POST',
      body: formData,
    }, true); // Assuming true bypasses default JSON headers for FormData
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  },

  async processDocument(documentId) {
    const res = await apiFetch(`/api/di/documents/${documentId}/process`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to process document');
    return res.json();
  },
};
