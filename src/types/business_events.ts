/**
 * Phase 2 — Analysis Note → Trade Draft → Business Event Architecture
 */

import { AnalysisNote, EventType } from './analysis_note';

// ─────────────────────────────────────────────────────────────────────────────
// Trade Draft
// ─────────────────────────────────────────────────────────────────────────────

export type TradeDraftStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUPERSEDED';

export interface TradeDraft {
  id:                 string;
  workbench_id:       string;
  analysis_note_id:   string;
  document_id:        string | null;
  
  event_type:         EventType;
  counterparty_name:  string | null;
  amount:             number | null;
  currency:           string;
  event_date:         string | null;
  settlement_key:     string | null;
  
  status:             TradeDraftStatus;
  
  override_counterparty:   string | null;
  override_amount:         number | null;
  override_event_date:     string | null;
  override_settlement_key: string | null;
  override_event_type:     EventType | null;
  reviewer_notes:          string | null;
  
  business_event_id:  string | null;
  reviewed_by:        string | null;
  reviewed_at:        string | null;
  
  pipeline_version:   string;
  generator_version:  string;
  created_at:         string;

  // Joined from Analysis Note
  analysis_notes?: Partial<AnalysisNote>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Business Event
// ─────────────────────────────────────────────────────────────────────────────

export type BusinessEventStatus =
  | 'OPEN'
  | 'SETTLED'
  | 'PARTIALLY_SETTLED'
  | 'CANCELLED'
  | 'SUPERSEDED';

export interface BusinessEvent {
  id:                 string;
  workbench_id:       string;
  analysis_note_id:   string | null;
  trade_draft_id:     string | null;
  document_id:        string | null;
  
  event_type:         EventType;
  event_date:         string | null;
  counterparty:       string | null;
  amount:             number | null;
  currency:           string;
  settlement_key:     string | null;
  
  event_status:       BusinessEventStatus;
  event_metadata:     Record<string, unknown>;
  
  is_superseded:      boolean;
  superseded_by:      string | null;
  
  legacy_trade_id:    string | null;
  compiled_at:        string | null;
  transaction_id:     string | null;
  
  created_at:         string;
  
  // Joins
  trade_drafts?:      Partial<TradeDraft>;
  analysis_notes?:    Partial<AnalysisNote>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Settlement
// ─────────────────────────────────────────────────────────────────────────────

export type SettlementStatus =
  | 'OPEN'
  | 'PARTIALLY_SETTLED'
  | 'SETTLED'
  | 'UNMATCHED';

export type MatchMethod =
  | 'settlement_key'
  | 'invoice_reference'
  | 'amount_counterparty';

export interface EventSettlement {
  id:                 string;
  workbench_id:       string;
  event_id_a:         string;
  event_id_b:         string;
  
  settlement_key:     string | null;
  match_method:       MatchMethod;
  match_confidence:   number;
  
  original_amount:    number | null;
  amount_matched:     number | null;
  
  settlement_status:  SettlementStatus;
  
  settled_at:         string | null;
  created_at:         string;
  
  // Joins
  event_a?: Partial<BusinessEvent>;
  event_b?: Partial<BusinessEvent>;
}
