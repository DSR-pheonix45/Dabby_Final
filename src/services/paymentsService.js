import { apiFetch } from "../lib/apiClient";

const STORAGE_KEY = "dabby_payments_vouchers";

export const paymentsService = {
  /**
   * Fetch all payments and vouchers for a workbench
   */
  async getPayments(workbenchId) {
    let remotePayments = [];
    try {
      // 1. Fetch transactions / events from backend
      const res = await apiFetch(`/api/di/ledger/transactions/${workbenchId}?limit=100`);
      if (res.ok) {
        const txs = await res.json();
        remotePayments = (Array.isArray(txs) ? txs : []).map(tx => {
          const isReceipt = (tx.entries || []).some(e => e.direction === 'debit' && (e.code?.includes('ACO') || e.code?.includes('BNK') || e.account?.toLowerCase().includes('bank') || e.account?.toLowerCase().includes('cash')));
          const isPayment = (tx.entries || []).some(e => e.direction === 'credit' && (e.code?.includes('ACO') || e.code?.includes('BNK') || e.account?.toLowerCase().includes('bank') || e.account?.toLowerCase().includes('cash')));
          
          let type = 'Payment Sent';
          let container = 'Purchases';
          let partyName = tx.business_events?.counterparty || tx.description || 'Vendor / Expense';

          if (isReceipt && !isPayment) {
            type = 'Payment Received';
            container = 'Sales';
          } else if (isReceipt && isPayment) {
            type = 'Transfer';
            container = 'Transfers';
            partyName = 'Internal Transfer (Bank/Cash)';
          }

          return {
            id: tx.id,
            workbench_id: workbenchId,
            voucher_number: tx.metadata?.voucher_number || `VOUCH-${tx.id.substring(0, 8).toUpperCase()}`,
            type,
            party: partyName,
            amount: tx.total_amount || 0,
            date: tx.transaction_date || (tx.created_at ? tx.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            payment_mode: tx.metadata?.payment_mode || 'Bank Transfer',
            reference_number: tx.metadata?.reference_number || tx.business_events?.settlement_key || `REF-${tx.id.substring(0, 6)}`,
            trade_container: tx.metadata?.trade_container || container,
            linked_doc_ref: tx.metadata?.linked_doc_ref || 'Unmapped',
            status: tx.metadata?.status || 'Settled',
            notes: tx.description || '',
            entries: tx.entries || []
          };
        });
      }
    } catch (e) {
      console.warn("[paymentsService] Remote fetch notice (using local fallback):", e);
    }

    // Combine with local storage for instant responsiveness
    let localData = [];
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${workbenchId}`);
      if (stored) {
        try { localData = JSON.parse(stored); } catch (err) {}
      }
    }

    const map = new Map();
    remotePayments.forEach(p => map.set(p.id, p));
    localData.forEach(p => map.set(p.id, p));

    // Seed realistic sample vouchers if workbench is new / empty
    if (map.size === 0 && workbenchId) {
      const defaultSamples = [
        {
          id: `pay_rec_${workbenchId}_1`,
          workbench_id: workbenchId,
          voucher_number: "RV-2024-001",
          type: "Payment Received",
          party: "Client / Customer Payment",
          amount: 45000,
          date: new Date().toISOString().split('T')[0],
          payment_mode: "Bank Transfer",
          reference_number: "UTR983471029",
          trade_container: "Sales",
          linked_doc_ref: "INV-2024-001",
          status: "Settled",
          notes: "Full receipt settlement for online order invoice"
        },
        {
          id: `pay_sent_${workbenchId}_2`,
          workbench_id: workbenchId,
          voucher_number: "PV-2024-002",
          type: "Payment Sent",
          party: "Primary Supplier / Vendor",
          amount: 18500,
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          payment_mode: "UPI / IMPS",
          reference_number: "UPI771239045",
          trade_container: "Purchases",
          linked_doc_ref: "BILL-2024-089",
          status: "Settled",
          notes: "Vendor payment for raw materials invoice"
        },
        {
          id: `pay_trf_${workbenchId}_3`,
          workbench_id: workbenchId,
          voucher_number: "TR-2024-003",
          type: "Transfer",
          party: "Operating Bank -> Petty Cash",
          amount: 5000,
          date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
          payment_mode: "Cash Withdrawal",
          reference_number: "CHQ-001928",
          trade_container: "Transfers",
          linked_doc_ref: "CONTRA-PETTY",
          status: "Settled",
          notes: "Replenish office petty cash chest"
        }
      ];
      defaultSamples.forEach(p => map.set(p.id, p));
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${STORAGE_KEY}_${workbenchId}`, JSON.stringify(defaultSamples));
      }
    }

    const merged = Array.from(map.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    return merged;
  },

  /**
   * Save / Record a new payment or voucher and map to trade container
   */
  async recordPayment(workbenchId, paymentPayload) {
    const nowIso = new Date().toISOString();
    const dateStr = paymentPayload.date || nowIso.split('T')[0];
    const type = paymentPayload.type || 'Payment Received';

    let prefix = 'RV';
    let container = 'Sales';
    if (type === 'Payment Sent') {
      prefix = 'PV';
      container = 'Purchases';
    } else if (type === 'Transfer') {
      prefix = 'TR';
      container = 'Transfers';
    }

    const voucherObj = {
      id: `vouch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      workbench_id: workbenchId,
      voucher_number: paymentPayload.voucher_number || `${prefix}-${Date.now().toString().slice(-6)}`,
      type: type,
      party: paymentPayload.party || (type === 'Payment Received' ? 'Customer' : type === 'Payment Sent' ? 'Vendor' : 'Bank Transfer'),
      amount: Number(paymentPayload.amount) || 0,
      date: dateStr,
      payment_mode: paymentPayload.payment_mode || 'Bank Transfer',
      reference_number: paymentPayload.reference_number || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      trade_container: paymentPayload.trade_container || container,
      linked_doc_ref: paymentPayload.linked_doc_ref || 'Unmapped',
      status: paymentPayload.status || 'Settled',
      notes: paymentPayload.notes || '',
      created_at: nowIso
    };

    // Save to local storage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${workbenchId}`);
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(voucherObj);
      localStorage.setItem(`${STORAGE_KEY}_${workbenchId}`, JSON.stringify(list));
    }

    // Dispatch update notification event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("ledger:updated"));
      window.dispatchEvent(new CustomEvent("payments:updated"));
    }

    return voucherObj;
  }
};
