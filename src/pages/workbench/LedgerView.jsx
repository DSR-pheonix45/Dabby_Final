import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BsJournalText, BsListColumnsReverse, BsArrowRepeat, BsCheckCircleFill,
  BsExclamationTriangleFill, BsGraphUpArrow, BsBank2,
} from 'react-icons/bs';
import { diService } from '../../services/diService';
import { formatCurrency } from '../../utils/currency';

const CAT_COLOR = {
  Assets: 'text-blue-400', Liabilities: 'text-amber-400', Equity: 'text-purple-400',
  Revenue: 'text-teal-400', Expenses: 'text-rose-400',
};

const TABS = [
  { id: 'trial', label: 'Trial Balance', icon: BsJournalText },
  { id: 'pnl', label: 'P&L', icon: BsGraphUpArrow },
  { id: 'bs', label: 'Balance Sheet', icon: BsBank2 },
  { id: 'transactions', label: 'Transactions', icon: BsListColumnsReverse },
];

const money = (v, c) => (v ? formatCurrency(v, c) : '—');

// A titled block of account lines with a subtotal
function Section({ title, colorClass, lines, total, country }) {
  return (
    <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden">
      <div className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider ${colorClass} bg-white/[0.02] border-b border-white/5`}>{title}</div>
      <div className="divide-y divide-white/5">
        {lines.length === 0 ? (
          <div className="px-5 py-3 text-xs text-gray-600">No activity</div>
        ) : lines.map((l) => (
          <div key={l.code} className="flex items-center justify-between px-5 py-2.5 text-sm">
            <span className="text-gray-300"><span className="text-gray-600 font-mono text-xs mr-2">{l.code}</span>{l.name}</span>
            <span className="text-gray-200 font-medium">{money(l.amount, country)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-5 py-3 border-t-2 border-white/10 bg-[#111111]/60 font-bold text-white text-sm">
        <span>Total {title}</span><span>{formatCurrency(total, country)}</span>
      </div>
    </div>
  );
}

export default function LedgerView() {
  const { workbench } = useOutletContext() || {};
  const workbenchId = workbench?.id;
  const country = workbench?.country;

  const [tab, setTab] = useState('trial');
  const [data, setData] = useState({ tb: null, pnl: null, bs: null, txs: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workbenchId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [tb, pnl, bs, txs] = await Promise.all([
        diService.getTrialBalance(workbenchId),
        diService.getPnl(workbenchId),
        diService.getBalanceSheet(workbenchId),
        diService.getLedgerTransactions(workbenchId),
      ]);
      setData({ tb, pnl, bs, txs: Array.isArray(txs) ? txs : [] });
    } catch (e) {
      console.error('[LedgerView] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [workbenchId]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh: when a document is posted anywhere, and when the user returns
  // to this tab/window — so statements always reflect the latest postings live.
  useEffect(() => {
    const onPosted = () => load();
    const onVisible = () => { if (!document.hidden) load(); };
    window.addEventListener('ledger:updated', onPosted);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('ledger:updated', onPosted);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const { tb, pnl, bs, txs } = data;
  const empty = tb && tb.account_count === 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111111] overflow-hidden">
      <div className="px-6 lg:px-10 py-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181818]/50">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Financials</h1>
          <p className="text-sm text-gray-400 mt-1">Live statements built from your posted documents</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#111111] border border-white/10 rounded-lg p-1 flex-wrap">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${tab === t.id ? 'bg-white/10 text-teal-400' : 'text-gray-500 hover:text-white'}`}>
                  <Icon /> {t.label}
                </button>
              );
            })}
          </div>
          <button onClick={load} title="Refresh"
            className="p-2 bg-[#181818] hover:bg-[#222] border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <BsArrowRepeat className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 lg:px-10 py-6">
        <div className="max-w-[1100px] mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-gray-500"><BsArrowRepeat className="animate-spin mr-2" /> Loading…</div>
          ) : tab === 'trial' ? (
            <TrialBalance tb={tb} country={country} />
          ) : tab === 'pnl' ? (
            <ProfitLoss pnl={pnl} country={country} />
          ) : tab === 'bs' ? (
            <BalanceSheet bs={bs} country={country} />
          ) : (
            <Transactions txs={txs} country={country} />
          )}
        </div>
      </div>
    </div>
  );
}

