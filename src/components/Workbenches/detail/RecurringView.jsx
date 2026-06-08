import React, { useState, useEffect, useCallback } from "react";
import { BsPlusLg, BsTrash, BsPlayFill, BsArrowRepeat } from "react-icons/bs";
import { backendService } from "../../../services/backendService";
import { useWorkbench } from "../../../context/WorkbenchContext";
import { toast } from "react-hot-toast";
import { roundMoney } from "../../../utils/numberFormatter";

const FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "yearly"];
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function RecurringView({ workbenchId }) {
  const { labels = [] } = useWorkbench();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [running, setRunning] = useState(false);
  const [form, setForm] = useState({
    description: "", from_label_id: "", to_label_id: "", amount: "",
    frequency: "monthly", next_run_date: new Date().toISOString().slice(0, 10), end_date: "",
  });

  const fetchItems = useCallback(async () => {
    if (!workbenchId) return;
    setLoading(true);
    try {
      setItems(await backendService.listRecurring(workbenchId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [workbenchId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const labelName = (id) => labels.find((l) => l.id === id)?.name || "—";

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.description || !form.from_label_id || !form.to_label_id || !form.amount) {
      toast.error("Fill in all required fields");
      return;
    }
    if (form.from_label_id === form.to_label_id) {
      toast.error("Source and destination must differ");
      return;
    }
    try {
      await backendService.createRecurring({
        workbench_id: workbenchId,
        description: form.description,
        from_label_id: form.from_label_id,
        to_label_id: form.to_label_id,
        amount: roundMoney(form.amount),
        frequency: form.frequency,
        next_run_date: form.next_run_date,
        end_date: form.end_date || null,
      });
      toast.success("Recurring transaction scheduled");
      setShowForm(false);
      setForm({ ...form, description: "", amount: "" });
      fetchItems();
    } catch (err) {
      toast.error(err.message || "Failed to create");
    }
  };

  const handleRunDue = async () => {
    setRunning(true);
    try {
      const res = await backendService.runRecurringDue(workbenchId);
      toast.success(res.posted ? `Posted ${res.posted} due transaction(s)` : "Nothing due right now");
      window.dispatchEvent(new Event("refresh-ledger-data"));
      fetchItems();
    } catch (err) {
      toast.error(err.message || "Failed to run");
    } finally {
      setRunning(false);
    }
  };

  const toggle = async (it) => {
    try { await backendService.toggleRecurring(it.id, !it.active); fetchItems(); }
    catch (err) { toast.error(err.message); }
  };
  const remove = async (id) => {
    try { await backendService.deleteRecurring(id); fetchItems(); }
    catch (err) { toast.error(err.message); }
  };

  const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/40";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Recurring Transactions</h3>
          <p className="text-gray-500 text-xs">Rent, salaries, subscriptions &amp; EMIs — scheduled and auto-posted when due.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRunDue} disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition-all disabled:opacity-50">
            {running ? <BsArrowRepeat className="animate-spin" /> : <BsPlayFill />} Run Due Now
          </button>
          <button onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-teal-500 text-black hover:bg-teal-400 transition-all">
            <BsPlusLg size={12} /> New
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#0E1117] border border-white/5 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className={inputCls} placeholder="Description (e.g. Office Rent)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className={inputCls} type="number" step="0.01" placeholder="Amount" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <select className={inputCls} value={form.from_label_id} onChange={(e) => setForm({ ...form, from_label_id: e.target.value })}>
            <option value="">From account (source)…</option>
            {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className={inputCls} value={form.to_label_id} onChange={(e) => setForm({ ...form, to_label_id: e.target.value })}>
            <option value="">To account (destination)…</option>
            {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className={inputCls} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}
          </select>
          <input className={inputCls} type="date" value={form.next_run_date} onChange={(e) => setForm({ ...form, next_run_date: e.target.value })} />
          <div className="md:col-span-2 flex items-center justify-between">
            <label className="text-xs text-gray-500 flex items-center gap-2">
              End date (optional)
              <input className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-white [color-scheme:dark]" type="date"
                value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </label>
            <button type="submit" className="px-5 py-2 rounded-xl text-sm font-bold bg-teal-500 text-black hover:bg-teal-400">Schedule</button>
          </div>
        </form>
      )}

      <div className="bg-[#0E1117] border border-white/5 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Flow</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">Frequency</th>
              <th className="px-5 py-3">Next Run</th>
              <th className="px-5 py-3 text-center">Active</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan="7" className="px-5 py-10 text-center text-gray-500 text-xs">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="7" className="px-5 py-10 text-center text-gray-500 text-xs">No recurring transactions yet.</td></tr>
            ) : items.map((it) => (
              <tr key={it.id} className="text-gray-300">
                <td className="px-5 py-4 font-medium text-white">{it.description}</td>
                <td className="px-5 py-4 text-xs text-gray-400">{labelName(it.from_label_id)} → {labelName(it.to_label_id)}</td>
                <td className="px-5 py-4 text-right font-semibold">{fmtINR(it.amount)}</td>
                <td className="px-5 py-4 capitalize text-xs">{it.frequency}</td>
                <td className="px-5 py-4 text-xs">{it.next_run_date}</td>
                <td className="px-5 py-4 text-center">
                  <button onClick={() => toggle(it)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${it.active ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-500"}`}>
                    {it.active ? "ON" : "OFF"}
                  </button>
                </td>
                <td className="px-5 py-4 text-right">
                  <button onClick={() => remove(it.id)} className="text-gray-600 hover:text-red-400 transition-colors"><BsTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
