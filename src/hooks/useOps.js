import { useState, useEffect } from 'react';
import { diService } from '../services/diService';

// --- MOCK DATA (Budgeting only — no backing table yet) ---

const MOCK_BUDGET_DATA = [
  { id: 'b_001', name: 'Q3 Marketing', department: 'Marketing', category: 'Advertising', allocated: 50000.00, utilized: 15400.00, remaining: 34600.00, variance: '+5%' },
  { id: 'b_002', name: 'Annual Software', department: 'IT', category: 'SaaS', allocated: 120000.00, utilized: 75000.00, remaining: 45000.00, variance: '-2%' },
  { id: 'b_003', name: 'Q3 Travel', department: 'Sales', category: 'Travel', allocated: 30000.00, utilized: 28500.00, remaining: 1500.00, variance: '-15%' },
  { id: 'b_004', name: 'Office Supplies', department: 'Operations', category: 'Supplies', allocated: 10000.00, utilized: 2500.00, remaining: 7500.00, variance: '0%' },
];

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
    allocated: 210000.00,
    utilized: 121400.00,
    remaining: 88600.00,
    utilizationPercent: 57.8
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
