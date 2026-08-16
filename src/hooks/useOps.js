import { useState, useEffect } from 'react';
import { diService } from '../services/diService';

// --- MOCK DATA (Budgeting only — no backing table yet) ---

const MOCK_BUDGET_DATA = [];

// --- HOOKS ---

// Bumps a counter whenever a document is posted anywhere, or the user returns to
// this tab/window — consumers add it to their fetch deps to auto-refresh live.
function useLedgerRefreshKey() {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const bump = () => setKey((k) => k + 1);
    const onVisible = () => { if (!document.hidden) bump(); };
    window.addEventListener('ledger:updated', bump);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('ledger:updated', bump);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return key;
}

const EMPTY_AR_KPIS = { total: 0, overdue: 0, dso: 0, customersWithOverdue: 0 };
const EMPTY_AP_KPIS = { total: 0, dueThisWeek: 0, overdue: 0, dpo: 0 };

export function useAccountsReceivable(workbenchId) {
  const [rows, setRows] = useState([]);
  const [kpis, setKpis] = useState(EMPTY_AR_KPIS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const refreshKey = useLedgerRefreshKey();

  useEffect(() => {
    if (!workbenchId || workbenchId === 'demo') { setRows([]); setKpis(EMPTY_AR_KPIS); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    diService.getReceivables(workbenchId)
      .then((res) => { if (!cancelled) { setRows(res.data || []); setKpis(res.kpis || EMPTY_AR_KPIS); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setRows([]); setKpis(EMPTY_AR_KPIS); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workbenchId, refreshKey]);

  const data = rows.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(item.customer || '').toLowerCase().includes(q) && !(item.invoiceNumber || '').toLowerCase().includes(q)) return false;
    }
    if (filters.status && (item.status || '').toLowerCase() !== filters.status.toLowerCase()) return false;
    return true;
  });

  return { data, kpis, loading, error, setFilters, activeFilters: filters, searchQuery: search, setSearchQuery: setSearch };
}

export function useAccountsPayable(workbenchId) {
  const [rows, setRows] = useState([]);
  const [kpis, setKpis] = useState(EMPTY_AP_KPIS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const refreshKey = useLedgerRefreshKey();

  useEffect(() => {
    if (!workbenchId || workbenchId === 'demo') { setRows([]); setKpis(EMPTY_AP_KPIS); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    diService.getPayables(workbenchId)
      .then((res) => { if (!cancelled) { setRows(res.data || []); setKpis(res.kpis || EMPTY_AP_KPIS); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setRows([]); setKpis(EMPTY_AP_KPIS); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workbenchId, refreshKey]);

  const data = rows.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(item.vendor || '').toLowerCase().includes(q) && !(item.billNumber || '').toLowerCase().includes(q)) return false;
    }
    if (filters.status && (item.status || '').toLowerCase() !== filters.status.toLowerCase()) return false;
    return true;
  });

  return { data, kpis, loading, error, setFilters, activeFilters: filters, searchQuery: search, setSearchQuery: setSearch };
}

export function useBudgets(workbenchId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');

  const kpis = {
    allocated: 0.00,
    utilized: 0.00,
    remaining: 0.00,
    utilizationPercent: 0
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      let filtered = [...MOCK_BUDGET_DATA];
      
      if (search) {
        filtered = filtered.filter(item => 
          item.name.toLowerCase().includes(search.toLowerCase()) || 
          item.department.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (filters.department) {
        filtered = filtered.filter(item => item.department.toLowerCase() === filters.department.toLowerCase());
      }
      
      setData(filtered);
      setLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [workbenchId, filters, search]);

  return {
    data,
    kpis,
    loading,
    setFilters,
    activeFilters: filters,
    searchQuery: search,
    setSearchQuery: setSearch
  };
}

export function useTransfers(workbenchId) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const refreshKey = useLedgerRefreshKey();

  useEffect(() => {
    if (!workbenchId) { setRows([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    diService.getTransfers(workbenchId)
      .then((res) => { if (!cancelled) setRows(res || []); })
      .catch((e) => { if (!cancelled) { setError(e.message); setRows([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workbenchId, refreshKey]);

  const data = rows.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(item.narration || '').toLowerCase().includes(q) && 
          !(item.from_account || '').toLowerCase().includes(q) &&
          !(item.to_account || '').toLowerCase().includes(q) &&
          !(item.reference_number || '').toLowerCase().includes(q)) return false;
    }
    if (filters.transfer_type && item.transfer_type !== filters.transfer_type) return false;
    return true;
  });

  const kpis = {
    totalVolume: rows.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    contraCount: rows.filter(r => ['bank_to_bank', 'petty_cash_deposit', 'petty_cash_withdrawal'].includes(r.transfer_type)).length,
    equityCount: rows.filter(r => ['founder_capital_infusion', 'initial_funding', 'founder_drawings'].includes(r.transfer_type)).length,
    postedCount: rows.filter(r => r.status === 'posted').length
  };

  const refetch = () => {
    setLoading(true);
    diService.getTransfers(workbenchId)
      .then(res => setRows(res || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  return { data, kpis, loading, error, setFilters, activeFilters: filters, searchQuery: search, setSearchQuery: setSearch, refetch };
}

