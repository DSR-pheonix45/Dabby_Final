import { useState, useEffect } from 'react';
import { diService } from '../services/diService';
import { deriveDocumentStatus } from '../pages/workbench/DocVault/index';

const MOCK_PIPELINE_DATA = [
  { id: 'doc_1', type: 'Invoice', party: 'AWS Cloud Services', amount: 450.00, confidence: 98, time: '2 mins ago', reviewer: 'Unassigned', stage: 'uploaded', linkedDocs: 0, 
    analysis: { summary: "Standard monthly AWS hosting invoice.", tags: ["SaaS", "Cloud"] },
    journal: [{ account: "5990 SaaS Subscription", type: "debit", amount: 450.00 }, { account: "2000 Accounts Payable", type: "credit", amount: 450.00 }],
    mockSnippetAttached: true
  },
  { id: 'doc_2', type: 'Receipt', party: 'Uber', amount: 35.50, confidence: 85, time: '15 mins ago', reviewer: 'Unassigned', stage: 'ocr_processing', linkedDocs: 0,
    analysis: { summary: "Travel expense. Uber ride.", tags: ["Travel"] },
    journal: null
  },
  { id: 'doc_3', type: 'Invoice', party: 'WeWork', amount: 12000.00, confidence: 99, time: '1 hour ago', reviewer: 'Sarah J.', stage: 'analysis_complete', linkedDocs: 1,
    analysis: { summary: "Monthly office lease invoice.", tags: ["Rent"] },
    journal: [{ account: "5000 Rent Expense", type: "debit", amount: 12000.00 }, { account: "2000 Accounts Payable", type: "credit", amount: 12000.00 }],
    mockSnippetAttached: true
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
    let isMounted = true;
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const docs = await diService.getDocuments(workbenchId);
        if (!isMounted) return;

        let mappedCards = docs.map(doc => {
          const status = deriveDocumentStatus(doc);
          let stage = 'uploaded';
          if (status === 'Processing') stage = 'ocr_processing';
          else if (status === 'Needs Review') stage = 'pending_review';
          else if (status === 'Ready to Post') stage = 'ready_to_post';
          else if (status === 'Posted') stage = 'posted';

          const extracted = doc.di_analysis_notes?.[0]?.extracted_data || {};
          const isBankStatement = extracted.document_type?.value?.toLowerCase().includes('bank statement') || false;

          return {
            id: doc.id,
            type: extracted.document_type?.value || 'Document',
            party: extracted.parties?.vendor_name?.value || extracted.parties?.customer_name?.value || extracted.parties?.issuer_name?.value || 'Unknown Party',
            amount: extracted.financials?.total_amount?.value || 0,
            confidence: Math.round((doc.di_analysis_notes?.[0]?.confidence || 0) * 100),
            time: new Date(doc.created_at).toLocaleDateString(),
            reviewer: 'System',
            stage: stage,
            linkedDocs: 0,
            analysis: { summary: "Live document from Vault", tags: [] },
            journal: null,
            mockSnippetAttached: isBankStatement, // Mock attach snippet if it's a bank statement
            rawDocument: doc // Keep raw document just in case
          };
        });

        if (search) {
          mappedCards = mappedCards.filter(item => 
            item.party.toLowerCase().includes(search.toLowerCase()) || 
            item.type.toLowerCase().includes(search.toLowerCase())
          );
        }
        
        if (filters.type) {
          mappedCards = mappedCards.filter(item => item.type.toLowerCase() === filters.type.toLowerCase());
        }

        if (filters.stage) {
          mappedCards = mappedCards.filter(item => item.stage === filters.stage);
        }
        
        setCards(mappedCards);
      } catch (err) {
        console.error("Failed to fetch pipeline documents", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (workbenchId) fetchDocuments();
    return () => { isMounted = false; };
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
