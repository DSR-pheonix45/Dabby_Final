import React, { useState } from "react";
import {
  BsExclamationTriangleFill,
  BsCheckCircleFill,
  BsXLg,
  BsArrowRight,
  BsArrowRepeat,
  BsJournalBookmark,
  BsBank,
  BsPeopleFill,
  BsCurrencyDollar,
  BsShieldCheck,
  BsInfoCircle,
  BsLightningChargeFill,
} from "react-icons/bs";

/**
 * Parses a backend error message into structured, actionable steps.
 */
function diagnoseError(errorMessage, trade) {
  const msg = errorMessage || "";
  const tradeType = trade?.trade_type || "";
  const amount = trade?.amount || 0;

  const steps = [];
  let title = "Execution Failed";
  let subtitle = "This trade could not be committed to the ledger.";
  let severity = "error"; // "error" | "warning" | "info"

  // ── COA missing accounts ─────────────────────────────────────────────────
  if (msg.includes("RESOLVE:MISSING_COA_ACCOUNTS") || msg.includes("Chart of Accounts")) {
    title = "Missing Chart of Accounts Labels";
    subtitle = "The financial engine couldn't find the accounts needed to post this trade.";
    severity = "error";

    steps.push({
      number: 1,
      icon: "coa",
      label: "Open Chart of Accounts",
      detail: "Go to Chart of Accounts in the left sidebar and add the missing account labels.",
      action: "open_coa",
    });

    if (tradeType === "Vendor Invoice" || tradeType === "Expense Receipt") {
      steps.push({
        number: 2,
        icon: "expense",
        label: 'Add an "Expense" account',
        detail: 'Create a label under Expenses (e.g. "Operating Expenses", "Cost of Goods Sold").',
        action: null,
      });
      steps.push({
        number: 3,
        icon: "liability",
        label: 'Add an "Accounts Payable" label',
        detail: 'Under Liabilities, add "Accounts Payable" to record the vendor obligation.',
        action: null,
      });
    } else if (tradeType === "Sales Invoice") {
      steps.push({
        number: 2,
        icon: "revenue",
        label: 'Add a "Revenue" account',
        detail: 'Under Revenue, add "Sales Revenue" or "Service Revenue".',
        action: null,
      });
      steps.push({
        number: 3,
        icon: "asset",
        label: 'Add an "Accounts Receivable" label',
        detail: 'Under Assets, add "Accounts Receivable" to track what customers owe.',
        action: null,
      });
    } else if (tradeType === "Payroll") {
      steps.push({
        number: 2,
        icon: "expense",
        label: 'Add a "Payroll Expense" account',
        detail: 'Under Expenses, add "Payroll Expense", "Salaries" or "Wages".',
        action: null,
      });
      steps.push({
        number: 3,
        icon: "asset",
        label: 'Add a Bank/Cash account entity',
        detail: 'Under Assets, add a bank entity (e.g. "HDFC Bank") to pay salaries from.',
        action: null,
      });
    } else {
      steps.push({
        number: 2,
        icon: "coa",
        label: "Add the required account types",
        detail: "Add at least one Expense account, one Asset/Bank account, and one Liability account.",
        action: null,
      });
    }

    steps.push({
      number: steps.length + 1,
      icon: "retry",
      label: "Re-execute the trade",
      detail: "Once the accounts are added, click Approve & Execute again.",
      action: "retry",
    });

    return { title, subtitle, severity, steps };
  }

  // ── Double entry imbalance (no COA, but partial) ──────────────────────────
  if (msg.includes("Double-entry validation") || msg.includes("Debits") || msg.includes("Credits")) {
    const debitMatch = msg.match(/Debits.*?₹([\d,.]+)/);
    const creditMatch = msg.match(/Credits.*?₹([\d,.]+)/);
    const debits = debitMatch ? parseFloat(debitMatch[1].replace(",", "")) : 0;
    const credits = creditMatch ? parseFloat(creditMatch[1].replace(",", "")) : 0;

    title = "Journal Entry Imbalance";
    subtitle = `Debits (₹${debits.toFixed(2)}) don't equal Credits (₹${credits.toFixed(2)}).`;
    severity = "error";

    if (debits === 0) {
      steps.push({
        number: 1,
        icon: "expense",
        label: "No debit account found",
        detail: `The ${tradeType} needs an account to debit (Expense or Asset). Go to Chart of Accounts and add one.`,
        action: "open_coa",
      });
    } else if (credits === 0) {
      steps.push({
        number: 1,
        icon: "liability",
        label: "No credit account found",
        detail: `The ${tradeType} needs an account to credit (Liability or Revenue). Go to Chart of Accounts and add one.`,
        action: "open_coa",
      });
    } else {
      steps.push({
        number: 1,
        icon: "coa",
        label: "Add a Suspense/Clearing account",
        detail: "Add a 'Suspense / Clearing' account under Liabilities. The imbalance will be routed there temporarily.",
        action: "open_coa",
      });
    }

    steps.push({
      number: 2,
      icon: "retry",
      label: "Retry execution",
      detail: "After adding the missing account, re-execute this trade.",
      action: "retry",
    });

    return { title, subtitle, severity, steps };
  }

  // ── Duplicate bill / invoice ──────────────────────────────────────────────
  if (msg.includes("already exists")) {
    title = "Duplicate Invoice Detected";
    subtitle = msg;
    severity = "warning";

    steps.push({
      number: 1,
      icon: "info",
      label: "Check for existing record",
      detail: "This invoice/bill number was already recorded. The trade may have been partially committed.",
      action: null,
    });
    steps.push({
      number: 2,
      icon: "retry",
      label: "Retry execution",
      detail: "Click Retry — the engine will now reuse the existing record instead of failing.",
      action: "retry",
    });

    return { title, subtitle, severity, steps };
  }

  // ── Entity missing ────────────────────────────────────────────────────────
  if (msg.includes("entity") || msg.includes("vessel") || msg.includes("bank")) {
    title = "Missing Payment Vessel";
    subtitle = "A bank/cash account entity is needed to record this payment.";
    severity = "error";

    steps.push({
      number: 1,
      icon: "bank",
      label: "Add a bank or cash account",
      detail: "Go to Operations → Parties. Select your company and add a bank entity (e.g. 'HDFC Bank Savings').",
      action: null,
    });
    steps.push({
      number: 2,
      icon: "retry",
      label: "Re-run the trade engine",
      detail: "Click Re-run to re-process this document with the new entity.",
      action: "rerun",
    });

    return { title, subtitle, severity, steps };
  }

  // ── Generic fallback ─────────────────────────────────────────────────────
  title = "Execution Error";
  subtitle = msg || "An unknown error occurred.";
  severity = "error";

  steps.push({
    number: 1,
    icon: "info",
    label: "Error details",
    detail: msg,
    action: null,
  });
  steps.push({
    number: 2,
    icon: "retry",
    label: "Retry execution",
    detail: "Try executing again. If the error persists, check the backend logs.",
    action: "retry",
  });

  return { title, subtitle, severity, steps };
}

