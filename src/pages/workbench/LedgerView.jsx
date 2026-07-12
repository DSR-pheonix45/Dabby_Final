import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BsJournalText, BsListColumnsReverse, BsArrowRepeat, BsCheckCircleFill, BsExclamationTriangleFill } from 'react-icons/bs';
import { diService } from '../../services/diService';
import { formatCurrency } from '../../utils/currency';

const CAT_COLOR = {
  Assets: 'text-blue-400', Liabilities: 'text-amber-400', Equity: 'text-purple-400',
  Revenue: 'text-teal-400', Expenses: 'text-rose-400',
};

function Money({ v, country }) {
  if (!v) return <span className="text-gray-600">—</span>;
  return <span>{formatCurrency(v, country)}</span>;
}

export default function LedgerView() {
  const { workbench } = useOutletContext() || {};
  const workbenchId = workbench?.id;
  const country = workbench?.country;

  const [tab, setTab] = useState('trial'); // 'trial' | 'transactions'
  const [tb, setTb] = useState(null);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workbenchId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [tbData, txData] = await Promise.all([
        diService.getTrialBalance(workbenchId),
        diService.getLedgerTransactions(workbenchId),
      ]);
      setTb(tbData);
      setTxs(Array.isArray(txData) ? txData : []);
    } catch (e) {
      console.error('[LedgerView] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [workbenchId]);

  useEffect(() => { load(); }, [load]);

  const empty = tb && tb.account_count === 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111111] overflow-hidden">
      {/* Header */}
      <div className="px-6 lg:px-10 py-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181818]/50">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Universal Ledger</h1>
          <p className="text-sm text-gray-400 mt-1">Live double-entry books built from your posted documents</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#111111] border border-white/10 rounded-lg p-1">
            <button onClick={() => setTab('trial')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${tab === 'trial' ? 'bg-white/10 text-teal-400' : 'text-gray-500 hover:text-white'}`}>
              <BsJournalText /> Trial Balance
            </button>
            <button onClick={() => setTab('transactions')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${tab === 'transactions' ? 'bg-white/10 text-teal-400' : 'text-gray-500 hover:text-white'}`}>
              <BsListColumnsReverse /> Transactions
            </button>
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
            <div className="flex items-center justify-center py-24 text-gray-500">
              <BsArrowRepeat className="animate-spin mr-2" /> Loading ledger…
            </div>
          ) : empty ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <BsJournalText size={40} className="text-gray-600 mb-4" />
              <h3 className="text-white font-semibold">No postings yet</h3>
              <p className="text-gray-500 text-sm mt-1 max-w-sm">Go to the Business Engine, open a document, and click <span className="text-teal-400 font-medium">Approve &amp; Post</span> — your books will start building here.</p>
            </div>
          ) : tab === 'trial' ? (
            <>
              {/* Balance banner */}
              <div className={`mb-5 flex items-center justify-between px-5 py-3 rounded-xl border ${tb.balanced ? 'bg-teal-500/5 border-teal-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {tb.balanced
                    ? <><BsCheckCircleFill className="text-teal-400" /> <span className="text-teal-400">Books balanced</span></>
                    : <><BsExclamationTriangleFill className="text-rose-400" /> <span className="text-rose-400">Out of balance</span></>}
                  <span className="text-gray-500 font-normal ml-2">{tb.transaction_count} transactions · {tb.account_count} accounts</span>
                </div>
                <div className="text-xs text-gray-400">
                  Dr <span className="text-white font-semibold">{formatCurrency(tb.total_debit, country)}</span>
                  <span className="mx-2">=</span>
                  Cr <span className="text-white font-semibold">{formatCurrency(tb.total_credit, country)}</span>
                </div>
              </div>

              <div className="bg-[#181818] border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#111111]/60 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium">Account</th>
                      <th className="text-right px-5 py-3 font-medium">Debit</th>
                      <th className="text-right px-5 py-3 font-medium">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tb.groups.map((g) => (
                      <React.Fragment key={g.category}>
                        <tr className="bg-white/[0.02]">
                          <td colSpan={3} className={`px-5 py-2 text-xs font-bold uppercase tracking-wider ${CAT_COLOR[g.name] || 'text-gray-400'}`}>{g.name}</td>
                        </tr>
                        {g.accounts.map((a) => (
                          <tr key={a.account_id} className="border-t border-white/5 hover:bg-white/[0.02]">
                            <td className="px-5 py-2.5 text-gray-300">
                              <span className="text-gray-600 mr-2 font-mono text-xs">{a.code}</span>{a.name}
                            </td>
                            <td className="px-5 py-2.5 text-right text-gray-200 font-medium"><Money v={a.debit} country={country} /></td>
                            <td className="px-5 py-2.5 text-right text-gray-200 font-medium"><Money v={a.credit} country={country} /></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-white/10 bg-[#111111]/60 font-bold text-white">
                      <td className="px-5 py-3">Total</td>
                      <td className="px-5 py-3 text-right">{formatCurrency(tb.total_debit, country)}</td>
                      <td className="px-5 py-3 text-right">{formatCurrency(tb.total_credit, country)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            /* Transactions */
            <div className="space-y-3">
              {txs.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-16">No ledger transactions yet.</p>
              ) : txs.map((t) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