function BalancedBanner({ ok, left, children }) {
  return (
    <div className={`mb-5 flex items-center justify-between px-5 py-3 rounded-xl border ${ok ? 'bg-teal-500/5 border-teal-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        {ok ? <><BsCheckCircleFill className="text-teal-400" /><span className="text-teal-400">{left}</span></>
            : <><BsExclamationTriangleFill className="text-rose-400" /><span className="text-rose-400">{left}</span></>}
      </div>
      <div className="text-xs text-gray-400">{children}</div>
    </div>
  );
}

function TrialBalance({ tb, country }) {
  return (
    <>
      <BalancedBanner ok={tb.balanced} left={tb.balanced ? 'Books balanced' : 'Out of balance'}>
        Dr <span className="text-white font-semibold">{formatCurrency(tb.total_debit, country)}</span>
        <span className="mx-2">=</span>
        Cr <span className="text-white font-semibold">{formatCurrency(tb.total_credit, country)}</span>
      </BalancedBanner>
      <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#111111]/60 text-gray-500 text-xs uppercase tracking-wider">
            <tr><th className="text-left px-5 py-3 font-medium">Account</th><th className="text-right px-5 py-3 font-medium">Debit</th><th className="text-right px-5 py-3 font-medium">Credit</th></tr>
          </thead>
          <tbody>
            {tb.groups.map((g) => (
              <React.Fragment key={g.category}>
                <tr className="bg-white/[0.02]"><td colSpan={3} className={`px-5 py-2 text-xs font-bold uppercase tracking-wider ${CAT_COLOR[g.name] || 'text-gray-400'}`}>{g.name}</td></tr>
                {g.accounts.map((a) => (
                  <tr key={a.account_id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-2.5 text-gray-300"><span className="text-gray-600 mr-2 font-mono text-xs">{a.code}</span>{a.name}</td>
                    <td className="px-5 py-2.5 text-right text-gray-200 font-medium">{money(a.debit, country)}</td>
                    <td className="px-5 py-2.5 text-right text-gray-200 font-medium">{money(a.credit, country)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot><tr className="border-t-2 border-white/10 bg-[#111111]/60 font-bold text-white">
            <td className="px-5 py-3">Total</td>
            <td className="px-5 py-3 text-right">{formatCurrency(tb.total_debit, country)}</td>
            <td className="px-5 py-3 text-right">{formatCurrency(tb.total_credit, country)}</td>
          </tr></tfoot>
        </table>
      </div>
    </>
  );
}

function ProfitLoss({ pnl, country }) {
  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border p-6 flex items-center justify-between ${pnl.is_profit ? 'bg-teal-500/5 border-teal-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">Net {pnl.is_profit ? 'Profit' : 'Loss'}</p>
          <p className={`text-3xl font-extrabold ${pnl.is_profit ? 'text-teal-400' : 'text-rose-400'}`}>{formatCurrency(pnl.net_profit, country)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Margin</p>
          <p className="text-xl font-bold text-white">{pnl.margin_pct}%</p>
        </div>
      </div>
      <Section title="Revenue" colorClass={CAT_COLOR.Revenue} lines={pnl.revenue} total={pnl.total_revenue} country={country} />
      <Section title="Expenses" colorClass={CAT_COLOR.Expenses} lines={pnl.expenses} total={pnl.total_expenses} country={country} />
      <div className="flex items-center justify-between px-5 py-4 rounded-xl bg-[#181818] border border-white/10 font-bold text-white">
        <span>Net {pnl.is_profit ? 'Profit' : 'Loss'} (Revenue − Expenses)</span>
        <span className={pnl.is_profit ? 'text-teal-400' : 'text-rose-400'}>{formatCurrency(pnl.net_profit, country)}</span>
      </div>
    </div>
  );
}

function BalanceSheet({ bs, country }) {
  return (
    <>
      <BalancedBanner ok={bs.balanced} left={bs.balanced ? 'Balance sheet balanced' : 'Out of balance'}>
        Assets <span className="text-white font-semibold">{formatCurrency(bs.total_assets, country)}</span>
        <span className="mx-2">=</span>
        L + E <span className="text-white font-semibold">{formatCurrency(bs.liabilities_plus_equity, country)}</span>
      </BalancedBanner>
      <div className="grid md:grid-cols-2 gap-5">
        <Section title="Assets" colorClass={CAT_COLOR.Assets} lines={bs.assets} total={bs.total_assets} country={country} />
        <div className="space-y-5">
          <Section title="Liabilities" colorClass={CAT_COLOR.Liabilities} lines={bs.liabilities} total={bs.total_liabilities} country={country} />
          <Section title="Equity" colorClass={CAT_COLOR.Equity} lines={bs.equity} total={bs.total_equity} country={country} />
        </div>
      </div>
    </>
  );
}

function Transactions({ txs, country }) {
  if (txs.length === 0) return <p className="text-gray-500 text-sm text-center py-16">No ledger transactions yet.</p>;
  return (
    <div className="space-y-3">
      {txs.map((t) => (
        <div key={t.id} className="bg-[#181818] border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">{t.business_events?.event_type || 'Manual'}</span>
              <span className="text-white font-semibold ml-3">{t.business_events?.counterparty || t.description || '—'}</span>
            </div>
            <div className="text-right">
              <div className="text-white font-bold">{formatCurrency(t.total_amount, country)}</div>
              <div className="text-[11px] text-gray-500">{t.transaction_date}</div>
            </div>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-lg divide-y divide-white/5">
            {(t.entries || []).map((e, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="text-gray-300"><span className="text-gray-600 font-mono mr-2">{e.code}</span>{e.account}</span>
                <span className={e.direction === 'debit' ? 'text-blue-300' : 'text-amber-300'}>
                  {e.direction === 'debit' ? 'Dr ' : 'Cr '}{formatCurrency(e.amount, country)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
