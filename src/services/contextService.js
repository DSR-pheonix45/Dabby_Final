import { supabase } from "../lib/supabase";

/**
 * Context Service
 * 
 * Responsible for aggregating real-time workbench data 
 * into a structured format for the AI Consultant.
 */
export const contextService = {
  /**
   * Fetches the complete state of a workbench from the central context API
   */
  async getWorkbenchIntelligence(workbenchId) {
    try {
      const response = await fetch(`/api/context/${workbenchId}`);
      if (!response.ok) throw new Error("Failed to fetch workbench intelligence");
      
      const data = await response.json();
      return {
        ...data,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error("[ContextService] Failed to fetch workbench intelligence:", err);
      throw err;
    }
  },

  /**
   * Formats raw intelligence into a highly dense but readable context for LLMs
   */
  formatForLLM(intel) {
    if (!intel || !intel.workbench) return "No workbench context available.";

    const { workbench, balances, transactions, inventory, parties, labels, documents } = intel;

    let context = `### REAL-TIME BUSINESS CONTEXT: ${workbench.name} ###\n`;
    context += `Report Generated: ${new Date().toLocaleString()}\n\n`;

    // 1. Map Balances with their Label Metadata
    // labels is an array of {id, name, type, sub_account}
    // balances is a dict of {label_id: {gross, net}}
    const mergedBalances = labels.map(l => ({
      ...l,
      ...(balances[l.id] || { gross: 0, net: 0 })
    }));

    // 1. Financial Snapshot (Aggregated)
    const assets = mergedBalances.filter(b => b.type === 'asset').reduce((s, b) => s + (b.net || 0), 0);
    const liabilities = mergedBalances.filter(b => b.type === 'liability').reduce((s, b) => s + (b.net || 0), 0);
    const revenue = mergedBalances.filter(b => b.type === 'revenue').reduce((s, b) => s + (b.net || 0), 0);
    const expenses = mergedBalances.filter(b => b.type === 'expense').reduce((s, b) => s + (b.net || 0), 0);

    // Fix for natural balance orientation (liabilities/revenue are negative in DB)
    const displayLiabilities = Math.abs(liabilities);
    const displayRevenue = Math.abs(revenue);

    context += `## 1. FINANCIAL SUMMARY\n`;
    context += `- Total Assets (Cash/Bank/Inventory): ₹${assets.toLocaleString()}\n`;
    context += `- Total Liabilities (Debt/Payables): ₹${displayLiabilities.toLocaleString()}\n`;
    context += `- Net Worth (Assets - Liabilities): ₹${(assets - displayLiabilities).toLocaleString()}\n`;
    context += `- YTD Revenue: ₹${displayRevenue.toLocaleString()}\n`;
    context += `- YTD Expenses: ₹${expenses.toLocaleString()}\n`;
    context += `- Gross Profit: ₹${(displayRevenue - expenses).toLocaleString()}\n\n`;

    // 2. Critical Account Balances (Cash & Bank)
    context += `## 2. BANK & CASH BALANCES\n`;
    mergedBalances.filter(b => b.sub_account?.toLowerCase().includes('bank') || b.type === 'asset')
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
      .forEach(b => {
        if (Math.abs(b.net) > 0) {
          context += `- ${b.name}: ₹${b.net.toLocaleString()}\n`;
        }
      });
    context += `\n`;

    // 3. Other Account Balances
    context += `## 3. OTHER BALANCES\n`;
    mergedBalances.filter(b => !b.sub_account?.toLowerCase().includes('bank') && b.type !== 'asset')
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
      .slice(0, 10)
      .forEach(b => {
        if (Math.abs(b.net) > 0) {
          context += `- ${b.name} (${b.type}): ₹${Math.abs(b.net).toLocaleString()}\n`;
        }
      });
    context += `\n`;

    // 3. Recent Transactions
    context += `## 3. RECENT TRANSACTIONS (Audit Trail)\n`;
    transactions.slice(0, 10).forEach(tx => {
      context += `- [${tx.date}] ${tx.description}: ₹${tx.amount.toLocaleString()} (Labels: ${tx.labels.join(", ")})\n`;
    });
    context += `\n`;

    // 4. Party Analysis
    context += `## 4. TOP COUNTERPARTIES (Vendors/Customers)\n`;
    parties.slice(0, 8).forEach(p => {
      context += `- ${p.name} (${p.category}): `;
      const entries = [];
      if (p.total_receivable) entries.push(`Receivable: ₹${p.total_receivable.toLocaleString()}`);
      if (p.total_payable) entries.push(`Payable: ₹${p.total_payable.toLocaleString()}`);
      context += entries.length > 0 ? entries.join(", ") : "No pending balance";
      context += `\n`;
    });
    context += `\n`;

    // 5. Inventory Summary
    if (inventory && inventory.length > 0) {
      context += `## 5. INVENTORY & STOCK\n`;
      inventory.slice(0, 5).forEach(i => {
        context += `- ${i.name}: ${i.stock_level} ${i.unit} (Price: ₹${i.price || 0})\n`;
      });
      context += `\n`;
    }

    // 6. Complete list of Chart of Accounts Labels
    if (labels && labels.length > 0) {
      context += `## 6. ALL CHART OF ACCOUNTS LABELS\n`;
      labels.forEach(l => {
        context += `- Label: "${l.name}" | Type: ${l.type} | Sub-Account: ${l.sub_account}\n`;
      });
      context += `\n`;
    }

    // 7. Documents & Extracted OCR Metadata (Doc Vault)
    if (documents && documents.length > 0) {
      context += `## 7. DOCUMENT VAULT (Uploaded Documents & AI Analysis Notes)\n`;
      documents.forEach(doc => {
        context += `- File: ${doc.filename} | Type: ${doc.document_type || 'Uncategorized'} | Status: ${doc.status}\n`;
        const analysis = doc.metadata?.extracted_invoice;
        if (analysis) {
          context += `  - Extracted Analysis:\n`;
          context += `    * Vendor: ${analysis.parties?.vendor_name || 'N/A'} | Customer: ${analysis.parties?.customer_name || 'N/A'}\n`;
          if (analysis.references?.invoice_number) context += `    * Invoice/Bill #: ${analysis.references.invoice_number}\n`;
          if (analysis.document_metadata?.document_date) context += `    * Issue Date: ${analysis.document_metadata.document_date}\n`;
          if (analysis.financials?.total_amount) context += `    * Total Amount: ${analysis.document_metadata?.currency || 'INR'} ${analysis.financials.total_amount.toLocaleString()}\n`;
          if (analysis.line_items && analysis.line_items.length > 0) {
            context += `    * Line Items:\n`;
            analysis.line_items.slice(0, 5).forEach(item => {
              context += `      - ${item.description}: Qty ${item.quantity || 1} @ ${(item.unit_price || 0).toLocaleString()} = ${(item.amount || 0).toLocaleString()}\n`;
            });
            if (analysis.line_items.length > 5) {
              context += `      - ... and ${analysis.line_items.length - 5} more items\n`;
            }
          }
        }
      });
      context += `\n`;
    }

    context += `### END OF BUSINESS CONTEXT ###\n`;
    return context;
  }
};
