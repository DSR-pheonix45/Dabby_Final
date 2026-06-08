import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import { read, utils } from "xlsx";
import { BsUpload, BsCheckCircle, BsArrowRepeat, BsDownload, BsFileEarmarkText } from "react-icons/bs";
import {
  normalizeImport,
  FORMAT_LABELS,
  SOURCE_FORMATS,
} from "../../services/importService";

/**
 * Tally / Zoho import wizard.
 * Upload a Tally XML / Daybook or a Zoho Books CSV/Excel export; we auto-detect
 * the format, normalize it to Datalis canonical rows, preview, and let the user
 * download the normalized CSV (ready for the standard ingestion flow) or hand it
 * back to a parent via onImported().
 */
export default function ImportWizard({ onImported }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { format, kind, rows }
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    setFileName(file.name);
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      let normalized;

      if (ext === "xml") {
        const text = await file.text();
        normalized = normalizeImport({ text, fileName: file.name });
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = utils.sheet_to_json(sheet, { defval: "" });
        const headers = rows.length ? Object.keys(rows[0]) : [];
        normalized = normalizeImport({ rows, headers, fileName: file.name });
      } else {
        // CSV / TXT
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        const rows = parsed.data || [];
        const headers = parsed.meta?.fields || (rows[0] ? Object.keys(rows[0]) : []);
        normalized = normalizeImport({ rows, headers, fileName: file.name });
      }

      if (!normalized.rows || normalized.rows.length === 0) {
        setError("No rows could be read from this file. Is it a Tally/Zoho export?");
      } else {
        setResult(normalized);
        onImported?.(normalized);
      }
    } catch (e) {
      console.error("Import failed:", e);
      setError(e.message || "Could not parse this file.");
    } finally {
      setBusy(false);
    }
  }, [onImported]);

  const downloadNormalized = () => {
    if (!result?.rows?.length) return;
    const cols = Object.keys(result.rows[0]);
    const csv = Papa.unparse({ fields: cols, data: result.rows.map((r) => cols.map((c) => r[c])) });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `datalis-normalized-${result.format}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const preview = result?.rows?.slice(0, 8) || [];
  const cols = preview.length ? Object.keys(preview[0]).filter((c) => c !== "source_format") : [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Import from Tally &amp; Zoho</h2>
        <p className="text-sm text-gray-400">
          Bring your existing books across. Supports Tally XML &amp; Daybook exports and
          Zoho Books Journal / Invoice / Contacts / Chart-of-Accounts CSV &amp; Excel.
        </p>
      </div>

      <label className="block cursor-pointer">
        <div className="border-2 border-dashed border-white/10 hover:border-teal-500/40 rounded-2xl p-10 text-center transition-colors bg-white/[0.02]">
          {busy ? (
            <BsArrowRepeat className="w-8 h-8 mx-auto text-teal-400 animate-spin" />
          ) : (
            <BsUpload className="w-8 h-8 mx-auto text-gray-500" />
          )}
          <p className="mt-3 text-sm font-semibold text-gray-300">
            {busy ? "Parsing…" : "Drop or choose a Tally / Zoho export"}
          </p>
          <p className="text-[11px] text-gray-600 mt-1">.xml · .csv · .xlsx · .xls</p>
        </div>
        <input
          type="file"
          accept=".xml,.csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <BsCheckCircle className="text-emerald-400 w-5 h-5" />
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <BsFileEarmarkText className="text-gray-500" /> {fileName}
                </div>
                <div className="text-[11px] text-gray-500">
                  Detected: <span className="text-teal-400 font-semibold">{FORMAT_LABELS[result.format]}</span>
                  {" · "}{result.rows.length} {result.kind} row{result.rows.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>
            <button
              onClick={downloadNormalized}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-teal-500 text-black hover:bg-teal-400 transition-all"
            >
              <BsDownload /> Download normalized CSV
            </button>
          </div>

          {result.format === SOURCE_FORMATS.GENERIC && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              Couldn't recognize this as a Tally/Zoho export — showing raw rows. You can still
              map it manually in the standard ingestion screen.
            </div>
          )}

          <div className="border border-white/5 rounded-xl overflow-x-auto bg-[#0E1117]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-gray-500">
                  {cols.map((c) => (
                    <th key={c} className="px-3 py-2 whitespace-nowrap">{c.replace(/_/g, " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {preview.map((row, i) => (
                  <tr key={i} className="text-gray-300">
                    {cols.map((c) => (
                      <td key={c} className="px-3 py-2 whitespace-nowrap">{String(row[c] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-600">
            Showing first {preview.length} of {result.rows.length} rows. Download the normalized
            CSV and run it through Data Ingestion, or wire onImported() to post directly.
          </p>
        </div>
      )}
    </div>
  );
}
