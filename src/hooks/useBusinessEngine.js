import { useState, useEffect, useCallback } from 'react';
import { diService } from '../services/diService';
import { deriveDocumentStatus } from '../pages/workbench/DocVault/index';

/**
 * Business Engine data layer — wired to the real Document Intelligence pipeline.
 *
 * Source: GET /api/di/documents/{workbenchId} → di_documents rows joined with
 * di_analysis_notes(*) (the UFO: document_type/parties/money/taxes/dates/line_items)
 * and di_document_processing_logs(*).
 *
 * We read the flattened UFO columns first (Phase 1 contract) and fall back to the
 * legacy nested extracted_data.{field}.value shape for older documents, so cards
 * populate whether a doc was processed before or after the UFO mapper landed.
 */

// ── UFO field extraction (handles flattened + legacy nested shapes) ──────────
function pickVal(obj, keys) {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    if (typeof v === 'object' && !Array.isArray(v) && 'value' in v) {
      if (v.value != null && v.value !== '') return v.value;
    } else if (v !== '' && typeof v !== 'object') {
      return v;
    }
  }
  return null;
}

function cardType(note) {
  if (!note) return 'Document';
  const ex = note.extracted_data || {};
  return note.document_type || note.classification_type || pickVal(ex, ['document_type']) || 'Document';
}

function cardParty(note, fallback) {
  if (!note) return fallback || 'Unclassified';
  // Canonical UFO shape (UFOMapper): parties.issuer.name / parties.recipient.name
  const p = note.parties || {};
  const issuer = p.issuer?.name;
  const recipient = p.recipient?.name;
  // Legacy nested extracted_data fallback for pre-UFO docs
  const legacy = pickVal(note.extracted_data?.parties || {}, ['vendor_name', 'customer_name', 'issuer_name', 'recipient_name', 'name']);
  return issuer || recipient || legacy || fallback || 'Unclassified';
}

function cardAmount(note) {
  if (!note) return 0;
  const m = note.money || {};
  // Canonical UFO: money.total_amount / subtotal
  const v = m.total_amount ?? m.subtotal ?? pickVal(note.extracted_data?.financials || {}, ['total_amount', 'grand_total', 'total', 'amount']);
  return Number(v) || 0;
}

function cardConfidence(note) {
  const c = note?.confidence;
  return c == null ? null : Math.round(Number(c) * 100);
}

const STATUS_TO_STAGE = {
  Uploaded: 'uploaded',
  Processing: 'ocr_processing',
  'Needs Review': 'pending_review',
  'Ready to Post': 'ready_to_post',
  Posted: 'posted',
  Failed: 'uploaded', // no dedicated failed column; surface at intake
};

function mapDocToCard(doc) {
  const note = doc.di_analysis_notes?.[0] || null;
  const status = deriveDocumentStatus(doc);
  const type = cardType(note);
  const isBankStatement = String(type).toLowerCase().includes('bank');
  return {
    id: doc.id,
    type,
    party: cardParty(note, doc.original_filename),
    amount: cardAmount(note),
    confidence: cardConfidence(note),
    time: doc.created_at ? new Date(doc.created_at).toLocaleString() : '—',
    reviewer: 'Unassigned',
    stage: STATUS_TO_STAGE[status] || 'uploaded',
    status,
    linkedDocs: (note?.line_items?.length) || 0,
    filename: doc.original_filename,
    analysis: {
      summary: note?.reasoning || (note ? `Classified as ${type}` : 'Awaiting analysis'),
      tags: [type].filter(Boolean),
    },
    journal: null, // Phase 4: proposed entries come from the Accounting Rule Engine (business_events not yet live)
    mockSnippetAttached: isBankStatement && (note?.line_items?.length || 0) > 0,
    ufo: note,
    rawDocument: doc,
  };
}

// Shared fetch helper
async function loadDocs(workbenchId) {
  const docs = await diService.getDocuments(workbenchId);
  return Array.isArray(docs) ? docs : [];
}

