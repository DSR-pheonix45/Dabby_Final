import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/apiClient";

/**
 * Backend Service
 * 
 * All write operations in Dabby MUST go through this service,
 * which calls Supabase Edge Functions. Direct writes to tables
 * are strictly forbidden by the system philosophy.
 */

export const backendService = {
  /**
   * Creates a manual record (transaction, compliance, budget, or party)
   */
  async createRecord(userId, recordType, summary, metadata) {
    try {
      const { data, error } = await supabase.functions.invoke('create-record', {
        body: {
          user_id: userId,
          record_type: recordType,
          summary,
          metadata
        }
      });

      if (error) {
        console.error('Edge Function Error (create-record):', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Failed to call create-record:', err);
      throw err;
    }
  },

  /**
   * Pushes a financial adjustment
   */
  async pushAdjustment(userId, originalRecordId, adjustmentType, reason, metadata) {
    try {
      const { data, error } = await supabase.functions.invoke('push-adjustment', {
        body: {
          user_id: userId,
          original_record_id: originalRecordId,
          adjustment_type: adjustmentType,
          reason,
          metadata
        }
      });

      if (error) {
        console.error('Edge Function Error (push-adjustment):', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Failed to call push-adjustment:', err);
      throw err;
    }
  },

  /**
   * Uploads and initiates document processing
   */
  async uploadDocument(userId, file, documentType, transactionId = null) {
    // 1. Upload to storage first
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("Doc_vault_Raw")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Register document in database
    // We insert into user_documents if it exists, or fallback to metadata in transaction
    try {
      const docPayload = {
        user_id: userId,
        transaction_id: transactionId,
        filename: file.name,
        file_path: filePath,
        file_size: file.size || 0,
        mime_type: file.type || 'application/octet-stream',
        document_type: documentType,
        status: 'uploaded'
      };

      console.log('[DEBUG] Attempting to register document:', docPayload);

      const { data, error } = await supabase
        .from('user_documents')
        .insert(docPayload)
        .select()
        .single();

      if (error) {
        console.error('CRITICAL: Failed to register document in user_documents:', error);
        throw new Error(`Database registration failed: ${error.message}`);
      }

      console.log('Document successfully registered in user_documents:', data);

      // Trigger background processing on backend asynchronously
      apiFetch(`/api/ops/documents/process/${data.id}`, { method: 'POST' }).catch(err => {
        console.warn('Failed to call process document endpoint:', err);
      });

      return data;
    } catch (err) {
      console.warn('Post-upload processing failed:', err);
      // We don't throw here as the file is already uploaded
      return { file_path: filePath };
    }
  },

  /**
   * Creates a new workbench and assigns the current user as founder
   */
  async createWorkbench(name, booksStartDate, description = null, extraData = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Insert into workbenches table
      const baseRow = {
        name: name.trim(),
        created_by: user.id,
        books_start_date: booksStartDate,
        description: description || `Workbench for ${name.trim()}`,
        location: extraData.location || 'India',
        currency: extraData.currency || 'INR',
        industry: extraData.industry || null,
        sector: extraData.sector || null,
        business_type: extraData.business_type || null,
        legal_name: extraData.legal_name || null,
        pan: extraData.pan || null,
        gstin: extraData.gstin || null,
        incorporation_date: extraData.incorporation_date || null,
        fy_start: extraData.fy_start || 'April',
        status: 'active',
      };

      let { data: workbench, error: wbError } = await supabase
        .from('workbenches')
        .insert({ ...baseRow, settings: extraData.settings || {} })
        .select()
        .single();

      // Resilience: some databases predate the optional `settings` jsonb column
      // ("Could not find the 'settings' column"). Retry without it so workbench
      // creation still succeeds. Run migration 009 to persist settings properly.
      if (wbError && /settings|schema cache|column/i.test(wbError.message || '')) {
        console.warn("workbenches.settings column missing — retrying insert without settings");
        ({ data: workbench, error: wbError } = await supabase
          .from('workbenches')
          .insert(baseRow)
          .select()
          .single());
      }

      if (wbError) {
        console.error('Supabase workbench insert error:', wbError);
        throw new Error(wbError.message || 'Failed to create workbench');
      }

      // 1.2 Insert owner into workbench_members
      try {
        const { error: memberError } = await supabase
          .from('workbench_members')
          .insert({
            workbench_id: workbench.id,
            user_id: user.id,
            role: 'owner',
            status: 'active'
          });
        if (memberError) console.error("[WARNING] Failed to insert owner into workbench_members:", memberError);
      } catch (memberErr) {
        console.error("[WARNING] Exception inserting owner into workbench_members:", memberErr);
      }

      // 1.5. Auto-seed Chart of Accounts labels/ontology (Phase 1)
      try {
        await apiFetch(`/api/ledger/labels/seed/${workbench.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        console.log(`[DEBUG] Automatically seeded Phase 1 Chart of Accounts for workbench: ${workbench.id}`);
      } catch (seedErr) {
        console.error("[WARNING] Auto-seeding Phase 1 labels failed:", seedErr);
      }

      // 1.6 Auto-seed Phase 2 COA (di_accounts, di_workbench_labels, demo journals)
      try {
        await apiFetch(`/api/di/coa/seed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workbench_id: workbench.id, template_id: "default" })
        });
        console.log(`[DEBUG] Automatically seeded Phase 2 Chart of Accounts for workbench: ${workbench.id}`);
      } catch (seedErr) {
        console.error("[WARNING] Auto-seeding Phase 2 labels failed:", seedErr);
      }

      // 2. Insert into user_members table
      const { error: memError } = await supabase
        .from('user_members')
        .insert({
          user_id: workbench.id,
          user_id: user.id,
          role: 'founder',
        });

      if (memError) {
        console.warn('Failed to add founder membership:', memError.message);
        // Don't throw — workbench was created, membership is secondary
      }

      return workbench;
    } catch (err) {
      console.error('Failed to create workbench:', err);
      throw err;
    }
  },

  /**
   * Saves a chat message and updates the session
   */
  async saveChatMessage(sessionId, role, content, metadata, userId = null) {
    return await this._saveChatMessageDirect(sessionId, role, content, metadata);
  },

  async aiCategorize(description, labels) {
    const response = await apiFetch('/api/ai/categorize-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, labels })
    });
    if (!response.ok) throw new Error('AI categorization failed');
    return await response.json();
  },

  /**
   * Direct insert fallback for saving chat messages
   */
  async _saveChatMessageDirect(sessionId, role, content, metadata) {
    console.log(`[DEBUG] Falling back to direct chat_messages insert for session ${sessionId}...`);
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content: (content || '').substring(0, 50000),
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('[ERROR] Direct chat message insert failed:', error);
      throw error;
    }
    return data;
  },

  /**
   * Creates a new chat session
   * Falls back to direct insert if edge function is unavailable
   */
  async createChatSession(title, userId = null) {
    try {
      const { data, error } = await supabase.functions.invoke('create-chat-session', {
        body: {
          title,
          user_id: userId
        }
      });

      if (error) {
        console.warn('Edge Function Error (create-chat-session), falling back to direct insert:', error.message || error);
        return await this._createChatSessionDirect(title, userId);
      }

      // Edge function may return error in body
      if (data && data.error) {
        console.warn('Edge Function returned error, falling back:', data.error);
        return await this._createChatSessionDirect(title, userId);
      }

      return data;
    } catch (err) {
      console.warn('Failed to call create-chat-session edge function, falling back to direct insert:', err.message);
      return await this._createChatSessionDirect(title, userId);
    }
  },

  /**
   * Direct insert fallback for chat session creation
   * Used when edge function is unavailable or returns errors
   */
  async _createChatSessionDirect(title, userId = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log(`[DEBUG] Falling back to direct chat_sessions insert for user ${user.id}...`);
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        user_id: userId || null,
        title: (title || 'Untitled Chat').substring(0, 200),
      })
      .select()
      .single();

    if (error) {
      console.error('[ERROR] Direct chat session insert failed:', error);
      throw error;
    }

    return data;
  },

  /**
   * Lists all transactions for a workbench
   */
  async listTransactions(userId) {
    const response = await apiFetch(`/api/ledger/transactions/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return await response.json();
  },

  /**
   * Links an existing document to an existing transaction
   */
  async linkDocumentToTransaction(docId, transactionId) {
    const { data, error } = await supabase
      .from('user_documents')
      .update({ transaction_id: transactionId })
      .eq('id', docId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Confirms a record and creates ledger entries
   */
  async confirmRecord(recordId) {
    try {
      const { data, error } = await supabase.functions.invoke('confirm-record', {
        body: { record_id: recordId }
      });

      if (error) {
        console.error('Edge Function Error (confirm-record):', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Failed to call confirm-record:', err);
      throw err;
    }
  },

  /**
   * Runs the reconciliation engine for a workbench
   */
  async runReconciliation(userId) {
    try {
      const { data, error } = await supabase.functions.invoke('run-reconciliation', {
        body: { user_id: userId }
      });

      if (error) {
        console.error('Edge Function Error (run-reconciliation):', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Failed to call run-reconciliation:', err);
      throw err;
    }
  },

  /**
   * Fetches the health status and intelligence metrics for a workbench
   */
  async getWorkbenchIntelligence(userId) {
    try {
      const { data, error } = await supabase.functions.invoke('get-intelligence', {
        body: { user_id: userId }
      });

      if (error) {
        console.error('Edge Function Error (get-intelligence):', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Failed to call get-intelligence:', err);
      throw err;
    }
  },

  async createSubscriptionLink(planId, customer = {}) {
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          plan_id: planId,
          total_count: 12,
          customer_notify: 1,
          customer
        }
      });
      if (error) {
        console.error('Edge Function Error (create-subscription):', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Failed to call create-subscription:', err);
      throw err;
    }
  },

  // --- Inventory System ---

  async createInventoryItem(itemData) {
    const response = await apiFetch('/api/inventory/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to create item');
    }
    return await response.json();
  },

  async recordStockPurchase(purchaseData) {
    const response = await apiFetch('/api/inventory/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchaseData)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to record purchase');
    }
    return await response.json();
  },

  async recordStockSale(saleData) {
    const response = await apiFetch('/api/inventory/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to record sale');
    }
    return await response.json();
  },

  // --- AR System ---

  async listInvoices(userId) {
    const response = await apiFetch(`/api/ops/invoices/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return await response.json();
  },

  async createInvoice(invoiceData) {
    const response = await apiFetch('/api/ops/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to create invoice');
    }
    return await response.json();
  },

  async scanInvoice(docId) {
    const response = await apiFetch(`/api/ops/invoices/scan/${docId}`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('AI scanning failed');
    return await response.json();
  },

  async recordPayment(invoiceId, paymentData) {
    const response = await apiFetch(`/api/ops/invoices/${invoiceId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    if (!response.ok) throw new Error('Failed to record payment');
    return await response.json();
  },

  async getARMetrics(userId) {
    const response = await apiFetch(`/api/ops/metrics/ar/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch AR metrics');
    return await response.json();
  },

  // --- AP System ---

  async listBills(userId) {
    const response = await apiFetch(`/api/ops/bills/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch bills');
    return await response.json();
  },

  async createBill(billData) {
    const response = await apiFetch('/api/ops/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(billData)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to record bill');
    }
    return await response.json();
  },

  async recordBillPayment(billId, paymentData) {
    const response = await apiFetch(`/api/ops/bills/${billId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    if (!response.ok) throw new Error('Failed to record payment');
    return await response.json();
  },

  async getAPMetrics(userId) {
    const response = await apiFetch(`/api/ops/metrics/ap/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch AP metrics');
    return await response.json();
  },

  async scanInvoiceDoc(userId, file) {
    const doc = await this.uploadDocument(userId, file, 'AP_Bill');
    if (!doc.id) throw new Error("Document upload failed to return ID");
    const extracted = await this.scanInvoice(doc.id);
    return { ...extracted, doc_id: doc.id };
  },

  async getDocumentUrl(filePath) {
    const { data, error } = await supabase.storage
      .from("Doc_vault_Raw")
      .createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  },

  async downloadDocument(filePath, filename) {
    const { data, error } = await supabase.storage
      .from("Doc_vault_Raw")
      .download(filePath);
    if (error) throw error;
    
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  async deleteDocument(docId, filePath) {
    const { error: storageError } = await supabase.storage
      .from("Doc_vault_Raw")
      .remove([filePath]);
    if (storageError) console.warn("Storage deletion warning:", storageError);

    const { error: dbError } = await supabase
      .from('user_documents')
      .delete()
      .eq('id', docId);
    if (dbError) throw dbError;
    return true;
  },

  // --- Task Management ---

  async listTasks(userId) {
    const response = await apiFetch(`/api/tasks/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return await response.json();
  },

  async createTask(taskData) {
    const response = await apiFetch('/api/tasks/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    if (!response.ok) throw new Error('Failed to create task');
    return await response.json();
  },

  async updateTask(taskId, updateData) {
    const response = await apiFetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    if (!response.ok) throw new Error('Failed to update task');
    return await response.json();
  },

  async deleteTask(taskId) {
    const response = await apiFetch(`/api/tasks/${taskId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete task');
    return await response.json();
  },

  async listWorkbenchMembers(userId) {
    const response = await apiFetch(`/api/tasks/${userId}/members`);
    if (!response.ok) throw new Error('Failed to fetch members');
    return await response.json();
  },

  async listWorkbenchEntities(userId) {
    const response = await apiFetch(`/api/ops/entities/user/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch entities');
    return await response.json();
  },

  // --- Budgets ---

  async getBudgetPerformance(userId) {
    const response = await apiFetch(`/api/budgets/${userId}/performance`);
    if (!response.ok) throw new Error('Failed to fetch budget performance');
    return await response.json();
  },

  async getBudgetTransactions(userId, category) {
    const response = await apiFetch(`/api/budgets/${userId}/transactions/${encodeURIComponent(category)}`);
    if (!response.ok) throw new Error('Failed to fetch clubbed transactions');
    return await response.json();
  },

  // --- Superadmin Dashboard & Utilities ---

  async getAuthHeaders() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
    } catch (err) {
      console.error('Failed to get auth session for headers:', err);
      return { 'Content-Type': 'application/json' };
    }
  },

  async getSuperadminStats() {
    const response = await apiFetch('/api/superadmin/stats');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch superadmin stats');
    }
    return await response.json();
  },

  async updateWaitlistStatus(email, status) {
    const response = await apiFetch('/api/superadmin/waitlist/update-status', {
      method: 'POST',
      body: JSON.stringify({ email, status })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update waitlist status');
    }
    return await response.json();
  },

  async addWaitlistEmail(email, status = 'approved') {
    const response = await apiFetch('/api/superadmin/waitlist/add', {
      method: 'POST',
      body: JSON.stringify({ email, status })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to add waitlist email');
    }
    return await response.json();
  },

  async addGroqKey(apiKey, label) {
    const response = await apiFetch('/api/superadmin/groq-keys/add', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey, label })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to add Groq key');
    }
    return await response.json();
  },

  async updateGroqKeyStatus(id, status) {
    const response = await apiFetch('/api/superadmin/groq-keys/update-status', {
      method: 'POST',
      body: JSON.stringify({ id, status })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update Groq key status');
    }
    return await response.json();
  },

  async deleteGroqKey(id) {
    const response = await apiFetch('/api/superadmin/groq-keys/delete', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete Groq key');
    }
    return await response.json();
  },

  async changeWorkbenchPlan(userId, plan) {
    const response = await apiFetch('/api/superadmin/user/set-plan', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, plan })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to change plan');
    }
    return await response.json();
  },

  async simulatePayment(userId, email, amount, plan) {
    const response = await apiFetch('/api/superadmin/payments/simulate', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, email, amount, plan })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to simulate payment');
    }
    return await response.json();
  },

  async logPageView(path) {
    try {
      await apiFetch('/api/plans/log-view', {
        method: 'POST',
        body: JSON.stringify({ path })
      });
    } catch (e) {
      console.warn("Could not log page view:", e);
    }
  }
};
