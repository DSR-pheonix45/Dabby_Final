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

  // --- Document Vault & Folder Endpoints ---
  async getFolders(workbenchId) {
    let remoteFolders = [];
    try {
      const res = await apiFetch(`/api/di/documents/folders/${workbenchId}`);
      if (res.ok) {
        remoteFolders = await res.json();
      }
    } catch (e) {
      console.warn("getFolders backend call notice (using local fallback):", e);
    }

    if (typeof window !== 'undefined') {
      const key = `dabby_folders_${workbenchId}`;
      const localFolders = JSON.parse(localStorage.getItem(key) || "[]");
      const map = new Map();
      (localFolders || []).forEach(f => map.set(f.id, f));
      (remoteFolders || []).forEach(f => map.set(f.id, f));
      const merged = Array.from(map.values());
      localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    }
    return remoteFolders;
  },

  async createFolder(workbenchId, name, parentId = null, color = '#14b8a6') {
    const folderObj = {
      id: "f_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
      workbench_id: workbenchId,
      name,
      parent_id: parentId || null,
      color: color || '#14b8a6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const res = await apiFetch(`/api/di/documents/folders`, {
        method: 'POST',
        body: JSON.stringify({ workbench_id: workbenchId, name, parent_id: parentId, color }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          folderObj.id = data.id;
        }
      }
    } catch (e) {
      console.warn("createFolder backend notice (persisting locally):", e);
    }

    if (typeof window !== 'undefined') {
      const key = `dabby_folders_${workbenchId}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      // Remove duplicate if exists
      const filtered = existing.filter(f => f.id !== folderObj.id);
      filtered.push(folderObj);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
    return folderObj;
  },

  async updateFolder(folderId, payload) {
    try {
      const res = await apiFetch(`/api/di/documents/folders/${folderId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res.ok) return res.json();
    } catch (e) {
      console.warn("updateFolder backend notice:", e);
    }

    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("dabby_folders_")) {
          const existing = JSON.parse(localStorage.getItem(key) || "[]");
          const updated = existing.map(f => f.id === folderId ? { ...f, ...payload } : f);
          localStorage.setItem(key, JSON.stringify(updated));
        }
      }
    }
    return { id: folderId, ...payload };
  },

  async deleteFolder(folderId) {
    try {
      await apiFetch(`/api/di/documents/folders/${folderId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn("deleteFolder backend notice:", e);
    }

    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("dabby_folders_")) {
          const existing = JSON.parse(localStorage.getItem(key) || "[]");
          const filtered = existing.filter(f => f.id !== folderId);
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    }
    return { status: "success", deleted_folder_id: folderId };
  },

  async moveDocument(documentId, folderId = null) {
    try {
      await apiFetch(`/api/di/documents/${documentId}/move`, {
        method: 'PUT',
        body: JSON.stringify({ folder_id: folderId }),
      });
    } catch (e) {
      console.warn("moveDocument backend notice:", e);
    }

    if (typeof window !== 'undefined') {
      const key = `dabby_doc_mappings`;
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      existing[documentId] = folderId;
      localStorage.setItem(key, JSON.stringify(existing));
    }
    return { status: "success", document_id: documentId, folder_id: folderId };
  },

  async getDocuments(workbenchId) {
    const res = await apiFetch(`/api/di/documents/${workbenchId}`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    const docs = await res.json();
    
    // Apply local folder mappings if present
    if (typeof window !== 'undefined' && Array.isArray(docs)) {
      const key = `dabby_doc_mappings`;
      const mappings = JSON.parse(localStorage.getItem(key) || "{}");
      docs.forEach(d => {
        if (mappings[d.id] !== undefined) {
          d.folder_id = mappings[d.id];
        }
      });
    }
    return docs;
  },

  async uploadDocument(workbenchId, file, folderId = null) {
    const formData = new FormData();
    formData.append('workbench_id', workbenchId);
    if (folderId) formData.append('folder_id', folderId);
    formData.append('file', file);

    const res = await apiFetch(`/api/di/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload document');
    const result = await res.json();

    if (folderId && result.document_id && typeof window !== 'undefined') {
      const key = `dabby_doc_mappings`;
      const mappings = JSON.parse(localStorage.getItem(key) || "{}");
      mappings[result.document_id] = folderId;
      localStorage.setItem(key, JSON.stringify(mappings));
    }
    return result;
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

  async listEvents(userId, workbenchId = null) {
    const params = new URLSearchParams();
    if (workbenchId) params.append('workbench_id', workbenchId);
    const queryString = params.toString();
    const res = await apiFetch(`/api/events/user/${userId}${queryString ? '?' + queryString : ''}`);
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

  async postDocumentToLedger(documentId) {
    const draftRes = await this.generateDraft(documentId);
    const draft = draftRes.draft || draftRes;
    const eventRes = await this.approveDraft(draft.id);
    const event = eventRes.event || eventRes;
    const compileRes = await this.compileEvent(event.id);
    const result = { draft, event, ledger: compileRes.result || compileRes };
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

  async getTransfers(workbenchId) {
    const res = await apiFetch(`/api/ops/${workbenchId}/transfers`);
    if (!res.ok) return [];
    return res.json();
  },

  async createTransfer(workbenchId, transferData) {
    const res = await apiFetch(`/api/ops/${workbenchId}/transfers`, {
      method: 'POST',
      body: JSON.stringify(transferData)
    });
    if (!res.ok) throw new Error(await this._err(res, 'Failed to record transfer'));
    const data = await res.json();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ledger:updated', { detail: { transfer: data } }));
    }
    return data;
  },
};
