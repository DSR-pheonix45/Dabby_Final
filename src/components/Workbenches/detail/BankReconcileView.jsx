import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import { read, utils } from "xlsx";
import { BsUpload, BsCheckCircle, BsArrowRepeat, BsExclamationCircle } from "react-icons/bs";
import { backendService } from "../../../services/backendService";
import { toast } from "react-hot-toast";

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Map common bank-statement headers to {date, debit, credit, amount, description}.
function normalizeBankRows(rows) {
  const pick = (row, ...keys) => {
    const map = {};
    for (const k of Object.keys(row)) map[k.toLowerCase().trim()] = row[k];
    for (const k of keys) { const v = map[k.toLowerCase()]; if (v !== undefined && v !== "") return v; }
    return "";
  };
  return rows.map((r) => ({
    date: pick(r, "date", "txn date", "transaction date", "value date", "posting date"),
    debit: pick(r, "debit", "withdrawal", "withdrawal amt", "dr", "paid out"),
    credit: pick(r, "credit", "deposit", "deposit amt", "cr", "paid in"),
    amount: pick(r, "amount", "amt"),
    description: pick(r, "description", "narration", "particulars", "details", "remarks"),
  }));
}

export default function BankReconcileView({ workbenchId }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setBusy(true); setResult(null);
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      let rows = [];
      if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = read(buf, { type: "array" });
        rows = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      } else {
        const text = await file.text();
        rows = (Papa.parse(text, { header: true, skipEmptyLines: true }).data) || [];
      }
      const lines = normalizeBankRows(rows).filter((l) => l.date || l.amount || l.debit || l.credit);
      if (!lines.length) { toast.error("No rows found in this statement"); return; }
      const res = await backendService.reconcileBankStatement(workbenchId, lines);
      setResult(res);
      toast.success(`Matched ${res.summary.matched}/${res.summary.bank_lines} lines`);
    } catch (err) {
      toast.error(err.message || "Could not reconcile");
    } finally {
      setBusy(false);
    }
  }, [workbenchId]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Bank Reconciliation</h3>
        <p className="text-gray-500 text-xs">Upload a bank statement (CSV/Excel) — we auto-match each line to your ledger.</p>
      </div>

      <label className="block cursor-pointer">
        <div className="border-2 border-dashed border-white/10 hover:border-teal-500/40 rounded-2xl p-8 text-center transition-colors bg-white/[0.02]">
          {busy ? <BsArrowRepeat className="w-7 h-7 mx-auto text-teal-400 animate-spin" />
                : <BsUpload className="w-7 h-7 mx-auto text-gray-500" />}
          <p className="mt-2 text-sm font-semibold text-gray-300">{busy ? "Matching…" : "Choose bank statement (.csv / .xlsx)"}</p>
        </div>
        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["Match Rate", `${result.match_rate}%`, "text-teal-400"],
              ["Matched", result.summary.matched, "text-emerald-400"],
              ["Unmatched (bank)", result.summary.unmatched_bank, "text-amber-400"],
              ["Unmatched (ledger)", result.summary.unmatched_ledger, "text-gray-300"],
            ].map(([label, val, color], i) => (
              <div key={i} className="bg-[#0E1117] border border-white/5 rounded-xl p-4">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{val}</div>
              </div>
            ))}
          </div>

          {result.unmatched_bank?.length > 0 && (
            <div className="bg-[#0E1117] border border-white/5 rounded-xl p-4">
              <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-2">
                <BsExclamationCircle /> Statement lines with no ledger match ({result.unmatched_bank.length})
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {result.unmatched_bank.slice(0, 50).map((b, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-400 py-1 border-b border-white/5">
                    <span>{b.date} · {b.description}</span>
                    <span className="font-semibold">{fmtINR(b.amount || b.debit || b.credit)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-600 mt-2">These likely need a ledger entry — record them as transactions.</p>
            </div>
          )}

          {result.summary.matched > 0 && result.summary.unmatched_bank === 0 && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <BsCheckCircle /> Every statement line matched the ledger. Books are reconciled.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
