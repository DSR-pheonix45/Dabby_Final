import { useState, useEffect } from 'react';

// --- MOCK DATA ---

const MOCK_AR_DATA = [
  { id: 'inv_001', customer: 'Acme Corp', invoiceNumber: 'INV-2026-001', date: '2026-06-15', dueDate: '2026-07-15', amount: 15400.00, daysOutstanding: 25, status: 'Outstanding', rep: 'Sarah J.', lastActivity: 'Email sent 2 days ago' },
  { id: 'inv_002', customer: 'Global Tech', invoiceNumber: 'INV-2026-002', date: '2026-05-10', dueDate: '2026-06-10', amount: 8250.50, daysOutstanding: 61, status: 'Overdue', rep: 'Mike T.', lastActivity: 'Call scheduled' },
  { id: 'inv_003', customer: 'Stark Industries', invoiceNumber: 'INV-2026-003', date: '2026-07-01', dueDate: '2026-07-31', amount: 45000.00, daysOutstanding: 9, status: 'Outstanding', rep: 'Sarah J.', lastActivity: 'Invoice viewed' },
  { id: 'inv_004', customer: 'Wayne Enterprises', invoiceNumber: 'INV-2026-004', date: '2026-04-15', dueDate: '2026-05-15', amount: 12000.00, daysOutstanding: 86, status: 'Overdue', rep: 'Mike T.', lastActivity: 'Payment promised' },
  { id: 'inv_005', customer: 'Oscorp', invoiceNumber: 'INV-2026-005', date: '2026-07-05', dueDate: '2026-08-05', amount: 3400.00, daysOutstanding: 5, status: 'Outstanding', rep: 'Sarah J.', lastActivity: 'Invoice sent' },
];

const MOCK_AP_DATA = [
  { id: 'bill_001', vendor: 'AWS Cloud Services', billNumber: 'AWS-2026-07', date: '2026-07-01', dueDate: '2026-07-15', amount: 4500.00, daysRemaining: 5, status: 'Due Soon', terms: 'Net 15' },
  { id: 'bill_002', vendor: 'WeWork', billNumber: 'WW-08992', date: '2026-07-01', dueDate: '2026-07-05', amount: 12000.00, daysRemaining: -5, status: 'Overdue', terms: 'Due on Receipt' },
  { id: 'bill_003', vendor: 'Google Workspace', billNumber: 'G-77483', date: '2026-07-02', dueDate: '2026-07-16', amount: 850.00, daysRemaining: 6, status: 'Outstanding', terms: 'Net 14' },
  { id: 'bill_004', vendor: 'Legal Counsel LLC', billNumber: 'INV-992', date: '2026-06-15', dueDate: '2026-07-15', amount: 5500.00, daysRemaining: 5, status: 'Due Soon', terms: 'Net 30' },
  { id: 'bill_005', vendor: 'Marketing Agency', billNumber: 'MA-044', date: '2026-06-20', dueDate: '2026-07-20', amount: 8900.00, daysRemaining: 10, status: 'Outstanding', terms: 'Net 30' },
];

const MOCK_BUDGET_DATA = [
  { id: 'b_001', name: 'Q3 Marketing', department: 'Marketing', category: 'Advertising', allocated: 50000.00, utilized: 15400.00, remaining: 34600.00, variance: '+5%' },
  { id: 'b_002', name: 'Annual Software', department: 'IT', category: 'SaaS', allocated: 120000.00, utilized: 75000.00, remaining: 45000.00, variance: '-2%' },
  { id: 'b_003', name: 'Q3 Travel', department: 'Sales', category: 'Travel', allocated: 30000.00, utilized: 28500.00, remaining: 1500.00, variance: '-15%' },
  { id: 'b_004', name: 'Office Supplies', department: 'Operations', category: 'Supplies', allocated: 10000.00, utilized: 2500.00, remaining: 7500.00, variance: '0%' },
];

// --- HOOKS ---

export function useAccountsReceivable(workbenchId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');

  const kpis = {
    total: 84050.50,
    overdue: 20250.50,
    dso: 42,
    customersWithOverdue: 2
  };

  useEffect(() => {
    // Simulate network delay
    setLoading(true);
    const timer = setTimeout(() => {
      let filtered = [...MOCK_AR_DATA];
      
      if (search) {
        filtered = filtered.filter(item => 
          item.customer.toLowerCase().includes(search.toLowerCase()) || 
          item.invoiceNumber.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (filters.status) {
        filtered = filtered.filter(item => item.status.toLowerCase() === filters.status.toLowerCase());
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

export function useAccountsPayable(workbenchId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');

  const kpis = {
    total: 31750.00,
    dueThisWeek: 10850.00,
    overdue: 12000.00,
    dpo: 28
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      let filtered = [...MOCK_AP_DATA];
      
      if (search) {
        filtered = filtered.filter(item => 
          item.vendor.toLowerCase().includes(search.toLowerCase()) || 
          item.billNumber.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (filters.status) {
        filtered = filtered.filter(item => item.status.toLowerCase() === filters.status.toLowerCase());
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