const ICON_MAP = {
  coa:       <BsJournalBookmark className="resolve-step-icon coa" />,
  expense:   <BsCurrencyDollar  className="resolve-step-icon expense" />,
  revenue:   <BsCurrencyDollar  className="resolve-step-icon revenue" />,
  liability: <BsShieldCheck     className="resolve-step-icon liability" />,
  asset:     <BsBank            className="resolve-step-icon asset" />,
  bank:      <BsBank            className="resolve-step-icon asset" />,
  retry:     <BsArrowRepeat     className="resolve-step-icon retry" />,
  rerun:     <BsLightningChargeFill className="resolve-step-icon retry" />,
  info:      <BsInfoCircle      className="resolve-step-icon info" />,
  people:    <BsPeopleFill      className="resolve-step-icon asset" />,
};

export default function TradeResolveModal({
  trade,
  errorMessage,
  onClose,
  onRetry,
  onOpenCoa,
  onRerun,
}) {
  const [retrying, setRetrying] = useState(false);
  const { title, subtitle, severity, steps } = diagnoseError(errorMessage, trade);

  const handleAction = async (action) => {
    if (action === "retry") {
      setRetrying(true);
      try { await onRetry?.(); } finally { setRetrying(false); }
    } else if (action === "open_coa") {
      onOpenCoa?.();
    } else if (action === "rerun") {
      onClose?.();
      onRerun?.();
    }
  };

  return (
    <>
      <style>{`
        .resolve-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.75);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999; backdrop-filter: blur(4px);
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .resolve-modal {
          background: #0f1117; border: 1px solid #2a2d3a;
          border-radius: 16px; width: 520px; max-width: 95vw;
          box-shadow: 0 24px 60px rgba(0,0,0,0.6);
          animation: slideUp 0.2s ease;
          overflow: hidden;
        }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .resolve-header {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 22px 24px 0; position: relative;
        }
        .resolve-header-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0; margin-top: 2px;
        }
        .resolve-header-icon.error   { background: rgba(239,68,68,0.15); color: #ef4444; }
        .resolve-header-icon.warning { background: rgba(234,179,8,0.15);  color: #eab308; }
        .resolve-header-icon.info    { background: rgba(99,102,241,0.15); color: #818cf8; }
        .resolve-header h2 { font-size: 17px; font-weight: 700; color: #f1f5f9; margin: 0 0 4px; }
        .resolve-header p  { font-size: 13px; color: #64748b; margin: 0; line-height: 1.5; }
        .resolve-close {
          position: absolute; top: 16px; right: 16px;
          background: none; border: none; color: #475569;
          cursor: pointer; font-size: 16px; padding: 4px;
          border-radius: 6px; transition: all 0.15s;
          display: flex; align-items: center; justify-content: center;
        }
        .resolve-close:hover { background: rgba(255,255,255,0.05); color: #94a3b8; }
        .resolve-trade-badge {
          margin: 16px 24px 0;
          background: rgba(255,255,255,0.03); border: 1px solid #1e2130;
          border-radius: 10px; padding: 12px 16px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .resolve-trade-badge-left { display: flex; align-items: center; gap: 10px; }
        .resolve-trade-type {
          font-size: 11px; font-weight: 600; letter-spacing: 0.05em;
          text-transform: uppercase; color: #22d3ee;
          background: rgba(34,211,238,0.1); border-radius: 4px;
          padding: 2px 8px;
        }
        .resolve-trade-name { font-size: 14px; font-weight: 600; color: #cbd5e1; }
        .resolve-trade-amt  { font-size: 13px; color: #64748b; }
        .resolve-steps-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #475569;
          padding: 20px 24px 8px;
        }
        .resolve-steps { padding: 0 24px; display: flex; flex-direction: column; gap: 8px; }
        .resolve-step {
          display: flex; align-items: flex-start; gap: 12px;
          background: rgba(255,255,255,0.02); border: 1px solid #1e2130;
          border-radius: 10px; padding: 12px 14px;
          cursor: default; transition: all 0.15s;
        }
        .resolve-step.clickable { cursor: pointer; }
        .resolve-step.clickable:hover {
          background: rgba(99,102,241,0.05); border-color: rgba(99,102,241,0.25);
        }
        .resolve-step-num {
          width: 22px; height: 22px; border-radius: 50%;
          background: #1e2130; border: 1px solid #2a2d3a;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #64748b;
          flex-shrink: 0; margin-top: 1px;
        }
        .resolve-step-icon { font-size: 16px; margin-top: 3px; flex-shrink: 0; }
        .resolve-step-icon.coa       { color: #818cf8; }
        .resolve-step-icon.expense   { color: #f97316; }
        .resolve-step-icon.revenue   { color: #22c55e; }
        .resolve-step-icon.liability { color: #3b82f6; }
        .resolve-step-icon.asset     { color: #06b6d4; }
        .resolve-step-icon.retry     { color: #a78bfa; }
        .resolve-step-icon.info      { color: #94a3b8; }
        .resolve-step-content { flex: 1; min-width: 0; }
        .resolve-step-content h4 {
          font-size: 13px; font-weight: 600; color: #e2e8f0; margin: 0 0 3px;
          display: flex; align-items: center; gap: 6px;
        }
        .resolve-step-content p { font-size: 12px; color: #64748b; margin: 0; line-height: 1.5; }
        .resolve-step-action-badge {
          font-size: 10px; font-weight: 600; padding: 1px 6px;
          border-radius: 4px; background: rgba(99,102,241,0.15);
          color: #818cf8; letter-spacing: 0.04em;
        }
        .resolve-footer {
          display: flex; gap: 10px; align-items: center; justify-content: flex-end;
          padding: 20px 24px; margin-top: 8px;
          border-top: 1px solid #1e2130;
        }
        .resolve-btn {
          padding: 9px 18px; border-radius: 8px; font-size: 13px;
          font-weight: 600; cursor: pointer; display: flex;
          align-items: center; gap: 6px; transition: all 0.15s;
          border: none;
        }
        .resolve-btn.secondary {
          background: rgba(255,255,255,0.05); color: #94a3b8;
        }
        .resolve-btn.secondary:hover { background: rgba(255,255,255,0.08); }
        .resolve-btn.primary {
          background: #6366f1; color: white;
        }
        .resolve-btn.primary:hover { background: #4f52e8; }
        .resolve-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .resolve-btn.danger {
          background: rgba(239,68,68,0.15); color: #f87171;
        }
        .resolve-btn.danger:hover { background: rgba(239,68,68,0.25); }
      `}</style>

      <div className="resolve-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
        <div className="resolve-modal">
          {/* Header */}
          <div className="resolve-header">
            <div className={`resolve-header-icon ${severity}`}>
              <BsExclamationTriangleFill />
            </div>
            <div>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
            <button className="resolve-close" onClick={onClose}>
              <BsXLg />
            </button>
          </div>

          {/* Trade badge */}
          {trade && (
            <div className="resolve-trade-badge">
              <div className="resolve-trade-badge-left">
                <span className="resolve-trade-type">{trade.trade_type || "Trade"}</span>
                <span className="resolve-trade-name">
                  {trade.description?.split("\n")[0]?.replace(/\*\*/g, "").substring(0, 40) || "Unnamed Trade"}
                </span>
              </div>
              <span className="resolve-trade-amt">
                {trade.currency || "₹"} {parseFloat(trade.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Steps */}
          <div className="resolve-steps-label">Follow these steps</div>
          <div className="resolve-steps">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`resolve-step ${step.action ? "clickable" : ""}`}
                onClick={() => step.action && handleAction(step.action)}
              >
                <div className="resolve-step-num">{step.number}</div>
                {ICON_MAP[step.icon] || ICON_MAP["info"]}
                <div className="resolve-step-content">
                  <h4>
                    {step.label}
                    {step.action && (
                      <span className="resolve-step-action-badge">
                        {step.action === "retry" ? "CLICK TO RETRY" :
                         step.action === "open_coa" ? "CLICK TO OPEN" :
                         step.action === "rerun" ? "CLICK TO RERUN" : "ACTION"}
                      </span>
                    )}
                  </h4>
                  <p>{step.detail}</p>
                </div>
                {step.action && <BsArrowRight style={{ color: "#475569", marginTop: 4, flexShrink: 0 }} />}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="resolve-footer">
            <button className="resolve-btn secondary" onClick={onClose}>
              Close
            </button>
            {steps.some(s => s.action === "open_coa") && (
              <button className="resolve-btn danger" onClick={() => handleAction("open_coa")}>
                <BsJournalBookmark /> Open Chart of Accounts
              </button>
            )}
            <button
              className="resolve-btn primary"
              onClick={() => handleAction("retry")}
              disabled={retrying}
            >
              {retrying ? (
                <><BsArrowRepeat style={{ animation: "spin 1s linear infinite" }} /> Retrying…</>
              ) : (
                <><BsArrowRepeat /> Retry Execution</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
