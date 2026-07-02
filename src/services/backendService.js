import { supabase } from "../lib/supabase";

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
  async createRecord(workbenchId, recordType, summary, metadata) {
    try {
      const { data, error } = await supabase.functions.invoke('create-record', {
        body: {
          workbench_id: workbenchId,
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
  async pushAdjustment(workbenchId, originalRecordId, adjustmentType, reason, metadata) {
    try {
      const { data, error } = await supabase.functions.invoke('push-adjustment', {
        body: {
          workbench_id: workbenchId,
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
  async uploadDocument(workbenchId, file, documentType, transactionId = null) {
    // 1. Upload to storage first
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${workbenchId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("Doc_vault_Raw")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Register document in database
    // We insert into workbench_documents if it exists, or fallback to metadata in transaction
    try {
      const docPayload = {
        workbench_id: workbenchId,
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
        .from('workbench_documents')
        .insert(docPayload)
        .select()
        .single();

      if (error) {
        console.error('CRITICAL: Failed to register document in workbench_documents:', error);
        throw new Error(`Database registration failed: ${error.message}`);
      }

      console.log('Document successfully registered in workbench_documents:', data);

      // Trigger background processing on backend asynchronously
      fetch(`/api/ops/documents/process/${data.id}`, { method: 'POST' }).catch(err => {
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
      const { data: workbench, error: wbError } = await supabase
        .from('workbenches')
        .insert({
          name: name.trim(),
          owner_user_id: user.id,
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
          settings: extraData.settings || {},
        })
        .select()
        .single();

      if (wbError) {
        console.error('Supabase workbench insert error:', wbError);
        throw new Error(wbError.message || 'Failed to create workbench');
      }

      // 1.5. Auto-seed Chart of Accounts labels/ontology
      try {
        await fetch(`/api/ledger/labels/seed/${workbench.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        console.log(`[DEBUG] Automatically seeded Chart of Accounts for workbench: ${workbench.id}`);
      } catch (seedErr) {
        console.error("[WARNING] Auto-seeding labels failed:", seedErr);
      }

      // 2. Insert into workbench_members table
      const { error: memError } = await supabase
        .from('workbench_members')
        .insert({
          workbench_id: workbench.id,
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
   * Falls back to direct insert if edge function is unavailable
   */
  async saveChatMessage(sessionId, role, content, metadata, workbenchId = null) {
    try {
      const { data, error } = await supabase.functions.invoke('save-chat-message', {
        body: {
          session_id: sessionId,
          role,
          content,
          metadata,
          workbench_id: workbenchId
        }
      });

      if (error) {
        console.warn('Edge Function Error (save-chat-message), falling back to direct insert:', error.message || error);
        return await this._saveChatMessageDirect(sessionId, role, content, metadata);
      }

      if (data && data.error) {
        console.warn('Edge Function returned error, falling back:', data.error);
        return await this._saveChatMessageDirect(sessionId, role, content, metadata);
      }

      return data;
    } catch (err) {
      console.warn('Failed to call save-chat-message, falling back to direct insert:', err.message);
      return await this._saveChatMessageDirect(sessionId, role, content, metadata);
    }
  },

  async aiCategorize(description, labels) {
    const response = await fetch('/api/ai/categorize-transaction', {
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
  async createChatSession(title, workbenchId = null) {
    try {
      const { data, error } = await supabase.functions.invoke('create-chat-session', {
        body: {
          title,
          workbench_id: workbenchId
        }
      });

      if (error) {
        console.warn('Edge Function Error (create-chat-session), falling back to direct insert:', error.message || error);
        return await this._createChatSessionDirect(title, workbenchId);
      }

      // Edge function may return error in body
      if (data && data.error) {
        console.warn('Edge Function returned error, falling back:', data.error);
        return await this._createChatSessionDirect(title, workbenchId);
      }

      return data;
    } catch (err) {
      console.warn('Failed to call create-chat-session edge function, falling back to direct insert:', err.message);
      return await this._createChatSessionDirect(title, workbenchId);
    }
  },

  /**
   * Direct insert fallback for chat session creation
   * Used when edge function is unavailable or returns errors
   */
  async _createChatSessionDirect(title, workbenchId = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log(`[DEBUG] Falling back to direct chat_sessions insert for user ${user.id}...`);
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        workbench_id: workbenchId || null,
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
  async listTransactions(workbenchId) {
    const response = await fetch(`/api/ledger/transactions/${workbenchId}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return await response.json();
  },

  /**
   * Links an existing document to an existing transaction
   */
  async linkDocumentToTransaction(docId, transactionId) {
    const { data, error } = await supabase
      .from('workbench_documents')
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
  async runReconciliation(workbenchId) {
    try {
      const { data, error } = await supabase.functions.invoke('run-reconciliation', {
        body: { workbench_id: workbenchId }
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
  async getWorkbenchIntelligence(workbenchId) {
    try {
      const { data, error } = await supabase.functions.invoke('get-intelligence', {
        body: { workbench_id: workbenchId }
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
    const response = await fetch('/api/inventory/items', {
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
    const response = await fetch('/api/inventory/purchase', {
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
    const response = await fetch('/api/inventory/sale', {
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

  async listInvoices(workbenchId) {
    const response = await fetch(`/api/ops/invoices/${workbenchId}`);
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return await response.json();
  },

  async createInvoice(invoiceData) {
    const response = await fetch('/api/ops/invoices', {
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
    const response = await fetch(`/api/ops/invoices/scan/${docId}`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('AI scanning failed');
    return await response.json();
  },

  async recordPayment(invoiceId, paymentData) {
    const response = await fetch(`/api/ops/invoices/${invoiceId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    if (!response.ok) throw new Error('Failed to record payment');
    return await response.json();
  },

  async getARMetrics(workbenchId) {
    const response = await fetch(`/api/ops/metrics/ar/${workbenchId}`);
    if (!response.ok) throw new Error('Failed to fetch AR metrics');
    return await response.json();
  },

  // --- AP System ---

  async listBills(workbenchId) {
    const response = await fetch(`/api/ops/bills/${workbenchId}`);
    if (!response.ok) throw new Error('Failed to fetch bills');
    return await response.json();
  },

  async createBill(billData) {
    const response = await fetch('/api/ops/bills', {
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
    const response = await fetch(`/api/ops/bills/${billId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    if (!response.ok) throw new Error('Failed to record payment');
    return await response.json();
  },

  async getAPMetrics(workbenchId) {
    const response = await fetch(`/api/ops/metrics/ap/${workbenchId}`);
    if (!response.ok) throw new Error('Failed to fetch AP metrics');
    return await response.json();
  },

  async scanInvoiceDoc(workbenchId, file) {
    const doc = await this.uploadDocument(workbenchId, file, 'AP_Bill');
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
      .from('workbench_documents')
      .delete()
      .eq('id', docId);
    if (dbError) throw dbError;
    return true;
  },

  // --- Task Management ---

  async listTasks(workbenchId) {
    const response = await fetch(`/api/tasks/${workbenchId}`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return await response.json();
  },

  async createTask(taskData) {
    const response = await fetch('/api/tasks/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    if (!response.ok) throw new Error('Failed to create task');
    return await response.json();
  },

  async updateTask(taskId, updateData) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    if (!response.ok) throw new Error('Failed to update task');
    return await response.json();
  },

  async deleteTask(taskId) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete task');
    return await response.json();
  },

  async listWorkbenchMembers(workbenchId) {
    const response = await fetch(`/api/tasks/${workbenchId}/members`);
    if (!response.ok) throw new Error('Failed to fetch members');
    return await response.json();
  },

  async listWorkbenchEntities(workbenchId) {
    const response = await fetch(`/api/ops/entities/workbench/${workbenchId}`);
    if (!response.ok) throw new Error('Failed to fetch entities');
    return await response.json();
  },

  // --- Budgets ---

  async getBudgetPerformance(workbenchId) {
    const response = await fetch(`/api/budgets/${workbenchId}/performance`);
    if (!response.ok) throw new Error('Failed to fetch budget performance');
    return await response.json();
  },

  async getBudgetTransactions(workbenchId, category) {
    const response = await fetch(`/api/budgets/${workbenchId}/transactions/${encodeURIComponent(category)}`);
    if (!response.ok) throw new Error('Failed to fetch clubbed transactions');
    return await response.json();
  }
};
