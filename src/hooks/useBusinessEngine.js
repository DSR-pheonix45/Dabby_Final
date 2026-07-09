import { useState, useEffect } from 'react';

const MOCK_PIPELINE_DATA = [
  { id: 'doc_1', type: 'Invoice', party: 'AWS Cloud Services', amount: 450.00, confidence: 98, time: '2 mins ago', reviewer: 'Unassigned', stage: 'uploaded', linkedDocs: 0, 
    analysis: { summary: "Standard monthly AWS hosting invoice.", tags: ["SaaS", "Cloud"] },
    journal: [{ account: "5990 SaaS Subscription", type: "debit", amount: 450.00 }, { account: "2000 Accounts Payable", type: "credit", amount: 450.00 }]
  },
  { id: 'doc_2', type: 'Receipt', party: 'Uber', amount: 35.50, confidence: 85, time: '15 mins ago', reviewer: 'Unassigned', stage: 'ocr_processing', linkedDocs: 0,
    analysis: { summary: "Travel expense. Uber ride.", tags: ["Travel"] },
    journal: null
  },
  { id: 'doc_3', type: 'Invoice', party: 'WeWork', amount: 12000.00, confidence: 99, time: '1 hour ago', reviewer: 'Sarah J.', stage: 'analysis_complete', linkedDocs: 1,
    analysis: { summary: "Monthly office lease invoice.", tags: ["Rent"] },
    journal: [{ account: "5000 Rent Expense", type: "debit", amount: 12000.00 }, { account: "2000 Accounts Payable", type: "credit", amount: 12000.00 }]
  },
  { id: 'doc_4', type: 'Bank Statement', party: 'Chase Bank', amount: 0, confidence: 100, time: '3 hours ago', reviewer: 'System', stage: 'financial_event', linkedDocs: 15,
    analysis: { summary: "Monthly checking account statement parsing.", tags: ["Banking"] },
    journal: null
  },
  { id: 'doc_5', type: 'Invoice', party: 'Legal Counsel LLC', amount: 5500.00, confidence: 75, time: '1 day ago', reviewer: 'Mike T.', stage: 'pending_review', linkedDocs: 0,
    analysis: { summary: "Retainer fee. Confidence low on line items.", tags: ["Legal", "Review Required"] },
    journal: [{ account: "5800 Legal Fees", type: "debit", amount: 5500.00 }, { account: "2000 Accounts Payable", type: "credit", amount: 5500.00 }]
  },
  { id: 'doc_6', type: 'Receipt', party: 'Staples', amount: 145.20, confidence: 95, time: '1 day ago', reviewer: 'System', stage: 'journal_proposed', linkedDocs: 0,
    analysis: { summary: "Office supplies.", tags: ["Supplies"] },
    journal: [{ account: "5100 Office Supplies", type: "debit", amount: 145.20 }, { account: "2000 Accounts Payable", type: "credit", amount: 145.20 }]
  },
  { id: 'doc_7', type: 'Bill', party: 'Google Workspace', amount: 850.00, confidence: 99, time: '2 days ago', reviewer: 'Sarah J.', stage: 'ready_to_post', linkedDocs: 0,
    analysis: { summary: "Monthly email hosting.", tags: ["SaaS"] },
    journal: [{ account: "5990 SaaS Subscription", type: "debit", amount: 850.00 }, { account: "2000 Accounts Payable", type: "credit", amount: 850.00 }]
  },
];

const MOCK_TIMELINE_DATA = MOCK_PIPELINE_DATA.map(doc => ({
  id: doc.id,
  timestamp: doc.time,
  document: `${doc.type} - ${doc.party}`,
  stage: doc.stage,
  status: doc.confidence > 90 ? 'Success' : 'Warning',
  duration: Math.floor(Math.random() * 10) + 's',
  user: doc.reviewer,
  confidence: doc.confidence
}));

export function useBusinessEngine(workbenchId) {
  const [loading, setLoading] = useState(true);

  const kpis = {
    uploaded: 145,
    processing: 12,
    awaitingReview: 5,
    readyToPost: 34,
    failed: 2
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [workbenchId]);

  return { kpis, loading };
}

export function usePipeline(workbenchId) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      let filtered = [...MOCK_PIPELINE_DATA];
      
      if (search) {
        filtered = filtered.filter(item => 
          item.party.toLowerCase().includes(search.toLowerCase()) || 
          item.type.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (filters.type) {
        filtered = filtered.filter(item => item.type.toLowerCase() === filters.type.toLowerCase());
      }

      if (filters.stage) {
        filtered = filtered.filter(item => item.stage === filters.stage);
      }
      
      setCards(filtered);
      setLoading(false);
    }, 600);
    
    return () => clearTimeout(timer);
  }, [workbenchId, filters, search]);

  const moveCard = (cardId, newStage) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, stage: newStage } : c));
  };

  return {
    cards,
    loading,
    setFilters,
    activeFilters: filters,
    searchQuery: search,
    setSearchQuery: setSearch,
    moveCard
  };
}

export function useProcessingTimeline(workbenchId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setData(MOCK_TIMELINE_DATA);
      setLoading(false);
    }, 600);
    
    return () => clearTimeout(timer);
  }, [workbenchId]);

  return { data, loading };
}
