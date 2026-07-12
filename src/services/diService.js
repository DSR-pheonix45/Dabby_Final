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

  async approveDocument(documentId) {
    const res = await apiFetch(`/api/di/documents/${documentId}/approve`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to approve document');
    return res.json();
  },

  async updateUfo(documentId, extractedData) {
    const res = await apiFetch(`/api/di/documents/${documentId}/ufo`, {
      method: 'PUT',
      body: JSON.stringify({ extracted_data: extractedData }),
    });
    if (!res.ok) throw new Error('Failed to update UFO');
    return res.json();
  },

  // --- Business Event Pipeline (Phase 3-5) ---
  async _err(res, fallback) {
    const d = await res.json().catch(() => ({}));
    return d.detail || d.message || fallback;
  },

  async generateDraft(documentId) {
    const res = await apiFetch(`/api/events/from-document/${documentId}`, { method: 'POST' });
    if (!res.ok) throw new Error(await this._err(res, 'Failed to generate draft'));
    return res.json();
  },

  async approveDraft(draftId) {
    const res = await apiFetch(`/api/events/drafts/${draftId}/approve`, { method: 'POST' });
    if (!res.ok) throw new Error(await this._err(res, 'Failed to approve draft'));
    return res.json();
  },

  async compileEvent(eventId) {
    const res = await apiFetch(`/api/events/${eventId}/compile`, { method: 'POST' });
    if (!res.ok) throw new Error(await this._err(res, 'Failed to compile event'));
    return res.json();
  },

  async listEvents(userId) {
    const res = await apiFetch(`/api/events/user/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch business events');
    return res.json();
  },

  /**
   * Full pipeline in one call: document -> trade draft -> business event ->
   * balanced ledger postings. Returns { draft, event, ledger }.
   */
  async postDocumentToLedger(documentId) {
    const draftRes = await this.generateDraft(documentId);
    const draft = draftRes.draft || draftRes;
    const eventRes = await this.approveDraft(draft.id);
    const event = eventRes.event || eventRes;
    const compileRes = await this.compileEvent(event.id);
    return { draft, event, ledger: compileRes.result || compileRes };
  },
};

