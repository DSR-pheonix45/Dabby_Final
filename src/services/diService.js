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

  async deleteDocument(documentId) {
    const res = await apiFetch(`/api/di/documents/${documentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  async processDocument(documentId, hint = null, password = null) {
    const params = new URLSearchParams();
    if (hint) params.append('hint', hint);
    if (password) params.append('password', password);
    const queryString = params.toString();
    
    const url = `/api/di/documents/${documentId}/process${queryString ? '?' + queryString : ''}`;
    const res = await apiFetch(url, {
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

  // --- Universal Ledger (Phase 5 read) ---
  async getTrialBalance(workbenchId) {
    const res = await apiFetch(`/api/di/ledger/trial-balance/${workbenchId}`);
    if (!res.ok) throw new Error('Failed to fetch trial balance');
    return res.json();
  },

  async getLedgerTransactions(workbenchId) {
    const res = await apiFetch(`/api/di/ledger/transactions/${workbenchId}`);
    if (!res.ok) throw new Error('Failed to fetch ledger transactions');
    return res.json();
  },

  async getPnl(workbenchId) {
    const res = await apiFetch(`/api/di/ledger/pnl/${workbenchId}`);
    if (!res.ok) throw new Error('Failed to fetch P&L');
    return res.json();
  },

  async getBalanceSheet(workbenchId) {
    const res = await apiFetch(`/api/di/ledger/balance-sheet/${workbenchId}`);
    if (!res.ok) throw new Error('Failed to fetch balance sheet');
    return res.json();
  },

  async getReceivables(workbenchId) {
    const res = await apiFetch(`/api/di/ledger/receivables/${workbenchId}`);
    if (!res.ok) throw new Error('Failed to fetch receivables');
    return res.json();
  },

  async getPayables(workbenchId) {
    const res = await apiFetch(`/api/di/ledger/payables/${workbenchId}`);
    if (!res.ok) throw new Error('Failed to fetch payables');
    return res.json();
  },

  async getDocumentStatus(workbenchId) {
    const res = await apiFetch(`/api/di/ledger/document-status/${workbenchId}`);
    if (!res.ok) throw new Error('Failed to fetch document status');
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
    const result = { draft, event, ledger: compileRes.result || compileRes };
    // Notify open views (Financials, OPS) so they refresh live without a manual reload.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ledger:updated', { detail: { documentId } }));
    }
    return result;
  },

  async addManualSettlement(workbenchId, eventId, eventType, amount, date, notes) {
    const res = await apiFetch(`/api/settlements/manual`, {
      method: 'POST',
      body: JSON.stringify({
        workbench_id: workbenchId,
        event_id: eventId,
        event_type: eventType,
        amount,
        date,
        notes
      }),
    });
    if (!res.ok) throw new Error(await this._err(res, 'Failed to add manual settlement'));
    return res.json();
  },
};

