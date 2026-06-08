-- ============================================================================
-- Atomic double-entry posting
-- A single Postgres function that writes the transaction header and BOTH entries
-- in one database transaction. If anything fails, the whole thing rolls back —
-- no orphaned headers, no half-posted ledger. This is the correct replacement
-- for the application-level compensating delete in ledger_service.record_transaction.
--
-- Adopt from Python with:
--   supabase.rpc("record_transaction_atomic", {
--       "p_workbench_id": wb, "p_from_label": from_id, "p_to_label": to_id,
--       "p_amount": amount, "p_description": desc, "p_date": str(date),
--       "p_source_party": ..., "p_destination_party": ...,
--       "p_invoice_id": ..., "p_bill_id": ...
--   }).execute()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_transaction_atomic(
    p_workbench_id      uuid,
    p_from_label        uuid,
    p_to_label          uuid,
    p_amount            numeric,
    p_description       text,
    p_date              date DEFAULT CURRENT_DATE,
    p_source_party      uuid DEFAULT NULL,
    p_source_entity     uuid DEFAULT NULL,
    p_destination_party uuid DEFAULT NULL,
    p_destination_entity uuid DEFAULT NULL,
    p_invoice_id        uuid DEFAULT NULL,
    p_bill_id           uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_tx_id  uuid;
    v_amt    numeric := round(p_amount, 2);
BEGIN
    IF v_amt <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive (got %)', p_amount;
    END IF;

    INSERT INTO transactions (
        workbench_id, description, transaction_date,
        source_party_id, source_entity_id,
        destination_party_id, destination_entity_id,
        invoice_id, bill_id
    ) VALUES (
        p_workbench_id, p_description, p_date,
        p_source_party, p_source_entity,
        p_destination_party, p_destination_entity,
        p_invoice_id, p_bill_id
    ) RETURNING id INTO v_tx_id;

    INSERT INTO transaction_entries (transaction_id, label_id, amount) VALUES
        (v_tx_id, p_to_label,   v_amt),    -- destination (+)
        (v_tx_id, p_from_label, -v_amt);   -- source (-)

    RETURN v_tx_id;
END;
$$;