// ── KPIs (real counts by derived status) ─────────────────────────────────────
export function useBusinessEngine(workbenchId) {
  const [kpis, setKpis] = useState({ uploaded: 0, processing: 0, awaitingReview: 0, readyToPost: 0, posted: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!workbenchId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const docs = await loadDocs(workbenchId);
        if (!alive) return;
        const c = { uploaded: 0, processing: 0, awaitingReview: 0, readyToPost: 0, posted: 0, failed: 0 };
        for (const d of docs) {
          const s = deriveDocumentStatus(d);
          if (s === 'Uploaded') c.uploaded++;
          else if (s === 'Processing') c.processing++;
          else if (s === 'Needs Review') c.awaitingReview++;
          else if (s === 'Ready to Post') c.readyToPost++;
          else if (s === 'Posted') c.posted++;
          else if (s === 'Failed') c.failed++;
        }
        setKpis(c);
      } catch (err) {
        console.error('[BusinessEngine] KPI load failed', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [workbenchId]);

  return { kpis, loading };
}

// ── Pipeline (real cards + client-side filter/search) ────────────────────────
export function usePipeline(workbenchId) {
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    if (!workbenchId) { setLoading(false); return; }
    setLoading(true);
    try {
      const docs = await loadDocs(workbenchId);
      setAllCards(docs.map(mapDocToCard));
    } catch (err) {
      console.error('[BusinessEngine] pipeline load failed', err);
    } finally {
      setLoading(false);
    }
  }, [workbenchId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Derive filtered view (no refetch on filter/search change)
  let cards = allCards;
  if (search) {
    const q = search.toLowerCase();
    cards = cards.filter(c => String(c.party).toLowerCase().includes(q) || String(c.type).toLowerCase().includes(q));
  }
  if (filters.type) cards = cards.filter(c => String(c.type).toLowerCase() === String(filters.type).toLowerCase());
  if (filters.stage) cards = cards.filter(c => c.stage === filters.stage);

  // Optimistic local move (stage is derived from processing logs, so this is a
  // visual-only change until the event→ledger pipeline can persist a transition).
  const moveCard = (cardId, newStage) => {
    setAllCards(prev => prev.map(c => (c.id === cardId ? { ...c, stage: newStage } : c)));
  };

  return {
    cards,
    loading,
    setFilters,
    activeFilters: filters,
    searchQuery: search,
    setSearchQuery: setSearch,
    moveCard,
    refresh,
  };
}

// ── Processing timeline (real, from di_document_processing_logs) ─────────────
export function useProcessingTimeline(workbenchId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!workbenchId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const docs = await loadDocs(workbenchId);
        if (!alive) return;
        const rows = [];
        for (const d of docs) {
          const note = d.di_analysis_notes?.[0] || null;
          const label = `${cardType(note)} — ${cardParty(note, d.original_filename)}`;
          const conf = cardConfidence(note);
          const logs = d.di_document_processing_logs || [];
          if (logs.length) {
            for (const log of logs) {
              rows.push({
                id: `${d.id}-${log.stage}-${log.created_at || ''}`,
                timestamp: log.created_at ? new Date(log.created_at).toLocaleString() : '—',
                _ts: log.created_at || d.created_at,
                document: label,
                stage: log.stage,
                status: log.status === 'success' ? 'Success' : log.status === 'failed' ? 'Failed' : 'Warning',
                duration: '—',
                user: log.provider || 'System',
                confidence: conf,
              });
            }
          } else {
            rows.push({
              id: d.id,
              timestamp: d.created_at ? new Date(d.created_at).toLocaleString() : '—',
              _ts: d.created_at,
              document: label,
              stage: 'upload',
              status: 'Success',
              duration: '—',
              user: 'System',
              confidence: conf,
            });
          }
        }
        rows.sort((a, b) => new Date(b._ts || 0) - new Date(a._ts || 0));
        setData(rows);
      } catch (err) {
        console.error('[BusinessEngine] timeline load failed', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [workbenchId]);

  return { data, loading };
}
