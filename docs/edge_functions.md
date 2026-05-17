# Edge Functions Documentation

This document provides a comprehensive list of Supabase Edge Functions used in the Dabby application, their purpose, and the frontend service that invokes them.

## **Overview** 

As per the system philosophy defined in [system_backend.md](file:///c:/Users/Medhansh%20Pc/Desktop/Datalis_Each_Device/Dabby/docs/system_backend.md), all **write operations** in Dabby must go through Supabase Edge Functions to ensure auditability and deterministic behavior. Direct client-side writes to the database are strictly forbidden for core financial entities.

The primary entry point for calling these functions from the frontend is the [backendService.js](file:///c:/Users/Medhansh%20Pc/Desktop/Datalis_Each_Device/Dabby/src/services/backendService.js).

---

## **Functions List**

| Function Name | Description | Invoked By (Frontend) | Relevant Database Tables |
| :--- | :--- | :--- | :--- |
| **`create-workbench`** | Initializes a new financial workbench, sets up default accounts, and assigns the user as the founder. | `createWorkbench()` | `workbenches`, `workbench_members`, `workbench_accounts` |
| **`create-record`** | Creates a manual financial record (transaction, compliance, budget, or party) with full audit logging. | `createRecord()` | `manual_records`, `audit_logs` |
| **`confirm-record`** | Validates a manual record and generates the corresponding double-entry ledger items. | `confirmRecord()` | `manual_records`, `ledger_entries` |
| **`push-adjustment`** | Records a financial adjustment against an existing record for corrections or updates. | `pushAdjustment()` | `financial_adjustments`, `audit_logs` |
| **`process-document`** | Initiates OCR and analysis for uploaded documents (invoices, receipts, etc.) stored in Supabase Storage. | `uploadDocument()` | `workbench_documents`, `manual_records` |
| **`run-reconciliation`** | Executes the reconciliation engine to match ledger entries with external statements. | `runReconciliation()` | `ledger_entries`, `reconciliation_reports` |
| **`get-intelligence`** | Calculates workbench health metrics, runway, and financial insights using the semantic base. | `getWorkbenchIntelligence()` | `ledger_entries`, `workbench_accounts` |
| **`create-chat-session`** | Initializes a new AI chat session for a specific workbench. | `createChatSession()` | `chat_sessions` |
| **`save-chat-message`** | Persists a chat message (user or assistant) and triggers AI responses or audit log emissions. | `saveChatMessage()` | `chat_messages`, `audit_logs` |

---

## **Technical Implementation Details**

### **Frontend Integration**
All functions are called using the Supabase client's `functions.invoke` method.
Example from `backendService.js`:
```javascript
const { data, error } = await supabase.functions.invoke('create-workbench', {
  body: { name, books_start_date: booksStartDate }
});
```

### **Security & Auth**
- Every function request must include a valid **Bearer Token** (automatically handled by the Supabase client).
- Functions verify the user's identity and permissions (RLS) before performing any database operations.
- CORS headers are implemented in each function's `index.ts` to allow requests from the frontend.

### **Auditability**
Most Edge Functions emit a record to the `audit_logs` table, capturing:
- `user_id`: Who performed the action.
- `action`: What was done.
- `entity_id`: The ID of the modified record.
- `old_data` / `new_data`: State changes for full traceability.
